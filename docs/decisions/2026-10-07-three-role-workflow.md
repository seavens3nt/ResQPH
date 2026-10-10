# Three-role local workflow

User decision on 2026-10-07: retain Citizen, Coordinator and Rescuer; retire the entire Volunteer role, rescuer hotline and alternative-route UI. Keep one flood-aware route.

The active login/session contract accepts only these three roles. An old Volunteer session is cleared and returns to entry. Protected API requests with that role return `403 demo_role_required`. Hazard-report submission, listing and review routes are no longer registered, and Coordinator navigation no longer exposes Hazard Reports.

Existing stored hazard observations and historical event-role fields are preserved. Retiring this workflow does not delete collections, migrate old records, change controlled flood-layer fixtures or disable deterministic flood-aware routing. Dormant legacy components/modules are not entry points.

This decision supersedes older four-role runtime scope descriptions. It does not reopen or rewrite dated academic verification, phase acceptance, deployment or model-readiness gates.
