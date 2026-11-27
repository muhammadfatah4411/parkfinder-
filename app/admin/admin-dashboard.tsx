"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmDialog,
  EmptyState,
  LoadingIndicator,
  Notification,
} from "@/components/feedback";
import {
  ArrowRightIcon,
  BuildingIcon,
  CarFrontIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  DashboardIcon,
  LayersIcon,
  MenuIcon,
  ParkingIcon,
  QrCodeIcon,
  RefreshIcon,
  SearchIcon,
  TicketIcon,
} from "@/components/icons";
import {
  calculateParkingStats,
  FLOORS,
  formatDateTime,
  getBuildingOccupancy,
  getFloorOccupancy,
  getFloors,
  getTodayDateKey,
  resolveBuildingId,
  BUILDINGS,
  type BuildingId,
  type Floor,
  type OccupancyGroup,
} from "@/lib/parking-data";
import {
  endParking,
  extractRecord,
  extractRecords,
  getAdminRecords,
  getRecordCode,
  getRecordSlot,
  getRecordStatus,
  isSuccessResponse,
  type ParkingApiRecord,
} from "@/lib/parking-api";
import { friendlyMessage } from "@/lib/user-messages";
import styles from "./admin-dashboard.module.css";

type AdminSession = {
  code: string;
  building: string;
  buildingId: BuildingId | "";
  floor: string;
  slot: number | null;
  entryTime: string;
  entryDate: string;
  exitTime: string | null;
  status: "active" | "completed";
};

type BuildingFilter = BuildingId | "all";
type FloorFilter = Floor | "all";
type StatusFilter = "all" | "active" | "completed";

const buildingNames: Record<BuildingId, string> = {
  "business-park": "HiLITE Business Park",
  mall: "HiLITE Mall",
};

const sectionLinks = [
  { id: "overview", label: "Overview", icon: DashboardIcon },
  { id: "statistics", label: "Statistics", icon: LayersIcon },
  { id: "locations", label: "Locations", icon: BuildingIcon },
  { id: "sessions", label: "Sessions", icon: TicketIcon },
];

const pageLinks = [
  { href: "/save", label: "Save parking", icon: ParkingIcon },
  { href: "/find", label: "Find my car", icon: SearchIcon },
  { href: "/qr", label: "Floor QR codes", icon: QrCodeIcon },
  { href: "/", label: "Visitor site", icon: ArrowRightIcon },
];

const filterControlClassName =
  "w-full rounded-xl border border-[#DFE3E9] bg-[#FAFBFC] px-3 py-2.5 text-sm font-medium text-[#16202C] outline-none transition placeholder:text-slate-400 focus:border-[#BB922E] focus:bg-white focus:ring-4 focus:ring-[#BB922E]/10";

function displayBuilding(building: string): string {
  const id = resolveBuildingId(building);
  if (id) return buildingNames[id];
  return building || "—";
}

function toDateInputValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

function toAdminSession(record: ParkingApiRecord, index: number): AdminSession | null {
  const code = getRecordCode(record) || `unknown-${index}`;
  const building = typeof record.building === "string" ? record.building : "";
  const floor = typeof record.floor === "string" ? record.floor : "";
  if (!building || !floor) return null;
  const status = getRecordStatus(record);
  const entryTime = typeof record.entryTime === "string" ? record.entryTime : "";
  return {
    code,
    building,
    buildingId: resolveBuildingId(building),
    floor,
    slot: getRecordSlot(record),
    entryTime,
    entryDate: toDateInputValue(entryTime),
    exitTime: typeof record.exitTime === "string" || record.exitTime === null ? record.exitTime ?? null : null,
    status: status === "completed" ? "completed" : "active",
  };
}

function SessionStatusBadge({ status }: { status: AdminSession["status"] }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? "bg-[#E7F5ED] text-[#176B45]" : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#2E9E6B]" : "bg-slate-400"}`}
      />
      {active ? "Active" : "Completed"}
    </span>
  );
}

function SessionCard({
  session,
  onEnd,
  isEnding,
}: {
  session: AdminSession;
  onEnd: (session: AdminSession) => void;
  isEnding: boolean;
}) {
  const slot = session.slot !== null ? String(session.slot).padStart(2, "0") : "—";
  return (
    <article className="rounded-2xl border border-[#E8EBF0] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(6,16,28,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Retrieval code
          </p>
          <p className="mt-1 truncate font-mono text-sm font-semibold text-[#071A2F]">
            {session.code}
          </p>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Building</dt>
          <dd className="mt-1 break-words font-medium text-slate-700">
            {displayBuilding(session.building)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Floor / slot</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {session.floor} · {slot}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Entry time</dt>
          <dd className="mt-1 break-words text-slate-600">
            {session.entryTime ? formatDateTime(session.entryTime) : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Exit time</dt>
          <dd className="mt-1 break-words text-slate-600">
            {session.exitTime ? formatDateTime(session.exitTime) : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-[#E8EBF0] pt-4">
        {session.status === "active" ? (
          <button
            type="button"
            onClick={() => onEnd(session)}
            disabled={isEnding}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#122E52]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#122E52] transition hover:border-[#BB922E] hover:bg-[#FBF8F0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            End session
          </button>
        ) : (
          <p className="text-xs font-semibold text-slate-500">
            This session is complete.
          </p>
        )}
      </div>
    </article>
  );
}

function OccupancyBar({
  percentage,
  label,
  compact = false,
}: {
  percentage: number;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      className={`flex w-full overflow-hidden rounded-full bg-[#EEF1F4] ${
        compact ? "h-1.5" : "h-3"
      }`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#BB922E] to-[#D8B65B] transition-[width] duration-500"
        style={{ width: `${percentage}%` }}
      />
      <div className="h-full flex-1 bg-[#D9E7F3]" />
    </div>
  );
}

function OccupancyGroupCard({
  group,
  isLoading,
  animationDelay,
}: {
  group: OccupancyGroup;
  isLoading: boolean;
  animationDelay?: number;
}) {
  return (
    <article
      className={`rounded-2xl border border-[#E5E8ED] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(6,16,28,0.45)] ${styles.fadeUp}`}
      style={animationDelay === undefined ? undefined : { animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0F7] text-[#1F4E79]">
            <BuildingIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[#071A2F]">
              HiLITE {group.label}
            </h3>
            <p className="mt-1 truncate text-xs text-slate-500">{group.detail}</p>
          </div>
        </div>
        <span className="shrink-0 text-xl font-semibold text-[#9A761F]">
          {isLoading ? "—" : `${group.percentage}%`}
        </span>
      </div>

      <div className="mt-5">
        <OccupancyBar
          percentage={isLoading ? 0 : group.percentage}
          label={`${group.label} occupancy`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#FBF6E9] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A761F]">
            Occupied
          </p>
          <p className="mt-1 text-xl font-semibold text-[#071A2F]">
            {isLoading ? "—" : group.occupied}
          </p>
        </div>
        <div className="rounded-xl bg-[#EFF5FA] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1F4E79]">
            Available
          </p>
          <p className="mt-1 text-xl font-semibold text-[#071A2F]">
            {isLoading ? "—" : group.available}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-400">
        {group.capacity} slots total
      </p>
    </article>
  );
}

function EmptyRecordsMessage({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <EmptyState
      title={filtered ? "No sessions match your filters" : "No parking sessions yet"}
      description={
        filtered
          ? "Try another code, slot, date or status, or clear the filters to see all sessions."
          : "Sessions will appear here as soon as someone saves their parking."
      }
      icon={
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5EEDC] text-[#9A761F]">
          <TicketIcon className="h-6 w-6" />
        </span>
      }
    >
      {filtered ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-[#DFE3E9] bg-white px-4 py-2 text-xs font-semibold text-[#6F5414] transition hover:border-[#BB922E] hover:bg-[#F5EEDC]"
        >
          Clear filters
        </button>
      ) : null}
    </EmptyState>
  );
}

export function AdminDashboard({ fontClassName = "" }: { fontClassName?: string }) {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilter>("all");
  const [floorFilter, setFloorFilter] = useState<FloorFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [todayKey, setTodayKey] = useState("");
  const [sessionAction, setSessionAction] = useState<AdminSession | null>(null);
  const [sessionActionError, setSessionActionError] = useState("");
  const [sessionActionSuccess, setSessionActionSuccess] = useState("");
  const [isEndingSession, setIsEndingSession] = useState(false);
  const didLoad = useRef(false);
  const endingSessionRef = useRef(false);

  const loadRecords = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    setTodayKey(getTodayDateKey());
    try {
      const response = await getAdminRecords();
      if (!isSuccessResponse(response)) {
        setSessions([]);
        setError(friendlyMessage(response, "admin"));
        return;
      }
      const records = extractRecords(response);
      const mapped = records
        .map(toAdminSession)
        .filter((session): session is AdminSession => session !== null);
      setSessions(mapped);
      setLastUpdated(new Date());
    } catch (err) {
      setSessions([]);
      setError(friendlyMessage(err, "admin"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (didLoad.current) return;
      didLoad.current = true;
      void loadRecords();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const activeCount = sessions.filter((session) => session.status === "active").length;
  const parkingStats = useMemo(
    () => calculateParkingStats(sessions, todayKey),
    [sessions, todayKey],
  );
  const buildingOccupancy = useMemo(() => getBuildingOccupancy(sessions), [sessions]);
  const floorOccupancy = useMemo(() => getFloorOccupancy(sessions), [sessions]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((first, second) => {
        const firstTime = Date.parse(first.entryTime);
        const secondTime = Date.parse(second.entryTime);
        if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) return 0;
        if (Number.isNaN(firstTime)) return 1;
        if (Number.isNaN(secondTime)) return -1;
        return secondTime - firstTime;
      }),
    [sessions],
  );

  const buildingCounts = useMemo(() => {
    const counts: Partial<Record<BuildingId, number>> = {};
    for (const session of sessions) {
      if (!session.buildingId) continue;
      counts[session.buildingId] = (counts[session.buildingId] ?? 0) + 1;
    }
    return counts;
  }, [sessions]);

  const availableFloors = buildingFilter === "all" ? FLOORS : getFloors(buildingFilter);

  const hasActiveFilters =
    search.trim().length > 0 ||
    buildingFilter !== "all" ||
    floorFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter.length > 0;

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedSessions.filter((session) => {
      if (buildingFilter !== "all" && session.buildingId !== buildingFilter) return false;
      if (floorFilter !== "all" && session.floor.trim().toUpperCase() !== floorFilter) return false;
      if (statusFilter !== "all" && session.status !== statusFilter) return false;
      if (dateFilter && session.entryDate !== dateFilter) return false;
      if (!term) return true;
      const slot = session.slot === null ? "" : String(session.slot);
      return [
        session.code,
        displayBuilding(session.building),
        session.floor,
        slot,
        slot.padStart(2, "0"),
        formatDateTime(session.entryTime),
        session.exitTime ? formatDateTime(session.exitTime) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [sortedSessions, buildingFilter, floorFilter, statusFilter, dateFilter, search]);

  const stats = [
    {
      label: "Total capacity",
      value: parkingStats.totalCapacity,
      note: `${floorOccupancy.length} basement floors`,
      icon: ParkingIcon,
      accent: "text-[#BB922E] bg-[#F5EEDC]",
    },
    {
      label: "Occupied slots",
      value: parkingStats.occupiedSlots,
      note: "Active sessions",
      icon: ClockIcon,
      accent: "text-[#176B45] bg-[#E7F5ED]",
    },
    {
      label: "Available slots",
      value: parkingStats.availableSlots,
      note: "Ready for parking",
      icon: CarFrontIcon,
      accent: "text-[#1F4E79] bg-[#E8F0F7]",
    },
    {
      label: "Total sessions",
      value: parkingStats.totalSessions,
      note: "All recorded visits",
      icon: TicketIcon,
      accent: "text-[#7A5C15] bg-[#FAF4E4]",
    },
    {
      label: "Today's entries",
      value: parkingStats.todayEntries,
      note: "By entry time",
      icon: ArrowRightIcon,
      accent: "text-[#176B45] bg-[#E7F5ED]",
    },
    {
      label: "Today's exits",
      value: parkingStats.todayExits,
      note: "By exit time",
      icon: CheckCircleIcon,
      accent: "text-[#1F4E79] bg-[#E8F0F7]",
    },
  ];

  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(lastUpdated)
    : "Not synced yet";

  function scrollToSection(id: string) {
    setIsNavOpen(false);
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateBuildingFilter(next: BuildingFilter) {
    setBuildingFilter(next);
    if (next !== "all" && !getFloors(next).some((floor) => floor === floorFilter)) {
      setFloorFilter("all");
    }
  }

  function toggleBuildingFilter(id: BuildingId) {
    updateBuildingFilter(buildingFilter === id ? "all" : id);
  }

  function clearFilters() {
    setSearch("");
    setBuildingFilter("all");
    setFloorFilter("all");
    setStatusFilter("all");
    setDateFilter("");
  }

  function openEndSessionDialog(session: AdminSession) {
    setSessionAction(session);
    setSessionActionError("");
    setSessionActionSuccess("");
  }

  async function handleEndSession() {
    const target = sessionAction;
    if (!target || endingSessionRef.current || target.status === "completed") return;

    endingSessionRef.current = true;
    setIsEndingSession(true);
    setSessionActionError("");
    setSessionActionSuccess("");

    try {
      const response = await endParking(target.code);
      if (!isSuccessResponse(response)) {
        setSessionActionError(friendlyMessage(response, "end"));
        return;
      }

      const record = extractRecord(response);
      const updatedExitTime =
        record && typeof record.exitTime === "string" && record.exitTime
          ? record.exitTime
          : new Date().toISOString();

      setSessions((current) =>
        current.map((session) =>
          session.code === target.code && session.entryTime === target.entryTime
            ? { ...session, status: "completed", exitTime: updatedExitTime }
            : session,
        ),
      );
      setSessionActionSuccess(
        `Parking ended for code ${target.code}. This session is now complete.`,
      );
      setSessionAction(null);
      void loadRecords(true);
    } catch (err) {
      setSessionActionError(friendlyMessage(err, "end"));
    } finally {
      endingSessionRef.current = false;
      setIsEndingSession(false);
    }
  }

  return (
    <div
      className={`min-h-screen bg-[#F4F5F7] text-[#16202C] ${fontClassName}`}
      style={{ fontFamily: "var(--font-work-sans), sans-serif" }}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06101C]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNavOpen((open) => !open)}
              aria-label={isNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isNavOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            >
              {isNavOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="HiLITE Group home">
              <span className="relative h-11 w-10 shrink-0">
                <Image
                  src="/brand/hilite-group-white-logo.svg"
                  alt="HiLITE Group"
                  fill
                  unoptimized
                  sizes="40px"
                  className="object-contain object-center"
                />
              </span>
              <span className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D8B65B]">
                  HiLITE Group
                </span>
                <span className="block truncate text-sm font-semibold text-white sm:text-base">
                  ParkFinder Admin
                </span>
              </span>
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
              <span className={`h-2 w-2 rounded-full bg-[#D8B65B] ${styles.liveDot}`} />
              Live operations
            </span>
            <span className="hidden text-xs text-slate-400 lg:block">Synced {lastUpdatedLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadRecords(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white transition hover:border-[#BB922E]/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
          >
            <RefreshIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      {isNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsNavOpen(false)}
          className="fixed inset-0 z-40 bg-[#02070D]/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/10 bg-[#081729] px-5 py-6 text-slate-300 transition-transform duration-300 lg:sticky lg:top-[69px] lg:z-0 lg:h-[calc(100vh-69px)] lg:shrink-0 lg:translate-x-0 ${
            isNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#D8B65B]">Dashboard menu</span>
            <button
              type="button"
              onClick={() => setIsNavOpen(false)}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Dashboard navigation" className={`mt-8 space-y-7 lg:mt-0 ${styles.fadeUp}`}>
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Control center
              </p>
              <div className="mt-3 space-y-1">
                {sectionLinks.map((item) => {
                  const Icon = item.icon;
                  const selected = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-white/5 hover:text-white ${
                        selected ? "bg-white/10 text-white" : "text-slate-400"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${selected ? "text-[#D8B65B]" : ""}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Quick access
              </p>
              <div className="mt-3 space-y-1">
                {pageLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsNavOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/5 p-4 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8B65B]">
              Data source
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Google Sheets records are fetched through the secured Apps Script endpoint.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <section
            id="overview"
            className={`relative overflow-hidden rounded-[28px] bg-[#071A2F] px-6 py-8 text-white shadow-[0_24px_60px_-35px_rgba(6,16,28,0.9)] sm:px-10 sm:py-10 ${styles.heroGlow} ${styles.fadeUp}`}
          >
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#D8B65B]">
                  <span className={`h-1.5 w-1.5 rounded-full bg-[#D8B65B] ${styles.liveDot}`} />
                  Operations overview
                </p>
                <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  HiLITE parking, under control.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Monitor active and completed visits across Business Park and Mall basement car parks, using live records from your connected sheet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Locations</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{BUILDINGS.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Basements</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {BUILDINGS.reduce((total, building) => total + building.floors.length, 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Active now</p>
                  <p className="mt-2 text-2xl font-semibold text-[#D8B65B]">{isLoading ? "—" : activeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Last sync</p>
                  <p className="mt-2 truncate text-sm font-semibold text-white sm:text-base">{lastUpdatedLabel}</p>
                </div>
              </div>
            </div>
          </section>

          {isLoading ? (
            <Notification
              tone="info"
              title="Loading parking records"
              className="mt-6"
            >
              <LoadingIndicator
                label="Please wait while we collect the latest sessions."
                className="justify-start"
              />
            </Notification>
          ) : null}

          {sessionActionSuccess ? (
            <Notification
              tone="success"
              title="Parking session ended"
              className="mt-6"
            >
              {sessionActionSuccess}
            </Notification>
          ) : null}

          {error ? (
            <Notification
              tone="error"
              title="Records couldn't be loaded"
              className="mt-6"
            >
              {error}
              <button
                type="button"
                onClick={() => void loadRecords(true)}
                disabled={isLoading || isRefreshing}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Try again
              </button>
            </Notification>
          ) : null}

          <section
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
            aria-label="Parking statistics"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <article
                  key={stat.label}
                  className={`group rounded-2xl border border-[#E5E8ED] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(6,16,28,0.45)] transition duration-300 hover:-translate-y-1 hover:border-[#D8B65B]/50 hover:shadow-[0_18px_40px_-28px_rgba(6,16,28,0.55)] ${styles.fadeUp}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#071A2F]">
                        {isLoading ? "—" : stat.value}
                      </p>
                    </div>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.accent}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {stat.note}
                  </p>
                </article>
              );
            })}
          </section>

          <section
            id="statistics"
            className={`mt-10 scroll-mt-28 ${styles.fadeUp}`}
            aria-label="Parking occupancy statistics"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9A761F]">
                  Statistics
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#071A2F] sm:text-3xl">
                  Live occupancy
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Calculated from active and completed sessions in the connected sheet.
                </p>
              </div>
              <span className="self-start rounded-full border border-[#E5E8ED] bg-white px-4 py-2 text-xs font-semibold text-slate-500 sm:self-auto">
                {isLoading ? "—" : `${parkingStats.occupiedSlots} of ${parkingStats.totalCapacity} slots in use`}
              </span>
            </div>

            <article className="mt-5 rounded-[24px] border border-[#E5E8ED] bg-white p-5 shadow-[0_20px_50px_-38px_rgba(6,16,28,0.6)] sm:p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Overall occupancy</p>
                      <p className="mt-2 text-4xl font-semibold tracking-tight text-[#071A2F]">
                        {isLoading ? "—" : `${parkingStats.occupancyPercentage}%`}
                      </p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5EEDC] text-[#9A761F]">
                      <LayersIcon className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="mt-5">
                    <OccupancyBar
                      percentage={isLoading ? 0 : parkingStats.occupancyPercentage}
                      label="Overall occupancy"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#BB922E]" />
                      {isLoading ? "—" : parkingStats.occupiedSlots} occupied
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#D9E7F3]" />
                      {isLoading ? "—" : parkingStats.availableSlots} available
                    </span>
                    <span>{parkingStats.totalCapacity} total slots</span>
                  </div>
                </div>

                <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:w-[320px]">
                  <div className="rounded-2xl bg-[#FBF6E9] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A761F]">
                      Today&apos;s entries
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#071A2F]">
                      {isLoading ? "—" : parkingStats.todayEntries}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#EFF5FA] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1F4E79]">
                      Today&apos;s exits
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#071A2F]">
                      {isLoading ? "—" : parkingStats.todayExits}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {buildingOccupancy.map((group, index) => (
                <OccupancyGroupCard
                  key={group.id}
                  group={group}
                  isLoading={isLoading}
                  animationDelay={index * 80}
                />
              ))}
            </div>

            <div className="mt-4 rounded-[24px] border border-[#E5E8ED] bg-white p-5 shadow-[0_20px_50px_-38px_rgba(6,16,28,0.6)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#071A2F] sm:text-xl">
                    Floor-wise occupancy
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {floorOccupancy.length} basement floors · {floorOccupancy[0]?.capacity ?? 0} slots each
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#BB922E]" />
                    Occupied
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#D9E7F3]" />
                    Available
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {floorOccupancy.map((group) => (
                  <article
                    key={group.id}
                    className="rounded-2xl border border-[#E8EBF0] bg-[#FAFBFC] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#071A2F]">{group.label}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          HiLITE {group.detail}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[#9A761F]">
                        {isLoading ? "—" : `${group.percentage}%`}
                      </span>
                    </div>
                    <div className="mt-3">
                      <OccupancyBar
                        percentage={isLoading ? 0 : group.percentage}
                        label={`${group.detail} ${group.label} occupancy`}
                        compact
                      />
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-slate-500">
                      {isLoading
                        ? "—"
                        : `${group.occupied} occupied · ${group.available} available`}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="locations" className="mt-10 scroll-mt-28">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9A761F]">
                  Locations
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#071A2F] sm:text-3xl">
                  Parking environments
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Select a location to filter the session list below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateBuildingFilter("all")}
                className={`self-start rounded-full border px-4 py-2 text-xs font-semibold transition sm:self-auto ${
                  buildingFilter === "all"
                    ? "border-[#BB922E] bg-[#F5EEDC] text-[#6F5414]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#D8B65B]"
                }`}
              >
                All locations
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {BUILDINGS.map((building) => {
                const selected = buildingFilter === building.id;
                const floors = `${building.floors[0]}–${building.floors[building.floors.length - 1]}`;
                return (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => toggleBuildingFilter(building.id)}
                    aria-pressed={selected}
                    className={`flex items-center justify-between gap-4 rounded-2xl border bg-white p-5 text-left shadow-[0_10px_30px_-24px_rgba(6,16,28,0.45)] transition hover:-translate-y-0.5 ${
                      selected
                        ? "border-[#BB922E] ring-2 ring-[#BB922E]/20"
                        : "border-[#E5E8ED] hover:border-[#D8B65B]"
                    } ${styles.fadeUp}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          selected
                            ? "bg-[#F5EEDC] text-[#9A761F]"
                            : "bg-[#E8F0F7] text-[#1F4E79]"
                        }`}
                      >
                        <BuildingIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-[#071A2F]">
                          {buildingNames[building.id]}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          Basement {floors} · {building.floors.length} floors · {building.slotsPerFloor} slots / floor
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-[#F7F8FA] px-3 py-1.5 text-xs font-semibold text-slate-600">
                      {isLoading ? "—" : `${buildingCounts[building.id] ?? 0} sessions`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            id="sessions"
            className={`mt-10 scroll-mt-28 overflow-hidden rounded-[24px] border border-[#E5E8ED] bg-white shadow-[0_20px_50px_-38px_rgba(6,16,28,0.6)] ${styles.fadeUp}`}
          >
            <div className="border-b border-[#ECEFF3] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5EEDC] text-[#9A761F]">
                    <TicketIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-[#071A2F] sm:text-xl">
                      All parking sessions
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Latest sessions are shown first
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#DFE3E9] bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#BB922E] hover:bg-[#FBFAF6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <label className="relative block xl:col-span-2">
                  <span className="sr-only">Search by retrieval code or slot number</span>
                  <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code or slot number"
                    className={`${filterControlClassName} pl-10`}
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Filter by building</span>
                  <select
                    value={buildingFilter}
                    onChange={(event) => updateBuildingFilter(event.target.value as BuildingFilter)}
                    className={filterControlClassName}
                  >
                    <option value="all">All buildings</option>
                    {BUILDINGS.map((building) => (
                      <option key={building.id} value={building.id}>
                        {buildingNames[building.id]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filter by basement floor</span>
                  <select
                    value={floorFilter}
                    onChange={(event) => setFloorFilter(event.target.value as FloorFilter)}
                    className={filterControlClassName}
                  >
                    <option value="all">All floors</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>
                        {floor}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filter by status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className={filterControlClassName}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filter by entry date</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    className={filterControlClassName}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-[#ECEFF3] bg-[#FAFBFC] px-5 py-3 text-xs sm:px-6">
              <span className="font-semibold text-slate-500">Status:</span>
              {(["all", "active", "completed"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={statusFilter === status}
                  className={`rounded-full px-3 py-1.5 font-semibold capitalize transition ${
                    statusFilter === status
                      ? "bg-[#071A2F] text-white"
                      : "bg-white text-slate-500 ring-1 ring-[#DFE3E9] hover:text-[#071A2F]"
                  }`}
                >
                  {status}
                </button>
              ))}
              {buildingFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => updateBuildingFilter("all")}
                  className="rounded-full bg-[#F5EEDC] px-3 py-1.5 font-semibold text-[#6F5414] transition hover:bg-[#EADFB8]"
                >
                  {buildingNames[buildingFilter]} ×
                </button>
              ) : null}
              {floorFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => setFloorFilter("all")}
                  className="rounded-full bg-[#E8F0F7] px-3 py-1.5 font-semibold text-[#1F4E79] transition hover:bg-[#D9E7F3]"
                >
                  {floorFilter} ×
                </button>
              ) : null}
              {dateFilter ? (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  className="rounded-full bg-[#E8F0F7] px-3 py-1.5 font-semibold text-[#1F4E79] transition hover:bg-[#D9E7F3]"
                >
                  {dateFilter} ×
                </button>
              ) : null}
              <span className="ml-auto font-semibold text-slate-500" aria-live="polite">
                {filteredSessions.length} matching of {sessions.length} sessions
              </span>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#F7F8FA] text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 sm:px-6">Code</th>
                    <th className="px-5 py-4">Building</th>
                    <th className="px-5 py-4">Floor</th>
                    <th className="px-5 py-4">Slot</th>
                    <th className="px-5 py-4">Entry time</th>
                    <th className="px-5 py-4">Exit time</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F4]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 sm:px-6">
                        <LoadingIndicator label="Loading parking sessions..." />
                      </td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 sm:px-6">
                        <EmptyRecordsMessage filtered={hasActiveFilters} onClear={clearFilters} />
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr
                        key={`${session.code}-${session.entryTime}`}
                        className="transition-colors hover:bg-[#FBFAF6]"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-[#071A2F] sm:px-6">
                          {session.code}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                          {displayBuilding(session.building)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-lg bg-[#F1F3F6] px-2 py-1 font-semibold text-slate-700">
                            {session.floor}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {session.slot !== null ? String(session.slot).padStart(2, "0") : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {session.entryTime ? formatDateTime(session.entryTime) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {session.exitTime ? formatDateTime(session.exitTime) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <SessionStatusBadge status={session.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {session.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => openEndSessionDialog(session)}
                              disabled={isEndingSession}
                              className="rounded-lg border border-[#122E52]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#122E52] transition hover:border-[#BB922E] hover:bg-[#FBF8F0] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              End
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {isLoading ? (
                <LoadingIndicator label="Loading parking sessions..." className="py-10 text-slate-500" />
              ) : filteredSessions.length === 0 ? (
                <div className="py-10">
                  <EmptyRecordsMessage filtered={hasActiveFilters} onClear={clearFilters} />
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <SessionCard
                    key={`${session.code}-${session.entryTime}`}
                    session={session}
                    onEnd={openEndSessionDialog}
                    isEnding={isEndingSession}
                  />
                ))
              )}
            </div>
          </section>
        </main>
      </div>

      {sessionAction ? (
        <ConfirmDialog
          open={Boolean(sessionAction)}
          title="End this parking session?"
          description="This will complete the parking session and record the exit time. This cannot be undone."
          confirmLabel="Yes, end session"
          isPending={isEndingSession}
          onConfirm={() => void handleEndSession()}
          onCancel={() => setSessionAction(null)}
        >
          <div className="rounded-xl border border-slate-200 bg-[#F9FAFC] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Retrieval code
            </p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-[#122E52]">
              {sessionAction.code}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {displayBuilding(sessionAction.building)} · {sessionAction.floor} ·{" "}
              {sessionAction.slot !== null
                ? `Slot ${String(sessionAction.slot).padStart(2, "0")}`
                : "Slot not recorded"}
            </p>
          </div>
          {sessionActionError ? (
            <Notification
              tone="error"
              title="Couldn't end the session"
              className="mt-4"
            >
              {sessionActionError}
            </Notification>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
