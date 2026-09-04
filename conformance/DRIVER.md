# DRIVER — the contract an implementation's conformance driver satisfies

**What a driver is.** The per-implementation program that binds the declarative fixtures in `fixtures/` to *one*
implementation of Affiant and reports what happened. The fixtures name no class, no file and no language; the driver is
the only place that knows any of that. There is one per implementation — `tests/Affiant.Conformance.Tests` in the .NET
repository, `packages/conformance-driver` in the TypeScript one — and a third language needs a third, which is what this
document is for.

**Read [`RUNNER.md`](RUNNER.md) first.** It is the format; this is what you do with it. [`PARITY.md`](PARITY.md) is the
document you publish afterwards.

A driver has five obligations. In order:

---

## 1. Pin a protocol tag

Versions of this rulebook are **git tags** on `Sakwala/affiant-protocol`. A driver pins exactly one and bumps it in its
own pull request, so a format change arrives as a reviewable diff in the implementation's own history and never as a
silent upstream shift under a running build.

Either way of pinning is acceptable; both are checked, neither is optional:

- **Fetch at build.** A file `conformance/PROTOCOL_PIN` in the *implementation's* repository holds the tag, and the build
  fetches that tag and **verifies a checksum** recorded beside it. An unverified fetch is not a pin: it makes the build
  depend on a remote that can change under it.
- **Vendor.** Copy `fixtures/`, `fixture.schema.json` and `results.schema.json` into the implementation's repository
  under a directory that records the tag, with the same checksum recorded. A CI step re-verifies the copy against the
  tag so a local edit to a vendored fixture cannot pass unnoticed — an edited fixture is no longer the document the
  comparison is about.

The tag the driver pinned goes into every result document (`protocolTag`) and into the parity manifest. A manifest
produced against one tag says nothing about another.

## 2. Supply the four ports from `given`

Every fixture states what four abstract collaborators must answer (`RUNNER.md` §7). The driver builds each one from the
fixture's `given` in its own language and hands them to its own gate:

| Port | Built from | Contract |
|---|---|---|
| **Inference** | `given.gate.inference` | Reports exactly the scripted fields for every turn, unchanged — no invention, no filtering, no re-scoring. Absent or `null`: reports nothing. |
| **Projection** | `given.gate.entities` | For an **update**, returns the named entity's stored values, keyed `"<entityType>/<entityId>"`. An entity not in the table does not exist: return "nothing to project", which the pipeline must distinguish from "every field was empty". Not consulted for a create (AF-3). |
| **Authorization** | `given.gate.authorization` | Admits a principal iff its id is in `allow`, or `allow` holds `"*"`. With `throws`, it falls over instead of answering — and the gate must read that as a **refusal**, never an approval (AZ-2, AZ-6). |
| **Clock** | `given.clock` and each step's `at` | A fixed instant that moves only when a step moves it. **No wall-clock read anywhere in a run**, including inside the store and the sweep. |

Plus two the driver owns outright: a **Docket store** (in-memory is enough, and must be tenant-scoped) and a **telemetry
sink** that records the keys emitted, so `expect.telemetry` and `expect.telemetryAbsent` can be answered.

A port the driver cannot supply is not a reason to skip the fixture. It is an `error` outcome (`RUNNER.md` §8) and it
counts against the implementation.

## 3. Bind each step kind to its own gate

Each of the eight step kinds (`RUNNER.md` §3) maps to one entry point on the implementation's own gate. The .NET binding
is the worked example: `wrap-execute` to the wrapped-tool surface, `file`/`decide`/`resubmit`/`markExecuted`/`get` to the
review gate, `expireDue` to the sweep, `rehydrate` to the rehydration surface, with the fixture's policy chain expressed
as the implementation's own approval-policy type.

Three bindings are where drivers go wrong, and all three are checked by fixtures that exist for the purpose:

1. **`wrap-execute` must supply an `execute` that fails if it is ever called.** The gate stands in front of writes and
   must never perform one (GT-6). A driver that supplied a harmless no-op would turn every Sequence A fixture into a
   fixture that cannot detect the bug it is there for.
2. **Refusals are caught and turned into a code**, not allowed to escape. A step that refuses produces
   `{ code, message }`; the runner compares the code (`RUNNER.md` §5.3).
3. **A refusal raised while the gate is being *built*** (CV-1) is reported through the same `expect.error` clause a
   step's refusal is, and nothing after it runs. On that path only `error`, `telemetry`, `telemetryAbsent` and `store`
   are answerable; anything else a fixture states there is a failure.

The card invariants of `RUNNER.md` §4.2 are checked on **every** filing, whether or not the fixture mentions them.

## 4. Run every fixture in the manifest and emit the result document

Read [`fixtures/MANIFEST.json`](fixtures/MANIFEST.json) section `"conformance"` and run **every** entry — not the
directory listing, and not a subset the driver happens to have bound. A fixture in the manifest that the driver does not
run is `error`, never absent.

Validate each fixture against [`fixture.schema.json`](fixture.schema.json) before running it, and apply the same
strictness the format requires (`RUNNER.md` §6): an unknown key fails the fixture, and an `expect` that states no fact
fails it. A driver that skipped those two checks would report a pass for a document that asserts nothing, and the whole
arrangement rests on that never happening.

Emit one document per implementation-and-runtime validating against [`results.schema.json`](results.schema.json):
`implementation`, `protocolTag`, `producedAt`, a `summary`, and one `results[]` entry per fixture carrying `id`,
`outcome` (`pass` | `fail` | `error` | `skipped`), `diff` and `durationMs`. Publish it with the run — the manifest is the
claim, the result document is the evidence.

An implementation that runs on more than one runtime (RT-1) runs the suite on each and emits one document per runtime.
**The failing set must be identical across them.** A fixture that fails on one runtime only is a failing fixture, recorded
once in the parity manifest with the runtime named in its `detail`.

## 5. Assert the failing set equals the parity manifest, exactly

The driver's CI compares the set of `id`s whose outcome is `fail` or `error` against `failing[].id` in the
implementation's parity manifest ([`PARITY.md`](PARITY.md), [`parity/`](parity/)) and **fails the build on any difference
in either direction**:

- a fixture that starts failing and is not in the manifest — a regression, or a rule the implementation never met and
  nobody wrote down;
- a fixture that starts passing and is still in the manifest — a gap that has been closed and not published. A check
  that only caught the first would let a fix rot unrecorded, and the manifest would drift into a document nobody trusts.

`skipped` is not a third bucket that quietly avoids this: a skip is legitimate only where the manifest declares it (an
exemption inherited from the rulebook, or a runtime the implementation does not claim), and the assertion checks that too.

The manifest is regenerable but **never auto-committed**. A change to the failing set is a change to a published claim
about an implementation and belongs in a pull request a person read.

## 6. Declaring runtime claims and inherited exemptions

Two rulebook areas cannot be checked by a declarative fixture, and a driver states its position on them in its parity
manifest rather than leaving a reader to guess.

**Runtime claims (RT-1, RT-2).** `runtimes[]` names every runtime the implementation claims, each with `claimed: true`
and, where a run was made, its version. RT-1 is the claim that the core is runtime-neutral: an implementation claiming
three runtimes runs the suite on three and says so. RT-2 is the per-request resource envelope: it is checked by a budget
suite on the implementation's own CI, not by a fixture, and the manifest names that suite in the exemption's
`checkedInstead` so a reader knows where the claim is tested. A runtime the implementation does not claim is **not** a
gap; a runtime it claims and does not run the suite on **is**.

**Inherited exemptions.** [`lint/coverage-exemptions.json`](lint/coverage-exemptions.json) names the rules that carry no
conformance fixture at v0.1, each with a version and a reason — schema-level rules checked by the fixture lint,
runtime rules checked by a CI matrix and a source lint, registry rules checked by registry suites, and the rules whose
fixtures arrive with the first adapter at v0.2. A driver **copies** those entries into `exemptions[]` in its manifest, so
a reader of that document alone knows which rules no fixture in the run covers, and adds `checkedInstead` naming what it
does instead. An implementation may not invent an exemption: exempting yourself from a rule is not a parity report, it
is a press release.
