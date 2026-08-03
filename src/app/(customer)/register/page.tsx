"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Cpu, Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import Input from "@/components/ui/Input";
import { isValidEmail } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useCustomerAuth } from "@/lib/customerAuth";

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = "email" | "otp" | "details";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/profile";
  const { setAuth } = useCustomerAuth();

  // Step tracker
  const [step, setStep] = useState<Step>("email");

  // Shared state across steps
  const [email, setEmail] = useState("");
  const [verificationToken, setVerificationToken] = useState("");

  // Step-level form state
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ─── Step 1: submit email, request OTP ──────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!isValidEmail(email)) { setError("Enter a valid email address"); return; }

    setLoading(true);
    try {
      const res = await authApi.requestOtp({ email: email.trim().toLowerCase() });
      // In dev mode the backend returns the OTP in the response; auto-fill it.
      if (res.dev_otp) setOtp(res.dev_otp);
      setStep("otp");
      startResendCooldown();
    } catch (err: any) {
      setError(err.message ?? "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: submit OTP ──────────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, otp: otp.trim() });
      setVerificationToken(res.verification_token);
      setStep("details");
    } catch (err: any) {
      setError(err.message ?? "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: submit name + password, complete registration ───────────────
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Full name is required"); return; }
    if (!password) { setError("Password is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const data: any = await authApi.register({
        name: name.trim(),
        email,
        password,
        verification_token: verificationToken,
      });
      setAuth(data.access_token, data.user);
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(interval); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await authApi.requestOtp({ email });
      if (res.dev_otp) setOtp(res.dev_otp);
      setOtp("");
      startResendCooldown();
    } catch (err: any) {
      setError(err.message ?? "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Progress indicator label ─────────────────────────────────────────────
  const stepLabel = step === "email" ? "Enter email" : step === "otp" ? "Verify email" : "Create account";
  const stepIndex = step === "email" ? 1 : step === "otp" ? 2 : 3;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <span className="bg-[#5D1C34] p-2 rounded-xl">
              <Cpu size={20} className="text-[#CDBBAD]" />
            </span>
            <span className="text-2xl font-bold">
              IoT<span className="text-[#A67D45]">Mart</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#11100E] mt-4">{stepLabel}</h1>
          <p className="text-sm text-[#899581] mt-1">
            {step === "email" && "Join the IoT community today"}
            {step === "otp" && `We sent a 6-digit code to ${email}`}
            {step === "details" && "Almost there — set your password"}
          </p>
        </div>

        {/* Step progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 rounded-full transition-all duration-300 ${
                n < stepIndex
                  ? "w-6 bg-[#5D1C34]"
                  : n === stepIndex
                  ? "w-8 bg-[#5D1C34]"
                  : "w-2 bg-[#CDBBAD]"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#CDBBAD]/50 p-8 shadow-sm">

          {/* Error banner */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">
              {error}
            </p>
          )}

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                {loading ? "Sending code…" : "Send Verification Code"}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} noValidate className="space-y-5">
              {/* 6-digit OTP input */}
              <div>
                <label className="block text-sm font-medium text-[#11100E] mb-1.5">
                  Verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="──────"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-center text-2xl font-mono tracking-[0.6em] border border-[#CDBBAD] rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 focus:border-[#5D1C34]"
                />
                <p className="text-xs text-[#899581] mt-1.5 text-center">
                  Check your spam folder if you don't see it.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} />
                {loading ? "Verifying…" : "Verify Code"}
              </button>

              {/* Resend + back */}
              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  className="flex items-center gap-1 text-[#899581] hover:text-[#5D1C34] transition-colors"
                >
                  <ArrowLeft size={14} /> Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[#5D1C34] font-medium disabled:opacity-50 hover:underline transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Name + Password ── */}
          {step === "details" && (
            <form onSubmit={handleDetailsSubmit} noValidate className="space-y-4">
              <Input
                label="Full name"
                placeholder="Jane Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Password"
                type={showPwd ? "text" : "password"}
                placeholder="Min. 6 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="pointer-events-auto"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[#899581] mt-6">
          Already have an account?{" "}
          <Link
            href={`/login${redirectTo !== "/profile" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
            className="text-[#5D1C34] font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
