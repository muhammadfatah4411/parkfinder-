import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CarFrontIcon,
  LayersIcon,
  ParkingIcon,
  SearchIcon,
} from "@/components/icons";
import {
  BUILDINGS,
  createSaveUrl,
  type BuildingId,
} from "@/lib/parking-data";

const buildingImages: Record<BuildingId, string> = {
  "business-park":
    "https://media.assettype.com/dhanamonline-english%2F2025-02-17%2Fo8hndlxw%2Fhighlight-business-park.jpg",
  mall: "https://www.imagesbof.in/wp-content/uploads/2022/03/HILITE-MALL-03-700x435.jpg",
};

const buildingLabels: Record<BuildingId, string> = {
  "business-park": "Business Park",
  mall: "HiLITE Mall",
};

const steps = [
  {
    icon: LayersIcon,
    title: "Choose your building and floor.",
  },
  {
    icon: ParkingIcon,
    title: "Save your parking slot.",
  },
  {
    icon: CarFrontIcon,
    title: "Retrieve your car using your parking code.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#F7F8FA]">
      <section className="relative isolate overflow-hidden bg-[#0B1F3A] text-white">
        <div className="absolute inset-0 -z-20" aria-hidden="true">
          <Image
            src={buildingImages["business-park"]}
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

        <div className="mx-auto flex min-h-[600px] w-full max-w-7xl flex-col justify-center px-5 py-20 sm:px-8 lg:min-h-[calc(100vh-76px)] lg:py-24">
          <div className="max-w-3xl">
            <div className="hilite-fade-up inline-flex items-center gap-3 rounded-full border border-[#BB922E]/40 bg-[#BB922E]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#E7C877]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#BB922E]" />
              HiLITE parking assistant
            </div>

            <h1 className="hilite-fade-up hilite-fade-up-delay mt-7 text-[clamp(2.75rem,7vw,5.75rem)] font-semibold uppercase leading-[0.95] tracking-[-0.045em]">
              Your Parking.
              <br />
              <span className="text-[#D8B65B]">Simplified.</span>
            </h1>

            <p className="hilite-fade-up hilite-fade-up-delay mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              A smarter way to remember where you parked.
            </p>

            <div className="hilite-fade-up hilite-fade-up-delay mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/save"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BB922E] px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#0B1F3A] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#D8B65B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8B65B]"
              >
                <ParkingIcon className="h-5 w-5" />
                Save Parking
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/find"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition duration-300 hover:-translate-y-0.5 hover:border-[#D8B65B] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8B65B]"
              >
                <SearchIcon className="h-5 w-5" />
                Find My Car
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
            <span>Business Park</span>
            <span className="h-1 w-1 rounded-full bg-[#BB922E]" />
            <span>HiLITE Mall</span>
            <span className="h-1 w-1 rounded-full bg-[#BB922E]" />
            <span>Basement parking made simple</span>
          </div>
        </div>
      </section>

      <section
        id="locations"
        className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
              Park with confidence
            </p>
            <h2 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-[#122E52] sm:text-4xl">
              Choose Your Parking Location
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Select where you are parked, then save the floor and slot in
              seconds.
            </p>
          </div>
          <Link
            href="/qr"
            className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#122E52] transition hover:text-[#BB922E]"
          >
            View floor QR codes
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {BUILDINGS.map((building) => (
            <Link
              key={building.id}
              href={createSaveUrl(building.id)}
              className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[26px] bg-[#122E52] shadow-[0_18px_50px_rgba(18,46,82,0.16)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(18,46,82,0.25)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BB922E]"
            >
              <div className="absolute inset-0" aria-hidden="true">
                <Image
                  src={buildingImages[building.id]}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051226] via-[#051226]/75 to-[#051226]/10" />
                <div
                  className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(187,146,46,0.2), transparent 55%)",
                  }}
                />
              </div>

              <div className="relative z-10 p-7 sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-[#D8B65B]/60 bg-[#0B1F3A]/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F1D590] backdrop-blur">
                    HiLITE Parking
                  </span>
                  <ArrowRightIcon className="h-6 w-6 text-white/70 transition duration-300 group-hover:translate-x-1 group-hover:text-[#D8B65B]" />
                </div>

                <h3 className="mt-16 text-3xl font-semibold uppercase tracking-tight text-white sm:text-4xl">
                  {buildingLabels[building.id]}
                </h3>
                <p className="mt-2 text-sm text-slate-200">
                  {building.floors.length} basement floors
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[#BB922E] px-5 py-3 text-sm font-semibold text-[#0B1F3A] transition group-hover:bg-[#D8B65B]">
                    <ParkingIcon className="h-4 w-4" />
                    Save parking here
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                    {building.slotsPerFloor} slots per floor
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
              Simple by design
            </p>
            <h2 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-[#122E52] sm:text-4xl">
              How It Works
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.title}
                  className="group rounded-2xl border border-slate-200 bg-[#F9FAFC] p-7 transition duration-300 hover:-translate-y-0.5 hover:border-[#BB922E]/60 hover:bg-white hover:shadow-[0_18px_45px_rgba(18,46,82,0.1)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#122E52] text-[#D8B65B]">
                      <StepIcon className="h-6 w-6" />
                    </span>
                    <span className="text-4xl font-light text-slate-200 transition group-hover:text-[#E3C87F]">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-7 text-lg font-semibold leading-7 text-[#122E52]">
                    {step.title}
                  </h3>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/save"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#122E52] transition hover:text-[#BB922E]"
            >
              Get started
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
