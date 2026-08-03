"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Eye,
  TrendingUp,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Activity,
  BarChart2,
  Wifi,
} from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#899581] font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#11100E]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-[#899581] mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color = "bg-[#5D1C34]",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#11100E] font-medium truncate mr-2">{label}</span>
        <span className="text-[#899581] flex-shrink-0">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-[#F0E9E3] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Default empty states ─────────────────────────────────────────────────────

const DEFAULT_SUMMARY = {
  visitors_today: 0,
  visitors_this_week: 0,
  visitors_this_month: 0,
  total_visitors: 0,
  page_views_today: 0,
  page_views_total: 0,
  online_now: 0,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [summary, setSummary]     = useState(DEFAULT_SUMMARY);
  const [topPages, setTopPages]   = useState<any[]>([]);
  const [devices, setDevices]     = useState<any[]>([]);
  const [browsers, setBrowsers]   = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [trend, setTrend]         = useState<any[]>([]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    Promise.all([
      analyticsApi.summary(token).catch(() => DEFAULT_SUMMARY),
      analyticsApi.topPages(token, 8).catch(() => []),
      analyticsApi.devices(token).catch(() => []),
      analyticsApi.browsers(token).catch(() => []),
      analyticsApi.countries(token).catch(() => []),
      analyticsApi.trend(token, 14).catch(() => []),
    ]).then(([sum, pages, devs, brows, cntrs, trnd]) => {
      setSummary(sum);
      setTopPages(pages);
      setDevices(devs);
      setBrowsers(brows);
      setCountries(cntrs);
      setTrend(trnd);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load analytics data.");
      setLoading(false);
    });
  }, []);

  const deviceIcon = (type: string) => {
    if (type === "mobile") return Smartphone;
    if (type === "tablet") return Tablet;
    return Monitor;
  };

  const maxPageViews = Math.max(1, ...topPages.map((p: any) => p.views));
  const maxDevice    = Math.max(1, ...devices.map((d: any) => d.count));
  const maxBrowser   = Math.max(1, ...browsers.map((b: any) => b.count));
  const maxCountry   = Math.max(1, ...countries.map((c: any) => c.count));
  const maxTrend     = Math.max(1, ...trend.map((t: any) => t.unique_visitors));

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#11100E]">Visitor Analytics</h1>
            <p className="text-sm text-[#899581] mt-0.5">Live visitor data from PostgreSQL</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 animate-pulse">
              <div className="h-3 bg-[#F0E9E3] rounded w-1/2 mb-3" />
              <div className="h-7 bg-[#F0E9E3] rounded w-2/3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 animate-pulse h-52" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#11100E]">Visitor Analytics</h1>
          <p className="text-sm text-[#899581] mt-0.5">Live visitor data from PostgreSQL</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded-full">
          <Wifi size={12} />
          <span>{summary.online_now} online now</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Visitors Today"
          value={summary.visitors_today}
          sub={`${summary.page_views_today} page views`}
          icon={Users}
          color="bg-[#5D1C34]/10 text-[#5D1C34]"
        />
        <KpiCard
          label="This Week"
          value={summary.visitors_this_week}
          icon={TrendingUp}
          color="bg-amber-100 text-amber-700"
        />
        <KpiCard
          label="This Month"
          value={summary.visitors_this_month}
          icon={BarChart2}
          color="bg-blue-100 text-blue-700"
        />
        <KpiCard
          label="Total Visitors"
          value={summary.total_visitors}
          sub={`${summary.page_views_total} total views`}
          icon={Globe}
          color="bg-green-100 text-green-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily trend chart */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[#5D1C34]" /> Daily Visitor Trend (14 days)
          </h2>
          {trend.length === 0 ? (
            <p className="text-sm text-[#899581] text-center py-8">No data yet</p>
          ) : (
            <div className="flex items-end gap-1 h-36">
              {trend.map((d: any) => (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className="w-full bg-[#5D1C34] rounded-t-sm hover:bg-[#A67D45] transition-colors cursor-default"
                    style={{
                      height: `${(d.unique_visitors / maxTrend) * 100}%`,
                      minHeight: "2px",
                    }}
                    title={`${d.day}: ${d.unique_visitors} visitors`}
                  />
                  <span className="text-[10px] text-[#CDBBAD] rotate-45 origin-left mt-1 whitespace-nowrap">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4 flex items-center gap-2">
            <Eye size={16} className="text-[#5D1C34]" /> Top Pages
          </h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-[#899581] text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topPages.map((p: any) => (
                <BarRow key={p.path} label={p.path} value={p.views} max={maxPageViews} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device breakdown */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4 flex items-center gap-2">
            <Monitor size={16} className="text-[#5D1C34]" /> Devices
          </h2>
          {devices.length === 0 ? (
            <p className="text-sm text-[#899581] text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {devices.map((d: any) => {
                const DevIcon = deviceIcon(d.device_type);
                return (
                  <div key={d.device_type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-[#11100E] font-medium capitalize">
                        <DevIcon size={12} />
                        {d.device_type}
                      </span>
                      <span className="text-[#899581]">{d.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-[#F0E9E3] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#A67D45] rounded-full"
                        style={{ width: `${(d.count / maxDevice) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Browser breakdown */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4 flex items-center gap-2">
            <Globe size={16} className="text-[#5D1C34]" /> Browsers
          </h2>
          {browsers.length === 0 ? (
            <p className="text-sm text-[#899581] text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {browsers.map((b: any) => (
                <BarRow
                  key={b.browser}
                  label={b.browser}
                  value={b.count}
                  max={maxBrowser}
                  color="bg-blue-400"
                />
              ))}
            </div>
          )}
        </div>

        {/* Country breakdown */}
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <h2 className="font-semibold text-[#11100E] mb-4 flex items-center gap-2">
            <Globe size={16} className="text-[#5D1C34]" /> Countries
          </h2>
          {countries.length === 0 ? (
            <p className="text-sm text-[#899581] text-center py-6">No country data (no GeoIP configured)</p>
          ) : (
            <div className="space-y-3">
              {countries.map((c: any) => (
                <BarRow
                  key={c.country}
                  label={c.country}
                  value={c.count}
                  max={maxCountry}
                  color="bg-green-500"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
