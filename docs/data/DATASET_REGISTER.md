# Phase 1 dataset register

**Status:** Phase 1 source decisions completed; implementation acquisition remains later work
**Study area:** Project-defined U-Belt pilot area, City of Manila
**Last updated:** 2026-09-22

The road source and controlled scenario schema are approved for the MVP. Optional historical/elevation sources remain excluded from required behavior until a later PR provides their exact metadata and evidence.

| ID | Intended use | Candidate source | Verified source facts | Current decision |
|---|---|---|---|---|
| DS-001 | Road graph and road attributes | [OpenStreetMap](https://www.openstreetmap.org/copyright) through documented OSMnx/Overpass extraction | ODbL and attribution requirements recorded. The approved boundary returned 1,781 candidate motorized highway ways and 5,001 referenced nodes in the 2026-09-22 feasibility query. | Accepted; exact query and limitations in [`road-network.md`](../../data/metadata/road-network.md) |
| DS-002 | Guaranteed flood-hazard input | Team-authored controlled scenario fixture | Schema, join rule, source/time disclosure, and safety limitation are recorded. | Accepted as the mandatory MVP source; see [`flood-hazard.md`](../../data/metadata/flood-hazard.md) |
| DS-003 | Optional historical flood context | [Geoportal Philippines data inventory](https://www.geoportal.gov.ph/gpresources/GP_DataInventory.pdf) | The inventory records uploaded hazard-related layers and restriction fields, but a viewed layer is not automatically cleared for redistribution. | Optional enrichment only; controlled source remains authoritative unless exact layer evidence is accepted |
| DS-004 | Optional elevation context | [USGS SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm) | The global product is approximately 30 m. | Excluded from required edge cost; decision in [`elevation.md`](../../data/metadata/elevation.md) |
| DS-005 | Study-area scope reference | [FEU Institute of Technology vicinity map](https://feutech.edu.ph/about-us/vicinity-map/) and the team-authored [`study-area.geojson`](../../data/samples/study-area.geojson) | FEU describes its U-Belt vicinity using España Boulevard, Quezon Boulevard, and C. M. Recto Avenue. Public descriptions vary, so ResQPH uses its own explicit WGS 84 rectangle. | Project boundary approved; not an official administrative or hazard boundary |
| DS-006 | Reproducible test and demo conditions | Team-authored controlled flood-scenario and known-graph fixtures | Synthetic records are explicitly marked and contain no private data. | Accepted for contracts and implementation tests |

## Required validation fields

For every source selected after evaluation, record:

- Publisher and authoritative metadata page
- Direct access method and access date
- License, attribution, redistribution restriction, and required notice
- Geographic and temporal coverage
- Data collection or publication period
- CRS, format, resolution or scale, and important fields
- File size and whether the data stay outside Git
- Processing and clipping steps
- Stable join key or method for association with road edges
- Missingness, positional uncertainty, age, and known limitations
- Exact intended use and prohibited claim

## Phase 1 validation outcome

1. The U-Belt boundary and road-source availability are verified at feasibility level with a reproducible Overpass query.
2. The controlled flood fixture joins to the road fixture through `edge-demo-001` and declares scenario/source time.
3. The controlled scenario is the guaranteed MVP source, removing Geoportal access/licensing as a blocker.
4. SRTM is excluded from required routing because its resolution does not justify street-level conclusions.
5. Full OSM graph generation, optional external acquisition, transformation code, and runtime tests remain implementation outputs—not missing Phase 1 decisions.

## Safety rule

Hazard and elevation data are inputs to a controlled academic scenario. They must not be labeled live, current, guaranteed accurate, or sufficient for real navigation decisions.
