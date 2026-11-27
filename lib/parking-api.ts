import {
  getBuilding,
  isFloorForBuilding,
  resolveBuildingId,
  type BuildingId,
  type Floor,
} from "@/lib/parking-data";

export type ParkingApiRecord = {
  code?: string;
  token?: string;
  building?: string;
  floor?: string;
  slot?: number | string;
  slotNumber?: number | string;
  entryTime?: string;
  exitTime?: string | null;
  status?: string;
  [key: string]: unknown;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  record?: unknown;
  session?: unknown;
  records?: unknown;
  sessions?: unknown;
  token?: unknown;
  code?: unknown;
  [key: string]: unknown;
};

async function postParkingAction<T = ApiResponse>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/parking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed.";
    throw new Error(message);
  }
  return (data ?? ({} as T)) as T;
}

export async function saveParking(input: { building: BuildingId; floor: Floor; slotNumber: number }) {
  return postParkingAction<ApiResponse>({ action: "saveParking", ...input });
}

export async function findParking(token: string) {
  return postParkingAction<ApiResponse>({ action: "findParking", token });
}

export async function endParking(token: string) {
  return postParkingAction<ApiResponse>({ action: "endParking", token });
}

export async function getAdminRecords() {
  return postParkingAction<ApiResponse>({ action: "getAdminRecords" });
}

function asRecord(value: unknown): ParkingApiRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as ParkingApiRecord;
}

export function extractRecord(response: ApiResponse): ParkingApiRecord | null {
  const candidates = [response.record, response.session, response.data];
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (record && !Array.isArray(candidate)) return record;
  }
  // Some scripts may return fields at top level
  if (response.code || response.token || response.building || response.floor) {
    return response as ParkingApiRecord;
  }
  return null;
}

export function extractRecords(response: ApiResponse): ParkingApiRecord[] {
  const candidates = [response.records, response.sessions, response.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is ParkingApiRecord => !!item && typeof item === "object");
    }
  }
  return [];
}

export function getRecordCode(record: ParkingApiRecord | null | undefined): string {
  if (!record) return "";
  const value = record.code ?? record.token;
  return typeof value === "string" ? value : "";
}

export function getRecordSlot(record: ParkingApiRecord): number | null {
  const value = record.slot ?? record.slotNumber;
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

export function getRecordStatus(record: ParkingApiRecord): "active" | "completed" | string {
  const raw = typeof record.status === "string" ? record.status.toLowerCase() : "";
  if (raw === "active" || raw === "completed") return raw;
  if (record.exitTime) return "completed";
  return raw || "active";
}

export function getActiveOccupiedSlots(
  records: readonly ParkingApiRecord[],
  buildingId: BuildingId,
  floor: Floor,
): Set<number> {
  const maxSlot = getBuilding(buildingId).slotsPerFloor;
  const occupied = new Set<number>();

  for (const record of records) {
    if (getRecordStatus(record) !== "active") continue;
    if (resolveBuildingId(record.building) !== buildingId) continue;

    const recordFloor =
      typeof record.floor === "string" ? record.floor.trim().toUpperCase() : "";
    if (recordFloor !== floor || !isFloorForBuilding(buildingId, recordFloor)) continue;

    const slot = getRecordSlot(record);
    if (slot !== null && Number.isInteger(slot) && slot >= 1 && slot <= maxSlot) {
      occupied.add(slot);
    }
  }

  return occupied;
}

export function getResponseMessage(response: ApiResponse, fallback: string): string {
  return typeof response.message === "string" && response.message.trim() ? response.message : fallback;
}

export function isSuccessResponse(response: ApiResponse): boolean {
  if (typeof response.success === "boolean") return response.success;
  // if script returns record/records without success flag, treat as success
  return !!(response.record || response.session || response.records || response.sessions || response.data !== undefined);
}
