import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

export const metadata: Metadata = {
  metadataBase: new URL("https://easymart-supermarket.vercel.app"),
  title: "Easy Mart Supermarket — Pallikkuni | Fresh Groceries & Daily Essentials",
  description: "Your trusted neighborhood supermarket in Pallikkuni, Peringathur. Farm fresh vegetables, fruits, dairy, rice, spices, and daily household essentials delivered to your door.",
  openGraph: {
    title: "Easy Mart Supermarket — Pallikkuni | Fresh Groceries & Daily Essentials",
    description: "Your trusted neighborhood supermarket in Pallikkuni, Peringathur. Farm fresh vegetables, fruits, dairy, rice, spices, and daily household essentials delivered to your door.",
    url: "https://easymart-supermarket.vercel.app/",
    siteName: "Easy Mart Supermarket",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/easy_mart_hero.jpg",
        width: 1200,
        height: 630,
        alt: "Easy Mart Supermarket Pallikkuni",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Easy Mart Supermarket — Pallikkuni",
    description: "Fresh Farm Groceries & Essentials Delivered Daily in Pallikkuni",
    images: ["/easy_mart_hero.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="gradient-bg min-h-screen font-sans selection:bg-emerald-500 selection:text-slate-950">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
