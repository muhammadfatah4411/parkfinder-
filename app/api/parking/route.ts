import { NextResponse } from "next/server";
import { getBuilding, isBuildingId } from "@/lib/parking-data";

type ParkingAction = "saveParking" | "findParking" | "endParking" | "getAdminRecords";

type ActionPayload = {
  action?: unknown;
  building?: unknown;
  floor?: unknown;
  slotNumber?: unknown;
  token?: unknown;
};

const ALLOWED_ACTIONS: readonly ParkingAction[] = [
  "saveParking",
  "findParking",
  "endParking",
  "getAdminRecords",
];

function isAllowedAction(value: unknown): value is ParkingAction {
  return typeof value === "string" && ALLOWED_ACTIONS.some((action) => action === value);
}

function getAppsScriptUrl(): string {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    throw new Error("APPS_SCRIPT_URL is not configured.");
  }
  return url;
}

function buildForwardBody(payload: ActionPayload, action: ParkingAction): Record<string, unknown> {
  switch (action) {
    case "saveParking":
      return {
        action,
        building: isBuildingId(payload.building)
          ? getBuilding(payload.building).name
          : payload.building,
        floor: payload.floor,
        slotNumber: payload.slotNumber,
      };
    case "findParking":
    case "endParking":
      return {
        action,
        token: payload.token,
      };
    case "getAdminRecords":
      return { action };
  }
}

async function readUpstreamResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: text || "Unexpected response from Apps Script." };
  }
}

export async function POST(request: Request) {
  let payload: ActionPayload;
  try {
    payload = (await request.json()) as ActionPayload;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  if (!isAllowedAction(payload.action)) {
    return NextResponse.json(
      { success: false, message: "Invalid action." },
      { status: 400 },
    );
  }

  let appsScriptUrl: string;
  try {
    appsScriptUrl = getAppsScriptUrl();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server configuration error.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }

  const forwardBody = buildForwardBody(payload, payload.action);

  try {
    const upstream = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwardBody),
      cache: "no-store",
    });

    const data = await readUpstreamResponse(upstream);

    if (!upstream.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : "Apps Script request failed.";
      return NextResponse.json({ success: false, message, data }, { status: upstream.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach Apps Script.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
