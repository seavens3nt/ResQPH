# Phase 1 dataset register

**Status:** Candidate sources under validation
**Study area:** Project-defined U-Belt pilot area, City of Manila
**Last updated:** 2026-09-22

No dataset in this register is approved for application use until its access, exact coverage, metadata, license or restriction, coordinate reference system, and sample quality have been inspected.

| ID | Intended use | Candidate source | Verified source facts | Current decision |
|---|---|---|---|---|
| DS-001 | Road graph and road attributes | [OpenStreetMap](https://www.openstreetmap.org/copyright) through a documented OSMnx or Overpass extraction | OSM data are offered under ODbL and require attribution to OpenStreetMap contributors. Adapted or redistributed database use must follow the license. | Accepted for bounded extraction testing; not yet processed |
| DS-002 | Flood-hazard context | [Geoportal Philippines](https://geoportal.gov.ph/) flood-hazard layers | The portal lists flood-hazard layers, including a 1:10,000 layer. Availability for viewing does not by itself establish download or redistribution permission. | Candidate; access, agency metadata, coverage, and restrictions must be verified |
| DS-003 | Flood-hazard metadata inventory | [Geoportal Philippines data inventory](https://www.geoportal.gov.ph/gpresources/GP_DataInventory.pdf) | The inventory records uploaded hazard-related layers and data-restriction fields. | Candidate metadata reference; inspect the exact selected layer |
| DS-004 | Elevation sensitivity investigation | [USGS SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm) | USGS distributes SRTM global elevation data through EarthExplorer; the 1-arc-second product is approximately 30 m. | Candidate only; resolution may be too coarse for street-level safety claims |
| DS-005 | Study-area scope reference | [FEU Institute of Technology vicinity map](https://feutech.edu.ph/about-us/vicinity-map/) and the team-authored [`study-area.geojson`](../../data/samples/study-area.geojson) | FEU describes its U-Belt vicinity using España Boulevard, Quezon Boulevard, and C. M. Recto Avenue. Public descriptions vary, so ResQPH uses its own explicit WGS 84 rectangle. | Project boundary approved; not an official administrative or hazard boundary |
| DS-006 | Reproducible test and demo conditions | Team-authored controlled flood-scenario fixture | Synthetic scenario data may be versioned when clearly marked simulated and contains no private records. | Required; schema awaits routing-contract approval |

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

## Current blockers

1. The selected Geoportal flood layer’s downloadable access and redistribution terms are not yet verified.
2. No sample has yet demonstrated a reliable join between flood information and OSM road edges.
3. The approved boundary has not yet been used in a reproducible OSM extraction with recorded graph statistics.
4. SRTM resolution may support contextual elevation only, not road-level safety conclusions.
5. Historical scenario dates and source interpretation still require approval.

## Safety rule

Hazard and elevation data are inputs to a controlled academic scenario. They must not be labeled live, current, guaranteed accurate, or sufficient for real navigation decisions.
