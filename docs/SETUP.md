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

## Configure the frontend

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm install
```

Start the frontend:

```powershell
npm run dev
```

The default frontend URL is `http://localhost:5173`.

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

AI/ML packages:

```powershell
.\backend\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt
```

If OSMnx or another compiled geographic dependency fails to install with pip on Windows, the geospatial contributor may use a documented Conda/Miniforge environment instead. The chosen environment must remain reproducible.

## Environment-file policy

Commit `.env.example` files but never commit real `.env` files. Do not place passwords, database credentials, private keys, tokens, or real emergency contact information in GitHub Issues, commits, or pull requests.
