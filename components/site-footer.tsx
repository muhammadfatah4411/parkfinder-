"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const hiLiteLogo =
  "https://hilitegroup.com/wp-content/uploads/2022/12/hilite-group-white-logo.svg";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/save", label: "Save Parking" },
  { href: "/find", label: "Find My Car" },
  { href: "/qr", label: "QR Codes" },
  { href: "/admin", label: "Admin" },
];

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#081B33] text-white">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#BB922E] to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Image
              src={hiLiteLogo}
              alt="HiLITE Group"
              width={2733}
              height={3027}
              unoptimized
              className="h-20 w-auto sm:h-24"
            />
            <div className="pt-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D8B65B]">
                ParkFinder
              </p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-300">
                A smarter way to remember where you parked across HiLITE
                Business Park and HiLITE Mall.
              </p>
            </div>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-300 transition hover:text-[#D8B65B]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.16em] text-slate-400">
          HiLITE Group · Parking Assistant
        </div>
      </div>
    </footer>
  );
}
