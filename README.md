# affiant-protocol

The rulebook for [Affiant](https://affiant.dev): the wire format, the numbered invariants and the conformance fixtures that every Affiant implementation — in any language — must satisfy.

Affiant turns every database write an LLM agent proposes into an **Affidavit**: a per-field evidence record (the value, the previous value, where each value came from, how confident) filed in a **Docket** and shown as an **Evidence Card** that a person approves, amends or rejects before the host writes. A **Standing Order** is a policy verdict that approves a write with no person present.

This repository holds no runtime code. It holds:

- `schemas/` — JSON Schema for the wire format: the designed protocol in [`schemas/0.1.0/`](schemas/0.1.0/) (the Affidavit, the field, provenance and bindings, the Docket entry, the attestation, the envelopes, the registries), and the frozen `0.0.1-seed` description of the shipped .NET wire beside it
- `INVARIANTS.md` — the numbered, testable rules an implementation must enforce
- `conformance/` — the fixtures, the runner specification, the driver contract and the parity-manifest format

`schemas/`, `conformance/fixtures/` and `INVARIANTS.md` are on `main`; the runner specification, the driver contract and the parity-manifest format are not yet.

Versions are git tags. Each implementation pins a tag and bumps it in its own pull request; a parity manifest records, per implementation, which fixtures it does not yet pass — in public, checked in CI.

## Implementations

| Language | Repository | Status |
|---|---|---|
| .NET | [Sakwala/affiant](https://github.com/Sakwala/affiant) | shipped — ten NuGet packages at `v1.0.0-beta.1` |
| TypeScript | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) | building in public — `@affiant/contract` first |

## Status

- 2026-09-04 — **schemas v0.1** ([`schemas/0.1.0/`](schemas/0.1.0/), validated fixtures, lint): twenty-one schemas written to `INVARIANTS.md`, at least one fixture per schema derived from the TypeScript reference implementation's own output, one negative per schema the schema must refuse, and a lint that checks both directions in CI — tagged `v0.1.0` with the conformance suite once it lands.
- 2026-09-04 — [`INVARIANTS.md`](INVARIANTS.md) **v0.1 text**: every rule written in full against the TypeScript reference implementation, with the fixture, suite or lint that checks it.
- 2026-09-04 — `INVARIANTS.md` skeleton: every decided rule with a permanent id, four rules written in full (the conversation-scope contract, the review-outcome state machine, canonical serialization, money on the wire).
- 2026-09-04 — seed fixtures and seed schemas derived from the shipped .NET wire, tagged `v0.0.1-seed`; the fixture lint runs in CI. The wire fixtures are hand-authored examples whose key sets are asserted against the shipped serializer, not captures.
- 2026-09-04 — opened, empty by design.

Next: the conformance suite — the reference implementation's declarative fixtures promoted unchanged, the driver contract, and a published parity manifest per implementation. Follow progress in [Discussions](https://github.com/Sakwala/affiant-protocol/discussions) and the [Affiant roadmap](https://github.com/Sakwala/affiant/blob/main/ROADMAP.md).

## Licence

Apache-2.0 — see [LICENSE](LICENSE).
