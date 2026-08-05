"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { wishlistApi } from "@/lib/api";
import { useCustomerAuth } from "@/lib/customerAuth";

interface WishlistContextValue {
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, ready } = useCustomerAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  // Load the wishlist whenever the auth token changes. When logged out the
  // returned values below report an empty wishlist regardless of stale state.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    wishlistApi
      .list(token)
      .then((items) => {
        if (!cancelled) setIds(new Set(items.map((i) => i.product_id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, ready]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const current = token;
      if (!current) {
        router.push("/login?redirect=" + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }
      const exists = ids.has(productId);
      // Optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        if (exists) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        if (exists) await wishlistApi.remove(productId, current);
        else await wishlistApi.add(productId, current);
      } catch {
        // Roll back on failure
        setIds((prev) => {
          const next = new Set(prev);
          if (exists) next.add(productId);
          else next.delete(productId);
          return next;
        });
      }
    },
    [ids, token, router]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      isInWishlist: (productId: string) => !!token && ids.has(productId),
      toggleWishlist,
      count: token ? ids.size : 0,
    }),
    [ids, token, toggleWishlist]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
