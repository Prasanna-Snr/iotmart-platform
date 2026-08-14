"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Cpu } from "lucide-react";
import Input from "@/components/ui/Input";
import { isValidEmail } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useCustomerAuth } from "@/lib/customerAuth";

interface AuthResponse {
  access_token: string;
  user: { id: string; name: string; email: string; role: string };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/profile";
  const { setAuth } = useCustomerAuth();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email) e.email = "Email is required";
    else if (!isValidEmail(form.email)) e.email = "Invalid email address";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "At least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const data = (await authApi.login({ email: form.email, password: form.password })) as AuthResponse;
      setAuth(data.access_token, data.user);
      router.push(redirectTo);
    } catch (err) {
      setErrors({ api: (err as { message?: string }).message ?? "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <span className="bg-[#5D1C34] p-2 rounded-xl">
              <Cpu size={20} className="text-[#CDBBAD]" />
            </span>
            <span className="text-2xl font-bold text-[#11100E]">
              IoT<span className="text-[#A67D45]">Mart</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#11100E] mt-4">
            Welcome back
          </h1>
          <p className="text-sm text-[#899581] mt-1">
            Sign in to your account
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#CDBBAD]/50 p-8 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.api && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errors.api}</p>
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              error={errors.password}
              required
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  className="pointer-events-auto"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remember: e.target.checked }))
                  }
                  className="accent-[#5D1C34]"
                />
                <span className="text-[#899581]">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-[#5D1C34] hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#F0E9E3]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#899581]">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                type="button"
                className="flex items-center justify-center gap-2 border border-[#CDBBAD] rounded-lg py-2.5 text-sm font-medium text-[#11100E] hover:bg-[#F0E9E3] transition-colors"
              >
                {provider}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-[#899581] mt-6">
          Don&apos;t have an account?{" "}
          <Link href={`/register${redirectTo !== "/profile" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="text-[#5D1C34] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
