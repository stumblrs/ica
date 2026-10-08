# Project Foundations & Architecture Overview

## Repository Layout (Per Section 5 of Specification)

```
ica/
├── apps/
│   └── web/                   # Next.js 14+ application
│       ├── app/               # App Router pages and API routes
│       ├── components/
│       │   ├── map/           # MapLibre GL components & layer controllers
│       │   ├── communities/   # Markers, cards, list, and detail components
│       │   └── forms/         # Community addition & verification forms
│       └── lib/
│           └── types.ts       # Canonical TypeScript domain types
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # PostGIS schema (States, LGAs, Communities, Evidence, Governance)
│   └── seeds/
├── data/
│   ├── source/                # Source GeoJSON files (Nigeria states & LGAs)
│   └── normalized/            # Optimized/indexed spatial cache
├── scripts/
│   └── validate-geojson.mjs   # Data integrity test suite for 37 States & 774 LGAs
├── docs/                      # Engineering and research documents
├── tests/                     # Automated testing suites
├── .env.example               # Environment variables specification
├── .gitignore
├── package.json               # Root monorepo workspace configuration
└── igbo_community_atlas_final_development_plan.md # Binding specification
```

## Data Baseline Verification

Running `npm run validate:data`:
- **States**: 37 unique `admin1Pcod` codes (36 states + FCT), valid `MultiPolygon` geometries.
- **LGAs**: 774 unique `admin2Pcod` codes, all correctly referencing existing parent states.
- Source CRS: WGS84 (`CRS84` / EPSG:4326).
