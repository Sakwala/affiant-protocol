# The .NET conformance run — `1.0.0-beta.3.1` at the v0.4 pre-release

The negative-oracle run for the withdrawal transition, published as the evidence for the fourth table
of [`../../ORACLE.md`](../../ORACLE.md), "The list for `1.0.0-beta.3.1` at the v0.4 pre-release". This is a **local**
run — the .NET repository's own `PROTOCOL_PIN` is never moved off `v0.2.0` for it; the pin was pointed at this
branch's head only inside a scratch worktree, for this run, and restored afterward. This run directory is rewritten
in place each time the run is repeated against a new branch head — it is the record of the branch head the pull
request carries, not of a fixed tag.

## Provenance

| | |
|---|---|
| Implementation | [`Sakwala/affiant`](https://github.com/Sakwala/affiant) — the .NET packages at **`1.0.0-beta.3.1`** (`Directory.Build.props`: `VersionPrefix=1.0.0`, `VersionSuffix=beta.3.1`) |
| Runtime | `net10.0` |
| Driver | that repository's `tests/Affiant.Conformance.Tests`, run in place in a worktree at `/home/seevali/worktrees/affiant/oracle-v0.3-pre` |
| Protocol ref (`PROTOCOL_PIN`, local only) | this branch, `v0.4-text`, at commit `e1071e6c381f5a543b7e3db70bceedfacd581394` — the head recorded at the time of this run; no tag exists yet |
| Commit measured | `Sakwala/affiant` `main` at `995502f348dac38926a5478a7fcfb70e3f758c91` |
| Run produced | 2026-09-28T12:12:42.499Z |

`conformance/sync.sh` in the .NET repository vendors `schemas/0.1.0` by name and not `schemas/0.4.0`; this run's
driver never read the 0.4.0 schemas, only the 0.1.0 copy — the same fact recorded for the v0.3 pre-release run, a
`Sakwala/affiant` change for the catch-up.

## Totals

| | |
|---|---|
| Fixtures run | **97** — the 87 fixtures the [v0.3 pre-release run](../dotnet-1.0.0-beta.3.1-at-v0.3-pre/README.md) carried plus the ten `withdraw`-family fixtures this branch head adds |
| Passed | **59** |
| Failed | **11** |
| Errored | **27** |
| Skipped | **0** |

Two of the ten `withdraw`-family fixtures — `decide/withdraw-pending-multiparty` and
`decide/withdraw-replay-returns-withdrawn` — **errored**: each files a `MultiParty` entry first, and the driver's
fixture loader throws on that requirement object before the entry ever files (the same `InvalidOperationException:
The node must be of type 'JsonValue'.` the v0.3 pre-release run recorded for every `MultiParty` fixture) — the
`withdraw` step is never reached. The other eight **failed**, each `reason: "not-implemented: step kind \"withdraw\"
is not bound."` — the driver recognises the fixture format's `withdraw` step syntactically (the vendored `0.4.0`
`fixture.schema.json` copy validates it) but has no driver code bound to it, so it reports the step as not
implemented rather than crashing on it, and no row is filed or acted on.

The remaining totals repeat the v0.3 pre-release run's own composition unchanged: twenty-five fixtures error on the
same `MultiParty`/typed-`executionDetail` object-vs-string loader defect the third table's run recorded (twenty of
them the third table's own list; the other five — `decide/execution-executed`, `decide/execution-failed`,
`decide/execution-recorded-once`, `decide/execution-second-report-refused`, `sequence-a/approve-round-trip` — amended
in place at 0.3.0, not part of either table's claim); `decide/approve` and `decide/reject` fail outright on the
missing `decision.by` field, as at the v0.3 pre-release run; `decide/amend-recompute` fails on a `canonicalHash`
mismatch unrelated to withdrawal or to `MultiParty` — a pre-existing gap, not part of this table's claim, recorded
here as a follow-up and not investigated further by this unit. None of these five is a `withdraw`-family fixture and
none is on the fourth table's list.

## The oracle reading

One row per fixture the [`ORACLE.md`](../../ORACLE.md) fourth table lists.
**A fixture that passed would be a block** — none did.

| Fixture | Outcome | First diff / reason | Failed for the recorded defect? |
|---|---|---|---|
| `decide/withdraw-pending-multiparty` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — the driver's fixture loader throws on the `MultiParty` requirement object before the `withdraw` step is ever reached; the release still cannot run the underlying `MultiParty` filing at all, let alone withdraw it. |
| `decide/withdraw-pending-reviewer-confirmation` | fail | `{"at": "entry", "expected": "a Docket row", "actual": "no row was filed or acted on"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — the release recognises no `withdraw` step; this is the direct demonstration named in the table's row. |
| `decide/withdraw-blocked-allowed` | fail | `{"at": "entry", "expected": "a Docket row", "actual": "no row was filed or acted on"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — same unbound-step reason. |
| `decide/withdraw-after-fold-refused` | fail | `{"at": "error", "expected": "{\"code\":\"decision-not-pending\"}", "actual": "no refusal was produced"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — same unbound-step reason. |
| `decide/withdraw-expired-refused` | fail | `{"at": "error", "expected": "{\"code\":\"decision-expired\"}", "actual": "no refusal was produced"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — same unbound-step reason. |
| `decide/withdraw-twice-refused` | fail | `{"at": "error", "expected": "{\"code\":\"decision-not-pending\"}", "actual": "no refusal was produced"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — same unbound-step reason. |
| `decide/withdraw-wrong-tenant-not-found` | fail | `{"at": "error", "expected": "{\"code\":\"entry-not-found\"}", "actual": "no refusal was produced"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — same unbound-step reason. |
| `decide/decide-after-withdraw-refused` | fail | `{"at": "error", "expected": "{\"code\":\"decision-not-pending\"}", "actual": "no refusal was produced"}` (six further diff entries on `entry.status`, `entry.execution`, `entry.attestation`, `entry.decision.kind`, `entry.decision.reason`, `entry.decision.by`, all against an unwithdrawn row) — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — the `withdraw` step never runs, so the entry is left `approved` by the ordinary decide step that follows it in the fixture, not `withdrawn`; the release has no `Withdrawn` status to reach either way. |
| `decide/execution-on-withdrawn-refused` | fail | `{"at": "entry.status", "expected": "withdrawn", "actual": "pending"}` — `reason: "not-implemented: step kind \"withdraw\" is not bound."` | **Yes** — same unbound-step reason. |
| `decide/withdraw-replay-returns-withdrawn` | error | `InvalidOperationException: The node must be of type 'JsonValue'.` | **No** — same `MultiParty` requirement-object loader crash as `decide/withdraw-pending-multiparty`; the `withdraw` step is never reached. |

**Reading:** every one of the ten `withdraw`-family fixtures fails or errors, so the fourth table's central claim —
"every `withdraw` fixture must fail or error on it" — holds. Eight of the ten fail for the table's own recorded
defect exactly — the driver reports the `withdraw` step kind as unbound, with no row filed or acted on, which is the
release having no `withdraw` step and `ReviewStatus` no `Withdrawn` value, read directly off the driver's own
message. The other two — the fixtures that file a `MultiParty` entry before withdrawing it — error earlier, in the
fixture loader's object-vs-string defect that the v0.3 pre-release run already established, before the `withdraw`
step is ever reached; they still fail against the release for the table's own reason once that earlier defect is
accounted for (the release could not withdraw a `MultiParty` entry even if it could file one), but the loader crash,
not the missing `withdraw` step, is what this run's diff shows first for those two rows.

## The files

| File | What it is |
|---|---|
| [`results.json`](results.json) | The machine-readable run, copied unchanged from `conformance/results/dotnet-1.0.0-beta.3.1.json` in the `Sakwala/affiant` scratch worktree. `protocolTag` in that document is the branch commit `e1071e6c381f5a543b7e3db70bceedfacd581394` (this run's local pin had no tag); `implementation.commit` is `995502f348dac38926a5478a7fcfb70e3f758c91`. Validates against [`../../results.schema.json`](../../results.schema.json). |

This is the record of the branch head at the moment of the most recent run (2026-09-28T12:12:42.499Z); it is
rewritten in place, not appended, each time the run is repeated against a new branch head.
