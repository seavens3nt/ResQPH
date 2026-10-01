"""
Reproducible U-Belt graph build.

Usage (from repository root):
    python routing/scripts/build_ubelt_graph.py
    python routing/scripts/build_ubelt_graph.py --force

Runs extract, normalize, flood-join, and validate stages of the Team
Phase 1 pipeline. Writes:
    data/interim/ubelt-v1-graph.graphml       full graph (gitignored)
    data/processed/ubelt-v1-edges.geojson     full joined edges (gitignored)
    data/samples/ubelt-v1-flood-join.geojson  small committed scenario
    data/samples/ubelt-v1-preview.geojson     small committed joined fixture
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROUTING_ROOT = _HERE.parents[1]
_SRC = _ROUTING_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import osmnx as ox  # noqa: E402

from resqph_routing import config  # noqa: E402
from resqph_routing.extract import (  # noqa: E402
    extract_osm_graph,
    graph_stats,
    load_study_area_polygon,
)
from resqph_routing.flood_join import (  # noqa: E402
    build_sample_scenario,
    join_scenario_to_edges,
)
from resqph_routing.normalize import (  # noqa: E402
    normalize_edges,
    normalize_nodes,
    to_contract_frame,
)
from resqph_routing.validate import validate_edges  # noqa: E402

logger = config.get_logger("build_ubelt_graph")

SAMPLE_SCENARIO_COUNT = 10
SAMPLE_FIXTURE_EDGE_COUNT = 30


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the U-Belt OSM road graph.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore the raw cache and re-download from Overpass.",
    )
    args = parser.parse_args()

    logger.info("=== ResQPH U-Belt graph build ===")

    # ---- Extract --------------------------------------------------------
    try:
        raw_graph = extract_osm_graph(force=args.force)
    except Exception as exc:
        logger.error("Extraction failed: %s", exc)
        return 1

    raw_stats = graph_stats(raw_graph)
    logger.info("--- Raw extraction statistics ---")
    for key, value in raw_stats.items():
        logger.info("  %-30s %d", key, value)

    # ---- Normalize ------------------------------------------------------
    # `edges` carries the full schema including `extraction_version`, which
    # validation needs. The contract-only projection happens at export time.
    try:
        edges = normalize_edges(raw_graph)
        nodes = normalize_nodes(raw_graph)
    except Exception as exc:
        logger.error("Normalization failed: %s", exc)
        return 1

    logger.info("--- Normalized statistics ---")
    logger.info("  nodes                          %d", len(nodes))
    logger.info("  edges                          %d", len(edges))
    logger.info("  unique edge_id                 %d", edges["edge_id"].nunique())
    logger.info(
        "  duplicate edge_id              %d",
        len(edges) - edges["edge_id"].nunique(),
    )
    logger.info(
        "  road_class distribution        %s",
        edges["road_class"].value_counts().to_dict(),
    )

    # ---- Build sample scenario (deterministic, matches first N edges) ---
    scenario_dict = build_sample_scenario(edges, count=SAMPLE_SCENARIO_COUNT)
    sample_scenario_path = config.SAMPLE_FLOOD_FIXTURE
    sample_scenario_path.parent.mkdir(parents=True, exist_ok=True)
    with sample_scenario_path.open("w", encoding="utf-8") as f:
        json.dump(scenario_dict, f, indent=2)
    logger.info("Wrote sample scenario to %s", sample_scenario_path)

    # ---- Join scenario to edges -----------------------------------------
    try:
        joined, report = join_scenario_to_edges(edges, sample_scenario_path)
    except Exception as exc:
        logger.error("Flood join failed: %s", exc)
        return 1

    logger.info("--- Flood join report ---")
    logger.info("  total scenario records         %d", report.total_scenario_records)
    logger.info("  matched                        %d", report.matched)
    logger.info("  unmatched                      %d", report.unmatched)
    logger.info(
        "  rejected (unknown edge_id)     %d", report.rejected_unknown_edge_id
    )
    logger.info(
        "  rejected (duplicate edge_id)   %d", report.rejected_duplicate_edge_id
    )
    logger.info("  rejected (invalid record)      %d", report.rejected_invalid_record)

    flood_dist = joined["flood_level"].value_counts().to_dict()
    pass_dist = joined["passability"].value_counts().to_dict()
    logger.info("  flood_level distribution       %s", flood_dist)
    logger.info("  passability distribution       %s", pass_dist)

    # ---- Validate -------------------------------------------------------
    study_area_polygon = load_study_area_polygon()
    logger.info("--- Validation report ---")
    validation = validate_edges(
        edges=joined,
        nodes=nodes,
        study_area_polygon=study_area_polygon,
        join_report=report,
    )
    if not validation.passed:
        logger.error("Validation FAILED")
        for warning in validation.warnings:
            logger.error("  %s", warning)
        return 1
    logger.info("  validation                     PASSED")

    # ---- Project to contract columns for export -------------------------
    contract_edges = to_contract_frame(joined)
    logger.info(
        "Projected to contract schema: %d columns", len(contract_edges.columns)
    )

    # ---- Persist full outputs (gitignored) ------------------------------
    config.PROCESSED_EDGES.parent.mkdir(parents=True, exist_ok=True)
    contract_edges.to_file(config.PROCESSED_EDGES, driver="GeoJSON")
    logger.info("Wrote full joined edges to %s", config.PROCESSED_EDGES)

    config.INTERIM_GRAPH.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(raw_graph, config.INTERIM_GRAPH)
    logger.info("Wrote intermediate graph to %s", config.INTERIM_GRAPH)

    # ---- Persist small committed fixture --------------------------------
    fixture_edges = (
        contract_edges.sort_values("edge_id").head(SAMPLE_FIXTURE_EDGE_COUNT).copy()
    )
    config.SAMPLE_GRAPH_PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    fixture_edges.to_file(config.SAMPLE_GRAPH_PREVIEW, driver="GeoJSON")
    logger.info(
        "Wrote small joined fixture (%d edges) to %s",
        len(fixture_edges),
        config.SAMPLE_GRAPH_PREVIEW,
    )

    logger.info("=== Build complete ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())