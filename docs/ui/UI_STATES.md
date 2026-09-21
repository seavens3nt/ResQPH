# Required UI states

**Status:** Draft for Phase 1 review
**Last updated:** 2026-09-21

Every main role flow must define observable states rather than showing only successful mock data.

| State | Required behavior |
|---|---|
| Loading | Identify what is loading; avoid presenting stale values as current. |
| Empty | Explain that no matching requests, missions, hazards, or routes exist and show the next valid action. |
| Validation error | Associate actionable feedback with the invalid field and preserve safe input. |
| System error | State that the operation failed, preserve safe retry context, and avoid claiming that it succeeded. |
| Unauthorized role | Explain that the simulated role cannot perform the action. |
| Conflict | Show that server state changed, refresh authoritative state, and do not silently overwrite it. |
| No route | Explain that no eligible route exists under the controlled scenario; never draw an invented safe route. |
| ML fallback | Show that rule-based routing remains active when model output is unavailable or rejected. |
| Offline | Show that network-dependent actions are unavailable except the single supported queued transition. |
| Cached or stale | Display `last_synced_at` and a clear cached/stale label. |
| Pending Sync | Show the one queued event and prevent silent replacement by another event. |
| Sync failed | Preserve the attempted event for review and show current server state and failure reason. |
| Success | Confirm the exact accepted operation and display the updated authoritative state. |

## Role-specific requirements

### Citizen

- Request form validation and submission progress
- Pending, assigned, en-route, arrived, completed, and cancelled status presentation
- No claim that ETA or route safety is guaranteed
- Clear simulated/historical data labels

### Volunteer

- Hazard-report form validation
- Unverified versus verified report state
- Observed time and source type
- No assignment or dispatch controls

### Coordinator

- Empty and populated request queue
- Assignment conflict and unavailable-team state
- Request and mission history
- Hazard verification state
- Route found, fallback, warning, and no-route states

### Rescuer

- Assigned-mission empty state
- Mission and route loading/failure states
- Cached/stale mission state
- One Pending Sync event and visible synchronization result
- Invalid or stale status-transition conflict

## Accessibility baseline

- Essential map information also appears in a readable text/list form.
- Status does not rely on color alone.
- Interactive elements have accessible names and keyboard operation.
- Errors are programmatically associated with inputs.
- Dynamic status, synchronization, and error messages are announced appropriately.
- Mobile layouts retain readable labels, controls, warnings, and route explanations.
