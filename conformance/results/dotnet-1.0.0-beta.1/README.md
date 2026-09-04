# The .NET conformance run — `1.0.0-beta.1`

The first run of any conformance driver against any Affiant implementation, published here as the evidence for
[`../../parity/dotnet-v0.1.json`](../../parity/dotnet-v0.1.json). The manifest is the claim; these two files are what
it is a claim about.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant`](https://github.com/Sakwala/affiant) — the .NET packages at **`1.0.0-beta.1`**, released 2026-08-23 |
| Runtime | `net10.0` |
| Driver | that repository's `tests/Affiant.Conformance.Tests`, added in [pull request #55](https://github.com/Sakwala/affiant/pull/55) |
| Protocol ref the fixtures came from | **`v0.1.1`** — the tag, vendored into that repository under `tests/Affiant.Conformance.Tests/protocol/` and verified against checksums on every build |
| Run produced | 2026-09-04T05:09:41.883Z |

## Totals

| | |
|---|---|
| Fixtures run | **63** — every one [`../../fixtures/MANIFEST.json`](../../fixtures/MANIFEST.json) lists in its `"conformance"` section (56 declarative + 7 canonical byte vectors) |
| Passed | **0** |
| Failed | **63** |
| Errored | **0** |
| Skipped | **0** — the driver declares no skips: a port it cannot supply is an error, never a silent skip |
| Negative-oracle fixtures | **19 listed, 19 failed, 0 passed** |

Every one of the 63 failures is a row in the parity manifest, and the implementation's CI asserts that the failing set
and the manifest are the same set, in both directions.

**Three of them passed at `v0.1.0`, and no code changed on either side.** At that tag the seven canonical byte vectors'
inputs described a *seed-shaped* record [`../../../schemas/0.1.0/affidavit.schema.json`](../../../schemas/0.1.0/affidavit.schema.json)
refuses, so `canonical/wire-evidence-card-request` was being measured against a shape this release happens to hold, and
`canonical/key-order-stress` and `canonical/number-forms` were bare JSON documents with no record in them to hold at
all. All seven were regenerated for `v0.1.1` from v0.1-shaped inputs, and the honest reading of `1.0.0-beta.1` against
the shape it will actually be asked to carry is that it holds none of them: its Affidavit has no protocol version, no
populated-confidence, no empty-field count, no conversation turn and no created-at instant, and its provenance tag has
no note, no timestamp and no binding. That is the same `1.0.0-beta.3` model gap the rest of the manifest names.

What did **not** change is the driver's own canonicaliser — the second one `../../RUNNER.md` §9 asks for, written out
from SR-1 inside the driver's test project. It reproduces the pinned bytes and the pinned digest for six of the seven
regenerated vectors at the first attempt, over vectors it had never seen, with no edit to it. The seventh needs the
accepted amendments folded in, which this release does not do.

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

Sixty rows: **50 `planned`** — 49 for `1.0.0-beta.3` and one (`gate/standing-order-by-the-book`) for `1.0.0-beta.1.1`
— **10 `fenced`** with a named host-side workaround and the `1.0.0-beta.3` release, and **0 `fixed`**. The disposition
values and what each obliges a row to carry are [`../../PARITY.md`](../../PARITY.md). Nothing is `fixed` here on
purpose: that value names a release a reader can **install**, and the risk-floor correction that closes
`gate/standing-order-by-the-book` is written and green on branch `build/risk-floor`
([`Sakwala/affiant#53`](https://github.com/Sakwala/affiant/pull/53)) but ships as `1.0.0-beta.1.1`, which is not
released. A correction still to come is `plannedFor`.
