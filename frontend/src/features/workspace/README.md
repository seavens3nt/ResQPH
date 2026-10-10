# Shared desktop workspace UI

Use `WorkspaceUI.tsx` for repeated workspace presentation:

- `WorkspaceCard`: shared surface; `as` retains section, article, aside or div semantics. Pass role-specific classes and normal accessibility/HTML attributes.
- `WorkspaceBadge`: common state styling, with an optional custom label.
- `WorkspaceFilters`: controlled filter buttons, named group and optional extra action.
- `WorkspaceStatCard`: shared count/icon/action layout; counts come from the page's real API query.
- `WorkspaceTable`: responsive table shell, headings/caption and caller-owned rows/actions.
- `WorkspaceSplit`: consistent main-content / semantic inspector layout.
- `WorkspaceFacts`: labeled definition lists, preserving zero values and caller-provided rich values.
- `WorkspaceProgress`: server-derived lifecycle stages, without inventing progress for unknown or cancelled states.
- `WorkspaceTimeline`: timestamped server events and optional notes.
- `WorkspaceEmpty`: a reusable empty state with an optional caller-owned action.

`MissionDetails` provides the read-only mission summary. The unused Volunteer report workspace and report-summary components are retired. Actions remain in the owning role workspace. `AccountWorkspace` owns profile validation and updates rather than placing those responsibilities in the dashboard shell.

Reuse `RecordId` and `QueryState` from `Records.tsx`, the existing `Modal` and `Button` components, and the existing map/mission/offline components. Keep role-specific queries, validation, lifecycle and mutations in their owning feature. Do not move domain logic into these UI primitives or copy their markup into a new role page.

`workspace.css` supplies structural styles; `sharedVisualSystem.css` supplies shared role presentation and `desktopDensity.css` supplies responsive shell sizing. Page styles retain specific Figma compositions. Account desktop sizing uses one rule set with size variables at laptop and large-monitor breakpoints. Use Inter and the shared navy, pale-blue, border, radius and focus tokens rather than adding a separate role theme. Component tests verify semantics, forwarding, selection and handlers. See `docs/testing/LOCAL-CANDIDATE-2026-10-10.md` for current verification limits.
