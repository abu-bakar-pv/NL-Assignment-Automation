# ADR 0002: Playwright fixtures for dependency injection, one client per resource

**Status:** Accepted  **Date:** 2026-11-08

## Context
Tests were at risk of mixing URLs, headers, auth and assertions in one place, which makes them hard to read and expensive to change.

## Decision
- Resource clients (`BookingClient`, `AuthClient`, `DealerClient`) own paths, verbs and auth headers.
- A thin `ApiClient` owns transport concerns: logging, masking, attaching evidence.
- Playwright fixtures wire clients, tokens and self-cleaning data into tests.

## Alternatives considered
- **Page-object-style base class with inheritance:** rejected. Inheritance hierarchies grow brittle; composition through fixtures is simpler.
- **Generated clients from OpenAPI:** good for large surfaces; revisit when the inventory exceeds roughly 30 endpoints.

## Consequences
An endpoint change touches one client. Tests read as behaviour. Fixtures are a Playwright concept, so the team has to know them, which is covered in onboarding.
