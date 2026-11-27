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
import {
  ConfirmDialog,
  EmptyState,
  LoadingIndicator,
  Notification,
} from "@/components/feedback";
import {
  ArrowRightIcon,
  CarFrontIcon,
  CheckCircleIcon,
  ClockIcon,
  LayersIcon,
  MapPinIcon,
  ParkingIcon,
  SearchIcon,
  ShieldCheckIcon,
  SignOutIcon,
  TicketIcon,
} from "@/components/icons";
import {
  formatDateTime,
  getBuilding,
  isBuildingId,
  isFloorForBuilding,
  type BuildingId,
  type Floor,
} from "@/lib/parking-data";
import {
  endParking,
  extractRecord,
  findParking,
  getRecordCode,
  getRecordSlot,
  getRecordStatus,
  isSuccessResponse,
  type ParkingApiRecord,
} from "@/lib/parking-api";
import { friendlyMessage } from "@/lib/user-messages";

type DisplaySession = {
  code: string;
  building: BuildingId | string;
  floor: Floor | string;
  slot: number | null;
  entryTime: string;
  exitTime: string | null;
  status: "active" | "completed" | string;
};

const inputClassName =
  "mt-3 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-[#122E52] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#BB922E] focus:ring-4 focus:ring-[#BB922E]/15";

const primaryButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BB922E] px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#0B1F3A] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#D8B65B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8B65B] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

const endButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#122E52] px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#0B1F3A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BB922E] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:shrink-0";

function toDisplaySession(
  record: ParkingApiRecord,
  fallbackCode: string,
): DisplaySession | null {
  const code = getRecordCode(record) || fallbackCode;
  const building = typeof record.building === "string" ? record.building : "";
  const floor = typeof record.floor === "string" ? record.floor : "";
  if (!code || !building || !floor) return null;
  return {
    code,
    building,
    floor,
    slot: getRecordSlot(record),
    entryTime: typeof record.entryTime === "string" ? record.entryTime : "",
    exitTime:
      typeof record.exitTime === "string" || record.exitTime === null
        ? record.exitTime ?? null
        : null,
    status: getRecordStatus(record),
  };
}

function Detail({
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
      <p className="mt-2 break-words text-lg font-bold text-[#122E52]">{value}</p>
    </div>
  );
}

export function FindCarForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode.trim());
  const [searchedCode, setSearchedCode] = useState("");
  const [session, setSession] = useState<DisplaySession | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [foundCompleted, setFoundCompleted] = useState(false);
  const lastInitialCode = useRef("");
  const searchingRef = useRef(false);
  const endingRef = useRef(false);

  const lookupParking = useCallback(async (rawCode: string) => {
    if (searchingRef.current) return;
    const normalized = rawCode.trim();
    setSearchedCode(normalized);
    setSuccessMessage("");
    setFoundCompleted(false);
    setConfirmEnd(false);

    if (!normalized) {
      setSession(null);
      setError("Please enter a retrieval code.");
      return;
    }

    searchingRef.current = true;
    setIsSearching(true);
    setError("");
    try {
      const response = await findParking(normalized);
      if (!isSuccessResponse(response)) {
        setSession(null);
        setError(friendlyMessage(response, "find"));
        return;
      }
      const record = extractRecord(response);
      const display = record ? toDisplaySession(record, normalized) : null;
      if (!display) {
        setSession(null);
        setError(friendlyMessage(response, "find"));
        return;
      }
      setSession(display);
      setFoundCompleted(display.status === "completed");
      setError("");
    } catch (err) {
      setSession(null);
      setError(friendlyMessage(err, "find"));
    } finally {
      searchingRef.current = false;
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const normalized = initialCode.trim();
    if (!normalized || normalized === lastInitialCode.current) return;
    lastInitialCode.current = normalized;
    const timer = window.setTimeout(() => {
      void lookupParking(normalized);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCode, lookupParking]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupParking(code);
  }

  async function handleEndParking() {
    if (!session || endingRef.current || session.status === "completed") return;
    endingRef.current = true;
    setIsEnding(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await endParking(session.code);
      if (!isSuccessResponse(response)) {
        setError(friendlyMessage(response, "end"));
        return;
      }
      const record = extractRecord(response);
      const updated = record ? toDisplaySession(record, session.code) : null;
      const endedSession = updated ?? session;
      setSession({
        ...endedSession,
        status: "completed",
        exitTime: endedSession.exitTime ?? new Date().toISOString(),
      });
      setSuccessMessage("Parking ended. Your exit time has been saved.");
      setFoundCompleted(true);
      setConfirmEnd(false);
    } catch (err) {
      setError(friendlyMessage(err, "end"));
    } finally {
      endingRef.current = false;
      setIsEnding(false);
    }
  }

  const codeError = Boolean(error) && !session;
  const buildingName =
    session && isBuildingId(session.building)
      ? getBuilding(session.building).name
      : session?.building || "—";
  const floorValue =
    session && isBuildingId(session.building) && isFloorForBuilding(session.building, session.floor)
      ? session.floor
      : session?.floor || "—";
  const slotValue =
    session?.slot !== null && session?.slot !== undefined
      ? `Slot ${String(session.slot).padStart(2, "0")}`
      : "—";
  const entryValue = session?.entryTime ? formatDateTime(session.entryTime) : "—";

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.65fr]">
        <div className="space-y-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(18,46,82,0.12)] sm:p-9">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#122E52] text-[#D8B65B]">
                <SearchIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
                  Retrieve your spot
                </p>
                <h2 className="mt-2 text-2xl font-semibold uppercase tracking-tight text-[#122E52] sm:text-3xl">
                  Enter Your Retrieval Code
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The code was shown after you saved your parking spot.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-8"
              aria-busy={isSearching}
            >
              <label htmlFor="code" className="text-sm font-bold text-[#122E52]">
                Parking retrieval code
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your code"
                  aria-invalid={codeError || undefined}
                  aria-describedby="code-help"
                  className={`${inputClassName} font-mono tracking-wide ${
                    codeError
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : ""
                  }`}
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className={`${primaryButtonClassName} sm:w-auto sm:shrink-0`}
                >
                  <SearchIcon className="h-5 w-5" />
                  {isSearching ? "Searching..." : "Find My Car"}
                </button>
              </div>
              <p id="code-help" className="mt-3 text-xs leading-5 text-slate-500">
                Enter the code exactly as shown, including capital letters.
                Check for typing mistakes if it is not found.
              </p>

              {isSearching ? (
                <LoadingIndicator
                  label="Finding your parking session..."
                  className="mt-6 justify-start text-[#122E52]"
                />
              ) : null}

              {error && !session ? (
                <Notification tone="error" title="Code not recognised" className="mt-6">
                  {error}
                </Notification>
              ) : null}
            </form>
          </section>

          {session ? (
            <section
              aria-live="polite"
              className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(18,46,82,0.12)] sm:p-9"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#122E52] text-[#D8B65B]">
                    <CarFrontIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
                      Parking session
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold uppercase tracking-tight text-[#122E52] sm:text-3xl">
                      {session.status === "active"
                        ? "Your Car Is Parked Here"
                        : "Your Parking Session"}
                    </h2>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    session.status === "active"
                      ? "bg-[#BB922E]/15 text-[#7A6019]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {session.status === "active" ? "Active" : "Completed"}
                </span>
              </div>

              <div className="mt-8 rounded-2xl border border-[#BB922E]/40 bg-[#071A33] p-6 text-center text-white sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D8B65B]">
                  Parking retrieval code
                </p>
                <p className="mt-4 break-all font-mono text-3xl font-bold tracking-[0.16em] text-white sm:text-4xl">
                  {session.code}
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Detail
                  label="Building name"
                  value={buildingName}
                  icon={<MapPinIcon className="h-3.5 w-3.5" />}
                />
                <Detail
                  label="Basement floor"
                  value={floorValue}
                  icon={<LayersIcon className="h-3.5 w-3.5" />}
                />
                <Detail
                  label="Parking slot number"
                  value={slotValue}
                  icon={<ParkingIcon className="h-3.5 w-3.5" />}
                />
                <Detail
                  label="Entry date and time"
                  value={entryValue}
                  icon={<ClockIcon className="h-3.5 w-3.5" />}
                />
              </div>

              {successMessage ? (
                <Notification
                  tone="success"
                  title="Parking ended"
                  className="mt-6"
                >
                  {successMessage}
                  {session.exitTime ? (
                    <span className="mt-1 block font-semibold">
                      Exit time: {formatDateTime(session.exitTime)}
                    </span>
                  ) : null}
                </Notification>
              ) : foundCompleted || session.status === "completed" ? (
                <Notification
                  tone="info"
                  title="This parking session has already ended"
                  className="mt-6"
                >
                  {session.exitTime
                    ? `It was completed on ${formatDateTime(session.exitTime)}.`
                    : "It was completed previously and is no longer active."}
                </Notification>
              ) : null}

              <div className="mt-8 border-t border-slate-200 pt-7">
                {error && session ? (
                  <Notification
                    tone="error"
                    title="Couldn't end parking"
                    className="mb-5"
                  >
                    {error}
                  </Notification>
                ) : null}

                {session.status === "active" ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-6 text-slate-600">
                      Leaving already? Ending parking completes this session and
                      records your exit time.
                    </p>
                    <button
                      type="button"
                      onClick={() => setConfirmEnd(true)}
                      disabled={isEnding}
                      className={endButtonClassName}
                    >
                      <SignOutIcon className="h-5 w-5" />
                      End Parking
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-[#BB922E]/30 bg-[#BB922E]/10 px-4 py-3 text-sm font-semibold text-[#5C4A17]">
                    <CheckCircleIcon className="h-4 w-4 shrink-0" />
                    Parking ended. This session is complete.
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-[26px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_18px_50px_rgba(18,46,82,0.08)]">
              {isSearching ? (
                <LoadingIndicator label="Finding your parking session..." />
              ) : (
                <EmptyState
                  title={
                    searchedCode
                      ? "No session to display."
                      : "Your parking details will appear here."
                  }
                  description="Enter your retrieval code to see your building, floor and slot."
                  icon={
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BB922E]/10 text-[#BB922E]">
                      <TicketIcon className="h-6 w-6" />
                    </span>
                  }
                />
              )}
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[26px] bg-[#122E52] p-6 text-white shadow-[0_18px_50px_rgba(18,46,82,0.18)] sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#BB922E]/15 text-[#D8B65B]">
              <TicketIcon className="h-6 w-6" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#D8B65B]">
              Lost your code?
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Check your notes, messages, or the saved code from the
              confirmation screen. The code is the only way to match a session
              to your car.
            </p>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-6 sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#BB922E]/10 text-[#BB922E]">
              <ShieldCheckIcon className="h-6 w-6" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#BB922E]">
              Need to park again?
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Save a new parking spot and you will get a fresh retrieval code
              for it.
            </p>
            <Link
              href="/save"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#122E52] transition hover:text-[#BB922E]"
            >
              Save parking
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </div>

      {confirmEnd && session ? (
        <ConfirmDialog
          open={confirmEnd}
          title="End this parking session?"
          description="This will complete the parking session and record your exit time. You cannot undo this action."
          confirmLabel="Yes, end parking"
          isPending={isEnding}
          onConfirm={() => void handleEndParking()}
          onCancel={() => setConfirmEnd(false)}
        >
          <div className="rounded-xl border border-slate-200 bg-[#F9FAFC] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Retrieval code
            </p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-[#122E52]">
              {session.code}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {buildingName} · {floorValue} · {slotValue}
            </p>
          </div>
          {error ? (
            <Notification
              tone="error"
              title="Couldn't end parking"
              className="mt-4"
            >
              {error}
            </Notification>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
