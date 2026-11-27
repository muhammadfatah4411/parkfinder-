# ParkFinder

A beginner-friendly parking locator for two buildings:

- **Business Park:** B1–B5, 50 slots per floor
- **Mall:** B1–B3, 50 slots per floor

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, and React 19.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other commands:

```bash
npm run lint
npm run build
npm start
```

## Pages

- `/` — Home with Save Parking and Find My Car actions
- `/save` — Save a parking session and receive a retrieval code
- `/find` — Look up a session by retrieval code and end parking
- `/admin` — Session statistics and session table
- `/qr` — Printable QR code for every basement floor

## QR code URLs

Each QR code points to the Save Parking page with prefilled query parameters:

```
/save?building=business-park&floor=B1
/save?building=mall&floor=B3
```

Accepted building values: `business-park`, `mall`.
Accepted floors: `B1`–`B5` for Business Park, `B1`–`B3` for Mall.

## Google Apps Script integration

The frontend calls a secure Next.js API route at `app/api/parking/route.ts`. The
route forwards requests server-side to the Google Apps Script Web App URL stored
in `.env.local` as `APPS_SCRIPT_URL`. The URL is never exposed to browser code.

Supported actions forwarded to Apps Script:

- `saveParking` with `building`, `floor`, and `slotNumber`
- `findParking` with `token`
- `endParking` with `token`
- `getAdminRecords` with no additional fields

## Environment setup

Create or edit `.env.local` in the project root:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Do not use `NEXT_PUBLIC_` for this value.

## Project structure

```
app/
  api/parking/route.ts      Server-side Apps Script proxy
  page.tsx                  Home
  save/                     Save Parking page and form
  find/                     Find My Car page and form
  admin/                    Admin dashboard
  qr/                       Floor QR codes
components/                 Header, footer, icons, and reusable UI
lib/
  parking-api.ts            Client helpers for parking API route
  parking-data.ts           Buildings, floors, slots, helpers
```
