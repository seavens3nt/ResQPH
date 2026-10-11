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

## Google Weather troubleshooting

`GOOGLE_WEATHER_API_KEY` belongs in the backend environment only. Restart the
backend after changing it. Do not put this key in the frontend or credential README.

If Home or Advisory reports a Google Weather quota error, open the key's Google
Cloud project, select **APIs & Services → Weather API → Quotas & System Limits**,
and review the current-conditions, daily-forecast and hourly-forecast quotas and
usage. Wait for exhausted quota to reset, or deliberately adjust the relevant
quota with the project's billing owner. Increasing quota can increase charges.
See [Google's Weather usage and billing guide](https://developers.google.com/maps/documentation/weather/usage-and-billing).

On 2026-10-12, direct provider diagnostics returned HTTP 429 for all three
endpoints. Current conditions specifically reported `CurrentConditionsQueriesPerDay`,
limit **100**. This is a provider quota failure, not a missing environment key;
no Google Cloud settings or key values were changed during the repair.

The API now returns sanitized `429 weather_quota_exceeded` with `Retry-After`.
A per-endpoint, process-local cooldown prevents repeated upstream calls after
a quota failure: one hour when Google identifies a daily limit, otherwise one
minute (or a longer numeric provider `Retry-After`, bounded at one day).
The cooldown does not indicate when Google's quota resets. It holds no weather
values, is not shared between server processes and is cleared by server restart.
Google access-denied responses instead return `503 weather_configuration_error`.
Check API enablement, server-key restrictions and billing for that error.
No automatic frontend weather refresh or routing use is introduced.
