# Team Phase 1 map acceptance evidence

**Feature owner:** Elle (`@Qiuyuan26`)

**Acceptance owner:** Ranee (`@seavens3nt`)

**Scope:** Issue #34 fixture-driven road and controlled-flood map layers

**Verified baseline:** merged PR #42 at `125718e`, plus this acceptance-evidence branch

**Verified:** 2026-10-02

## Current acceptance result

The frontend consumes the checked-in files below directly through the map-data adapter:

- `data/samples/road-edge.example.geojson`
- `data/samples/flood-scenario.example.geojson`
- `data/samples/study-area.geojson`

The adapter rejects malformed geometry, out-of-bound coordinates, duplicate edge IDs, unsupported live-source labels, and mismatched study-area IDs. It preserves GeoJSON `[longitude, latitude]` input and converts it to Leaflet `[latitude, longitude]` only at the rendering boundary.

The component exposes deterministic success, loading, empty, malformed, and unavailable states. Its visible metadata identifies the controlled or historical scenario, includes its source timestamp, and says that the data is not live PAGASA forecasting or official emergency dispatch.

## Visual evidence

The screenshots were captured from the local production-compatible Vite application using the checked-in sample fixtures.

![Fixture-driven U-Belt road and flood map](evidence/team-phase-01-map/map-success.png)

![Accessible road and flood text alternative](evidence/team-phase-01-map/map-text-alternative.png)

Screenshots support visual review only. The repeatable automated checks below remain the authoritative functional evidence.

## Reproducible checks

From `frontend`:

```powershell
npm ci
npm run lint
npm test -- --run
npm run build
```

Verified results on 2026-10-02:

- lint completed with no errors and four pre-existing warnings outside the map package;
- `11` test files and `128` tests passed;
- the TypeScript and Vite production build passed; and
- browser verification found meaningful content, no Vite error overlay, visible non-live labeling, working Hazard Map navigation, and a working accessible text alternative.

The map tests read the repository fixtures instead of copying their edge IDs, counts, or coordinates into test constants. When Issue #32 replaces the sample files with the authoritative bounded U-Belt fixtures, the same tests therefore become the frontend compatibility gate.

## Dependency boundary

Issue #32 remains the source of the authoritative bounded U-Belt road graph and controlled-flood join. This evidence does not claim that work is complete. After #32 is merged, Ranee must run the commands above on the resulting `main` revision and record the commit and results here before closing the Team Phase 1 gate.

No live forecast, guaranteed-safe route, government integration, or operational emergency-readiness claim is made.
