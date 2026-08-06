"use client";

import { useState, useEffect } from "react";
import {
  Store, Truck, Bell, Shield, CheckCircle, Loader2,
} from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { settingsApi, authApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { useAdminAuth } from "@/lib/adminAuth";

type Tab = "store" | "shipping" | "notifications" | "security";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "store",         label: "Store",        icon: Store      },
  { key: "shipping",      label: "Shipping",      icon: Truck      },
  { key: "notifications", label: "Notifications", icon: Bell       },
  { key: "security",      label: "Security",      icon: Shield     },
];

export default function AdminSettingsPage() {
  const { user } = useAdminAuth();
  const [tab, setTab]         = useState<Tab>("store");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  // Password change state
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [pwdSaving, setPwdSaving]     = useState(false);
  const [pwdSaved, setPwdSaved]       = useState(false);
  const [pwdError, setPwdError]       = useState("");

  // Load settings on mount
  useEffect(() => {
    const token = getAdminSession()?.id ?? null;
    if (!token) { setLoadError("Not authenticated."); setLoading(false); return; }
    settingsApi
      .get(token)
      .then((data) => setSettings(data.settings))
      .catch((e) => setLoadError(e.message ?? "Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const setBool = (key: string, value: boolean) =>
    setSettings((s) => ({ ...s, [key]: value ? "true" : "false" }));

  const bool = (key: string) => settings[key] === "true";
  const val  = (key: string, fallback = "") => settings[key] ?? fallback;

  const handleSave = async () => {
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      const data = await settingsApi.save(settings, token);
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match."); return; }
    if (newPwd.length < 6)     { setPwdError("Password must be at least 6 characters."); return; }
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    setPwdSaving(true);
    try {
      // PATCH /api/auth/me — update password via UserUpdate schema
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPwd }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail ?? "Failed to update password.");
      });
      setPwdSaved(true);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSaved(false), 3000);
    } catch (e: any) {
      setPwdError(e.message ?? "Failed to update password.");
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#899581]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-12 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
        {loadError}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#11100E]">Settings</h1>
        {tab !== "security" && (
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                <CheckCircle size={14} /> Saved
              </span>
            )}
            {saveError && (
              <span className="text-red-500 text-xs">{saveError}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#5D1C34] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#CDBBAD]/50 p-1 mb-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === key
                ? "bg-[#5D1C34] text-white"
                : "text-[#899581] hover:text-[#11100E]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Store ────────────────────────────────────────────────── */}
      {tab === "store" && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 space-y-4">
          <h2 className="font-semibold text-[#11100E] mb-2">Store Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Store Name"
              value={val("store_name")}
              onChange={(e) => set("store_name", e.target.value)}
            />
            <Input
              label="Store URL"
              value={val("store_url")}
              onChange={(e) => set("store_url", e.target.value)}
            />
          </div>
          <Textarea
            label="Store Description"
            value={val("store_description")}
            onChange={(e) => set("store_description", e.target.value)}
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={val("store_email")}
              onChange={(e) => set("store_email", e.target.value)}
            />
            <Input
              label="Contact Phone"
              value={val("store_phone")}
              onChange={(e) => set("store_phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="max-w-xs">
            <Input
              label="Currency Code"
              value={val("store_currency", "USD")}
              onChange={(e) => set("store_currency", e.target.value)}
              placeholder="USD"
            />
          </div>
          <Input
            label="Address"
            value={val("store_address")}
            onChange={(e) => set("store_address", e.target.value)}
            placeholder="123 Main St, City, State ZIP"
          />
          <Input
            label="Business Hours"
            value={val("store_hours")}
            onChange={(e) => set("store_hours", e.target.value)}
            placeholder="Mon–Fri: 9AM–5PM | Weekends: Email only"
          />
        </div>
      )}

      {/* ── Shipping ─────────────────────────────────────────────── */}
      {tab === "shipping" && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 space-y-4">
          <h2 className="font-semibold text-[#11100E] mb-2">Shipping Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Free Shipping Threshold (Rs.)"
              type="number"
              value={val("shipping_free_threshold", "50")}
              onChange={(e) => set("shipping_free_threshold", e.target.value)}
            />
            <Input
              label="Default Shipping Cost (Rs.)"
              type="number"
              value={val("shipping_default_cost", "5.99")}
              onChange={(e) => set("shipping_default_cost", e.target.value)}
            />
            <Input
              label="Processing Days"
              value={val("shipping_processing_days", "1-2")}
              onChange={(e) => set("shipping_processing_days", e.target.value)}
              placeholder="e.g. 1-2"
            />
          </div>
          <div className="bg-[#F0E9E3]/60 rounded-lg p-4 text-xs text-[#899581]">
            Orders over <strong className="text-[#11100E]">Rs. {val("shipping_free_threshold", "50")}</strong> qualify
            for free shipping. All others are charged <strong className="text-[#11100E]">Rs. {val("shipping_default_cost", "5.99")}</strong>.
          </div>
        </div>
      )}

      {/* ── Notifications ────────────────────────────────────────── */}
      {tab === "notifications" && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 space-y-3">
          <h2 className="font-semibold text-[#11100E] mb-2">Email Notifications</h2>
          {[
            { key: "notify_new_order",  label: "New Order",          desc: "Get notified when a customer places a new order" },
            { key: "notify_low_stock",  label: "Low Stock Alert",    desc: "Alert when product stock falls below 5 units" },
            { key: "notify_new_review", label: "New Review",         desc: "Get notified when a customer leaves a product review" },
            { key: "notify_newsletter", label: "Newsletter Signups", desc: "Get notified for new newsletter subscribers" },
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-start gap-3 p-3 rounded-lg border border-[#CDBBAD]/50 cursor-pointer hover:bg-[#F0E9E3]/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={bool(key)}
                onChange={(e) => setBool(key, e.target.checked)}
                className="accent-[#5D1C34] mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-[#11100E]">{label}</p>
                <p className="text-xs text-[#899581]">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* ── Security ─────────────────────────────────────────────── */}
      {tab === "security" && (
        <div className="space-y-6">
          {/* Account info */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
            <h2 className="font-semibold text-[#11100E] mb-4">Account</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#5D1C34] flex items-center justify-center text-white text-lg font-bold">
                {user?.name?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div>
                <p className="font-medium text-[#11100E]">{user?.name}</p>
                <p className="text-sm text-[#899581]">{user?.email}</p>
                <span className="text-xs bg-[#5D1C34]/10 text-[#5D1C34] px-2 py-0.5 rounded-full font-medium">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
            <h2 className="font-semibold text-[#11100E] mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
              <Input
                label="Current Password"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                label="New Password"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                required
              />
              {pwdError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {pwdError}
                </p>
              )}
              <button
                type="submit"
                disabled={pwdSaving}
                className="flex items-center gap-2 bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {pwdSaving && <Loader2 size={13} className="animate-spin" />}
                {pwdSaved ? "Password Updated ✓" : pwdSaving ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
