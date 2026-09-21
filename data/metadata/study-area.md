# U-Belt pilot study area

**Decision owner:** Ranee
**Status:** Approved project boundary
**Approved:** 2026-09-22
**CRS:** WGS 84 (`EPSG:4326`)

## Operational definition

ResQPH uses a project-defined rectangular pilot boundary around the core University Belt area in the City of Manila. “U-Belt” is a commonly used, de facto place name rather than an official administrative unit, so the rectangle below is the authoritative application boundary for extraction, validation, routing, fixtures, and demonstrations.

| Edge | Decimal degrees |
|---|---:|
| West longitude | `120.982000` |
| South latitude | `14.596000` |
| East longitude | `121.004000` |
| North latitude | `14.617500` |

GeoJSON coordinate order is longitude, latitude. The machine-readable fixture is [`../samples/study-area.geojson`](../samples/study-area.geojson).

## Why this boundary

- It contains the core España–Recto–Legarda/Mendiola university corridor used by the prototype.
- It contains representative locations around UST, FEU, National University, and Centro Escolar University while remaining small enough for one curated road graph.
- It provides an unambiguous clipping box even though public descriptions of “U-Belt” vary.
- It is suitable for controlled and historical scenario demonstrations; it is not a claim about an official district boundary.

FEU Institute of Technology describes its U-Belt vicinity using España Boulevard, Quezon Boulevard, and C. M. Recto Avenue. OpenStreetMap/Nominatim place checks were used only to confirm that the selected box contains representative campuses; OpenStreetMap data remain subject to ODbL attribution requirements.

## Rules

- Reject or clearly flag rescue coordinates outside this boundary in the prototype.
- Clip the OSM road graph and scenario layers to this boundary plus only the smallest documented processing buffer needed to avoid edge truncation.
- Do not expand this box silently. A boundary change requires a decision-log entry and updated fixtures/tests.
- Do not describe this boundary as an official government, barangay, hazard, or emergency-service boundary.

## Sources and limitations

- [FEU Institute of Technology vicinity map](https://feutech.edu.ph/about-us/vicinity-map/) — supports the España/Quezon/Recto U-Belt reference.
- [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright) — required attribution and ODbL terms for road data.
- Coordinate spot checks accessed 2026-09-22 through OpenStreetMap Nominatim.

The rectangle is an academic scope control. It does not establish hazard accuracy, passability, jurisdiction, response coverage, or safety.
