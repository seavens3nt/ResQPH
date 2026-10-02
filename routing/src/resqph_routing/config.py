"""
Configuration for the ResQPH routing package.

Locks the study area boundary, CRS definitions, path helpers, and
road-class mappings used across extraction, normalization, flood
joining, and validation.

Pure Python — no geopandas/shapely/osmnx imports. That keeps this module
importable in tests and scripts that only need paths and constants.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Study area
# ---------------------------------------------------------------------------
STUDY_AREA_ID = "ubelt-pilot-v1"

# Bounding box in WGS 84, (west, south, east, north)
STUDY_AREA_BOUNDS: tuple[float, float, float, float] = (
    120.982000,
    14.596000,
    121.004000,
    14.617500,
)

# CRS definitions
WGS84_EPSG = 4326
WGS84_CRS = f"EPSG:{WGS84_EPSG}"

# UTM zone 51N covers Manila; projected CRS for metre-accurate distances
PROJECTED_EPSG = 32651
PROJECTED_CRS = f"EPSG:{PROJECTED_EPSG}"

# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------
# Bumping this invalidates every derived edge_id. Only change with a
# decision-log entry that documents why.
EXTRACTION_VERSION = "ubelt-v1"

OSM_NETWORK_TYPE = "drive"

# Highway values kept as traversable. Everything else is dropped.
# Matches the Overpass feasibility filter in data/metadata/road-network.md.
TRAVERSABLE_HIGHWAYS = frozenset({
    "motorway",
    "motorway_link",
    "trunk",
    "trunk_link",
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "unclassified",
    "residential",
    "service",
    "living_street",
})

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# config.py sits at routing/src/resqph_routing/config.py
# parents[0] = resqph_routing/
# parents[1] = src/
# parents[2] = routing/
# parents[3] = repository root
ROOT_DIR = Path(__file__).resolve().parents[3]

DATA_DIR       = ROOT_DIR / "data"
RAW_DIR        = DATA_DIR / "raw"
INTERIM_DIR    = DATA_DIR / "interim"
PROCESSED_DIR  = DATA_DIR / "processed"
SAMPLES_DIR    = DATA_DIR / "samples"
METADATA_DIR   = DATA_DIR / "metadata"

ROUTING_DIR = ROOT_DIR / "routing"

# Authoritative study-area fixture, locked by D-001
STUDY_AREA_FIXTURE = SAMPLES_DIR / "study-area.geojson"

# Committed sample fixtures (small, hand-authored)
SAMPLE_ROAD_EDGE      = SAMPLES_DIR / "road-edge.example.geojson"
SAMPLE_FLOOD_SCENARIO = SAMPLES_DIR / "flood-scenario.example.geojson"

# Generated outputs (gitignored unless deliberately promoted)
RAW_OSM_CACHE   = RAW_DIR / "ubelt-v1-osm.graphml"
INTERIM_GRAPH   = INTERIM_DIR / "ubelt-v1-graph.graphml"
PROCESSED_EDGES = PROCESSED_DIR / "ubelt-v1-edges.geojson"
PROCESSED_NODES = PROCESSED_DIR / "ubelt-v1-nodes.geojson"

# Promoted small fixtures (committed)
SAMPLE_GRAPH_PREVIEW = SAMPLES_DIR / "ubelt-v1-preview.geojson"
SAMPLE_FLOOD_FIXTURE = SAMPLES_DIR / "ubelt-v1-flood-join.geojson"


def raw_path(name: str) -> Path:
    return RAW_DIR / name


def interim_path(name: str) -> Path:
    return INTERIM_DIR / name


def processed_path(name: str) -> Path:
    return PROCESSED_DIR / name


def sample_path(name: str) -> Path:
    return SAMPLES_DIR / name


# ---------------------------------------------------------------------------
# Road class normalization
# ---------------------------------------------------------------------------
# Normalize OSM highway values into a stable project category. The
# normalized value is what appears in the road-edge contract's
# `road_class` field.
NORMALIZED_ROAD_CLASS: dict[str, str] = {
    "motorway":       "motorway",
    "motorway_link":  "motorway",
    "trunk":          "trunk",
    "trunk_link":     "trunk",
    "primary":        "primary",
    "primary_link":   "primary",
    "secondary":      "secondary",
    "secondary_link": "secondary",
    "tertiary":       "tertiary",
    "tertiary_link":  "tertiary",
    "unclassified":   "unclassified",
    "residential":    "residential",
    "service":        "service",
    "living_street":  "living_street",
}

# Default speed limits (km/h) used to compute travel_time_s when the
# OSM edge does not carry a reliable maxspeed. Values are conservative
# urban-prototype defaults, not official limits.
DEFAULT_SPEED_KPH: dict[str, float] = {
    "motorway":      60.0,
    "trunk":         50.0,
    "primary":       40.0,
    "secondary":     30.0,
    "tertiary":      30.0,
    "unclassified":  25.0,
    "residential":   20.0,
    "service":       15.0,
    "living_street": 15.0,
}

# ---------------------------------------------------------------------------
# Flood-scenario vocabularies (mirrors data/metadata/flood-hazard.md)
# ---------------------------------------------------------------------------
FLOOD_LEVELS = frozenset({"none", "low", "moderate", "high", "severe"})
PASSABILITY_VALUES = frozenset({"passable", "restricted", "impassable"})
SOURCE_TYPES = frozenset({"controlled", "historical"})


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("RESQPH_LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)
    logger.setLevel(LOG_LEVEL)
    logger.propagate = False
    return logger