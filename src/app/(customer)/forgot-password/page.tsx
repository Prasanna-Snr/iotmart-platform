"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Cpu, Mail, ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import { isValidEmail } from "@/lib/utils";
import { authApi } from "@/lib/api";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(interval); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!isValidEmail(email)) { setError("Enter a valid email address"); return; }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      if (res.dev_otp) setOtp(res.dev_otp);
      setStep("reset");
      startResendCooldown();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    if (!password) { setError("Password is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      await authApi.resetPassword({
        email,
        otp: otp.trim(),
        new_password: password,
      });
      setDone(true);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      if (res.dev_otp) setOtp(res.dev_otp);
      setOtp("");
      startResendCooldown();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <span className="bg-[#5D1C34] p-2 rounded-xl">
              <Cpu size={20} className="text-[#CDBBAD]" />
            </span>
            <span className="text-2xl font-bold">
              IoT<span className="text-[#A67D45]">Mart</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#11100E] mt-4">
            {done ? "Password updated" : step === "email" ? "Reset your password" : "Set a new password"}
          </h1>
          <p className="text-sm text-[#899581] mt-1">
            {done
              ? "You're all set — sign in with your new password."
              : step === "email"
              ? "Enter your email and we'll send a reset code."
              : `A 6-digit code was sent to ${email}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#CDBBAD]/50 p-8 shadow-sm">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle size={40} className="mx-auto text-green-600" />
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] transition-colors"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">
                  {error}
                </p>
              )}

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
                    {loading ? "Sending code…" : "Send Reset Code"}
                  </button>
                </form>
              )}

              {step === "reset" && (
                <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
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
                  </div>
                  <Input
                    label="New password"
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
                    label="Confirm new password"
                    type="password"
                    placeholder="Re-enter password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound size={16} />
                    {loading ? "Resetting…" : "Reset Password"}
                  </button>

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
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#899581] mt-6">
          Remembered it?{" "}
          <Link href="/login" className="text-[#5D1C34] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
