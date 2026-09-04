# ResQPH frontend

The citizen, rescuer, and coordination interfaces are built with React, TypeScript, and Vite. Leaflet provides the map interface, TanStack Query manages server state, and Dexie provides the IndexedDB layer for later offline work.

Use the repository-level `docs/SETUP.md` guide to install dependencies and run the application.

## Commands

```powershell
npm run dev
npm run lint
npm test
npm run build
```

Copy `.env.example` to `.env` for local configuration. Never commit the resulting `.env` file.

## Growth structure

As approved features begin, use a feature-first structure under `src/`:

- `app/` for the router, providers, and application-wide setup.
- `api/` for the shared HTTP client and cross-feature API helpers.
- `features/rescueRequests/` for citizen request and tracking behavior.
- `features/missions/` for coordinator and rescuer mission behavior.
- `features/map/` for Leaflet layers and route/risk presentation.
- `features/offline/` for Dexie caching, queued events, and synchronization state.
- `components/` only for genuinely reusable presentation components.
- `pages/` for route-level composition rather than business logic.

Keep a feature's components, hooks, schemas, API functions, and tests together. The frontend communicates with application data through the versioned backend API and never connects directly to MongoDB.
