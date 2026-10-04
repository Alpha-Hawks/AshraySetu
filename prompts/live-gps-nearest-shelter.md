# AshraySetu: Live GPS, Nearest Safe Shelter, and Directions

## 1. Role and mission

You are a senior full-stack engineer who specializes in offline-first web apps, Leaflet mapping and privacy-preserving geolocation. You are working in the AshraySetu repository at `C:\PROJECTSS\DISASTER`. The Next.js 14.2 App Router frontend is in `frontend/`. The Express 4 backend is in `backend/`; it uses ESM (`"type": "module"`) and `dotenv`.

Add a consent-first feature to the shelter map. After the visitor explicitly allows it, the feature must:
- Show the device's live location.
- Pick the nearest government-confirmed shelter in AshraySetu's list that this device's data shows as open with free space.
- Guide the visitor there. When online, use road directions. When offline, use a straight-line guide that is clearly labeled as approximate.

The owner confirms that every shelter in AshraySetu's list is an officially confirmed safe shelter, confirmed by the government. Treat the list's names, locations and safe-shelter designation as authoritative. That confirmation does not make live occupancy or the in-charge phone numbers real (see 2.2 facts 7 and 8).

Build the request as "each visitor sees their own location". The location belongs to the visitor and is shown only to them. It stays on their device. The one exception is a minimal routing request that the visitor approves separately. Do not build any way for the site owner to track visitors.

People will use this during a cyclone. They will be under stress, on low-end phones, often on 2G. In priority order, the feature must get these right before visual polish: correctness, honesty about uncertainty, clarity, privacy and battery life. Never present a shelter as safer, closer or more available than the data supports.

## 2. Codebase context

Line numbers below come from the current working copy and may drift. Treat them as pointers and re-read the files. `frontend/app/(field)/map/page.tsx`, `frontend/components/map/LeafletMapCore.tsx` and `scan/page.tsx` contain uncommitted edits that are still in progress. Build on top of them. Never revert, stash, reset, checkout or commit.

### 2.1 Read these files completely before writing any code

| File | What matters |
|---|---|
| `frontend/app/(field)/map/page.tsx` | `MapPage` (client). State is at :47-64. `userLocation` is at :50-52 and defaults to `[20.5214, 86.8523]` ("near Batighar"). The one-time Dexie load is at :66-73. The `languageChanged` listener is at :75-81. `updateNearest` is at :84-97. Region presets at :99-119 also set `userLocation`. `handleSelectLocation` is at :127-141. `displayedShelters` is at :149-152. The header card ends at :218. The map box is `h-[480px] ... glass-l2 ... relative` at :221. The legend at :231-248 is `absolute bottom-3 left-3 z-[1000] glass-l2 pointer-events-none` (see 2.3: it renders out of place). The map block ends at :250 and the shelter details panel starts at :252. "Spots remaining" is at :342. The text "State EOC Helpline: 1070 / 1077" is at :381. The Google link is at :388-397. |
| `frontend/components/map/LeafletMapCore.tsx` | Remote PNG marker icons are at :18-56. Props are at :58-65. `LocationPicker` is at :67-78. `MapRecenter` (:80-86) calls `setView(coords, zoom \|\| map.getZoom())` with deps `[coords, zoom]`. `MapSelectedFocus` is at :88-100. `MapGenieResize` is at :102-122. The surge GeoJSON is at :132 and :157-165. `MapContainer` is at :140-145, with `scrollWheelZoom` at :143. The OSM `TileLayer` is at :146-149. The red query marker is at :167-179. Shelter markers are at :182-251. |
| `frontend/lib/geo/turfCalculations.ts` | Imports `@turf/turf`, plus `import type` from `@/lib/db/dexie`. `calculateDistanceToShelter` is at :7-15 and rounds to 0.1 km. `findNearestShelters` is at :20-33 and applies no safety filter. `generateSurgeInundationZone` is at :38-56. |
| `frontend/lib/db/dexie.ts` | `Shelter` is at :3-19 and has no updated-at field. Schema v2/v3 is at :147-157: `households` indexes `shelter_id` and `registered_at`; `admissions` indexes `shelter_id` and `admitted_at`. `db` is at :161. Seeds are at :164 (13 Odisha) and :389 (12 AP). `LIVE_SHELTER_FIELDS` is at :600. `initializeDatabase()` is at :606-614. Demo households are seeded at about :690-750, with ids containing `-demo-` (for example `c4b1-demo-household-01` for `OD-KEN-RAJ-001`). |
| `frontend/app/layout.tsx` | Viewport `maximumScale: 1, userScalable: false` is at :16-17. `Header` is at :52, the route child at :54-61 and `MacWindowOverlay` at :63. These are siblings in one `relative z-10` wrapper. The footer reads "Government of Odisha & District Disaster Management Authority, Kendrapara". |
| `frontend/lib/window/MacWindowManager.tsx`, `frontend/components/window/MacWindowOverlay.tsx` | The window system. `/map` is registered at Manager :35 and `/scan` at :34. Tapping the active dock icon toggles the window closed (:163-166). A direct visit auto-opens the window (:209-222). Esc-to-close is at Manager :243-259 and Overlay :217-233. `role="dialog"` is at Overlay :252. The overlay is `fixed inset-0 z-[9999]` at :255, with a full-screen backdrop that closes on click at :258-266. `glass-l2` is applied to the window at :275. Window height is `h-[calc(100vh-6.5rem)]` at :279. The header row is at :284 and the scroll area (`pt-4 ... pb-32`) at :335. |
| `frontend/components/common/Header.tsx` | Fixed at z-50 (:203). The mount effect at :37-77 writes `--app-header-height` (:57). The language cycle is at :79-88. Flight Mode is the local state `isSimulatedOffline` (`useState(false)`, :26), toggled by `toggleAirplaneMode` (:90-99). |
| `frontend/components/common/UserSessionTracker.tsx`, `backend/server.js` | The presence heartbeat is at Tracker :49-65 (every 15 s) and backend :1298. `logActivityEvent` (server :251-283) broadcasts to admins over SSE and writes to a git-tracked JSON file. CORS reflects any origin (:18-23). The global `app.use(express.json())` is at :24. `trust proxy` is never set. `/api/qr/scan` is handled at :1132 and written to `data/qr_scans.json` (:96). |
| `frontend/app/(field)/scan/page.tsx` | This is the staff gate scanner ("Optical QR Scanner • Real-time Headcount Admission Ledger", :1698). It POSTs the pass to `/api/qr/scan` (:1145-1159) and sets occupancy and `SATURATED` on admission (:1320-1323). Evacuees must never be sent here. |
| `frontend/lib/locales/translations.ts` | `Language` is at :1. `en` is at :4-81, `or` at :82-159 and `te` at :160-237. The object is untyped, so every key must exist in all three languages or the code will not type-check. There is no existing `{placeholder}` convention. |
| `frontend/lib/sync/syncManager.ts` | `SyncState` is at :3. `navigator.onLine` and the online/offline events are at :14-16. |
| `frontend/next.config.mjs`, `vercel.json`, `frontend/playwright.config.ts`, `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tailwind.config.ts` | Platform, routing and test setup. `tsconfig` sets `allowImportingTsExtensions` and maps `@/*`. |
| `frontend/app/globals.css` | `@tailwind` directives are at :1-3, and no `@layer` is used. Glass classes: `glass-l1` at :573-592 (hover `translateY(-1px)` at :583-588), `glass-l2` at :595-645, `glass-l3` at :685-702, `glass-header-panel` at :817-850. `--glass-radius-panel: 40px` is at :536. The reduced-transparency block (:340-350) covers only `.lg-*`. Leaflet sizing is at :23-30. |

### 2.2 Facts you must design around

1. **No geolocation, routing or polyline code exists.** Nothing in `app`, `components`, `lib` or `genie` uses `geolocation`, `watchPosition`, `navigator.permissions`, `Polyline` or any routing engine. No routing library is installed.
2. **`userLocation` is not GPS.** It is the click-to-query point plus the region preset, shown by the red "Field Volunteer / Query Location" marker. Keep it unchanged. GPS needs its own state, otherwise map clicks and region buttons will overwrite the live fix.
3. **`MapPage` can mount twice.**
   - A direct visit to `/map` renders it once as the route child and again in the auto-opened window.
   - Opening `/map` from the dock renders only the window copy.
   - Each copy has its own Leaflet map.
   - A naive hook would create two `watchPosition` subscriptions and duplicate routing calls, so location and navigation state must be module-level singletons.
4. **`reactStrictMode: true`** (`next.config.mjs` :3) runs every effect twice in development. Cleanup must be exact.
5. **The existing camera code fights live updates.**
   - `MapRecenter` calls `setView` on every `userCoords` change. Because `zoom` is the page's `mapZoom`, every map tap also resets the zoom to the region preset (7, 9 or 10).
   - `selectedCoords` (:135-137) is a new array on every render, so `MapSelectedFocus` re-pans on every re-render.
   - The surge buffer is recomputed on every render (:132).
6. **Shelters come only from Dexie, read once on mount.** The frontend never calls `/api/shelters`. `dexie` ^4 exports `liveQuery`. `dexie-react-hooks` is not installed; do not add it.
7. **`status` and occupancy are unreliable.**
   - Intake raises `current_occupancy` without saturating (`intake/page.tsx` :410-415).
   - Only a QR admission sets `SATURATED` (`scan/page.tsx` :1320-1323). Reverting an admission never resets it (:1557-1564).
   - `STANDBY` and `DAMAGED` are never set anywhere.
   - In the seed data, 24 shelters are `ACTIVE`. `OD-KEN-MAH-005` (Hukitola) is `SATURATED` at 395/400.
   - Sync is effectively inert. On a visitor's own phone, occupancy is shipped sample data unless that device recorded intake or admissions.
   - The shelter list itself (names, locations and safe-shelter designation) is government-confirmed. That covers which places are safe shelters, not how full they are right now.
8. **Seed phone numbers are placeholders.** Every `incharge_phone` is sequential: 9861234501–513 and 9440123401–412. Each one is still a valid Indian mobile number format, so dialing them could reach a stranger. Government confirmation of the shelters does not make these numbers real: keep them hidden until the owner replaces them with the official numbers.
9. **Offline gaps.** OSM tiles and every marker PNG (raw.githubusercontent and unpkg) need the network. There is no service worker and no tile cache. Anything new that must render offline cannot use remote images, and its JS must already be loaded (see 6.6).
10. **Flight Mode is cosmetic.** It is local state in `Header.tsx` that no other component can read, and it resets to off on reload.
11. **API routing.**
    - `vercel.json` rewrites `/api/(.*)` to the Express backend service.
    - `next.config.mjs` rewrites `/api/*` to `http://localhost:5000` when not on Vercel. The Next proxy adds `x-forwarded-host` but no `x-forwarded-for`.
    - There is no `app/api/` directory.
    - The routing proxy therefore belongs in Express. Verify this by reading both files. If what you find contradicts it, stop and report.
12. **Telemetry leak risk.** None of these may ever receive coordinates: the heartbeat, `logActivityEvent`, the SSE admin stream, `backend/data/activity_log.json` (git-tracked), `qr_scans.json`, or the sync batch.
13. **Geolocation needs a secure context.**
    - HTTPS (Vercel) and `localhost` work. A phone opening `http://<LAN-IP>:3000` gets PERMISSION_DENIED.
    - No `Permissions-Policy` header exists today, and the QR scanner needs `camera`.
    - In-app browsers (Facebook, Instagram, Android WebView) often expose `navigator.geolocation` but never call back.
14. **Coverage.**
    - AshraySetu lists 25 government-confirmed shelters, covering latitude 14.01–21.47 N and longitude 80.12–87.01 E on the Odisha and AP coasts.
    - Odisha alone has 800+ multipurpose cyclone shelters (`app/odisha/history/page.tsx` :101). The 25 listed are confirmed, but they are not every official shelter, so another official shelter that is not in AshraySetu may be closer.
    - The closest pair of listed shelters is 7.9 km apart.
15. **The surge polygon is synthetic.**
    - It buffers the coastline between Dhamra and False Point (Kendrapara) by 4.55 km. It has no AP coverage and an area of about 600 km².
    - `OD-KEN-RAJ-001` (Batighar), `OD-KEN-RAJ-002` (Talachua) and Hukitola lie inside it.
    - The default query point 20.5214, 86.8523 is also inside, and its nearest shelter (RAJ-001, 4.5 km away) is inside too.
    - That is expected: coastal cyclone shelters are built in surge-prone areas. Never use this synthetic polygon to exclude, penalize or down-rank a government-confirmed shelter. Use it only to warn about the journey (FR-D7) and about when to travel (5.5).
16. **Window constraints.**
    - `position: fixed` inside `MapPage` resolves against the window, not the viewport, because of the window's backdrop-filter and transform.
    - Map overlays must stay inside the map box at `z-index` ≤ 1000. Leaflet panes are 200–700 and controls 800/1000. The window is 9999 and the dock 10001.
    - Esc closes the window, so do not bind Esc in new panels.
    - The window zoom toggle resizes without firing a window `resize` event.
    - While the window is open, the backdrop covers the Header and closes the window on click. Language and Flight Mode cannot be changed without closing the window.
    - On a 360×640 phone, the window's scroll viewport is about 467 px tall, which is shorter than the 480 px map.
17. **Tailwind animation classes do nothing.** `animate-in fade-in slide-in-from-*` are no-ops because `tailwind.config.ts` has `plugins: []`. Use `framer-motion`.

### 2.3 Conventions to reuse

- **Glass:** reuse only the existing classes. Never create a new glass style.
  - Use `glass-l2` for panels and cards, `glass-l1` for chips, pills and buttons, and `glass-l3` for icon tiles. Use `cn()` from `frontend/lib/utils.ts`.
  - The glass classes are unlayered and come after `@tailwind utilities`. Each one sets `position: relative` (globals.css :574/:596/:686), which overrides Tailwind's `absolute`, `fixed` and `sticky`.
    - Never put a positioning utility on the same element as a `glass-l*` class.
    - Put the position on a plain wrapper, for example `<div className="absolute top-3 left-14 right-[72px] z-[1000]"><button className="glass-l1 ...">`, or use `!absolute`.
  - `glass-l2` forces `border-radius: 40px` (:610), so the existing `rounded-[28px] glass-l2` cards actually render at 40px. Match that rendered look and do not force a different radius.
- **Accent colours:**
  - `#007AFF` is the primary (hover `#0062cc`), used for the live device and the route.
  - Emerald is for safe, capacity and distance, and for the target ring.
  - Rose stays the query point. Sky and amber stay the region colours.
- **Icons:** `lucide-react` 0.395.0. These are confirmed available: `LocateFixed`, `Locate`, `LocateOff`, `Navigation2`, `Route`, `Footprints`, `Car`, `ShieldCheck`, `Navigation`, `Crosshair`, `AlertTriangle`. Check `node_modules/lucide-react` before using any other icon.
- **Motion:** use `framer-motion` (already installed), gated by `useReducedMotion()`.
- **i18n:**
  - Read `localStorage["ashraysetu_lang"]` and listen for the window `languageChanged` event, as `page.tsx` :75-81 does. Use `t = translations[lang]`.
  - Add every new key to `en`, `or` and `te`, prefixed `liveLoc`.
  - Interpolate with a small local `fmt(str, vars)` helper using `{name}` placeholders.
  - Format numbers with `Intl.NumberFormat` using `en-IN`, `or-IN` or `te-IN`.
  - Do not localize unrelated strings already on the page.
- **Do not add dependencies.** In particular: no `leaflet-routing-machine`, `dexie-react-hooks`, routing SDKs, test runners, ESLint packages, or rate-limit or cache libraries. Turf 6.5.0, react-leaflet 4.2.1 and Leaflet 1.9.4 are enough.
- **Coordinate order.** Leaflet uses `[lat, lng]`. Turf, GeoJSON, OSRM and ORS use `[lng, lat]`. Convert only at boundaries, through the typed helpers `toLngLat()` and `toLatLng()`.

## 3. User story and scope

### 3.1 End-to-end experience

1. **Opening the map.** A visitor opens the map from the dock or at `/map`. Above the map, a card reads "Find your nearest safe shelter". It warns them not to go outside if the storm has already started, and explains why location is needed. No browser prompt appears yet.
2. **Granting permission.** They tap "Show my location". The browser asks for permission and they allow it.
3. **First fix.** The first fix usually arrives within seconds; without mobile data it can take 1–2 minutes outdoors. "Pick a point on the map instead" stays available while the device is locating.
   - A blue dot appears with an accuracy circle. It is labeled approximate until accuracy is 100 m or better.
   - The map centres on the dot and follows it.
4. **Target shelter.** The app picks the nearest eligible government-confirmed shelter and draws an emerald ring around it. The card shows:
   - name, location and a "Government-confirmed shelter" badge;
   - available space, or "not live" when the figure is sample data;
   - distance and time;
   - a note that other official shelters not in AshraySetu may also be nearby;
   - two alternatives.

   If the fix is too imprecise to tell which shelter is nearest, the app shows the top 3 as equal choices instead.
5. **Directions.** The visitor chooses Walk (the default) or Drive.
   - If online, they can tap "Get road directions". A one-line disclosure appears; on confirmation, a road route with turn-by-turn steps is drawn.
   - If offline, or if they decline, they get a dashed straight line with distance, bearing and a compass arrow, labeled approximate.
6. **Moving.** The dot, remaining distance and time update as they move. If they leave the route, the app reroutes after a short delay.
   - **Before they set off:** a better shelter, or a target that fills up, switches automatically and is announced.
   - **After they set off:** a target that fills up still switches (announced, with a vibration). A merely better shelter is offered as a one-tap card instead.
7. **Arrival.** Navigation ends and the app tells them to show their family's QR pass to the volunteer at the gate.
8. **Always available.** At any time they can pause or stop tracking, pin a shelter, open the route in Google or Apple Maps, or call 112/1070/1077. They can call the shelter in-charge only once the owner has verified the numbers.

### 3.2 Non-goals (do not build)

- Background tracking while the tab is hidden or closed.
- Sharing location with admins, family or the backend. Any owner-side view of visitor locations. Location history of any kind.
- Persistent (cross-session) storage of coordinates or routes. The route cache is in memory for the session only.
- Offline basemap tiles, PMTiles or service workers. Replacing the existing remote marker PNGs.
- Voice guidance, and the Chrome `<geolocation>` HTML element.
- Opening `/scan` or `/intake` from this feature.
- Changing the existing query-point flow, the "nearest 3" grid, the existing Google link, the region toggle semantics, or shelter status logic in scan or intake. The single exception is the FR-U2 zoom fix.
- Fixing the sync `reconciled` index bug, wiring `/api/shelters` into the frontend, and changing the root viewport.
- Hazard-aware routing beyond FR-D7.

## 4. Functional requirements

Put every frontend threshold in one file, `frontend/lib/geo/navConfig.ts`, as named constants. Defaults:

```ts
// Owner-only flags
SHELTERS_GOV_CONFIRMED = true      // owner-confirmed: every listed shelter is an officially confirmed safe shelter
OCCUPANCY_IS_LIVE = false          // true only when occupancy/status reach visitors' phones from an official live feed
INCHARGE_PHONES_VERIFIED = false   // true only after the owner replaces the placeholder incharge_phone values with official numbers
// Eligibility and ranking
TREAT_STANDBY_AS_OPEN = true; MIN_FREE_BEDS = 1; NEARLY_FULL_RATIO = 0.10
SHORTLIST_K = 5; COVERAGE_WARN_KM = 50; MAX_ROUTABLE_KM = 100; MAX_WALK_ADVISE_KM = 3
TIE_WINDOW = { ratio: 0.05, durationS: 30, distanceM: 50 }
SWITCH_ROUTED = { ratio: 0.20, durationS: 120 }; SWITCH_STRAIGHT = { ratio: 0.20, distanceM: 250 }
REEVAL_MIN_INTERVAL_MS = 60_000; REEVAL_MIN_MOVE_M = 100
// Geolocation
GEO_FIRST_FIX = { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 }
GEO_RESUME    = { enableHighAccuracy: false, maximumAge: 30_000,  timeout: 8_000 }
GEO_NAVIGATE  = { enableHighAccuracy: true,  maximumAge: 5_000,   timeout: 20_000 }
GEO_LOW_POWER = { enableHighAccuracy: false, maximumAge: 30_000,  timeout: 30_000 }
GEO_WATCHDOG_EXTRA_MS = 5_000
COMMIT_MIN_INTERVAL_MS = 1_000; COMMIT_MIN_MOVE_M = 5; COMMIT_ACCURACY_CHANGE = 0.20; COMMIT_MAX_SILENCE_MS = 15_000
ACCURACY_APPROX_M = 100; ACCURACY_NAV_MAX_M = 75; ACCURACY_LOW_WARN_M = 1_000
STALE_FIX_WARN_S = 30; STALE_FIX_GREY_S = 120; AGE_LABEL_REFRESH_MS = 10_000
HEADING_MIN_SPEED_MPS = 0.5; HEADING_MIN_MOVE_M = 10
FOLLOW_DEADZONE_RATIO = 0.25; FOLLOW_PAN_MIN_INTERVAL_MS = 3_000; STATE_RETAIN_MS = 600_000
// Navigation
OFF_ROUTE = { accuracyFactor: 1.5, minM: 35, maxM: 150, consecutiveFixes: 3, minDurationMs: 10_000 }
REROUTE_MIN_INTERVAL_MS = 30_000; REROUTE_BACKOFF_MS = [30_000, 60_000, 120_000, 300_000]; AUTO_ROUTE_DEBOUNCE_MS = 5_000
ARRIVAL = { minRadiusM: 30, consecutiveFixes: 2, undoWindowMs: 300_000 }
CACHED_ROUTE_CORRIDOR_M = 200; SNAP_SEGMENT_MIN_M = 20; SNAP_WARN_M = 1_000
WALK_SPEED_KMH = 3.0; PROVIDER_FOOT_KMH = 5
CLIENT_ROUTE_TIMEOUT_MS = 8_000; ROUTE_CACHE_TTL_MS = 900_000; ORIGIN_ROUND_DP = 4
```

Measure every age, staleness and duration window with `receivedAt` (FR-T3), never with `Date.now()` against `position.timestamp`.

### 4.1 Consent-first location permission

- **FR-P1. Pre-checks.** Run these on mount. None of them may prompt.
  - If `window.isSecureContext === false`, show the insecure-context state ("Location needs a secure (https) connection") and never call the API.
  - If `'geolocation' in navigator` is false, show the unsupported state.
  - If the user agent matches `/FBAN|FBAV|Instagram|Line\/|; wv\)/`, show above the button: "Location may not work inside this app. Open this page in Chrome or Safari." Add a "Copy link" button that copies the URL without query parameters.
  - Otherwise call `navigator.permissions?.query({ name: 'geolocation' })` inside try/catch. If it throws or does not exist, treat the state as `prompt`.
- **FR-P2. Never request on page load.** The first `getCurrentPosition` or `watchPosition` call must come from a tap handler. The only exception is auto-resume (FR-P4).
- **FR-P3. `prompt` state.** Show the consent card above the map (FR-U4).
  - Title: "Find your nearest safe shelter".
  - Directly under the title: the storm warning from 5.5.
  - Body: "AshraySetu uses this device's location to show where you are, the nearest government-confirmed shelter, and the way there. AshraySetu does not save your location or send it to its staff. Map images load from OpenStreetMap, which can see the area shown on the map and your internet address."
  - Primary button (48 px or taller): "Show my location".
  - Secondary button: "Pick a point on the map instead". It scrolls to the map and explains that tapping the map sets a point (the existing query-point flow).
- **FR-P4. `granted` state.**
  - Auto-start only if `sessionStorage["ashraysetu_live_location"] === "on"`. Set this flag when tracking starts and remove it on Stop.
  - Otherwise show a one-tap "Show my location" button.
  - Never store coordinates in any storage.
- **FR-P5. `denied` state (or error code 1).**
  - Call `clearWatch`.
  - Show a `role="alert"` card above the map. Give each recovery step one line and an icon, in en, or and te:
    - **Android (Chrome):**
      1. Turn on Location in quick settings.
      2. Tap the icon left of the web address → Permissions (or Site settings) → Location → Allow.
      3. If it is still blocked: Settings → Apps → Chrome → Permissions → Location → Allow only while using the app.
    - **iPhone (Safari):**
      1. Settings → Privacy & Security → Location Services → On. Then Safari Websites → While Using the App, with Precise Location on.
      2. In Safari, tap "aA" (or the page menu) → Website Settings → Location → Allow.
  - "Try again" re-queries the permission. If it is no longer `denied`, it calls `getCurrentPosition` from that tap.
  - **Manual fallback:**
    - Keep a `manualPointChosen` flag. It becomes true only inside `handleSelectLocation` (a real map tap) after the fallback is offered. The default `userLocation` and region presets never set it.
    - Until it is true, show "Tap the map where you are now", with no target, distance or route.
    - Once it is true, run the engine from that point. Label it "From the point you tapped (not your live location)". Do not track.
- **FR-P6. React to permission changes.** Subscribe to `PermissionStatus` `change`, and re-query when `visibilitychange` reports the page visible (Safari may not fire `change`).

### 4.2 Live tracking

- **FR-T1. Single watcher.** Implement `frontend/lib/geo/liveLocationStore.ts` as a module-level singleton with ref-counted subscribers. Consume it through `useSyncExternalStore` in `frontend/lib/geo/useLiveLocation.ts`.
  - Exactly one `watchPosition` may be active, however many `MapPage` instances are mounted and whatever StrictMode does. Keep the watch id in the store.
  - When the refcount reaches 0:
    - call `clearWatch` and clear the fix;
    - keep the target, pin, profile and last route in memory for `STATE_RETAIN_MS`;
    - a remount within that window restores them, and resumes tracking if the session flag is on.
  - All `navigator` access must sit inside effects or actions. `getServerSnapshot` returns the idle state, because the route copy is server-rendered.
- **FR-T2. Fix phases.**
  1. On start, call `getCurrentPosition(GEO_FIRST_FIX)`, then `watchPosition(GEO_NAVIGATE)`.
  2. Switch to `GEO_LOW_POWER` (`clearWatch`, then a new watch) after arrival or when Battery saver is on.
  3. While accuracy is above `ACCURACY_APPROX_M`, label the fix "Approximate location".
- **FR-T3. Fix model.** Each fix is `{ lat, lng, accuracyM, headingDeg|null, speedMps|null, timestamp, receivedAt, approximate }`, where `receivedAt = performance.now()` in the success callback.
  - Use `timestamp` only to drop out-of-order fixes: drop any fix whose timestamp is older than or equal to the last accepted one.
  - Keep `lastReceivedAt` in the store.
  - Commit to React state at most once per `COMMIT_MIN_INTERVAL_MS`, and only when one of these holds:
    - (a) the position moved `COMMIT_MIN_MOVE_M` or more;
    - (b) accuracy changed by `COMMIT_ACCURACY_CHANGE` or more, in either direction;
    - (c) `COMMIT_MAX_SILENCE_MS` has passed since the last commit.
- **FR-T4. Accuracy.**
  - Always draw an accuracy circle with radius `accuracyM`.
  - Only fixes with accuracy at or below `ACCURACY_NAV_MAX_M` may drive off-route, arrival, progress and re-evaluation movement decisions.
  - Above `ACCURACY_LOW_WARN_M`, show a banner: "Your location is approximate (±X km)", plus the iOS Precise Location tip.
- **FR-T5. Heading.**
  - Use `coords.heading` when it is non-null and `speed` is at least `HEADING_MIN_SPEED_MPS`.
  - Otherwise use `turf.bearing(prev, cur)` once the device has moved `HEADING_MIN_MOVE_M` or more between qualifying fixes.
  - Otherwise draw no heading cone.
- **FR-T6. Follow-me.**
  - `follow` defaults to on at the first fix. On that fix, call `setView` once to zoom `max(currentZoom, 15)`.
  - While following, pan only when the dot leaves the central area (the map box inset by `FOLLOW_DEADZONE_RATIO` on each side). Then re-centre it, at most once per `FOLLOW_PAN_MIN_INTERVAL_MS`. Animate unless reduced motion or Battery saver is on. Battery saver also caps zoom at 15.
  - Mark the controller's own camera moves with a ref flag that clears on `moveend`. Any `movestart` or `zoomstart` without that flag sets `follow = false`. That covers drag, pinch, the zoom buttons, region change, map click and shelter selection.
  - Recenter sets `follow = true` and centres immediately.
- **FR-T7. Pause and Stop.**
  - Pause calls `clearWatch` and keeps the last fix, shown grey with an age label ("Last seen 2 min ago").
  - Resume re-runs FR-T2.
  - Stop calls `clearWatch`, clears the fix, target and route, releases the wake lock and removes the session flag.
- **FR-T8. Visibility and lifecycle.**
  - When the page becomes hidden, call `clearWatch`, release the wake lock and remember `resumeOnVisible`.
  - When it becomes visible again, call `getCurrentPosition(GEO_RESUME)` and restart the watch.
  - Compute staleness from `lastReceivedAt`. Show the age after `STALE_FIX_WARN_S` and grey the dot after `STALE_FIX_GREY_S`.
- **FR-T9. Errors.**
  - **Code 1:** handle as in FR-P5.
  - **Code 2:** keep watching and show "Location is off or there is no signal. Turn on Location/GPS."
  - **Code 3:** keep watching and show "Searching for GPS… this can take 1–2 minutes. Stay outdoors or near a window." Show "Pick a point on the map instead" from the start of the locating state.
  - **Watchdog:** if neither success nor error arrives within `timeout + GEO_WATCHDOG_EXTRA_MS` of a call, treat it as code 3.
  - Verify on iOS that the watch survives a TIMEOUT. If it does not, restart it.

### 4.3 Nearest safe shelter

- **FR-S1. Eligibility.** Implement this as a pure function in `frontend/lib/geo/safeShelter.ts`:
  ```
  eligible(s) =
    finite(s.latitude) && finite(s.longitude) && |lat| ≤ 90 && |lng| ≤ 180
    && (s.status === 'ACTIVE' || (TREAT_STANDBY_AS_OPEN && s.status === 'STANDBY'))   // SATURATED, DAMAGED excluded
    && s.capacity_persons > 0
    && (s.capacity_persons - s.current_occupancy) >= MIN_FREE_BEDS                     // guards the intake gap
  ```
  Derived flags:
  - `freeBeds`.
  - `nearlyFull`: `freeBeds / capacity_persons < NEARLY_FULL_RATIO`.
  - `inSurgeZone`: `turf.booleanPointInPolygon` against `generateSurgeInundationZone(3.5)`, memoized at module level. It is informational only.

  Surge-zone shelters:
  - Every listed shelter is government-confirmed as safe, so `inSurgeZone` never excludes, penalizes or down-ranks a shelter.
  - Show an informational badge: "Government-confirmed cyclone shelter in a modeled storm-surge area. Go early, before the storm arrives."

  An eligible `STANDBY` shelter shows "Standby: may not be open yet. Call 1070 before going."
- **FR-S1a. Availability provenance.**
  - For each shelter, compute `lastLocalChangeAt` as the newest `admitted_at` (`db.admissions`) or `registered_at` (`db.households`) for that `shelter_id`. Ignore seeded demo rows, whose ids contain `-demo-`. Both indexes already exist, so no schema change is needed.
  - **No such row:** the record is shipped sample data. Instead of a bed count, show "Space: not live. Sample data shipped with the app. Holds about {capacity} people." Phrase seed-based ineligibility as "Reported full (sample data)".
  - **Otherwise:** show "Free beds: {n} · updated on this device {relative time}".
  - Eligibility still uses the stored values.
  - While `OCCUPANCY_IS_LIVE` is false, the panel header reads: "Shelters are government-confirmed. Free space shown here is not live: call 1070 to check before you travel."
- **FR-S2. Data.**
  - The navigation store calls `initializeDatabase()`.
  - It subscribes to one `liveQuery` that returns the shelters plus the FR-S1a provenance, and unsubscribes when the refcount reaches 0.
  - Ranking always uses all shelters and ignores the region toggle.
- **FR-S3. Stage 1 (offline, always).**
  - Compute `turf.distance` to every eligible shelter.
  - Sort on raw values and round only for display.
  - The shortlist is the `SHORTLIST_K` nearest.
- **FR-S3a. Imprecise fix.**
  - Trigger: `accuracyM > ACCURACY_NAV_MAX_M` and `accuracyM ≥ (d2 − d1)`, where d1 and d2 are the distances to the two nearest candidates.
  - Then show the top 3 as equal choices under "Your location is approximate (±{accuracy}). One of these is nearest:" and offer "Pick your point on the map".
  - In this state, announce no single target and request no matrix or route.
  - Return to single-target mode on the first fix within `ACCURACY_NAV_MAX_M`.
- **FR-S4. Stage 2 (online and routing opted in).**
  - Make one matrix call: 1 origin × K destinations for the active profile.
  - Rank by `durationS`.
  - Null or unreachable durations rank after reachable ones, ordered by straight-line distance.
  - If the matrix call fails, use the Stage 1 order.
- **FR-S5. Tie-breaks.**
  - Judge ties only against the best candidate (the minimum metric). The tie group is every candidate whose metric is ≤ best × 1.05, or ≤ best + 30 s (routed) or + 50 m (straight-line).
  - Sort the tie group by:
    1. more `freeBeds`
    2. `has_solar_backup`
    3. `has_borewell`
    4. `id` ascending
  - All other candidates follow in raw-metric order. The result must be deterministic.
- **FR-S6. Hysteresis.**
  - **Triggers.** Re-evaluate only on:
    - the first fix;
    - moving ≥ `max(REEVAL_MIN_MOVE_M, 2 × accuracyM)` since the last evaluation, measured only between qualifying fixes;
    - `REEVAL_MIN_INTERVAL_MS` elapsed, checked only when a fix arrives (no timer);
    - a profile change;
    - an online/offline change;
    - the current target becoming ineligible;
    - an unpin.
  - **Matrix cadence.**
    - Only these triggers may send a new matrix call: the first fix, the movement trigger, a profile change, coming back online with opt-in, the target becoming ineligible, or an unpin.
    - Matrix-sending evaluations must be at least `REEVAL_MIN_INTERVAL_MS` apart. Profile change, ineligible target, unpin and coming back online are exempt.
    - Every other evaluation re-ranks with Stage 1 and the last matrix result.
  - **Switch rule.** Switch from the current target C to the best candidate B only if one of these holds:
    - C is no longer eligible;
    - routed: `B.durationS ≤ 0.8 × C.durationS` or `C.durationS − B.durationS ≥ 120`;
    - straight-line: `B.distanceM ≤ 0.8 × C.distanceM` or `C.distanceM − B.distanceM ≥ 250`.

    Never compare a routed metric with a straight-line one; if either is missing, fall back to straight-line for both.
  - **Departure.**
    - Before departure (the device is within `REEVAL_MIN_MOVE_M` of where guidance to C started), a qualifying switch is automatic.
    - After departure, switch automatically only if C becomes ineligible. Otherwise show a persistent card: "A nearer shelter is available: {name}, {distance}, about {time}. [Switch] [Keep going to {current}]". Keep C until the user taps.
    - Call `navigator.vibrate?.(200)` once when that card appears or when C becomes ineligible.
    - Announce every switch (section 7.3).
- **FR-S7. Pin.**
  - The user can pin any listed shelter. A pinned target never switches automatically.
  - If a pinned shelter becomes ineligible, show "{name} is now full or unavailable. Switch to {best}?" with a one-tap switch.
- **FR-S8. Alternatives.**
  - List the next 2 eligible shelters with distance, time and space (per FR-S1a). Tapping one pins it.
  - If the nearest ineligible shelter is at least 2 km closer than the target and at most half its distance, show: "{name} is nearer ({distance}) but reported {Full|Damaged|Standby}. If conditions are dangerous, a nearer strong building is safer than a long journey. Call 1070 to check." Never auto-target it. Route to it only if the user pins it.
- **FR-S9. Empty and coverage states.**
  - **No eligible shelter:** show "No shelter with free space found in AshraySetu data." List the 3 nearest ineligible shelters, each with a reason badge (Full, Damaged, Standby). Add a `tel:` link to `incharge_phone` only when `INCHARGE_PHONES_VERIFIED` is true (otherwise `tel:1070`), plus the helpline row from 5.5.
  - **Nearest eligible beyond `COVERAGE_WARN_KM`:** show "You are outside AshraySetu's coverage area (coastal Odisha and Andhra Pradesh)". Still show the nearest shelter and its distance.
  - **Beyond `MAX_ROUTABLE_KM`:** make no in-app routing request. Offer only the external Maps link.
- **FR-S10. Honest framing.**
  - Under the target name, always show the "Government-confirmed shelter" badge (`ShieldCheck`) and: "Nearest of the {count} government-confirmed shelters in AshraySetu. Other official shelters may also be near you. Ask local officials."
  - In Walk mode, when the target is farther than `MAX_WALK_ADVISE_KM`, show an amber `role="alert"` card above the route: "This shelter is {distance} away. If the storm has started, do not try to walk this far: go to the nearest cyclone shelter, school or strong concrete building you know, or call 1070."

### 4.4 Directions

- **FR-D1. Contract.** Define the provider-agnostic types in `frontend/lib/routing/types.ts`:
  ```ts
  type LngLat = [number, number];
  type Profile = 'foot' | 'car';
  type Maneuver = 'depart'|'arrive'|'turn-left'|'turn-right'|'slight-left'|'slight-right'|'sharp-left'|'sharp-right'|'straight'|'uturn'|'roundabout'|'keep-left'|'keep-right'|'other';
  interface Step { maneuver: Maneuver; exit?: number; location: LngLat; name: string; distanceM: number; durationS: number }
  interface RouteRequest { from: LngLat; to: LngLat; profile: Profile; avoid?: GeoJSON.Polygon | GeoJSON.MultiPolygon }
  interface RouteResult { provider: string; attribution: string; distanceM: number; durationS: number; geometry: GeoJSON.LineString; steps: Step[]; snappedFrom: LngLat; hazardAvoided: boolean; warnings: string[]; fetchedAt: number }
  interface MatrixResult { provider: string; durationS: (number|null)[]; distanceM: (number|null)[] }
  ```
- **FR-D2. Server proxy.** Two Express endpoints are the only path to routing providers. Keys never reach the client.
  - **Endpoints:**
    - `POST /api/directions/route` with a `RouteRequest` body.
    - `POST /api/directions/matrix` with `{ from, to: LngLat[], profile }`, where `to.length ≤ 10`.
  - **Code layout:**
    - Provider code lives in ESM modules under `backend/routing/`. Server constants go in `backend/routing/config.js`.
    - Confirm the deploy Node version has global `fetch` (Node 18+).
    - In `server.js`, mount the router before the global parser at :24 with `app.use('/api/directions', express.json({ limit: '10kb' }), directionsRouter)`. A parser mounted later would never run.
  - **Validation:**
    - Return 413 JSON for bodies over 10 KB.
    - Coordinates must be finite and in range, and `profile` must be in the enum.
    - The avoid polygon may have at most 300 vertices. The client rounds avoid coordinates to 5 dp.
    - Invalid input returns 400.
  - **Origin check** (these routes only; do not change the global CORS):
    - Allow: an absent `Origin`; an Origin whose host equals `req.headers['x-forwarded-host'] || req.headers.host`; `https://ashray-setu.vercel.app`; `http://localhost:3000`; `https://${VERCEL_URL}` and `https://${VERCEL_BRANCH_URL}` when set; and anything in env `ROUTING_ALLOWED_ORIGINS`.
    - Reject everything else with 403 `{ error: 'ORIGIN_NOT_ALLOWED' }`.
  - **Rate limits** (in memory, no libraries):
    - **Client key:** `x-real-ip`, else the first `x-forwarded-for` entry, else `req.socket.remoteAddress`. Key IPv6 addresses by /64. Do not set `trust proxy` globally.
    - **Per key:** 60 requests/min across both endpoints (burst 20), returning 429 with `Retry-After`.
    - **ORS:** a global token bucket at 40/min, and daily counters of 2,000 directions and 500 matrix calls. When exhausted, fail over to the next provider.
    - **Upstream limits:** treat an upstream 429, or a quota 403, as provider exhausted. Open that provider's breaker until its `Retry-After` or reset time (60 s if absent) and fail over.
    - All limiter, breaker, quota and cache state is per process. On Vercel it is per instance and resets on cold start, so treat it as best-effort and say so in the report.
  - **Deadline:**
    - One overall server deadline of 6,500 ms per request. Each provider gets `min(4,000 ms, remaining)`.
    - Stop trying providers when less than 1,000 ms remains.
    - `CLIENT_ROUTE_TIMEOUT_MS` must stay above the server deadline.
  - **Circuit breaker:**
    - One breaker per provider. It opens for 60 s after 3 consecutive failures.
    - Only network errors, timeouts and HTTP 5xx count as failures.
  - **Input errors** (ORS 2010/2009/2004, OSRM `NoSegment`/`NoRoute`):
    - If the request carried `avoid`, retry that provider once without it and set `hazardAvoided: false`.
    - Otherwise, or if the retry also fails, return 422 `{ error: 'NO_ROAD_NEARBY', fallback: 'straightLine' }`. Do not fail over.
  - **Cache:** an LRU of 500 entries with a 15 min TTL, keyed by origin rounded to 4 dp, destination, profile and an avoid hash.
  - **All providers failed:** return 503 `{ error: 'ROUTING_UNAVAILABLE', fallback: 'straightLine' }`.
  - **User-Agent:** send `AshraySetu/1.0 (+https://ashray-setu.vercel.app/)` on every upstream call.
- **FR-D3. Provider chain.** Each provider is a module exposing `{ name, supportsAvoid, route(), matrix?() }`. Order:
  1. **Self-hosted.** Used only if env `ROUTING_SELF_HOSTED_URL` is set (an OSRM-compatible API). This is the production recommendation.
  2. **openrouteservice.** Uses env `ORS_API_KEY`, server-only; never a `NEXT_PUBLIC_` variable. Profiles: `foot-walking` and `driving-car`. Supports `avoid_polygons`.
  3. **FOSSGIS OSRM** (`https://routing.openstreetmap.de/routed-foot/...`), with no key.
     - Enabled only when `ROUTING_ALLOW_PUBLIC_DEMO=1` or `VERCEL_ENV !== 'production'`.
     - Verify that a car equivalent exists before using it for `car`.
     - Never use `router.project-osrm.org`, which is car-only.

  General rules:
  - In production with no self-hosted URL and no ORS key, return 503 and let the client use the straight-line guide and the Maps link.
  - Request snapping radii: ORS `radiuses` (for example `[2000, 2000]`; check the public API maximum) and OSRM `radiuses=2000;2000`.
  - Verify every request and response shape against the provider docs. Request GeoJSON geometry and steps.
  - Normalize ORS instruction types and OSRM `maneuver.type`/`modifier` into `Maneuver`. Round output coordinates to 5 dp.
  - Whether the feature still works with no `ORS_API_KEY` is decided by the FOSSGIS gate above. Report that decision.
- **FR-D4. Client.** `frontend/lib/routing/routingClient.ts` provides `requestRoute` and `requestMatrix`.
  - Send requests only when all of these hold: online, Flight Mode off, and routing opted in.
  - Round the origin to `ORIGIN_ROUND_DP`.
  - Abort after `CLIENT_ROUTE_TIMEOUT_MS` with an `AbortController`.
  - Keep an in-memory session cache with `ROUTE_CACHE_TTL_MS`.
  - Obey `Retry-After`, and back off on 429 and 5xx using `REROUTE_BACKOFF_MS`. On 422, use straight-line mode.
  - Make route calls only on target change, profile change, reroute or opt-in.
    - Send immediately (leading edge) when a user tap caused the request: "Continue", the Walk/Drive toggle, tapping an alternative, or pin.
    - Debounce automatic triggers (a hysteresis switch or a reroute) by `AUTO_ROUTE_DEBOUNCE_MS`.
- **FR-D5. Modes.**
  - A two-button toggle: Walk (default, `Footprints`) and Drive (`Car`), using `aria-pressed`.
  - Changing mode re-ranks and re-routes.
- **FR-D6. Rendering.**
  - **Route line:** a white casing polyline (weight 9, opacity 0.9) under a `#007AFF` line (weight 5).
  - **Snap segment:** if `snappedFrom` is at least `SNAP_SEGMENT_MIN_M` from the device, draw a thin grey dashed segment from the device to `snappedFrom`. Beyond `SNAP_WARN_M`, warn: "No mapped road near you. The route starts {distance} away."
  - **Progress:**
    - Remaining distance is `turf.length(turf.lineSliceAlong(...))`, measured from `turf.nearestPointOnLine`.
    - Time is scaled by the remaining fraction.
    - Displayed walking times are scaled by `PROVIDER_FOOT_KMH / WALK_SPEED_KMH`. This affects display only; ranking is unchanged.
    - Under every walking time, show: "Allow extra time in rain, wind or with children and elderly people."
  - **Step list:**
    - Render it as an `<ol>`.
    - Each step starts with a 32 px `Navigation2` arrow rotated for its maneuver: 0 for straight, ±45 for slight, ±90 for a turn, ±135 for sharp, 180 for a u-turn.
    - Then show the step distance in large digits, the localized maneuver text and the street name if present.
    - Grey out steps already passed.
    - Make the list collapsible, with `max-h` and internal scroll.
  - **Attribution:** "© OpenStreetMap contributors · Route: {provider}".
- **FR-D7. Hazard step.**
  1. Build `avoid` from the surge polygon clipped (`turf.bboxClip`) to the bbox of from/to padded by 2 km.
  2. Send it only if all of these hold:
     - neither `from` nor `to` lies inside the unclipped polygon;
     - the clipped result is non-empty;
     - `turf.area` ≤ 200e6;
     - both sides of the clipped result's bbox are ≤ 20 km.

     If either endpoint is inside the polygon, send no `avoid`.
  3. After every route, if `turf.booleanIntersects(route, surge)`, add the warning "Route passes through a modeled storm-surge area."

  Confirm that `bboxClip`, `booleanIntersects`, `lineSliceAlong`, `nearestPointOnLine` and `pointToLineDistance` exist in the installed `@turf/turf`.
- **FR-D8. Off-route.**
  - The device is off-route when `turf.pointToLineDistance(fix, route, { units: 'meters' }) > clamp(1.5 × accuracyM, 35, 150)` holds for `OFF_ROUTE.consecutiveFixes` consecutive qualifying fixes spanning at least `OFF_ROUTE.minDurationMs`.
  - Then reroute to the same target, at most once per `REROUTE_MIN_INTERVAL_MS`, with backoff on failure.
  - **Offline:** never reroute. Draw a dashed segment back to the nearest point on the route, and also show straight-line guidance to the shelter.
- **FR-D9. Offline fallback (straight-line guide).**
  - **When it applies:** offline, Flight Mode on, routing not opted in, routing failed (including 403, 422, 429 and 503), or the target is beyond `MAX_ROUTABLE_KM`.
  - **What to draw:**
    - If a cached route to the same target exists and the device is within `CACHED_ROUTE_CORRIDOR_M` of it, keep route progress going.
    - Otherwise draw a dashed `#007AFF` line (`dashArray '10 10'`) from the device to the shelter.
  - **Main view:** a single arrow at least 96 px tall (the FR-D10 compass arrow), with the distance underneath in digits at least 24 px tall.
  - **Details:**
    - Show the bearing `(turf.bearing + 360) % 360` with a localized 8-point cardinal.
    - For Walk, show "at least {time}" at `WALK_SPEED_KMH`. Show no time for Drive.
  - **Banner:** a persistent amber `AlertTriangle` banner reading "Approximate: straight line, not a road route. It ignores roads, rivers, bridges and flooded areas. Follow officials and marked evacuation routes."
- **FR-D10. Compass arrow** (straight-line mode only).
  - **iOS:** an "Enable compass" button calls `DeviceOrientationEvent.requestPermission()` inside the tap handler, then reads `webkitCompassHeading`.
  - **Android:** listen for `deviceorientationabsolute`, compute `(360 − alpha) % 360`, and correct for `screen.orientation.angle`.
  - The arrow rotates by `bearing − deviceHeading`.
  - Without a compass, the arrow points relative to map north and shows an "N" marker.
  - Remove the listeners when leaving the mode.
- **FR-D11. Arrival.**
  - Arrival is a distance to the shelter of at most `max(30, accuracyM)` on `ARRIVAL.consecutiveFixes` qualifying fixes.
  - **On arrival:**
    - end navigation, switch to `GEO_LOW_POWER` and release the wake lock;
    - announce "You have arrived at {name}";
    - show an arrival card: "Show your family's QR pass to the volunteer at the shelter gate." The card includes the helpline row.
  - This feature never opens `/scan` or `/intake` and makes no network request on arrival.
  - **Undo:**
    - Show "Not there yet? Keep guiding me", which restores `GEO_NAVIGATE` and the previous route.
    - Restore automatically if a qualifying fix within `ARRIVAL.undoWindowMs` is more than 2 × the arrival radius from the shelter.
- **FR-D12. External deep links** ("Open in Maps"). Never include the device's coordinates.
  - **Google:** `https://www.google.com/maps/dir/?api=1&destination=LAT%2CLNG&travelmode=walking|driving&dir_action=navigate`.
  - **Apple:** `https://maps.apple.com/?daddr=LAT,LNG&dirflg=w|d`. Test this on a device.
  - **Android chooser:** `geo:0,0?q=LAT,LNG(<encoded name>)`.
  - **Order per platform:** iOS gets Apple then Google, Android gets Google then `geo:`, desktop gets Google.
  - Open links with `target="_blank" rel="noopener noreferrer"`.
- **FR-D13. Wake lock.**
  - An optional "Keep screen on" toggle, default off, using `navigator.wakeLock.request('screen')`.
  - Re-acquire it when the page becomes visible.
  - Release it on Pause, Stop, arrival and unmount.

### 4.5 Map UI

- **FR-U1. New layers.** Create `frontend/components/map/LiveLocationLayers.tsx` and render it inside `<MapContainer>` after the surge GeoJSON (:165).
  - No layer may use remote images. Every layer is `interactive: false`, so `LocationPicker` still receives map taps.
  - **Device dot:** an `L.divIcon` 22×22, anchor 11,11, with a `#007AFF` fill, a 3 px white border and a CSS-rotated heading cone. Set `keyboard: false` and `zIndexOffset: 2000`. Disable the pulse under reduced motion. Put the CSS in a commented, non-glass block in `globals.css`.
  - **Accuracy circle:** `Circle` with stroke `#007AFF`, weight 1 and fill opacity 0.12.
  - **Target ring:** an emerald `CircleMarker` with radius 18 and weight 3. Draw it always, regardless of the region toggle or failed PNG markers.
  - **Route, straight-line and snap segments:** as described in FR-D6 and FR-D9.
  - **Follow controller:** FR-T6.
- **FR-U2. Fixes to `LeafletMapCore`.** Keep these minimal and keep existing behavior otherwise.
  - Memoize `selectedCoords` on `[selectedShelterId, lat, lng]`.
  - Memoize the surge polygon.
  - In `MapGenieResize`, add a `ResizeObserver` on the map container that calls `invalidateSize()`, debounced to 100 ms.
  - Split `MapRecenter`:
    - a coords-only change calls `setView(coords, map.getZoom())`;
    - a `zoom` prop change applies the zoom;
    - region presets still change both.

    This is the only behavior change allowed in the query-point flow. A map tap still moves the rose pin and updates the nearest-3 grid.
  - Add optional props: `liveFix`, `follow`, `onFollowChange`, `navTarget`, `navRoute`, `straightLine` and `fitRouteRequest?: number`.
    - `fitRouteRequest` is a nonce the page increments.
    - When it changes, the layers call `map.fitBounds(bounds(device + route), { padding: [48, 48] })` as a flagged controller move, and the page sets `follow = false`.
- **FR-U3. Map overlays** (`frontend/components/map/LiveLocationControls.tsx`).
  - Render these as siblings inside the map wrapper (:222-249) at `z-[1000]`, never `fixed`.
  - Put the position classes on plain wrappers, never on the `glass-l*` element (see 2.3).
  - Every overlay drawn over tiles uses `glass-l1 !bg-white/90 ![backdrop-filter:none] ![-webkit-backdrop-filter:none]`, with slate-900 text at 16 px or larger. This keeps contrast and GPU cost under control without adding a glass class.
  - **Control stack:** `absolute top-3 right-3 flex flex-col gap-2`, with 48×48 `rounded-full` buttons:
    - Locate/Recenter: `LocateFixed` when following, `Locate` when not, `LocateOff` when off or denied. Uses `aria-pressed`.
      - In the `prompt`, `denied`, `insecure` and `unsupported` states it never calls the Geolocation API.
      - Instead it calls `scrollIntoView({ block: 'nearest' })` on the matching card and focuses that card's primary button.
    - Pause/Resume, shown only while tracking.
    - Compass, shown only in straight-line mode when permission is needed.
  - **Status pill:** a wrapper at `absolute top-3 left-14 right-[72px]` holding a `rounded-full min-h-12 w-full` truncating button.
    - When idle it shows the GPS status ("Locating…", "±12 m").
    - When navigating it shows the target, distance and time.
    - Tapping it scrolls the panel into view.
  - Check that the Leaflet zoom control is top-left and the attribution bottom-right, and do not cover either.
  - **Legend:**
    - The existing legend's `absolute` (page.tsx :231) loses to `glass-l2`. Change it to `!absolute` and confirm in the browser that it is visible.
    - Then add rows for live location, route, safe target and "Storm-surge area (model, Kendrapara coast only)".
- **FR-U4. Panel** (`frontend/components/map/SafeShelterPanel.tsx`). Use `glass-l2` cards with framer-motion enter and exit (no motion under reduced motion). The panel renders in two slots, and only one state is shown at a time.
  - **Above-map slot** (between the header card ending at :218 and the map at :221): the consent, denied, insecure, unsupported and in-app-browser cards.
  - **Below-map slot** (between :250 and :252): locating, tracking, paused, timeout, imprecise multi-choice, no-eligible, out-of-coverage and arrival. The single polite `aria-live` region lives here.
  - **Target card**, in this order:
    1. The storm warning (5.5).
    2. Name, `block_name`, `gram_panchayat`, `district`, the "Government-confirmed shelter" badge and the FR-S10 listing line.
    3. Space per FR-S1a, with the `nearlyFull`, surge and standby badges.
    4. Distance and time.
    5. The Walk/Drive toggle.
    6. Buttons:
       - "Get road directions", or "Show whole route" (increments `fitRouteRequest`) once a route exists;
       - "Open in Maps";
       - "Call in-charge" (`tel:` to `incharge_phone`, showing `incharge_name`), only when `INCHARGE_PHONES_VERIFIED` is true; `incharge_phone` appears nowhere in the new UI otherwise;
       - the helpline row;
       - "Pin";
       - "Stop".
    7. A row of two `aria-pressed` toggles: "Battery saver" (`GEO_LOW_POWER`, unanimated follow, no compass) and "Keep screen on" (FR-D13, helper text "Uses more battery"). If `navigator.getBattery` reports a level below 0.2 and the phone is not charging, ask once: "Battery low. Turn on Battery saver?"
    8. The "Road directions: On · Turn off" chip and a "Privacy" link (5.7).
  - **Below the target card:** the FR-S10 walk advisory (above the steps), the step list, the alternatives with the FR-S8 note, then the disclaimers.
- **FR-U5. Touch and layout.**
  - Every interactive element is at least 44×44 CSS px (48 preferred), with at least 8 px between targets.
  - The layout must work at 360 px width with no horizontal scroll.
  - Change the map box to `h-[min(480px,60svh)]` so desktop stays 480 px and phones can still scroll past it.
  - Bind no Esc handlers.
- **FR-U6. Flight Mode signal.** These are the only `Header.tsx` changes allowed.
  - In `toggleAirplaneMode`:
    - write `sessionStorage["ashraysetu_flight_mode"] = "1" | "0"`;
    - dispatch `window` `CustomEvent("flightModeChanged", { detail: { enabled } })`.
  - In the mount effect (:37-77), inside try/catch: `if (sessionStorage.getItem('ashraysetu_flight_mode') === '1') { setIsSimulatedOffline(true); setSyncState('OFFLINE'); }`.
  - The feature reads the initial sessionStorage value, treats `offline = !navigator.onLine || flightMode`, and listens for `online`, `offline` and `flightModeChanged`.

## 5. Privacy and safety

1. **Coordinates stay in memory** inside the two stores. Never write them to any of the following:
   - `localStorage`, `sessionStorage`, IndexedDB, cookies, or URLs and query strings;
   - `console` output in production builds;
   - the heartbeat, `logActivityEvent` or the SSE stream;
   - `enqueueMutation` or sync batches;
   - any `backend/data/*.json` file.

   Add no new telemetry of any kind, including an "is navigating" flag.
2. **Routing is a separate, explicit opt-in.**
   - The first tap on "Get road directions" shows: "Road directions need the internet. Your start point (rounded to about 10 m) and the shelter location go to the AshraySetu server and then to a map routing service (openrouteservice or FOSSGIS in Germany, or AshraySetu's own server) to work out the route. AshraySetu keeps them in server memory for up to 15 minutes to reuse the route and never writes them to disk or logs. The routing service handles them under its own privacy policy."
   - The choices are "Continue" and "Use straight-line guide".
   - Remember the choice only in `sessionStorage["ashraysetu_online_routing"]`, as a boolean.
   - Until the user opts in, the device sends no coordinates anywhere, including matrix calls.
3. **The server proxy never logs request bodies or coordinates.** Errors log only the provider name, HTTP status and duration. It writes nothing to disk.
4. **Permissions-Policy.**
   - Add a `headers()` entry in `frontend/next.config.mjs` setting `Permissions-Policy: geolocation=(self), camera=(self)` for `/(.*)`.
   - Do not list other features.
   - Confirm the QR scanner still works.
5. **Safety copy.**
   - **Storm warning:** "If strong wind, heavy rain or flooding has already started, do not go outside. Stay in the strongest building, away from windows. If the wind suddenly stops, the eye of the storm may be passing. Stay inside: the wind will return." Show it under the consent title and at the top of the target card.
   - **Helpline row:** "Emergency: 112 · State control room: 1070 · District control room: 1077". Each number is a `tel:` link at least 48 px tall. Show the row in every state, including denied, offline and no-eligible.
   - **Disclaimers**, shown whenever a target is shown:
     - "Routes come from map data and may not show flooding, fallen trees, damaged bridges or closed roads. Always follow official evacuation orders and instructions from local officials."
     - "The shelters are government-confirmed, but free space is based on data stored on this device and may be out of date or sample data. Call 1070 (State control room) or 1077 (District control room) to check before you travel."
6. **Surge labeling.** All surge text says "modeled". When the device or the selected point is more than 5 km from the polygon, show in the panel: "Storm-surge shading is a model for part of the Kendrapara coast only. No shading does not mean an area is safe."
7. **DPDP Act 2023.** Processing that stays on the device is not collection. The routing proxy does process personal data (location plus IP), so:
   - **Basis:** the explicit routing opt-in. Mention the §7(h) disaster-assistance legitimate use in the report only as a fallback, never as a reason to skip the opt-in.
   - **Withdrawal (§6(4)):** one tap on "Turn off" removes the session flag, cancels in-flight requests, clears the client route cache and switches to straight-line guidance.
   - **Notice:** the disclosure and the "Privacy" link exist in en, or and te (§5(3)). They state the purpose, the data items, the retention (15 min in memory), the providers, and a `{PRIVACY_CONTACT}` placeholder for the owner.
   - **Purpose limitation:** the data is used for no other purpose.

## 6. Resilience

1. **Offline-first.**
   - Eligibility, Stage 1 ranking, straight-line guidance, cached-route progress and every new layer must work with the network off, using shelter data from Dexie.
   - When offline, show "Map images unavailable offline. Your position, shelters and guidance still work."
2. **Connectivity transitions** (`online`, `offline`, `flightModeChanged`).
   - Going offline cancels in-flight requests and switches to cached-route or straight-line mode within 2 s.
   - Coming back online with opt-in triggers one re-evaluation.
3. **Error-state matrix.** Each of these states needs distinct copy, an icon, a recovery action and an announcement, and must offer the helpline row:
   - denied, unavailable, timeout or watchdog;
   - low accuracy and imprecise multi-choice;
   - insecure context, unsupported, in-app browser;
   - no eligible shelters, out of coverage;
   - routing 400, 403, 422, 429 or 503, and client timeout.

   Every routing failure falls back to the straight-line guide plus the external Maps link, never to a blank state.
4. **Battery.**
   - Use high accuracy only while tracking with a target. Use low power after arrival or with Battery saver.
   - Run no watch while the page is hidden.
   - Throttle commits (FR-T3) and follow pans (FR-T6).
   - Matrix and route calls follow the FR-S6 and FR-D4 cadence.
   - No `setInterval` polling. The one exception is a single `setTimeout`, re-armed at most every `AGE_LABEL_REFRESH_MS` and only while the fix is older than `STALE_FIX_WARN_S` or tracking is paused, to refresh the age label.
5. **Shelter data races.** If `liveQuery` reports that the target is no longer eligible, re-evaluate immediately (FR-S6 and FR-S7).
6. **Bundle size on 2G.**
   - Load `LiveLocationLayers`, `LiveLocationControls`, the routing client and the compass code with `next/dynamic` or `import()` (`ssr: false`).
   - Start preloading them on idle after mount, so they are cached before connectivity drops.
   - Keep the consent card in the initial bundle.
   - Report the `/map` First Load JS before and after from `next build`, and keep the increase at or below 40 KB. Stop the dev server first, because both use `.next`.

## 7. Accessibility and i18n

1. **Strings.** Every new user-facing string, aria-label and announcement is a `liveLoc*` key in `en`, `or` and `te`. This includes the maneuver texts, the 8 cardinal directions, the units (m, km, min, h) and all safety copy. Flag the `or` and `te` strings for native-speaker review.
2. **Number formatting.**
   - Under 1,000 m: round to 10 m.
   - From 1 km: 1 decimal place.
   - From 100 km: whole numbers.
   - Time: round up to the minute. Show "<1 min" below 1 minute, and "1 h 05 min" style from 60 minutes.
3. **Live region.** One polite `aria-live` region announces:
   - target changes, immediately: "Nearest safe shelter: {name}, {distance}, about {time}";
   - time changes of 1 minute or more, at most once per 60 s;
   - "Rerouting", "Arrived", "Offline: approximate guide", and the nearer-shelter card.

   Blocking errors use `role="alert"`.
4. **Reduced motion.** When it is on, there is no map animation (`animate: false`), no marker pulse and no panel motion.
5. **Contrast.**
   - Text on overlays and glass is at least 4.5:1. Verify against the worst tile colour (OSM water `#aad3df`).
   - UI components, the route line and the device dot are at least 3:1 against the tiles.
   - Meaning never depends on colour alone: straight-line mode is dashed and labeled, and the target has a ring plus a text label.
6. **Keyboard and screen readers.**
   - Use native `<button>` and `<a>` elements with localized `aria-label`s. Toggles use `aria-pressed`.
   - Focus is visible.
   - Focus order: consent, controls, target card, steps, alternatives.
   - Set the panel root's `lang` attribute to the active language.
7. **Text size.** The root layout disables pinch-zoom (`layout.tsx` :16-17). Do not change that without the owner. Make all new body text at least 16 px and secondary text at least 14 px.

## 8. Implementation plan

Work in this order. Keep changes minimal and isolated.

After each checkpoint, run `npx tsc --noEmit` and the unit and existing tests. ESLint is not configured in this repo: there is no eslint dependency or config. Do not run `npm run lint` or `next lint`, because it prompts, installs ESLint and writes `.eslintrc`. Report lint as "not configured".

**Step 0. Read and verify.** Read every file in 2.1, then verify and record:
- how `vercel.json` and the `next.config.mjs` rewrites route `/api/*`;
- the Node version locally and on Vercel (global `fetch`, TypeScript type stripping);
- how backend env vars are loaded;
- the lucide icons and turf functions you will use;
- that react-leaflet exports `Circle`, `CircleMarker` and `Polyline`;
- `Header.tsx` :26, :37-77 and :90-99;
- the `TileLayer` attribution and the zoom control position;
- that the existing legend renders out of place today.

Record a baseline of `tsc`, the existing `node:test` files and the existing Playwright specs. Playwright needs `npm run dev` already running on port 3000, because there is no `webServer` block.

**Step 1. Pure logic and unit tests.**
- Create `lib/geo/navConfig.ts` and `lib/geo/safeShelter.ts` (eligibility, flags, provenance logic, ranking, tie-breaks, hysteresis, coverage, multi-choice).
- Create `lib/geo/navMath.ts` (commit rule, off-route detector, arrival detector, progress, bearing and cardinal, formatting, deep links, avoid builder, `toLngLat`/`toLatLng`).
- Write their tests (9.1). Leave `findNearestShelters` untouched.

**Step 2. Location store.** Create `lib/geo/liveLocationStore.ts` and `lib/geo/useLiveLocation.ts`.

**Step 3. Navigation store.** Create `lib/geo/liveNavigationStore.ts` and `lib/geo/useLiveNavigation.ts`. It is a singleton subscribed to the location store and the shelters `liveQuery`. It owns the target, pin, profile, route, mode (routed, cached or straight), departure state and announcements.

**Step 4. Map.**
- Apply the FR-U2 edits to `LeafletMapCore.tsx`.
- Create `LiveLocationLayers.tsx`, `LiveLocationControls.tsx` and `SafeShelterPanel.tsx`.
- Wire them into `page.tsx` with the fewest possible edits: two panel slots, `manualPointChosen`, the legend fix and the map height.
- Add the i18n keys.

**Checkpoint A.** Straight-line navigation works end to end, offline included, with no backend. It must be shippable at this point.

**Step 5. Routing.**
- Backend: add `backend/routing/` (config, providers, chain, deadline, cache, rate limits, breaker, normalization) and mount it in `server.js` before :24.
- Frontend: add `lib/routing/types.ts`, `lib/routing/routingClient.ts`, the opt-in and turn-off flow, matrix ranking, route rendering, steps and the hazard step.

**Checkpoint B.** Road directions work through FOSSGIS with no key (non-production), and through ORS when `ORS_API_KEY` is set.

**Step 6. Navigation behaviors.** Rerouting, departure-gated switching, cached-route continuation, arrival and undo, compass, wake lock and Battery saver.

**Step 7. Platform.** The `Header.tsx` Flight Mode changes (FR-U6) and the `Permissions-Policy` header.

**Step 8. Verification.** E2E tests, the bundle-size check, the manual checklist and the report.

Ask the owner before you add a dependency, change the Dexie schema, change existing nearest-list or status logic, alter global CORS or telemetry, change the root viewport, or flip `SHELTERS_GOV_CONFIRMED`, `OCCUPANCY_IS_LIVE` or `INCHARGE_PHONES_VERIFIED`.

## 9. Testing and verification

### 9.1 Unit tests

Use `node:test` and `node:assert/strict`. The existing tests (for example `genie/__tests__/originStore.test.ts`) run through Node's native type stripping; there is no npm script and no TS loader.

- **Location and command.** Put the frontend tests in `frontend/lib/geo/__tests__/*.test.ts` and run them with `cd frontend && node --test lib/geo/__tests__/*.test.ts genie/__tests__/*.test.ts`. This needs Node ≥ 22.18 or ≥ 23.6.
- **Import rules for modules under test:**
  - Import runtime values only by relative path with an explicit `.ts` extension, for example `import { generateSurgeInundationZone } from './turfCalculations.ts'`.
  - Use `@/` only in `import type`.
  - No enums, namespaces, parameter properties or JSX.
  - Do not import dexie, React or Leaflet, and do not touch `window` or `navigator` at module top level.
  - Never name a unit test `*.spec.ts`, because Playwright picks those up.
- **Backend tests:** `cd backend && node --test routing/__tests__/`, using recorded ORS and OSRM fixtures.

Cases:
- **Eligibility:**
  - Hukitola (`SATURATED`, 395/400) is excluded.
  - An `ACTIVE` shelter with `current_occupancy >= capacity_persons` is excluded.
  - `DAMAGED` is excluded.
  - `STANDBY` is included only when the flag is on, and then carries its badge.
  - `capacity_persons = 0` and NaN coordinates are excluded.
  - `OD-KEN-RAJ-001` and `OD-KEN-RAJ-002` are flagged `inSurgeZone`, stay eligible, and carry the informational surge badge.
- **Provenance:**
  - A shelter with no rows is treated as sample data.
  - Demo rows (`-demo-` ids) are ignored.
  - A real admission yields "updated on this device".
- **Ranking:**
  - Shelters at 0.36 km and 0.44 km (both shown as 0.4 km; 80 m and 22% apart) rank 0.36 first.
  - Shelters 40 m apart are tied and ordered by FR-S5.
  - The tie group is anchored on the best candidate, and the order is deterministic.
  - The shortlist has K entries.
  - Null routed durations rank last.
  - Surge-zone shelters are never penalized: a surge-zone shelter 1.0 km away ranks ahead of a non-surge shelter 1.2 km away.
- **Imprecise fix:** 3 km accuracy with candidates 1 km apart produces the multi-choice state. 3 km accuracy with candidates at 1 km and 15 km does not.
- **Hysteresis:**
  - 15% faster on a 600 s route (90 s gain): no switch.
  - 25% faster on a 600 s route: switch.
  - 130 s faster on a 1,200 s route: switch.
  - Straight-line 200 m shorter at 5 km: no switch. 300 m shorter at 5 km: switch.
  - The target becomes ineligible: immediate switch.
  - After departure, a qualifying gain emits the nearer-shelter card, not a switch.
  - Pinned: no automatic switch, and a prompt is emitted when the pin becomes ineligible.
  - Routed and straight-line metrics are never compared.
- **Matrix cadence:** 10 fixes jumping 300 m at ±800 m within 60 s produce 0 extra matrix calls.
- **Commit rule:**
  - Stationary fixes commit every 15 s.
  - Accuracy worsening from 10 m to 800 m commits.
  - Out-of-order timestamps are dropped.
- **Off-route:**
  - Fewer than 3 fixes, or less than 10 s: not off-route.
  - Fixes with accuracy above 75 m are ignored.
  - The threshold clamps to 35 and 150.
  - A reroute within 30 s is suppressed.
- **Arrival:** needs 2 qualifying fixes, the radius is `max(30, accuracy)`, and the undo rule restores navigation.
- **Hazard step:** an origin at 20.5214, 86.8523 routed to OD-KEN-RAJ-001 produces a request with no `avoid`.
- **Advisory:** a device 10 km from the nearest eligible shelter in Walk mode shows the walk advisory.
- **Formatting:** the 7.2 boundaries; cardinals at 0, 22.5 and 337.5°; deep links never contain the origin.
- **Coverage:** a device in Delhi produces out-of-coverage and is beyond `MAX_ROUTABLE_KM`.
- **Backend:**
  - normalizers;
  - the deadline budget;
  - the breaker ignores input errors;
  - a 422 without failover;
  - a retry without `avoid`;
  - client-key extraction;
  - Origin rules;
  - a 413 for oversize bodies.

### 9.2 Playwright E2E

Write `frontend/genie/__tests__/liveLocation.spec.ts` (`testDir` is `./genie/__tests__`). Open the map from `/` by clicking `[data-genie-origin="/map"]`, and scope locators to `[role="dialog"]`.

**Geolocation strategies:**
- `page.addInitScript` installs a controllable fake `navigator.geolocation` plus `permissions.query`. It exposes `window.__geoMock.emit({lat,lng,accuracy,heading,speed})`, `.fail(code)`, `.silent()`, `.activeWatches` and `.calls`. Emit accuracy 10 m unless a test says otherwise.
- At least one test uses the real API: `test.use({ permissions: ['geolocation'], geolocation: {...} })` with `context.setGeolocation`.

**Test data and timing:**
- Take coordinates from the seed in `dexie.ts`.
- Mock `**/api/directions/**` with `page.route` fixtures. Never call real providers.
- Use `page.clock` for the 10, 30 and 60 s windows if it works with the app's timers; otherwise wait in real time.

**Header controls are covered** by the window backdrop. Drive those signals directly:
- Flight Mode: `page.evaluate(() => { sessionStorage.setItem('ashraysetu_flight_mode','1'); window.dispatchEvent(new CustomEvent('flightModeChanged',{ detail:{ enabled:true } })); })`
- Language: `page.evaluate(() => { localStorage.setItem('ashraysetu_lang','or'); window.dispatchEvent(new Event('languageChanged')); })`

**Offline scenarios** run on `next dev`, which serves chunks on demand. Before `context.setOffline(true)`, render the target card, the step list and the straight-line layer once while online. Alternatively, run the offline scenarios against `npm run build && npm run start` with the dev server stopped.

Scenarios:
1. **Grant.**
   - No geolocation call happens before the tap. The consent card is above the map.
   - After "Show my location", the dot appears within 3 s and the expected shelter is the target.
   - With the device next to Hukitola, Hukitola is never the target.
   - No `tel:` link to any seed `incharge_phone` is rendered.
2. **Deny.**
   - With code 1, the denied card has `role="alert"` and there are 0 active watches.
   - Before any map tap, no target, distance or route is rendered. After a map tap, the target is computed from that point.
3. **Errors.**
   - Code 2 shows the unavailable copy.
   - Code 3 shows the searching copy, the watch stays active, and the manual option is visible.
   - `.silent()` triggers the watchdog state.
4. **Movement and follow.**
   - A fix that leaves the central area re-centres the map.
   - Dragging the map turns follow off (`aria-pressed=false`). Recenter turns it back on.
   - A map tap moves the rose pin without changing the zoom.
5. **Routing and privacy.**
   - Before opt-in, there are 0 requests to `/api/directions/*`.
   - After "Continue", exactly 1 matrix and 1 route request are sent without delay, and the origin has 4 or fewer decimal places.
   - No request URL or body outside `/api/directions/*` (heartbeat included) contains the device latitude and longitude at 4 dp or at 3 dp. Tile URLs hold tile indices, not coordinates.
   - "Turn off" cancels routing and switches to straight-line mode.
6. **Rerouting.**
   - Three fixes about 200 m off the mocked route over 10 s or more produce exactly 1 new route request and a "Rerouting" announcement.
   - A second deviation within 30 s produces no request.
7. **Offline.**
   - `context.setOffline(true)` shows the "Approximate" banner within 2 s, with no directions requests.
   - Within 200 m of the cached route, progress continues.
   - Repeat with the Flight Mode signal.
8. **Single watcher.**
   - A direct visit to `/map` (double mount) gives `activeWatches === 1`.
   - Opening from the dock and then closing the window gives `activeWatches === 0`.
9. **Hysteresis** (routed, mocked matrix).
   - After opt-in, move at least 100 m so the device has departed.
   - Fixture A: C = 600 s and B = 540 s. The target is unchanged and no card appears.
   - After the next trigger, fixture B: B = 420 s. The target is still unchanged and the "A nearer shelter is available" card appears.
   - Tapping Switch changes the target and announces it.
10. **Arrival.**
    - Two qualifying fixes inside the radius produce the arrival announcement and the QR-pass card, with no network request.
    - "Not there yet?" restores guidance.
11. **i18n smoke.** Switching to `or` and `te` through the signal changes the panel strings, and no raw `liveLoc*` key is rendered.
12. **Flight Mode before opening.** Toggle Flight Mode through the Header before opening the map window. The panel starts in offline mode.

Run `npx playwright test genie/__tests__/liveLocation.spec.ts` while `npm run dev` is running, then the existing specs. The new spec must pass. The existing specs must show no regressions against the Step 0 baseline. List any spec that already failed at baseline.

### 9.3 Manual checklist (real phones over HTTPS)

Use a Vercel preview deployment or an HTTPS tunnel; the Origin rule allows both. Plain `http://<LAN-IP>` will not work. The owner performs the deploy.

1. Android Chrome and iOS Safari: consent card, then the prompt. A dot appears outdoors, and the accuracy circle shrinks as the fix improves. Test once with mobile data off (cold start).
2. Deny, re-enable through the steps shown, then "Try again" works. On iOS, turning Precise Location off shows the low-accuracy banner or the multi-choice state.
3. Open the link inside the Facebook or Instagram in-app browser: the warning and "Copy link" appear.
4. Walk 200 m or more off the route: it reroutes once, with no flicker between shelters.
5. Airplane mode mid-route: cached progress continues, then straight-line mode. The compass arrow points correctly after "Enable compass" on iOS.
6. Lock the screen or background the tab for 2 minutes, then return: the fix refreshes and the age label is correct. "Keep screen on" works.
7. Odia and Telugu render correctly. TalkBack and VoiceOver announce target and time changes.
8. After 15 minutes of navigation, note the battery drain. After Stop, confirm no watch is running (the location indicator is off).
9. The QR scanner camera still works with the new `Permissions-Policy`.

## 10. Acceptance criteria

- [ ] No location API call happens before a user tap. The only exception is `granted` plus the session flag.
- [ ] Exactly one active `watchPosition` per tab in every mount scenario, including StrictMode. Zero after Stop or unmount.
- [ ] `SATURATED`, `DAMAGED` and at-capacity shelters are never chosen as targets. `STANDBY` follows the config. Surge-zone shelters are never excluded, penalized or down-ranked, and every target shows the "Government-confirmed shelter" badge.
- [ ] Sample occupancy is never presented as live. Seed `incharge_phone` numbers are never shown while `INCHARGE_PHONES_VERIFIED` is false.
- [ ] The target does not change for gains below the hysteresis thresholds and changes immediately when it becomes ineligible. After departure, any other change needs a tap. Pinned targets are respected.
- [ ] The live fix never moves the rose query point. The query-point flow and the "nearest 3" grid behave as before, except that a map tap no longer resets the zoom.
- [ ] The map does not snap back while the user is panning. Follow turns off on any user camera gesture, and Recenter restores it.
- [ ] Road directions show a polyline, distance, time and localized steps with arrow icons. Walk and Drive both work. FOSSGIS works with no key outside production, or with `ROUTING_ALLOW_PUBLIC_DEMO=1`.
- [ ] Off-route detection uses the FR-D8 thresholds, with at least 30 s between reroutes. No `avoid` is sent when either endpoint is inside the surge polygon.
- [ ] Offline or in Flight Mode, guidance continues in cached-route or straight-line mode, labeled approximate, with zero calls to `/api/directions`.
- [ ] No coordinates appear in any storage, client-side URL, telemetry, SSE, log or backend data file. The only exceptions are the server-to-provider request (OSRM-compatible APIs put coordinates in the URL path) and the 15-minute in-memory route cache. Deep links contain only the shelter's coordinates. Arrival makes no network request.
- [ ] Routing keys exist only in backend env vars. The proxy validates input, checks the Origin, rate-limits, caches, enforces the 6.5 s deadline, falls back, keeps input errors out of the breaker, and never logs coordinates.
- [ ] `Permissions-Policy: geolocation=(self), camera=(self)` is served, and the QR scanner still works.
- [ ] Every state in 6.3 has copy, a recovery action, an announcement and the helpline row, in en, or and te. The storm warning, the listing line and the walk advisory appear as specified.
- [ ] Touch targets are 44 px or larger. Text is at least 16 px. Reduced motion is respected. Contrast meets 7.5. It works at 360 px width with no horizontal scroll.
- [ ] Overlays stay inside the map box at z-index 1000 or below. No positioning utility shares an element with a `glass-l*` class. No `position: fixed`, no Esc bindings, no new glass styles, no new dependencies.
- [ ] `npx tsc --noEmit`, all unit tests and the new E2E spec pass, with no regressions in the existing Playwright specs against baseline. The `/map` First Load JS increase is 40 KB or less.

## 11. Output expectations

When you finish, report:
1. **Files created and modified.** Absolute paths with a one-line purpose each, plus `git diff --stat`. Do not commit.
2. **Step 0 results.** Every verification item, especially API routing, the Node versions, the test runner and the baseline (including specs that already failed). Lint is "not configured".
3. **Decisions.** `TREAT_STANDBY_AS_OPEN`, the provider chain and FOSSGIS gating, with reasons, plus any threshold you changed from section 4. Report the flags (`SHELTERS_GOV_CONFIRMED` true, `OCCUPANCY_IS_LIVE` false, `INCHARGE_PHONES_VERIFIED` false), and remind the owner that the seed in-charge numbers are still placeholders to replace with the official ones.
4. **Setup.**
   - Env vars: `ORS_API_KEY`, `ROUTING_SELF_HOSTED_URL`, `ROUTING_ALLOWED_ORIGINS`, `ROUTING_ALLOW_PUBLIC_DEMO`.
   - Where to set them locally and on Vercel.
   - Exact commands for the unit and E2E tests.
   - A note that rate-limit, quota and breaker state is per instance and best-effort.
5. **Test results.** Pass/fail counts for unit, E2E and existing specs, any flaky behavior, and First Load JS before and after.
6. **Privacy audit.** Each network egress the feature can produce, what it contains, and the condition that triggers it. Include OSM tile requests: tile x/y at zoom z identify an area about 40,075 km × cos(lat) / 2^z wide, sent along with the user's IP.
7. **Known limitations and follow-ups.**
   - The request was built as self-location only. Owner-side tracking was not built and would need per-visitor opt-in, a DPDP notice and a retention policy.
   - The existing presence heartbeat (`UserSessionTracker.tsx`) records every visitor's session, page and device type without notice and logs to the git-tracked `backend/data/activity_log.json`. Recommend adding a notice or removing it.
   - Flight Mode and language cannot be changed while the map window is open.
   - Remaining DPDP gaps and the `{PRIVACY_CONTACT}` placeholder.
   - Removing `userScalable: false`.
   - Production self-hosted routing, offline tiles, sync of shelter status, persistent route packs, and native-speaker review of `or` and `te`.
8. **Manual phone checklist (9.3),** with the items you could not run marked as pending for the owner.