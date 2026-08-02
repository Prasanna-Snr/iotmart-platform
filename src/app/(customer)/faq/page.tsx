"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const sections = [
  {
    title: "Ordering",
    items: [
      { q: "How do I place an order?",           a: "Browse our products, add items to your cart, and proceed to checkout. You'll receive a confirmation email after your order is placed." },
      { q: "Can I modify or cancel my order?",   a: "Orders can be modified or cancelled within 2 hours of placement. Contact us at support@iotmart.com as soon as possible." },
      { q: "What payment methods do you accept?",a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for large orders." },
    ],
  },
  {
    title: "Shipping",
    items: [
      { q: "Do you offer free shipping?",   a: "Yes! All orders over Rs. 50 qualify for free standard shipping." },
      { q: "How long does shipping take?",  a: "Standard shipping: 3–7 business days. Express: 1–2 business days. International: 7–21 business days." },
      { q: "Do you ship internationally?",  a: "We ship to 35+ countries worldwide. International shipping rates are calculated at checkout." },
    ],
  },
  {
    title: "Returns",
    items: [
      { q: "What is your return policy?",    a: "We accept returns within 30 days of delivery for items in original condition. Components that have been soldered cannot be returned." },
      { q: "How do I start a return?",       a: "Email support@iotmart.com with your order number and reason for return. We'll provide a prepaid return label." },
      { q: "When will I receive my refund?", a: "Refunds are processed within 5–7 business days after we receive the returned item." },
    ],
  },
  {
    title: "Technical Support",
    items: [
      { q: "Do you offer technical support for components?", a: "Yes! Our engineering team can answer questions about wiring, code, and compatibility. Email technical@iotmart.com." },
      { q: "Are there tutorials for your products?",         a: "Absolutely! We have 50+ free step-by-step tutorials. Visit our Tutorials section to get started." },
      { q: "What if a component doesn't work?",             a: "If you receive a defective component, contact us with a description and we'll replace it at no cost." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#F0E9E3] last:border-0">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4" aria-expanded={open}>
        <span className="font-medium text-[#11100E] text-sm">{q}</span>
        {open ? <ChevronUp size={16} className="text-[#899581] flex-shrink-0" /> : <ChevronDown size={16} className="text-[#899581] flex-shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-[#899581] leading-relaxed">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="container-custom py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#11100E]">Frequently Asked Questions</h1>
        <p className="text-[#899581] mt-2">Everything you need to know about IoTMart.</p>
      </div>
      <div className="max-w-2xl mx-auto space-y-6">
        {sections.map((sec) => (
          <div key={sec.title} className="bg-white rounded-xl border border-[#CDBBAD]/50 px-6">
            <h2 className="font-bold text-[#11100E] pt-5 pb-2">{sec.title}</h2>
            {sec.items.map((item) => <FAQItem key={item.q} {...item} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
