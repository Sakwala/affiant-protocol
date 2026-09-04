# The .NET conformance run — `1.0.0-beta.1`

The first run of any conformance driver against any Affiant implementation, published here as the evidence for
[`../../parity/dotnet-v0.1.json`](../../parity/dotnet-v0.1.json). The manifest is the claim; these two files are what
it is a claim about.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant`](https://github.com/Sakwala/affiant) — the .NET packages at **`1.0.0-beta.1`**, released 2026-08-23 |
| Runtime | `net10.0` |
| Driver | that repository's `tests/Affiant.Conformance.Tests`, added in [pull request #55](https://github.com/Sakwala/affiant/pull/55), commit `7c4c87dd27f71956c22dceb6c8008c6aa6e120fb` |
| Protocol ref the fixtures came from | `f0d4ad0b5f0010676a96719682ea3920f0b1baf3` — the commit carrying the v0.1 conformance suite (the `v0.1.0` tag is not cut yet) |
| Run produced | 2026-09-04T02:15:55.928Z |

## Totals

| | |
|---|---|
| Fixtures run | **63** — every one [`../../fixtures/MANIFEST.json`](../../fixtures/MANIFEST.json) lists in its `"conformance"` section (56 declarative + 7 canonical byte vectors) |
| Passed | **3** — the canonical vectors `canonical/wire-evidence-card-request`, `canonical/key-order-stress`, `canonical/number-forms` |
| Failed | **60** |
| Errored | **0** |
| Skipped | **0** — the driver declares no skips: a port it cannot supply is an error, never a silent skip |
| Negative-oracle fixtures | **19 listed, 19 failed, 0 passed** |

Every one of the 60 failures is a row in the parity manifest, and the implementation's CI asserts that the failing set
and the manifest are the same set, in both directions.

## The files

| File | What it is | Where it comes from |
|---|---|---|
| [`results.json`](results.json) | The machine-readable run: one entry per fixture with its outcome and, on a failure, every stated fact that did not hold. Validates against [`../../results.schema.json`](../../results.schema.json). | `conformance/results/dotnet-1.0.0-beta.1.json` in `Sakwala/affiant`, copied unchanged |
| [`ORACLE-RUN.md`](ORACLE-RUN.md) | The same run read against [`../../ORACLE.md`](../../ORACLE.md): for each of the 19 fixtures the oracle lists, whether it failed, what failed, and whether the failure is the defect that was recorded. | `conformance/results/ORACLE-RUN-1.0.0-beta.1.md` in `Sakwala/affiant`, copied unchanged |

Both are copied verbatim, so paths inside them (`conformance/results/…`, `conformance/parity/…`) are that repository's,
not this one's. They are the record of one run at one moment and are not updated in place: a later run against a later
release is published as a new directory beside this one.

## Three rows of the oracle were corrected by this run

`ORACLE-RUN.md` reports three fixtures whose failure is not the defect the oracle had recorded for them. Nothing was
tuned to make anything fail — the run was published as it stood and the rulebook was corrected to match the evidence.
[`../../ORACLE.md`](../../ORACLE.md) carries the corrections under *Corrected by the run*; `ORACLE-RUN.md` is the
pre-correction reading, which is why it still says "suggested correction".

## What the manifest says about the gaps

Sixty rows: **49 `planned`** for `1.0.0-beta.3`, **10 `fenced`** with a named host-side workaround and the same release,
and **1 `fixed`** in `1.0.0-beta.1.1`. The disposition values and what each obliges a row to carry are
[`../../PARITY.md`](../../PARITY.md).
