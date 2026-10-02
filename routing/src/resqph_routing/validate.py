"""
Validation for the U-Belt road graph and joined flood scenario.

Checks that the produced edges satisfy every requirement in
docs/phases/TEAM-PHASE-01.md:

- Geometry is valid and non-empty
- Every edge lies within the study-area boundary (small tolerance)
- All contract columns are present and populated per the contract
- No duplicate edge_id values
- Schema version is consistent across every edge
- Flood join coverage is complete (matched + unmatched = total)
- Rejection counters are zero for the standard build

Returns a structured report; does not raise on validation failure —
callers decide whether to treat a failure as fatal.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

import geopandas as gpd
from shapely.geometry import Polygon
from shapely.prepared import prep

from resqph_routing import config

logger = config.get_logger(__name__)

# Contract columns that must never be null
REQUIRED_NON_NULL_COLUMNS = (
    "edge_id",
    "from_node",
    "to_node",
    "length_m",
    "travel_time_s",
    "road_class",
    "flood_level",
    "passability",
    "source_type",
)

# Columns that may be null but must be present
NULLABLE_COLUMNS = ("flood_depth_cm", "observed_at")


# ---------------------------------------------------------------------------
# Report container
# ---------------------------------------------------------------------------
@dataclass
class ValidationReport:
    total_edges: int = 0
    total_nodes: int = 0

    # Geometry
    invalid_geometries: int = 0
    empty_geometries: int = 0
    non_linestring_geometries: int = 0

    # Spatial bounds
    edges_outside_study_area: int = 0

    # Field completeness
    missing_columns: list[str] = field(default_factory=list)
    null_required_counts: dict[str, int] = field(default_factory=dict)

    # Identity
    duplicate_edge_ids: int = 0
    invalid_edge_ids: int = 0

    # Numeric and vocabulary checks
    invalid_length_values: int = 0
    invalid_travel_time_values: int = 0
    invalid_flood_levels: int = 0
    invalid_passability_values: int = 0
    invalid_source_types: int = 0

    # Schema version
    wrong_schema_version: int = 0

    # Flood join
    join_matched: int = 0
    join_unmatched: int = 0
    join_rejected_unknown: int = 0
    join_rejected_duplicate: int = 0
    join_rejected_invalid: int = 0
    join_coverage_mismatch: int = 0

    # Diagnostics
    warnings: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return (
            self.invalid_geometries == 0
            and self.empty_geometries == 0
            and self.non_linestring_geometries == 0
            and self.edges_outside_study_area == 0
            and self.duplicate_edge_ids == 0
            and self.invalid_edge_ids == 0
            and self.invalid_length_values == 0
            and self.invalid_travel_time_values == 0
            and self.invalid_flood_levels == 0
            and self.invalid_passability_values == 0
            and self.invalid_source_types == 0
            and self.wrong_schema_version == 0
            and not self.missing_columns
            and not any(self.null_required_counts.values())
            and self.join_rejected_unknown == 0
            and self.join_rejected_duplicate == 0
            and self.join_rejected_invalid == 0
            and self.join_coverage_mismatch == 0
        )

    def summary_lines(self) -> list[str]:
        lines = [
            f"edges={self.total_edges}",
            f"nodes={self.total_nodes}",
            f"invalid_geometries={self.invalid_geometries}",
            f"empty_geometries={self.empty_geometries}",
            f"non_linestring_geometries={self.non_linestring_geometries}",
            f"edges_outside_study_area={self.edges_outside_study_area}",
            f"duplicate_edge_ids={self.duplicate_edge_ids}",
            f"invalid_edge_ids={self.invalid_edge_ids}",
            f"invalid_length_values={self.invalid_length_values}",
            f"invalid_travel_time_values={self.invalid_travel_time_values}",
            f"invalid_flood_levels={self.invalid_flood_levels}",
            f"invalid_passability_values={self.invalid_passability_values}",
            f"invalid_source_types={self.invalid_source_types}",
            f"wrong_schema_version={self.wrong_schema_version}",
            f"join_matched={self.join_matched}",
            f"join_unmatched={self.join_unmatched}",
            f"join_rejected_unknown={self.join_rejected_unknown}",
            f"join_rejected_duplicate={self.join_rejected_duplicate}",
            f"join_rejected_invalid={self.join_rejected_invalid}",
            f"join_coverage_mismatch={self.join_coverage_mismatch}",
        ]
        if self.missing_columns:
            lines.append(f"missing_columns={self.missing_columns}")
        if self.null_required_counts:
            non_zero = {k: v for k, v in self.null_required_counts.items() if v}
            if non_zero:
                lines.append(f"null_required_counts={non_zero}")
        return lines


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------
def _check_geometry(edges: gpd.GeoDataFrame, report: ValidationReport) -> None:
    geom = edges.geometry
    report.invalid_geometries = int((~geom.is_valid).sum())
    report.empty_geometries = int(geom.is_empty.sum())
    report.non_linestring_geometries = int(
        (geom.geom_type != "LineString").sum()
    )


def _check_bounds(
    edges: gpd.GeoDataFrame,
    study_area_polygon: Polygon,
    report: ValidationReport,
    tolerance_m: float = 50.0,
) -> None:
    """
    Count edges whose geometry extends beyond the study area by more than
    `tolerance_m`. Small overshoots are expected near boundary nodes; the
    tolerance absorbs clipping artefacts.
    """
    # Work in a metric CRS so the tolerance is meaningful
    edges_m = edges.to_crs(config.PROJECTED_CRS)
    # Buffer the polygon outward by the tolerance
    buffered = (
        gpd.GeoSeries([study_area_polygon], crs=config.WGS84_CRS)
        .to_crs(config.PROJECTED_CRS)
        .iloc[0]
        .buffer(tolerance_m)
    )
    prepared = prep(buffered)

    outside = sum(1 for geom in edges_m.geometry if not prepared.covers(geom))
    report.edges_outside_study_area = int(outside)

    if outside > 0:
        report.warnings.append(
            f"{outside} edges extend beyond the study area by more than "
            f"{tolerance_m} m"
        )


def _check_required_columns(
    edges: gpd.GeoDataFrame, report: ValidationReport
) -> None:
    expected = list(REQUIRED_NON_NULL_COLUMNS) + list(NULLABLE_COLUMNS)
    missing = [c for c in expected if c not in edges.columns]
    report.missing_columns = missing

    if missing:
        return

    counts: dict[str, int] = {}
    for col in REQUIRED_NON_NULL_COLUMNS:
        null_count = int(edges[col].isna().sum())
        if null_count:
            counts[col] = null_count
    report.null_required_counts = counts


def _check_duplicates(edges: gpd.GeoDataFrame, report: ValidationReport) -> None:
    if "edge_id" not in edges.columns:
        return
    total = len(edges)
    unique = edges["edge_id"].nunique()
    report.duplicate_edge_ids = total - unique

    pattern = re.compile(rf"^{re.escape(config.EXTRACTION_VERSION)}:\d+:\d+:\d+$")
    report.invalid_edge_ids = int(
        (~edges["edge_id"].astype(str).str.fullmatch(pattern)).sum()
    )


def _check_values(edges: gpd.GeoDataFrame, report: ValidationReport) -> None:
    """Validate numeric ranges and controlled vocabularies."""
    if "length_m" in edges.columns:
        report.invalid_length_values = sum(
            1
            for value in edges["length_m"]
            if not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not math.isfinite(float(value))
            or float(value) <= 0
        )
    if "travel_time_s" in edges.columns:
        report.invalid_travel_time_values = sum(
            1
            for value in edges["travel_time_s"]
            if not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not math.isfinite(float(value))
            or float(value) <= 0
        )
    if "flood_level" in edges.columns:
        report.invalid_flood_levels = int(
            (~edges["flood_level"].isin(config.FLOOD_LEVELS)).sum()
        )
    if "passability" in edges.columns:
        report.invalid_passability_values = int(
            (~edges["passability"].isin(config.PASSABILITY_VALUES)).sum()
        )
    if "source_type" in edges.columns:
        report.invalid_source_types = int(
            (~edges["source_type"].isin(config.SOURCE_TYPES)).sum()
        )


def _check_schema_version(
    edges: gpd.GeoDataFrame, report: ValidationReport
) -> None:
    if "extraction_version" not in edges.columns:
        report.wrong_schema_version = len(edges)
        report.warnings.append(
            "extraction_version column absent; cannot verify schema version"
        )
        return
    wrong = (edges["extraction_version"] != config.EXTRACTION_VERSION).sum()
    report.wrong_schema_version = int(wrong)


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------
def validate_edges(
    edges: gpd.GeoDataFrame,
    nodes: gpd.GeoDataFrame | None = None,
    study_area_polygon: Polygon | None = None,
    join_report=None,
) -> ValidationReport:
    """
    Run every check and return a populated report. Never raises on
    validation failure — inspect `report.passed` or `report.summary_lines()`.

    `join_report` is optional; if provided (from flood_join.JoinReport),
    its counters are copied into the report so the caller has a single
    object to inspect.
    """
    report = ValidationReport()
    report.total_edges = len(edges)
    if nodes is not None:
        report.total_nodes = len(nodes)

    _check_geometry(edges, report)
    _check_required_columns(edges, report)
    _check_duplicates(edges, report)
    _check_values(edges, report)
    _check_schema_version(edges, report)

    if study_area_polygon is not None:
        _check_bounds(edges, study_area_polygon, report)

    if join_report is not None:
        report.join_matched = join_report.matched
        report.join_unmatched = join_report.unmatched
        report.join_rejected_unknown = join_report.rejected_unknown_edge_id
        report.join_rejected_duplicate = join_report.rejected_duplicate_edge_id
        report.join_rejected_invalid = join_report.rejected_invalid_record
        report.join_coverage_mismatch = abs(
            report.total_edges - (join_report.matched + join_report.unmatched)
        )

    for line in report.summary_lines():
        logger.info("  %s", line)

    return report
