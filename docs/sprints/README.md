# ResQPH sprint process

ResQPH uses lightweight Scrum ceremonies with a Kanban-style GitHub Project. The process provides short planning and feedback cycles without changing the seven official technical phases.

## Relationship between sprints and phases

- A **phase** describes a major project outcome and its technical exit criteria.
- A **sprint** is a time-boxed execution period containing selected GitHub Issues.
- One phase may require several sprints. A sprint should normally focus on one phase, but small dependency work from an adjacent phase may be included when clearly documented.
- Sprint dates and duration are agreed by the team and recorded as `TBD` until approved.

## Working cycle

### Sprint planning

1. Confirm the phase goal and current constraints.
2. Review candidate Issues for readiness, dependencies, and testable acceptance criteria.
3. Select only work the available team can reasonably finish and demonstrate.
4. Confirm a primary owner and supporting contributors for each selected Issue.
5. Move selected work from **Backlog** to **Ready** and record the sprint.

### Short team check-ins

Each member states completed work, next work, dependencies, and blockers. Update the GitHub Issue and Project immediately when status changes; important information should not exist only in chat.

### Development and review

Move work through **Ready -> In Progress -> In Review -> Done**. Use **Blocked** when an external dependency or decision prevents meaningful progress. Each implementation uses a focused branch and pull request, includes verification evidence, and receives at least one teammate review when possible.

### Sprint review and demonstration

Demonstrate completed behavior or artifacts against acceptance criteria. An incomplete item is not counted as done even if coding has started.

### Retrospective

Record what helped, what caused delay or rework, and one or two process changes for the next sprint.

## Carry-over policy

Unfinished work returns to **Backlog** or **Ready** after the sprint review. The team reassesses scope, dependencies, and ownership instead of silently marking it complete or automatically carrying it forward.

## Blocker escalation

Apply the `blocked` label, move the Project item to **Blocked**, and record what is blocked, why, whose input is required, the decision date if known, and what can proceed in parallel. Raise safety, scope, data-access, and integration blockers to the project manager immediately.

## GitHub Issues as sprint tickets

Issues are the source of truth for objectives, owners, requirements, dependencies, acceptance criteria, and verification. Sprint documents summarize the agreed goal and outcomes; they do not replace Issues.

Recommended Project columns:

`Backlog -> Ready -> In Progress -> In Review -> Blocked -> Done`

Recommended fields: **Phase, Sprint, Area, Priority, Owner, Support, Effort, Status**.
