# PACT Examples

This repo contains the **runtime SDK**, **provider adapter**, and **examples** for integrating Pact into agents.

**Goal:** How devs integrate Pact into agents.

---

## Quickstart

From the repo root:

```bash
pnpm install --frozen-lockfile
pnpm -r test
pnpm example:happy
```

---

## Directory map

| Path | Description |
|------|-------------|
| `packages/sdk` | Runtime SDK: negotiation, policy, boundary, transcript store, replay |
| `packages/provider-adapter` | Provider server and registry (demo provider) |
| `examples/` | Example flows: basic-happy, timeout, dispute, reconcile, providers |

---

## Minimal docs

- **[How to run examples](./docs/examples/HOW_TO_RUN_EXAMPLES.md)** — Run example flows and tests
- **[How to start demo provider](./docs/examples/HOW_TO_START_DEMO_PROVIDER.md)** — Start the demo provider server
- **[How to verify with pact-protocol](./docs/examples/HOW_TO_VERIFY_WITH_PACT_PROTOCOL.md)** — Generate transcripts here and verify with the pact-protocol verifier (bridge between repos)

---

For the **evidence standard and offline verifier** (schemas, verifier CLI, constitution, auditor packs), see **pact-protocol**.

**Maintainers:** When building the pact-examples export from the monorepo, copy the current `packages/sdk`, `packages/provider-adapter`, `examples/`, and optionally `fixtures/` so the gate and tests pass; use the latest `packages/sdk` (including `src/__mocks__/` and updated `vitest.config.ts`) for passport-free test runs.
