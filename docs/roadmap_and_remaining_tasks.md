# Igbo Community Atlas — Remaining Work & Phase Roadmap

*Tracking Document • Version 1.0*  
*Reference Source of Truth:* [`igbo_community_atlas_final_development_plan.md`](file:///c:/Users/lol/Downloads/ica/igbo_community_atlas_final_development_plan.md)

---

## 1. Status Overview

| Phase | Title | Status | Primary Output |
| :--- | :--- | :---: | :--- |
| **Phase 0** | **Foundation** | **COMPLETED** | Monorepo layout, Git setup, PostGIS migrations, GeoJSON validation, domain types |
| **Phase 1** | **Geography & Reference Layers** | **COMPLETED** | Administrative seeder, Next.js app, MapLibre map, State & LGA toggles, Pure GeoJSON |
| **Phase 2** | **Communities Layer & Placement** | **COMPLETED** | Server-side `ST_Covers`, click-to-place workflow, public community markers |
| **Phase 3** | **Governance & Verification** | **COMPLETED** | Confirmation & challenge endpoints, review lifecycle, status indicators |
| **Phase 4** | **Discovery & Details** | **COMPLETED** | Search with camera flyTo, community detail pages, evidence records |
| **Phase 5** | **Derived Geography** | **COMPLETED** | Weighted community density endpoint (`/api/map/igbo-density.geojson`) |
| **Phase 6** | **Hardening, Testing & MVP Polish** | **COMPLETED** | Clean production build passing, zero-external-tile map, clean port 3000 |
| **Phase 7** | **Sidemenu Wiring & Interactivity** | **COMPLETED** | Fully wired state quick jumps, dialect sync, migration arcs, calendar filter |

---

## 1.1 Sidemenu Wiring & Cultural Interactivity Audit & Implementation

An exhaustive code audit of the sidemenu dashboard (`apps/web/app/page.tsx`, `AtlasOverview.tsx`, and `MapContainer.tsx`) was completed, and all identified gaps were wired:

### A. Southeast Homeland State Quick Jumps (`Explore` Tab) — **WIRED**
- [x] Defined canonical `SE_STATES` metadata with state codes, capitals, LGA counts, cultural hubs, and historical summaries in [`apps/web/lib/geo.ts`](file:///c:/Users/lol/Downloads/ica/apps/web/lib/geo.ts).
- [x] Implemented `selectStateByCode(code)` in [`MapContainer.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/map/MapContainer.tsx), highlighting the state boundary line (`highlightState(code)`), centering the camera with state-tailored zoom, and rendering the rich state inspector card.
- [x] Added active state outline indicator in [`AtlasOverview.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/map/AtlasOverview.tsx).

### B. Dialect Continuum & Linguistic Clusters (`Culture` Tab) — **WIRED**
- [x] Implemented `highlightDialectCluster(cluster)` on `MapContainerHandle` flying to the cluster's geographic center.
- [x] Clicking any dialect cluster card (Waawa, Central, Anioma, Southern, Cross River, Anambra Basin) automatically enables `showDialects` on the map and opens the linguistic inspection panel.

### C. Ancestral Migration Arcs Inspection (`Culture` Tab) — **WIRED**
- [x] Implemented `inspectMigrationArc(arc)` on `MapContainerHandle` computing the geographic bounding box of the corridor and fitting camera bounds (`map.fitBounds`) across both origin and destination endpoints.
- [x] Automatically turns on `showMigrationArcs` and triggers migration corridor beacon pin with era, origin/destination distance, and historical narrative.

### D. Traditional Market Day Calendar & Cultural Festival Sync (`Culture` Tab) — **WIRED**
- [x] Made the 4-Day Cycle Track (*Eke*, *Orie*, *Afọ*, *Nkwọ*) interactive in [`TraditionalCalendarWidget.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/cultural/TraditionalCalendarWidget.tsx).
- [x] Implemented `filterLandmarksByMarketDay(dayName)` in `MapContainer.tsx` filtering map landmark layers (`landmarks-points` and `landmarks-labels`) to isolate traditional markets holding trade on that specific day with clear filter indicator.

### E. Layer Visibility Sync in `MapContainer.tsx` — **WIRED**
- [x] Added reactive `useEffect` visibility hooks for `showDialects` (`dialect-fill`, `dialect-outline`, `dialect-labels`) and `showMigrationArcs` (`migration-glow`, `migration-lines`, `migration-hubs`, `migration-labels`).

### F. Collapsed Rail Bar Filter Action (`page.tsx`) — **WIRED**
- [x] Clicking the *"Verified"* metric badge in the collapsed vertical rail bar sets `activeFilter = 'verified'`, immediately isolating verified community markers upon expanding.

### G. Colonial, Precolonial & Historic Documentation Corpus — **WIRED & INTEGRATED**
- [x] Created canonical archival registry [`apps/web/lib/archival.ts`](file:///c:/Users/lol/Downloads/ica/apps/web/lib/archival.ts) cataloging official British colonial Intelligence Reports, precolonial explorer accounts, and pre-Biafran Civil War minority commission proceedings (Willink Commission 1958).
- [x] Expanded corpus to include:
  - **Ekumeku Guerrilla Resistance Wars (1898–1914):** Kew War Office despatches (`CO 520/14` & `CO 520/103`) documenting the 16-year asymmetric anti-colonial resistance of Western Igbo confederacies.
  - **Colonial Boundary Decrees (1914–1939):** Lugard's 1914 Amalgamation, 1923 Southern Provinces reform, and Bourdillon's 1939 Eastern/Western split decree (`NAI CSO 1/34` / `Kew CO 583/242/4`).
  - **Aro Confederacy Corridors (1902):** Moor's despatches (`Kew CO 520/12`) mapping the *Chukwu Ibin Ukpabi* oracle network, judicial highways, and trade diaspora hubs.
  - **Pre-1967 Census Gazettes (1952–1963):** Federal Census Board records (`NAI CN/52`) capturing mother-tongue Igboid classifications across Asaba/Aboh, Ahoada, and Ibaji divisions.
  - **9th-Century Archaeological Excavations (Igbo-Ukwu):** Thurstan Shaw's scientific excavations (`FAS/IGB/1959-1964`) radiocarbon-dating lost-wax bronze casting to 850 CE.
- [x] Integrated repository references across NAI Ibadan, NAE Enugu, NAK Kaduna, UK Kew, and the British Library.
- [x] Added dedicated **Archives Tab** with live search, category filter pills (*Intelligence Reports*, *Ekumeku Wars*, *Boundary Decrees*, *Census & Willink*, *Igbo-Ukwu*, *Precolonial*), and spatial "View Area" jumps in [`AtlasOverview.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/map/AtlasOverview.tsx).
- [x] Embedded contextual archival citations into the **Selection Inspector Card** and Community Detail Evidence column in [`apps/web/app/communities/[id]/page.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/app/communities/[id]/page.tsx).

---

## 2. Completed Work (Phase 0: Foundation)

- [x] Initialized Git repository and created comprehensive [`.gitignore`](file:///c:/Users/lol/Downloads/ica/.gitignore).
- [x] Created monorepo directory layout per Section 5 (`apps/web`, `database`, `data`, `scripts`, `docs`, `tests`).
- [x] Copied source GeoJSON files untouched to [`data/source/`](file:///c:/Users/lol/Downloads/ica/data/source/).
- [x] Created automated baseline validator [`scripts/validate-geojson.mjs`](file:///c:/Users/lol/Downloads/ica/scripts/validate-geojson.mjs) verifying:
  - 37 State features with unique `admin1Pcod`.
  - 774 LGA features with unique `admin2Pcod`.
  - 100% of LGAs correctly referencing existing parent states.
- [x] Created PostGIS database migration [`001_initial_schema.sql`](file:///c:/Users/lol/Downloads/ica/database/migrations/001_initial_schema.sql) covering all tables and GiST spatial indexes.
- [x] Configured template environment variables in [`.env.example`](file:///c:/Users/lol/Downloads/ica/.env.example).
- [x] Defined TypeScript core domain models in [`apps/web/lib/types.ts`](file:///c:/Users/lol/Downloads/ica/apps/web/lib/types.ts).

---

## 3. Completed Work (Phase 1 & Phase 2)

- [x] **1.1 Web App Foundation (`apps/web`)**: Next.js 14 App Router with TypeScript and Tailwind CSS.
- [x] **1.2 GeoJSON Normalization**: [`scripts/normalize-geojson.mjs`](file:///c:/Users/lol/Downloads/ica/scripts/normalize-geojson.mjs) optimized 37 States (0.7 MB) and 774 LGAs (2.3 MB).
- [x] **1.3 Database Seeder**: [`scripts/generate-seed-sql.mjs`](file:///c:/Users/lol/Downloads/ica/scripts/generate-seed-sql.mjs) generated SQL seeds for all 37 States and 774 LGAs.
- [x] **1.4 Interactive Map & Reference Layer Controls**: [`MapContainer.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/map/MapContainer.tsx) and [`LayerControls.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/map/LayerControls.tsx) with independent State (emerald) and LGA (sky blue) toggles.
- [x] **2.1 Server-Side Spatial Assignment**: [`/api/spatial/resolve-admin`](file:///c:/Users/lol/Downloads/ica/apps/web/app/api/spatial/resolve-admin/route.ts) verifying coordinates and deriving containing LGA and State.
- [x] **2.2 Public Communities GeoJSON API**: [`/api/map/communities.geojson`](file:///c:/Users/lol/Downloads/ica/apps/web/app/api/map/communities.geojson/route.ts) with contributor privacy protection.
- [x] **2.3 "Add Community" Contribution Workflow**: [`AddCommunityModal.tsx`](file:///c:/Users/lol/Downloads/ica/apps/web/components/forms/AddCommunityModal.tsx) interactive click-to-place pin dropper and submission flow.
- [x] **2.4 Community Markers & Inspector**: Circle marker layers color-coded by verification status with interactive feature inspector.
- [x] **7.1 Advanced Cartography & Immersion**:
  - 4-way Basemap Switcher (Dark Glassmorphic, High-Res Satellite Imagery, Topographic Physical Relief, Light Academic Cartography).
  - 3D View tilt perspective controls (pitch and bearing rotation).
  - Historical Georeferenced Administrative Survey Overlay with interactive opacity transparency slider (10%–100%).
  - Real-time River Basin & Waterway Proximity calculator (`@turf/turf` + Haversine) measuring distance to River Niger, Imo, Anambra, Urashi, and Cross rivers.
- [x] **7.2 Cultural & Archival Engine**:
  - Dialect Continuum Layers & Regional Clusters (Waawa/Northern, Central, Anioma/Western, Southern/Niger Delta, Cross River, and Anambra Basin).
  - Native Audio Pronunciation Player with Igbo tonal pitch synthesis and dialect greeting samples.
  - Traditional 4-Day Market Cycle (`Izu` — *Eke*, *Orie*, *Afọ*, *Nkwọ*) real-time calculator, seasonal festival calendars (*Emume Iwa Ji*, *Ofala*, *Ikeji*), and date converter.
  - Ancestral Kinship & Migration Arcs layer mapping ancient diaspora routes (Nri Hegemony, Aro Diaspora, Ezechima Migrations, Ikwerre Lineage).
- [x] **7.3 Smart UX & Disambiguation**:
  - Smart Name Disambiguation in autocomplete search comparing duplicate settlements across different LGAs and States side-by-side.
  - Dedicated "Culture" dashboard tab uniting the calendar, dialect explorer, and ancestral corridors.

---

## 3. Remaining Phases & Specific Tasks

### Phase 1 — Geography & Reference Layers (Next Immediate Phase)

> **Objective:** Set up the interactive web application and visualize Nigeria's administrative reference geography (States and LGAs) with performant rendering and layer controls.

#### Tasks to Complete:
- [ ] **1.1 Web App Foundation (`apps/web`)**
  - Initialize Next.js 14+ (App Router) with TypeScript and Tailwind CSS.
  - Install dependencies: `maplibre-gl`, `@types/maplibre-gl`, `lucide-react`, `clsx`, `tailwind-merge`.
  - Set up root layout, navigation bar, and dark/light responsive layout.
- [ ] **1.2 GeoJSON Processing & Normalization**
  - Create `scripts/normalize-geojson.mjs` to optimize source GeoJSON files (strip unnecessary metadata, reduce precision float size) for fast client rendering under `data/normalized/` or `apps/web/public/data/`.
  - Create database seeder script `scripts/seed-admin-geography.mjs` to insert the 37 states and 774 LGAs into PostgreSQL/PostGIS.
- [ ] **1.3 MapLibre Map Component**
  - Build `apps/web/components/map/MapContainer.tsx` centered over Nigeria (`zoom: ~6, center: [8.6753, 9.0820]`).
  - Add Vector/GeoJSON tile sources for States and LGAs.
  - Implement distinct styling: clean boundaries with hover states and tooltips displaying `admin1Name` / `admin2Name`.
- [ ] **1.4 Administrative Layer Controls**
  - Build `apps/web/components/map/LayerControls.tsx`.
  - Add toggles to independently enable/disable State boundaries and LGA boundaries.
  - Add visual distinction between administrative reference data and future community data.

---

### Phase 2 — Communities Layer & Spatial Placement

> **Objective:** Enable users to place community points on the map, resolve authoritative State/LGA using server-side PostGIS spatial queries, and display public community markers.

#### Tasks to Complete:
- [ ] **2.1 Server-Side Spatial Assignment Engine**
  - Implement API endpoint `POST /api/spatial/resolve-admin` taking `[longitude, latitude]`.
  - Run authoritative `ST_Covers(lgas.geom, ST_SetSRID(ST_Point(lon, lat), 4326))`.
  - Ensure client-supplied State/LGA inputs are strictly rejected or ignored.
  - Implement boundary ambiguity handling (if coordinates fall on a disputed/overlapping border, flag for user confirmation).
- [ ] **2.2 Public Communities GeoJSON API**
  - Implement `GET /api/map/communities.geojson`.
  - Return GeoJSON `FeatureCollection` of community points with properties: `id`, `name`, `type`, `identity_status`, `verification_status`.
  - Enforce privacy rule: Exclude contributor email, personal contact information, or private notes.
- [ ] **2.3 Interactive "Add Community" Flow**
  - Click-on-map coordinate picker or pin dropper with real-time latitude/longitude display.
  - Automatic lookup of detected State and LGA with fallback manual adjustment prompt if ambiguous.
  - Structured form:
    - Name (required)
    - Settlement Type (`village`, `town`, `city`, `settlement`, `community`, `historical_settlement`)
    - Nuanced Identity Status (`igbo`, `mixed`, `historically_igbo`, `igbo_associated`, `uncertain`, `disputed`, `not_igbo`)
    - Description & Language/Dialect notes (optional)
    - Evidence source attachment
- [ ] **2.4 Community Markers & Popups**
  - Render community markers on MapLibre with color-coded badges based on `verification_status` and `identity_status`.
  - Click popup showing community summary, administrative location, and link to detail page.

---

### Phase 3 — Governance & Verification Workflow

> **Objective:** Support community moderation, evidence submission, public confirmations, challenges, and audit trails.

#### Tasks to Complete:
- [ ] **3.1 Verification States Lifecycle**
  - Build status badge UI (`pending`, `under_review`, `verified`, `challenged`, `archived`).
  - New submissions default to `pending` with an explicit unverified banner.
- [ ] **3.2 Community Confirmations (`POST /api/communities/:id/confirm`)**
  - Enable authenticated users/contributors to confirm an existing community record with optional supporting notes.
- [ ] **3.3 Community Challenges (`POST /api/communities/:id/challenge`)**
  - Structured dispute submission form (requires reason, optional counter-evidence link).
  - Challenges flag the record as `challenged` with a dispute warning banner on the public map without deleting history.
- [ ] **3.4 Moderator Review Panel**
  - Restricted UI for moderators to inspect submissions, verify evidence, resolve challenges, or mark as archived.
- [ ] **3.5 Audit Trail (`community_revisions`)**
  - Record history of any substantive field modification (who changed what, old value vs new value, timestamp, reason).

---

### Phase 4 — Discovery, Search & Detail Pages

> **Objective:** Make all documented communities easily searchable, disambiguated, and documented with comprehensive detail pages.

#### Tasks to Complete:
- [ ] **4.1 Search & Disambiguation (`GET /api/communities?q=...`)**
  - Fast autocomplete search bar querying primary names and `community_aliases`.
  - Search results display LGA and State to disambiguate identical names (e.g., repeating village/town names).
- [ ] **4.2 Community Detail Page (`/communities/[id]`)**
  - Dynamic page displaying:
    - Community title, type, and geographic coordinates.
    - Containing LGA and State (clearly marked as administrative reference).
    - Identity status badge and verification status badge.
    - Primary description, language/dialect notes, and historical context.
    - Evidence list with sources and citation links.
    - List of community confirmations and active challenges.
    - Revision history log.
- [ ] **4.3 Alternative & Dialect Names (`community_aliases`)**
  - UI for viewing and contributing alternative spellings, historical names, and localized dialect pronunciations.

---

### Phase 5 — Derived Geography & Density Analysis

> **Objective:** Generate aggregate visualizations (density heatmaps, clusters) from verified community points without imposing artificial borders.

#### Tasks to Complete:
- [ ] **5.1 Community Density Layer (`GET /api/map/igbo-density.geojson`)**
  - Generate a regular grid or heatmap from approved community coordinates.
  - Label explicitly as *"Mapped Community Density"* (never as ethnic boundary).
  - Include disclaimer: *Unmapped areas do not indicate absence of communities.*
- [ ] **5.2 Spatial Clustering (DBSCAN / Turf.js)**
  - Group community clusters based on proximity thresholds.
  - Display cluster count chips on zoom-out levels.
- [ ] **5.3 Optional Derived Polygons (`GET /api/map/derived-area.geojson`)**
  - Generate experimental concave hull / alpha shapes around verified community clusters.
  - Label strictly as *"Derived from mapped communities — Analytical visualization only"*.

---

### Phase 6 — Hardening, Privacy, Testing & MVP Launch

> **Objective:** Ensure security, performance, privacy compliance, and complete MVP acceptance criteria.

#### Tasks to Complete:
- [ ] **6.1 Privacy & Safety Audits**
  - Verify that private user data (emails, personal residences, IP traces) is never exposed in any public API or GeoJSON endpoint.
  - Confirm community coordinates represent the settlement/center, not private residences.
- [ ] **6.2 Automated Test Suite (`tests/`)**
  - Spatial resolution unit tests (coordinates resolving to known LGAs/States).
  - API endpoint testing (`GET /api/communities`, `POST /api/communities`, validation errors).
  - Duplicate detection tests.
- [ ] **6.3 Mobile & Responsive Polish**
  - Ensure full responsiveness on smartphones and tablets for the map and contribution forms.
- [ ] **6.4 Production Build & Deployment Checklist**
  - Production build verification (`npm run build`).
  - Environment configuration validation against `.env.example`.

---

## 4. MVP Definition of Done Checklist

When the following criteria are met, the MVP is complete:
- [x] 37 states and 774 LGAs verified and mapped in reference schema.
- [ ] Administrative map renders with toggleable State and LGA layers.
- [ ] Contributor can add a community via map click and form submission.
- [ ] Backend derives State and LGA using PostGIS (`ST_Covers`).
- [ ] Identity status and verification status are strictly decoupled.
- [ ] Community evidence, confirmations, challenges, and revisions are logged.
- [ ] Search functions across community names and aliases with LGA disambiguation.
- [ ] Public GeoJSON endpoints protect contributor privacy.
- [ ] Density visualization is live and explicitly labeled as derived.
- [ ] UI displays the explicit disclaimer: *Missing mapped communities are not evidence of absence.*
