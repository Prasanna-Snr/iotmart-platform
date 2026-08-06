"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  Cpu,
  User,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 bg-[#11100E] transition-shadow duration-200",
          scrolled && "shadow-lg"
        )}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 text-white font-bold text-xl flex-shrink-0"
            >
              <span className="bg-[#5D1C34] p-1.5 rounded-lg">
                <Cpu size={18} className="text-[#CDBBAD]" />
              </span>
              <span className="text-white">
                IoT<span className="text-[#A67D45]">Mart</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-[#A67D45] bg-white/5"
                      : "text-[#CDBBAD] hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              {searchOpen ? (
                <form
                  onSubmit={handleSearch}
                  className="flex items-center bg-white/10 rounded-lg px-3 py-1.5"
                >
                  <input
                    ref={searchRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products & tutorials…"
                    className="bg-transparent text-white placeholder:text-[#899581] text-sm outline-none w-48"
                    onBlur={() => {
                      if (!searchQuery) setSearchOpen(false);
                    }}
                  />
                  <button type="submit" aria-label="Submit search">
                    <Search size={16} className="text-[#899581] hover:text-white" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg text-[#CDBBAD] hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Open search"
                >
                  <Search size={18} />
                </button>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 rounded-lg text-[#CDBBAD] hover:text-white hover:bg-white/5 transition-colors"
                aria-label={`Cart with ${totalItems} items`}
              >
                <ShoppingCart size={18} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#A67D45] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link
                href="/profile"
                className="p-2 rounded-lg text-[#CDBBAD] hover:text-white hover:bg-white/5 transition-colors"
                aria-label="My account"
              >
                <User size={18} />
              </Link>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-[#CDBBAD] hover:text-white hover:bg-white/5 transition-colors"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#11100E] animate-slide-up">
            <nav className="container-custom py-4 flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-[#A67D45] bg-white/5"
                      : "text-[#CDBBAD] hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <form onSubmit={handleSearch} className="mt-2 px-1">
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products & tutorials…"
                    className="flex-1 bg-white/10 text-white placeholder:text-[#899581] text-sm rounded-lg px-3 py-2 outline-none border border-white/10 focus:border-[#A67D45]"
                  />
                  <button
                    type="submit"
                    className="bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm"
                  >
                    Search
                  </button>
                </div>
              </form>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
