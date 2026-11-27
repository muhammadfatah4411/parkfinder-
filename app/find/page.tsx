import Image from "next/image";
import { Suspense } from "react";
import { FindCarForm } from "@/app/find/find-car-form";

type FindPageProps = {
  searchParams: Promise<{
    code?: string | string[];
  }>;
};

export const metadata = {
  title: "Find My Car",
};

async function FindCarLoader({ searchParams }: FindPageProps) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  return <FindCarForm initialCode={code} />;
}

function FindFormFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.65fr]">
      <div className="h-[26rem] animate-pulse rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(18,46,82,0.12)]" />
      <div className="hidden h-64 animate-pulse rounded-[26px] border border-slate-200 bg-white lg:block" />
    </div>
  );
}

export default function FindPage({ searchParams }: FindPageProps) {
  return (
    <main className="bg-[#F7F8FA]">
      <section className="relative isolate overflow-hidden bg-[#0B1F3A] text-white">
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
            Find Your Car
            <span className="text-[#D8B65B]">.</span>
          </h1>

          <p className="hilite-fade-up hilite-fade-up-delay mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Enter your parking code to find where you parked.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 w-full max-w-6xl px-5 pb-20 sm:px-8">
        <Suspense fallback={<FindFormFallback />}>
          <FindCarLoader searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
