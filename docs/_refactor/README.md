# Refactor Workstream Index

This directory holds targeted refactor plans for concrete defects and
architectural inconsistencies identified during repository review. It mirrors
the structure used in `docs/_specs/`: each refactor gets one folder with a
`spec.md` and a `sprints/` implementation plan.

## When To Use `_refactor/`

Use `_refactor/` when the problem is not a new product capability but a multi-file correctness, integrity, or safety issue.

Typical cases:

- auth and identity boundary cleanup
- migration correctness
- prompt-boundary hardening
- persistence or indexing repair

If the work introduces new user-facing product behavior, it usually belongs under `_specs/` instead.

For the full workflow around specs, sprints, QA, and LLM guardrails, read:

1. `../../README.md`
2. `../operations/agentic-delivery-playbook.md`
3. `../operations/architecture-diagrams.md`
4. `../_specs/README.md`

## Workstreams

| Refactor | Status | Sprints | Scope |
| --- | --- | --- | --- |
| [System Integrity Remediation Program](system-integrity-remediation-program/) | Planned | 4 | Coordinate all confirmed audit findings across auth, anonymous persistence, migration integrity, and summary safety |
| [Session Identity Boundary Hardening](session-identity-boundary-hardening/) | Planned | 3 | Remove mock-cookie auth fallback, constrain role simulation to real sessions, and clean up invalid session state |
| [Anonymous Conversation Consistency](anonymous-conversation-consistency/) | Planned | 3 | Align middleware, routes, and client restore flow for anonymous conversation persistence |
| [Conversation Search Migration Integrity](conversation-search-migration-integrity/) | Planned | 3 | Preserve conversation-search index correctness across anonymous-to-authenticated migration |
| [Summary Context Hardening](summary-context-hardening/) | Planned | 3 | Convert summary replay into server-owned context and add regression coverage |

## Why A Separate Refactor Area

These changes are narrower than a new product feature but larger than a single
bugfix. They cut across persistence, auth, search, and prompt assembly. Keeping
them under `docs/_refactor/` avoids bloating the feature specs while still
providing implementation-grade sprint documents.

## Dependency Order

1. System Integrity Remediation Program
2. Anonymous Conversation Consistency
3. Session Identity Boundary Hardening
4. Conversation Search Migration Integrity
5. Summary Context Hardening

The umbrella program defines rollout order, verification gates, and ownership
across the issue-specific workstreams. The next three are user-facing
correctness and auth-integrity issues. The summary work is a reliability and
prompt-boundary hardening pass that should land after identity and ownership
rules are stable.

## Teaching Value

This folder is useful for students because it shows a different kind of agentic work from feature delivery. A refactor workstream forces the team to:

- define the defect clearly
- isolate the contract that was violated
- break the repair into controlled sprints
- prove the fix with regression coverage

That is the part many AI-assisted teams skip, and it is where drift and false confidence usually show up.
