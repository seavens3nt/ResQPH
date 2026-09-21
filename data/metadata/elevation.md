# Elevation data decision

**Decision:** Excluded from the required MVP routing cost

**Status:** Completed Phase 1 foundation decision

**Decision date:** 2026-09-22

## Rationale

The available [USGS SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm) product is approximately 30 metres in resolution. That can support broad terrain context but is not sufficient evidence for precise street-level passability or safety claims in the dense U-Belt study area.

Elevation is therefore optional contextual or experimental information. The deterministic MVP must work with road, controlled flood level, passability, scenario age, and rule-based penalties alone.

## Later-use requirements

If elevation is evaluated later, the contributor must record source tile, acquisition date, CRS, vertical reference, resolution, resampling method, road-edge aggregation method, missingness, and uncertainty. The UI and report must not describe the resulting value as a precise street elevation or guaranteed flood-depth predictor.

Removing elevation from required routing inputs is not a missing feature; it is the approved fallback for insufficient street-level evidence.
