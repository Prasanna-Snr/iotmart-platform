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
  const { user, ready } = useCustomerAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  // Load the wishlist from the backend session (httpOnly cookie) on mount and
  // whenever the auth state changes. A 401 means no valid session — report an
  // empty wishlist and drop any stale state.
  useEffect(() => {
    let cancelled = false;
    wishlistApi
      .list("")
      .then((items) => {
        if (!cancelled) setIds(new Set(items.map((i) => i.product_id)));
      })
      .catch(() => {
        if (!cancelled) setIds(new Set());
      });
    return () => { cancelled = true; };
  }, [user, ready]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const exists = ids.has(productId);
      // Optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        if (exists) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        if (exists) await wishlistApi.remove(productId, "");
        else await wishlistApi.add(productId, "");
      } catch (err) {
        // Roll back on failure
        setIds((prev) => {
          const next = new Set(prev);
          if (exists) next.add(productId);
          else next.delete(productId);
          return next;
        });
        // Genuinely unauthenticated — send the user to the login page.
        if ((err as { status?: number })?.status === 401) {
          router.push("/login?redirect=" + encodeURIComponent(window.location.pathname + window.location.search));
        }
      }
    },
    [ids, router]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      isInWishlist: (productId: string) => ids.has(productId),
      toggleWishlist,
      count: ids.size,
    }),
    [ids, toggleWishlist]
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
