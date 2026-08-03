import AnalyticsBeacon from '@/components/AnalyticsBeacon';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1"><AnalyticsBeacon />{children}</main>
      <Footer />
    </div>
  );
}
