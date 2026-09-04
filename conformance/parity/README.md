# parity/

One **parity manifest** per implementation: the published, CI-asserted list of conformance fixtures that implementation
does not pass, with the rule each one checks and what is being done about it. The format is
[`MANIFEST.schema.json`](MANIFEST.schema.json); what the fields mean, and the rule CI asserts, is
[`../PARITY.md`](../PARITY.md).

| File | Implementation | State |
|---|---|---|
| `dotnet-v0.1.json` | [Sakwala/affiant](https://github.com/Sakwala/affiant) — the .NET packages | not yet written. Produced by that repository's conformance driver's first run against `1.0.0-beta.1`; every fixture in [`../ORACLE.md`](../ORACLE.md) must appear in it. |
| `typescript-v0.1.json` | [Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) — `@affiant/core` | not yet written. Expected to carry an empty `failing[]`: this is the implementation the fixtures were promoted from, and its driver is merge-blocking there. |

Naming: `<implementation>-v<protocol minor>.json`. A manifest is produced against exactly one protocol tag and says
nothing about any other.

**Reading one.** Look at `failing[]`. Each row names a fixture id, the numbered rules in
[`../../INVARIANTS.md`](../../INVARIANTS.md) it checks, and a `disposition` — `fixed` (corrected in the release
`fixedIn` names), `fenced` (a host-side workaround, named in `fence`, contains it), or `ignored` (nothing is being done,
and `detail` says why). An empty `failing[]` is the strongest statement an implementation can make here. Anything else is
the honest one.

**Writing one.** Do not hand-write it: run the driver, take the failing set from the result document
([`../results.schema.json`](../results.schema.json)), and write the disposition and the detail by hand — those are
judgements, not output. Then open a pull request. The file is never auto-committed.
