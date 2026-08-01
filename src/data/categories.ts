import type { Category, Brand, TutorialCategory } from "@/types";

export const categories: Category[] = [
  {
    id: "cat-1",
    name: "Sensors",
    slug: "sensors",
    description:
      "Temperature, humidity, motion, distance, light, and more sensors for every IoT project.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
    productCount: 48,
  },
  {
    id: "cat-2",
    name: "Microcontrollers",
    slug: "microcontrollers",
    description:
      "Arduino, ESP32, Raspberry Pi Pico, STM32 and other powerful microcontrollers.",
    image:
      "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=400&q=80",
    productCount: 32,
  },
  {
    id: "cat-3",
    name: "Development Boards",
    slug: "dev-boards",
    description:
      "Ready-to-use development boards and starter kits for rapid prototyping.",
    image:
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&q=80",
    productCount: 24,
  },
  {
    id: "cat-4",
    name: "Wireless Modules",
    slug: "modules",
    description:
      "WiFi, Bluetooth, LoRa, Zigbee, and other wireless communication modules.",
    image:
      "https://images.unsplash.com/photo-1562408590-e32931084e23?w=400&q=80",
    productCount: 36,
  },
  {
    id: "cat-5",
    name: "Actuators",
    slug: "actuators",
    description:
      "Servo motors, stepper motors, relays, and other actuators for automation.",
    image:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80",
    productCount: 20,
  },
  {
    id: "cat-6",
    name: "Power & Batteries",
    slug: "power",
    description:
      "LiPo batteries, solar panels, power management modules, and voltage regulators.",
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&q=80",
    productCount: 15,
  },
  {
    id: "cat-7",
    name: "Displays",
    slug: "displays",
    description:
      "OLED, LCD, TFT, and e-paper displays for showing data and creating UI.",
    image:
      "https://images.unsplash.com/photo-1551808525-51a94da548ce?w=400&q=80",
    productCount: 18,
  },
  {
    id: "cat-8",
    name: "Starter Kits",
    slug: "starter-kits",
    description:
      "Complete beginner kits with everything you need to start your IoT journey.",
    image:
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&q=80",
    productCount: 12,
  },
];

export const brands: Brand[] = [
  { id: "brand-1", name: "Arduino", slug: "arduino" },
  { id: "brand-2", name: "Espressif", slug: "espressif" },
  { id: "brand-3", name: "Raspberry Pi", slug: "raspberry-pi" },
  { id: "brand-4", name: "Adafruit", slug: "adafruit" },
  { id: "brand-5", name: "SparkFun", slug: "sparkfun" },
  { id: "brand-6", name: "Seeed Studio", slug: "seeed-studio" },
  { id: "brand-7", name: "STMicroelectronics", slug: "stmicroelectronics" },
  { id: "brand-8", name: "Texas Instruments", slug: "texas-instruments" },
];

export const tutorialCategories: TutorialCategory[] = [
  {
    id: "tc-1",
    name: "Home Automation",
    slug: "home-automation",
    description: "Smart home projects with IoT sensors and automation.",
    icon: "Home",
    tutorialCount: 14,
  },
  {
    id: "tc-2",
    name: "Weather Monitoring",
    slug: "weather-monitoring",
    description: "Build weather stations and environmental monitoring systems.",
    icon: "CloudRain",
    tutorialCount: 8,
  },
  {
    id: "tc-3",
    name: "Smart Agriculture",
    slug: "smart-agriculture",
    description: "IoT solutions for farming, irrigation, and plant monitoring.",
    icon: "Sprout",
    tutorialCount: 6,
  },
  {
    id: "tc-4",
    name: "Security Systems",
    slug: "security-systems",
    description: "Motion detection, alarms, and surveillance with IoT.",
    icon: "Shield",
    tutorialCount: 10,
  },
  {
    id: "tc-5",
    name: "Robotics",
    slug: "robotics",
    description: "Build robots and automated machines with microcontrollers.",
    icon: "Cpu",
    tutorialCount: 9,
  },
  {
    id: "tc-6",
    name: "Wearables",
    slug: "wearables",
    description: "Smart wearable devices and health monitoring projects.",
    icon: "Watch",
    tutorialCount: 5,
  },
];
