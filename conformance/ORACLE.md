# The negative oracle — fixtures that must fail on a release known to be broken

A fixture whose rule a known defective release violates is accepted into `conformance/` only if it **fails** against that
release (`INVARIANTS.md`, preamble). This file lists, **per release**, every fixture that must fail on it, the rule it
checks, and the shipped defect it refutes. Two releases are listed, each with its own table: the shipped .NET packages at
`1.0.0-beta.1` (2026-08-23) for v0.1, and `1.0.0-beta.3` (2026-09-05) for the PV-3 amendment at `v0.1.3`.

The procedure is the same for both. A listed fixture that *passes* on the release it is listed against is either
mis-authored or the defect is not what was recorded — it is investigated, and this list or the fixture is corrected before
the tag that carries it: `v0.1.0` for the beta.1 table, `v0.1.3` for the beta.3 table. Fixtures not listed against a
release MAY pass or fail on it; the parity manifest records which. A release's table says nothing about the other
release.

## The list for `1.0.0-beta.1`

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

## The defect at `1.0.0-beta.3` — presence taken from the port's claim

`v0.1.3` amends PV-3: the value is literally present in the utterance is a property of two strings, so the
**implementation** establishes it from the unmodified utterance and the port's `presence` and `utteranceSpan` are hints it
verifies the same way. The five fixtures the table below lists — the four oracle fixtures the amendment arrives with
and the one it amends — are its negative oracle against `Sakwala/affiant` `1.0.0-beta.3` (the release deployed to the demo hosts on
2026-09-06).

| Shipped defect (as recorded in the framework's own issues and reviews) | Rule | Fixtures that must fail on beta.3 |
|---|---|---|
| Presence is taken from the inference port's `presence` property alone, and no shipped port reports it: every value a person typed is graded `Inferred` and carries no binding — and on the shipped packages neither of these two reaches the gate at all, because the beta.3 fixture loader reads `presence` as required where `v0.1.3` makes it optional and throws without it, so each is an `error` outcome; a probe that scripts `presence: "inferred"` into them, which is beta.3's own spelling of a port that claimed nothing, shows the recorded grading defect underneath | PV-3 | `gate/inference-presence-computed-from-the-utterance`, `gate/inference-case-folds-and-the-digest-is-the-utterances` |
| A port's `presence: "literal"` is honoured unverified: a value that is not in the utterance is graded `Conversation` and bound to the span the port named | PV-3 | `gate/inference-port-literal-unconfirmed` |
| A binding is minted only where the port named a span, and from the span the port named: a value the person typed carries no binding when the port reported none, and a span naming text inside a longer token is minted as given | PV-2, PV-3 | `sequence-a/picker-external-binding`, `gate/inference-port-span-fails-the-boundary` |

Every row is read off the release's own source. `src/Affiant.Core/Filters/TaskInferenceStep.cs` at the tag
`v1.0.0-beta.3` grades a field `Conversation` when, and only when, the port's JSON carries `presence` equal to
`literal`, and `Inferred` otherwise; its `UtteranceSpanOf` mints an `utterance-span` binding from whatever `start` and
`end` the port named, digesting the value the port reported rather than the utterance's own substring, and mints none
when the port names no span. So `gate/inference-presence-computed-from-the-utterance` and
`gate/inference-case-folds-and-the-digest-is-the-utterances` — ports that report value and confidence only, for values
that are in the utterance — grade `Inferred` and unbound on that release where both fixtures expect `Conversation` and
bound, once the release's loader is given the `presence` key it requires; `gate/inference-port-literal-unconfirmed` — a
port that reports `literal` with a span for a value that is not in the utterance — reads `Conversation` and bound where
the fixture expects `Inferred` and unbound; `gate/inference-port-span-fails-the-boundary` — a port that reports
`literal` with a span naming the `20` inside `2026-09-08` — is honoured as given and reads `Conversation`, bound, where
the fixture expects `Inferred` and unbound; and `sequence-a/picker-external-binding` — a port that reports `literal` for
`Active` with no span — mints no binding where the fixture, from `v0.1.3`, expects the field bound to the span it was
read from.

A table is read off a release's source; it becomes evidence when it is **run**. This one has been run. On 2026-09-08 the
.NET conformance harness `1.0.0-beta.3`, restored from nuget.org into an isolated package cache by a scratch consumer,
ran this branch's fixture tree: **62 of the 67 documents the tree held that day passed, none of the five above did,
and nothing outside the table failed.** Three failed on the grade and the binding —
`gate/inference-port-literal-unconfirmed`,
`gate/inference-port-span-fails-the-boundary` and `sequence-a/picker-external-binding`, each with the diff its row
describes. Two, `gate/inference-presence-computed-from-the-utterance` and
`gate/inference-case-folds-and-the-digest-is-the-utterances`, errored in the release's fixture loader before the gate ran,
for the reason their row gives; the probe that row describes supplies the missing key and shows the grading defect itself.

One fixture in the tree today was not in that run. `gate/inference-empty-value-is-nothing-reported` was authored after
it, and it is listed against no release: `1.0.0-beta.3` skips a port's empty value before it grades anything —
`src/Affiant.Core/Filters/TaskInferenceStep.cs` at `v1.0.0-beta.3` reads the value's text and continues past an empty
one — so the field stays `Empty` and the release refuses the proposal exactly as the fixture expects. A fixture not
listed against a release MAY pass or fail on it, as the procedure above says; this one is expected to pass. The
implementation it separates is the TypeScript core at `0.1.0-alpha.0`, which admits a port's empty string as
`Inferred` at the port's confidence (`packages/core/src/gate/pipeline.ts`), and this file lists .NET releases, so that
is written here as a fact about the fixture rather than as a table row.

One line of the `sequence-a/picker-external-binding` diff is a gap in that driver rather than a defect in the release: the
beta.3 harness does not implement `fieldMatcher.utteranceSpan` at all — it reads `utteranceSpan` only on the inference
port's input side — so a pinned span reads as absent under it whatever the release mints. The evidence against the
release there is `bound: false` and `bindingKind: null`.

The other half of the assertion — the same tree against the branch that fixes
[Sakwala/affiant#123](https://github.com/Sakwala/affiant/issues/123), where all five must pass — belongs to the
implementation repository, and so does the published run document: a result document names the protocol tag from the
`PROTOCOL_PIN` an implementation vendors, and this repository holds none. It is published from `Sakwala/affiant` with the
`1.0.0-beta.3.1` release, from the vendored copy of the `v0.1.3` tag.

**verified by:** the run of 2026-09-08 described above — `Affiant.Testing.ComplianceHarness` `1.0.0-beta.3` and its four
sibling packages from nuget.org, an isolated `NUGET_PACKAGES`, this branch's fixture tree, implementation commit
`436c5e23822b44a2857fb2a0232df900545a72f8`, over the 67 documents the tree held that day: 62 passed, 3 failed, 2 could
not load, and every one of the five listed here did not pass.

## The run

- [`results/dotnet-1.0.0-beta.1/ORACLE-RUN.md`](results/dotnet-1.0.0-beta.1/ORACLE-RUN.md) — this list, run: every
  fixture, what failed, and whether the failure is the defect recorded here.
- [`results/dotnet-1.0.0-beta.1/results.json`](results/dotnet-1.0.0-beta.1/results.json) — the machine-readable run
  (`results.schema.json`).
- [`parity/dotnet-v0.1.json`](parity/dotnet-v0.1.json) — the claim the run is evidence for.
