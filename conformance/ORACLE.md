# The negative oracle — fixtures that must fail on `Sakwala/affiant` `1.0.0-beta.1`

A fixture whose rule a known defective release violates is accepted into `conformance/` only if it **fails** against that
release (`INVARIANTS.md`, preamble). For v0.1 the release is the shipped .NET packages at `1.0.0-beta.1` (2026-08-23), whose
defects are known. This file lists every fixture that must fail on it, the rule it checks, and the shipped defect it
refutes. The .NET conformance driver's first run produces the log that enforces this list; a listed fixture that *passes* on
beta.1 is either mis-authored or the defect is not what was recorded — it is investigated and this list or the fixture is
corrected before the `v0.1.0` tag. Fixtures not listed here MAY pass or fail on beta.1; the parity manifest records which.

| Shipped defect (as recorded in the framework's own issues and reviews) | Rule | Fixtures that must fail on beta.1 |
|---|---|---|
| The aggregate confidence is a mean over the non-`Empty` fields, so a mostly-empty Affidavit can report high confidence | AF-2 | `gate/update-previous-values`, `sequence-a/typed-inputs-on-the-card`, `sequence-a/mandatory-field-left-empty` |
| Every Affidavit is create-shaped: `EntityId` and every `PreviousValue` are hard-coded null | AF-3 | `gate/update-previous-values` |
| The time-to-live is stamped from one global default before the policy chain runs | GT-4 | `gate/ttl-from-verdict`, `gate/ttl-from-policy-default` |
| A `MultiParty` requirement is routed to the single-card branch — one approval satisfies a joint requirement | AZ-4 | `gate/multiparty-blocked` |
| Substance (a value with `Empty` provenance) is checked at test time only; the runtime files hollow Affidavits | GT-3 | `gate/substance-hollow-refused`, `gate/substance-zero-field-refused` |
| The default risk scorer never returns `Low` while the default threshold is `Low`, so a by-the-book Standing Order never fires (corrected in a later point release; present in beta.1) | GT-5 | `gate/standing-order-by-the-book` |
| Conversation-scope bleed: one process-global context store is shared by every conversation | GT-2 | `sequence-a/interleaved-conversations` |
| A re-file with the same id broadcasts a card with a freshly computed deadline | GT-4 | `sequence-a/replay-keeps-the-deadline` |
| Decision authorization is hand-rolled per host, tenant-blind, and permits the action when identity is unresolved | AZ-2 | `decide/unresolved-identity`, `decide/wrong-tenant` |
| The expiry sweep loads every pending entry, unpaged, on every instance | DK-3 | `sequence-a/sweep-pages` |
| No execution-outcome state: an approved-but-failed write is indistinguishable from an approved-and-committed one | DK-1 | `decide/execution-executed`, `decide/execution-failed` |
| A reviewer's amendment never recomputes the aggregate confidence | AF-4 | `decide/amend-recompute` |
| No attestation record on the row: nothing says who or what approved a write | AZ-1 | `decide/approve`, `gate/standing-order-by-the-book` |
| No `blocked` marker and no coverage refusal | AZ-4, CV-4 | `gate/coverage-refused-declared` |

The run log lives beside the parity manifest (`parity/dotnet-v0.1.json`) once the driver exists.
