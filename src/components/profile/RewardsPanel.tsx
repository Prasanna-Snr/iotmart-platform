"use client";

import { useState, useEffect } from "react";
import { Gift, Zap } from "lucide-react";
import { rewardsApi } from "@/lib/api";
import { formatDateShort } from "@/lib/utils";

interface Props {
  token: string;
}

interface RewardTx {
  id: string;
  points: number;
  description: string;
  created_at: string;
}

export default function RewardsPanel({ token }: Props) {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<RewardTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    rewardsApi
      .get(token)
      .then((data) => {
        setBalance(data.balance ?? 0);
        setHistory(data.history ?? []);
      })
      .catch((e) => setError(e.message ?? "Failed to load rewards."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#11100E]">Rewards</h2>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-[#5D1C34] to-[#4a1628] rounded-xl p-6 text-white flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Gift size={22} />
        </div>
        <div>
          <p className="text-xs text-[#CDBBAD] uppercase tracking-wide font-medium">Reward Points</p>
          <p className="text-3xl font-bold">{loading ? "…" : balance}</p>
          <p className="text-xs text-[#CDBBAD] mt-1">
            Earn 1 point for every Rs. 100 spent on delivered orders.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* History */}
      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#11100E] mb-3">Points History</h3>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Zap size={24} className="mx-auto text-[#CDBBAD] mb-2" />
            <p className="text-sm text-[#899581]">No reward points yet.</p>
            <p className="text-xs text-[#CDBBAD] mt-1">Points are earned when an order is delivered.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0E9E3]">
            {history.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-[#11100E] font-medium">{tx.description}</p>
                  <p className="text-xs text-[#899581] mt-0.5">{formatDateShort(tx.created_at)}</p>
                </div>
                <span className="text-sm font-bold text-green-600">+{tx.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
