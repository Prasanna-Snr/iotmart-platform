"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  MapPin,
  CreditCard,
  Heart,
  Gift,
  Settings,
  LogOut,
} from "lucide-react";

export type Section =
  | "dashboard"
  | "orders"
  | "addresses"
  | "payment"
  | "wishlist"
  | "rewards"
  | "settings";

interface Props {
  active: Section;
  onChange: (s: Section) => void;
  onLogout: () => void;
}

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard",  label: "Dashboard",        icon: <LayoutDashboard size={16} /> },
  { key: "orders",     label: "Order History",     icon: <ShoppingBag size={16} /> },
  { key: "addresses",  label: "Addresses",         icon: <MapPin size={16} /> },
  { key: "payment",    label: "Payment Methods",   icon: <CreditCard size={16} /> },
  { key: "wishlist",   label: "Wishlist",          icon: <Heart size={16} /> },
  { key: "rewards",    label: "Rewards",           icon: <Gift size={16} /> },
  { key: "settings",   label: "Account Settings",  icon: <Settings size={16} /> },
];

export default function ProfileSidebar({ active, onChange, onLogout }: Props) {
  return (
    <aside className="w-full md:w-52 flex-shrink-0">
      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#F0E9E3]">
          <p className="text-xs font-semibold text-[#899581] uppercase tracking-wider">
            My Account
          </p>
        </div>
        <nav className="py-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                active === item.key
                  ? "bg-[#5D1C34]/8 text-[#5D1C34] font-medium border-r-2 border-[#5D1C34]"
                  : "text-[#11100E] hover:bg-[#F0E9E3] hover:text-[#5D1C34]"
              }`}
            >
              <span className={active === item.key ? "text-[#5D1C34]" : "text-[#899581]"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}

          <div className="border-t border-[#F0E9E3] mt-1 pt-1">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#899581] hover:text-red-500 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
