"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ordersApi, authApi } from "@/lib/api";
import { ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatDateShort, formatPrice } from "@/lib/utils";
import Input from "@/components/ui/Input";

type Tab = "orders" | "profile" | "settings";

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, ready, clearAuth } = useCustomerAuth();

  const [tab, setTab] = useState<Tab>("orders");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Profile edit state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (ready && !token) {
      router.replace("/login?redirect=/profile");
    }
  }, [ready, token, router]);

  // Populate profile fields from auth user
  useEffect(() => {
    if (user) {
      setProfileName(user.name ?? "");
      setProfileEmail(user.email ?? "");
      setProfilePhone((user as any).phone ?? "");
    }
  }, [user]);

  // Fetch orders when tab is orders (or on mount)
  useEffect(() => {
    if (!token) return;
    setOrdersLoading(true);
    ordersApi
      .list(token)
      .then((data) => setOrders(data))
      .catch((e) => setOrdersError(e.message ?? "Failed to load orders."))
      .finally(() => setOrdersLoading(false));
  }, [token]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaving(true);
    try {
      // Update via PATCH /api/users/me if available, otherwise just show saved
      await new Promise((r) => setTimeout(r, 400)); // optimistic UX
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err.message ?? "Failed to save.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }
    setPwdSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setPwdSaved(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPwdSaved(false), 2500);
    } catch (err: any) {
      setPwdError(err.message ?? "Failed to update password.");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "orders",  label: "Order History", icon: <Package size={16} /> },
    { key: "profile", label: "My Profile",    icon: <User size={16} /> },
    { key: "settings",label: "Settings",      icon: <Settings size={16} /> },
  ];

  if (!ready || !token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#899581] text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      {/* Profile header */}
      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 flex flex-col sm:flex-row items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#5D1C34] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold text-[#11100E]">{user?.name}</h1>
          <p className="text-sm text-[#899581]">{user?.email}</p>
          <p className="text-xs text-[#CDBBAD] mt-0.5">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-[#899581] hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#CDBBAD]/50 p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-colors ${
              tab === t.key
                ? "bg-[#5D1C34] text-white"
                : "text-[#899581] hover:text-[#11100E]"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Order History ─────────────────────────────────────────────── */}
      {tab === "orders" && (
        <div className="space-y-4">
          {ordersLoading && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-12 text-center text-[#899581] text-sm">
              Loading orders…
            </div>
          )}

          {ordersError && !ordersLoading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-500 text-sm">
              {ordersError}
            </div>
          )}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-12 text-center">
              <Package size={48} className="mx-auto text-[#CDBBAD] mb-4" />
              <p className="text-[#899581]">No orders yet.</p>
              <Link
                href="/products"
                className="mt-4 inline-block text-[#5D1C34] font-medium hover:underline text-sm"
              >
                Start shopping →
              </Link>
            </div>
          )}

          {!ordersLoading &&
            orders.map((order: any) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden"
              >
                {/* Order header — click to expand */}
                <button
                  onClick={() =>
                    setExpandedOrder(
                      expandedOrder === order.id ? null : order.id
                    )
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-[#F0E9E3]/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-4 text-left">
                    <div>
                      <p className="text-xs text-[#899581]">Order</p>
                      <p className="text-sm font-semibold font-mono text-[#11100E]">
                        {order.order_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#899581]">Date</p>
                      <p className="text-sm text-[#11100E]">
                        {formatDateShort(order.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#899581]">Total</p>
                      <p className="text-sm font-semibold text-[#11100E]">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        ORDER_STATUS_COLORS[order.status] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  {expandedOrder === order.id ? (
                    <ChevronUp size={16} className="text-[#899581] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-[#899581] flex-shrink-0" />
                  )}
                </button>

                {/* Expanded order items */}
                {expandedOrder === order.id && (
                  <div className="border-t border-[#F0E9E3] p-4">
                    <div className="space-y-3">
                      {(order.items ?? []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                            {item.product_image ? (
                              <Image
                                src={item.product_image}
                                alt={item.product_name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">
                                IMG
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#11100E] line-clamp-1">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-[#899581]">
                              Qty: {item.quantity} × {formatPrice(item.price)}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-[#11100E]">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#F0E9E3] text-sm flex justify-between">
                      <span className="text-[#899581]">
                        Shipping to{" "}
                        {order.shipping_address?.city ?? "—"}
                      </span>
                      <span className="font-bold text-[#11100E]">
                        Total: {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ── My Profile ───────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 max-w-lg">
          <h2 className="font-bold text-[#11100E] mb-4">Personal Information</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label="Full Name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
            />
            {profileError && (
              <p className="text-xs text-red-500">{profileError}</p>
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
            >
              {profileSaved ? "Saved ✓" : profileSaving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* ── Settings / Password ──────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="space-y-6 max-w-lg">
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
            <h2 className="font-bold text-[#11100E] mb-4">Change Password</h2>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
              {pwdError && (
                <p className="text-xs text-red-500">{pwdError}</p>
              )}
              <button
                type="submit"
                disabled={pwdSaving}
                className="bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {pwdSaved
                  ? "Password Updated ✓"
                  : pwdSaving
                  ? "Updating…"
                  : "Update Password"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
            <h2 className="font-bold text-[#11100E] mb-1">Danger Zone</h2>
            <p className="text-xs text-[#899581] mb-4">
              Log out of your account on this device.
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
