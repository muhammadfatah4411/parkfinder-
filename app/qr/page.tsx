import Image from "next/image";
import { headers } from "next/headers";
import { Suspense } from "react";
import { QrCodeGrid } from "@/app/qr/qr-code-grid";
import styles from "@/app/qr/qr-codes.module.css";

export const metadata = {
  title: "Parking QR Codes",
};

function normalizeSiteUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

async function QrCodesLoader() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let siteUrl = configuredUrl ? normalizeSiteUrl(configuredUrl) : "";

  if (!siteUrl) {
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";

    if (/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
      const forwardedProto = requestHeaders.get("x-forwarded-proto");
      const protocol =
        forwardedProto === "http" || forwardedProto === "https"
          ? forwardedProto
          : /^(localhost|127\.0\.0\.1)(:|$)/i.test(host)
            ? "http"
            : "https";
      siteUrl = `${protocol}://${host}`;
    }
  }

  return <QrCodeGrid siteUrl={siteUrl} />;
}

function QrCodeGridFallback() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-24 animate-pulse rounded-[22px] bg-white" />
      <div className="h-80 animate-pulse rounded-[26px] bg-white" />
    </div>
  );
}

export default function QrPage() {
  return (
    <main className="bg-[#F7F8FA]">
      <section
        className={`${styles.noPrint} relative isolate overflow-hidden bg-[#0B1F3A] text-white`}
      >
        <div className="absolute inset-0 -z-20" aria-hidden="true">
          <Image
            src="/brand/hilite-business-park.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#06152B]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#051226] via-[#071A33]/90 to-[#0B1F3A]/70" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(187,146,46,0.22), transparent 32%), radial-gradient(circle at 10% 85%, rgba(21,43,82,0.65), transparent 40%)",
            }}
          />
        </div>
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#BB922E] to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="hilite-fade-up inline-flex items-center gap-3 rounded-full border border-[#BB922E]/40 bg-[#BB922E]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#E7C877]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#BB922E]" />
            HiLITE parking assistant
          </div>

          <h1 className="hilite-fade-up hilite-fade-up-delay mt-6 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]">
            Parking QR Codes
          </h1>

          <p className="hilite-fade-up hilite-fade-up-delay mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Scan the QR code for your parking floor to save your parking
            location.
          </p>
        </div>
      </section>

      <section
        className={`${styles.content} relative z-10 mx-auto -mt-8 w-full max-w-6xl px-5 pb-20 sm:px-8`}
      >
        <div className={`${styles.printOnly} ${styles.printHeading} mb-6`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#BB922E]">
            HiLITE parking assistant
          </p>
          <h2 className="mt-1 text-2xl font-semibold uppercase tracking-tight text-[#122E52]">
            Parking QR Codes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Scan the QR code for your parking floor to save your parking
            location.
          </p>
        </div>

        <Suspense fallback={<QrCodeGridFallback />}>
          <QrCodesLoader />
        </Suspense>
      </section>
    </main>
  );
}
