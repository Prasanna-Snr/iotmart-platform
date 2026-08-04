"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ordersApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from "@/lib/constants";

const STATUS_TABS = [
  { label: "All",        value: "" },
  { label: "Pending",    value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Delivered",  value: "delivered" },
  { label: "Cancelled",  value: "cancelled" },
];

export default function AdminOrdersPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    ordersApi
      .list(token)
      .then((data) => setAllOrders(data))
      .catch((e) => setError(e.message ?? "Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allOrders.filter((o) => {
    const matchStatus = statusFilter ? o.status === statusFilter : true;
    const q = search.toLowerCase();
    const matchSearch = q
      ? o.order_number.toLowerCase().includes(q) ||
        (o.customer_email ?? "").toLowerCase().includes(q) ||
        (o.shipping_address?.first_name ?? "").toLowerCase().includes(q) ||
        (o.shipping_address?.last_name ?? "").toLowerCase().includes(q)
      : true;
    return matchStatus && matchSearch;
  });

  const statusCounts = allOrders.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Orders</h1>
          <p className="text-xs text-[#899581] mt-0.5">{allOrders.length} total orders</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === value
                ? "bg-[#5D1C34] text-white border-[#5D1C34]"
                : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"
            }`}
          >
            {label}
            {value && statusCounts[value] ? ` (${statusCounts[value]})` : ""}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order #, name, or email…"
          className="border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 flex-1"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="px-3 py-2 border border-[#CDBBAD] rounded-lg text-sm text-[#899581] hover:bg-[#F0E9E3]"
          >
            Clear
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-16 text-[#899581] text-sm">Loading orders…</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F0E9E3]">
                <tr>
                  {["Order ID", "Customer Name", "Customer Email", "Phone", "Order Date", "Items", "Total", "Order Status", "Payment Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E9E3]">
                {filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-[#F0E9E3]/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-[#5D1C34]">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#11100E]">
                      {o.shipping_address?.first_name} {o.shipping_address?.last_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#899581]">
                      {o.customer_email}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#899581]">
                      {o.shipping_address?.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#899581]">
                      {formatDateShort(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#899581]">
                      {o.items?.length ?? 0} item{o.items?.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#11100E] text-sm">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          ORDER_STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === "delivered" ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS["paid"]}`}>
                          paid
                        </span>
                      ) : (
                        <span className="text-xs text-[#899581]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-xs text-[#5D1C34] hover:underline font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#899581] text-sm">No orders found.</div>
          )}
        </div>
      )}
    </div>
  );
}
