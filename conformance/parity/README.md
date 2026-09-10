# parity/

One **parity manifest** per implementation: the published, CI-asserted list of conformance fixtures that implementation
does not pass, with the rule each one checks and what is being done about it. The format is
[`MANIFEST.schema.json`](MANIFEST.schema.json); what the fields mean, and the rule CI asserts, is
[`../PARITY.md`](../PARITY.md).

| File | Implementation | State |
|---|---|---|
| [`dotnet-v0.1.json`](dotnet-v0.1.json) | [Sakwala/affiant](https://github.com/Sakwala/affiant) — the .NET packages at `1.0.0-beta.3.1` | **published** 2026-09-09. An **empty** `failing[]` of 68 fixtures run, on `net10.0` at Unicode 16.0. Read at `v0.1.3`. The run it is taken from is the one `runLog` names, in that repository: `conformance/results/dotnet-1.0.0-beta.3.1.json`, with the negative oracle beside it — the same 68 documents against the *published* `1.0.0-beta.3`, where 62 passed, 3 failed and 3 errored and every fixture [`../ORACLE.md`](../ORACLE.md) lists against that release did not pass. The prior readings stay published here unchanged, a published run being evidence of what happened at that ref: [`../results/dotnet-1.0.0-beta.3/`](../results/dotnet-1.0.0-beta.3/) (`v0.1.2`, empty of 63) and [`../results/dotnet-1.0.0-beta.1/`](../results/dotnet-1.0.0-beta.1/) (`v0.1.1`, 60 of 63 failing rows, all 19 oracle fixtures failed). |
| [`typescript-v0.1.json`](typescript-v0.1.json) | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) — `@affiant/core` at `0.1.0-alpha.1` | **published** 2026-09-09. An **empty** `failing[]` of 68 fixtures run, asserted in that repository's CI on Node, Bun and workerd, where the failing set must be identical on each (RT-1); each runtime's `unicodeVersion` is measured by probe — 17.0 on Node and Bun, 16.0 on workerd. Read at `v0.1.3`. This is the implementation the fixtures were promoted from, so an empty set is what it owes and not a surprise. The run is the one `runLog` names, in that repository. `0.1.0-alpha.1` is that repository's `main`, and npm has carried it under the `alpha` tag since 2026-09-10: the `latest` tag is still `0.1.0-alpha.0`, which predates the presence change, so a reader installing `@affiant/core@alpha` reproduces this reading and one taking the `latest` tag reproduces the reading below. That earlier reading stays published here: [`../results/typescript-0.1.0-alpha.0/`](../results/typescript-0.1.0-alpha.0/) (`v0.1.2`, empty of 63). |

Naming: `<implementation>-v<protocol minor>.json`. A manifest is produced against exactly one protocol tag and says
nothing about any other.

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
implementation and version agree on the failing set exactly.
