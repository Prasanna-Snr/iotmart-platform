"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Cpu } from "lucide-react";
import Input from "@/components/ui/Input";
import { isValidEmail } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useCustomerAuth } from "@/lib/customerAuth";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/profile";
  const { setAuth } = useCustomerAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form> & { api?: string }>({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email) e.email = "Email is required";
    else if (!isValidEmail(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "At least 6 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const data: any = await authApi.register({
        name: form.name.trim(),
        email: form.email,
        password: form.password,
      });
      setAuth(data.access_token, data.user);
      router.push(redirectTo);
    } catch (err: any) {
      setErrors({ api: err.message ?? "Registration failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [key]: e.target.value })),
    error: errors[key],
  });

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
            Create account
          </h1>
          <p className="text-sm text-[#899581] mt-1">
            Join the IoT community today
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#CDBBAD]/50 p-8 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.api && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errors.api}</p>
            )}
            <Input label="Full Name" placeholder="John Doe" required {...f("name")} />
            <Input label="Email" type="email" placeholder="you@example.com" required {...f("email")} />
            <Input
              label="Password"
              type={showPwd ? "text" : "password"}
              placeholder="Min. 6 characters"
              required
              {...f("password")}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="pointer-events-auto"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              required
              {...f("confirmPassword")}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#899581] mt-6">
          Already have an account?{" "}
          <Link href={`/login${redirectTo !== "/profile" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="text-[#5D1C34] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
