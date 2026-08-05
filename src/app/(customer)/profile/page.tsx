"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCustomerAuth } from "@/lib/customerAuth";
import { ordersApi, rewardsApi } from "@/lib/api";

import ProfileSidebar    from "@/components/profile/ProfileSidebar";
import ProfileWelcome    from "@/components/profile/ProfileWelcome";
import AccountOverview   from "@/components/profile/AccountOverview";
import OrderHistoryPanel from "@/components/profile/OrderHistoryPanel";
import AccountSettingsPanel from "@/components/profile/AccountSettingsPanel";
import AddressesPanel    from "@/components/profile/AddressesPanel";
import PaymentPanel      from "@/components/profile/PaymentPanel";
import WishlistPanel     from "@/components/profile/WishlistPanel";
import RewardsPanel      from "@/components/profile/RewardsPanel";

import type { Section } from "@/components/profile/ProfileSidebar";

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, ready, clearAuth, setAuth } = useCustomerAuth();

  const [section, setSection] = useState<Section>("dashboard");

  const [orders, setOrders]               = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError]     = useState("");
  const [rewardPoints, setRewardPoints]   = useState<number | null>(null);

  // Local mutable copy of display name
  const [localName, setLocalName] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !token) router.replace("/login?redirect=/profile");
  }, [ready, token, router]);

  // Hydrate local name
  useEffect(() => {
    if (user) setLocalName((user as any).name ?? "");
  }, [user]);

  // Fetch orders once
  useEffect(() => {
    if (!token) return;
    setOrdersLoading(true);
    ordersApi
      .list(token)
      .then(setOrders)
      .catch((e: any) => setOrdersError(e.message ?? "Failed to load orders."))
      .finally(() => setOrdersLoading(false));
  }, [token]);

  // Fetch reward balance for the dashboard stat
  useEffect(() => {
    if (!token) return;
    rewardsApi
      .get(token)
      .then((data) => setRewardPoints(data.balance ?? 0))
      .catch(() => {});
  }, [token]);

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const handleNameSaved = (name: string) => {
    setLocalName(name);
    if (user && token) setAuth(token, { ...(user as any), name });
  };

  if (!ready || !token || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#5D1C34] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = localName || (user as any).name;
  const email       = (user as any).email ?? "";
  const phone       = (user as any).phone ?? "";
  const createdAt   = (user as any).created_at ?? "";

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const activeOrders = orders.filter((o) =>
    ["pending", "processing"].includes(o.status)
  ).length;

  return (
    <div className="container-custom py-8">
      <div className="flex flex-col md:flex-row gap-5 items-start">

        {/* ── Left sidebar ── */}
        <ProfileSidebar
          active={section}
          onChange={setSection}
          onLogout={handleLogout}
        />

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Dashboard */}
          {section === "dashboard" && (
            <>
              <ProfileWelcome
                name={displayName}
                email={email}
                createdAt={createdAt}
                initials={initials}
                totalOrders={orders.length}
                activeOrders={activeOrders}
                rewardPoints={rewardPoints}
                onEditProfile={() => setSection("settings")}
                onViewOrders={() => setSection("orders")}
              />
              <AccountOverview
                orders={orders}
                loading={ordersLoading}
                onViewOrders={() => setSection("orders")}
              />
            </>
          )}

          {/* Order History */}
          {section === "orders" && (
            <div>
              <h2 className="text-base font-semibold text-[#11100E] mb-3">Order History</h2>
              <OrderHistoryPanel
                orders={orders}
                loading={ordersLoading}
                error={ordersError}
                token={token}
                onOrderCancelled={(updated) =>
                  setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
                }
              />
            </div>
          )}

          {/* Addresses */}
          {section === "addresses" && <AddressesPanel token={token} />}

          {/* Payment Methods */}
          {section === "payment" && <PaymentPanel />}

          {/* Wishlist */}
          {section === "wishlist" && <WishlistPanel token={token} />}

          {/* Rewards */}
          {section === "rewards" && <RewardsPanel token={token} />}

          {/* Account Settings */}
          {section === "settings" && (
            <div>
              <h2 className="text-base font-semibold text-[#11100E] mb-3">Account Settings</h2>
              <AccountSettingsPanel
                token={token}
                initialName={displayName}
                initialEmail={email}
                initialPhone={phone}
                onNameSaved={handleNameSaved}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
