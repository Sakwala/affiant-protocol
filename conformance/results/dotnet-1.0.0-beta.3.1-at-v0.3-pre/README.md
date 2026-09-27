# The .NET conformance run — `1.0.0-beta.3.1` at the v0.3 pre-release

The negative-oracle run for the native `MultiParty` pre-release (B-57e), published as the evidence for the third table
of [`../../ORACLE.md`](../../ORACLE.md), "The list for `1.0.0-beta.3.1` at the v0.3 pre-release". This is a **local**
run — the .NET repository's own `PROTOCOL_PIN` is never moved off `v0.2.0` for it; the pin was pointed at this
branch's head only inside a scratch worktree, for this run, and restored afterward.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant`](https://github.com/Sakwala/affiant) — the .NET packages at **`1.0.0-beta.3.1`** (`Directory.Build.props`: `VersionPrefix=1.0.0`, `VersionSuffix=beta.3.1`) |
| Runtime | `net10.0` |
| Driver | that repository's `tests/Affiant.Conformance.Tests`, run in place in a worktree at `/home/seevali/worktrees/affiant/oracle-v0.3-pre` |
| Protocol ref (`PROTOCOL_PIN`, local only) | this branch, `v0.3-pre`, at commit `36f3dd5282916e94c911402d0b8ed46a35d1a8c8` — the head recorded at the time of this run; no tag exists yet |
| Commit measured | `Sakwala/affiant` `main` at `995502f348dac38926a5478a7fcfb70e3f758c91` |
| Run produced | 2026-09-27T21:36:51.591Z |

## Totals

| | |
|---|---|
| Fixtures run | **80** — the vendored `0.1.0` conformance section (67) plus the thirteen new `MultiParty`/typed-detail fixtures |
| Passed | **62** |
| Failed | **0** |
| Errored | **18** |
| Skipped | **0** |

Eighteen fixtures errored, all with the identical driver-level exception `InvalidOperationException: The node must be
of type 'JsonValue'.`: the driver's fixture loader throws while deserializing a fixture's `given`/`markExecuted`/
`expect` block wherever this branch's format states an **object** (a `MultiParty` requirement object, or a typed
`executionDetail`/`detail` object) where `1.0.0-beta.3.1`'s driver still expects a bare string. Thirteen of those
eighteen are the fixtures this table is about; the other five (`decide/execution-executed`, `decide/execution-failed`,
`decide/execution-recorded-once`, `decide/execution-second-report-refused`, `sequence-a/approve-round-trip`) are
*pre-existing* fixtures that B-57c2 item 5 amended in place (string `executionDetail`/`detail` → typed object), so
they now hit the same loader limitation; they are not part of the thirteen-fixture claim below and are not carried
further here.

## The oracle reading

One row per fixture the [`ORACLE.md`](../../ORACLE.md) third table lists, plus the amended `decide/blocked-refused`.
**A fixture that passed would be a block** — none did.

| Fixture | Outcome | First diff / reason | Failed for the recorded defect? |
|---|---|---|---|
| `gate/multiparty-files-one-entry` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — the driver's fixture loader throws on the `MultiParty` requirement object before the gate runs; it never reaches the single-card routing the table's row names. It still counts as a failure under M-10. |
| `gate/multiparty-verdict-too-few-approvers` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception, before any verdict validation runs. |
| `gate/multiparty-verdict-required-out-of-range` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-partial-stays-pending` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception; the entry never files. |
| `decide/multiparty-all-approve` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-reject-folds` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-non-approver-refused` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-approver-twice-refused` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-amendment-refused` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-after-fold-refused` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-expired-then-resubmit` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same loader exception. |
| `decide/multiparty-executed-with-typed-detail` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — the exception fires on the `MultiParty` requirement object; the typed-`executionDetail` claim is never separately exercised in this row. |
| `decide/execution-detail-typed` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — this row is the typed-`executionDetail` claim in isolation (a `ReviewerConfirmation` entry); the loader throws on the object `detail`/`executionDetail`, not on the string-typing defect DK-1 names as such — but the effect is the same: a string is what this release can hold, and an object is what it cannot parse at all. |
| `decide/blocked-refused` (amended) | **pass** | — | Not on the table above (not one of the thirteen); the fixture now exercises `ReferralRequired`, which this release still correctly files `blocked` and refuses every decision on, unchanged by this pre-release. A pass here is expected, not a block. |

**Reading:** every one of the thirteen fails or errors, so the table's central claim — "every one of the thirteen new
fixtures must fail or error on it" — holds. But the *mechanism* is not the one ORACLE.md's third table describes for
twelve of the thirteen: the shipped driver's fixture loader cannot parse an object-shaped `requirement` or
`executionDetail`/`detail` at all, so it throws before the gate's single-card routing, the string-typed
`executionDetail`, or the verdict-validation gap the table's rows name is ever reached. Only for
`decide/execution-detail-typed` does the object-vs-string distinction sit closest to the surface (there is no
`MultiParty` requirement in that fixture to trip the loader first), and even there the loader's crash, not a value
comparison, is what is recorded. **This is a finding for B-57f's lens 3**: these eighteen errors are real evidence
that the release cannot run the 0.3.0 fixture format, but they are not, by themselves, evidence that the release
performs the *specific* behaviours (single-card routing, string typing, missing verdict validation) the third table's
rows describe — that would require a driver that can at least parse the new shapes and then observably do the wrong
thing, which `1.0.0-beta.3.1`'s vendored driver at the `v0.2.0` fixture format cannot.

## The files

| File | What it is |
|---|---|
| [`dotnet-1.0.0-beta.3.1.json`](dotnet-1.0.0-beta.3.1.json) | The machine-readable run, copied unchanged from `conformance/results/dotnet-1.0.0-beta.3.1.json` in the `Sakwala/affiant` scratch worktree. `protocolTag` in that document is the branch commit `36f3dd5282916e94c911402d0b8ed46a35d1a8c8` (this run's local pin had no tag); `implementation.commit` is `995502f348dac38926a5478a7fcfb70e3f758c91`. Validates against [`../../results.schema.json`](../../results.schema.json). |

This is the record of one run at one moment (2026-09-27T21:36:51.591Z) and is not updated in place.
