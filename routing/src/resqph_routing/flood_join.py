"""
Controlled flood-scenario join.

Joins a controlled flood scenario onto normalized road edges by
`edge_id`, following data/metadata/flood-hazard.md:

1. Validate the scenario and extraction versions.
2. Reject unknown or duplicate `edge_id` values.
3. Left-join scenario attributes to the approved road graph.
4. Report unmatched records so the later routing phase can apply the
   documented uncertainty penalty instead of treating them as verified safe.

This module does not calculate route costs or exclude edges. Those behaviors
belong to the later deterministic-routing phase.

The join produces a report with matched, unmatched, and rejected counts
alongside a joined GeoDataFrame.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import geopandas as gpd
from shapely.geometry import mapping

from resqph_routing import config

logger = config.get_logger(__name__)


SCENARIO_REQUIRED_FIELDS = frozenset({
    "scenario_id",
    "edge_id",
    "flood_level",
    "passability",
    "source_type",
    "scenario_timestamp",
    "reason",
})


@dataclass
class JoinReport:
    """Diagnostic counters and warnings from a flood-scenario join."""

    total_scenario_records: int = 0
    matched: int = 0
    unmatched: int = 0
    rejected_unknown_edge_id: int = 0
    rejected_duplicate_edge_id: int = 0
    rejected_invalid_record: int = 0
    scenario_id: str | None = None
    scenario_timestamp: str | None = None
    warnings: list[str] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"scenario={self.scenario_id} "
            f"records={self.total_scenario_records} "
            f"matched={self.matched} "
            f"unmatched={self.unmatched} "
            f"rejected_unknown={self.rejected_unknown_edge_id} "
            f"rejected_dup={self.rejected_duplicate_edge_id} "
            f"rejected_invalid={self.rejected_invalid_record}"
        )


# ---------------------------------------------------------------------------
# Scenario loading and validation
# ---------------------------------------------------------------------------
def load_scenario(path: Path) -> dict[str, Any]:
    """Load a scenario GeoJSON file. Raises on missing or malformed input."""
    if not path.exists():
        raise FileNotFoundError(f"Scenario not found: {path}")

    with path.open(encoding="utf-8") as source:
        data = json.load(source)

    if data.get("type") != "FeatureCollection":
        raise ValueError(f"Scenario must be a FeatureCollection: {path}")

    return data


def _validate_record(props: dict[str, Any]) -> str | None:
    """
    Return None if the record is valid, or a short rejection reason.
    """
    missing = SCENARIO_REQUIRED_FIELDS - set(props.keys())
    if missing:
        return f"missing fields: {sorted(missing)}"

    if props["flood_level"] not in config.FLOOD_LEVELS:
        return f"invalid flood_level: {props['flood_level']!r}"

    if props["passability"] not in config.PASSABILITY_VALUES:
        return f"invalid passability: {props['passability']!r}"

    if props["source_type"] not in config.SOURCE_TYPES:
        return f"invalid source_type: {props['source_type']!r}"

    if not isinstance(props["scenario_id"], str) or not props["scenario_id"].strip():
        return "scenario_id must be a non-empty string"

    timestamp_error = _validate_timestamp(props["scenario_timestamp"])
    if timestamp_error:
        return timestamp_error

    depth = props.get("flood_depth_cm")
    if depth is not None:
        if isinstance(depth, bool):
            return f"invalid flood_depth_cm: {depth!r}"
        try:
            depth_val = float(depth)
        except (TypeError, ValueError):
            return f"invalid flood_depth_cm: {depth!r}"
        if not math.isfinite(depth_val) or depth_val < 0:
            return f"invalid flood_depth_cm: {depth!r}"

    return None


def _validate_timestamp(value: Any) -> str | None:
    """Return a validation error for a non-ISO or timezone-free timestamp."""
    if not isinstance(value, str):
        return "scenario_timestamp must be a string"
    try:
        parsed_timestamp = datetime.fromisoformat(value)
    except ValueError:
        return f"invalid scenario_timestamp: {value!r}"
    if parsed_timestamp.tzinfo is None:
        return "scenario_timestamp must include a timezone"
    return None


# ---------------------------------------------------------------------------
# Join
# ---------------------------------------------------------------------------
def join_scenario_to_edges(
    edges: gpd.GeoDataFrame,
    scenario_path: Path,
) -> tuple[gpd.GeoDataFrame, JoinReport]:
    """
    Left-join a controlled flood scenario onto road edges by edge_id.

    Returns (joined_edges, report). Unmatched edges retain the contract
    defaults (`flood_level='none'`, `passability='passable'`) and remain
    flagged in the report. Consumers must apply the documented uncertainty
    penalty for unmatched/stale edges, not treat them as automatically safe.
    """
    report = JoinReport()
    scenario = load_scenario(scenario_path)

    scenario_meta = scenario.get("scenario", {})
    report.scenario_id = scenario_meta.get("scenario_id")
    report.scenario_timestamp = scenario_meta.get("scenario_timestamp")

    if not report.scenario_id:
        raise ValueError("Scenario is missing a scenario_id")
    if not report.scenario_timestamp:
        raise ValueError("Scenario is missing a scenario_timestamp")
    timestamp_error = _validate_timestamp(report.scenario_timestamp)
    if timestamp_error:
        raise ValueError(f"Scenario metadata invalid: {timestamp_error}")

    scenario_study_area = scenario_meta.get("study_area_id")
    if scenario_study_area and scenario_study_area != config.STUDY_AREA_ID:
        raise ValueError(
            f"Scenario study_area_id '{scenario_study_area}' does not match "
            f"project '{config.STUDY_AREA_ID}'"
        )

    scenario_source_type = scenario_meta.get("source_type")
    if scenario_source_type not in config.SOURCE_TYPES:
        raise ValueError(
            f"Scenario has invalid source_type: {scenario_source_type!r}"
        )

    # ---- Walk records: validate, reject unknown/duplicates ----
    known_edge_ids = set(edges["edge_id"])
    seen_edge_ids: set[str] = set()
    accepted: dict[str, dict[str, Any]] = {}

    for feature in scenario.get("features", []):
        report.total_scenario_records += 1
        props = feature.get("properties", {}) or {}
        edge_id = props.get("edge_id")

        if not edge_id:
            report.rejected_invalid_record += 1
            continue

        reason = _validate_record(props)
        if reason:
            report.rejected_invalid_record += 1
            report.warnings.append(f"edge_id={edge_id} rejected: {reason}")
            continue

        if props["scenario_id"] != report.scenario_id:
            report.rejected_invalid_record += 1
            report.warnings.append(
                f"edge_id={edge_id} rejected: scenario_id does not match metadata"
            )
            continue

        if props["scenario_timestamp"] != report.scenario_timestamp:
            report.rejected_invalid_record += 1
            report.warnings.append(
                f"edge_id={edge_id} rejected: scenario_timestamp does not match metadata"
            )
            continue

        if props["source_type"] != scenario_source_type:
            report.rejected_invalid_record += 1
            report.warnings.append(
                f"edge_id={edge_id} rejected: source_type does not match metadata"
            )
            continue

        if edge_id in seen_edge_ids:
            report.rejected_duplicate_edge_id += 1
            report.warnings.append(f"duplicate edge_id in scenario: {edge_id}")
            continue

        if edge_id not in known_edge_ids:
            report.rejected_unknown_edge_id += 1
            report.warnings.append(f"unknown edge_id in scenario: {edge_id}")
            continue

        seen_edge_ids.add(edge_id)
        accepted[edge_id] = props

    # ---- Left-join by edge_id ----
    joined = edges.copy()
    match_mask = joined["edge_id"].isin(accepted)

    if match_mask.any():
        matched_ids = joined.loc[match_mask, "edge_id"]

        joined.loc[match_mask, "flood_level"] = matched_ids.map(
            lambda eid: accepted[eid]["flood_level"]
        )
        joined.loc[match_mask, "flood_depth_cm"] = matched_ids.map(
            lambda eid: accepted[eid].get("flood_depth_cm")
        )
        joined.loc[match_mask, "passability"] = matched_ids.map(
            lambda eid: accepted[eid]["passability"]
        )
        joined.loc[match_mask, "observed_at"] = matched_ids.map(
            lambda eid: accepted[eid]["scenario_timestamp"]
        )
        joined.loc[match_mask, "source_type"] = matched_ids.map(
            lambda eid: accepted[eid]["source_type"]
        )

    report.matched = int(match_mask.sum())
    report.unmatched = int((~match_mask).sum())

    logger.info("Flood join complete: %s", report.summary())
    if report.warnings:
        for warning in report.warnings[:10]:
            logger.warning("  %s", warning)
        if len(report.warnings) > 10:
            logger.warning("  ... and %d more warnings", len(report.warnings) - 10)

    return joined, report


# ---------------------------------------------------------------------------
# Sample scenario generation (used by the build script for the committed fixture)
# ---------------------------------------------------------------------------
# Rotation of (flood_level, passability, flood_depth_cm) patterns applied
# in order to the first N edges sorted by edge_id. Deterministic across
# runs for a given graph.
_FLOOD_ROTATION: list[tuple[str, str, int | None]] = [
    ("severe",   "impassable", 120),
    ("high",     "restricted",  80),
    ("moderate", "restricted",  35),
    ("low",      "passable",    15),
    ("none",     "passable",    None),
    ("moderate", "restricted",  40),
    ("high",     "restricted",  75),
    ("none",     "passable",    None),
    ("low",      "passable",    10),
    ("severe",   "impassable", 150),
]


def build_sample_scenario(
    edges: gpd.GeoDataFrame,
    scenario_id: str = "scenario-controlled-ubelt-001",
    scenario_timestamp: str = "2026-10-01T00:00:00Z",
    count: int = 10,
) -> dict[str, Any]:
    """
    Build a small deterministic controlled flood scenario referencing
    real edge_ids from the graph.

    Used by the build script to produce the committed sample scenario
    alongside the small joined fixture.
    """
    if count < 1:
        raise ValueError("count must be at least 1")
    if count > len(edges):
        raise ValueError(
            f"count ({count}) cannot exceed available edges ({len(edges)})"
        )

    selected = edges.sort_values("edge_id").head(count)

    features: list[dict[str, Any]] = []
    for i, (_, edge) in enumerate(selected.iterrows()):
        level, passability, depth = _FLOOD_ROTATION[i % len(_FLOOD_ROTATION)]
        features.append({
            "type": "Feature",
            "properties": {
                "scenario_id": scenario_id,
                "edge_id": edge["edge_id"],
                "flood_level": level,
                "flood_depth_cm": depth,
                "passability": passability,
                "source_type": "controlled",
                "scenario_timestamp": scenario_timestamp,
                "reason": "Deterministic sample pattern for Phase 1 fixture.",
            },
            "geometry": mapping(edge.geometry),
        })

    return {
        "type": "FeatureCollection",
        "name": "resqph-ubelt-controlled-scenario-v1",
        "fixture_notice": (
            "Synthetic academic scenario; not live or historical flood evidence."
        ),
        "scenario": {
            "scenario_id": scenario_id,
            "scenario_timestamp": scenario_timestamp,
            "source_type": "controlled",
            "study_area_id": config.STUDY_AREA_ID,
        },
        "features": features,
    }
