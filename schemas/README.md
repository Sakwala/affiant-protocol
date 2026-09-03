# Schemas

JSON Schema (draft 2020-12) for the Affiant wire format.

## What these are

A **seed**, version `0.0.1-seed`, derived from the wire a shipped implementation already sends — the .NET framework at [`Sakwala/affiant`](https://github.com/Sakwala/affiant) `v1.0.0-beta.1` and the two hosts that run on it. Every property, type and nullability here was read off that implementation's models and checked against captured payloads in [`../conformance/fixtures/`](../conformance/fixtures/). The fixtures are the truth; these schemas describe them.

**This is not protocol v0.1.** It is a description of what one implementation ships today, published so a second implementation has something exact to build against. v0.1 is the first version that is designed rather than captured, and it will not be backward compatible with this seed.

Payloads are camelCase, enums are serialized as their member names, and an absent optional value is an explicit `null` rather than a missing property — so every property is `required` and nullability is expressed as a union type.

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

Four wire fixtures have no schema in this seed: two host hub payloads and two transport/UI payloads. They are captured as reference shapes and the manifest says so per fixture.

## What v0.1 will add

Each of these is a real gap in the seed, named here so nobody has to guess what is missing:

- **A `protocolVersion` field on every envelope**, so a consumer can tell which version of the format it received instead of inferring it from the shape.
- **A `binding` on the provenance tag**, naming the specific external record or computation a value came from, so `External` and `Computed` stop being bare labels.
- **The attestation record**, the signed statement that a named party approved a specific affidavit at a specific time — today the approval is an event, not a durable artifact on the wire.
- **`blocked` on a field**, so an implementation can say a value must not be written and why, which today can only be expressed as a warning string.
- **`compositeRef` on a field**, so a field that refers to another entity carries that reference explicitly rather than burying an identifier in a value.
- **Three separate confidence numbers** — extraction, mapping and aggregate — replacing today's single `confidence`, which conflates how well a value was read with how well it was matched to a target field.

## Using them

```
npm --prefix conformance/lint install
node conformance/lint/lint.mjs
```

That validates each schema-relevant fixture against its schema and prints one line per fixture. See [`../conformance/README.md`](../conformance/README.md).
