"""
U-Belt OpenStreetMap extraction.

Downloads the drive network for the approved study-area polygon via
OSMnx and caches the raw result under data/raw/. Subsequent runs load
from cache unless `force=True`.

OSMnx's HTTP response cache is redirected to data/raw/osmnx_cache/ so
that running build scripts from the repository root does not create a
stray ./cache/ folder in the working directory.

Network access only happens on the first call (or when force=True).
Tests never call this module directly — they consume the committed
fixture produced by the build script.
"""
from __future__ import annotations

import json
from typing import Any

import networkx as nx

from resqph_routing import config

logger = config.get_logger(__name__)


# ---------------------------------------------------------------------------
# Study area loading
# ---------------------------------------------------------------------------
def load_study_area_polygon():
    """
    Load the U-Belt polygon from the authoritative fixture.

    Returns a shapely Polygon in WGS 84. Raises if the fixture is
    missing or malformed.
    """
    from shapely.geometry import shape

    path = config.STUDY_AREA_FIXTURE
    if not path.exists():
        raise FileNotFoundError(f"Study-area fixture not found: {path}")

    with path.open(encoding="utf-8") as source:
        collection: dict[str, Any] = json.load(source)

    for feature in collection.get("features", []):
        props = feature.get("properties", {})
        if props.get("study_area_id") != config.STUDY_AREA_ID:
            continue
        geometry = feature.get("geometry")
        if not geometry or geometry.get("type") != "Polygon":
            continue
        polygon = shape(geometry)
        logger.info(
            "Loaded study-area polygon %s with bounds %s",
            config.STUDY_AREA_ID,
            tuple(round(v, 6) for v in polygon.bounds),
        )
        return polygon

    raise RuntimeError(
        f"Study-area fixture does not contain polygon {config.STUDY_AREA_ID}"
    )


# ---------------------------------------------------------------------------
# OSMnx configuration
# ---------------------------------------------------------------------------
def _configure_osmnx_cache(ox) -> None:
    """
    Redirect OSMnx's HTTP response cache into data/raw/osmnx_cache/.

    Without this, OSMnx writes ./cache/ in the current working directory,
    which produces stray untracked folders depending on where the build
    script is invoked from.
    """
    cache_dir = config.RAW_DIR / "osmnx_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    ox.settings.use_cache = True
    ox.settings.cache_folder = str(cache_dir)


# ---------------------------------------------------------------------------
# OSM extraction with cache
# ---------------------------------------------------------------------------
def extract_osm_graph(force: bool = False) -> nx.MultiDiGraph:
    """
    Return the U-Belt drive network as an OSMnx MultiDiGraph.

    - First call: downloads via OSMnx, writes to data/raw/, returns graph.
    - Subsequent calls: loads from data/raw/ unless force=True.
    """
    import osmnx as ox

    _configure_osmnx_cache(ox)

    cache_path = config.RAW_OSM_CACHE

    if cache_path.exists() and not force:
        logger.info("Loading cached OSM graph from %s", cache_path)
        return ox.load_graphml(cache_path)

    logger.info(
        "Downloading OSM drive network for %s (network_type=%s)",
        config.STUDY_AREA_ID,
        config.OSM_NETWORK_TYPE,
    )

    polygon = load_study_area_polygon()

    graph = ox.graph_from_polygon(
        polygon,
        network_type=config.OSM_NETWORK_TYPE,
        simplify=True,
        retain_all=False,
    )

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(graph, cache_path)
    logger.info("Saved raw OSM graph to %s", cache_path)

    return graph


# ---------------------------------------------------------------------------
# Statistics for reporting
# ---------------------------------------------------------------------------
def graph_stats(graph: nx.MultiDiGraph) -> dict[str, int]:
    """Return counts used in the evidence record."""
    stats = {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "self_loops": nx.number_of_selfloops(graph),
    }
    if graph.is_directed():
        stats["weakly_connected_components"] = (
            nx.number_weakly_connected_components(graph)
        )
    else:
        stats["connected_components"] = nx.number_connected_components(graph)
    return stats