# ResQPH backend

The backend is a modular FastAPI application responsible for validation, approved authorization, rescue-request and mission workflows, MongoDB consistency, synchronization, and integration with routing and risk results.

Use the repository-level [setup guide](../docs/SETUP.md) to create `backend/.venv`, install dependencies, configure `.env`, and run the API.

## Current structure

```text
backend/
├── app/
│   ├── api/routes/          FastAPI route handlers
│   ├── core/                Configuration and shared application setup
│   ├── db/                  MongoDB connection setup
│   ├── integrations/        Evidence-gated routing and ML adapters
│   ├── repositories/        MongoDB persistence and queries
│   ├── schemas/             Pydantic API contracts
│   ├── services/            Rescue and mission workflow orchestration
│   └── main.py              Application entry point
├── tests/                   Backend tests
├── .env.example
├── requirements.txt
└── requirements-dev.txt
```

## Growth rules

Use the following boundaries:

- `app/domain/`: entities, statuses, transitions, and business rules.
- `app/schemas/`: Pydantic request and response contracts.
- `app/repositories/`: MongoDB persistence and queries.
- `app/services/`: multi-step rescue-request, assignment, mission, and sync workflows.
- `app/integrations/`: adapters for deterministic routing and optional risk/ML output.

Keep route handlers thin. The normal call direction is:

```text
API route -> service -> domain rule -> repository or integration adapter
```

Do not place MongoDB queries directly in route handlers, import notebooks or generated model artifacts, or make the core rescue workflow depend on ML availability.

The ML adapter defaults to the deterministic rule score. A model can load only
after explicit enablement, SHA-256 verification, and an exact metadata match.
The external Ondoy experiment is not a backend runtime artifact.

## Commands

From `backend/` after completing setup:

```powershell
.\.venv\Scripts\python.exe -m fastapi dev app\main.py --port 8000
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m pytest
```

The API uses `/api/v1`. Commit `.env.example`, but never commit the resulting `.env` file or private rescue information.
