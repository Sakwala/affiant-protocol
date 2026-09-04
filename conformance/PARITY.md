# PARITY — the parity-manifest format

**What a parity manifest is.** One implementation's published statement of exactly which conformance fixtures it does
**not** pass, and why. It lives in this repository, beside the fixtures it is about, at
`parity/<implementation>-v<protocol minor>.json` — `parity/dotnet-v0.1.json`, `parity/typescript-v0.1.json`. Its schema
is [`parity/MANIFEST.schema.json`](parity/MANIFEST.schema.json).

**Why it exists.** Two implementations of the same rulebook will not reach it at the same moment, and pretending
otherwise produces either a suite nobody runs or a suite everybody quietly disables. A parity manifest makes the gap a
**published fact with a name**: a reader deciding whether to adopt an implementation can see, before installing
anything, which numbered rules it does not yet meet and what its authors are doing about each one. The alternative is
that they find out by running the suite themselves, or by an outage.

**Read [`DRIVER.md`](DRIVER.md) first** — the manifest is derived from the result document a driver emits.

---

## The document

```jsonc
{
  "schemaVersion": "0.1.0",
  "implementation": "dotnet",
  "version": "1.0.0-beta.1",
  "protocolTag": "v0.1.0",
  "producedAt": "2026-09-04T00:00:00.000Z",
  "runLog": "parity/dotnet-v0.1.run.json",
  "failing": [
    {
      "id": "gate/update-previous-values",
      "rules": ["AF-3", "AF-1", "AF-2"],
      "disposition": "fixed",
      "fixedIn": "1.0.0-beta.3",
      "detail": "The built-in projection returns a create-shaped Affidavit for an update: the entity id and every previous value are null, so a card cannot show what is changing.",
      "issue": "https://github.com/Sakwala/affiant/issues/…",
      "oracle": true
    }
  ],
  "runtimes": [{ "name": "net8.0", "version": "8.0.x", "claimed": true }],
  "exemptions": [
    {
      "rule": "SR-3",
      "until": "always",
      "reason": "a schema-level rule: checked by the schema lint over every fixture",
      "checkedInstead": "the wire round-trip suite"
    }
  ]
}
```

| Key | What it is |
|---|---|
| `schemaVersion` | The version of the manifest format. `"0.1.0"` here. |
| `implementation` | Which implementation this is about — `"dotnet"`, `"typescript"`. One manifest per implementation. |
| `version` | The version of that implementation the run exercised: a package version a reader can install and reproduce this against. |
| `protocolTag` | The rulebook tag the fixtures came from. A driver bumps its pin and its manifest in the same pull request. |
| `producedAt` | When the run happened. |
| `runLog` | Where the run that produced this can be read — a path in this repository or a CI run URL. The manifest is the claim; the log is the evidence. |
| `failing[]` | Every fixture the implementation does not pass. **Exactly these and no others.** |
| `runtimes[]` | The runtimes this holds for, each `claimed` or not (`DRIVER.md` §6). |
| `exemptions[]` | The rulebook exemptions this implementation inherits, copied from [`lint/coverage-exemptions.json`](lint/coverage-exemptions.json), each optionally naming what the implementation checks instead. An implementation may not invent one. |

### A `failing` row

`id` and `rules` come straight from the fixture, so a reader sees which numbered rule is unmet without opening anything.
`detail` is one or two sentences saying **what the implementation does instead and why it matters**, written for
somebody deciding whether to adopt it — not a stack trace. `oracle` is `true` when the fixture is on the negative-oracle
list ([`ORACLE.md`](ORACLE.md)) for this release: its failing is expected, and is the evidence the fixture is a real test
rather than a formality.

`disposition` is the row's whole reason for being readable, and there are three values and no fourth:

| `disposition` | Means | Also requires |
|---|---|---|
| `fixed` | Corrected in a named later release. This row exists because the version under test still fails it. | `fixedIn` — the release that corrects it. |
| `fenced` | The implementation does not do this, and a specific host-side workaround makes it safe in the meantime. | `fence` — the workaround, named specifically enough to be applied. |
| `ignored` | Nothing is being done. | Nothing beyond a `detail` that says why, in a sentence a reader can disagree with. |

A failure with no disposition is a failure nobody has looked at, which is why the format has no way to express one.

## The rule CI asserts

**The set of fixture ids a run reports as `fail` or `error` equals `failing[].id` exactly.** Any difference fails the
build, in **either** direction:

- a fixture failing that the manifest does not list — a regression, or a rule the implementation never met and nobody
  wrote down;
- a fixture passing that the manifest still lists — a gap closed and not published.

A check that caught only the first would let a fix rot unrecorded and the manifest would become a document nobody
trusts. `skipped` is not an escape hatch: a skip is legitimate only where this manifest declares it (an inherited
exemption, or a runtime not claimed), and the assertion checks that too.

The manifest is regenerable but **never auto-committed**: a change to the failing set is a change to a published claim
about an implementation, and belongs in a pull request a person read.

## How it is published

The file itself, in this repository, under [`parity/`](parity/) — not a badge, not a page, not a paragraph in a README
that drifts. Beside it, the run log the driver emitted (`results.schema.json`), so a reader can check the claim rather
than take it.

Until an implementation's manifest is empty, that implementation is described as **conformant to the subset it passes**,
naming the manifest — never as "conformant". `parity/README.md` lists the manifests that exist and links each to the
implementation it is about.

## Expected shape at v0.1

The .NET implementation at `1.0.0-beta.1` has known defects that the negative oracle turns into a requirement: every
fixture [`ORACLE.md`](ORACLE.md) lists **must** appear in `parity/dotnet-v0.1.json` with `oracle: true`. A listed fixture
that *passes* is not good news — it means the fixture is mis-authored or the recorded defect is not what it was said to
be, and it is investigated and the list or the fixture corrected before the `v0.1.0` tag. That is the entire point of
the oracle.

The TypeScript implementation is the one the fixtures were promoted from, so `parity/typescript-v0.1.json` is expected to
carry an empty `failing[]` — and its driver is **merge-blocking** in that repository, so a red run cannot merge.
