"use client";

import { ShoppingBag, Zap, Clock } from "lucide-react";

interface Props {
  name: string;
  email: string;
  createdAt?: string;
  initials: string;
  totalOrders: number;
  activeOrders: number;
  onEditProfile: () => void;
  onViewOrders: () => void;
}

export default function ProfileWelcome({
  name,
  email,
  createdAt,
  initials,
  totalOrders,
  activeOrders,
  onEditProfile,
  onViewOrders,
}: Props) {
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const stats = [
    { label: "Total Orders",  value: totalOrders,  icon: <ShoppingBag size={16} className="text-[#5D1C34]" /> },
    { label: "Reward Points", value: "—",           icon: <Zap size={16} className="text-[#A67D45]" /> },
    { label: "Active Orders", value: activeOrders,  icon: <Clock size={16} className="text-blue-500" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Welcome card */}
      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-[#5D1C34] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none ring-4 ring-[#CDBBAD]/30">
          {initials}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#11100E]">
            Welcome back, {name}!
          </h1>
          <p className="text-sm text-[#899581]">{email}</p>
          {memberSince && (
            <p className="text-xs text-[#CDBBAD] mt-0.5">
              Member date: Since {memberSince}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onEditProfile}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[#CDBBAD] text-[#11100E] hover:border-[#5D1C34] hover:text-[#5D1C34] transition-colors"
          >
            Edit Profile
          </button>
          <button
            onClick={onViewOrders}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-[#5D1C34] text-white hover:bg-[#4a1628] transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-[#CDBBAD]/50 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-xs text-[#899581] mb-1">
              {s.icon}
              {s.label}
            </div>
            <p className="text-2xl font-bold text-[#11100E]">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
