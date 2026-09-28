import json
from functools import lru_cache
from pathlib import Path
from typing import Any

STUDY_AREA_ID = "ubelt-pilot-v1"
_BOUNDARY_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "samples" / "study-area.geojson"
)


@lru_cache(maxsize=1)
def load_study_area_polygon() -> tuple[tuple[float, float], ...]:
    with _BOUNDARY_PATH.open(encoding="utf-8") as source:
        feature_collection: dict[str, Any] = json.load(source)

    for feature in feature_collection.get("features", []):
        if feature.get("properties", {}).get("study_area_id") != STUDY_AREA_ID:
            continue
        geometry = feature.get("geometry", {})
        if geometry.get("type") != "Polygon":
            break
        rings = geometry.get("coordinates", [])
        if not rings or len(rings[0]) < 4:
            break
        return tuple((float(point[0]), float(point[1])) for point in rings[0])

    raise RuntimeError(f"Study-area fixture does not contain polygon {STUDY_AREA_ID}")


def point_is_inside_study_area(longitude: float, latitude: float) -> bool:
    polygon = load_study_area_polygon()
    inside = False
    previous = polygon[-1]

    for current in polygon:
        if _point_on_segment((longitude, latitude), previous, current):
            return True
        x1, y1 = previous
        x2, y2 = current
        crosses = (y1 > latitude) != (y2 > latitude)
        if crosses:
            crossing_x = (x2 - x1) * (latitude - y1) / (y2 - y1) + x1
            if longitude < crossing_x:
                inside = not inside
        previous = current
    return inside


def _point_on_segment(
    point: tuple[float, float],
    start: tuple[float, float],
    end: tuple[float, float],
) -> bool:
    px, py = point
    x1, y1 = start
    x2, y2 = end
    cross_product = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1)
    if abs(cross_product) > 1e-10:
        return False
    return min(x1, x2) <= px <= max(x1, x2) and min(y1, y2) <= py <= max(y1, y2)
