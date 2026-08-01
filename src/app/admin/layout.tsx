"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminLoginModal from "@/components/admin/AdminLoginModal";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { token, user, clearAuth, ready } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);

  // Auto-collapse when entering the page builder
  useEffect(() => {
    const isPageEditor = /^\/admin\/pages\/.+\/edit/.test(pathname);
    setCollapsed(isPageEditor);
  }, [pathname]);

  // Wait until localStorage is read before rendering
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F0E9E3]">
        <div className="text-[#899581] text-sm">Loading…</div>
      </div>
    );
  }

  // Not logged in — show login modal
  if (!token) {
    return <AdminLoginModal />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0E9E3]">
      {/* Desktop sidebar */}
      <div className={`hidden lg:block flex-shrink-0 h-full transition-all duration-300 ${collapsed ? "w-0 overflow-hidden" : "w-56"}`}>
        <AdminSidebar />
      </div>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" aria-modal="true" role="dialog">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-56 h-full z-50"><AdminSidebar /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#CDBBAD]/50 flex items-center justify-between px-4 flex-shrink-0">
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[#899581] hover:bg-[#F0E9E3]"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex p-2 rounded-lg text-[#899581] hover:bg-[#F0E9E3] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-[#899581] hidden sm:block">{user?.name ?? "Admin"}</span>
            <div className="w-8 h-8 rounded-full bg-[#5D1C34] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <button
              onClick={clearAuth}
              className="p-2 rounded-lg text-[#899581] hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
