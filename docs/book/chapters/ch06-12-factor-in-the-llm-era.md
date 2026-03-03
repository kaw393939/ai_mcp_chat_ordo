# Chapter 6 - 12-Factor in the LLM Era

## Abstract
12-Factor remains a strong backbone for modern systems, including AI-backed apps. This chapter translates each factor into concrete practices for LLM routes, provider integrations, and operational scripts.

## Why 12-Factor Still Matters
LLM-enabled apps are still apps. They still fail in predictable ways: configuration drift, release inconsistency, weak observability, fragile shutdown behavior, and unclear operational ownership.

12-Factor remains relevant because it defines operationally durable defaults. In AI-backed systems, these defaults become more important, not less.

## Factor Reinterpretation for LLM Systems

> These factors were distilled by Adam Wiggins and the Heroku team from thousands of real deployments. See [Chapter 0](ch00-the-people-behind-the-principles.md) for the full story.

### Codebase (I)
One codebase tracked in version control, many deploys. LLM applications often proliferate experimental forks that diverge silently. Treat model-specific configurations, prompt contracts, and tool schemas as code — not as ad-hoc customizations outside the repository.

### Dependencies (II)
Explicitly declare and isolate all dependencies. In LLM systems this extends to model versions: a dependency on `claude-haiku-4-5` is as versioned a dependency as `react@19`. Undeclared behavioral dependencies on implicit model versions are a frequent, hard-to-debug failure mode.

### Config (III)
External model keys and model identifiers increase secret and drift risk. Config must be centralized, validated, and environment-specific. Never hardcode API keys or model aliases in source. Validate at startup so misconfiguration fails loudly rather than silently.

### Backing Services (IV)
LLM providers are attached resources — external services accessed over a network — that can fail, timeout, or change behavior without notice. Provider abstraction and resilience strategy (retries, fallback chains) are not optional.

### Build/Release/Run (V)
When model behavior and runtime settings interact, reproducibility depends on strict stage separation and release metadata. A build artifact should be immutable. A release pairs that build with environment-specific config. A run executes a specific, traceable release — not an ambiguous combination of local files.

### Processes (VI)
Execute the app as one or more stateless processes. For LLM routes, this means no in-memory conversation state that survives process restarts. Session state belongs in the client or an external store — never in a module-level variable that disappears on redeploy.

### Port Binding (VII)
Export services via port binding. Health and readiness endpoints make the application's contract explicit and independently verifiable, without relying on platform-specific mechanisms to expose the service.

### Concurrency (VIII)
Scale out via the process model, not by making individual processes larger. Streaming and API routes are inherently concurrent. Design for stateless horizontal scale rather than vertical scaling of a single stateful instance.

### Disposability (IX)
Streaming routes make shutdown semantics critical. Graceful drain behavior is no longer optional. A process that cannot stop cleanly will corrupt in-flight requests and make zero-downtime deployment impossible.

### Dev/Prod Parity (X)
Keep development, staging, and production as similar as possible. For LLM apps, this includes model behavior: using a smaller or different model locally than in production creates a parity gap that can produce significant behavioral divergence before any code is deployed.

### Logs (XI)
Treat logs as event streams. Structure them so they can be aggregated, queried, and acted on. Request correlation IDs and error taxonomy make incident response possible; ad hoc log strings and `console.log` make it a guessing game.

### Admin Processes (XII)
Run admin and management tasks as one-off processes in the same environment as production. Secret rotation, health sweeps, release validation, and environment diagnosis should be executable identically in production and development.

## Repository Example: Practical Compliance Moves
This repository implemented concrete 12-factor controls:

- Config centralization and validation in `src/lib/config/env.ts`.
- Build/release/run scripting in `package.json` and release-manifest scripts.
- Health contracts through `/api/health/live` and `/api/health/ready`.
- Graceful process lifecycle through `scripts/start-server.mjs`.
- Observability and error taxonomy through route envelopes and structured events.
- Admin one-off commands in `scripts/admin-*.ts`.
- Environment parity profile via templates and container artifacts.

The important pattern is not any single file. It is the conversion of each factor into executable checks and repeatable commands.

## Practical Lens
Treat 12-factor as a checklist of testable architecture properties, not a documentation style.

## Validation Strategy
For each factor, require three proofs:

1. **Implementation proof**: a concrete module/script/route.
2. **Command proof**: a repeatable command demonstrating behavior.
3. **Artifact proof**: a document or audit record preserving outcome.

Without all three, compliance is incomplete.

## Additional Evidence
- Config hardening and compatibility handling were centralized in `src/lib/config/env.ts`.
- Build-release-run separation and release metadata are encoded in `package.json` + `scripts/generate-release-manifest.mjs`.
- Health/readiness and admin process scripts are implemented as executable operations, not just documentation.
- Parity profile is backed by `Dockerfile`, `compose.yaml`, and env template parity checks.

## Exercise
Run a 12-factor mini-audit on one service in your organization:

1. Score each factor pass/partial/fail.
2. For each partial/fail, create one sprint with acceptance checks.
3. Execute two sprints and publish a QA artifact with objective results.

This exercise usually reveals whether your team treats operations as engineering or as policy.

## Diagram Prompt
Create a matrix diagram with 12-factor rows and three proof columns: implementation proof, command proof, artifact proof. Fill one concrete example per row.

## Chapter Checklist
- Is each factor mapped to concrete implementation and validation evidence?
- Are operational claims reproducible by command?
- Is compliance framed as a living state, not a one-time declaration?

12-factor in the LLM era is not nostalgia. It is operational survival with better tools.
