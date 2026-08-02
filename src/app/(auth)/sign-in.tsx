import { useSignIn } from "@clerk/expo/legacy";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthField } from "@/components/AuthField";
import { AppleButton, GoogleButton } from "@/components/SocialAuthButtons";

// Route-level boundary. Catches errors before Sentry's root wrap, so report
// explicitly. Raw details are shown only in development; release shows generic copy.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      <Text className="mt-4 text-lg font-pbold text-red-600">
        Something went wrong
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
          We couldn&apos;t sign you in. Please try again.
        </Text>
      )}
      <Pressable
        onPress={retry}
        className="my-4 h-[48px] items-center justify-center rounded-xl bg-[#208AEF]"
      >
        <Text className="font-psemibold text-white">Try again</Text>
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

function fieldRules(v: { email: string; password: string }): FieldErrors {
  const e: FieldErrors = {};
  const email = v.email.trim();
  if (!email) e.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) e.email = "Enter a valid email address.";
  if (!v.password) e.password = "Password is required.";
  return e;
}

export default function SignIn() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Errors derived live from current values; shown once touched or submitted.
  const allErrors = fieldRules({ email: emailAddress, password });
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
      } else {
        // Clerk wants another step and this screen implements none of them, so
        // the user is stuck here. Report which step it asked for: the copy
        // below cannot say, and without it there is no way to know whether to
        // build an email-code factor, a second factor, or something else.
        //
        // Status and strategy names are fixed enum values, not user content —
        // safe to send under the telemetry rules in AGENTS.md.
        Sentry.captureMessage("Sign-in did not complete", {
          level: "warning",
          extra: {
            status: attempt.status,
            firstFactors: attempt.supportedFirstFactors?.map((f) => f.strategy),
            secondFactors: attempt.supportedSecondFactors?.map(
              (f) => f.strategy,
            ),
          },
        });
        setFormError(
          "We couldn't finish signing you in. Please try again, or use Continue with Google.",
        );
      }
    } catch (err) {
      setFormError(
        errMessage(err, "Could not sign in. Check your details and try again."),
      );
    } finally {
      setBusy(false);
    }
  };

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
          Welcome back
        </Text>
        <Text className="mt-1 text-[15px] text-slate-500">
          Sign in to continue planning.
        </Text>

        {/* Fields */}
        <View className="mt-7 gap-5">
          <AuthField
            label="Email"
            icon="mail-outline"
            value={emailAddress}
            onChangeText={(v) => {
              setEmailAddress(v);
              touch("email");
            }}
            placeholder="jane.doe@example.com"
            keyboardType="email-address"
            error={errFor("email")}
          />
          <AuthField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              touch("password");
            }}
            placeholder="Your password"
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
          className="mt-6 h-[52px] items-center justify-center rounded-xl bg-[#208AEF] active:opacity-90"
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
            {busy ? "Signing in…" : "Sign in"}
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="my-5 flex-row items-center">
          <View className="h-px flex-1 bg-slate-200" />
          <Text className="mx-3 text-[13px] text-slate-400">or continue with</Text>
          <View className="h-px flex-1 bg-slate-200" />
        </View>

        <GoogleButton />
        <AppleButton />

        {/* Footer */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-[13px] text-slate-500">New to Triply? </Text>
          <Pressable onPress={() => router.replace("/sign-up")}>
            <Text className="text-[13px] font-psemibold text-[#208AEF]">Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
