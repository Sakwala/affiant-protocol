# Conformance

## What is here

- **`fixtures/wire/`** — one JSON file per payload shape, each a byte-for-byte capture of a payload a shipped implementation really sends. Realistic values, camelCase names, explicit `null` for an absent optional value.
- **`fixtures/enum-values.json`** — the closed string-value sets for the wire's de-facto enums, pinned as data so an implementation in any language can check its own literals against the same list.
- **`fixtures/MANIFEST.json`** — the index. For each fixture: its id, its file, what kind of payload it is, which schema describes it (or `null`), whether it is schema-relevant, and a note on what it demonstrates. `capturedFrom` records the implementation and hosts the capture came from and the date.
- **`lint/`** — a small Node script that validates every schema-relevant fixture against the schema the manifest assigns it, and fails if a manifest entry names a file or a schema that does not exist. It runs in CI on every push and pull request.

Four fixtures are marked `schemaRelevant: false`: two host hub payloads (how a host talks to its own client) and two transport/UI payloads. They are captured as reference shapes and carry no schema in this seed.

```
npm --prefix conformance/lint install
node conformance/lint/lint.mjs
```

## How versions work

**Versions are git tags on this repository.** The tag is the unit an implementation pins; there is no package to install and no version negotiation on the wire in this seed.

An implementation pins a tag, checks its own payloads against the fixtures at that tag, and bumps the pin in its own pull request — so a format change arrives as a reviewable diff in the implementation's own history, never as a silent upstream shift under a running build.

A **parity manifest** — the format is not written yet — will let each implementation record, in public and checked by its own CI, which fixtures it does not yet pass. The point is that a gap is a published fact with a name, not something a reader has to discover by running the suite.

The current tag is `v0.0.1-seed`: a capture of what one shipped implementation sends today, not a designed protocol version. See [`../schemas/README.md`](../schemas/README.md) for what that distinction means and what v0.1 adds.

## What is not here yet

- **The runner specification** — how a conformance run is invoked, what it reports, and what counts as a pass. In progress.
- **The driver contract** — the interface an implementation exposes so the runner can drive it without knowing its language. In progress.
- **`INVARIANTS.md`** — the numbered, testable rules an implementation must enforce, which the fixtures will cite. In progress.
