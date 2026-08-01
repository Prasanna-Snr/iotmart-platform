"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle,
  Package,
  Truck,
  MapPin,
  CreditCard,
} from "lucide-react";
import { ordersApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from "@/lib/constants";

const STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

type OrderStatus = (typeof STATUS_OPTIONS)[number];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    ordersApi
      .get(id, token)
      .then((data) => {
        setOrder(data);
        setStatus(data.status as OrderStatus);
      })
      .catch((e) => setError(e.message ?? "Order not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await ordersApi.updateStatus(id, status, token);
      setOrder(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-[#899581] text-sm">
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-[#899581] mb-3">{error || "Order not found."}</p>
        <Link href="/admin/orders" className="text-[#5D1C34] text-sm hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const addr = order.shipping_address ?? {};

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/orders"
          className="p-2 rounded-lg text-[#899581] hover:bg-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Order Detail</h1>
          <p className="text-xs font-mono text-[#899581]">{order.order_number}</p>
        </div>
        {saved && (
          <span className="ml-auto flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle size={15} /> Status updated
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — items + address */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0E9E3] flex items-center gap-2">
              <Package size={15} className="text-[#5D1C34]" />
              <h2 className="font-semibold text-[#11100E]">
                Order Items ({order.items?.length ?? 0})
              </h2>
            </div>
            <div className="divide-y divide-[#F0E9E3]">
              {(order.items ?? []).map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 px-5 py-4">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                    {item.product_image ? (
                      <Image
                        src={item.product_image}
                        alt={item.product_name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">
                        IMG
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#11100E] text-sm line-clamp-1">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-[#899581]">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-sm text-[#11100E]">
                    {formatPrice(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-[#F0E9E3]/50 space-y-2 text-sm">
              <div className="flex justify-between text-[#899581]">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#899581]">
                <span>Shipping</span>
                <span className={order.shipping_cost === 0 ? "text-green-600" : ""}>
                  {order.shipping_cost === 0 ? "Free" : formatPrice(order.shipping_cost)}
                </span>
              </div>
              <div className="flex justify-between text-[#899581]">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#11100E] text-base pt-1 border-t border-[#CDBBAD]/40">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={15} className="text-[#5D1C34]" />
              <h2 className="font-semibold text-[#11100E]">Shipping Address</h2>
            </div>
            <address className="not-italic text-sm space-y-1">
              <p className="font-medium text-[#11100E]">
                {addr.first_name} {addr.last_name}
              </p>
              <p className="text-[#899581]">{addr.email}</p>
              <p className="text-[#899581]">{addr.phone}</p>
              <p className="text-[#11100E]">{addr.address_line1}</p>
              {addr.address_line2 && (
                <p className="text-[#11100E]">{addr.address_line2}</p>
              )}
              <p className="text-[#11100E]">
                {addr.city}, {addr.state} {addr.zip_code}
              </p>
              <p className="text-[#11100E]">{addr.country}</p>
            </address>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Status update */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={15} className="text-[#5D1C34]" />
              <h2 className="font-semibold text-[#11100E]">Order Status</h2>
            </div>
            <div className="space-y-2 mb-4">
              {STATUS_OPTIONS.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm capitalize ${
                    status === s
                      ? "border-[#5D1C34] bg-[#5D1C34]/5 text-[#5D1C34] font-medium"
                      : "border-[#CDBBAD]/50 text-[#899581] hover:border-[#A67D45]"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="accent-[#5D1C34]"
                  />
                  <span className="flex-1">{s}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      ORDER_STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s}
                  </span>
                </label>
              ))}
            </div>
            {saveError && (
              <p className="text-xs text-red-500 mb-3">{saveError}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#5D1C34] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
            >
              {saving ? "Updating…" : "Update Status"}
            </button>
          </div>

          {/* Payment info */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={15} className="text-[#5D1C34]" />
              <h2 className="font-semibold text-[#11100E]">Payment Info</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#899581]">Method</span>
                <span className="font-medium text-[#11100E] capitalize">
                  {order.payment_method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#899581]">Status</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    PAYMENT_STATUS_COLORS[order.payment_status] ??
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.payment_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#899581]">Ordered</span>
                <span className="text-[#11100E]">
                  {formatDateShort(order.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#899581]">Updated</span>
                <span className="text-[#11100E]">
                  {formatDateShort(order.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
