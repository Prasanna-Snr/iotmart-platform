import Link from "next/link";
import { Cpu, Globe, Share2, Briefcase } from "lucide-react";
import { FOOTER_LINKS, SITE_NAME } from "@/lib/constants";
import NewsletterForm from "@/components/layout/NewsletterForm";

export default function Footer() {
  return (
    <footer className="bg-[#11100E] text-[#CDBBAD] mt-auto">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="bg-[#5D1C34] p-1.5 rounded-lg">
                <Cpu size={18} className="text-[#CDBBAD]" />
              </span>
              <span className="text-white font-bold text-xl">
                IoT<span className="text-[#A67D45]">Mart</span>
              </span>
            </Link>
            <p className="text-sm text-[#899581] leading-relaxed mb-4">
              Your one-stop shop for IoT gadgets, sensors, and development
              boards. Build the future, one project at a time.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Twitter / X"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Share2 size={16} />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Globe size={16} />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Briefcase size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Company</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#899581] hover:text-[#CDBBAD] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Products</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.products.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#899581] hover:text-[#CDBBAD] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Tutorials</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.tutorials.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#899581] hover:text-[#CDBBAD] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Support</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.support.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#899581] hover:text-[#CDBBAD] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-white/10 pt-8 mb-8">
          <div className="max-w-md">
            <h3 className="text-white font-semibold mb-1">Stay in the loop</h3>
            <p className="text-sm text-[#899581] mb-3">
              Get new tutorials and product drops straight to your inbox.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#899581]">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-[#899581]">
            <Link href="/privacy" className="hover:text-[#CDBBAD]">
              Privacy
            </Link>
            <Link href="/shipping" className="hover:text-[#CDBBAD]">
              Shipping
            </Link>
            <Link href="/returns" className="hover:text-[#CDBBAD]">
              Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
