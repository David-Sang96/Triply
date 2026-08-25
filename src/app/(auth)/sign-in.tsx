import { useSignIn } from "@clerk/expo/legacy";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import { AuthField } from "@/components/AuthField";
import { AppleButton, GoogleButton } from "@/components/SocialAuthButtons";

// Route-level boundary. Catches errors before Sentry's root wrap, so report
// explicitly. Raw details are shown only in development; release shows generic copy.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      <Text className="mt-4 text-lg font-pbold text-red-600">
        {t("signIn.errorTitle")}
      </Text>
      {__DEV__ ? (
        <ScrollView className="mt-3 flex-1">
          <Text selectable className="text-[13px] font-psemibold text-slate-900">
            {error?.message}
          </Text>
          <Text selectable className="mt-3 text-[11px] text-slate-500">
            {error?.stack}
          </Text>
        </ScrollView>
      ) : (
        <Text className="mt-3 flex-1 text-[15px] text-slate-500">
          {t("signIn.errorBody")}
        </Text>
      )}
      <Pressable
        onPress={retry}
        className="my-4 min-h-[48px] py-2 items-center justify-center rounded-xl bg-[#208AEF]"
      >
        <Text className="font-psemibold text-white">{t("common.tryAgain")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function errMessage(err: unknown, fallback: string): string {
  const e = err as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return (
    e?.errors?.[0]?.longMessage ??
    e?.errors?.[0]?.message ??
    e?.message ??
    fallback
  );
}

type FieldErrors = { email?: string; password?: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Takes `t` rather than calling useTranslation: this is a plain function, and
// the messages have to change with the language like everything else.
function fieldRules(
  v: { email: string; password: string },
  t: TFunction,
): FieldErrors {
  const e: FieldErrors = {};
  const email = v.email.trim();
  if (!email) e.email = t("auth.emailRequired");
  else if (!EMAIL_RE.test(email)) e.email = t("auth.emailInvalid");
  if (!v.password) e.password = t("auth.passwordRequired");
  return e;
}

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Second step, reached only when Clerk asks for an emailed code. Client Trust
  // (Clerk Dashboard → Protect → Rules) treats a device it has not seen before
  // as untrusted for password sign-ins, so anyone reinstalling the app or
  // moving to a new phone lands here. Signing up trusts the device it happened
  // on, which is why this never appears during a normal first run.
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const codeRef = useRef<TextInput>(null);

  // Which verification Clerk asked for. Client Trust reports
  // `needs_client_trust` and offers `email_code` as a *second* factor, so it
  // needs prepare/attemptSecondFactor; a plain `needs_first_factor` needs the
  // first-factor pair. The screens are identical, only the calls differ.
  const [codeFactor, setCodeFactor] = useState<"first" | "second">("second");

  // Errors derived live from current values; shown once touched or submitted.
  const allErrors = fieldRules({ email: emailAddress, password }, t);
  const touch = (k: keyof FieldErrors) => setTouched((t) => ({ ...t, [k]: true }));
  const errFor = (k: keyof FieldErrors) =>
    submitted || touched[k] ? allErrors[k] : undefined;

  const onSubmit = async () => {
    if (!isLoaded || busy) return;
    setFormError(null);
    setSubmitted(true);
    if (Object.values(allErrors).some(Boolean)) return;

    setBusy(true);
    try {
      const attempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }


      // Untrusted device: Clerk withholds the session until an emailed code is
      // verified. It reports this as `needs_client_trust` — not
      // `needs_first_factor` — and offers email_code among the *second*
      // factors, which is what the observed event carried:
      //   status: needs_client_trust, secondFactors: ["email_code"]
      const hasEmailSecondFactor = attempt.supportedSecondFactors?.some(
        (factor) => factor.strategy === "email_code",
      );
      if (
        (attempt.status === "needs_client_trust" ||
          attempt.status === "needs_second_factor") &&
        hasEmailSecondFactor
      ) {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setCodeFactor("second");
        setCode("");
        setStep("code");
        return;
      }

      // Instances configured to verify by email as a first factor instead.
      const emailFirstFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (attempt.status === "needs_first_factor" && emailFirstFactor) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFirstFactor.emailAddressId,
        });
        setCodeFactor("first");
        setCode("");
        setStep("code");
        return;
      }

      // Any other status is one this screen does not implement, so the user is
      // stuck. Report which step Clerk asked for — the copy below cannot say,
      // and without it there is no way to know what to build next.
      //
      // Status and strategy names are fixed enum values, not user content —
      // safe to send under the telemetry rules in AGENTS.md.
      Sentry.captureMessage("Sign-in did not complete", {
        level: "warning",
        extra: {
          status: attempt.status,
          firstFactors: attempt.supportedFirstFactors?.map((f) => f.strategy),
          secondFactors: attempt.supportedSecondFactors?.map((f) => f.strategy),
        },
      });
      setFormError(t("signIn.didNotComplete"));
    } catch (err) {
      setFormError(errMessage(err, t("signIn.couldNotSignIn")));
    } finally {
      setBusy(false);
    }
  };

  const onVerifyCode = async () => {
    if (!isLoaded || busy || code.length < 6) return;
    setFormError(null);
    setBusy(true);
    try {
      const attempt =
        codeFactor === "second"
          ? await signIn.attemptSecondFactor({ strategy: "email_code", code })
          : await signIn.attemptFirstFactor({ strategy: "email_code", code });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }
      // Clerk accepted the code but still wants something more (a second
      // factor, say). Nothing here handles that, so report it rather than
      // leaving another silent dead end.
      Sentry.captureMessage("Sign-in code accepted but not complete", {
        level: "warning",
        extra: {
          status: attempt.status,
          secondFactors: attempt.supportedSecondFactors?.map((f) => f.strategy),
        },
      });
      setFormError(t("signIn.codeNotComplete"));
    } catch (err) {
      setFormError(errMessage(err, t("auth.codeFailed")));
    } finally {
      setBusy(false);
    }
  };

  const onResendCode = async () => {
    if (!isLoaded || resending) return;
    setFormError(null);
    setResending(true);
    try {
      if (codeFactor === "second") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
      } else {
        const emailFactor = signIn.supportedFirstFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (!emailFactor) return;
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
      }
      // Only clear the box once a new code is actually on its way.
      setCode("");
    } catch (err) {
      setFormError(errMessage(err, t("auth.resendFailed")));
    } finally {
      setResending(false);
    }
  };

  if (step === "code") {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back to the email/password form rather than out of the screen —
              the sign-in attempt is still in progress at this point. */}
          <Pressable
            onPress={() => {
              setStep("credentials");
              setFormError(null);
            }}
            hitSlop={8}
            className="mt-2 h-8 w-8 justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </Pressable>

          <Image
            source={require("@/assets/images/verify-email.png")}
            style={{ width: "100%", height: 180, marginTop: 8 }}
            contentFit="contain"
          />

          <Text className="mt-4 text-center text-[24px] font-pbold text-slate-900">
            {t("signIn.confirmTitle")}
          </Text>
          <Text className="mt-2 text-center text-[14px] text-slate-500">
            {t("signIn.confirmBody")}
          </Text>
          <Text className="text-center text-[14px] font-psemibold text-[#208AEF]">
            {emailAddress.trim()}
          </Text>

          {/* 6 cells backed by one hidden input — same pattern as sign-up. */}
          <Pressable onPress={() => codeRef.current?.focus()} className="mt-8">
            <View className="flex-row justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  className="h-14 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white"
                >
                  <Text className="text-[20px] font-pbold text-slate-900">
                    {code[i] ?? ""}
                  </Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                opacity: 0,
              }}
            />
          </Pressable>

          {formError ? (
            <Text className="mt-4 text-center text-[13px] text-red-500">
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={onVerifyCode}
            disabled={busy || code.length < 6}
            className="mt-8 min-h-[52px] py-2 items-center justify-center rounded-xl bg-[#208AEF] active:opacity-90"
            style={{ opacity: busy || code.length < 6 ? 0.6 : 1 }}
          >
            <Text className="text-base font-psemibold text-white">
              {busy ? t("auth.verifying") : t("signIn.verifyAndSignIn")}
            </Text>
          </Pressable>

          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-[13px] text-slate-500">
              {t("auth.didntReceiveCode")}{" "}
            </Text>
            <Pressable onPress={onResendCode} disabled={resending}>
              <Text className="text-[13px] font-psemibold text-[#208AEF]">
                {resending ? t("auth.sending") : t("auth.resendCode")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} hitSlop={8} className="mt-2 h-8 w-8 justify-center">
          <Ionicons name="chevron-back" size={26} color="#0F172A" />
        </Pressable>

        {/* Heading */}
        <Text className="mt-3 text-[26px] font-pbold text-slate-900">
          {t("signIn.heading")}
        </Text>
        <Text className="mt-1 text-[15px] text-slate-500">
          {t("signIn.subheading")}
        </Text>

        {/* Fields */}
        <View className="mt-7 gap-5">
          <AuthField
            label={t("auth.email")}
            icon="mail-outline"
            value={emailAddress}
            onChangeText={(v) => {
              setEmailAddress(v);
              touch("email");
            }}
            placeholder={t("auth.emailPlaceholder")}
            keyboardType="email-address"
            error={errFor("email")}
          />
          <AuthField
            label={t("auth.password")}
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              touch("password");
            }}
            placeholder={t("auth.passwordPlaceholder")}
            secure
            error={errFor("password")}
          />
        </View>

        {formError ? (
          <Text className="mt-3 text-[13px] text-red-500">{formError}</Text>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="mt-6 min-h-[52px] py-2 items-center justify-center rounded-xl bg-[#208AEF] active:opacity-90"
          style={{
            opacity: busy ? 0.6 : 1,
            shadowColor: "#101828",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <Text className="text-base font-psemibold text-white">
            {busy ? t("signIn.submitting") : t("signIn.submit")}
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="my-5 flex-row items-center">
          <View className="h-px flex-1 bg-slate-200" />
          <Text className="mx-3 text-[13px] text-slate-400">
            {t("auth.orContinueWith")}
          </Text>
          <View className="h-px flex-1 bg-slate-200" />
        </View>

        <GoogleButton />
        <AppleButton />

        {/* Footer */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-[13px] text-slate-500">
            {t("welcome.newToTriply")}{" "}
          </Text>
          <Pressable onPress={() => router.replace("/sign-up")}>
            <Text className="text-[13px] font-psemibold text-[#208AEF]">
              {t("welcome.signUp")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
