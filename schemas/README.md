# Schemas

JSON Schema (draft 2020-12) for the Affiant wire format.

## Two directories

There are two schema sets here, side by side, and they describe different things.

| Directory | Version | What it is |
|---|---|---|
| `schemas/*.schema.json` | `0.0.1-seed` | **The seed.** A description of the wire one shipped implementation sends *today*, read off its models and checked against example payloads. Eight schemas. Frozen: nothing in it changes. |
| [`schemas/0.1.0/`](0.1.0/) | `0.1.0` | **The designed protocol.** Twenty-one schemas written to [`../INVARIANTS.md`](../INVARIANTS.md), covering the Docket row, the attestation record, bindings, money, the refusal registry and the telemetry registry — none of which the seed had a schema for at all. |

They are **not compatible**, on purpose, and both stay: the seed is what an adopter of the shipped .NET packages
is looking at right now, and v0.1 is what both implementations are being brought to. Each has its own fixture set
in [`../conformance/fixtures/`](../conformance/fixtures/) (`wire/` for the seed, `v0.1/` for v0.1) and both are
checked by the same lint on every push.

Start at [`0.1.0/README.md`](0.1.0/README.md) for the `protocolVersion` policy, the `$id` note, the renames, and a
table of what changed from the seed. The rest of this file is about the seed.

## What these are

A **seed**, version `0.0.1-seed`, derived from the wire a shipped implementation already sends — the .NET framework at [`Sakwala/affiant`](https://github.com/Sakwala/affiant) `v1.0.0-beta.1` and the two hosts that run on it. Every property, type and nullability here was read off that implementation's models and checked against the example payloads in [`../conformance/fixtures/`](../conformance/fixtures/) — which are hand-authored examples, not captures: their key sets are asserted against the shipped .NET serializer by the hosts' wire-shape tests, their values are illustrative.

**This is not protocol v0.1.** It is a description of what one implementation ships today, published so a second implementation has something exact to build against. v0.1 is the first version that is designed rather than captured, it is not backward compatible with this seed, and it now lives in [`0.1.0/`](0.1.0/).

Payloads are camelCase, enums are serialized as their member names, and an absent optional value is an explicit `null` rather than a missing property — so every property is `required` and nullability is expressed as a union type.

**`minimum: 0` / `maximum: 1` on `confidence` and `aggregateConfidence` is a rule, not a description of `v1.0.0-beta.1`.** The bound is stated in [`../INVARIANTS.md`](../INVARIANTS.md) PV-1; the shipped .NET inference step does not yet clamp to it, so a conforming implementation must, and the .NET parity manifest names the gap until it is fixed.

## The files

| Schema | Shape |
|---|---|
| `provenance-source.schema.json` | Where a value came from, as a closed set of names ordered most deterministic first |
| `provenance-tag.schema.json` | One provenance record: source, confidence, explanation, conversation turn |
| `provenance-chain.schema.json` | A field's provenance history: the tag in force plus every superseded tag |
| `affidavit-field.schema.json` | One sworn field: proposed value, previous value, provenance, rendering hint, constraints |
| `affidavit.schema.json` | The sworn evidence record for one proposed write |
| `evidence-card-request.schema.json` | The envelope that carries an affidavit to a reviewer, with the deadline and any prior amendments |
| `docket-expiring.schema.json` | The deadline warning for a pending docket entry |
| `docket-expired.schema.json` | The lapse notice for an entry that reached its deadline undecided |

Four wire fixtures have no schema in this seed: two host hub payloads and two transport/UI payloads. They are here as reference shapes and the manifest says so per fixture.

## What v0.1 added

Every gap below was a real hole in the seed. All of them are closed in [`0.1.0/`](0.1.0/); the list is kept as
written so a reader of the seed can see what it does not carry, and [`0.1.0/README.md`](0.1.0/README.md) has the
full seed-to-v0.1 table.

- **A `protocolVersion` field on every envelope**, so a consumer can tell which version of the format it received instead of inferring it from the shape.
- **A `binding` on the provenance tag**, naming the specific external record or computation a value came from, so `External` and `Computed` stop being bare labels.
- **The attestation record on the Docket entry** — who or what approved a specific Affidavit, and when: a person, a person acting through a trusted relay, or a Standing Order by policy id and version. Today the approval is a status change on the row, not an attribution (INVARIANTS.md AZ-1).
- **`blocked` on a Docket entry**, so an implementation can record that it received a requirement level or a tool category it does not implement, refuse every decision on the entry, and say why (INVARIANTS.md AZ-4).
- **`compositeRef` on a Docket entry**, so an entry that is one of N approvals for a single composite authorisation names that composite (INVARIANTS.md AZ-4).
- **Two companion confidence numbers beside the aggregate** — `populatedConfidence` (the minimum over the non-`Empty` proposed fields) and `emptyFieldCount` — so a mostly-empty Affidavit cannot report high confidence; `aggregateConfidence` itself becomes the minimum over all proposed fields with `Empty` counting as 0.0 (INVARIANTS.md AF-2).
- **A `status` + `execution` pair on the Docket entry**, so an approved-but-failed write is distinguishable from an approved-and-committed one (INVARIANTS.md DK-1).

## Using them

```
npm --prefix conformance/lint install
node conformance/lint/lint.mjs
```

That validates each schema-relevant fixture against its schema and prints one line per fixture. See [`../conformance/README.md`](../conformance/README.md).
