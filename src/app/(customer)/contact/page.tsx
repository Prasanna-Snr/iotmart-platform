"use client";

import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { contactApi, settingsApi } from "@/lib/api";

const subjects = [
  { value: "order",     label: "Order Inquiry" },
  { value: "shipping",  label: "Shipping Question" },
  { value: "technical", label: "Technical Support" },
  { value: "returns",   label: "Returns & Refunds" },
  { value: "other",     label: "Other" },
];

const emptyForm = { name: "", email: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm]           = useState(emptyForm);
  const [errors, setErrors]       = useState<Partial<typeof form>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Contact info from site settings
  const [storeEmail,   setStoreEmail]   = useState("support@iotmart.com");
  const [storePhone,   setStorePhone]   = useState("+1 (800) 468-6278");
  const [storeAddress, setStoreAddress] = useState("123 Silicon Valley, San Francisco, CA 94102");
  const [storeHours,   setStoreHours]   = useState("Mon–Fri: 9AM–5PM | Weekends: Email only");

  useEffect(() => {
    settingsApi.get().then((data) => {
      if (!data?.settings) return;
      const s = data.settings;
      if (s.store_email)   setStoreEmail(s.store_email);
      if (s.store_phone)   setStorePhone(s.store_phone);
      if (s.store_address) setStoreAddress(s.store_address);
      if (s.store_hours)   setStoreHours(s.store_hours);
    }).catch(() => {/* use defaults */});
  }, []);

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim())    e.name    = "Name is required";
    if (!form.email.trim())   e.email   = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.subject)        e.subject = "Please select a subject";
    if (!form.message.trim()) e.message = "Message is required";
    else if (form.message.trim().length < 10) e.message = "Message too short (min 10 chars)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError("");
    try {
      await contactApi.submit({
        name:    form.name.trim(),
        email:   form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(emptyForm);
    setErrors({});
    setSubmitError("");
    setSubmitted(false);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [key]: e.target.value })),
    error: errors[key],
  });

  const contactInfo = [
    {
      icon:  Mail,
      title: "Email",
      value: storeEmail,
      sub:   "Replies within 24 hours",
      href:  `mailto:${storeEmail}`,
    },
    {
      icon:  Phone,
      title: "Phone",
      value: storePhone,
      sub:   "Call us during business hours",
      href:  storePhone ? `tel:${storePhone.replace(/\s/g, "")}` : undefined,
    },
    {
      icon:  MapPin,
      title: "Address",
      value: storeAddress,
      sub:   "Visit our store",
      href:  undefined,
    },
    {
      icon:  Clock,
      title: "Business Hours",
      value: storeHours,
      sub:   "Local time",
      href:  undefined,
    },
  ];

  return (
    <div className="container-custom py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#11100E]">Contact Us</h1>
        <p className="text-[#899581] mt-2">
          Have a question? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-[#11100E] mb-2">
                  Message Sent!
                </h2>
                <p className="text-[#899581] mb-1">
                  Thank you for reaching out, <strong>{form.name}</strong>.
                </p>
                <p className="text-sm text-[#899581] mb-6">
                  We&apos;ll get back to you at <strong>{form.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={reset}
                  className="text-sm text-[#5D1C34] border border-[#5D1C34] px-4 py-2 rounded-lg hover:bg-[#5D1C34] hover:text-white transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="Your name"
                    required
                    {...field("name")}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    {...field("email")}
                  />
                </div>
                <Select
                  label="Subject"
                  options={subjects}
                  placeholder="Select a topic"
                  value={form.subject}
                  onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                  error={errors.subject}
                />
                <Textarea
                  label="Message"
                  placeholder="Write your message here…"
                  rows={5}
                  required
                  {...field("message")}
                />
                {submitError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {submitError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5D1C34] text-white py-3 rounded-xl font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
                >
                  {loading ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Contact info sidebar */}
        <aside className="space-y-4">
          {contactInfo.map(({ icon: Icon, title, value, sub, href }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex gap-4"
            >
              <div className="bg-[#5D1C34]/10 p-2.5 rounded-lg h-fit flex-shrink-0">
                <Icon size={18} className="text-[#5D1C34]" />
              </div>
              <div>
                <p className="text-xs text-[#899581] uppercase tracking-wide mb-0.5">
                  {title}
                </p>
                {href ? (
                  <a
                    href={href}
                    className="font-medium text-[#11100E] text-sm hover:text-[#5D1C34] transition-colors"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="font-medium text-[#11100E] text-sm">{value}</p>
                )}
                <p className="text-xs text-[#899581] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
