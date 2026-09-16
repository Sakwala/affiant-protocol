# The .NET conformance run — `1.0.0-beta.3.1` at protocol `v0.2.0`

The run [`../../parity/dotnet-v0.2.json`](../../parity/dotnet-v0.2.json) is read off — the first .NET reading at a
`v0.2` ref. The manifest is the claim; these two files are what it is a claim about. The earlier runs stay exactly as
their releases left them — [`../dotnet-1.0.0-beta.1/`](../dotnet-1.0.0-beta.1/) and
[`../dotnet-1.0.0-beta.3/`](../dotnet-1.0.0-beta.3/) — because a published run is evidence of what happened at one
ref, and a later run is published as a new directory beside it, never in place of it.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant`](https://github.com/Sakwala/affiant) — the .NET packages at **`1.0.0-beta.3.1`**, released 2026-09-09 ([GitHub Release](https://github.com/Sakwala/affiant/releases/tag/v1.0.0-beta.3.1); the ten packages pushed to NuGet.org) |
| Runtime | `net10.0` |
| Driver | that repository's `tests/Affiant.Conformance.Tests`, invoking the shipped `Affiant.Testing.ComplianceHarness.ConformanceSuite` runner |
| Protocol ref the fixtures came from | **`v0.2.0`** — the tag, vendored into that repository under `tests/Affiant.Conformance.Tests/protocol/` and verified against checksums on every build (`conformance/sync.sh --verify`) |
| Commit measured | [`73ac398`](https://github.com/Sakwala/affiant/commit/73ac398f81681e26c70ff7e387e6cd9cb02f6fb4) on branch `conformance/v0.2.0` ([Sakwala/affiant#152](https://github.com/Sakwala/affiant/pull/152), rebase-merged 2026-09-16; on `main` the same tree is [`3a95be8`](https://github.com/Sakwala/affiant/commit/3a95be8)) — not the release tag: `1.0.0-beta.3.1` shipped on 2026-09-09 and the default branch has taken changes since, so this reads the tree that builds that version rather than the released artefacts |
| Run produced | 2026-09-16T02:38:05.961Z |

## Totals

| | |
|---|---|
| Fixtures run | **68** — every one [`../../fixtures/MANIFEST.json`](../../fixtures/MANIFEST.json) lists in its `"conformance"` section (61 declarative + 7 canonical byte vectors) |
| Passed | **68** |
| Failed | **0** |
| Errored | **0** |
| Skipped | **0** — the driver declares no skips: a port it cannot supply is an error, never a silent skip |
| Adapter section | **not run, and said so.** [`../../DRIVER.md`](../../DRIVER.md) §7 scopes the `adapter` section at the section level: a driver runs it once for every adapter its implementation ships and declares, and one that declares none runs none of it. This implementation declares none — the declaration the lint reads is an npm package's `affiant.adapter` block ([`../../ADAPTER-CLAIMS.md`](../../ADAPTER-CLAIMS.md)) — so the manifest states `"adapters": []`, which is the positive statement rather than silence. |
| Negative-oracle fixtures | **not run.** [`../../ORACLE.md`](../../ORACLE.md)'s assertion is a statement about named releases, `1.0.0-beta.1` and `1.0.0-beta.3`; run against any other version the driver reports it skipped, with the reason, rather than failing every correction or quietly passing. The reading of the five fixtures the oracle lists against `1.0.0-beta.3` is in that repository, under `conformance/results/oracle-v0.1.3/`. |

All 68 pass: the parity manifest's `failing[]` is empty. That repository's CI asserts the failing set and the manifest
agree exactly, in both directions, and the lint here asserts the same over this published pair.

## What moved since `1.0.0-beta.3`

Two things, and neither is a fixture this implementation now passes differently.

**The release.** `1.0.0-beta.3.1` (2026-09-09) is the point release that answers
[`Sakwala/affiant#123`](https://github.com/Sakwala/affiant/issues/123): PV-3 at `v0.1.3` says the *implementation*
establishes presence, from the unmodified turn, under an ASCII-only case fold — not the inference port, whose
`presence` and `utteranceSpan` become hints verified the same way. The five fixtures the negative oracle lists against
the shipped `1.0.0-beta.3` are the ones that change hands there.

**The pin,** twice: `v0.1.2` → `v0.1.3`, which authored those five fixtures and took the suite from 63 documents to 68;
and `v0.1.3` → `v0.2.0`, which is what this run reads at. `v0.2.0` adds no wire shape, no schema under
[`../../../schemas/0.1.0/`](../../../schemas/0.1.0/), no canonical vector and no conformance fixture, and
`protocolVersion` stays `0.1.0` — so the 68 documents here are the 68 read at `v0.1.3`, and no code in that repository
moved with the pin. What it adds is the `adapter` section this implementation runs none of, and the lifting of the
three exemptions that read `until: "0.2.0"` — CV-2, CV-3 and CV-5 — which is why this manifest inherits **eight**
rulebook exemptions where [`../../parity/dotnet-v0.1.json`](../../parity/dotnet-v0.1.json) inherits eleven. That
manifest is a claim about `v0.1.3` and is correct to list them.

## The files

| File | What it is | Where it comes from |
|---|---|---|
| [`results.json`](results.json) | The machine-readable run: one entry per fixture with its outcome. Validates against [`../../results.schema.json`](../../results.schema.json). | `conformance/results/dotnet-1.0.0-beta.3.1.json` in `Sakwala/affiant`, copied unchanged |

Copied verbatim, so paths inside it (`conformance/results/…`, `conformance/parity/…`) are that repository's, not this
one's. It is the record of one run at one moment and is not updated in place.

## Reproducing it

```
./conformance/sync.sh --verify
dotnet build Affiant.slnx -c Release
dotnet test tests/Affiant.Conformance.Tests/Affiant.Conformance.Tests.csproj -c Release --no-build --logger "console;verbosity=normal"
./conformance/compare-parity.py
```

in `Sakwala/affiant` at the commit above — that repository's `conformance` CI job, which is what produced
`results.json` and what asserts its failing set against the parity manifest, exactly, in both directions. Running
`conformance/regenerate-parity.py` against the committed run log reproduces that repository's copy of the manifest byte
for byte; this copy differs from it in one field, `runLog`, which names the run where it is published *here*.
