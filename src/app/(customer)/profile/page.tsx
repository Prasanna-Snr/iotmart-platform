"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCustomerAuth } from "@/lib/customerAuth";
import { ordersApi, rewardsApi, type Order } from "@/lib/api";

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

/** Fields the profile page reads off the locally-cached customer object. */
interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  created_at?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, ready, clearAuth, setAuth } = useCustomerAuth();

  const [section, setSection] = useState<Section>("dashboard");

  const [orders, setOrders]               = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError]     = useState("");
  const [rewardPoints, setRewardPoints]   = useState<number | null>(null);

  // Local mutable copy of display name
  const [localName, setLocalName] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !user) router.replace("/login?redirect=/profile");
  }, [ready, user, router]);

  // Hydrate local name
  useEffect(() => {
    if (user) setLocalName(user.name ?? "");
  }, [user]);

  // Fetch orders once
  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    ordersApi
      .list("")
      .then(setOrders)
      .catch((e) => setOrdersError((e as { message?: string }).message ?? "Failed to load orders."))
      .finally(() => setOrdersLoading(false));
  }, [user]);

  // Fetch reward balance for the dashboard stat
  useEffect(() => {
    if (!user) return;
    rewardsApi
      .get("")
      .then((data) => setRewardPoints(data.balance ?? 0))
      .catch(() => {});
  }, [user]);

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const handleNameSaved = (name: string) => {
    setLocalName(name);
    if (user) setAuth("", { ...(user as StoredUser), name });
  };

  if (!ready || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#5D1C34] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = localName || user.name;
  const email       = user.email ?? "";
  const phone       = (user as StoredUser).phone ?? "";
  const createdAt   = (user as StoredUser).created_at ?? "";

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
                token=""
                onOrderCancelled={(updated) =>
                  setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
                }
              />
            </div>
          )}

          {/* Addresses */}
          {section === "addresses" && <AddressesPanel token="" />}

          {/* Payment Methods */}
          {section === "payment" && <PaymentPanel />}

          {/* Wishlist */}
          {section === "wishlist" && <WishlistPanel token="" />}

          {/* Rewards */}
          {section === "rewards" && <RewardsPanel token="" />}

          {/* Account Settings */}
          {section === "settings" && (
            <div>
              <h2 className="text-base font-semibold text-[#11100E] mb-3">Account Settings</h2>
              <AccountSettingsPanel
                token=""
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
