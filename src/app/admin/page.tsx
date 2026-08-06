"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Plus,
  BookOpen,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/constants";

export default function AdminDashboardPage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [activity, setActivity] = useState<any[] | null>(null);

  useEffect(() => {
    const token = getAdminSession()?.id ?? null;
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    adminApi
      .dashboard(token)
      .then(setData)
      .catch((e) => setError(e.message ?? "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/audit?limit=10", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("audit unavailable");
        return res.json();
      })
      .then((rows: any) => {
        if (!cancelled) setActivity(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setActivity(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-center py-24 text-[#899581] text-sm">Loading dashboard…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
        {error || "Dashboard data unavailable."}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Revenue",
      value: formatPrice(data.stats.total_revenue),
      change: data.stats.revenue_change,
      icon: DollarSign,
      color: "bg-[#5D1C34]/10 text-[#5D1C34]",
    },
    {
      label: "Total Orders",
      value: data.stats.total_orders,
      change: data.stats.orders_change,
      icon: ShoppingBag,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Customers",
      value: data.stats.total_customers,
      change: data.stats.customers_change,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Products",
      value: data.stats.total_products,
      change: 0,
      icon: Package,
      color: "bg-green-100 text-green-700",
    },
  ];

  const monthly = data.monthly_revenue ?? [];
  const topProducts = data.top_products ?? [];
  const recentOrders = data.recent_orders ?? [];
  const maxRevenue = Math.max(1, ...monthly.map((d: any) => d.value));
  const maxSales = Math.max(1, ...topProducts.map((d: any) => d.sold));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#11100E]">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
          >
            <Plus size={14} />
            Add Product
          </Link>
          <Link
            href="/admin/tutorials/new"
            className="flex items-center gap-1.5 border border-[#CDBBAD] text-[#11100E] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#F0E9E3] transition-colors"
          >
            <BookOpen size={14} />
            Add Tutorial
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#899581] font-medium">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#11100E]">{value}</p>
            {change !== 0 && (
              <div
                className={`flex items-center gap-1 mt-1 text-xs font-medium ${change > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change)}% vs last month
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4">
            Monthly Revenue
          </h2>
          {monthly.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {monthly.map((d: any) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-[#899581]">
                    ${(d.value / 1000).toFixed(1)}k
                  </span>
                  <div
                    className="w-full bg-[#5D1C34] rounded-t-md transition-all"
                    style={{ height: `${Math.max((d.value / maxRevenue) * 100, 2)}%` }}
                  />
                  <span className="text-xs text-[#899581]">{d.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#899581] py-10 text-center">No sales data yet.</p>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4">
            Top Products (Sales)
          </h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((d: any) => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#11100E] font-medium truncate mr-2">
                      {d.name}
                    </span>
                    <span className="text-[#899581] flex-shrink-0">
                      {d.sold} sold
                    </span>
                  </div>
                  <div className="h-2 bg-[#F0E9E3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#A67D45] rounded-full"
                      style={{ width: `${(d.sold / maxSales) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#899581] py-10 text-center">No product sales yet.</p>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0E9E3]">
          <h2 className="font-semibold text-[#11100E]">Recent Orders</h2>
          <Link
            href="/admin/orders"
            className="text-xs text-[#5D1C34] hover:underline"
          >
            View All
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0E9E3]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#899581]">Order</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#899581]">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#899581] hidden sm:table-cell">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#899581]">Total</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#899581]">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#899581]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E9E3]">
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-[#F0E9E3]/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#11100E]">
                      {order.order_number?.slice(0, 16) ?? ""}
                    </td>
                    <td className="px-4 py-3 text-[#11100E] text-xs">
                      {order.customer_email || `${order.shipping_address?.first_name ?? ""} ${order.shipping_address?.last_name ?? ""}`.trim()}
                    </td>
                    <td className="px-4 py-3 text-[#899581] text-xs hidden sm:table-cell">
                      {formatDateShort(order.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-xs text-[#11100E]">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs text-[#5D1C34] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#899581] py-10 text-center">No orders yet.</p>
        )}
      </div>

      {/* Recent activity */}
      {activity !== null && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0E9E3]">
            <h2 className="font-semibold text-[#11100E]">Recent Activity</h2>
          </div>
          {activity.length > 0 ? (
            <ul className="divide-y divide-[#F0E9E3]">
              {activity.map((entry: any) => (
                <li key={entry.id ?? `${entry.created_at}-${entry.action}`} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#11100E]">
                      <span className="font-medium">{entry.actor_email}</span>
                      <span className="text-[#899581]"> · {entry.action}</span>
                    </p>
                    <p className="text-xs text-[#899581] mt-0.5 truncate">
                      {entry.target_type}
                      {entry.target_id ? ` #${entry.target_id}` : ""}
                      {entry.detail ? ` — ${entry.detail}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-[#899581] whitespace-nowrap">
                    {formatDateShort(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#899581] py-10 text-center">No activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
