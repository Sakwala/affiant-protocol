# Conformance

## What is here

- **`fixtures/wire/`** — one JSON file per payload shape, each a **hand-authored example, not a capture**. The key set and the null handling of each are asserted, in the shipped .NET implementation's own test suite, against a real DTO serialized with the exact SignalR `JsonSerializerOptions` the hosts use — the *shape* is checked against running code, the *values* are illustrative. camelCase names, explicit `null` for an absent optional value.
- **`fixtures/enum-values.json`** — the closed string-value sets for the wire's de-facto enums, pinned as data so an implementation in any language can check its own literals against the same list.
- **`fixtures/MANIFEST.json`** — the index. For each fixture: its id, its file, what kind of payload it is, which schema describes it (or `null`), whether it is schema-relevant, and a note on what it demonstrates. `derivedFrom` records the framework and host commits the shapes were asserted against, and the date.
- **`fixtures/v0.1/`** — the **v0.1** fixture set, one directory per schema in [`../schemas/0.1.0/`](../schemas/0.1.0/). Each document was produced by running the TypeScript reference implementation and writing down the Docket row, the Evidence Card or the tool result it emitted; `MANIFEST.json` → `"0.1.0"` → `derivedFrom` says exactly what was completed by hand and why, and each fixture's own row names the reference fixture it came from. Every schema carries at least one **positive**, which must validate, and at least one **negative** — a single deliberate mutation of a named positive, one required key removed or one enum value replaced — which must **fail**. A negative that passes is the more interesting failure: it means the schema does not refuse what the rulebook says it must. A handful of rules relate two objects inside one document and no JSON Schema can state them; the lint checks those itself, and a negative that breaks one is marked `"check": "cross-object"` on its manifest row, because the schema accepts that document and only the lint refuses it.
- **`lint/`** — a small Node script that runs over both sets. It validates every schema-relevant seed fixture and every v0.1 positive against the schema the manifest assigns it, asserts that every v0.1 negative is refused, checks the cross-object rules a schema cannot state (today: an Evidence Card's `presentation` hints name fields its Affidavit carries), and fails if a manifest entry names a file or a schema that does not exist, if a fixture file on disk is not listed in the manifest exactly once, if a v0.1 schema has no fixture or a v0.1 fixture has no schema, or if an enum set the manifest maps to a schema differs from that schema's `enum` — in either directory. It runs in CI on every push and pull request.

Four seed fixtures are marked `schemaRelevant: false`: two host hub payloads (how a host talks to its own client) and two transport/UI payloads. They are here as reference shapes and carry no schema in the seed.

```
npm --prefix conformance/lint install
node conformance/lint/lint.mjs
```

## How versions work

**Versions are git tags on this repository.** The tag is the unit an implementation pins; there is no package to install and no version negotiation on the wire in this seed.

An implementation pins a tag, checks its own payloads against the fixtures at that tag, and bumps the pin in its own pull request — so a format change arrives as a reviewable diff in the implementation's own history, never as a silent upstream shift under a running build.

A **parity manifest** — the format is not written yet — will let each implementation record, in public and checked by its own CI, which fixtures it does not yet pass. The point is that a gap is a published fact with a name, not something a reader has to discover by running the suite.

The current tag is `v0.0.1-seed`: a description of the shapes one shipped implementation sends today, not a designed protocol version. The **v0.1 schemas and fixtures are on `main` and not yet tagged** — [`v0.1.0`](../schemas/0.1.0/README.md) is cut once the conformance suite lands beside them. See [`../schemas/README.md`](../schemas/README.md) for what the two sets are and [`../schemas/0.1.0/README.md`](../schemas/0.1.0/README.md) for what changed.

## What is not here yet

- **The runner specification** — how a conformance run is invoked, what it reports, and what counts as a pass. In progress.
- **The driver contract** — the interface an implementation exposes so the runner can drive it without knowing its language. In progress.
- **[`INVARIANTS.md`](../INVARIANTS.md)** — on `main` in full since 2026-09-04: every rule written against the working TypeScript reference implementation, with the fixture, suite or lint that checks it.
- **The promoted fixture suite** — the reference implementation's 56 declarative fixtures, moved here unchanged in id and content, with the negative-oracle list that says which of them must *fail* against a release known to violate their rule. In progress; the v0.1 fixtures above pin the **shapes**, not the behaviour.
