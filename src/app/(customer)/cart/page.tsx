"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import {
  formatPrice,
  calculateShipping,
  calculateTax,
  calculateTotal,
} from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/lib/constants";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal, totalItems } =
    useCart();

  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const total = calculateTotal(subtotal);
  const shippingProgress = Math.min(
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
    100
  );

  if (items.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-[#CDBBAD] mb-6" />
        <h1 className="text-2xl font-bold text-[#11100E] mb-2">
          Your cart is empty
        </h1>
        <p className="text-[#899581] mb-8">
          Add some products to get started!
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-[#5D1C34] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a1628] transition-colors"
        >
          Browse Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-2xl font-bold text-[#11100E] mb-6">
        Shopping Cart ({totalItems} item{totalItems !== 1 ? "s" : ""})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free shipping progress */}
          {subtotal < FREE_SHIPPING_THRESHOLD && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
              <p className="text-sm text-[#899581] mb-2">
                Add{" "}
                <strong className="text-[#11100E]">
                  {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}
                </strong>{" "}
                more for free shipping!
              </p>
              <div className="h-2 bg-[#F0E9E3] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#A67D45] rounded-full transition-all duration-300"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {items.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex gap-4"
            >
              <Link
                href={`/products/${product.slug}`}
                className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0"
              >
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${product.slug}`}
                  className="font-medium text-[#11100E] hover:text-[#5D1C34] text-sm line-clamp-2"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-[#899581] mt-0.5">
                  {product.brand.name}
                </p>

                <div className="flex items-center justify-between mt-3">
                  {/* Qty stepper */}
                  <div className="flex items-center border border-[#CDBBAD] rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="px-2.5 py-1.5 text-[#899581] hover:bg-[#F0E9E3] transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium border-x border-[#CDBBAD]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stock}
                      className="px-2.5 py-1.5 text-[#899581] hover:bg-[#F0E9E3] disabled:opacity-40 transition-colors"
                      aria-label="Increase"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-[#11100E] text-sm">
                      {formatPrice(product.price * quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="text-[#899581] hover:text-red-500 transition-colors"
                      aria-label={`Remove ${product.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm text-[#5D1C34] hover:underline mt-2"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Order summary */}
        <aside>
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 sticky top-20">
            <h2 className="font-semibold text-[#11100E] mb-4">
              Order Summary
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#899581]">Subtotal</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899581]">Shipping</dt>
                <dd className={shipping === 0 ? "text-green-600 font-medium" : "font-medium"}>
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899581]">Tax (8%)</dt>
                <dd className="font-medium">{formatPrice(tax)}</dd>
              </div>
              <div className="h-px bg-[#F0E9E3] my-1" />
              <div className="flex justify-between text-base">
                <dt className="font-bold text-[#11100E]">Total</dt>
                <dd className="font-bold text-[#11100E]">
                  {formatPrice(total)}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-5 w-full flex items-center justify-center gap-2 bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] transition-colors text-sm"
            >
              Proceed to Checkout <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
