# The negative oracle — fixtures that must fail on `Sakwala/affiant` `1.0.0-beta.1`

A fixture whose rule a known defective release violates is accepted into `conformance/` only if it **fails** against that
release (`INVARIANTS.md`, preamble). For v0.1 the release is the shipped .NET packages at `1.0.0-beta.1` (2026-08-23), whose
defects are known. This file lists every fixture that must fail on it, the rule it checks, and the shipped defect it
refutes. A listed fixture that *passes* on beta.1 is either mis-authored or the defect is not what was recorded — it is
investigated and this list or the fixture is corrected before the `v0.1.0` tag. Fixtures not listed here MAY pass or fail
on beta.1; the parity manifest records which.

**This list has been run.** The .NET conformance driver's first run against `1.0.0-beta.1` (2026-09-04) is published at
[`results/dotnet-1.0.0-beta.1/`](results/dotnet-1.0.0-beta.1/): all 19 fixtures below failed, none passed. Three rows
were **corrected by that run** rather than the run being tuned to match them — two fixtures were listed against a defect
they do not in fact exercise, and one recorded defect turned out to be a different, truer statement about the release.
The three are under *Corrected by the run* below. The rule that a listed fixture must fail is unchanged and still
holds for all 19.

| Shipped defect (as recorded in the framework's own issues and reviews) | Rule | Fixtures that must fail on beta.1 |
|---|---|---|
| The aggregate confidence is a mean over the non-`Empty` fields, so a mostly-empty Affidavit can report high confidence | AF-2 | `sequence-a/typed-inputs-on-the-card`, `sequence-a/mandatory-field-left-empty` |
| Every Affidavit is create-shaped: `EntityId` and every `PreviousValue` are hard-coded null | AF-3 | `gate/update-previous-values` |
| The time-to-live is stamped from one global default before the policy chain runs | GT-4 | `gate/ttl-from-verdict`, `gate/ttl-from-policy-default` |
| A `MultiParty` requirement is routed to the single-card branch — one approval satisfies a joint requirement | AZ-4 | `gate/multiparty-blocked` |
| Substance (a value with `Empty` provenance) is checked at test time only; the runtime files hollow Affidavits | GT-3 | `gate/substance-hollow-refused`, `gate/substance-zero-field-refused` |
| The gate carries no conversation identity; isolation is the host's scoping discipline alone (the shipped adapters resolve the context store from the application's root provider) | GT-2 | `sequence-a/interleaved-conversations` |
| A re-file with the same id broadcasts a card with a freshly computed deadline | GT-4 | `sequence-a/replay-keeps-the-deadline` |
| Decision authorization is hand-rolled per host, tenant-blind, and permits the action when identity is unresolved | AZ-2 | `decide/unresolved-identity`, `decide/wrong-tenant` |
| The expiry sweep loads every pending entry, unpaged, on every instance | DK-3 | `sequence-a/sweep-pages` |
| No execution-outcome state: an approved-but-failed write is indistinguishable from an approved-and-committed one | DK-1 | `decide/execution-executed`, `decide/execution-failed` |
| A reviewer's amendment never recomputes the aggregate confidence | AF-4 | `decide/amend-recompute` |
| No attestation record on the row: nothing says who or what approved a write | AZ-1 | `decide/approve`, `gate/standing-order-by-the-book` |
| No `blocked` marker and no coverage refusal | AZ-4, CV-4 | `gate/coverage-refused-declared` |

## Corrected by the run

Three rows of the table above say something different from what they said before the first .NET run. Nothing was
changed to make a fixture pass or fail; each is a correction to what the row *claims*, made because the run showed the
claim was not the one the evidence supports.

1. **The risk floor left the table.** It was listed as the defect `gate/standing-order-by-the-book` refutes. No
   declarative fixture can reach it, so that fixture is not evidence for it. The fixture stays on the attestation row —
   it does fail on beta.1, for the missing attestation record and the missing execution state — and the risk-floor
   defect moves to *Refuted by implementation tests, not by a fixture*, below.

2. **`gate/update-previous-values` moved from the AF-2 row to the AF-3 row.** It was on both. The run shows the AF-2
   defect does not manifest in it: every field in that fixture is non-`Empty`, so the mean and the minimum agree and the
   aggregate confidence matched. What the fixture does refute is AF-3 — the entity id is null and the previous value is
   null on every field. It is now listed on the AF-3 row only.

3. **The conversation-scope defect was reworded.** It read as though a process-global context store made two
   conversations see each other. The run did not reproduce that: the framework registers its context fabric per DI
   scope, and a host that scopes per conversation — which is what the framework's own tool pipeline does — keeps them
   apart. What is true, and is what GT-2 is about, is that **the gate carries no conversation identity at all**:
   isolation rests entirely on the host's scoping discipline, and the shipped adapters resolve the context store from
   the application's root provider, so the documented wiring gives every conversation the same one.
   `sequence-a/interleaved-conversations` stays listed — it does fail on beta.1 — against the reworded defect.

## Refuted by implementation tests, not by a fixture

One recorded defect of `1.0.0-beta.1` has no fixture in this suite that can reach it, and it is written down here rather
than left looking like a fixture-checked fact.

**The risk floor.** The shipped `DefaultRiskScoreCalculator` never returns the grade the default Standing Order
threshold demands, so a by-the-book Standing Order can never fire. That path runs only through a policy derived from
`StandingOrderBase` with the default scorer, and **a declarative fixture cannot bind one**: a fixture declares its
policy, and a declared policy binds to `IApprovalPolicy`, which is the interface the framework's evaluator walks. In the
first .NET run the Standing Order therefore fired. `gate/standing-order-by-the-book` still failed, and for real reasons
the release does not carry either way — the row a Standing Order approves has no attestation record and no execution
state — which is why it is listed above on the attestation row and not on a risk-floor one. The defect itself is refuted
by the implementation's own tests instead (`RiskConfigurationTests` in `Affiant.Policies.Tests`, which arrive with
[Sakwala/affiant#53](https://github.com/Sakwala/affiant/pull/53), the change that closes it in `1.0.0-beta.1.1`).

A rule this repository cannot reach with a fixture is a gap in the suite, not a rule to drop. When a fixture format that
can express a host-supplied policy type exists, this becomes a row in the table above.

## The run

- [`results/dotnet-1.0.0-beta.1/ORACLE-RUN.md`](results/dotnet-1.0.0-beta.1/ORACLE-RUN.md) — this list, run: every
  fixture, what failed, and whether the failure is the defect recorded here.
- [`results/dotnet-1.0.0-beta.1/results.json`](results/dotnet-1.0.0-beta.1/results.json) — the machine-readable run
  (`results.schema.json`).
- [`parity/dotnet-v0.1.json`](parity/dotnet-v0.1.json) — the claim the run is evidence for.
