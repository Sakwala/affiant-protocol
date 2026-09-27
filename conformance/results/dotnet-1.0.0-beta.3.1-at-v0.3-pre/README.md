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

`conformance/sync.sh` in the .NET repository vendors `schemas/0.1.0` by name and not `schemas/0.3.0`; this run's
driver never read the 0.3.0 schemas, only the 0.1.0 copy — a `Sakwala/affiant` change for the catch-up.

## Totals

| | |
|---|---|
| Fixtures run | **80** — this branch's 67 pre-existing conformance rows (five amended at 0.3.0) plus the thirteen new `MultiParty`/typed-detail fixtures |
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
this branch's pre-existing conformance rows, amended in place at 0.3.0 (string `executionDetail`/`detail` → typed
object), so they now error on `1.0.0-beta.3.1` too — a change the `.NET` parity manifest will need to carry at the
catch-up. They are not part of the thirteen-fixture claim below and are not carried further here.

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
fixtures must fail or error on it" — holds. Every one of the listed fixtures errored in the driver's fixture loader —
an object-typed `requirement` or `executionDetail` where the `1.0.0-beta.3.1` driver expects a string — before the
gate ran, so this run proves that the release cannot run the 0.3.0 format and not the specific mechanism each row
names; the per-mechanism demonstration is the .NET catch-up driver's first run at `v0.3.0`.

## The files

| File | What it is |
|---|---|
| [`results.json`](results.json) | The machine-readable run, copied unchanged from `conformance/results/dotnet-1.0.0-beta.3.1.json` in the `Sakwala/affiant` scratch worktree. `protocolTag` in that document is the branch commit `36f3dd5282916e94c911402d0b8ed46a35d1a8c8` (this run's local pin had no tag); `implementation.commit` is `995502f348dac38926a5478a7fcfb70e3f758c91`. Validates against [`../../results.schema.json`](../../results.schema.json). |

This is the record of one run at one moment (2026-09-27T21:36:51.591Z) and is not updated in place.
