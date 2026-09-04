# The TypeScript conformance run — `0.1.0-alpha.0`

The reference implementation's run of the whole promoted suite, published here as the evidence for
[`../../parity/typescript-v0.1.json`](../../parity/typescript-v0.1.json). The manifest is the claim — an **empty**
failing set — and this file is what it is a claim about.

An empty failing set is the strongest statement the parity format can make, and it is also the easiest one to make
carelessly. What stops that here is the same thing that stops it anywhere: the run is published, every document the
index lists appears in it including the ones that passed, and the implementation's own CI asserts the failing set
equals the manifest in **both** directions, so a document that starts failing and a gap that quietly closes are
equally loud.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant-ts`](https://github.com/Sakwala/affiant-ts) — `@affiant/core` at **`0.1.0-alpha.0`**, the reference implementation these fixtures were promoted from |
| Runtimes | `node` (the run below), and the same suite under `bun` and inside `workerd` in that repository's CI, where the failing set must be identical on each (RT-1) |
| Driver | that repository's `packages/conformance-driver`, published as `@affiant/conformance-driver` |
| Protocol ref the fixtures came from | `242964faba9e6852b8fbfcdef6c3296b5c705f59` — the commit carrying the re-promoted fixture and the `hostOperation` schema, on which `v0.1.0` is tagged |
| Run produced | 2026-09-04 |

## Totals

| | |
|---|---|
| Fixtures run | **63** — every one [`../../fixtures/MANIFEST.json`](../../fixtures/MANIFEST.json) lists in its `"conformance"` section (56 declarative + 7 canonical byte vectors) |
| Passed | **63** |
| Failed | **0** |
| Errored | **0** |
| Skipped | **0** — the driver declares no skips: a port it cannot supply is an error, never a silent skip |
| Negative-oracle fixtures | not applicable — the oracle names the releases of the **.NET** implementation a fixture must fail against ([`../../ORACLE.md`](../../ORACLE.md)); it says nothing about this one |

## The files

| File | What it is | Where it comes from |
|---|---|---|
| [`results.json`](results.json) | The machine-readable run: one entry per fixture with its outcome. Validates against [`../../results.schema.json`](../../results.schema.json). | `packages/conformance-driver/conformance/results/typescript-0.1.0-alpha.0.json` in `Sakwala/affiant-ts`, copied unchanged |

Copied verbatim, so the `runLog` path the manifest carries is that repository's, not this one's. It is the record of
one run at one moment and is not updated in place: a later run against a later release is published as a new
directory beside this one.

## What the manifest says about the gaps

Nothing: `failing` is empty. What it does carry is `exemptions[]` — eleven rules no promoted fixture checks, copied
from the rulebook's own [`../../lint/coverage-exemptions.json`](../../lint/coverage-exemptions.json) rather than
invented, each naming what this implementation checks instead. An exemption is not a pass: it is a statement that the
rule is checked somewhere a declarative fixture cannot reach, with the suite that reaches it named so a reader can go
and look.
