"""
Normalize the raw OSMnx graph into the road-edge contract schema.

Produces a GeoDataFrame of directed edges with the 10 fields required by
data/samples/road-edge.example.geojson:

    edge_id, from_node, to_node, geometry,
    length_m, travel_time_s, road_class,
    flood_level, passability, observed_at, source_type

Flood-related fields are populated with contract-safe defaults here;
the flood_join stage overwrites them with scenario values.
"""
from __future__ import annotations

from typing import Any

import geopandas as gpd
import networkx as nx
import osmnx as ox

from resqph_routing import config

logger = config.get_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _normalize_highway(raw: Any) -> str:
    """
    Map a raw OSM highway value (which can be a string, a list, or a
    comma-separated string) to a normalized project road class.
    Unknown values fall back to 'unclassified'.
    """
    if raw is None:
        return "unclassified"

    # Lists happen when OSMnx coalesces multiple tags
    if isinstance(raw, list):
        candidates = raw
    else:
        candidates = str(raw).split(",")

    for value in candidates:
        cleaned = str(value).strip().strip("[]'\"")
        if cleaned in config.NORMALIZED_ROAD_CLASS:
            return config.NORMALIZED_ROAD_CLASS[cleaned]

    return "unclassified"


def _make_edge_id(u: int, v: int, key: int) -> str:
    """Stable identifier format: ubelt-v1:<u>:<v>:<key>."""
    return f"{config.EXTRACTION_VERSION}:{u}:{v}:{key}"


def _travel_time_seconds(length_m: float, speed_kph: float) -> float:
    """Compute baseline travel time in seconds from distance and speed."""
    if speed_kph <= 0:
        return float("inf")
    meters_per_second = speed_kph * 1000.0 / 3600.0
    return length_m / meters_per_second


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def load_raw_graph() -> nx.MultiDiGraph:
    """Load the cached raw OSM graph from data/raw/."""
    cache_path = config.RAW_OSM_CACHE
    if not cache_path.exists():
        raise FileNotFoundError(
            f"Raw graph cache not found at {cache_path}. "
            "Run the extract stage first: python routing/scripts/build_ubelt_graph.py"
        )
    logger.info("Loading raw graph from %s", cache_path)
    return ox.load_graphml(cache_path)


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------
def normalize_edges(raw_graph: nx.MultiDiGraph) -> gpd.GeoDataFrame:
    """
    Convert the raw graph into a contract-shaped edges GeoDataFrame in WGS84.

    Length is computed on the projected (metre-accurate) graph, then the
    final geometry is reprojected to WGS84 for the committed fixture.
    """
    logger.info("Projecting graph to %s for length computation", config.PROJECTED_CRS)
    projected = ox.project_graph(raw_graph, to_crs=config.PROJECTED_CRS)

    logger.info("Extracting edges as GeoDataFrame")
    _, edges = ox.graph_to_gdfs(projected, nodes=True, edges=True)
    edges = edges.reset_index()

    # ---- Geometry-derived length in metres ----
    edges["length_m"] = edges.geometry.length.astype(float)

    # ---- Normalized road class ----
    if "highway" not in edges.columns:
        raise ValueError("Expected 'highway' column missing from OSMnx edges")

    edges["road_class"] = edges["highway"].apply(_normalize_highway)

    # ---- Stable identifiers ----
    edges["edge_id"] = [
        _make_edge_id(int(u), int(v), int(k))
        for u, v, k in zip(edges["u"], edges["v"], edges["key"])
    ]
    edges["from_node"] = edges["u"].astype(str)
    edges["to_node"] = edges["v"].astype(str)

    # ---- Travel time from default speed by road class ----
    edges["speed_kph"] = edges["road_class"].map(config.DEFAULT_SPEED_KPH)
    edges["travel_time_s"] = [
        _travel_time_seconds(length, speed)
        for length, speed in zip(edges["length_m"], edges["speed_kph"])
    ]

    # ---- Contract defaults for flood-related fields (filled by flood_join) ----
    edges["flood_level"] = "none"
    edges["flood_depth_cm"] = None
    edges["passability"] = "passable"
    edges["observed_at"] = None
    edges["source_type"] = "controlled"

    # ---- Preserve OSM provenance ----
    if "osmid" in edges.columns:
        edges["osm_way_id"] = edges["osmid"].astype(str)
    else:
        edges["osm_way_id"] = None
    edges["extraction_version"] = config.EXTRACTION_VERSION

    # ---- Reproject to WGS84 for export ----
    logger.info("Reprojecting edges to %s for export", config.WGS84_CRS)
    edges = edges.set_crs(config.PROJECTED_CRS, allow_override=True)
    edges = edges.to_crs(config.WGS84_CRS)

    return edges


def normalize_nodes(raw_graph: nx.MultiDiGraph) -> gpd.GeoDataFrame:
    """Extract nodes GeoDataFrame in WGS84 with stable node IDs."""
    nodes = ox.graph_to_gdfs(raw_graph, nodes=True, edges=False)
    nodes = nodes.reset_index()
    nodes["node_id"] = nodes["osmid"].astype(str)
    nodes["lat"] = nodes.geometry.y
    nodes["lon"] = nodes.geometry.x
    nodes["extraction_version"] = config.EXTRACTION_VERSION
    return nodes


# ---------------------------------------------------------------------------
# Contract field selection
# ---------------------------------------------------------------------------
# The exact columns the committed fixture will carry. Order matters for
# human readability; downstream code should not depend on order.
CONTRACT_COLUMNS = [
    "edge_id",
    "from_node",
    "to_node",
    "length_m",
    "travel_time_s",
    "road_class",
    "flood_level",
    "flood_depth_cm",
    "passability",
    "observed_at",
    "source_type",
    "geometry",
]


def to_contract_frame(edges: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Select and order the contract columns, keeping geometry last."""
    missing = [c for c in CONTRACT_COLUMNS if c not in edges.columns]
    if missing:
        raise ValueError(f"Missing contract columns: {missing}")
    return edges[CONTRACT_COLUMNS].copy()
