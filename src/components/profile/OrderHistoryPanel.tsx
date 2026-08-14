"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, ChevronDown, ChevronUp, X, Truck, CheckCircle2, Circle, Ban } from "lucide-react";
import { formatDateShort, formatPrice } from "@/lib/utils";
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from "@/lib/constants";
import { ordersApi, type Order } from "@/lib/api";

const TRACK_STEPS = ["pending", "processing", "shipped", "delivered"] as const;
type TrackStep = (typeof TRACK_STEPS)[number];
const TRACK_LABELS: Record<string, string> = {
  pending: "Order placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

interface Props {
  orders: Order[];
  loading: boolean;
  error: string;
  token: string;
  onOrderCancelled: (updatedOrder: Order) => void;
}

export default function OrderHistoryPanel({ orders, loading, error, token, onOrderCancelled }: Props) {
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError]   = useState<Record<string, string>>({});

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    setCancelError((prev) => ({ ...prev, [orderId]: "" }));
    try {
      const updated = await ordersApi.cancel(orderId, token);
      onOrderCancelled(updated);
    } catch (e) {
      setCancelError((prev) => ({ ...prev, [orderId]: e instanceof Error ? e.message : "Failed to cancel order." }));
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white border border-[#CDBBAD]/50 rounded-xl p-5 animate-pulse">
            <div className="flex gap-6">
              <div className="h-4 w-28 bg-[#F0E9E3] rounded" />
              <div className="h-4 w-24 bg-[#F0E9E3] rounded" />
              <div className="h-4 w-16 bg-[#F0E9E3] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-16 text-center">
        <Package size={40} className="mx-auto text-[#CDBBAD] mb-3" />
        <p className="font-medium text-[#11100E] mb-1">No orders yet</p>
        <p className="text-sm text-[#899581] mb-5">Your order history will appear here.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-[#CDBBAD]/50 rounded-xl overflow-hidden">
          {/* Summary row */}
          <button
            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            className="w-full text-left px-5 py-4 hover:bg-[#F0E9E3]/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                <div>
                  <p className="text-xs text-[#899581]">Order #</p>
                  <p className="text-sm font-mono font-semibold text-[#5D1C34]">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-xs text-[#899581]">Order date</p>
                  <p className="text-sm text-[#11100E]">{formatDateShort(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#899581]">Items</p>
                  <p className="text-sm text-[#11100E]">
                    {(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#899581]">Price</p>
                  <p className="text-sm font-bold text-[#11100E]">{formatPrice(order.total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {order.status}
                </span>
                {expandedId === order.id
                  ? <ChevronUp size={15} className="text-[#899581]" />
                  : <ChevronDown size={15} className="text-[#899581]" />}
              </div>
            </div>
          </button>

          {/* Expanded detail */}
          {expandedId === order.id && (
            <div className="border-t border-[#F0E9E3]">
              {/* Tracking timeline */}
              <div className="px-5 pt-5">
                {order.status === "cancelled" || order.status === "refunded" ? (
                  <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/60 px-4 py-3">
                    <Ban size={18} className={order.status === "cancelled" ? "text-red-500" : "text-gray-500"} />
                    <div>
                      <p className="text-sm font-semibold text-[#11100E] capitalize">{order.status}</p>
                      <p className="text-xs text-[#899581]">
                        {order.status === "cancelled"
                          ? "This order was cancelled and will not be shipped."
                          : "This order was refunded."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <ol className="flex items-center gap-0">
                    {TRACK_STEPS.map((step, idx) => {
                      const currentIndex = TRACK_STEPS.indexOf(order.status as TrackStep);
                      const reached = idx <= currentIndex;
                      const isCurrent = idx === currentIndex;
                      return (
                        <li key={step} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span
                              className={`flex h-7 w-7 rounded-full items-center justify-center ${
                                reached ? "bg-[#5D1C34] text-white" : "bg-[#F0E9E3] text-[#CDBBAD]"
                              } ${isCurrent ? "ring-4 ring-[#5D1C34]/15" : ""}`}
                            >
                              {reached && idx < currentIndex
                                ? <CheckCircle2 size={14} />
                                : isCurrent
                                  ? <Truck size={13} />
                                  : <Circle size={12} />}
                            </span>
                            <span className={`text-[11px] font-medium ${reached ? "text-[#11100E]" : "text-[#CDBBAD]"}`}>
                              {TRACK_LABELS[step]}
                            </span>
                          </div>
                          {idx < TRACK_STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-2 mt-[-14px] ${
                                idx < currentIndex ? "bg-[#5D1C34]" : "bg-[#F0E9E3]"
                              }`}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div className="p-5 space-y-3">
                {(order.items ?? []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0 border border-[#CDBBAD]/30">
                      {item.product_image
                        ? <Image src={item.product_image} alt={item.product_name} fill sizes="44px" className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-[#CDBBAD]" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#11100E] truncate">{item.product_name}</p>
                      <p className="text-xs text-[#899581]">{item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#11100E]">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#F0E9E3] bg-[#F0E9E3]/30 px-5 py-4 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-[#899581] mb-1">Subtotal</p>
                  <p className="font-medium text-[#11100E]">{formatPrice(order.subtotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#899581] mb-1">Shipping</p>
                  <p className="font-medium text-[#11100E]">
                    {order.shipping_cost === 0
                      ? <span className="text-green-600">Free</span>
                      : formatPrice(order.shipping_cost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#899581] mb-1">Total</p>
                  <p className="font-bold text-[#11100E]">{formatPrice(order.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#899581] mb-1">Payment</p>
                  {order.payment_status ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PAYMENT_STATUS_COLORS[order.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {order.payment_status}
                    </span>
                  ) : (
                    <span className="text-xs text-[#899581]">—</span>
                  )}
                </div>
                {order.shipping_address?.city && (
                  <div>
                    <p className="text-xs text-[#899581] mb-1">Shipped to</p>
                    <p className="font-medium text-[#11100E]">
                      {[order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Cancel button — only for pending orders */}
              {order.status === "pending" && (
                <div className="border-t border-[#F0E9E3] px-5 py-4">
                  {cancelError[order.id] && (
                    <p className="text-xs text-red-500 mb-2">{cancelError[order.id]}</p>
                  )}
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <X size={14} />
                    {cancellingId === order.id ? "Cancelling…" : "Cancel Order"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
