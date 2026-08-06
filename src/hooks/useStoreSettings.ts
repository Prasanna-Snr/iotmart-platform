"use client";

import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/lib/constants";

export interface StoreSettings {
  freeShippingThreshold: number;
  shippingCost: number;
}

const FALLBACK: StoreSettings = {
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  shippingCost: SHIPPING_COST,
};

export function useStoreSettings(): {
  settings: StoreSettings;
  loading: boolean;
} {
  const [settings, setSettings] = useState<StoreSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi
      .get()
      .then(({ settings: raw }) => {
        const freeShippingThreshold = parseFloat(
          raw.shipping_free_threshold ?? String(FREE_SHIPPING_THRESHOLD)
        );
        const shippingCost = parseFloat(
          raw.shipping_default_cost ?? String(SHIPPING_COST)
        );

        setSettings({
          freeShippingThreshold: isNaN(freeShippingThreshold)
            ? FALLBACK.freeShippingThreshold
            : freeShippingThreshold,
          shippingCost: isNaN(shippingCost) ? FALLBACK.shippingCost : shippingCost,
        });
      })
      .catch(() => {
        // Keep fallback values on error
      })
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
