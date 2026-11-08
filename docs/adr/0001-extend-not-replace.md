# ADR 0001: Extend the existing framework instead of replacing it

**Status:** Accepted  **Date:** 2026-11-08

## Context
An in-house framework is in active use. Its owner has years of domain knowledge encoded in it and will maintain it after this engagement.

## Decision
Introduce patterns (resource clients, builders, schema matchers, tagged gate, virtualisation) additively and one at a time. New tests use them; existing tests migrate when they are touched.

## Consequences
- Delivery isn't paused, and the owner keeps ownership and understanding.
- Two styles coexist for a while. That's acceptable, and the migration progress is tracked.
- This repository is a reference for the patterns, not a replacement framework.
