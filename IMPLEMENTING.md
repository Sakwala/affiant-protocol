# Implementing Affiant

This is for anyone who wants an Affiant implementation in a language or runtime not yet covered here, published under
its own name. The rulebook in this repository is the contract; the two implementations listed in
[`README.md`](README.md) are examples of following it, not the thing you are implementing against.

## What "conforming" means

A conforming implementation does three things: it implements the numbered rules in [`INVARIANTS.md`](INVARIANTS.md), it
passes the promoted fixtures in [`conformance/`](conformance/) through a driver of its own, and it publishes a **parity
manifest** — a file, checked in this repository's format and asserted in its own CI — listing exactly which fixtures it
does not pass and why. Conformance is that published, checked fact, never a self-applied badge and never a claim taken
on trust. An implementation with no manifest, or one whose CI does not assert it, is not conforming no matter how much
of the rulebook its authors believe they have met — see [What you may not call conforming](#what-you-may-not-call-conforming)
below.

## The seven steps

### 1. Pin a version

Versions of this repository are git tags. There is no `v0.1.0` tag yet — the rules, the schemas and the conformance
suite are all on `main`, so until it exists you pin the commit you built against instead, and move the pin to the tag
once it is cut. Either fetch that commit at build time and verify a checksum recorded beside the pin, or vendor
[`conformance/fixtures/**`](conformance/fixtures/), [`schemas/0.1.0/**`](schemas/0.1.0/) and the three format schemas
([`conformance/fixture.schema.json`](conformance/fixture.schema.json),
[`conformance/canonical-vector.schema.json`](conformance/canonical-vector.schema.json),
[`conformance/results.schema.json`](conformance/results.schema.json)) into your own repository under a directory that
records the commit or tag, with a checksum re-verified in CI. An unchecked copy is not a pin — it lets a local edit to a
fixture pass unnoticed, which defeats the entire comparison. Full detail: [`conformance/DRIVER.md`](conformance/DRIVER.md) §1.

*First action:* record the commit (or tag) and a checksum of what you vendored — a `conformance/PROTOCOL_PIN` file in
your own repository is the pattern the existing drivers use.

### 2. Read the rules

Read [`INVARIANTS.md`](INVARIANTS.md) start to finish, in the order the areas are laid out: `AF` (the Affidavit shape),
`PV` (provenance and bindings), `GT` (the gate pipeline), `DK` (the Docket, its states and expiry), `AZ` (authorization,
attestation and requirement levels), `SR` (serialization and the wire), `RT` (runtime neutrality), `CV` (coverage,
delegation and call sites), `TL` (telemetry and standards vocabulary). Read the preamble first — it defines the RFC 2119
words, what *Checked by* and *Constrains* mean on a rule, the coverage lint, and the ten refusal codes (`substance-refused`,
`wireup-invalid`, `coverage-refused`, `requirement-not-implemented`, `decision-unauthorized`, `entry-not-found`,
`decision-not-pending`, `decision-expired`, `decision-lost-race`, `execution-already-recorded`) three of which are still
provisional pending a registry schema. This is the design you are implementing; nothing else in this repository outranks it.

*First action:* read `INVARIANTS.md`'s preamble and the refusal-code list before opening a single rule.

### 3. Build to the wire

The wire format is [`schemas/0.1.0/`](schemas/0.1.0/) (draft 2020-12 JSON Schema; read its `README.md` alongside
`INVARIANTS.md` — where they disagree, `INVARIANTS.md` wins and the schema is what gets corrected). Every envelope
carries `protocolVersion`, a semantic version of the protocol itself, not of your implementation: while the major stays
`0` a schema-breaking change bumps the minor, a consumer refuses a payload whose major it does not target and may warn
on a newer minor it does not recognize. Keep presentation and sworn substance apart from the start: a field's value,
provenance and previous value are the sworn record; a closed value set, an input pattern and a reviewer-facing warning
are presentation, carried on the Evidence Card envelope, never validated by the gate and never part of what a canonical
hash covers.

*First action:* read `schemas/0.1.0/README.md` in full, including "[Presentation lives on the card
envelope](schemas/0.1.0/README.md#presentation-lives-on-the-card-envelope)" — it is the distinction implementers get
wrong first.

### 4. Write a driver

A driver is the per-implementation program that binds the declarative fixtures to your own code and reports what
happened — there is no reference driver in another language to copy, only the contract in
[`conformance/DRIVER.md`](conformance/DRIVER.md) and the fixture format in [`conformance/RUNNER.md`](conformance/RUNNER.md).
Bind each of the eight step kinds a fixture can carry (`wrap-execute`, `file`, `decide`, `resubmit`, `markExecuted`,
`expireDue`, `get`, `rehydrate`) to your own gate's entry points, and build the four abstract ports every fixture assumes
from its `given` block: **Inference** (reports exactly the scripted fields, never inventing or re-scoring),
**Projection** (answers an update's previous values from the fixture's entity table, and is not consulted for a create),
**Authorization** (admits a principal by id, and must read a failure to answer as a refusal, never an approval), and
**Clock** (a fixed instant that only moves when a step moves it). You additionally own a Docket store and a telemetry
sink — nothing in `given` builds those for you. Emit one result document per implementation-and-runtime against
[`conformance/results.schema.json`](conformance/results.schema.json).

*First action:* read `conformance/RUNNER.md` section 1 through 3 (the document shape, `given`, the eight step kinds) and
`conformance/DRIVER.md` sections 1 through 3 before writing a line of driver code — the three ways a driver typically
gets a fixture wrong (a `wrap-execute` port whose `execute` doesn't actually fail when called, a refusal left to escape
instead of being turned into a code, a wiring-time refusal treated like a step-time one) are named there.

### 5. Run the suite

Run every entry in [`conformance/fixtures/MANIFEST.json`](conformance/fixtures/MANIFEST.json)'s `"conformance"`
section — not the fixture files on disk, and not a subset your driver happens to bind first; a listed fixture your
driver does not run is an `error` outcome, not an absence. Expect to fail some of the 56 declarative fixtures and some
of the seven canonical byte vectors on your first run. That is normal, and it is exactly what the parity manifest exists
to record — nobody's first driver run is green, including the reference implementation's.

*First action:* point your driver at the manifest, run it, and read the `diff` on every `fail` outcome before writing
anything down.

### 6. Publish a parity manifest

Write a manifest to [`conformance/parity/<name>-v0.1.json`](conformance/parity/) following
[`conformance/PARITY.md`](conformance/PARITY.md): one row per failing fixture, carrying its id, the rules it checks, and
a `disposition` — `fixed` (a release that has shipped corrects it, named in `fixedIn`), `planned` (scheduled for the
release `plannedFor` names), `fenced` (a specific host-side workaround contains it, named in `fence`, optionally with a
`plannedFor` as well), or `ignored` (nothing is being done and nothing is scheduled, with a `detail` a reader can
disagree with). Publish the run itself beside it, in
[`conformance/results/<name>-<version>/`](conformance/results/) — `results.json`, and a `README.md` naming your driver,
the release, the protocol ref and the date — so a reader can check the claim rather than take it. Then wire your CI to
assert that the set of fixture ids your run reports as `fail` or `error` equals `failing[].id` exactly, in both
directions — a fixture that starts failing without being added, and a fixture that starts passing without being
removed, must each fail your build. A manifest nothing enforces is a claim, not a fact.

*First action:* for every fixture your step-5 run failed, write its row by hand — the failing set comes from the run,
the disposition and detail are a judgement only you can make.

### 7. Open a pull request here

That is how an implementation is listed: a pull request against this repository adding a row to the
[Implementations table in `README.md`](README.md#implementations) naming your language and repository, and adding your
manifest at `conformance/parity/<name>-v0.1.json`. Nothing else registers an implementation — there is no separate
directory, index or approval step.

## What you may not call conforming

- An implementation with no published parity manifest. Passing fixtures privately is not conformance; conformance is
  the manifest, checked in CI, that a reader can open without running anything themselves.
- An implementation whose CI does not assert the manifest equality of step 6. A manifest nobody's build checks is a
  snapshot from whenever someone last wrote it, not a live claim.
- An implementation that passes fixtures by encoding its own behaviour into what it accepts as correct, rather than
  meeting the rule the fixture states independently of it. This is exactly what the negative oracle
  ([`conformance/ORACLE.md`](conformance/ORACLE.md)) exists to catch: a fixture is only accepted into this suite if it
  can be shown *failing* against a release known to violate the rule it checks, precisely so a fixture that would pass
  regardless of what an implementation does is never mistaken for a test.
- An implementation that ships a scoring formula, a default executor, or an ambient context, and calls the result
  conforming. These are three of the rules the rulebook is most specific about refusing to let an implementation own:
  the risk function and its thresholds are host-supplied, never bundled (`INVARIANTS.md` GT-5); no package performs the
  write itself or ships a default executor (`INVARIANTS.md` AZ-7); and the turn context — conversation id, tenant,
  channel, principal — is an explicit parameter at every gate entry point, never resolved from a process-global or
  thread-ambient source (`INVARIANTS.md` GT-2).

## What you get

The 56 fixtures and seven canonical vectors as a test suite from day one, in a format that assumes nothing about your
language. The numbered rules as your design, already argued through and cited against the defects they correct. A row
in the README table once your manifest lands. And the right to call what you built an "Affiant implementation" alongside
the two that exist today — a .NET implementation shipped as ten NuGet packages, and a TypeScript implementation complete
in its own repository for two of the rulebook's sequences and not yet published to a package registry. Neither has a
driver run yet either: the first parity manifests, for both of them, are being produced.

Contributing back to the rulebook itself — a new fixture, a sharpened rule — goes through a pull request here like
everything else, and must pass the lint (below). A new fixture is accepted only through the negative oracle: there must
be a known defective release for it to fail against, the same discipline every fixture in this suite was already held to.

## Keeping the lint green

Every pull request against this repository runs:

```
npm --prefix conformance/lint ci
node conformance/lint/lint.mjs
```

It checks that every schema fixture validates or is refused correctly, that the fixture manifest and the files on disk
agree exactly, that the negative oracle's list and each fixture's own oracle data agree, and that rule coverage holds in
both directions — every rule cited by a fixture that exists, every fixture's rule ids naming rules that exist. A pull
request that fails it does not merge.

## Questions

[GitHub Discussions](https://github.com/Sakwala/affiant-protocol/discussions) on this repository.

## Licence

This repository, including the schemas and the conformance fixtures, is Apache-2.0 — see [`LICENSE`](LICENSE). Vendor
any of it into your own implementation under those terms.
