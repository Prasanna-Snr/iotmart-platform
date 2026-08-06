/**
 * /admin/products/categories — redirects to the canonical /admin/categories page.
 *
 * The old page was a mock local-only implementation. The real API-backed
 * category management lives at /admin/categories. This redirect ensures any
 * bookmarked or linked URLs still work.
 */
import { redirect } from "next/navigation";

export default function AdminProductCategoriesRedirect() {
  redirect("/admin/categories");
}
