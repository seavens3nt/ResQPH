"""Build the bounded U-Belt road fixture used for station assignment and maps.

Usage from the repository root:
    uv run --project routing python routing/scripts/build_station_network.py
    uv run --project routing python routing/scripts/build_station_network.py --force

The script reuses the approved OSMnx extraction pipeline and writes only the
bounded, contract-shaped road fixture. Flood observations remain in the
separate controlled scenario fixture.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_HERE = Path(__file__).resolve()
_ROUTING_ROOT = _HERE.parents[1]
_SRC = _ROUTING_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from resqph_routing import config
from resqph_routing.extract import extract_osm_graph, graph_stats
from resqph_routing.normalize import normalize_edges, to_contract_frame


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the bounded station road fixture.")
    parser.add_argument("--force", action="store_true", help="Refresh the OSMnx source snapshot from Overpass.")
    args = parser.parse_args()

    graph = extract_osm_graph(force=args.force)
    roads = to_contract_frame(normalize_edges(graph))
    west, south, east, north = config.STUDY_AREA_BOUNDS
    bounds = roads.geometry.bounds
    within_boundary = (
        (bounds.minx >= west)
        & (bounds.maxx <= east)
        & (bounds.miny >= south)
        & (bounds.maxy <= north)
    )
    bounded_roads = roads.loc[within_boundary].copy()
    if bounded_roads.empty or bounded_roads["edge_id"].duplicated().any():
        raise RuntimeError("The bounded station network is empty or has duplicate stable edge IDs.")

    bounded_roads = bounded_roads.sort_values("edge_id")
    output = config.SAMPLE_STATION_NETWORK
    output.parent.mkdir(parents=True, exist_ok=True)
    bounded_roads.to_file(output, driver="GeoJSON")
    print(f"OSMnx graph: {graph_stats(graph)}")
    print(f"Bounded edges: {len(bounded_roads)}; excluded out-of-bounds edges: {int((~within_boundary).sum())}")
    print(f"Wrote {output} ({output.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
