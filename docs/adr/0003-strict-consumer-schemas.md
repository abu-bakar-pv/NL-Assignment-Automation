# ADR 0003: Strict JSON Schemas describing consumer needs

**Status:** Accepted  **Date:** 2026-11-08

## Context
Contract drift (renamed, added or retyped fields) is the most common integration defect on the platform.

## Decision
Schemas describe what consumers rely on and use `additionalProperties: false`. They are validated with Ajv (draft-07, `allErrors`, formats). Unit tests prove each schema rejects missing, retyped, renamed and unexpected fields.

## Consequences
- A provider adding a field fails the contract check. That is intentional: the change is reviewed and the schema updated in the same PR.
- Slightly more schema maintenance; this is the price of catching drift at the PR.
- The next step on the real platform is consumer-driven contracts with provider verification (e.g. Pact).
