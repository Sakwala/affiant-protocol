# affiant-protocol

The rulebook for [Affiant](https://affiant.dev): the wire format, the numbered invariants and the conformance fixtures that every Affiant implementation — in any language — must satisfy.

Affiant turns every database write an LLM agent proposes into an **Affidavit**: a per-field evidence record (the value, the previous value, where each value came from, how confident) filed in a **Docket** and shown as an **Evidence Card** that a person approves, amends or rejects before the host writes. A **Standing Order** is a policy verdict that approves a write with no person present.

This repository holds no runtime code. It will hold:

- `schemas/` — JSON Schema for the wire format (Affidavit, Field, ProvenanceTag, DocketEntry, the envelopes, the registries)
- `INVARIANTS.md` — the numbered, testable rules an implementation must enforce
- `conformance/` — the fixtures, the runner specification, the driver contract and the parity-manifest format

Versions are git tags. Each implementation pins a tag and bumps it in its own pull request; a parity manifest records, per implementation, which fixtures it does not yet pass — in public, checked in CI.

## Implementations

| Language | Repository | Status |
|---|---|---|
| .NET | [Sakwala/affiant](https://github.com/Sakwala/affiant) | shipped — ten NuGet packages at `v1.0.0-beta.1` |
| TypeScript | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) | building in public — `@affiant/contract` first |

## Status

Opened 2026-09-04, empty by design. The first content is the wire fixtures captured from the shipped .NET hosts, then a skeleton of `INVARIANTS.md`, then the schemas and the fixture suite written against a working TypeScript core. Follow progress in [Discussions](https://github.com/Sakwala/affiant-protocol/discussions) and the [Affiant roadmap](https://github.com/Sakwala/affiant/blob/main/ROADMAP.md).

## Licence

Apache-2.0 — see [LICENSE](LICENSE).
