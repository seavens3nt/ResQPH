# Rescue request and mission lifecycle

**Status:** Active lifecycle; historical Phase 1 baseline with local three-role UI amendment
**Decision owner:** Ranee
**Last updated:** 2026-10-09

## Authoritative terms

- **Rescue request:** a citizen record describing who needs assistance, where they are, and the reported situation.
- **Mission:** the assignment and status lifecycle connecting one rescue request to one rescue team.
- **Coordinator/Dispatcher:** the role authorized to review and assign requests. Keep `coordinator` as the API/database role value; Dispatcher is presentation terminology, not a fourth role.
- **Controlled scenario:** a documented simulated or historical-data-based condition used for testing and demonstration.

## Main lifecycle

```text
Citizen submits request
        |
        v
Request: pending
        |
        | coordinator assigns an available team
        v
Request: assigned + Mission: assigned
        |
        | assigned rescuer begins travel
        v
Request: en-route + Mission: en-route
        |
        | assigned rescuer confirms arrival
        v
Request: arrived + Mission: arrived
        |
        | assigned rescuer or coordinator confirms completion
        v
Request: completed + Mission: completed
```

## Request transitions

| Current | Allowed next state | Authorized role | Required condition |
|---|---|---|---|
| New | `pending` | Citizen | Request passes validation and is stored. |
| `pending` | `assigned` | Coordinator | One available team is assigned in the same consistency boundary as mission creation. |
| `pending` | `cancelled` | Citizen or coordinator | No active mission exists; reason and timestamp are recorded. |
| `assigned` | `en-route` | Assigned rescuer | Active mission and matching team exist. |
| `assigned` | `cancelled` | Coordinator | Cancellation reason is recorded and team availability is restored consistently. |
| `en-route` | `arrived` | Assigned rescuer | The update is the next valid transition. |
| `arrived` | `completed` | Assigned rescuer or coordinator | Completion details and timestamp are recorded. |

`completed` and `cancelled` are terminal request states. Terminal records remain available in history and are not hard-deleted through normal operations.

## Mission transitions

| Current | Allowed next state | Authorized role |
|---|---|---|
| Created | `assigned` | Coordinator |
| `assigned` | `en-route` | Assigned rescuer |
| `assigned` | `cancelled` | Coordinator |
| `en-route` | `arrived` | Assigned rescuer |
| `arrived` | `completed` | Assigned rescuer or coordinator |

Every accepted transition appends an immutable history item containing event ID, prior state, new state, actor ID, actor role, source (`online` or `offline-sync`), client timestamp when supplied, server timestamp, and optional sanitized note.

`completed` and `cancelled` are terminal mission states. Coordinator cancellation from `assigned` updates request, mission, team availability, and history in one transaction. Cancellation after travel begins is excluded from the MVP.

## Invalid and conflicting behavior

- Reject skipped, repeated, backward, or terminal-state transitions with HTTP `409 Conflict`.
- Reject a second active assignment for the same request with HTTP `409 Conflict`.
- Reject role violations with HTTP `403 Forbidden` in the prototype role-simulation boundary.
- Reject malformed input with HTTP `422 Unprocessable Entity` using the common error envelope.
- Use a request version or equivalent conditional update so stale clients cannot silently overwrite a newer state.
- Mission assignment must not leave a request assigned without a mission or a team unavailable without a corresponding mission.

## Current citizen presentation

Request rescue opens the existing form in a dashboard modal, without changing the route. Edit -> review -> final API submission remains one flow. Closing preserves the memory-only draft; reload/sign-out clears it. An unfinished-draft notice appears only after dismissing an edited unsent form. Direct discard and permitted request cancellation have no extra confirmation popup; server validation and version checks remain authoritative.

Home/My Requests use a shared tracking popup with server-confirmed progress; Map retains its inline inspector. Citizen presentation hides internal team identifiers without removing assignment links from storage or rescuer/coordinator workflows. Success feedback appears only after API acceptance and expires after eight idle seconds, paused while hovered/focused.

## Retired workflow

Volunteer entry and hazard-report submission/list/review are retired. Old volunteer sessions return to entry, protected calls fail closed, and hazard routes are not registered. Preserve existing historical records and controlled flood fixtures. See [scope decision](../decisions/2026-10-07-three-role-workflow.md).

## Offline rule

The rescuer client may keep one cached assigned mission and queue at most one next-valid mission transition. The queue item remains `Pending Sync` until the backend validates it. Reconnection does not guarantee acceptance: a stale or invalid transition becomes `Sync Failed` and the current server state is shown without silently overwriting it.
