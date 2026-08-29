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
