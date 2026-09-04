# Conformance

The suite every Affiant implementation runs, in any language: a set of declarative fixtures, the format they are written
in, the contract a driver satisfies to run them, and a published parity manifest per implementation naming exactly which
of them it does not yet pass.

**Affiant** turns every database write an LLM agent proposes into an **Affidavit** — a per-field evidence record (the
value, the previous value, where each value came from, how confident) — filed in a **Docket** and shown as an **Evidence
Card** a person approves, amends or rejects before the host writes. A **Standing Order** approves with no person present.
The numbered rules an implementation must enforce are [`../INVARIANTS.md`](../INVARIANTS.md); the wire shapes are
[`../schemas/`](../schemas/). This directory is where those rules become something you can run.

## What is here

| | |
|---|---|
| [`RUNNER.md`](RUNNER.md) | **The fixture format.** Every key, every step kind, every matcher, the strictness rules, the four ports a fixture assumes, and what a run must report. Read this first. |
| [`DRIVER.md`](DRIVER.md) | **The driver contract.** What an implementation does to run these documents: pin a tag, supply the ports, bind the step kinds, emit the result, assert the parity manifest. |
| [`PARITY.md`](PARITY.md) | **The parity-manifest format.** How an implementation publishes what it does not pass, and the equality CI asserts. |
| [`ORACLE.md`](ORACLE.md) | **The negative oracle.** Which fixtures must *fail* against a release known to violate their rule, and the shipped defect each one refutes. |
| `fixtures/gate/` `fixtures/decide/` `fixtures/sequence-a/` `fixtures/sequence-c/` | **The 56 declarative fixtures**, promoted unchanged from the TypeScript reference implementation ([`fixtures/PROMOTED_FROM`](fixtures/PROMOTED_FROM) names the commit). |
| `fixtures/canonical/` | **The seven byte vectors** for canonical serialization (SR-1): an input, the amendments accepted on it, and the exact bytes and SHA-256 they produce. |
| [`fixtures/MANIFEST.json`](fixtures/MANIFEST.json) | **The index**, in three sections: the seed wire examples, the v0.1 schema fixtures, and `"conformance"` — every promoted document with its `id`, `file`, `rules[]`, `set` and `oracle`. A driver runs what this lists. |
| [`fixture.schema.json`](fixture.schema.json) · [`canonical-vector.schema.json`](canonical-vector.schema.json) | The two document formats as JSON Schema, with the same closed key sets the reference runner enforces. |
| [`results.schema.json`](results.schema.json) | What a run emits: per fixture an `id`, an `outcome` (`pass` \| `fail` \| `error` \| `skipped`), a `diff` and a duration, plus a summary and the implementation and tag under test. |
| [`parity/`](parity/) | One parity manifest per implementation, and [`parity/MANIFEST.schema.json`](parity/MANIFEST.schema.json). **The first .NET parity manifest is published: [`parity/dotnet-v0.1.json`](parity/dotnet-v0.1.json)** — 60 failing rows of 63 fixtures run against the shipped packages at `1.0.0-beta.1`, 49 `planned`, 10 `fenced`, 1 `fixed`. |
| [`results/`](results/) | The runs those manifests are claims about, one directory per implementation and version: [`results/dotnet-1.0.0-beta.1/`](results/dotnet-1.0.0-beta.1/) holds the machine-readable run, the oracle reading of it, and its provenance. |
| [`lint/`](lint/) | The lint that runs over all of it in CI. |
| `fixtures/wire/` · `fixtures/v0.1/` · `fixtures/enum-values.json` | The two **shape** sets that came before the suite. `wire/` are hand-authored examples of the wire one shipped implementation sends today, whose key sets are asserted against that implementation's own serializer; `v0.1/` is at least one positive and at least one negative per v0.1 schema, derived from the reference implementation's output; `enum-values.json` pins the closed string sets as data. They pin shapes, not behaviour. |

## How a second implementer starts

**[`../IMPLEMENTING.md`](../IMPLEMENTING.md)** is the full walkthrough — seven steps from pinning a version to opening
the pull request that lists your implementation in [`../README.md`](../README.md), each pointing at the file that
governs it ([`RUNNER.md`](RUNNER.md) for the fixture format, [`DRIVER.md`](DRIVER.md) for what a driver does,
[`PARITY.md`](PARITY.md) for what it publishes) and at a concrete first action. Read that first.

You do not need permission to start, and you do not need to pass everything. An honest, CI-asserted parity manifest is
the deliverable.

## The negative oracle

A fixture whose rule a known defective release violates is accepted into this suite only if it **fails** against that
release. A fixture a broken implementation passes is not a test — it is a formality that will keep passing while the
thing it claims to check quietly stops working.

For v0.1 the reference-defective release is the shipped .NET packages at `1.0.0-beta.1`, whose defects are recorded.
[`ORACLE.md`](ORACLE.md) lists every fixture that must fail on it and the defect each one refutes; the same list is
carried as data on each fixture's manifest row (`oracle: { mustFailOn, defect }`), and the lint checks that the two
agree. A listed fixture that *passes* on that release is not good news: it means the fixture is mis-authored or the
recorded defect is not what it was said to be, and it is investigated and the list or the fixture corrected before the
`v0.1.0` tag.

**It has been run.** All 19 listed fixtures failed against `1.0.0-beta.1`; the log is
[`results/dotnet-1.0.0-beta.1/ORACLE-RUN.md`](results/dotnet-1.0.0-beta.1/ORACLE-RUN.md). Three of the oracle's rows
were corrected by what the run showed — two fixtures were listed against a defect they do not exercise, and one recorded
defect was replaced by a truer statement about the release. Nothing was tuned to make a fixture fail; the run was
published as it stood and the list was corrected to match it (`ORACLE.md`, *Corrected by the run*).

Fixtures not on the list claim nothing about that release; what each implementation actually does with them is what its
parity manifest records. The canonical vectors and the fixtures no known release violates are marked
`acceptedOnReview` instead.

## The lint

```
npm --prefix conformance/lint ci
node conformance/lint/lint.mjs
```

It runs in CI on every push and pull request, over everything in this directory:

- every schema-relevant seed fixture and every v0.1 positive validates against the schema the manifest assigns it, and
  every v0.1 negative is **refused** — a negative that passes means the schema does not refuse what the rulebook says it
  must. A handful of rules relate two objects inside one document and no JSON Schema can state them; the lint checks
  those itself, and a negative that breaks one is marked `"check": "cross-object"` on its manifest row, because the
  schema accepts that document and only the lint refuses it;
- every fixture file on disk is claimed by the manifest exactly once, no id or file is listed twice, every v0.1 schema
  has a fixture and every v0.1 fixture a schema, and every pinned enum set matches the schema's own `enum` exactly, in
  order;
- **every promoted document validates against its format** — the 56 against `fixture.schema.json`, the 7 against
  `canonical-vector.schema.json`;
- **the oracle is checked both ways**: every fixture `ORACLE.md` lists has a manifest oracle entry carrying one of the
  defect sentences that file states for it, and no manifest entry claims an oracle the table does not list;
- **rule coverage runs both ways**: every rule in `INVARIANTS.md` must be checked by at least one promoted fixture that
  exists and whose own `rules[]` names it back, and every rule id a fixture names must be a rule that exists. A rule may
  be excused only by name in [`lint/coverage-exemptions.json`](lint/coverage-exemptions.json), with a version and a
  reason; a `suite:` / `lint:` / `guard:` citation is a supplement and never a substitute. The lint prints the full
  rule-by-rule report, so what is covered and what is merely claimed is visible in every CI log;
- **every published parity manifest and every published run is validated** — `parity/*.json` against
  [`parity/MANIFEST.schema.json`](parity/MANIFEST.schema.json), `results/*/results.json` against
  [`results.schema.json`](results.schema.json) — every fixture id either one names is checked to be one the index lists,
  and where a run and a manifest are about the same implementation and version the run's fail-or-error set must equal
  the manifest's `failing[]` exactly, which is the rule [`PARITY.md`](PARITY.md) states;
- **the matchers inside the fixtures are checked against the v0.1 wire schemas as partials** — only the keys a matcher
  states, each against that key's own subschema, with requirements relaxed. Most of what this reports is not a defect (a
  matcher key may be a projection, or a reviewer-facing fact the wire does not carry), so those are printed as findings;
  a *type* mismatch fails, because that is the schemas and the fixtures disagreeing about a shape.

## How versions work

**Versions are git tags on this repository.** A tag is the unit an implementation pins; there is no package to install
and no version negotiation on the wire.

An implementation pins a tag, runs the suite at that tag, and bumps the pin in its own pull request — so a format change
arrives as a reviewable diff in the implementation's own history, never as a silent upstream shift under a running
build. A parity manifest names the tag it was produced against; a manifest produced against one tag says nothing about
another.

`v0.0.1-seed` is the frozen description of the shipped .NET wire. The **v0.1 schemas, `INVARIANTS.md` and this suite are
on `main`**; [`v0.1.0`](../schemas/0.1.0/README.md) is cut once the negative oracle has been enforced by a real run.
The first .NET driver run has now done that — [`results/dotnet-1.0.0-beta.1/`](results/dotnet-1.0.0-beta.1/) — and
`ORACLE.md` is a checked fact rather than a claim. What remains before the tag is the TypeScript run, which is expected
to publish an empty `failing[]`.
