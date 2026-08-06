"use client";

import { CreditCard } from "lucide-react";

export default function PaymentPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#11100E]">Payment Methods</h2>

      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F0E9E3] flex items-center justify-center flex-shrink-0">
            <CreditCard size={22} className="text-[#5D1C34]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#11100E]">Cash on Delivery</p>
            <p className="text-sm text-[#899581] mt-1 leading-relaxed">
              IoTMart currently accepts Cash on Delivery (COD) only. Pay in cash when
              your order arrives — no payment is required at checkout.
            </p>
            <p className="text-xs text-[#CDBBAD] mt-3">
              Online card and digital wallet payments will be added soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
