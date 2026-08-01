"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BookOpen,
  Star,
  Image,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Cpu,
  LogOut,
  Tag,
  List,
  Layout,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/lib/adminAuth";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "All Products", href: "/admin/products", icon: List },
      { label: "Add Product", href: "/admin/products/new", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: Tag },
      { label: "Brands", href: "/admin/brands", icon: Box },
    ],
  },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Pages", href: "/admin/pages", icon: Layout },
  {
    label: "Tutorials",
    icon: BookOpen,
    children: [
      { label: "All Tutorials", href: "/admin/tutorials", icon: List },
      { label: "Add Tutorial", href: "/admin/tutorials/new", icon: BookOpen },
      { label: "Categories", href: "/admin/tutorials/categories", icon: Tag },
    ],
  },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Banners", href: "/admin/banners", icon: Image },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart2 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { clearAuth } = useAdminAuth();
  const [expanded, setExpanded] = useState<string | null>("Products");

  const toggleGroup = (label: string) => {
    setExpanded((prev) => (prev === label ? null : label));
  };

  return (
    <aside className="h-full bg-[#11100E] flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="bg-[#5D1C34] p-1.5 rounded-lg">
            <Cpu size={16} className="text-[#CDBBAD]" />
          </span>
          <div>
            <p className="text-white font-bold text-sm">
              IoT<span className="text-[#A67D45]">Mart</span>
            </p>
            <p className="text-[#899581] text-xs">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Admin navigation">
        {navItems.map((item) => {
          if ("children" in item) {
            const isExpanded = expanded === item.label;
            const Icon = item.icon;
            const isActive = (item.children ?? []).some((c) =>
              pathname.startsWith(c.href)
            );
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "text-white bg-white/10"
                      : "text-[#CDBBAD] hover:text-white hover:bg-white/5"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {item.label}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 pl-3 border-l border-white/10">
                    {(item.children ?? []).map((child) => {
                      const active = pathname === child.href;
                      const CIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
                            active
                              ? "text-[#A67D45] font-medium"
                              : "text-[#899581] hover:text-white"
                          )}
                        >
                          <CIcon size={13} />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-[#5D1C34] text-white"
                  : "text-[#CDBBAD] hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#899581] hover:text-white transition-colors"
        >
          View Store →
        </Link>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#899581] hover:text-red-400 transition-colors" onClick={clearAuth}>
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </aside>
  );
}
