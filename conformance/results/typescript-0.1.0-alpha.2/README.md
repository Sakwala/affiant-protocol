# The TypeScript conformance run — `0.1.0-alpha.2` at protocol `v0.2.0`

The run [`../../parity/typescript-v0.2.json`](../../parity/typescript-v0.2.json) is read off, and the first run of any
driver over **both** fixture sections: the `conformance` section against `@affiant/core`, and the `adapter` section
against `@affiant/adapter-ai-sdk`, the adapter these documents were authored with. The manifest is the claim — an
**empty** failing set over the union of the two — and this file is what it is a claim about.

An empty failing set is the strongest statement the parity format can make, and the easiest one to make carelessly.
What stops that here is what stops it anywhere: the run is published, every document the index lists appears in it
including the ones that passed, and the implementation's own CI asserts the failing set equals the manifest in **both**
directions, so a document that starts failing and a gap that quietly closes are equally loud. The earlier reading stays
as its release left it — [`../typescript-0.1.0-alpha.0/`](../typescript-0.1.0-alpha.0/) — because a published run is
evidence of what happened at one ref.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant-ts`](https://github.com/Sakwala/affiant-ts) — `@affiant/core` at **`0.1.0-alpha.2`**, the reference implementation these fixtures were promoted from. At 01:27 UTC, when this run was produced, that version was not yet on npm; it was published later the same day, on 2026-09-16, under the `alpha` dist-tag and with a provenance attestation, and `latest` and `alpha` both point at it now |
| Adapter | `@affiant/adapter-ai-sdk` at **`0.1.0-alpha.0`**, against the `ai` package at the version the suites resolved, **`7.0.101`**. It is the one adapter this implementation ships and declares, so the `adapter` section runs once, against it ([`../../DRIVER.md`](../../DRIVER.md) §7) |
| Runtimes | `node` (the run below), and the same suite under `bun` and inside `workerd` in that repository's CI, where the failing set must be identical on each (RT-1). Each runtime's `unicodeVersion` is measured by probe rather than declared — 17.0 on Node and Bun, 16.0 on workerd |
| Driver | that repository's `packages/conformance-driver`; `src/adapter.ts` is the `adapter` section's runner and `src/adapters/ai-sdk.ts` the binding for this adapter |
| Protocol ref the fixtures came from | **`v0.2.0`** — the tag, which that repository pins in `packages/contract/protocol/PIN` and vendors byte for byte, with the vendored copy checksummed against the tag on every run. The run published here before this one read at `v0.1.2` |
| Run produced | 2026-09-16T01:27:56.227Z |

## Totals

| | |
|---|---|
| Documents run | **80** — the **68** [`../../fixtures/MANIFEST.json`](../../fixtures/MANIFEST.json) lists in its `"conformance"` section (61 declarative + 7 canonical byte vectors) and the **12** it lists in its `"adapter"` section ([`../../ADAPTER-RUNNER.md`](../../ADAPTER-RUNNER.md)) |
| Passed | **80** |
| Failed | **0** |
| Errored | **0** |
| Skipped | **0** — the driver declares no skips: a port it cannot supply is an error, never a silent skip |
| CV-5 | `claimsLint: "pass"` on the manifest's adapter row. CV-5 is a lint, not a fixture: [`../../lint/adapter-claims.mjs`](../../lint/adapter-claims.mjs) reads the adapter package's declared durability claims and its README against what the `ai` package publishes. It needs the npm registry, so it runs in that repository's own `adapter claims` CI job against the vendored copy of this script, and its verdict is carried here |
| Negative-oracle fixtures | not applicable — the oracle names releases of the **.NET** implementation a fixture must fail against ([`../../ORACLE.md`](../../ORACLE.md)); it says nothing about this one |

## The files

| File | What it is | Where it comes from |
|---|---|---|
| [`results.json`](results.json) | The machine-readable run: one entry per document with its outcome, both sections in the one document. Validates against [`../../results.schema.json`](../../results.schema.json). | `packages/conformance-driver/conformance/results/typescript-0.1.0-alpha.2.json` in `Sakwala/affiant-ts`, copied unchanged |

Copied verbatim, so paths inside it are that repository's, not this one's. It is the record of one run at one moment and
is not updated in place. The manifest beside it is that repository's copy with one field changed — `runLog`, which names
the run where it is published *here* rather than there.

## What the manifest says about the gaps

Nothing: `failing` is empty, over the union of both sections. What it does carry is `exemptions[]` — **eight** rules no
fixture checks, copied from [`../../lint/coverage-exemptions.json`](../../lint/coverage-exemptions.json) rather than
invented, each naming what this implementation checks instead. Eight rather than the eleven the `v0.1` readings carry:
CV-2, CV-3 and CV-5 read `until: "0.2.0"` and were lifted at this tag, when the adapter that made them checkable
arrived. An exemption is not a pass; it is a statement that the rule is checked somewhere a declarative fixture cannot
reach, with the suite that reaches it named so a reader can go and look.

## Reproducing it

```
pnpm install
pnpm build
node packages/conformance-driver/dist/cli.js
```

in `Sakwala/affiant-ts` at the commit that carries this run — that repository's `conformance` CI job, which is a
required check on `main`. It runs both sections, writes this document, and exits non-zero unless the failing set equals
the manifest exactly, in both directions. `--write-manifest` regenerates the manifest from the same modules; it is never
auto-committed, because a change to a failing set is a change to a published claim.
