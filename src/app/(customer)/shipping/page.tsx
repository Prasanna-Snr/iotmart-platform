import type { Metadata } from "next";
import { Truck, Package, Globe, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "IoTMart shipping information, delivery times, and rates.",
};

export default function ShippingPage() {
  return (
    <div className="container-custom py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#11100E] mb-2">Shipping Policy</h1>
        <p className="text-sm text-[#899581] mb-8">Last updated: January 1, 2026</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {[
            { icon: Truck,   title: "Free Shipping",   body: "All US orders over $50 qualify for free standard shipping." },
            { icon: Clock,   title: "Processing Time", body: "Orders are processed within 1–2 business days." },
            { icon: Package, title: "Packaging",       body: "All components are carefully packaged in anti-static, padded boxes." },
            { icon: Globe,   title: "International",   body: "We ship to 35+ countries. Rates calculated at checkout." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 flex gap-4">
              <div className="bg-[#5D1C34]/10 p-2.5 rounded-lg h-fit"><Icon size={18} className="text-[#5D1C34]" /></div>
              <div>
                <h3 className="font-semibold text-[#11100E] text-sm">{title}</h3>
                <p className="text-xs text-[#899581] mt-1">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-[#F0E9E3]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#11100E]">Method</th>
                <th className="px-4 py-3 text-left font-semibold text-[#11100E]">Delivery Time</th>
                <th className="px-4 py-3 text-left font-semibold text-[#11100E]">Cost</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Standard Shipping",     "3–7 business days",  "Free over $50, else $5.99"],
                ["Express Shipping",      "1–2 business days",  "$12.99"],
                ["International Standard","7–21 business days", "$14.99–$24.99"],
                ["International Express", "3–7 business days",  "$39.99"],
              ].map(([method, time, cost], idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#F0E9E3]/30"}>
                  <td className="px-4 py-3 font-medium text-[#11100E]">{method}</td>
                  <td className="px-4 py-3 text-[#899581]">{time}</td>
                  <td className="px-4 py-3 text-[#A67D45] font-medium">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="text-sm text-[#899581]">
          Questions? Contact us at{" "}
          <a href="mailto:support@iotmart.com" className="text-[#5D1C34] hover:underline">support@iotmart.com</a>
        </p>
      </div>
    </div>
  );
}
