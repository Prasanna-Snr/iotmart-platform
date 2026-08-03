/**
 * /faq — Server component wrapper
 *
 * Exports Next.js Metadata and injects the FAQPage JSON-LD schema so Google
 * can render rich results (expandable FAQ snippets in SERPs).
 * The interactive accordion UI lives in FAQClient (use client).
 */
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { faqPageJsonLd, jsonLdString } from "@/lib/seo";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Find answers to common questions about ordering, shipping, returns, and technical support at IoTMart Nepal. Free shipping over Rs. 50, 30-day returns.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: "Frequently Asked Questions | IoTMart",
    description:
      "Find answers to common questions about ordering, shipping, returns, and technical support at IoTMart Nepal.",
    url: `${SITE_URL}/faq`,
    type: "website",
  },
};

/** All FAQ items flattened — mirrors the sections in FAQClient */
const FAQ_ITEMS = [
  { question: "How do I place an order?",           answer: "Browse our products, add items to your cart, and proceed to checkout. You'll receive a confirmation email after your order is placed." },
  { question: "Can I modify or cancel my order?",   answer: "Orders can be modified or cancelled within 2 hours of placement. Contact us at support@iotmart.com as soon as possible." },
  { question: "What payment methods do you accept?",answer: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for large orders." },
  { question: "Do you offer free shipping?",        answer: "Yes! All orders over Rs. 50 qualify for free standard shipping." },
  { question: "How long does shipping take?",       answer: "Standard shipping: 3–7 business days. Express: 1–2 business days. International: 7–21 business days." },
  { question: "Do you ship internationally?",       answer: "We ship to 35+ countries worldwide. International shipping rates are calculated at checkout." },
  { question: "What is your return policy?",        answer: "We accept returns within 30 days of delivery for items in original condition. Components that have been soldered cannot be returned." },
  { question: "How do I start a return?",           answer: "Email support@iotmart.com with your order number and reason for return. We'll provide a prepaid return label." },
  { question: "When will I receive my refund?",     answer: "Refunds are processed within 5–7 business days after we receive the returned item." },
  { question: "Do you offer technical support for components?", answer: "Yes! Our engineering team can answer questions about wiring, code, and compatibility. Email technical@iotmart.com." },
  { question: "Are there tutorials for your products?",         answer: "Absolutely! We have 50+ free step-by-step tutorials. Visit our Tutorials section to get started." },
  { question: "What if a component doesn't work?",              answer: "If you receive a defective component, contact us with a description and we'll replace it at no cost." },
];

export default function FAQPage() {
  return (
    <>
      {/* FAQPage structured data — enables rich results in Google SERPs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqPageJsonLd(FAQ_ITEMS)) }}
      />
      <FAQClient />
    </>
  );
}
