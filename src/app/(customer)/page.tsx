import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Cpu, BookOpen, Package, Users, Truck, ArrowRight, Star, Zap, Shield } from "lucide-react";
import { featuredProducts } from "@/data/products";
import { featuredTutorials } from "@/data/tutorials";
import { categories } from "@/data/categories";
import ProductCard from "@/components/product/ProductCard";
import TutorialCard from "@/components/tutorial/TutorialCard";
import HomeNewsletterForm from "@/components/ui/HomeNewsletterForm";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${SITE_NAME} — IoT Gadgets, Sensors & Development Boards`,
  description: SITE_DESCRIPTION,
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#11100E] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#5D1C34]/40 via-transparent to-[#A67D45]/20" />
        <div className="container-custom relative py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-[#5D1C34]/30 border border-[#5D1C34]/50 text-[#CDBBAD] text-xs font-medium px-3 py-1 rounded-full mb-6">
              <Zap size={11} /> 200+ IoT Components In Stock
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Build the <span className="text-[#A67D45]">Future</span><br />with IoT
            </h1>
            <p className="text-lg text-[#899581] leading-relaxed mb-8 max-w-xl">
              Your one-stop shop for sensors, microcontrollers, development boards, and free step-by-step project tutorials.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-2 bg-[#5D1C34] hover:bg-[#4a1628] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                <Package size={16} /> Shop Products
              </Link>
              <Link href="/tutorials" className="inline-flex items-center gap-2 border border-[#A67D45]/50 hover:border-[#A67D45] text-[#CDBBAD] hover:text-white px-6 py-3 rounded-lg font-medium transition-colors">
                <BookOpen size={16} /> Browse Tutorials
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 hidden lg:block">
          <Image src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=60" alt="" fill className="object-cover" aria-hidden />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#5D1C34]">
        <div className="container-custom py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {[
              { icon: Package,  label: "Products",      value: "200+" },
              { icon: BookOpen, label: "Tutorials",     value: "50+"  },
              { icon: Users,    label: "Makers",        value: "10K+" },
              { icon: Truck,    label: "Free Shipping", value: "Over $50" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-center gap-2 py-3 text-white">
                <Icon size={16} className="text-[#A67D45] flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">{value}</p>
                  <p className="text-xs text-[#CDBBAD]/70">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-custom py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#11100E]">Shop by Category</h2>
            <p className="text-[#899581] mt-1">Everything you need for your IoT projects</p>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#5D1C34] hover:underline">
            All Products <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/products?category=${cat.slug}`}
              className="group relative overflow-hidden rounded-xl bg-[#11100E] aspect-square">
              <Image src={cat.image} alt={cat.name} fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <h3 className="text-white font-semibold text-sm">{cat.name}</h3>
                <p className="text-[#CDBBAD]/70 text-xs">{cat.productCount} items</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-14">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#11100E]">Featured Products</h2>
              <p className="text-[#899581] mt-1">Hand-picked components for your projects</p>
            </div>
            <Link href="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#5D1C34] hover:underline">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Tutorials */}
      <section className="container-custom py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#11100E]">Featured Tutorials</h2>
            <p className="text-[#899581] mt-1">Free step-by-step IoT project guides</p>
          </div>
          <Link href="/tutorials" className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#5D1C34] hover:underline">
            All Tutorials <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredTutorials.map((tut) => <TutorialCard key={tut.id} tutorial={tut} />)}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#5D1C34]/5 border-y border-[#CDBBAD]/30 py-14">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#11100E] mb-10">Why IoTMart?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield,   title: "Quality Guaranteed", body: "Every component is tested and sourced from trusted manufacturers." },
              { icon: BookOpen, title: "Free Tutorials",     body: "Detailed project guides for every skill level — beginner to advanced." },
              { icon: Truck,    title: "Fast Shipping",      body: "Free shipping on orders over $50. Most orders ship within 24 hours." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 bg-white rounded-xl p-6 border border-[#CDBBAD]/40">
                <div className="bg-[#5D1C34]/10 p-3 rounded-lg h-fit"><Icon size={20} className="text-[#5D1C34]" /></div>
                <div>
                  <h3 className="font-semibold text-[#11100E] mb-1">{title}</h3>
                  <p className="text-sm text-[#899581]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="container-custom py-14">
        <div className="bg-[#11100E] rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#5D1C34]/20 to-[#A67D45]/20" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Get New Projects & Products</h2>
            <p className="text-[#899581] mb-6 max-w-md mx-auto">Subscribe to receive the latest IoT tutorials and product announcements.</p>
            <HomeNewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
