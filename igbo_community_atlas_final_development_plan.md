**IGBO COMMUNITY ATLAS**

**Final Development Plan & Implementation Specification**

*Source-of-truth engineering document • Version 1.0*

A community-driven geographic atlas for documenting Igbo communities in Nigeria, using administrative geography as reference data and community geography as the dynamic layer.

# **1\. Purpose and Status**

This document is the implementation source of truth for the Igbo Community Atlas. It converts the product concept and inspected geographic datasets into concrete engineering decisions, data structures, workflows, APIs, UI behavior, spatial rules, testing requirements, and delivery milestones.

Treat these decisions as binding unless a later version explicitly records a product or architecture change.

## **1.1 Core product statement**

The Atlas is a participatory, community-driven geographic database where people can add, describe, confirm, challenge, and document communities. The geographic picture of Igbo presence is derived from the underlying community dataset rather than imposed as a pre-drawn boundary.

## **1.2 Non-negotiable principles**

* Do not manually draw a final 'Igbo territory' and force communities to fit inside it.  
* States and LGAs are reference geography, not ethnicity datasets.  
* Do not infer ethnicity from surnames, personal names, GPS traces, social media, or other proxies.  
* Map communities, not individual people; minimize personal information.  
* Use nuanced identity states: igbo, mixed, historically\_igbo, igbo\_associated, uncertain, disputed, not\_igbo.  
* A missing mapped community is not evidence that an Igbo community does not exist there.  
* Verification status, identity status, and confidence are separate concepts.  
* Community claims require evidence and/or community confirmation; disputes remain in the audit trail.  
* The 'Igbo area' is derived visualization, never an official political or administrative boundary.  
* Server-side spatial logic is authoritative; client-supplied state/LGA values are never trusted.  
* Preserve the original source GeoJSON unchanged and import normalized copies into PostGIS.

# **2\. Scope**

## **2.1 MVP**

* Nigeria map with state and LGA boundaries.  
* Community database and public community markers.  
* Authenticated village/town/community contribution flow.  
* Map click-to-place workflow.  
* Automatic state/LGA detection from submitted coordinates.  
* Community search and detail pages.  
* Identity and verification statuses.  
* Evidence/source records.  
* Community confirmations and challenges.  
* Moderator/admin review workflow.  
* Basic mapped-community density visualization.  
* Audit history for substantive changes.

## **2.2 Later phases**

* Historical communities/maps; alternative names; photos; oral histories.  
* Language/dialect layers and traditional institutions.  
* Advanced duplicate detection and dispute tooling.  
* Spatial clustering and derived-area polygons.  
* LGA/state statistics, public API, GIS downloads.  
* WhatsApp contribution workflow and mobile app.

# **3\. Actual Geographic Data Baseline**

The supplied GeoJSON files are the initial authoritative reference geography.

| Dataset | Features | Geometry | Coordinate system | Primary code |
| :---- | :---- | :---- | :---- | :---- |
| Nigeria states | 37 | MultiPolygon | WGS84 / CRS84 (EPSG:4326 semantics) | admin1Pcod |
| Nigeria LGAs | 774 | MultiPolygon | WGS84 / CRS84 (EPSG:4326 semantics) | admin2Pcod |

* State codes are unique (for example NG001). LGA codes are unique (for example NG001001).  
* Each LGA contains admin1Pcod/admin1Name for its parent state.  
* LGA names repeat across states; names are not identifiers.  
* Geometries are valid MultiPolygons.  
* Shape\_Area and Shape\_Leng are geographic-coordinate measurements and must not be treated as metric area/length.  
* Minor floating-point boundary differences can occur; use robust predicates and explicit ambiguity handling.

## **3.1 Source files**

* data/source/nigeria\_state\_boundaries.geojson  
* data/source/nigeria\_lga\_boundaries.geojson

# **4\. Technical Architecture**

| Layer | Technology / responsibility |
| :---- | :---- |
| Web | Next.js \+ TypeScript \+ React |
| Map | MapLibre GL JS |
| Styling | Tailwind CSS |
| API | Node/TypeScript |
| Database | PostgreSQL \+ PostGIS |
| Spatial analysis | PostGIS; Turf.js where useful |
| Authentication | Secure standard auth provider |
| Object storage | S3-compatible storage |
| Hosting | Managed application hosting \+ managed PostgreSQL/PostGIS |

PostGIS is authoritative for administrative assignment and server-side spatial queries. The browser may preview locations, but it must not decide the authoritative state or LGA.

# **5\. Repository Structure**

apps/web/

  app/

  components/map/

  components/communities/

  components/forms/

  lib/

database/migrations/

database/seeds/

scripts/

data/source/

data/normalized/

docs/

tests/

# **6\. Database Specification**

## **6.1 Administrative tables**

states: id UUID PK; admin1\_pcod UNIQUE; name; reference\_name; alternate\_name; admin0\_pcod; admin0\_name; source\_date; valid\_on; valid\_to; shape\_length; shape\_area; geom geometry(MultiPolygon,4326); created\_at; updated\_at.

lgas: id UUID PK; admin2\_pcod UNIQUE; name; reference\_name; alternate\_name; state\_id FK; admin1\_pcod; admin0\_pcod; admin0\_name; source\_date; valid\_on; valid\_to; shape\_length; shape\_area; geom geometry(MultiPolygon,4326); created\_at; updated\_at.

Add GiST indexes on both geometry columns and a B-tree index on lgas.state\_id.

## **6.2 Communities**

| Field | Type | Rule |
| :---- | :---- | :---- |
| id | UUID | Primary key |
| name | TEXT | Required |
| type | ENUM/TEXT | village, town, city, settlement, community, historical\_settlement |
| description | TEXT | Optional |
| location | Point 4326 | Required |
| state\_id / lga\_id | UUID | Derived by server |
| identity\_status | ENUM/TEXT | Nuanced identity classification |
| language\_status | TEXT | Optional |
| historical\_status | TEXT | Optional |
| verification\_status | ENUM/TEXT | pending, under\_review, verified, challenged, archived |
| confidence | NUMERIC | Separate from identity/verification |
| submitted\_by | UUID | Contributor |
| created\_at / updated\_at | TIMESTAMPTZ | Audit timestamps |

## **6.3 Supporting tables**

* users — authentication identity, display name, role, account status.  
* community\_aliases — alternative, historical and language-specific names.  
* community\_evidence — source type, citation/URL, description, submitter and review state.  
* community\_confirmations — confirmations with timestamps.  
* community\_challenges — objections, evidence and resolution.  
* community\_revisions — before/after change records.  
* community\_photos — optional images plus rights/attribution metadata.  
* community\_sources — normalized external source records where useful.

## **6.4 Controlled vocabularies**

* Types: village, town, city, settlement, community, historical\_settlement.  
* Identity: igbo, mixed, historically\_igbo, igbo\_associated, uncertain, disputed, not\_igbo.  
* Verification: pending, under\_review, verified, challenged, archived.  
* Evidence: community\_submission, community\_confirmation, academic\_source, historical\_source, linguistic\_source, government\_source, archival\_source, oral\_history, other.

# **7\. Spatial Rules**

## **7.1 Administrative assignment**

When a community coordinate is submitted, the server derives the containing LGA and state with PostGIS ST\_Covers. The client must not provide authoritative state/LGA IDs.

**Canonical query:**

SELECT l.id AS lga\_id, l.name AS lga\_name,  
       s.id AS state\_id, s.name AS state\_name  
FROM lgas l  
JOIN states s ON s.id \= l.state\_id  
WHERE ST\_Covers(  
  l.geom,  
  ST\_SetSRID(ST\_Point(:longitude, :latitude), 4326\)  
)  
LIMIT 1;

## **7.2 Boundary ambiguity**

* If multiple polygons qualify, return an ambiguity result instead of silently choosing one.  
* Allow the contributor to confirm/move the point.  
* Use a documented tolerance strategy for points very near shared boundaries.  
* Log ambiguous assignments for quality control.

## **7.3 Analytical CRS**

Distance, buffers, metric clustering and area calculations require an appropriate projected CRS. EPSG:32632 was used only as an initial analytical test and must be validated for the full Nigeria extent before production.

# **8\. Contribution Workflow**

1. User opens Add Community.  
2. User searches/selects a location.  
3. Browser sends longitude/latitude to the server.  
4. Server validates coordinates and derives state/LGA.  
5. User enters name, type, identity classification, description and evidence.  
6. Server creates the record with verification\_status \= pending.  
7. Submission appears publicly with a clear pending/unverified label.  
8. Moderators/trusted reviewers inspect evidence.  
9. Other community members can confirm or challenge.  
10. Record becomes verified, remains pending, becomes challenged, or is archived.  
11. Substantive changes create audit/revision records.

The form must clarify that contributors are documenting a community, not declaring the identity of individual residents, and that the record is not an official government boundary.

# **9\. Verification and Governance**

| Status | Meaning | Public behavior |
| :---- | :---- | :---- |
| pending | New submission | Visible with pending badge |
| under\_review | Active review | Visible with review badge |
| verified | Accepted under project rules | Full public marker/detail |
| challenged | Substantive dispute | Visible with dispute warning |
| archived | Removed from active map, history retained | Hidden by default |

* Never silently change verification status; record actor, time and reason.  
* A challenge does not automatically delete a record.  
* Evidence and confirmations are visible at an appropriate public level.  
* Moderators can review, verify, challenge, merge duplicates, archive and restore.

# **10\. API Contract**

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| GET | /api/communities | List/filter communities |
| GET | /api/communities/:id | Community detail |
| POST | /api/communities | Create submission |
| POST | /api/communities/:id/confirm | Confirm |
| POST | /api/communities/:id/challenge | Challenge |
| GET | /api/map/communities.geojson | Public community FeatureCollection |
| GET | /api/map/igbo-density.geojson | Derived density/grid |
| GET | /api/map/derived-area.geojson | Optional derived area |

## **10.1 Create-community contract**

Required: name, type, longitude, latitude, identity\_status. Optional: description, language\_status, historical\_status, evidence, aliases and photos. Client state\_id/lga\_id values are rejected or ignored; the server derives them.

Public GeoJSON endpoints must exclude contributor email, private moderation notes and sensitive evidence metadata.

# **11\. Frontend Specification**

* MapLibre map with state, LGA, community, density and optional derived-area layers.  
* Independent layer controls.  
* Community markers/popups showing name, type, state, LGA, identity and verification status.  
* Search across community names and aliases.  
* Community detail pages with evidence/confirmation/challenge state.  
* Add Community control with map placement and structured contribution form.

## **11.1 Map hierarchy**

Visually distinguish administrative geography, community geography, and analytical/derived geography. These layers represent different kinds of truth and must not be conflated.

# **12\. Derived Igbo Geography**

Do not maintain a manually drawn modern 'Igbo boundary' as the source of truth.

## **12.1 Density**

* Start with a heatmap or regular grid from approved/verified community points.  
* Optionally weight by verification/confidence only when the methodology is documented.  
* Label it 'Mapped community density'.  
* Never interpret low density as absence.

## **12.2 Clustering**

* Use DBSCAN/HDBSCAN for analytical exploration.  
* Make parameters configurable and reproducible.  
* Use an appropriate projected CRS.  
* Clustering summarizes mapped records; it does not determine identity.

## **12.3 Derived polygons**

* Optionally generate an alpha shape/concave hull around qualifying verified clusters.  
* Require a minimum data threshold.  
* Keep isolated verified communities visible as points.  
* Label the result 'Derived from mapped communities'.  
* Never label it 'Official Igbo boundary'.

# **13\. Search and Duplicate Handling**

* Names are not unique identifiers.  
* Search primary names and aliases.  
* Use state/LGA context for disambiguation.  
* Potential duplicates combine name similarity, proximity and administrative context.  
* Potential duplicates go to review rather than automatic merge.  
* Merges preserve evidence, aliases, confirmations and revision history.

# **14\. Privacy and Safety**

* Collect only community-level information necessary for the atlas.  
* Do not expose contributor email or private moderation notes.  
* Do not infer ethnicity of individuals.  
* Do not publish contributors' private residential locations.  
* Community coordinates should represent the settlement/community, not a contributor's home.  
* Photos require rights/permission metadata.  
* Provide correction/reporting mechanisms.

# **15\. Testing and Acceptance Criteria**

## **15.1 Data tests**

* 37 state features imported; 774 LGA features imported.  
* State admin1\_pcod values unique; LGA admin2\_pcod values unique.  
* Every LGA references an existing state.  
* All geometries valid and SRID 4326\.  
* Source counts/identifiers reproducible from supplied files.

## **15.2 Spatial tests**

* Known coordinates resolve to correct state/LGA.  
* Ambiguous boundary points are not silently assigned.  
* Client cannot force state/LGA.  
* Invalid coordinate ranges are rejected.  
* Spatial indexes exist and are used.

## **15.3 Application tests**

* Contributor can submit a community end-to-end.  
* Pending status is visible.  
* Moderator can verify.  
* Users can confirm/challenge.  
* Challenges preserve history.  
* Edits create revisions.  
* Public APIs omit private fields.  
* Map layers toggle independently.  
* Search handles aliases and duplicate names.

# **16\. Action Plan and Milestones**

| Phase | Deliverables | Exit condition |
| :---- | :---- | :---- |
| 0 — Foundation | Repo, env, database, source GeoJSON, migrations | App connects to PostGIS; migrations clean |
| 1 — Geography | Import states/LGAs, map rendering, layer controls | Administrative map matches sources |
| 2 — Communities | Schema, add form, spatial assignment, markers | Community can be created/viewed |
| 3 — Governance | Auth, verification, confirmations, challenges, revisions | Review lifecycle works |
| 4 — Discovery | Search, aliases, community pages, filters | Users can discover records |
| 5 — Derived map | Density, clustering, optional derived area | Derived outputs reproducible/labeled |
| 6 — Hardening | Tests, performance, security, privacy, backups, monitoring | MVP acceptance criteria pass |

## **16.1 Immediate action checklist**

12. Create the repository using this document as the implementation contract.  
13. Copy both supplied GeoJSON files unchanged into data/source/.  
14. Create PostGIS migrations for administrative, community, evidence, governance and media tables.  
15. Build and test the administrative import script using admin1Pcod/admin2Pcod as identifiers.  
16. Validate geometry and state/LGA relationships.  
17. Implement server-side ST\_Covers assignment.  
18. Build the MapLibre administrative map.  
19. Build the community submission form/API.  
20. Add public community markers and detail pages.  
21. Implement authentication and contributor roles.  
22. Implement moderation, verification, confirmations, challenges and revisions.  
23. Implement search and aliases.  
24. Implement mapped-community density.  
25. Add automated data/spatial/API/frontend tests.  
26. Run an MVP review with real community submissions before adding advanced derived geography.

# **17\. Environment and Deployment**

* DATABASE\_URL — PostgreSQL/PostGIS connection.  
* AUTH configuration — provider secrets and callbacks.  
* OBJECT\_STORAGE configuration — bucket/region/credentials as required.  
* MAP configuration — MapLibre style/source configuration.  
* PUBLIC\_APP\_URL — canonical application URL.  
* Optional monitoring/error-reporting credentials.

Secrets belong in the hosting provider's secret manager/environment system and never in source control.

# **18\. Change Control**

* Identity vocabulary changes require product/governance review.  
* Administrative source changes require a new source-data version and import record.  
* Clustering/derived-area parameter changes must be reproducible and documented.  
* Privacy behavior changes require explicit review.  
* No ethnicity-inference mechanism may be introduced to fill missing data.  
* Do not turn derived community geography into an authoritative ethnic boundary without a separate governance decision.

# **19\. MVP Definition of Done**

* 37 states and 774 LGAs imported and spatially indexed.  
* Administrative map renders correctly.  
* Contributor can add a community.  
* Backend derives state/LGA.  
* Identity and verification are separate.  
* Evidence, confirmations, challenges and revisions are stored.  
* Moderators can review and resolve submissions.  
* Public map protects private contributor information.  
* Search and community pages work.  
* Density visualization works and is labeled as derived.  
* Automated tests cover integrity, spatial assignment, permissions, APIs and core UI flows.  
* UI explicitly states that unmapped areas are not evidence of absence.

# **20\. Final Geographic Architecture**

| Layer | Source of truth | Purpose |
| :---- | :---- | :---- |
| Administrative | Supplied state/LGA GeoJSON imported into PostGIS | Reference geography and spatial assignment |
| Community | Community database | Primary participatory record of settlements/communities |
| Derived | Algorithms over community data | Density, clusters and exploratory/derived patterns |

Administrative geography does not determine ethnic identity. The community layer contains claims and evidence. The derived layer summarizes the community layer and must never be mistaken for an official political boundary.

# **21\. Final Product Principle**

**Do not draw the final map and ask communities to fit into it. Build the community database first, let communities contribute their own geographic and cultural knowledge, and let the larger geographic picture emerge transparently from the accumulated evidence.**

*End of source-of-truth development plan*