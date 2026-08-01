import type { Metadata } from "next";
import Link from "next/link";
import { Package, BookOpen, Users, Shield, Zap, HeadphonesIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about IoTMart — our mission to make IoT accessible to everyone.",
};

const team = [
  { name: "Raj Patel",    role: "Founder & CEO",         bio: "Electronics engineer with 12 years in IoT product development.", initials: "RP" },
  { name: "Sarah Kim",    role: "Head of Engineering",   bio: "Full-stack developer and embedded systems enthusiast.",           initials: "SK" },
  { name: "Marcus Chen",  role: "Content Director",      bio: "Creates tutorials that have helped 50K+ makers worldwide.",       initials: "MC" },
  { name: "Priya Sharma", role: "Community Manager",     bio: "Passionate about building maker communities and events.",         initials: "PS" },
];

const values = [
  { icon: Shield,         title: "Quality First", body: "We source and test every product before listing it." },
  { icon: BookOpen,       title: "Education",     body: "Free tutorials for every skill level, always." },
  { icon: Zap,            title: "Innovation",    body: "We stock the latest IoT tech as soon as it ships." },
  { icon: HeadphonesIcon, title: "Support",       body: "Real humans answer your technical questions." },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-[#11100E] text-white py-16 md:py-24">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">About <span className="text-[#A67D45]">IoTMart</span></h1>
          <p className="text-[#899581] max-w-2xl mx-auto text-lg">
            We&apos;re a team of engineers and makers on a mission to make IoT development accessible, affordable, and fun for everyone.
          </p>
        </div>
      </section>

      <section className="container-custom py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#11100E] mb-4">Our Mission</h2>
          <p className="text-[#899581] leading-relaxed text-lg">
            IoTMart was founded in 2022 with a simple idea: make it easy for anyone — students, hobbyists, professionals — to get the exact components they need and learn how to use them through quality, free tutorials. We believe IoT shouldn&apos;t have a high barrier to entry.
          </p>
        </div>
      </section>

      <section className="bg-[#5D1C34]">
        <div className="container-custom py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: "Products",          value: "200+" },
              { label: "Tutorials",         value: "50+"  },
              { label: "Community Members", value: "10K+" },
              { label: "Countries Shipped", value: "35+"  },
            ].map(({ label, value }) => (
              <div key={label} className="text-white py-4">
                <p className="text-3xl font-bold text-[#A67D45]">{value}</p>
                <p className="text-sm text-[#CDBBAD] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom py-14">
        <h2 className="text-2xl font-bold text-[#11100E] text-center mb-10">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 text-center">
              <div className="bg-[#5D1C34]/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon size={22} className="text-[#5D1C34]" />
              </div>
              <h3 className="font-semibold text-[#11100E] mb-2">{title}</h3>
              <p className="text-sm text-[#899581]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F0E9E3] py-14">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-[#11100E] text-center mb-10">Meet the Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#5D1C34] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {member.initials}
                </div>
                <h3 className="font-semibold text-[#11100E]">{member.name}</h3>
                <p className="text-xs text-[#A67D45] font-medium mb-2">{member.role}</p>
                <p className="text-xs text-[#899581]">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom py-14">
        <div className="bg-[#11100E] rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to build?</h2>
          <p className="text-[#899581] mb-6">Explore our products or start learning with a free tutorial.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/products" className="bg-[#5D1C34] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a1628] transition-colors">Shop Products</Link>
            <Link href="/tutorials" className="border border-[#A67D45]/50 text-[#CDBBAD] px-6 py-3 rounded-xl font-medium hover:border-[#A67D45] transition-colors">Browse Tutorials</Link>
          </div>
        </div>
      </section>
    </>
  );
}
