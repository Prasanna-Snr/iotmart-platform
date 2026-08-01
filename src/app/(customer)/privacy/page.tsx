import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "IoTMart privacy policy — how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container-custom py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#11100E] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#899581] mb-8">Last updated: January 1, 2026</p>
        {[
          { title: "Information We Collect",    body: "We collect information you provide directly to us, such as name, email address, shipping address, and payment information when you place an order. We also automatically collect certain usage data including pages visited and items added to your cart." },
          { title: "How We Use Your Information",body: "We use your information to process orders and payments, send order confirmations and updates, provide customer support, improve our website and services, and send marketing communications (with your consent)." },
          { title: "Information Sharing",       body: "We do not sell, trade, or otherwise transfer your personal information to third parties. We share information only with trusted service providers necessary to operate our website (e.g., payment processors, shipping carriers)." },
          { title: "Data Security",             body: "We implement industry-standard security measures to protect your personal information. All payment data is encrypted using SSL technology. We never store complete credit card numbers on our servers." },
          { title: "Cookies",                   body: "We use cookies to improve your experience, remember cart contents, and analyze site traffic. You can control cookie settings through your browser preferences." },
          { title: "Your Rights",               body: "You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@iotmart.com. We will respond within 30 days." },
          { title: "Contact Us",                body: "If you have questions about this privacy policy, please contact us at privacy@iotmart.com or write to IoTMart, 123 Silicon Valley, San Francisco, CA 94102." },
        ].map((section) => (
          <section key={section.title} className="mb-8">
            <h2 className="text-lg font-bold text-[#11100E] mb-3">{section.title}</h2>
            <p className="text-[#899581] leading-relaxed text-sm">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
