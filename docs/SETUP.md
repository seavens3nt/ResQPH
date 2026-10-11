# Local development setup

This guide establishes a consistent Windows development environment for ResQPH.

## Required software

- Git
- GitHub account and repository access
- Node.js 22.12 or newer supported LTS release
- npm, included with Node.js
- Python 3.12, 64-bit
- WSL 2 with the Virtual Machine Platform Windows feature enabled
- Docker Desktop with Docker Compose
- Visual Studio Code or another suitable editor

Optional tools include MongoDB Compass, an API client such as Bruno or Postman, and QGIS for geographic data inspection.

On Windows 11, install the WSL 2 components from an Administrator PowerShell window, then restart the computer:

```powershell
wsl --install --no-distribution
```

After restarting, verify that `wsl --status` reports `Default Version: 2` before starting Docker Desktop.

## Clone the repository

```powershell
Set-Location "C:\Users\YOUR-NAME\Documents\GitHub"
gh repo clone seavens3nt/ResQPH
Set-Location ResQPH
```

For the station-login feature branch, fetch and check out its upstream branch
after it has been pushed:

```sh
git fetch origin
git switch --track origin/feature/station-login-markers
```

## Configure the frontend

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm install
```

Vite loads `frontend/.env` and `frontend/.env.local`; a same-name value in
`.env.local` overrides `.env`. Mode-specific files such as `.env.development`
and `.env.development.local` override the generic files, and environment
variables supplied by the shell have highest priority. Avoid defining the
same variable in multiple files unless the override is intentional. These files
are ignored by Git. Restart Vite after changing them; rebuild the frontend after
changing values used by a production bundle.

`VITE_API_URL` may be blank to use the local default
`http://localhost:8000/api/v1`. Fill `VITE_GOOGLE_MAPS_API_KEY` and
`VITE_GOOGLE_MAPS_MAP_ID` in either ignored `frontend/.env` or
`frontend/.env.local` when available. Restrict the browser key to the intended
HTTP referrers and Maps JavaScript API; review quotas and billing alerts in
Google Cloud Console. See the [citizen-to-station workflow guide](workflows/CITIZEN_STATION_WORKFLOW.md).
Keep `GOOGLE_WEATHER_API_KEY` only in `backend/.env`; it is server-only and
must not be copied into a Vite environment file.

Start the frontend:

```powershell
npm run dev
```

The supported local browser origin is `http://localhost:5173`. `dev.sh` binds
the frontend to `localhost`, the backend to IPv4 loopback, and refuses to silently move Vite to
another port. Do not open the advertised LAN address for this local setup: the
API URL and CORS allowlist are intentionally configured for the same computer.
For a deliberate LAN session, make the API reachable on a trusted interface,
set `VITE_API_URL` to that computer's reachable address, and add the exact
browser origin (scheme, host, and port) to backend `FRONTEND_ORIGINS`; restart
both servers. Do not use `localhost` in an API URL from another device.

## Verify a real offline reload

Vite development mode needs a network connection. For offline acceptance, use the production shell:

```powershell
npm run build
npm run preview
```

Visit online once and allow the service worker to install before disconnecting.
Only the UI shell and built assets are cached. One actor-scoped mission and event
are held in IndexedDB; API responses and map tiles are not cached by the worker.
The first visit cannot work offline. Reconnect to receive application updates.

## Configure the backend

From the repository root:

```powershell
Set-Location backend
py -3.12 -m venv .venv
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
```

Start the backend:

```powershell
.\.venv\Scripts\python.exe -m fastapi dev app\main.py --port 8000
```

The default endpoints are:

- API: `http://localhost:8000`
- Health check: `http://localhost:8000/api/v1/health`
- Interactive API documentation: `http://localhost:8000/docs`

For local HTTP development, use the example's `AUTH_COOKIE_SECURE=false`.
HTTPS deployments must set `AUTH_COOKIE_SECURE=true` and configure
`FRONTEND_ORIGINS` to the exact browser origin. Demo headers remain disabled in
normal mode. Register citizen accounts from the UI. Provision each station
account locally with the interactive commands documented in the workflow guide;
passwords are entered at a hidden prompt and never belong in command arguments,
environment files, or the repository.

## Start MongoDB

From the repository root, open Docker Desktop and run:

```powershell
docker compose up -d
docker compose ps
```

The Compose configuration starts MongoDB on `localhost:27017` as a single-node development replica set. The replica-set configuration is required for the multi-document transaction workflow proposed for mission assignment.

Stop MongoDB without deleting its data:

```powershell
docker compose down
```

Do not add `--volumes` unless the local database is intentionally being discarded.

## Run checks

Frontend:

```powershell
Set-Location frontend
npm run lint
npm test
npm run build
```

Backend:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m pytest
```

## Optional routing and AI/ML environments

Install these only for members working in those components.

Routing and geospatial packages:

```powershell
.\backend\.venv\Scripts\python.exe -m pip install -r routing\requirements.txt
```

Main AI/ML workspace packages:

```powershell
.\backend\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt
```

Matthew's Ondoy 2009 evidence package uses a separate pinned environment and
must not be installed into the core backend environment:

```powershell
Set-Location ml\external-experiments\ondoy-2009-metro-manila
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pip install -e . --no-deps
.\.venv\Scripts\python.exe -m pytest
```

The backend defaults to `ML_ENABLED=false`. Do not populate the optional ML
artifact variables or add XGBoost to core requirements unless a new
U-Belt-compatible artifact passes the gate in `docs/ml/ML_FEASIBILITY.md`.

If OSMnx or another compiled geographic dependency fails to install with pip on Windows, the geospatial contributor may use a documented Conda/Miniforge environment instead. The chosen environment must remain reproducible.

## Environment-file policy

Commit `.env.example` files but never commit real `.env` files. Do not place passwords, database credentials, private keys, tokens, or real emergency contact information in GitHub Issues, commits, or pull requests.
