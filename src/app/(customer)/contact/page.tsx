"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";

const subjects = [
  { value: "order",     label: "Order Inquiry" },
  { value: "shipping",  label: "Shipping Question" },
  { value: "technical", label: "Technical Support" },
  { value: "returns",   label: "Returns & Refunds" },
  { value: "other",     label: "Other" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.subject) e.subject = "Please select a subject";
    if (!form.message.trim()) e.message = "Message is required";
    else if (form.message.trim().length < 10) e.message = "Message is too short";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSubmitted(true);
  };

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [key]: e.target.value })),
    error: errors[key],
  });

  return (
    <div className="container-custom py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#11100E]">Contact Us</h1>
        <p className="text-[#899581] mt-2">Have a question? We&apos;d love to hear from you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-[#11100E] mb-2">Message Sent!</h2>
                <p className="text-[#899581]">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="mt-4 text-sm text-[#5D1C34] hover:underline">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Full Name" placeholder="Your name" required {...f("name")}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                  <Input label="Email" type="email" placeholder="you@example.com" required {...f("email")}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <Select label="Subject" options={subjects} placeholder="Select a topic"
                  value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} error={errors.subject} />
                <Textarea label="Message" placeholder="Write your message here…" rows={5} required {...f("message")}
                  onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))} />
                <button type="submit" disabled={loading}
                  className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors">
                  {loading ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {[
            { icon: Mail,   title: "Email",          value: "support@iotmart.com",  sub: "Replies within 24 hours" },
            { icon: Phone,  title: "Phone",          value: "+1 (800) 468-6278",    sub: "Mon–Fri, 9AM–5PM PST" },
            { icon: MapPin, title: "Address",        value: "123 Silicon Valley",   sub: "San Francisco, CA 94102" },
            { icon: Clock,  title: "Business Hours", value: "Mon–Fri: 9AM–5PM PST", sub: "Weekends: Email only" },
          ].map(({ icon: Icon, title, value, sub }) => (
            <div key={title} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex gap-4">
              <div className="bg-[#5D1C34]/10 p-2.5 rounded-lg h-fit"><Icon size={18} className="text-[#5D1C34]" /></div>
              <div>
                <p className="text-xs text-[#899581] uppercase tracking-wide">{title}</p>
                <p className="font-medium text-[#11100E] text-sm">{value}</p>
                <p className="text-xs text-[#899581]">{sub}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
