# affiant-protocol

The rulebook for [Affiant](https://affiant.dev): the wire format, the numbered invariants and the conformance fixtures that every Affiant implementation — in any language — must satisfy.

**[Implement Affiant in your language →](IMPLEMENTING.md)** — how a new implementation, in any language and under its own name, becomes a conforming one.

Affiant turns every database write an LLM agent proposes into an **Affidavit**: a per-field evidence record (the value, the previous value, where each value came from, how confident) filed in a **Docket** and shown as an **Evidence Card** that a person approves, amends or rejects before the host writes. A **Standing Order** is a policy verdict that approves a write with no person present.

This repository holds no runtime code. It holds:

- `schemas/` — JSON Schema for the wire format: the designed protocol in [`schemas/0.1.0/`](schemas/0.1.0/) (the Affidavit, the field, provenance and bindings, the Docket entry, the attestation, the envelopes, the registries), and the frozen `0.0.1-seed` description of the shipped .NET wire beside it
- `INVARIANTS.md` — the numbered, testable rules an implementation must enforce
- `conformance/` — the fixtures, the runner specification, the driver contract and the parity-manifest format

`schemas/`, `INVARIANTS.md` and the whole of `conformance/` — the fixtures, the runner specification, the driver contract and the parity-manifest format — are tagged `v0.1.1`, and **both** drivers have run against it: the .NET implementation's parity manifest and run log are published here, with every fixture the negative oracle lists failing against the release it was meant to fail against, and the TypeScript reference implementation's beside them, with an empty failing set.

Versions are git tags. Each implementation pins a tag and bumps it in its own pull request; a parity manifest records, per implementation, which fixtures it does not yet pass — in public, checked in CI.

## Implementations

| Language | Repository | Status |
|---|---|---|
| .NET | [Sakwala/affiant](https://github.com/Sakwala/affiant) | shipped — ten NuGet packages at `v1.0.0-beta.1`. Conformant to the subset it passes: 0 of 63 fixtures at `v0.1.1`, with every gap named in [`conformance/parity/dotnet-v0.1.json`](conformance/parity/dotnet-v0.1.json) |
| TypeScript | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) | building in public — the reference implementation. Conformant: 63 of 63 fixtures on Node, Bun and workerd, with an empty failing set in [`conformance/parity/typescript-v0.1.json`](conformance/parity/typescript-v0.1.json) |

## Status

- 2026-09-04 — **`v0.1.2` is tagged: SR-1 states what the canonical form is taken over, and two pinned hashes move.** The
  form is over the **Affidavit as [`schemas/0.1.0/affidavit.schema.json`](schemas/0.1.0/affidavit.schema.json) defines
  it** — `protocolVersion` included, alongside `conversationTurn` and `createdAt`. The Evidence Card envelope's
  presentation is **not** in it: `allowedValues`, `pattern`, `warnings` and `requiresConfirmation` are a host's rendering
  of a proposal rather than its sworn substance, and a rendering decision inside a hash a grant is checked against would
  let restyling an input invalidate a grant minted over evidence that did not change. The seven canonical vectors already
  stated both halves — every one's `expectedBytesUtf8` carries `protocolVersion`, and none carries a presentation key — so
  no vector, schema or wire changed here.

  What was wrong was the **reference implementation's runtime form**, not this text. Its Affidavit model omitted
  `protocolVersion` and its wire writer added it on the way out, so the bytes a Docket row's `canonicalHash` was taken
  over — the bytes a host's execution grant binds to — were not the bytes of the same record on a card. Two declarative
  fixtures pinned a hash produced by that path and are re-promoted from the corrected reference:
  [`sequence-a/approve-round-trip`](conformance/fixtures/sequence-a/01-approve-round-trip.json)
  `776b7b40…6837275` → `2ce4c4af…840eca9` and
  [`decide/amend-recompute`](conformance/fixtures/decide/06-amend-recompute.json)
  `8d1579d7…4ecff6a` → `d389401d…3bd3402`. The corrected bytes are the previous bytes with one key inserted. Those two
  values are the only ones that moved.

  An earlier draft of this amendment said the opposite — that `protocolVersion` was envelope-only and absent from the
  canonical form — and was **not** made, because the vectors refuse it. This entry replaces that note. The same commit's
  GT-4 amendment stands unchanged: GT-4 already said entry ids are "derived deterministically from the tenant, the
  conversation, the tool and the canonical form of the operation and its arguments", and a **Derivation** paragraph states
  exactly what that means — the canonical-JSON material (`tenantId`, `conversationId`, `toolName`, `operation`, `args`,
  and `supersedes` present only on a resubmission), the SHA-256 digest over its UTF-8 bytes, and the RFC 9562 UUIDv8
  layout — matching the reference implementation's `deriveEntryId` (`Sakwala/affiant-ts`
  `packages/core/src/gate/pipeline.ts`), and why the id's material is not the Affidavit's own canonical form (SR-1): the
  id must be fixed before inference runs, and inference is not deterministic.

- 2026-09-04 — **both runs republished at `v0.1.1`** ([`conformance/parity/`](conformance/parity/), [`conformance/results/`](conformance/results/)). The TypeScript reference implementation is unchanged: 63 of 63, empty failing set, on Node, Bun and workerd. The .NET reading moves from 3 of 63 to **0 of 63**, and no code changed on either side — the three canonical vectors it passed at `v0.1.0` were being measured against a record [`schemas/0.1.0/affidavit.schema.json`](schemas/0.1.0/affidavit.schema.json) refuses, two of them against no record at all. Its driver's own canonicaliser still reproduces the pinned bytes and digest for six of the seven regenerated vectors, at the first attempt and unedited; what it cannot do is **hold** the shape, which is the `1.0.0-beta.3` model gap the manifest already named. The 63 rows are 53 `planned` and 10 `fenced`; none is `fixed`.

- 2026-09-04 — **`v0.1.1` is tagged**: the seven canonical byte vectors regenerated, and the lint now validates them against the Affidavit schema. The vectors published at `v0.1.0` were promoted from the TypeScript reference implementation **before** it was aligned to this version's wire, and nothing here checked them afterwards — so every one of their inputs described a seed-shaped record that [`schemas/0.1.0/affidavit.schema.json`](schemas/0.1.0/affidavit.schema.json) refuses: `operationType` `"WriteUpdate"`, the card's presentation on the fields, `warnings` and `requiresConfirmation` on the record, `evidence` where a tag says `note`, and no `protocolVersion`, `conversationTurn` or `createdAt`. `INVARIANTS.md` SR-1 defines the canonical form over the accepted state of the Affidavit *as the schema defines it*, so those vectors pinned the bytes of a document this protocol does not have. Every byte and every digest moved. A vector that carries amendments now also records `amendedInput`, the accepted state its bytes are taken over, and [`conformance/lint/lint.mjs`](conformance/lint/lint.mjs) holds both ends of every vector against the Affidavit schema on every push — the check that would have caught this. **No rule text and no schema changed**: the wire, the `0.1.0` schemas and the 56 declarative fixtures are `v0.1.0`'s, unchanged.

- 2026-09-04 — **`v0.1.0` is tagged**: `INVARIANTS.md` v0.1, the `0.1.0` schemas, the conformance suite (56 fixtures, 7 canonical byte vectors), and a parity manifest and published run for each of the two implementations. Two things were settled first, each filed as an issue against this repository and closed by the change that answered it. The promoted fixture `sequence-a/typed-inputs-on-the-card` stated `allowedValues` and `pattern` on `expect.card.fields[]` — where the reference implementation carried them before it was aligned to this version's wire — and was **re-promoted** stating `expect.card.presentation[]`, with [`conformance/RUNNER.md`](conformance/RUNNER.md) §4.2 and [`conformance/fixture.schema.json`](conformance/fixture.schema.json) changed in the same commit; that was possible only because no tag existed yet, since a parity manifest cites a fixture by id and one produced against one set of bytes says nothing about another. And [`schemas/0.1.0/evidence-card-request.schema.json`](schemas/0.1.0/evidence-card-request.schema.json) gained an optional `hostOperation`, so that the host's own verb for an operation has somewhere to travel now that `operationType` is the protocol's two-valued shape — which is what both `affidavit.schema.json` and `operation.schema.json` had been telling a reader all along.
- 2026-09-04 — **the TypeScript run is published** ([`conformance/parity/typescript-v0.1.json`](conformance/parity/typescript-v0.1.json), [`conformance/results/typescript-0.1.0-alpha.0/`](conformance/results/typescript-0.1.0-alpha.0/)): the reference implementation at `0.1.0-alpha.0`, 63 fixtures run, 63 passed, an **empty** failing set, asserted in its own CI on Node, Bun and workerd — the failing set must be identical on each (RT-1).
- 2026-09-04 — **the first parity manifest and run are published** ([`conformance/parity/dotnet-v0.1.json`](conformance/parity/dotnet-v0.1.json), [`conformance/results/dotnet-1.0.0-beta.1/`](conformance/results/dotnet-1.0.0-beta.1/)): the .NET conformance driver run against the shipped packages at `1.0.0-beta.1` — 63 fixtures run, 3 passed, 60 failed, 0 errored, 0 skipped, and all 19 fixtures the negative oracle lists failed. The 60 gaps carry a disposition each: 50 `planned`, every one for `1.0.0-beta.3`, and 10 `fenced` behind a named host-side workaround. None is `fixed`, because that value names a release a reader can install. `planned` is new in the parity format ([`conformance/PARITY.md`](conformance/PARITY.md)) — a gap that is scheduled is not a gap nobody is doing anything about, and the format now has a value for each. Three rows of the negative oracle were corrected by what the run showed rather than the run being tuned to match them ([`conformance/ORACLE.md`](conformance/ORACLE.md)).
- 2026-09-04 — **conformance suite v0.1** ([`conformance/`](conformance/)): the reference implementation's 56 declarative fixtures and seven canonical byte vectors promoted unchanged in id and content, the fixture format ([`conformance/RUNNER.md`](conformance/RUNNER.md)), the driver contract ([`conformance/DRIVER.md`](conformance/DRIVER.md)), the parity-manifest format ([`conformance/PARITY.md`](conformance/PARITY.md)), the negative-oracle list carried as data on every fixture, and a lint that checks rule coverage in both directions — every rule enforced by a fixture that names it back, every rule a fixture names one that exists — and prints the report in CI. Thirty-two of the forty-three rules are checked by a fixture; the other eleven are exempt by name, each with a version and a reason.
- 2026-09-04 — **schemas v0.1** ([`schemas/0.1.0/`](schemas/0.1.0/), validated fixtures, lint): twenty-one schemas written to `INVARIANTS.md`, at least one fixture per schema derived from the TypeScript reference implementation's own output, one negative per schema the schema must refuse, and a lint that checks both directions in CI — tagged `v0.1.0` with the conformance suite once it lands.
- 2026-09-04 — [`INVARIANTS.md`](INVARIANTS.md) **v0.1 text**: every rule written in full against the TypeScript reference implementation, with the fixture, suite or lint that checks it.
- 2026-09-04 — `INVARIANTS.md` skeleton: every decided rule with a permanent id, four rules written in full (the conversation-scope contract, the review-outcome state machine, canonical serialization, money on the wire).
- 2026-09-04 — seed fixtures and seed schemas derived from the shipped .NET wire, tagged `v0.0.1-seed`; the fixture lint runs in CI. The wire fixtures are hand-authored examples whose key sets are asserted against the shipped serializer, not captures.
- 2026-09-04 — opened, empty by design.

Next: the first adapter, and the rules a v0.2 owes it — the call-site and delegation fixtures four coverage rules are exempt from until then. Follow progress in [Discussions](https://github.com/Sakwala/affiant-protocol/discussions) and the [Affiant roadmap](https://github.com/Sakwala/affiant/blob/main/ROADMAP.md).

## Licence

Apache-2.0 — see [LICENSE](LICENSE).
