import type { Metadata } from "next";
import { RotateCcw, CheckCircle, XCircle, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Return Policy",
  description: "IoTMart return and refund policy.",
};

export default function ReturnsPage() {
  return (
    <div className="container-custom py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#11100E] mb-2">
          Return &amp; Refund Policy
        </h1>
        <p className="text-sm text-[#899581] mb-8">
          Last updated: January 1, 2026
        </p>

        <div className="bg-[#5D1C34]/5 border border-[#5D1C34]/20 rounded-xl p-5 mb-8 flex gap-3">
          <RotateCcw size={20} className="text-[#5D1C34] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#11100E]">
            We accept returns within <strong>30 days</strong> of delivery for most items
            in original, unused condition.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-500" />
              <h3 className="font-semibold text-[#11100E]">Eligible for Return</h3>
            </div>
            <ul className="space-y-2 text-sm text-[#899581]">
              <li>Unopened, unused components</li>
              <li>Defective or damaged items</li>
              <li>Wrong item received</li>
              <li>Development boards (untested)</li>
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={18} className="text-red-500" />
              <h3 className="font-semibold text-[#11100E]">Not Returnable</h3>
            </div>
            <ul className="space-y-2 text-sm text-[#899581]">
              <li>Soldered or modified components</li>
              <li>Items damaged by user error</li>
              <li>Consumables (batteries, cables)</li>
              <li>Software or digital downloads</li>
            </ul>
          </div>
        </div>

        {[
          {
            step: "1",
            title: "Start a Return",
            body: 'Email support@iotmart.com with your order number and reason for return. Include photos if the item is defective.',
          },
          {
            step: "2",
            title: "Receive Return Label",
            body: "We will email you a prepaid return shipping label within 1–2 business days.",
          },
          {
            step: "3",
            title: "Ship the Item",
            body: "Pack the item securely and drop it off at any carrier location using the label we provide.",
          },
          {
            step: "4",
            title: "Receive Your Refund",
            body: "Once we receive and inspect the item, your refund will be processed within 5–7 business days to your original payment method.",
          },
        ].map(({ step, title, body }) => (
          <div key={step} className="flex gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#5D1C34] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {step}
            </div>
            <div>
              <h3 className="font-semibold text-[#11100E] mb-1">{title}</h3>
              <p className="text-sm text-[#899581]">{body}</p>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 flex gap-3 mt-6">
          <Mail size={18} className="text-[#5D1C34] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#899581]">
            Questions? Email{" "}
            <a href="mailto:support@iotmart.com" className="text-[#5D1C34] hover:underline">
              support@iotmart.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
