export const BUILDING_IDS = ["business-park", "mall"] as const;

export const FLOORS = ["B1", "B2", "B3", "B4", "B5"] as const;

export type BuildingId = (typeof BUILDING_IDS)[number];
export type Floor = (typeof FLOORS)[number];

export type BuildingConfig = {
  id: BuildingId;
  name: string;
  shortName: string;
  floors: readonly Floor[];
  slotsPerFloor: number;
  description: string;
};

export const BUILDINGS: readonly BuildingConfig[] = [
  {
    id: "business-park",
    name: "Business Park",
    shortName: "BP",
    floors: ["B1", "B2", "B3", "B4", "B5"],
    slotsPerFloor: 50,
    description: "Five basement levels for business park visitors and tenants.",
  },
  {
    id: "mall",
    name: "Mall",
    shortName: "MALL",
    floors: ["B1", "B2", "B3"],
    slotsPerFloor: 50,
    description: "Three basement levels for mall shoppers and visitors.",
  },
];

export const SLOT_NUMBERS: readonly number[] = Array.from(
  { length: 50 },
  (_, index) => index + 1,
);

export const TOTAL_FLOORS = BUILDINGS.reduce(
  (total, building) => total + building.floors.length,
  0,
);

export const TOTAL_SLOTS = BUILDINGS.reduce(
  (total, building) => total + building.floors.length * building.slotsPerFloor,
  0,
);

export function isBuildingId(value: unknown): value is BuildingId {
  return (
    typeof value === "string" &&
    BUILDING_IDS.some((buildingId) => buildingId === value)
  );
}

export function resolveBuildingId(value: unknown): BuildingId | "" {
  if (isBuildingId(value)) return value;
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase().replace(/^hilite\s+/, "");
  const match = BUILDINGS.find(
    (item) =>
      item.name.toLowerCase() === normalized ||
      item.shortName.toLowerCase() === normalized ||
      item.id === normalized,
  );
  return match?.id ?? "";
}

export function getBuilding(id: BuildingId): BuildingConfig {
  const building = BUILDINGS.find((item) => item.id === id);
  if (!building) {
    throw new Error(`Unknown building: ${id}`);
  }
  return building;
}

export function getFloors(id: BuildingId): readonly Floor[] {
  return getBuilding(id).floors;
}

export function isFloorForBuilding(
  buildingId: BuildingId | "",
  value: unknown,
): value is Floor {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.toUpperCase();
  if (buildingId === "") {
    return FLOORS.some((floor) => floor === normalized);
  }
  return getFloors(buildingId).some((floor) => floor === normalized);
}

export function parseBuildingParam(
  value: string | string[] | undefined,
): BuildingId | "" {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toLowerCase();
  return isBuildingId(normalized) ? normalized : "";
}

export function parseFloorParam(
  value: string | string[] | undefined,
): Floor | "" {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toUpperCase();
  return isFloorForBuilding("", normalized) ? normalized : "";
}

export function createSaveUrl(building?: BuildingId, floor?: Floor): string {
  const params = new URLSearchParams();
  if (building) {
    params.set("building", building);
  }
  if (floor) {
    params.set("floor", floor);
  }
  const query = params.toString();
  return query ? `/save?${query}` : "/save";
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export type StatSession = {
  buildingId: BuildingId | "";
  floor: string;
  status: "active" | "completed";
  entryTime: string;
  exitTime: string | null;
};

export type ParkingStats = {
  totalCapacity: number;
  occupiedSlots: number;
  availableSlots: number;
  totalSessions: number;
  todayEntries: number;
  todayExits: number;
  occupancyPercentage: number;
};

export type OccupancyGroup = {
  id: string;
  label: string;
  detail: string;
  capacity: number;
  occupied: number;
  available: number;
  percentage: number;
};

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateKey(value: string | null | undefined): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateKey(date);
}

export function getTodayDateKey(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) return "";
  return formatDateKey(now);
}

function occupancyPercentage(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((occupied / capacity) * 100)));
}

function occupancyGroup(
  id: string,
  label: string,
  detail: string,
  capacity: number,
  occupied: number,
): OccupancyGroup {
  return {
    id,
    label,
    detail,
    capacity,
    occupied,
    available: Math.max(0, capacity - occupied),
    percentage: occupancyPercentage(occupied, capacity),
  };
}

export function calculateParkingStats(
  sessions: readonly StatSession[],
  todayKey: string,
): ParkingStats {
  const occupiedSlots = sessions.filter((session) => session.status === "active").length;
  const hasToday = todayKey.length > 0;

  return {
    totalCapacity: TOTAL_SLOTS,
    occupiedSlots,
    availableSlots: Math.max(0, TOTAL_SLOTS - occupiedSlots),
    totalSessions: sessions.length,
    todayEntries: hasToday
      ? sessions.filter((session) => getDateKey(session.entryTime) === todayKey).length
      : 0,
    todayExits: hasToday
      ? sessions.filter(
          (session) =>
            session.status === "completed" && getDateKey(session.exitTime) === todayKey,
        ).length
      : 0,
    occupancyPercentage: occupancyPercentage(occupiedSlots, TOTAL_SLOTS),
  };
}

export function getBuildingOccupancy(
  sessions: readonly StatSession[],
): OccupancyGroup[] {
  return BUILDINGS.map((building) => {
    const occupied = sessions.filter(
      (session) => session.buildingId === building.id && session.status === "active",
    ).length;

    return occupancyGroup(
      building.id,
      building.name,
      `${building.floors.length} floors · ${building.slotsPerFloor} slots each`,
      building.floors.length * building.slotsPerFloor,
      occupied,
    );
  });
}

export function getFloorOccupancy(
  sessions: readonly StatSession[],
): OccupancyGroup[] {
  return BUILDINGS.flatMap((building) =>
    building.floors.map((floor) => {
      const occupied = sessions.filter(
        (session) =>
          session.buildingId === building.id &&
          session.status === "active" &&
          session.floor.trim().toUpperCase() === floor,
      ).length;

      return occupancyGroup(
        `${building.id}-${floor}`,
        floor,
        building.name,
        building.slotsPerFloor,
        occupied,
      );
    }),
  );
}
