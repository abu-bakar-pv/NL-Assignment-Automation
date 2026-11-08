# ADR 0005: Virtualise unavailable downstream systems for the gate

**Status:** Accepted  **Date:** 2026-11-08

## Context
Some downstream systems (DMS sandboxes) are not reliably available in test environments. The sample public API also has no authorisation model to test against.

## Decision
A small virtualised gateway (`mock/dealer-gateway`) provides OAuth2 client-credentials tokens, scopes, tenant isolation and DMS failure modes. Playwright starts it via `webServer`. The PR gate never depends on an unreliable real system.

## Consequences
- Fast, deterministic tests for auth and resilience behaviour.
- Mocks can drift from reality. On the real platform, stubs are generated from provider-verified contracts, and a nightly job compares recordings with stubs.
