import { useSignUp } from "@clerk/expo/legacy";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { Text } from "@/components/Text";
import { AuthField } from "@/components/AuthField";
import { AppleButton, GoogleButton } from "@/components/SocialAuthButtons";
import { links } from "@/lib/links";
import { passwordStrength } from "@/lib/password";

const openPolicy = (url: string) => WebBrowser.openBrowserAsync(url);

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

// Clerk's own error code for a failed attempt, so a password complaint can be
// shown against the password field instead of at the foot of the form.
function clerkErrorCode(err: unknown): string | undefined {
  return (err as { errors?: { code?: string }[] })?.errors?.[0]?.code;
}

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldRules(v: {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
  agreed: boolean;
}): FieldErrors {
  const e: FieldErrors = {};
  const name = v.fullName.trim();
  if (!name) e.fullName = "Full name is required.";
  else if (name.length < 3) e.fullName = "Name must be at least 3 characters.";

  const email = v.email.trim();
  if (!email) e.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) e.email = "Enter a valid email address.";

  if (!v.password) e.password = "Password is required.";
  else if (v.password.length < 8) e.password = "Use at least 8 characters.";

  if (!v.confirm) e.confirm = "Please confirm your password.";
  else if (v.confirm !== v.password) e.confirm = "Passwords do not match.";

  if (!v.agreed) e.terms = "Please accept the Terms to continue.";
  return e;
}

export default function SignUp() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [fullName, setFullName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // Clerk's verdict on the password, which the local meter cannot predict.
  const [passwordServerError, setPasswordServerError] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resending, setResending] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(299);
  const [resendNonce, setResendNonce] = useState(0);

  // Errors are derived live from the current values on every render.
  const allErrors = fieldRules({
    fullName,
    email: emailAddress,
    password,
    confirm,
    agreed,
  });
  // Show a field's error only once it's been touched or the form was submitted.
  const touch = (k: keyof FieldErrors) => setTouched((t) => ({ ...t, [k]: true }));
  const errFor = (k: keyof FieldErrors) =>
    submitted || touched[k] ? allErrors[k] : undefined;

  const codeRef = useRef<TextInput>(null);
  const strength = passwordStrength(password, [fullName, emailAddress]);
  // gray, red, amber, lime, green — indexed by strength score (0–4)
  const strengthColor = ["#94A3B8", "#EF4444", "#F59E0B", "#84CC16", "#16A34A"][
    strength.score
  ];

  // Countdown for the verify screen. The value is reset to 299 when the step is
  // entered (onCreate) or on resend; the effect just runs the ticking interval.
  useEffect(() => {
    if (step !== "verify") return;
    const id = setInterval(
      () => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [step, resendNonce]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const onCreate = async () => {
    if (!isLoaded || busy) return;
    setFormError(null);
    setPasswordServerError(null);
    setSubmitted(true);
    if (Object.values(allErrors).some(Boolean)) return;

    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || undefined;
    const lastName = parts.slice(1).join(" ") || undefined;

    setBusy(true);
    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
        firstName,
        lastName,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setSecondsLeft(299);
      setStep("verify");
    } catch (err) {
      const message = errMessage(err, "Could not create your account.");
      // Clerk enforces its password rules server-side (guessability, breach
      // lists), so it can refuse a password the local meter liked. Show that
      // against the password field, where the fix is, rather than at the foot
      // of the form under the Terms checkbox.
      if (clerkErrorCode(err)?.startsWith("form_password")) {
        setPasswordServerError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded || busy) return;
    setFormError(null);
    setBusy(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
      } else {
        setFormError("That code didn't work. Please try again.");
      }
    } catch (err) {
      setFormError(errMessage(err, "Verification failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (!isLoaded || resending) return;
    setFormError(null);
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      // Only reset the code/countdown once the new code was actually sent.
      setCode("");
      setSecondsLeft(299);
      setResendNonce((n) => n + 1);
    } catch (err) {
      setFormError(errMessage(err, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  };

  const toggleTerms = () => {
    setAgreed((a) => !a);
    touch("terms");
  };

  // ---- Verify step ----
  if (step === "verify") {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setStep("form")} hitSlop={8} className="mt-2 h-8 w-8 justify-center">
            <Ionicons name="chevron-back" size={26} color="#0F172A" />
          </Pressable>

          {/* Illustration */}
          <Image
            source={require("@/assets/images/verify-email.png")}
            style={{ width: "100%", height: 180, marginTop: 8 }}
            contentFit="contain"
          />

          <Text className="mt-4 text-center text-[24px] font-pbold text-slate-900">
            Verify your email
          </Text>
          <Text className="mt-2 text-center text-[14px] text-slate-500">
            We&apos;ve sent a 6-digit code to
          </Text>
          <Text className="text-center text-[14px] font-psemibold text-[#208AEF]">
            {emailAddress}
          </Text>

          {/* 6 code cells backed by one hidden input */}
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
              style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
            />
          </Pressable>

          {/* Expiry countdown */}
          {secondsLeft > 0 ? (
            <Text className="mt-6 text-center text-[13px] text-slate-500">
              Code expires in{" "}
              <Text className="font-psemibold text-[#208AEF]">
                {mm}:{ss}
              </Text>
            </Text>
          ) : (
            <Text className="mt-6 text-center text-[13px] text-red-500">
              Code expired — tap resend below
            </Text>
          )}

          {formError ? (
            <Text className="mt-4 text-center text-[13px] text-red-500">{formError}</Text>
          ) : null}

          <Pressable
            onPress={onVerify}
            disabled={busy || code.length < 6}
            className="mt-8 h-[52px] items-center justify-center rounded-xl bg-[#208AEF] active:opacity-90"
            style={{
              opacity: busy || code.length < 6 ? 0.6 : 1,
              shadowColor: "#101828",
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            <Text className="text-base font-psemibold text-white">
              {busy ? "Verifying…" : "Verify email"}
            </Text>
          </Pressable>

          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-[13px] text-slate-500">Didn&apos;t receive the code? </Text>
            <Pressable onPress={onResend}>
              <Text className="text-[13px] font-psemibold text-[#208AEF]">Resend code</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Form step ----
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
      >
          <Pressable onPress={() => router.back()} hitSlop={8} className="mt-2 h-8 w-8 justify-center">
            <Ionicons name="chevron-back" size={26} color="#0F172A" />
          </Pressable>

          <Text className="mt-3 text-[26px] font-pbold text-slate-900">
            Create your account
          </Text>
          <Text className="mt-1 text-[15px] text-slate-500">Let&apos;s get you started</Text>

          <View className="mt-6 gap-5">
            <AuthField
              label="Full name"
              icon="person-outline"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                touch("fullName");
              }}
              placeholder="Jane Doe"
              autoCapitalize="words"
              error={errFor("fullName")}
            />
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
            <View>
              <AuthField
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  touch("password");
                  // The server's verdict was about the old value.
                  setPasswordServerError(null);
                }}
                placeholder="At least 8 characters"
                secure
                error={errFor("password") ?? passwordServerError ?? undefined}
              />
              {password.length > 0 ? (
                <View className="mt-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[12px] text-slate-400">At least 8 characters</Text>
                    <Text
                      className="text-[12px] font-psemibold"
                      style={{ color: strengthColor }}
                    >
                      {strength.label}
                    </Text>
                  </View>
                  {/* Segmented strength bar (4 segments) */}
                  <View className="mt-1.5 flex-row gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        className="h-1 flex-1 rounded-full"
                        style={{
                          backgroundColor:
                            i < strength.score ? strengthColor : "#E2E8F0",
                        }}
                      />
                    ))}
                  </View>
                  {/* Why the score was capped — the actionable part. */}
                  {strength.hint ? (
                    <Text className="mt-1.5 text-[12px] text-slate-500">
                      {strength.hint}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
            <AuthField
              label="Confirm password"
              icon="lock-closed-outline"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                touch("confirm");
              }}
              placeholder="Re-enter your password"
              secure
              error={errFor("confirm")}
            />
          </View>

          {/* Terms agreement */}
          <View className="mt-5 flex-row items-start">
            <Pressable
              onPress={toggleTerms}
              hitSlop={6}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
              className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border"
              style={{
                borderColor: errFor("terms")
                  ? "#EF4444"
                  : agreed
                    ? "#208AEF"
                    : "#CBD5E1",
                backgroundColor: agreed ? "#208AEF" : "#FFFFFF",
              }}
            >
              {agreed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
            </Pressable>
            <Text className="ml-2 flex-1 text-[13px] leading-5 text-slate-500">
              <Text onPress={toggleTerms}>I agree to the </Text>
              <Text
                onPress={() => openPolicy(links.terms)}
                className="font-psemibold text-[#208AEF]"
              >
                Terms of Service
              </Text>
              <Text onPress={toggleTerms}> and </Text>
              <Text
                onPress={() => openPolicy(links.privacy)}
                className="font-psemibold text-[#208AEF]"
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
          {errFor("terms") ? (
            <Text className="mt-1 text-[12px] text-red-500">{errFor("terms")}</Text>
          ) : null}

          {formError ? (
            <Text className="mt-3 text-[13px] text-red-500">{formError}</Text>
          ) : null}

          {/* Required by Clerk bot protection */}
          <View nativeID="clerk-captcha" />

          <Pressable
            onPress={onCreate}
            disabled={busy}
            className="mt-6 h-[52px] items-center justify-center rounded-xl bg-[#FF6B6B] active:opacity-90"
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
              {busy ? "Creating account…" : "Create account"}
            </Text>
          </Pressable>

          <View className="my-5 flex-row items-center">
            <View className="h-px flex-1 bg-slate-200" />
            <Text className="mx-3 text-[13px] text-slate-400">or continue with</Text>
            <View className="h-px flex-1 bg-slate-200" />
          </View>

          <GoogleButton />
          <AppleButton />

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-[13px] text-slate-500">Already have an account? </Text>
            <Pressable onPress={() => router.replace("/sign-in")}>
              <Text className="text-[13px] font-psemibold text-[#208AEF]">Sign in</Text>
            </Pressable>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
