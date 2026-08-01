"use client";

import { useState } from "react";
import { CheckCircle, Store, Mail, Truck, CreditCard, Shield, Bell } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [store, setStore] = useState({ name: SITE_NAME, description: SITE_DESCRIPTION, url: SITE_URL, email: "admin@iotmart.com", phone: "+1 (555) 000-0000", currency: "USD" });
  const [shipping, setShipping] = useState({ freeThreshold: "50", defaultCost: "5.99", processingDays: "1-2" });
  const [tax, setTax] = useState({ rate: "8", taxId: "" });
  const [notifications, setNotifications] = useState({ newOrder: true, lowStock: true, newReview: false, newsletter: true });

  const save = async (section: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSaved(section);
    setTimeout(() => setSaved(null), 3000);
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#5D1C34]/10"><Icon size={15} className="text-[#5D1C34]" /></div>
          <h2 className="font-semibold text-[#11100E]">{title}</h2>
        </div>
        {saved === id && (
          <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium"><CheckCircle size={13} /> Saved</span>
        )}
      </div>
      {children}
      <div className="mt-5 flex justify-end">
        <button onClick={() => save(id)} disabled={loading} className="bg-[#5D1C34] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors">
          {loading && saved !== id ? "…" : "Save Changes"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#11100E] mb-6">Settings</h1>

      <div className="space-y-6 max-w-3xl">
        {/* Store */}
        <Section id="store" title="Store Information" icon={Store}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Store Name" value={store.name} onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))} />
              <Input label="Store URL" value={store.url} onChange={(e) => setStore((s) => ({ ...s, url: e.target.value }))} />
            </div>
            <Textarea label="Description" value={store.description} onChange={(e) => setStore((s) => ({ ...s, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Email" type="email" value={store.email} onChange={(e) => setStore((s) => ({ ...s, email: e.target.value }))} />
              <Input label="Contact Phone" value={store.phone} onChange={(e) => setStore((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <Input label="Currency" value={store.currency} onChange={(e) => setStore((s) => ({ ...s, currency: e.target.value }))} />
          </div>
        </Section>

        {/* Shipping */}
        <Section id="shipping" title="Shipping" icon={Truck}>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Free Shipping Threshold ($)" type="number" value={shipping.freeThreshold} onChange={(e) => setShipping((s) => ({ ...s, freeThreshold: e.target.value }))} />
            <Input label="Default Shipping Cost ($)" type="number" value={shipping.defaultCost} onChange={(e) => setShipping((s) => ({ ...s, defaultCost: e.target.value }))} />
            <Input label="Processing Days" value={shipping.processingDays} onChange={(e) => setShipping((s) => ({ ...s, processingDays: e.target.value }))} />
          </div>
        </Section>

        {/* Tax */}
        <Section id="tax" title="Tax & Payments" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tax Rate (%)" type="number" value={tax.rate} onChange={(e) => setTax((s) => ({ ...s, rate: e.target.value }))} />
            <Input label="Tax ID / VAT Number" value={tax.taxId} onChange={(e) => setTax((s) => ({ ...s, taxId: e.target.value }))} placeholder="Optional" />
          </div>
        </Section>

        {/* Notifications */}
        <Section id="notifications" title="Email Notifications" icon={Bell}>
          <div className="space-y-3">
            {[
              { key: "newOrder", label: "New Order", desc: "Get notified when a new order is placed" },
              { key: "lowStock", label: "Low Stock Alert", desc: "Alert when product stock falls below 5" },
              { key: "newReview", label: "New Review", desc: "Get notified when a customer leaves a review" },
              { key: "newsletter", label: "Newsletter Signups", desc: "Get notified for new newsletter subscribers" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 rounded-lg border border-[#CDBBAD]/50 cursor-pointer hover:bg-[#F0E9E3]/50 transition-colors">
                <input type="checkbox" checked={notifications[key as keyof typeof notifications]} onChange={(e) => setNotifications((n) => ({ ...n, [key]: e.target.checked }))} className="accent-[#5D1C34] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#11100E]">{label}</p>
                  <p className="text-xs text-[#899581]">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* Security */}
        <Section id="security" title="Security" icon={Shield}>
          <div className="space-y-4">
            <Input label="Current Password" type="password" value="" onChange={() => {}} placeholder="••••••••" />
            <Input label="New Password" type="password" value="" onChange={() => {}} placeholder="••••••••" />
            <Input label="Confirm New Password" type="password" value="" onChange={() => {}} placeholder="••••••••" />
          </div>
        </Section>

        {/* Email */}
        <Section id="email" title="Email Templates" icon={Mail}>
          <div className="space-y-4">
            <p className="text-sm text-[#899581]">Customize the emails sent to customers for order confirmations, shipping updates, and more.</p>
            <div className="grid grid-cols-1 gap-2">
              {["Order Confirmation", "Shipping Notification", "Delivery Confirmation", "Password Reset"].map((tmpl) => (
                <div key={tmpl} className="flex items-center justify-between p-3 rounded-lg border border-[#CDBBAD]/50">
                  <span className="text-sm font-medium text-[#11100E]">{tmpl}</span>
                  <button className="text-xs text-[#5D1C34] hover:underline font-medium">Edit Template</button>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
