# ResQPH local candidate

Updated 2026-10-10. This is a release candidate, not final acceptance or deployment.

## Current scope

- Citizen, Dispatcher (`coordinator` in the API), and Rescuer have independent tab-scoped prototype sessions.
- Shared Inter typography, blue surfaces, outlined collapsible navigation, pill controls, loading states, responsive account form and accessible dialogs.
- Citizen request creation uses the existing edit/review/submission API flow in a dashboard modal. Drafts stay in memory until reload/sign-out. Status opens in a modal; successful cancellation closes it and shows page feedback.
- Maps retain controlled routing, permanent roads/boundary and bottom-left zoom controls. Volunteer/hazard-report entry, rescuer hotline, alternative route UI and manual coordinate fields are retired.
- Current and hourly Google Weather are informational only, with attribution and timestamps. The key stays in the backend environment. No automatic refresh and no weather-driven flood routing.
- Historical records, validation and the bounded one-mission/one-update offline contract remain intact. Runtime ML stays disabled.

## This machine

Checkout: `resqph-desktop-local`; branch: `feature/local-desktop-role-workspaces`.
Preview: http://127.0.0.1:5192/; API: http://127.0.0.1:8033/docs.
The native MongoDB replica set uses port 27033 and synthetic database `resqph_desktop_local_demo`.
These are machine-specific alternatives; new setups should follow [development setup](docs/SETUP.md).

Use independent tabs and synthetic details. Role selection is not secure authentication.
Do not change existing missions just to free a team for testing; use an isolated acceptance database.
The development server does not register the production offline shell.

## Verification

See [candidate evidence](docs/testing/LOCAL-CANDIDATE-2026-10-10.md) for current checks and outstanding gates.
Do not merge until the remaining acceptance checks pass.
Earlier preview notes and unused Volunteer source were preserved in the machine-local
`outputs/resqph-release-retired-20261010` archive outside this checkout. Local `qa/` screenshots
are excluded from source control; verification findings are versioned.
