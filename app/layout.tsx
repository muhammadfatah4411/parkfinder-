import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ParkFinder - Save and find your parked car",
    template: "%s | ParkFinder",
  },
  description:
    "Save your parking spot, get a retrieval code, and find your car quickly in the Business Park or Mall basement car parks.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${workSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#F5F8FC] text-[#0B1B2B]">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
