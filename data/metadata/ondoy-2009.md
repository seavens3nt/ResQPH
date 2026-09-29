# Dataset: Typhoon Ondoy 2009 flood extent (Metro Manila)

## Source

- **Dataset:** Global Flood Database v1
- **Producer:** Cloud to Street / NASA JPL / Columbia University
- **Access point:** Google Earth Engine
- **Collection ID:** `GLOBAL_FLOOD_DB/MODIS_EVENTS/V1`
- **Event ID:** 3552
- **Event date:** 2009-09-30

## Purpose in ResQPH

Serves as the labeled target (`flooded_ondoy_2009`) for the external ML
experiment under `ml/external-experiments/ondoy-2009-metro-manila/`. It is
not used by backend or routing code. The experiment is preserved as evidence
per decision D-020.

## Coverage

- **Original resolution:** 250 m (MODIS-derived)
- **Bounding box (WGS 84):** west 120.90, south 14.35, east 121.15, north 14.80
- **Raster shape:** 202 rows x 112 columns (GeoTIFF, uint8, values {0, 1})

## Method

1. Query Google Earth Engine for `GLOBAL_FLOOD_DB/MODIS_EVENTS/V1`.
2. Filter events intersecting the Metro Manila bbox in Sep-Oct 2009.
3. Identified event ID 3552 (2009-09-30).
4. Export as GeoTIFF at native 250 m resolution.
5. Sample the raster at each OSM road-segment midpoint to produce a binary
   `flooded_ondoy_2009` column.

## Result

- **Flooded pixels in raster:** 3,498 of 22,624 (15.46%)
- **Flooded road segments:** 520 of 148,495 (0.35%)
- The gap between pixel- and road-level rates is expected: MODIS pixels are
  coarse and a road midpoint may land on the dry fraction of a partially
  flooded cell.

## License

- MODIS data is free for academic and non-commercial use.
- Cloud To Street / GFD code is open source under a permissive license.
- Attribute this dataset in any publication: "Global Flood Database v1
  (Tellman et al., 2021)".

## Known limitations

- **Resolution:** 250 m misses street-level flooding.
- **Temporal:** single snapshot (2009-09-30). The full flood duration is not captured.
- **Urban bias:** rooftops and impervious surfaces can produce false negatives.
- **Provenance:** the Metro Manila subset has not been ground-truthed in this project.

## References

- Tellman, B., et al. (2021). Nature, 596, 80-86.
- `ml/external-experiments/ondoy-2009-metro-manila/README.md`
- Decisions D-019, D-020 in `docs/decisions/DECISION_LOG.md`
