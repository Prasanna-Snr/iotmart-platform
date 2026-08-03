"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, ExternalLink } from "lucide-react";
import { formatDateShort, formatPrice } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/constants";

interface OrderItem {
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  items: OrderItem[];
  created_at: string;
}

interface Props {
  orders: Order[];
  loading: boolean;
  onViewOrders: () => void;
}

export default function AccountOverview({ orders, loading, onViewOrders }: Props) {
  const recent = orders.slice(0, 3);

  // Collect recent product images across last few orders for the "Recent Items" panel
  const recentItems: { name: string; image?: string; price: number }[] = [];
  for (const order of orders.slice(0, 4)) {
    for (const item of order.items ?? []) {
      if (recentItems.length >= 3) break;
      recentItems.push({
        name: item.product_name,
        image: item.product_image,
        price: item.price,
      });
    }
    if (recentItems.length >= 3) break;
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-[#11100E] mb-3">Account Overview</h2>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Recent Orders table ── */}
        <div className="flex-1 bg-white border border-[#CDBBAD]/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0E9E3]">
            <h3 className="text-sm font-semibold text-[#11100E]">Recent Orders</h3>
            <button
              onClick={onViewOrders}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#5D1C34] text-white hover:bg-[#4a1628] transition-colors"
            >
              View Orders
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-8 bg-[#F0E9E3] rounded animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="p-10 text-center">
              <Package size={32} className="mx-auto text-[#CDBBAD] mb-2" />
              <p className="text-sm text-[#899581]">No orders yet</p>
              <Link href="/products" className="text-xs text-[#5D1C34] hover:underline mt-1 inline-block">
                Start shopping →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#899581] border-b border-[#F0E9E3]">
                  <th className="text-left px-5 py-2.5 font-medium">Order #</th>
                  <th className="text-left px-3 py-2.5 font-medium">Order date</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Items</th>
                  <th className="text-left px-3 py-2.5 font-medium">Price</th>
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E9E3]">
                {recent.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F0E9E3]/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-[#5D1C34] text-xs">
                      {order.order_number}
                    </td>
                    <td className="px-3 py-3 text-[#899581] text-xs">
                      {formatDateShort(order.created_at)}
                    </td>
                    <td className="px-3 py-3 text-[#899581] text-xs hidden sm:table-cell">
                      {(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#11100E] text-xs">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Recent Items panel ── */}
        <div className="w-full lg:w-52 bg-white border border-[#CDBBAD]/50 rounded-xl overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-[#F0E9E3]">
            <h3 className="text-sm font-semibold text-[#11100E]">Recent Items</h3>
          </div>

          {recentItems.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-[#899581]">No items yet</p>
              <Link href="/products" className="text-xs text-[#5D1C34] hover:underline mt-1 inline-block">
                Browse products
              </Link>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {recentItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0 border border-[#CDBBAD]/30">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={14} className="text-[#CDBBAD]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#11100E] truncate leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#5D1C34] font-semibold mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                href="/products"
                className="flex items-center gap-1 text-xs text-[#5D1C34] hover:underline pt-1"
              >
                <ExternalLink size={11} /> Shop again
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
