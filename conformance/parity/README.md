# parity/

One **parity manifest** per implementation: the published, CI-asserted list of conformance fixtures that implementation
does not pass, with the rule each one checks and what is being done about it. The format is
[`MANIFEST.schema.json`](MANIFEST.schema.json); what the fields mean, and the rule CI asserts, is
[`../PARITY.md`](../PARITY.md).

| File | Implementation | State |
|---|---|---|
| [`dotnet-v0.1.json`](dotnet-v0.1.json) | [Sakwala/affiant](https://github.com/Sakwala/affiant) — the .NET packages at `1.0.0-beta.1` | **published** 2026-09-04. 60 failing rows of 63 fixtures run: 50 `planned` — 49 for `1.0.0-beta.3` and one for the unreleased `1.0.0-beta.1.1` — and 10 `fenced`. All 19 fixtures in [`../ORACLE.md`](../ORACLE.md) appear in it and all 19 failed. The run is [`../results/dotnet-1.0.0-beta.1/`](../results/dotnet-1.0.0-beta.1/). |
| [`typescript-v0.1.json`](typescript-v0.1.json) | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) — `@affiant/core` at `0.1.0-alpha.0` | **published** 2026-09-04. An **empty** `failing[]` of 63 fixtures run, asserted in that repository's CI on Node, Bun and workerd, where the failing set must be identical on each (RT-1). This is the implementation the fixtures were promoted from, so an empty set is what it owes and not a surprise. The run is [`../results/typescript-0.1.0-alpha.0/`](../results/typescript-0.1.0-alpha.0/). |

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
