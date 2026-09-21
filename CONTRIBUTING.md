# Contributing to ResQPH

This document defines how the ResQPH team plans, implements, reviews, tests, and documents project work.

## Core workflow

Every planned change should follow this sequence:

1. Create or select a GitHub Issue.
2. Assign one primary owner and identify supporting contributors.
3. Add the appropriate phase milestone and labels.
4. Confirm the requirements, dependencies, and acceptance criteria.
5. Create a branch from the latest `main` branch.
6. Implement and test the change.
7. Open a pull request linked to the Issue.
8. Request at least one teammate review.
9. Address review comments and complete integration testing.
10. Merge only after the acceptance criteria are satisfied.

Do not commit directly to `main` during normal development.

## GitHub Issues

GitHub Issues are the project's ticketing system. Use the appropriate template:

- Feature or implementation task
- Bug report
- Research or technical decision
- Dataset task

Each Issue must include:

- A clear objective
- One primary owner
- Supporting contributors when needed
- The official project phase
- Requirements
- Testable acceptance criteria
- Known dependencies
- Verification instructions

The primary owner is accountable for moving the Issue forward and communicating blockers. Supporting contributors may implement parts of the work, review changes, or help with integration.

## Official project phases

Use the following milestones:

1. Project Foundation Phase 1 — Requirements and Data Validation
2. Project Foundation Phase 2 — Core Application
3. Team Phase 1 — Mapping and Geospatial Pipeline
4. Team Phase 2 — Flood-Aware Routing
5. Team Phase 3 — AI/ML Road-Risk Component
6. Team Phase 4 — Limited Offline Support
7. Team Phase 5 — Integration, Testing, and Presentation

The team-facing phase numbering starts at **Team Phase 1** after Ranee completes the two Project Foundation phases. Do not use the former generic Phase 1–7 names in new Issues, milestones, pull requests, or status reports.

## Time-constrained MVP priority

When time or capacity is limited, prioritize work in this order:

1. A demonstrable rescue-request, assignment, mission-status, deterministic A*, and rule-based fallback workflow.
2. The required Logistic Regression and Random Forest experiment with honest evaluation; integrate its output only if the evidence gate passes.
3. One cached assigned mission and one queued next-valid status update.
4. Optional historical-data enrichment, elevation context, visual polish, and extra analytics.

Never delay the deterministic end-to-end workflow to add optional enrichment. Scope reductions require Ranee's decision and an update to the decision log.

## Branches

Create branches from an up-to-date `main` branch.

Branch naming formats:

- `feature/ISSUE-NUMBER-short-description`
- `bugfix/ISSUE-NUMBER-short-description`
- `research/ISSUE-NUMBER-short-description`
- `data/ISSUE-NUMBER-short-description`
- `docs/ISSUE-NUMBER-short-description`
- `setup/ISSUE-NUMBER-short-description`

Examples:

- `feature/12-citizen-request-form`
- `bugfix/27-mission-status-validation`
- `research/31-flood-dataset-options`
- `data/34-road-network-preprocessing`

Keep each branch focused on one primary Issue.

## Commits

Write short, descriptive commit messages using an imperative verb.

Examples:

- `Add citizen rescue request validation`
- `Fix mission status transition check`
- `Document flood dataset limitations`
- `Test rerouting around impassable roads`

Avoid vague messages such as `update`, `changes`, `fix`, or `final`.

Do not commit:

- Passwords, tokens, or private keys
- Real `.env` files
- Real private contact or emergency information
- Dependency folders such as `node_modules` or `.venv`
- Large raw or processed datasets
- Generated model artifacts unless the team explicitly approves an appropriate storage method
- Unrelated editor, operating-system, log, or temporary files

## Pull requests

Open a pull request when the work is ready for review. The pull request must:

- Link its Issue using `Closes #ISSUE-NUMBER`
- Use the repository pull-request template
- Explain the changes and affected components
- Include testing instructions and results
- Include screenshots for relevant UI changes
- Include sanitized API output, route comparisons, or model results when relevant
- State known risks and limitations
- Request at least one reviewer who did not author the change

Do not combine unrelated Issues in one pull request.

## Reviews

Reviewers should check:

- The linked Issue and acceptance criteria
- Correctness and scope
- Error and failure handling
- Data consistency and validation
- Frontend-backend contract compatibility
- Routing and geographic assumptions
- AI/ML evidence, explainability, and fallback behavior
- Test coverage and reproducibility
- Documentation
- Absence of secrets and private data

Review comments should be specific, respectful, and actionable.

## Definition of done

An Issue is done only when:

- The acceptance criteria are satisfied.
- The implementation or document is complete.
- Relevant tests pass.
- Error and failure cases are handled where appropriate.
- The work is integrated with dependent components.
- Documentation is updated.
- At least one teammate has reviewed the pull request.
- The change is merged into `main`.
- The completed behavior can be demonstrated or otherwise verified.

Writing code alone does not make an Issue done.

## Research and technical decisions

Research Issues must end with:

- Options considered
- Evaluation criteria
- Evidence and source links
- A recommendation
- Risks and limitations
- A recorded team decision

Do not close a research Issue with only a collection of links.

## Data handling

For every external dataset, document:

- Source and download link
- License and attribution requirements
- Geographic and temporal coverage
- File format and coordinate reference system
- Processing steps
- Quality limitations and uncertainty
- Responsible member

Large datasets belong outside ordinary Git history. Commit metadata, acquisition instructions, processing scripts, and small test samples instead.

## AI/ML expectations

AI/ML supports routing and does not replace deterministic rules or human rescue decisions.

The AI/ML work must include:

- A rule-based baseline
- Documented data preparation
- Appropriate train, validation, and test separation when supervised learning is used
- Evaluation metrics and error analysis
- Explainable integration with the routing cost
- A documented fallback when the available data are not sufficient for a defensible model

## Communication and blockers

Update the assigned Issue when progress, scope, dependencies, or blockers change. Apply the `blocked` label and explain:

- What is blocked
- Why it is blocked
- Which member or decision is needed
- What work can continue in the meantime

Important project decisions should be recorded in GitHub or the appropriate Markdown document rather than existing only in private messages.
