# affiant-protocol

The rulebook for [Affiant](https://affiant.dev): the wire format, the numbered invariants and the conformance fixtures that every Affiant implementation — in any language — must satisfy.

**[Implement Affiant in your language →](IMPLEMENTING.md)** — how a new implementation, in any language and under its own name, becomes a conforming one.

Affiant turns every database write an LLM agent proposes into an **Affidavit**: a per-field evidence record (the value, the previous value, where each value came from, how confident) filed in a **Docket** and shown as an **Evidence Card** that a person approves, amends or rejects before the host writes. A **Standing Order** is a policy verdict that approves a write with no person present.

This repository holds no runtime code. It holds:

- `schemas/` — JSON Schema for the wire format: the designed protocol in [`schemas/0.1.0/`](schemas/0.1.0/) (the Affidavit, the field, provenance and bindings, the Docket entry, the attestation, the envelopes, the registries), and the frozen `0.0.1-seed` description of the shipped .NET wire beside it
- `INVARIANTS.md` — the numbered, testable rules an implementation must enforce
- `conformance/` — the fixtures, the runner specification, the driver contract and the parity-manifest format

`schemas/`, `INVARIANTS.md` and the whole of `conformance/` — the fixtures, the runner specification, the driver contract and the parity-manifest format — are on `main`, and the first driver has run: the .NET implementation's parity manifest and its run log are published here, and every fixture the negative oracle lists failed against the release it was meant to fail against. What is outstanding is the TypeScript run, which is expected to publish an empty failing set.

Versions are git tags. Each implementation pins a tag and bumps it in its own pull request; a parity manifest records, per implementation, which fixtures it does not yet pass — in public, checked in CI.

## Implementations

| Language | Repository | Status |
|---|---|---|
| .NET | [Sakwala/affiant](https://github.com/Sakwala/affiant) | shipped — ten NuGet packages at `v1.0.0-beta.1`. Conformant to the subset it passes: 3 of 63 fixtures, with every gap named in [`conformance/parity/dotnet-v0.1.json`](conformance/parity/dotnet-v0.1.json) |
| TypeScript | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) | building in public — `@affiant/contract` first |

## Status

- 2026-09-04 — **the first parity manifest and run are published** ([`conformance/parity/dotnet-v0.1.json`](conformance/parity/dotnet-v0.1.json), [`conformance/results/dotnet-1.0.0-beta.1/`](conformance/results/dotnet-1.0.0-beta.1/)): the .NET conformance driver run against the shipped packages at `1.0.0-beta.1` — 63 fixtures run, 3 passed, 60 failed, 0 errored, 0 skipped, and all 19 fixtures the negative oracle lists failed. The 60 gaps carry a disposition each: 49 `planned` for `1.0.0-beta.3`, 10 `fenced` behind a named host-side workaround, 1 `fixed`. `planned` is new in the parity format ([`conformance/PARITY.md`](conformance/PARITY.md)) — a gap that is scheduled is not a gap nobody is doing anything about, and the format now has a value for each. Three rows of the negative oracle were corrected by what the run showed rather than the run being tuned to match them ([`conformance/ORACLE.md`](conformance/ORACLE.md)).
- 2026-09-04 — **conformance suite v0.1** ([`conformance/`](conformance/)): the reference implementation's 56 declarative fixtures and seven canonical byte vectors promoted unchanged in id and content, the fixture format ([`conformance/RUNNER.md`](conformance/RUNNER.md)), the driver contract ([`conformance/DRIVER.md`](conformance/DRIVER.md)), the parity-manifest format ([`conformance/PARITY.md`](conformance/PARITY.md)), the negative-oracle list carried as data on every fixture, and a lint that checks rule coverage in both directions — every rule enforced by a fixture that names it back, every rule a fixture names one that exists — and prints the report in CI. Thirty-two of the forty-three rules are checked by a fixture; the other eleven are exempt by name, each with a version and a reason.
- 2026-09-04 — **schemas v0.1** ([`schemas/0.1.0/`](schemas/0.1.0/), validated fixtures, lint): twenty-one schemas written to `INVARIANTS.md`, at least one fixture per schema derived from the TypeScript reference implementation's own output, one negative per schema the schema must refuse, and a lint that checks both directions in CI — tagged `v0.1.0` with the conformance suite once it lands.
- 2026-09-04 — [`INVARIANTS.md`](INVARIANTS.md) **v0.1 text**: every rule written in full against the TypeScript reference implementation, with the fixture, suite or lint that checks it.
- 2026-09-04 — `INVARIANTS.md` skeleton: every decided rule with a permanent id, four rules written in full (the conversation-scope contract, the review-outcome state machine, canonical serialization, money on the wire).
- 2026-09-04 — seed fixtures and seed schemas derived from the shipped .NET wire, tagged `v0.0.1-seed`; the fixture lint runs in CI. The wire fixtures are hand-authored examples whose key sets are asserted against the shipped serializer, not captures.
- 2026-09-04 — opened, empty by design.

Next: the TypeScript driver — merge-blocking in its own repository, and expected to publish an empty failing set here. Then `v0.1.0` is tagged. Follow progress in [Discussions](https://github.com/Sakwala/affiant-protocol/discussions) and the [Affiant roadmap](https://github.com/Sakwala/affiant/blob/main/ROADMAP.md).

## Licence

Apache-2.0 — see [LICENSE](LICENSE).
