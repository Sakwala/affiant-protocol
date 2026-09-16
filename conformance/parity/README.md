# parity/

One **parity manifest** per implementation: the published, CI-asserted list of conformance fixtures that implementation
does not pass, with the rule each one checks and what is being done about it. The format is
[`MANIFEST.schema.json`](MANIFEST.schema.json); what the fields mean, and the rule CI asserts, is
[`../PARITY.md`](../PARITY.md).

| File | Implementation | State |
|---|---|---|
| [`dotnet-v0.2.json`](dotnet-v0.2.json) | [Sakwala/affiant](https://github.com/Sakwala/affiant) — the .NET packages at `1.0.0-beta.3.1` | **published** 2026-09-16. An **empty** `failing[]` of 68 fixtures run, on `net10.0` at Unicode 16.0. Read at `v0.2.0`, and the same 68 documents the `v0.1.3` reading below covered: that tag changed no wire shape, no schema, no vector and no conformance fixture. It states `"adapters": []` — the implementation declares no adapter to this rulebook, so it runs none of the `adapter` section ([`../DRIVER.md`](../DRIVER.md) §7) — and inherits **eight** exemptions rather than eleven, CV-2, CV-3 and CV-5 having been lifted at `v0.2.0`. The run is published beside it: [`../results/dotnet-1.0.0-beta.3.1/`](../results/dotnet-1.0.0-beta.3.1/). |
| [`dotnet-v0.1.json`](dotnet-v0.1.json) | [Sakwala/affiant](https://github.com/Sakwala/affiant) — the .NET packages at `1.0.0-beta.3.1` | **published** 2026-09-09. An **empty** `failing[]` of 68 fixtures run, on `net10.0` at Unicode 16.0. Read at `v0.1.3`. The run it is taken from is the one `runLog` names, in that repository: `conformance/results/dotnet-1.0.0-beta.3.1.json`, with the negative oracle beside it — the same 68 documents against the *published* `1.0.0-beta.3`, where 62 passed, 3 failed and 3 errored and every fixture [`../ORACLE.md`](../ORACLE.md) lists against that release did not pass. The prior readings stay published here unchanged, a published run being evidence of what happened at that ref: [`../results/dotnet-1.0.0-beta.3/`](../results/dotnet-1.0.0-beta.3/) (`v0.1.2`, empty of 63) and [`../results/dotnet-1.0.0-beta.1/`](../results/dotnet-1.0.0-beta.1/) (`v0.1.1`, 60 of 63 failing rows, all 19 oracle fixtures failed). |
| [`typescript-v0.2.json`](typescript-v0.2.json) | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) — `@affiant/core` at `0.1.0-alpha.2` | **published** 2026-09-16. An **empty** `failing[]` over **80** documents — the 68 of the `conformance` section and the 12 of the `adapter` one, which is the union `PARITY.md` asserts over — read at `v0.2.0`, asserted in that repository's CI on Node, Bun and workerd where the failing set must be identical on each (RT-1); each runtime's `unicodeVersion` is measured by probe — 17.0 on Node and Bun, 16.0 on workerd. `adapters[]` names the one adapter this implementation ships and declares, `@affiant/adapter-ai-sdk` at `0.1.0-alpha.0` against `ai` `7.0.101`, with `claimsLint: "pass"` from [`../lint/adapter-claims.mjs`](../lint/adapter-claims.mjs) run in that repository's own CI, where the registry is reachable (CV-5). Eight inherited exemptions rather than eleven, CV-2, CV-3 and CV-5 having been lifted at `v0.2.0`. `0.1.0-alpha.2` is on npm under the `alpha` dist-tag, with a provenance attestation, published by that repository's hand-dispatched workflow on 2026-09-16; `latest` and `alpha` both point at it. The run is published beside it: [`../results/typescript-0.1.0-alpha.2/`](../results/typescript-0.1.0-alpha.2/). |
| [`typescript-v0.1.json`](typescript-v0.1.json) | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) — `@affiant/core` at `0.1.0-alpha.1` | **published** 2026-09-09. An **empty** `failing[]` of 68 fixtures run, asserted in that repository's CI on Node, Bun and workerd, where the failing set must be identical on each (RT-1); each runtime's `unicodeVersion` is measured by probe — 17.0 on Node and Bun, 16.0 on workerd. Read at `v0.1.3`. This is the implementation the fixtures were promoted from, so an empty set is what it owes and not a surprise. The run is the one `runLog` names, in that repository. `0.1.0-alpha.1` is that repository's `main`, and npm has carried it under the `alpha` tag since 2026-09-10. `latest` and `alpha` both point at `0.1.0-alpha.1`. The `0.1.0-alpha.0` reading stays published here: [`../results/typescript-0.1.0-alpha.0/`](../results/typescript-0.1.0-alpha.0/) (`v0.1.2`, empty of 63). |

Naming: `<implementation>-v<protocol minor>.json`. A manifest is produced against exactly one protocol tag and says
nothing about any other, which is why an implementation's earlier readings stay here beside its current one rather
than being overwritten by it.

**Reading one.** Look at `failing[]`. Each row names a fixture id, the numbered rules in
[`../../INVARIANTS.md`](../../INVARIANTS.md) it checks, and a `disposition` — `fixed` (a release that has shipped
corrects it, named in `fixedIn`), `planned` (scheduled for the release `plannedFor` names), `fenced` (a host-side
workaround, named in `fence`, contains it now — and it may name a `plannedFor` too), or `ignored` (nothing is being done
and nothing is scheduled, and `detail` says why). An empty `failing[]` is the strongest statement an implementation can
make here. Anything else is the honest one.

**Writing one.** Do not hand-write it: run the driver, take the failing set from the result document
([`../results.schema.json`](../results.schema.json)), and write the disposition and the detail by hand — those are
judgements, not output. Then open a pull request. The file is never auto-committed.

**Publishing the run beside it.** A manifest is a claim; the run it was derived from is the evidence, and it is
published in [`../results/`](../results/) under `<implementation>-<version>/` — the machine-readable `results.json`, the
oracle reading of it, and a `README.md` naming the driver, the release, the protocol ref and the date. The lint
validates every manifest here against [`MANIFEST.schema.json`](MANIFEST.schema.json), every published run against
[`../results.schema.json`](../results.schema.json), and asserts that a run and the manifest about the same
implementation, version and protocol tag agree on the failing set exactly. The tag is part of that match for the
same reason it is part of the naming: a manifest read at one ref is not evidence about another, and one version of
an implementation can have a reading at each of two refs published here at once.
