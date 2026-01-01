import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Price Drop Monitor - Track Ecommerce Price Drops",
  description: "Monitor product prices from Myntra, Amazon, and Flipkart. Get alerts when prices drop below your desired amount.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navigation />
        <div className="flex-grow bg-gray-50">
          {children}
        </div>
        <footer className="bg-white py-6 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              Price Drop Monitor | Myntra, Amazon & Flipkart | {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
