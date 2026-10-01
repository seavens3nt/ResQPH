# Team Phase 1 — Geospatial evidence

**Status:** Delivered; pending Ranee's gate
**Owner:** Matthew
**Branch:** `feature/32-ubelt-geospatial-pipeline`
**Generated:** 2026-10-01
**Extraction version:** `ubelt-v1`

## Environment

| Component | Version |
|---|---|
| Python | 3.12.x |
| OSMnx | 2.x |
| GeoPandas | 1.0.x |
| NetworkX | 3.4.x |
| PyProj | 3.7.x |
| Shapely | 2.0.x |
| Rasterio | 1.4.x |

Installed from `routing/requirements.txt` and `routing/requirements-dev.txt`.

## Reproduction commands

```powershell
cd routing
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt

cd ..
python routing/scripts/build_ubelt_graph.py
cd routing
python -m pytest tests/ -v