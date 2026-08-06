"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { productsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";

interface Props {
  id: string;
  name: string;
}

export default function DeleteProductButton({ id, name }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    if (!getAdminSession()) { alert("Not authenticated."); return; }
    setDeleting(true);
    try {
      await productsApi.delete(id, "");
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors inline-flex"
      aria-label={`Delete ${name}`}
      title="Delete product"
    >
      <Trash2 size={14} />
    </button>
  );
}
