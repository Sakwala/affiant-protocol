# The .NET conformance run — `1.0.0-beta.3`

The run this release owes, published here as the evidence for
[`../../parity/dotnet-v0.1.json`](../../parity/dotnet-v0.1.json). The manifest is the claim; these two files are what
it is a claim about. This is not the first run of this driver — [`../dotnet-1.0.0-beta.1/`](../dotnet-1.0.0-beta.1/)
is that one, and it is kept exactly as `1.0.0-beta.1` left it: a published run is evidence of what happened at that
ref, and a later run against a later release is published as a new directory beside it, never in place of it.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant`](https://github.com/Sakwala/affiant) — the .NET packages at **`1.0.0-beta.3`**, released 2026-09-05 ([GitHub Release](https://github.com/Sakwala/affiant/releases/tag/v1.0.0-beta.3); the ten packages pushed to NuGet.org) |
| Runtime | `net10.0` |
| Driver | that repository's `tests/Affiant.Conformance.Tests`, invoking the shipped `Affiant.Testing.ComplianceHarness.ConformanceSuite` runner |
| Protocol ref the fixtures came from | **`v0.1.2`** — the tag, vendored into that repository under `tests/Affiant.Conformance.Tests/protocol/` and verified against checksums on every build (`conformance/sync.sh --verify`) |
| Commit measured | [`5ad38fe`](https://github.com/Sakwala/affiant/commit/5ad38fe2b5357c0ad81eef62b36a1631857feb8a) — a run log committed inside the tree it measures can only name that tree's commit, so the commit that carries the log is this one's child, identical except for the log and the manifest derived from it |
| Run produced | 2026-09-05T01:41:21.038Z |

## Totals

| | |
|---|---|
| Fixtures run | **63** — every one [`../../fixtures/MANIFEST.json`](../../fixtures/MANIFEST.json) lists in its `"conformance"` section (56 declarative + 7 canonical byte vectors) |
| Passed | **63** |
| Failed | **0** |
| Errored | **0** |
| Skipped | **0** — the driver declares no skips: a port it cannot supply is an error, never a silent skip |
| Negative-oracle fixtures | **not run.** The negative-oracle assertion is a statement about one named release, `1.0.0-beta.1`; run against any other version it reports itself skipped, with the reason, rather than failing every correction or quietly passing. This directory carries no `ORACLE-RUN.md` for that reason — see [`../dotnet-1.0.0-beta.1/ORACLE-RUN.md`](../dotnet-1.0.0-beta.1/ORACLE-RUN.md) for the release the oracle is a statement about. |

All 63 fixtures pass: the parity manifest's `failing[]` is empty, which is what this release's acceptance asks for. The
implementation's CI asserts that the failing set and the manifest agree exactly, in both directions.

## What moved since `1.0.0-beta.1`

The protocol pin moved from `v0.1.1` to `v0.1.2` between these two runs. `v0.1.2` states in SR-1 that the canonical
form is taken over the Affidavit as the schema defines it — protocol version included — and regenerates the two
conformance fixtures whose pinned content hashes had been produced by a reference *runtime* whose model omitted it.
This implementation already produced the canonical form `v0.1.2` states and the hashes it regenerated; what changed in
this release is that it **adopted** the entry-id derivation `v0.1.2` states in GT-4, including on the resubmission
path, where it had previously minted a random id. That re-pin and that adoption are what let the last two rows still
open at `1.0.0-beta.1` — `canonical/key-order-stress` and `canonical/number-forms` among them — close, alongside the
model and coverage work the release's [CHANGELOG](https://github.com/Sakwala/affiant/blob/v1.0.0-beta.3/CHANGELOG.md#100-beta3--2026-09-05)
entry for `1.0.0-beta.3` describes in full: the Affidavit gains the fields the rulebook's Docket, telemetry and gate
rules ask for, `Affiant.Testing.ComplianceHarness.ConformanceSuite` ships as the driver's own runner, and
`ToolCoverage` refuses a write-capable tool the gate cannot stand in front of.

## The files

| File | What it is | Where it comes from |
|---|---|---|
| [`results.json`](results.json) | The machine-readable run: one entry per fixture with its outcome. Validates against [`../../results.schema.json`](../../results.schema.json). | `conformance/results/dotnet-1.0.0-beta.3.json` in `Sakwala/affiant`, copied unchanged |

Copied verbatim, so paths inside it (`conformance/results/…`, `conformance/parity/…`) are that repository's, not this
one's. It is the record of one run at one moment and is not updated in place.

## Reproducing it

Both of the release's own CI jobs are reproduction paths, and both are what the manifest's claim rests on:

- **`conformance`** — vendored-suite checksum verify, then build and run the in-repo driver against the shipped
  projects directly:
  ```
  ./conformance/sync.sh --verify
  dotnet build Affiant.slnx -c Release
  dotnet test tests/Affiant.Conformance.Tests/Affiant.Conformance.Tests.csproj -c Release --no-build --logger "console;verbosity=normal"
  ./conformance/compare-parity.py
  ```
  This is the job that produced `results.json` and asserts its failing set against the parity manifest, exactly, in
  both directions.
- **`harness-consumer`** — the same rulebook suite run against the **packed** NuGet packages rather than an in-repo
  project reference: packs the ten packages to a local feed, restores `tests/harness-consumer` (whose only Affiant
  reference is the packed `Affiant.Testing.ComplianceHarness`) against that feed alone, and runs the suite from a
  rulebook directory it names itself, deliberately not the one beside the assembly. It exists to catch a package that
  quietly reads its own copy of the rulebook instead of the caller's — see that project's own
  [`README.md`](https://github.com/Sakwala/affiant/blob/v1.0.0-beta.3/tests/harness-consumer/README.md) for the local
  reproduction notes (package-cache isolation in particular).

Running `conformance/regenerate-parity.py` against the committed run log reproduces the committed manifest byte for
byte — the two files are one claim and its evidence.
