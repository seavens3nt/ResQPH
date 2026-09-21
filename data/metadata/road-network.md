# Road-network source and extraction evidence

**Decision:** Accepted Phase 1 road source

**Source:** OpenStreetMap contributors

**Access method:** Overpass API for feasibility; OSMnx `graph_from_bbox` for the implementation pipeline

**License:** Open Database License (ODbL); attribution to OpenStreetMap contributors is required

**Study area:** `ubelt-pilot-v1` in WGS 84

**Validation date:** 2026-09-22

## Approved extraction boundary

| Direction | Coordinate |
|---|---:|
| South | `14.596000` |
| West | `120.982000` |
| North | `14.617500` |
| East | `121.004000` |

The authoritative polygon is [`../samples/study-area.geojson`](../samples/study-area.geojson). GeoJSON remains longitude, latitude; the Overpass bounding-box order is south, west, north, east.

## Feasibility result

The following candidate motorized-road query completed successfully against `https://overpass-api.de/api/interpreter` on 2026-09-22:

```overpass
[out:json][timeout:90];
way
  ["highway"]
  ["highway"!~"footway|path|cycleway|steps|pedestrian|construction|proposed|raceway|bridleway|corridor|elevator|platform"]
  (14.596,120.982,14.6175,121.004);
(._;>;);
out count;
```

Returned feasibility counts:

| Element | Count |
|---|---:|
| Candidate highway ways | 1,781 |
| Referenced nodes | 5,001 |
| Total returned elements counted | 6,782 |

These are Overpass source-element counts, not a final NetworkX graph size. OSMnx may simplify intersections, split directed edges, apply access rules, and produce different node/edge counts. The implementation PR must record its final graph statistics and extraction timestamp.

## Reproducible implementation rule

Team Phase 1 will use OSMnx 2.x with `network_type="drive"`, retain all components only when justified, project the working graph to an appropriate local metric CRS for distance processing, and export the final client geometry in WGS 84. The extraction code must use the approved boundary file rather than a place-name geocoder.

Each directed edge receives a stable project identifier derived from the extraction version plus OSM `u`, `v`, and `key`, for example:

```text
ubelt-v1:<u>:<v>:<key>
```

The pipeline must preserve the underlying OSM way identifier separately because graph simplification can change project edges across extraction versions.

## Required retained attributes

- `edge_id`, OSM way ID, `u`, `v`, and `key`
- geometry and length in metres
- normalized road class
- one-way/access information
- baseline speed assumption and travel time
- source timestamp and extraction version
- flood/scenario join fields added only by the controlled processing pipeline

## Limitations

- OpenStreetMap completeness and access tags can change.
- A successful count query proves availability and manageable scope, not routing correctness.
- No road is guaranteed passable or safe because it appears in OSM.
- Raw extracts and generated graphs remain outside ordinary Git; metadata, scripts, and small fixtures are committed.

## Attribution

Application maps, documentation, and demonstrations using OSM-derived data must display: `© OpenStreetMap contributors` and link to [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright).
