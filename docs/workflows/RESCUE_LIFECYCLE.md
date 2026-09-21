# Rescue request and mission lifecycle

**Status:** Draft for Phase 1 review
**Decision owner:** Ranee
**Last updated:** 2026-09-21

## Authoritative terms

- **Rescue request:** a citizen record describing who needs assistance, where they are, and the reported situation.
- **Mission:** the assignment and status lifecycle connecting one rescue request to one rescue team.
- **Coordinator:** the role authorized to review and assign requests. Use `coordinator` in UI, API, database, and documentation; “dispatcher” may appear only as explanatory wording.
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
| `en-route` | `arrived` | Assigned rescuer |
| `arrived` | `completed` | Assigned rescuer or coordinator |

Every accepted transition appends an immutable history item containing event ID, prior state, new state, actor ID, actor role, source (`online` or `offline-sync`), client timestamp when supplied, server timestamp, and optional sanitized note.

## Invalid and conflicting behavior

- Reject skipped, repeated, backward, or terminal-state transitions with HTTP `409 Conflict`.
- Reject a second active assignment for the same request with HTTP `409 Conflict`.
- Reject role violations with HTTP `403 Forbidden` in the prototype role-simulation boundary.
- Reject malformed input with HTTP `422 Unprocessable Entity` using the common error envelope.
- Use a request version or equivalent conditional update so stale clients cannot silently overwrite a newer state.
- Mission assignment must not leave a request assigned without a mission or a team unavailable without a corresponding mission.

## Volunteer hazard report flow

1. A volunteer submits a sanitized hazard report with a GeoJSON point, category, severity, observed time, and optional note.
2. The backend validates and stores it as unverified.
3. The coordinator may mark it verified for the controlled scenario.
4. Only verified scenario hazards may affect deterministic route costs.
5. The UI always shows source, observed time, verification state, and whether the information is simulated or historical.

## Offline rule

The rescuer client may keep one cached assigned mission and queue at most one next-valid mission transition. The queue item remains `Pending Sync` until the backend validates it. Reconnection does not guarantee acceptance: a stale or invalid transition becomes `Sync Failed` and the current server state is shown without silently overwriting it.
