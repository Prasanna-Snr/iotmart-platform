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
import {
  analyticsApi,
  type AnalyticsSummary,
  type TopPage,
  type DeviceBreakdown,
  type BrowserBreakdown,
  type CountryBreakdown,
  type DailyTrend,
} from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";

// ─── Rollup types (from /api/analytics/admin/rollup) ──────────────────────────

interface RollupRow {
  day: string;
  views: number;
  visitors: number;
  sessions: number;
  avg_duration_ms: number | null;
}

interface RollupResult {
  days: number;
  pruned: number;
}

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

// Admin cookie auth is automatic via the httpOnly access_token cookie — no
// token header is needed for the rollup endpoints.
async function fetchRollupRows(): Promise<RollupRow[]> {
  try {
    const res = await fetch("/api/analytics/admin/rollup", { headers: {} });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [summary, setSummary]     = useState<AnalyticsSummary>(DEFAULT_SUMMARY);
  const [topPages, setTopPages]   = useState<TopPage[]>([]);
  const [devices, setDevices]     = useState<DeviceBreakdown[]>([]);
  const [browsers, setBrowsers]   = useState<BrowserBreakdown[]>([]);
  const [countries, setCountries] = useState<CountryBreakdown[]>([]);
  const [trend, setTrend]         = useState<DailyTrend[]>([]);
  const [rollup, setRollup]       = useState<RollupRow[]>([]);
  const [runningRollup, setRunningRollup] = useState(false);
  const [rollupStatus, setRollupStatus]   = useState("");

  useEffect(() => {
    const token = getAdminSession()?.id ?? null;
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
      fetchRollupRows(),
    ]).then(([sum, pages, devs, brows, cntrs, trnd, roll]) => {
      setSummary(sum);
      setTopPages(pages);
      setDevices(devs);
      setBrowsers(brows);
      setCountries(cntrs);
      setTrend(trnd);
      setRollup(roll);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load analytics data.");
      setLoading(false);
    });
  }, []);

  const runRollup = async () => {
    setRunningRollup(true);
    setRollupStatus("");
    try {
      const res = await fetch("/api/analytics/admin/rollup", {
        method: "POST",
        headers: {},
      });
      if (!res.ok) throw new Error("rollup failed");
      const data: RollupResult = await res.json();
      setRollupStatus(`Rolled up ${data.days} day(s); pruned ${data.pruned} old view(s).`);
      setRollup(await fetchRollupRows());
    } catch {
      setRollupStatus("Rollup failed — check that you are logged in as admin.");
    } finally {
      setRunningRollup(false);
    }
  };

  const deviceIcon = (type: string) => {
    if (type === "mobile") return Smartphone;
    if (type === "tablet") return Tablet;
    return Monitor;
  };

  const maxPageViews = Math.max(1, ...topPages.map((p) => p.views));
  const maxDevice    = Math.max(1, ...devices.map((d) => d.count));
  const maxBrowser   = Math.max(1, ...browsers.map((b) => b.count));
  const maxCountry   = Math.max(1, ...countries.map((c) => c.count));
  const maxTrend     = Math.max(1, ...trend.map((t) => t.unique_visitors));

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
              {trend.map((d) => (
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
              {topPages.map((p) => (
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
              {devices.map((d) => {
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
              {browsers.map((b) => (
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
              {countries.map((c) => (
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

      {/* Daily rollup */}
      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#11100E] flex items-center gap-2">
            <BarChart2 size={16} className="text-[#5D1C34]" /> Daily Rollup
          </h2>
          <div className="flex items-center gap-3">
            {rollupStatus && <span className="text-xs text-[#899581]">{rollupStatus}</span>}
            <button
              onClick={runRollup}
              disabled={runningRollup}
              className="bg-[#5D1C34] hover:bg-[#A67D45] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {runningRollup ? "Running..." : "Run rollup now"}
            </button>
          </div>
        </div>
        {rollup.length === 0 ? (
          <p className="text-sm text-[#899581] text-center py-8">No daily rollups yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#899581] border-b border-[#F0E9E3]">
                  <th className="py-2 pr-4 font-medium">Day</th>
                  <th className="py-2 pr-4 font-medium">Views</th>
                  <th className="py-2 pr-4 font-medium">Visitors</th>
                  <th className="py-2 pr-4 font-medium">Sessions</th>
                  <th className="py-2 font-medium">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {rollup.map((r) => (
                  <tr key={r.day} className="border-b border-[#F0E9E3]/60 last:border-0">
                    <td className="py-2 pr-4 text-[#11100E] font-medium">{r.day}</td>
                    <td className="py-2 pr-4 text-[#11100E]">{r.views.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-[#11100E]">{r.visitors.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-[#11100E]">{r.sessions.toLocaleString()}</td>
                    <td className="py-2 text-[#11100E]">
                      {r.avg_duration_ms != null ? `${(r.avg_duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
