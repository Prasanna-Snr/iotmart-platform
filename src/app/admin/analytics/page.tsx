import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, ShoppingBag, Users, Package, TrendingUp, TrendingDown } from "lucide-react";
import { salesStats, revenueChartData, topProductsData, orders } from "@/data/orders";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/constants";

export const metadata: Metadata = { title: "Analytics | Admin" };

export default function AdminAnalyticsPage() {
  const maxRevenue = Math.max(...revenueChartData.map((d) => d.value));
  const maxSales = Math.max(...topProductsData.map((d) => d.value));

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Total Revenue", value: formatPrice(salesStats.totalRevenue), change: salesStats.revenueChange, icon: DollarSign, color: "bg-[#5D1C34]/10 text-[#5D1C34]" },
    { label: "Total Orders", value: salesStats.totalOrders, change: salesStats.ordersChange, icon: ShoppingBag, color: "bg-amber-100 text-amber-700" },
    { label: "Customers", value: salesStats.totalCustomers, change: salesStats.customersChange, icon: Users, color: "bg-blue-100 text-blue-700" },
    { label: "Products", value: salesStats.totalProducts, change: 0, icon: Package, color: "bg-green-100 text-green-700" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#11100E]">Analytics</h1>
        <span className="text-sm text-[#899581]">Last 6 months</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#899581] font-medium">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}><Icon size={15} /></div>
            </div>
            <p className="text-2xl font-bold text-[#11100E]">{value}</p>
            {change !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${change > 0 ? "text-green-600" : "text-red-600"}`}>
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
          <h2 className="font-semibold text-[#11100E] mb-4">Monthly Revenue</h2>
          <div className="flex items-end gap-2 h-40">
            {revenueChartData.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[#899581]">${(d.value / 1000).toFixed(1)}k</span>
                <div className="w-full bg-[#5D1C34] rounded-t-md transition-all" style={{ height: `${(d.value / maxRevenue) * 100}%` }} />
                <span className="text-xs text-[#899581]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4">Top Selling Products</h2>
          <div className="space-y-3">
            {topProductsData.map((d, i) => (
              <div key={d.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#11100E] font-medium truncate mr-2">
                    <span className="text-[#CDBBAD] mr-1.5">#{i + 1}</span>{d.label}
                  </span>
                  <span className="text-[#899581] flex-shrink-0">{d.value} sold</span>
                </div>
                <div className="h-2 bg-[#F0E9E3] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A67D45] rounded-full" style={{ width: `${(d.value / maxSales) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order status breakdown */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4">Order Status Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ORDER_STATUS_COLORS[status]}`}>{status}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-[#F0E9E3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5D1C34] rounded-full" style={{ width: `${(count / orders.length) * 100}%` }} />
                  </div>
                  <span className="text-xs text-[#899581] w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0E9E3]">
            <h2 className="font-semibold text-[#11100E]">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-[#5D1C34] hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-[#F0E9E3]">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-xs font-mono text-[#11100E]">{order.orderNumber.slice(0, 18)}…</p>
                  <p className="text-xs text-[#899581]">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#11100E]">{formatPrice(order.total)}</p>
                  <p className="text-xs text-[#899581]">{formatDateShort(order.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
