"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import {
  ArrowRightIcon,
  BuildingIcon,
  DownloadIcon,
  PrinterIcon,
  QrCodeIcon,
} from "@/components/icons";
import {
  BUILDINGS,
  createSaveUrl,
  type BuildingConfig,
  type BuildingId,
  type Floor,
} from "@/lib/parking-data";
import styles from "./qr-codes.module.css";

const buildingLabels: Record<BuildingId, string> = {
  "business-park": "Business Park",
  mall: "HiLITE Mall",
};

const totalCodes = BUILDINGS.reduce(
  (total, building) => total + building.floors.length,
  0,
);

function QrCard({
  building,
  floor,
  siteUrl,
}: {
  building: BuildingConfig;
  floor: Floor;
  siteUrl: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const path = createSaveUrl(building.id, floor);
  const url = `${siteUrl}${path}`;
  const label = buildingLabels[building.id];

  function downloadQr() {
    const svg = svgRef.current;
    if (!svg) return;

    const markup = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = href;
    link.download = `hilite-${building.id}-${floor.toLowerCase()}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <article
      className={`${styles.card} flex flex-col items-center rounded-2xl border border-slate-200 bg-[#F9FAFC] p-5 text-center`}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#122E52]">
          Basement {floor}
        </h3>
      </div>

      <div
        className={`${styles.qrFrame} mt-4 flex h-52 w-52 items-center justify-center rounded-xl bg-white p-3 shadow-sm`}
      >
        <QRCodeSVG
          ref={svgRef}
          value={url}
          size={200}
          level="M"
          marginSize={4}
          fgColor="#0B1F3A"
          bgColor="#FFFFFF"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          title={`${label} basement ${floor} parking QR code`}
        />
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        Scan to save your parking location
      </p>

      <div
        className={`${styles.actions} mt-5 flex w-full flex-col gap-2 sm:flex-row sm:justify-center`}
      >
        <button
          type="button"
          onClick={downloadQr}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BB922E] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#0B1F3A] transition duration-300 hover:bg-[#D8B65B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BB922E]"
        >
          <DownloadIcon className="h-4 w-4" />
          Download QR
        </button>
        <Link
          href={path}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#122E52]/20 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#122E52] transition duration-300 hover:border-[#BB922E] hover:bg-[#FBF8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BB922E]"
        >
          Open page
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export function QrCodeGrid({ siteUrl }: { siteUrl: string }) {
  return (
    <div className="space-y-6">
      <div
        className={`${styles.noPrint} flex flex-col gap-4 rounded-[22px] border border-[#BB922E]/25 bg-[#FBF8F0] p-5 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#BB922E]/15 text-[#BB922E]">
            <QrCodeIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#122E52]">
              {totalCodes} ready-to-print QR codes
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Each code opens Save Parking with its building and floor already
              selected.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#122E52] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition duration-300 hover:bg-[#0B1F3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BB922E]"
        >
          <PrinterIcon className="h-4 w-4" />
          Print all codes
        </button>
      </div>

      {BUILDINGS.map((building) => (
        <section
          key={building.id}
          className={`${styles.section} rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(18,46,82,0.10)] sm:p-8`}
        >
          <div
            className={`${styles.sectionHeader} flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6`}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#122E52] text-[#D8B65B]">
                <BuildingIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#BB922E]">
                  HiLITE parking
                </p>
                <h2 className="mt-1 text-2xl font-semibold uppercase tracking-tight text-[#122E52]">
                  {buildingLabels[building.id]}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {building.floors.length} basement floors
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#BB922E]/30 bg-[#BB922E]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5C4A17]">
              {building.floors.length} QR codes
            </span>
          </div>

          <div
            className={`${styles.qrGrid} mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3`}
          >
            {building.floors.map((floor) => (
              <QrCard
                key={`${building.id}-${floor}`}
                building={building}
                floor={floor}
                siteUrl={siteUrl}
              />
            ))}
          </div>
        </section>
      ))}

      <p
        className={`${styles.printOnly} mt-6 text-xs uppercase tracking-[0.16em] text-slate-500`}
      >
        HiLITE Group · ParkFinder · Scan a code to save your parking location
      </p>
    </div>
  );
}
