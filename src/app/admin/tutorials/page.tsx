"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { tutorialsApi, type Tutorial } from "@/lib/api";
import { DIFFICULTY_COLORS } from "@/lib/constants";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function AdminTutorialsPage() {
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [difficulty, setDifficulty]     = useState("");

  useEffect(() => {
    tutorialsApi
      .list({ page_size: 200 })
      .then((data) => setAllTutorials(data.items))
      .catch((e) => setError(e.message ?? "Failed to load tutorials."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allTutorials.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.tags ?? []).some((tag: string) => tag.toLowerCase().includes(q));
    const matchDiff = !difficulty || t.difficulty === difficulty;
    return matchSearch && matchDiff;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#11100E]">Tutorials</h1>
        <Link
          href="/admin/tutorials/new"
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          <Plus size={14} /> Add Tutorial
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tutorials…"
          className="flex-1 min-w-0 border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
        />
        {(search || difficulty) && (
          <button
            onClick={() => { setSearch(""); setDifficulty(""); }}
            className="border border-[#CDBBAD] text-sm text-[#899581] px-3 py-2 rounded-lg hover:bg-[#F0E9E3]"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {["", ...DIFFICULTIES].map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              difficulty === d
                ? "bg-[#5D1C34] text-white border-[#5D1C34]"
                : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"
            }`}
          >
            {d || "All"}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-[#899581] text-sm">Loading tutorials…</div>}
      {error && (
        <div className="text-center py-8 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F0E9E3] text-xs text-[#899581]">
            {filtered.length} tutorial{filtered.length !== 1 ? "s" : ""}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0E9E3]">
                <tr>
                  {["Tutorial", "Category", "Difficulty", "Time", "Views", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E9E3]">
                {filtered.map((tut: Tutorial) => (
                  <tr key={tut.id} className="hover:bg-[#F0E9E3]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                          {tut.cover_image ? (
                            <Image src={tut.cover_image} alt={tut.title} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">IMG</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#11100E] text-xs line-clamp-2">{tut.title}</p>
                          <p className="text-xs text-[#899581]">{tut.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#899581]">{tut.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[tut.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
                        {tut.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#899581]">{tut.estimated_time}</td>
                    <td className="px-4 py-3 text-xs text-[#899581]">{(tut.views ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tut.published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {tut.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/tutorials/${tut.id}/edit`} className="inline-flex items-center gap-1 text-xs text-[#5D1C34] hover:underline">
                        <Pencil size={12} /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#899581] text-sm">No tutorials found.</div>
          )}
        </div>
      )}
    </div>
  );
}
