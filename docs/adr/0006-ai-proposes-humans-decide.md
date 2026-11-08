# ADR 0006: AI proposes, humans decide; redact before sending

**Status:** Accepted  **Date:** 2026-11-08

## Decision
- AI output is labelled PROPOSED or UNVERIFIED and has no path into the suite except a reviewed PR.
- All input is redacted by a unit-tested function before any model call, and the redacted input is saved.
- AI workflows are Claude Code skills versioned in `.claude/skills/`. They don't pre-approve tools, so every command they run is approved by the engineer.
- Redaction and bundling stay deterministic scripts, so the data guarantee doesn't depend on the model.

## Consequences
Slower than auto-applying suggestions, by design. Review effort is counted when deciding whether a workflow is worth keeping.
