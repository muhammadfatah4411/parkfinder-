"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { LoadingIndicator, Notification } from "@/components/feedback";
import {
  ArrowRightIcon,
  BuildingIcon,
  CarFrontIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  LayersIcon,
  MapPinIcon,
  ParkingIcon,
  RefreshIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import {
  BUILDINGS,
  SLOT_NUMBERS,
  formatDateTime,
  getBuilding,
  isBuildingId,
  isFloorForBuilding,
  type BuildingId,
  type Floor,
} from "@/lib/parking-data";
import {
  extractRecord,
  extractRecords,
  getActiveOccupiedSlots,
  getAdminRecords,
  getRecordCode,
  getRecordSlot,
  isSuccessResponse,
  saveParking,
} from "@/lib/parking-api";
import {
  friendlyMessage,
  isOccupiedMessage,
} from "@/lib/user-messages";

type SaveParkingFormProps = {
  initialBuilding: BuildingId | "";
  initialFloor: Floor | "";
};

type SavedSession = {
  code: string;
  building: BuildingId;
  floor: Floor;
  slot: number;
  entryTime: string;
};

const MIN_SLOT = 1;
const MAX_SLOT = 50;

const inputClassName =
  "mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#122E52] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#BB922E] focus:ring-4 focus:ring-[#BB922E]/15";

const primaryButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BB922E] px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#0B1F3A] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#D8B65B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8B65B] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#122E52]/20 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#122E52] transition duration-300 hover:-translate-y-0.5 hover:border-[#BB922E] hover:bg-[#FBF8F0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BB922E]";

function StepHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#122E52] text-sm font-bold text-[#D8B65B]">
        {number}
      </span>
      <div>
        <h3 className="text-base font-bold text-[#122E52] sm:text-lg">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F9FAFC] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-[#122E52]">{value}</p>
    </div>
  );
}

function AvailabilityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#122E52]">{value}</p>
    </div>
  );
}

type FloorAvailabilityPanelProps = {
  buildingName: string;
  floor: Floor;
  totalSlots: number;
  occupiedSlots: Set<number>;
  selectedSlot: number | null;
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
  onSelectSlot?: (slot: number) => void;
};

function FloorAvailabilityPanel({
  buildingName,
  floor,
  totalSlots,
  occupiedSlots,
  selectedSlot,
  isLoading,
  error,
  onRefresh,
  onSelectSlot,
}: FloorAvailabilityPanelProps) {
  const occupiedCount = occupiedSlots.size;
  const availableCount = Math.max(totalSlots - occupiedCount, 0);
  const availablePercentage = Math.round((availableCount / totalSlots) * 100);
  const unavailable = isLoading || Boolean(error);
  const slots = SLOT_NUMBERS.slice(0, totalSlots);

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-[#F9FAFC] p-4 sm:p-6"
      aria-label={`Parking availability for ${buildingName} ${floor}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#BB922E]">
            Live floor availability
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#122E52]">
            {buildingName} · {floor}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {onSelectSlot
              ? "Tap a green bay to select its slot number."
              : "Updated after your parking session was saved."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#122E52] transition hover:border-[#BB922E] hover:bg-[#FBF8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BB922E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <AvailabilityStat label="Total slots" value={String(totalSlots)} />
        <AvailabilityStat
          label="Occupied"
          value={unavailable ? "—" : String(occupiedCount)}
        />
        <AvailabilityStat
          label="Available"
          value={unavailable ? "—" : String(availableCount)}
        />
        <AvailabilityStat
          label="Availability"
          value={unavailable ? "—" : `${availablePercentage}%`}
        />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
          {isLoading ? (
            <LoadingIndicator
              label="Checking live availability..."
              className="justify-start text-[#122E52]"
            />
          ) : (
            <span className="text-slate-600">
              {error
                ? "Live availability unavailable"
                : `${availableCount} of ${totalSlots} slots available`}
            </span>
          )}
          <span className="text-[#176B45]">
            {unavailable ? "—" : `${availablePercentage}% free`}
          </span>
        </div>
        <div
          className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#F3CFCF]"
          role="progressbar"
          aria-label="Available parking slots"
          aria-valuemin={0}
          aria-valuemax={totalSlots}
          aria-valuenow={unavailable ? 0 : availableCount}
          aria-valuetext={
            isLoading
              ? "Loading availability"
              : error
                ? "Availability unavailable"
                : `${availableCount} of ${totalSlots} slots available`
          }
        >
          <div
            className="h-full rounded-full bg-[#2E9E6B] transition-[width] duration-500"
            style={{ width: unavailable ? "0%" : `${availablePercentage}%` }}
          />
        </div>
      </div>

      {error ? (
        <Notification
          tone="warning"
          title="Live availability unavailable"
          className="mt-4"
        >
          {error}
        </Notification>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-[#2E9E6B] bg-[#E7F5ED]" />
          Available
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-[#D96A6A] bg-[#FDECEC]" />
          Occupied
        </span>
        {onSelectSlot ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-[#BB922E] bg-white ring-1 ring-[#BB922E]" />
            Selected
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {slots.map((slotNumber) => {
          const occupied = occupiedSlots.has(slotNumber);
          const selected = selectedSlot === slotNumber;
          const slotState = unavailable
            ? "border-slate-200 bg-slate-100 text-slate-400"
            : occupied
              ? "border-[#D96A6A] bg-[#FDECEC] text-[#A32828]"
              : "border-[#2E9E6B] bg-[#E7F5ED] text-[#176B45] hover:-translate-y-0.5 hover:bg-[#D6EFE1]";
          const selectionRing = selected
            ? "ring-2 ring-[#BB922E] ring-offset-1"
            : "";
          const canSelect = Boolean(onSelectSlot) && !occupied && !unavailable;

          return (
            <button
              key={slotNumber}
              type="button"
              onClick={() => onSelectSlot?.(slotNumber)}
              disabled={!canSelect}
              aria-pressed={onSelectSlot ? selected : undefined}
              aria-label={`Slot ${slotNumber}, ${
                unavailable
                  ? "availability unavailable"
                  : occupied
                    ? "occupied"
                    : "available"
              }${selected ? ", selected" : ""}`}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BB922E] disabled:cursor-not-allowed ${slotState} ${selectionRing}`}
            >
              <CarFrontIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-bold tabular-nums">
                {String(slotNumber).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SaveParkingForm({
  initialBuilding,
  initialFloor,
}: SaveParkingFormProps) {
  const [buildingId, setBuildingId] = useState<BuildingId | "">(
    initialBuilding,
  );
  const [floor, setFloor] = useState<Floor | "">(
    initialFloor && isFloorForBuilding(initialBuilding, initialFloor)
      ? initialFloor
      : "",
  );
  const [slot, setSlot] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<number>>(
    () => new Set<number>(),
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const availabilityRequestRef = useRef(0);
  const savingRef = useRef(false);

  const selectedBuilding = buildingId ? getBuilding(buildingId) : null;
  const floors = selectedBuilding ? selectedBuilding.floors : [];
  const totalSlots = selectedBuilding?.slotsPerFloor ?? SLOT_NUMBERS.length;
  const selectedFromQr = Boolean(initialBuilding && initialFloor);
  const parsedSlot = slot.trim() === "" ? null : Number(slot);
  const selectedSlot =
    parsedSlot !== null && Number.isInteger(parsedSlot) ? parsedSlot : null;
  const selectedSlotOccupied =
    selectedSlot !== null && occupiedSlots.has(selectedSlot);
  const slotError =
    selectedSlotOccupied ||
    error.toLowerCase().includes("parking slot") ||
    error.toLowerCase().includes("slot ");
  const errorTitle = slotError
    ? "Check your parking slot"
    : "Couldn't save your parking";

  const loadAvailability = useCallback(
    async (targetBuilding: BuildingId, targetFloor: Floor) => {
      const requestId = ++availabilityRequestRef.current;
      setOccupiedSlots(new Set<number>());
      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const response = await getAdminRecords();
        if (!isSuccessResponse(response)) {
          if (requestId !== availabilityRequestRef.current) return;
          setOccupiedSlots(new Set<number>());
          setAvailabilityError(
            friendlyMessage(response, "availability"),
          );
          return;
        }

        const occupied = getActiveOccupiedSlots(
          extractRecords(response),
          targetBuilding,
          targetFloor,
        );
        if (requestId !== availabilityRequestRef.current) return;
        setOccupiedSlots(occupied);
      } catch (err) {
        if (requestId !== availabilityRequestRef.current) return;
        setOccupiedSlots(new Set<number>());
        setAvailabilityError(friendlyMessage(err, "availability"));
      } finally {
        if (requestId === availabilityRequestRef.current) {
          setAvailabilityLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!buildingId || !floor) {
      availabilityRequestRef.current += 1;
      return;
    }

    const timer = window.setTimeout(() => {
      void loadAvailability(buildingId, floor);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [buildingId, floor, loadAvailability]);

  useEffect(() => {
    if (!buildingId || !floor) return;

    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      void loadAvailability(buildingId, floor);
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [buildingId, floor, loadAvailability]);

  function handleBuildingChange(value: string) {
    const nextBuilding = isBuildingId(value) ? value : "";
    setBuildingId(nextBuilding);
    setFloor("");
    setSlot("");
    setError("");
  }

  function handleFloorChange(value: string) {
    const nextFloor = isFloorForBuilding(buildingId, value) ? value : "";
    setFloor(nextFloor);
    setSlot("");
    setError("");
  }

  function handleSlotSelect(slotNumber: number) {
    setSlot(String(slotNumber));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setError("");

    if (!buildingId) {
      setError("Please choose a building.");
      return;
    }
    if (!floor) {
      setError("Please choose a basement floor.");
      return;
    }

    const slotNumber = Number(slot);
    if (!Number.isInteger(slotNumber) || slotNumber < MIN_SLOT || slotNumber > MAX_SLOT) {
      setError(`Please enter a parking slot number between ${MIN_SLOT} and ${MAX_SLOT}.`);
      return;
    }
    if (occupiedSlots.has(slotNumber)) {
      setError(`Slot ${slotNumber} is already occupied on ${floor}. Choose an available slot.`);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const response = await saveParking({ building: buildingId, floor, slotNumber });
      if (!isSuccessResponse(response)) {
        setError(
          isOccupiedMessage(response)
            ? `Slot ${slotNumber} is already occupied on ${floor}. Choose another available slot.`
            : friendlyMessage(response, "save"),
        );
        return;
      }

      const record = extractRecord(response);
      const code = getRecordCode(record) || (typeof response.token === "string" ? response.token : "") || (typeof response.code === "string" ? response.code : "");
      if (!code) {
        setError(
          "Your parking was recorded, but we could not get a retrieval code. Please check again or contact the parking desk.",
        );
        return;
      }

      const recordSlot = record ? getRecordSlot(record) : null;
      const recordBuilding = record && isBuildingId(record.building) ? record.building : buildingId;
      const recordFloor = record && isFloorForBuilding(recordBuilding, record.floor) ? (record.floor as Floor) : floor;
      const entryTime =
        record && typeof record.entryTime === "string" && record.entryTime
          ? record.entryTime
          : new Date().toISOString();

      setSession({
        code,
        building: recordBuilding,
        floor: recordFloor,
        slot: recordSlot ?? slotNumber,
        entryTime,
      });
      setCopied(false);
      setCopyFailed(false);
      void loadAvailability(buildingId, floor);
    } catch (err) {
      setError(friendlyMessage(err, "save"));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    if (!session) {
      return;
    }
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  function handleSaveAnother() {
    setSession(null);
    setSlot("");
    setCopied(false);
    setCopyFailed(false);
    setError("");
  }

  if (session) {
    const building = getBuilding(session.building);

    return (
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.65fr]">
        <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(18,46,82,0.12)] sm:p-9">
          <Notification tone="success" title="Parking saved" className="mb-7">
            Your spot is recorded. Keep the retrieval code below safe.
          </Notification>

          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#122E52] text-[#D8B65B]">
              <CheckCircleIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
                Saved successfully
              </p>
              <h2 className="mt-2 text-2xl font-semibold uppercase tracking-tight text-[#122E52] sm:text-3xl">
                Your Parking Spot Is Saved
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep this retrieval code safe. You will need it to find your car.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#BB922E]/40 bg-[#071A33] p-6 text-center text-white sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D8B65B]">
              Parking retrieval code
            </p>
            <p className="mt-4 break-all font-mono text-3xl font-bold tracking-[0.16em] text-white sm:text-4xl">
              {session.code}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#BB922E] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#0B1F3A] transition duration-300 hover:-translate-y-0.5 hover:bg-[#D8B65B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8B65B]"
            >
              <CopyIcon className="h-4 w-4" />
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          {copyFailed ? (
            <Notification
              tone="warning"
              title="Copy didn't work"
              className="mt-4"
            >
              Please select the code above and copy it manually.
            </Notification>
          ) : null}

          <div className="mt-4 rounded-xl border border-[#BB922E]/25 bg-[#BB922E]/10 px-4 py-3 text-sm leading-6 text-[#5C4A17]">
            Keep this code to find your car later. Without it, the parking
            session cannot be retrieved.
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <SummaryTile
              label="Building"
              value={building.name}
              icon={<MapPinIcon className="h-3.5 w-3.5" />}
            />
            <SummaryTile
              label="Floor"
              value={session.floor}
              icon={<LayersIcon className="h-3.5 w-3.5" />}
            />
            <SummaryTile
              label="Slot"
              value={`Slot ${session.slot}`}
              icon={<ParkingIcon className="h-3.5 w-3.5" />}
            />
            <SummaryTile
              label="Entry time"
              value={formatDateTime(session.entryTime)}
              icon={<ClockIcon className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="mt-7">
            <FloorAvailabilityPanel
              buildingName={building.name}
              floor={session.floor}
              totalSlots={building.slotsPerFloor}
              occupiedSlots={occupiedSlots}
              selectedSlot={session.slot}
              isLoading={availabilityLoading}
              error={availabilityError}
              onRefresh={() => void loadAvailability(session.building, session.floor)}
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/find?code=${encodeURIComponent(session.code)}`}
              className={primaryButtonClassName}
            >
              Find My Car
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={handleSaveAnother}
              className={secondaryButtonClassName}
            >
              Save another car
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[26px] bg-[#122E52] p-6 text-white shadow-[0_18px_50px_rgba(18,46,82,0.18)] sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#BB922E]/15 text-[#D8B65B]">
              <ShieldCheckIcon className="h-6 w-6" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#D8B65B]">
              Keep it safe
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Save this code on your phone or write it down. You will need it
              when you return to Find My Car.
            </p>
          </section>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.65fr]">
      <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(18,46,82,0.12)] sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#122E52] text-[#D8B65B]">
            <ParkingIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
              Parking details
            </p>
            <h2 className="mt-2 text-2xl font-semibold uppercase tracking-tight text-[#122E52] sm:text-3xl">
              Tell Us Where You Parked
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select your location and enter the slot number shown near your
              car.
            </p>
          </div>
        </div>

        {selectedFromQr ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#BB922E]/30 bg-[#BB922E]/10 px-4 py-3 text-sm font-semibold text-[#5C4A17]">
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-[#BB922E]" />
            Building and floor were selected from the QR code.
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-8"
          aria-busy={isSaving}
        >
          <div className="divide-y divide-slate-200">
            <div className="pb-7">
              <StepHeading
                number="01"
                title="Select Building"
                description="Choose where you are parked today."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {BUILDINGS.map((building) => {
                  const active = buildingId === building.id;
                  return (
                    <label
                      key={building.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition duration-300 ${
                        active
                          ? "border-[#BB922E] bg-[#BB922E]/10 shadow-[0_12px_30px_rgba(187,146,46,0.14)]"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#BB922E]/60 hover:bg-[#FBF8F0]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="building"
                        value={building.id}
                        checked={active}
                        onChange={() => handleBuildingChange(building.id)}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-[#BB922E] text-[#0B1F3A]"
                            : "bg-[#122E52] text-[#D8B65B]"
                        }`}
                      >
                        <BuildingIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#122E52]">
                          {building.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {building.floors.length} basement floors
                        </span>
                      </span>
                      {active ? (
                        <CheckCircleIcon className="h-5 w-5 shrink-0 text-[#BB922E]" />
                      ) : (
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-slate-300"
                          aria-hidden="true"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="py-7">
              <StepHeading
                number="02"
                title="Select Basement Floor"
                description="Pick the basement level for your building."
              />
              {floors.length ? (
                <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {floors.map((floorOption) => {
                    const active = floor === floorOption;
                    return (
                      <label key={floorOption} className="cursor-pointer">
                        <input
                          type="radio"
                          name="floor"
                          value={floorOption}
                          checked={active}
                          onChange={() => handleFloorChange(floorOption)}
                          className="sr-only"
                        />
                        <span
                          className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition duration-300 ${
                            active
                              ? "border-[#BB922E] bg-[#BB922E] text-[#0B1F3A]"
                              : "border-slate-200 bg-white text-[#122E52] hover:border-[#BB922E]/60 hover:bg-[#FBF8F0]"
                          }`}
                        >
                          {floorOption}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-[#F9FAFC] px-4 py-4 text-sm text-slate-500">
                  Choose a building first to see its basement floors.
                </p>
              )}
            </div>

            <div className="pt-7">
              <StepHeading
                number="03"
                title="Enter Parking Slot Number"
                description={`Use a number from ${MIN_SLOT} to ${MAX_SLOT}.`}
              />
              <div className="mt-5">
                <label
                  htmlFor="slot"
                  className="text-sm font-bold text-[#122E52]"
                >
                  Parking slot number
                </label>
                <input
                  id="slot"
                  name="slot"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={slot}
                  onChange={(event) => {
                    setSlot(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter slot number"
                  aria-invalid={slotError || undefined}
                  aria-describedby="slot-help"
                  className={`${inputClassName} ${
                    slotError
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : ""
                  }`}
                />
                <p
                  id="slot-help"
                  className={`mt-2 text-xs ${
                    selectedSlotOccupied
                      ? "font-semibold text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {selectedSlotOccupied
                    ? `Slot ${selectedSlot} is already occupied. Choose a green slot below.`
                    : `Slots are numbered from ${MIN_SLOT} to ${MAX_SLOT} on every basement floor.`}
                </p>
              </div>
            </div>
          </div>

          {buildingId && floor && selectedBuilding ? (
            <div className="mt-7 border-t border-slate-200 pt-7">
              <FloorAvailabilityPanel
                buildingName={selectedBuilding.name}
                floor={floor}
                totalSlots={totalSlots}
                occupiedSlots={occupiedSlots}
                selectedSlot={selectedSlot}
                isLoading={availabilityLoading}
                error={availabilityError}
                onRefresh={() => void loadAvailability(buildingId, floor)}
                onSelectSlot={handleSlotSelect}
              />
            </div>
          ) : null}

          {error ? (
            <Notification
              tone={slotError ? "warning" : "error"}
              title={errorTitle}
              className="mt-6"
            >
              {error}
            </Notification>
          ) : null}

          {isSaving ? (
            <LoadingIndicator
              label="Saving your parking session..."
              className="mt-6 text-[#122E52]"
            />
          ) : null}

          <button
            type="submit"
            className={`${primaryButtonClassName} mt-8`}
            disabled={isSaving || selectedSlotOccupied}
          >
            {isSaving ? "Saving..." : "Save My Parking"}
            {!isSaving ? <ArrowRightIcon className="h-5 w-5" /> : null}
          </button>
        </form>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[26px] bg-[#122E52] p-6 text-white shadow-[0_18px_50px_rgba(18,46,82,0.18)] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D8B65B]">
            How it works
          </p>
          <div className="mt-6 space-y-5">
            {[
              {
                icon: BuildingIcon,
                title: "Choose your building",
                text: "Business Park or Mall basement parking.",
              },
              {
                icon: LayersIcon,
                title: "Pick your floor",
                text: "Available floors update with your building.",
              },
              {
                icon: ParkingIcon,
                title: "Enter your slot",
                text: "You will receive a unique retrieval code.",
              },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#BB922E]/15 text-[#D8B65B]">
                    <ItemIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
            Good to know
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Your entry time is saved automatically when you press Save My
            Parking.
          </p>
        </section>
      </aside>
    </div>
  );
}
