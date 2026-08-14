export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "IoTMart";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
  "Your one-stop shop for IoT gadgets, sensors, and development boards";

export const CURRENCY = "NPR";
export const CURRENCY_SYMBOL = "Rs. ";
export const FREE_SHIPPING_THRESHOLD = 50;
export const SHIPPING_COST = 5.99;
export const ITEMS_PER_PAGE = 12;

export const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-100 text-green-800",
  Intermediate: "bg-amber-100 text-amber-800",
  Advanced: "bg-red-100 text-red-800",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export const NAV_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const FOOTER_LINKS = {
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  products: [
    { label: "Sensors", href: "/products?category=sensors" },
    { label: "Microcontrollers", href: "/products?category=microcontrollers" },
    { label: "Modules", href: "/products?category=modules" },
    { label: "Development Boards", href: "/products?category=dev-boards" },
  ],
  tutorials: [
    { label: "Beginner Projects", href: "/tutorials?difficulty=Beginner" },
    {
      label: "Intermediate Projects",
      href: "/tutorials?difficulty=Intermediate",
    },
    { label: "Advanced Projects", href: "/tutorials?difficulty=Advanced" },
    { label: "Arduino Tutorials", href: "/tutorials?micro=arduino" },
  ],
  support: [
    { label: "FAQ", href: "/faq" },
    { label: "Shipping Policy", href: "/shipping" },
    { label: "Return Policy", href: "/returns" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
} as const;

