"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

const hiLiteLogo =
  "https://hilitegroup.com/wp-content/uploads/2022/12/hilite-group-white-logo.svg";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/save", label: "Save Parking" },
  { href: "/find", label: "Find My Car" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1F3A]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="HiLITE Group home"
        >
          <Image
            src={hiLiteLogo}
            alt="HiLITE Group"
            width={2733}
            height={3027}
            priority
            unoptimized
            className="h-12 w-auto sm:h-14"
          />
          <span className="hidden h-9 w-px bg-white/20 sm:block" />
          <span className="hidden flex-col sm:flex">
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#D8B65B]">
              HiLITE
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              ParkFinder
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-[#BB922E]/60 bg-[#BB922E]/10 text-[#E7C877]"
                    : "border-transparent text-slate-200 hover:border-[#BB922E]/40 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 text-white transition hover:border-[#BB922E]/60 hover:bg-white/5 md:hidden"
        >
          {menuOpen ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className={`border-t border-white/10 bg-[#081B33] px-5 pb-4 pt-2 md:hidden ${menuOpen ? "block" : "hidden"}`}
      >
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#BB922E]/15 text-[#E7C877]"
                  : "text-slate-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
