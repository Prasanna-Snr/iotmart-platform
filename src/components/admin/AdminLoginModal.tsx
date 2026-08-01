"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminLoginModal() {
  const { setAuth } = useAdminAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Login failed"); return; }
      if (data.user.role !== "admin") { setError("You do not have admin access"); return; }
      setAuth(data.access_token, data.user);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F0E9E3]">
      <div className="bg-white rounded-2xl border border-[#CDBBAD]/50 shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#5D1C34] flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-bold text-[#11100E]">Admin Login</h1>
          <p className="text-sm text-[#899581] mt-1">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#899581] mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full border border-[#CDBBAD] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
              placeholder="admin@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#899581] mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full border border-[#CDBBAD] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
              placeholder="••••••••" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#5D1C34] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4a1628] disabled:opacity-60 transition-colors">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
