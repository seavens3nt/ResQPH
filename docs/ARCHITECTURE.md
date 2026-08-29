# ResQPH architecture

## Development baseline

- Frontend: React, TypeScript, and Vite
- Map interface: Leaflet and React Leaflet
- Backend API: Python 3.12 and FastAPI
- Operational database: MongoDB through PyMongo
- Local database: MongoDB single-node replica set through Docker Compose
- Routing/geospatial: NetworkX, OSMnx, GeoPandas, Shapely, PyProj, and Rasterio as needed
- AI/ML: pandas, NumPy, scikit-learn, and joblib
- Offline client storage: IndexedDB through Dexie
- Testing: Vitest, Testing Library, Pytest, and HTTPX

## Runtime flow

```text
React client
    |
    v
FastAPI /api/v1
    |
    +--> MongoDB operational and geospatial collections
    |
    +--> Deterministic routing module
    |
    +--> AI/ML inference adapter or rule-based fallback
```

The initial backend is a modular application rather than several independently deployed services. Routing and AI/ML retain separate ownership and dependency boundaries. They may be split into services later only when evidence shows that the additional operational complexity is justified.

## Frontend boundary

The frontend owns citizen, rescuer, and dispatcher workflows; map interaction; route and risk presentation; stale-data indicators; and limited device-local offline state. It communicates with application data only through the versioned backend API.

## Backend boundary

The backend owns validation, authorization when required, rescue-request CRUD, mission assignment, status transitions, transaction boundaries, data synchronization, and integration with routing and AI/ML outputs.

## Routing boundary

The routing component begins with a deterministic A* or Dijkstra baseline. Its cost function may combine distance, travel time, flood hazard, elevation, passability thresholds, and an explainable risk penalty. Impassable roads are excluded from the graph.

## AI/ML boundary

The AI/ML component estimates road risk or passability only when the available data support a defensible model. A rule-based baseline and fallback are mandatory. Model output is translated into an explainable routing penalty and does not replace deterministic constraints or human decisions.

## Offline boundary

The client may cache assigned mission information, last-known victim location, current route, and selected geographic context. Offline updates are timestamped and queued as pending synchronization events. The backend validates them after reconnection.

## Data rules

MongoDB uses GeoJSON coordinate order: longitude first, latitude second. Large raw and processed datasets remain outside ordinary Git history. Dataset sources, licenses, coordinate reference systems, transformations, and limitations must be documented.
