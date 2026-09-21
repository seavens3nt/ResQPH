# ResQPH acceptance scenarios

**Status:** Draft for Phase 1 review
**Last updated:** 2026-09-21

## AC-001 Complete rescue lifecycle

Given a simulated citizen in the approved study area, when the citizen submits a valid request, the backend stores it as `pending`; a coordinator can assign one available team; the assigned rescuer can progress the mission through `en-route`, `arrived`, and `completed`; and the citizen can retrieve the matching request status and history.

## AC-002 Invalid request

Given a request with a missing location, invalid headcount, unsupported severity, or coordinates outside the approved validation rule, the API rejects it with the common `422` error envelope and stores no partial request.

## AC-003 Conflicting assignment

Given an already assigned request, when a coordinator attempts a second active assignment, the API returns `409`, preserves the original mission, and does not incorrectly change either team’s availability.

## AC-004 Invalid status transition

Given a mission in `assigned`, when a client attempts to change it directly to `completed`, the API returns `409` and retains the current state and history.

## AC-005 Deterministic route

Given a small known road graph with no active hazards, A* returns the expected lowest-cost route, geometry, distance, estimated time, cost breakdown, scenario timestamp, and explanation.

## AC-006 Flood-aware reroute

Given an initial route that uses a road later marked impassable by the controlled scenario, the engine excludes that edge, returns the expected alternative when one exists, and explains the exclusion.

## AC-007 No route

Given a graph where controlled impassability disconnects the destination, the API returns a documented no-route result and the UI does not present an unsafe or fabricated route.

## AC-008 ML-supported route

Given an accepted model result for road edges, the routing cost includes a bounded ML penalty and reports model version and contribution without overriding deterministic impassability.

## AC-009 ML unavailable fallback

Given a missing, malformed, rejected, or unavailable model result, routing succeeds using deterministic and rule-based inputs and explicitly reports that the fallback was used.

## AC-010 Cached mission

Given a mission previously synchronized to the rescuer client, when connectivity is unavailable, the rescuer can view the cached mission together with a visible cached/stale label and last-synchronized timestamp.

## AC-011 Queued status update

Given temporary connectivity loss and no existing queued event, the rescuer may queue the next valid mission transition. After reconnection, the backend accepts and records it if still valid or returns a visible synchronization failure if the server state has changed.

## AC-012 Data and safety disclosure

Every route or hazard demonstration identifies its controlled or historical source and does not claim live prediction, guaranteed safety, official dispatch, or government integration.

## Required evidence

Each scenario requires a repeatable test, sanitized fixture, or inspected demonstration record. A screenshot, issue closure, placeholder, or member statement alone does not satisfy acceptance.
