"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ordersApi, authApi, addressesApi } from "@/lib/api";
import Input from "@/components/ui/Input";
import {
  formatPrice,
  calculateShipping,
  calculateTotal,
} from "@/lib/utils";
import { useStoreSettings } from "@/hooks/useStoreSettings";

type Step = 1 | 2 | 3;

interface ShippingForm {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
}

const initialShipping: ShippingForm = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { token, ready } = useCustomerAuth();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useStoreSettings();
  const { freeShippingThreshold, shippingCost: defaultShippingCost } = settings;
  const [step, setStep] = useState<Step>(1);
  const [shipping, setShipping] = useState<ShippingForm>(initialShipping);
  const [errors, setErrors] = useState<Partial<ShippingForm>>({});
  const paymentMethod = "cod";
  const [orderNumber, setOrderNumber] = useState("");
  const [orderError, setOrderError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (ready && !token) {
      router.replace("/login?redirect=/checkout");
    }
  }, [ready, token, router]);

  // Fetch logged-in user's email
  useEffect(() => {
    if (token) {
      authApi.me(token).then((u: any) => setUserEmail(u.email ?? "")).catch(() => {});
    }
  }, [token]);

  // Fetch saved addresses
  useEffect(() => {
    if (!token) return;
    addressesApi
      .list(token)
      .then((data) => {
        setSavedAddresses(data);
        const def = data.find((a) => a.is_default);
        if (def) applyAddress(def);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const applyAddress = (a: any) => {
    const name = (a.full_name ?? "").split(" ");
    setShipping({
      firstName: name[0] ?? "",
      lastName: name.slice(1).join(" ") ?? "",
      phone: a.phone ?? "",
      addressLine1: a.address_line1 ?? "",
      addressLine2: a.address_line2 ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
    });
  };

  const shippingCost = calculateShipping(subtotal, freeShippingThreshold, defaultShippingCost);
  const total = calculateTotal(subtotal, freeShippingThreshold, defaultShippingCost);

  const validateStep1 = () => {
    const e: Partial<ShippingForm> = {};
    if (!shipping.firstName.trim()) e.firstName = "First name is required";
    if (!shipping.lastName.trim()) e.lastName = "Last name is required";
    if (!shipping.phone.trim()) e.phone = "Phone is required";
    if (!shipping.addressLine1.trim()) e.addressLine1 = "Address is required";
    if (!shipping.city.trim()) e.city = "City is required";
    if (!shipping.state.trim()) e.state = "State is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError("");
    setPlacingOrder(true);
    try {
      const payload = {
        items: items.map(({ product, quantity }) => ({
          product_id:    product.id,
          product_name:  product.name,
          product_image: product.images?.[0] ?? "",
          price:         product.price,
          quantity,
          subtotal:      Math.round(product.price * quantity * 100) / 100,
        })),
        shipping_address: {
          first_name:    shipping.firstName,
          last_name:     shipping.lastName,
          phone:         shipping.phone,
          address_line1: shipping.addressLine1,
          address_line2: shipping.addressLine2,
          city:          shipping.city,
          state:         shipping.state,
        },
        payment_method: paymentMethod,
      };
      const order: any = await ordersApi.create(payload, token!);
      setOrderNumber(order.order_number);
      clearCart();
      setStep(3);
    } catch (err: any) {
      setOrderError(err.message ?? "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const field = (key: keyof ShippingForm) => ({
    value: shipping[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setShipping((s) => ({ ...s, [key]: e.target.value })),
    error: errors[key],
  });

  const steps = ["Shipping", "Review", "Confirmation"];

  // Still reading localStorage — don't render yet
  if (!ready || !token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#899581] text-sm">Checking authentication…</p>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {steps.map((s, idx) => {
          const num = (idx + 1) as Step;
          const done = step > num;
          const active = step === num;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  done
                    ? "bg-green-600 text-white"
                    : active
                    ? "bg-[#5D1C34] text-white"
                    : "bg-[#CDBBAD]/40 text-[#899581]"
                }`}
              >
                {done ? <Check size={14} /> : num}
              </div>
              <span
                className={`text-sm font-medium ${active ? "text-[#11100E]" : "text-[#899581]"}`}
              >
                {s}
              </span>
              {idx < steps.length - 1 && (
                <ChevronRight size={16} className="text-[#CDBBAD] mx-1" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form area */}
        <div className="lg:col-span-2">
          {step === 1 && (
            <form onSubmit={handleStep1Submit} noValidate>
              {savedAddresses.length > 0 && (
                <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 mb-5">
                  <h2 className="text-base font-bold text-[#11100E] mb-3">
                    Use a saved address
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {savedAddresses.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => applyAddress(a)}
                        className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                          shipping.addressLine1 === a.address_line1 && shipping.city === a.city
                            ? "border-[#5D1C34] bg-[#5D1C34]/5"
                            : "border-[#CDBBAD]/50 hover:border-[#A67D45]/50"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium text-[#11100E]">
                          {a.label}
                          {a.is_default && (
                            <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-[#899581] mt-1 line-clamp-1">
                          {a.address_line1}, {a.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
                <h2 className="text-lg font-bold text-[#11100E] mb-5">
                  Shipping Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="First Name" required {...field("firstName")} />
                  <Input label="Last Name" required {...field("lastName")} />
                  <Input label="Phone" type="tel" required {...field("phone")} />
                  <div className="sm:col-span-2">
                    <Input label="Address" required {...field("addressLine1")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Apartment, suite, etc."
                      {...field("addressLine2")}
                    />
                  </div>
                  <Input label="City" required {...field("city")} />
                  <Input label="State / Province" required {...field("state")} />
                </div>
                <button
                  type="submit"
                  className="mt-6 w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit}>
              <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
                <h2 className="text-lg font-bold text-[#11100E] mb-5">
                  Review &amp; Place Order
                </h2>

                {/* COD notice */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F0E9E3] border border-[#CDBBAD]/60 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#5D1C34]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#5D1C34] text-sm font-bold">₵</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#11100E]">Cash on Delivery</p>
                    <p className="text-xs text-[#899581] mt-0.5">
                      Pay in cash when your order arrives. No payment required now.
                    </p>
                  </div>
                </div>

                {/* Shipping summary */}
                <div className="rounded-xl border border-[#CDBBAD]/50 p-4 mb-6">
                  <p className="text-xs font-semibold text-[#899581] uppercase tracking-wide mb-2">Delivering to</p>
                  <p className="text-sm text-[#11100E] font-medium">
                    {shipping.firstName} {shipping.lastName}
                  </p>
                  <p className="text-xs text-[#899581] mt-0.5">
                    {shipping.addressLine1}
                    {shipping.addressLine2 ? `, ${shipping.addressLine2}` : ""},{" "}
                    {shipping.city}, {shipping.state}
                  </p>
                  <p className="text-xs text-[#899581]">{shipping.phone}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-[#CDBBAD] text-[#11100E] py-3 rounded-xl font-medium hover:bg-[#F0E9E3] transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={placingOrder}
                    className="flex-1 bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors text-sm"
                  >
                    {placingOrder ? "Placing Order…" : `Place Order • ${formatPrice(total)}`}
                  </button>
                </div>
                {orderError && (
                  <p className="mt-3 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">
                    {orderError}
                  </p>
                )}
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#11100E] mb-2">
                Order Placed!
              </h2>
              <p className="text-[#899581] mb-1">
                Thank you, {shipping.firstName}!
              </p>
              <p className="text-sm text-[#899581] mb-4">
                Order number:{" "}
                <strong className="text-[#11100E]">{orderNumber}</strong>
              </p>
              <p className="text-sm text-[#899581] mb-8">
                A confirmation has been sent to{" "}
                <strong>{userEmail}</strong>.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#5D1C34] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a1628] transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        {step < 3 && (
          <aside>
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 sticky top-20">
              <h2 className="font-semibold text-[#11100E] mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">
                          IMG
                        </div>
                      )}
                      <span className="absolute -top-1 -right-1 bg-[#5D1C34] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#11100E] line-clamp-1">
                        {product.name}
                      </p>
                      <p className="text-xs text-[#899581]">
                        {formatPrice(product.price)} × {quantity}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[#11100E]">
                      {formatPrice(product.price * quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F0E9E3] pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-[#899581]">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#899581]">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? "text-green-600" : ""}>
                    {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#11100E] text-base pt-1">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
