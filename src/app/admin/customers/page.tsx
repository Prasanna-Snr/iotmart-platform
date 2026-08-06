"use client";

import { useState, useEffect } from "react";
import { Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { usersApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { formatDateShort } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function AdminCustomersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const token = getAdminSession()?.id ?? null;
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    const q = search.trim();
    const timer = setTimeout(() => {
      setLoading(true);
      usersApi
        .list(token, { page, page_size: PAGE_SIZE, search: q || undefined })
        .then((data: any) => {
          if (Array.isArray(data)) {
            setUsers(data);
            setTotal(data.length);
          } else {
            setUsers(data?.items ?? []);
            setTotal(data?.total ?? 0);
          }
        })
        .catch((e: any) => setError(e.message ?? "Failed to load customers."))
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [page, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#11100E]">Customers</h1>
        <span className="text-sm text-[#899581]">
          {loading ? "…" : `${total} customer${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="flex-1 min-w-0 border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
        />
        {search && (
          <button
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            className="px-3 py-2 border border-[#CDBBAD] rounded-lg text-sm text-[#899581] hover:bg-[#F0E9E3]"
          >
            Clear
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-16 text-[#899581] text-sm">
          Loading customers…
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F0E9E3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden md:table-cell">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden sm:table-cell">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E9E3]">
                  {users.map((user: any) => (
                    <tr
                      key={user.id}
                      className="hover:bg-[#F0E9E3]/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#5D1C34]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[#5D1C34]">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[#11100E] text-sm">
                              {user.name}
                            </p>
                            <a
                              href={`mailto:${user.email}`}
                              className="flex items-center gap-1 text-xs text-[#899581] hover:text-[#5D1C34]"
                            >
                              <Mail size={10} />
                              {user.email}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#899581] hidden md:table-cell">
                        {user.phone ? (
                          <a
                            href={`tel:${user.phone}`}
                            className="flex items-center gap-1 hover:text-[#5D1C34]"
                          >
                            <Phone size={10} />
                            {user.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#899581] hidden sm:table-cell">
                        {formatDateShort(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="text-center py-12 text-[#899581] text-sm">
                No customers found.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#CDBBAD] text-[#11100E] hover:border-[#5D1C34] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-sm text-[#899581]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#CDBBAD] text-[#11100E] hover:border-[#5D1C34] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
