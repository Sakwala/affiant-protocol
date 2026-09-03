# INVARIANTS — the rules every Affiant implementation enforces

**Status: skeleton** (opened 2026-09-04). Every rule below has a permanent id, a one-line statement, and a *status* mark.
Rules marked *skeleton* carry the decided clause as a one-liner and will be filled to their full, testable text once the
TypeScript core runs against them; rules marked *v0.1* are complete. The rulebook is written to describe working code, in
public, so a rule's text may sharpen but its id and its meaning do not move. The first complete version is tagged `v0.1.0`.

**What this file is for.** Affiant turns every database write an LLM agent proposes into an **Affidavit** — a per-field
evidence record (the value, the previous value, where each value came from, how confident) — filed in a **Docket** (the
durable store of pending review entries) and shown as an **Evidence Card** a person approves, amends or rejects before the
host writes. A **Standing Order** is a policy verdict that approves a write with no person present. There are two
implementations: .NET ([Sakwala/affiant](https://github.com/Sakwala/affiant), ten NuGet packages, shipped) and TypeScript
([Sakwala/affiant-ts](https://github.com/Sakwala/affiant-ts) — the repository is open before the code lands, and this file is
being written ahead of it on purpose). This file is what makes them the *same*
framework: each numbered rule is a statement both must satisfy, checked by the fixtures in `conformance/`, with a published
**parity manifest** per implementation naming exactly which fixtures it does not yet pass and why.

**How to read a rule.** `<AREA>-<n>` is the id (areas below). **MUST** / **MUST NOT** / **SHOULD** are RFC 2119 words.
*Fixtures:* names the fixture ids that check the rule (`wire/<name>` are the seed fixtures under `conformance/fixtures/wire/`;
conformance fixture ids arrive with v0.1). *Why:* one line where the reason is not obvious. *Source:* where the rule was
decided or where the shipped behaviour it corrects lives, for a reader who wants to check.

**The `wire/*` fixtures are captures of a shipped implementation, not conformance oracles.** They pin the shapes the seed
schemas describe; where a rule below *corrects* the shipped behaviour, the capture still shows the old behaviour
(`wire/evidence-card-request` reports `aggregateConfidence` 0.95, the mean, where AF-2 requires the minimum, 0.9). A `wire/`
citation means "this rule constrains this shape"; only a `conformance/` fixture id, from v0.1, means "this rule is checked
here". A fixture is accepted into `conformance/` only through the **negative oracle**: it must *fail* against a release known
to violate its rule before it is accepted — a fixture a broken implementation passes is not a test.

**Coverage lint (runs both ways, from v0.1):** a rule with zero fixtures fails the lint; a fixture citing a rule id that does not
exist fails the lint. Until v0.1 the lint is informational.

**Areas.** `AF` Affidavit shape · `PV` provenance and bindings · `GT` the gate pipeline · `DK` the Docket, states and expiry ·
`AZ` authorization, attestation and requirement levels · `SR` serialization and the wire · `RT` runtime neutrality and the
resource envelope · `CV` coverage, delegation and call sites · `TL` telemetry and standards vocabulary.

**Terms used below.** *Proposed field* — a field the operation proposes to write; *Empty* — the provenance source that says
"the value's origin is unknown"; *turn* — one user utterance and the model's response to it, the unit an inference reads;
*gate* — the in-process pipeline from a tool's proposal to a filed Docket entry; *executor* — the host code that performs the
write after approval (the framework never writes); *tenant* — the host's isolation boundary (an organisation, a household, an
account); *relay* — a trusted machine caller (for example an agent talking to the host over MCP) that asserts a person's
identity rather than authenticating them; *operation* — one create-or-update a tool proposes against one entity; *the
specification* — Affiant's .NET framework specification,
[`docs/affiant-framework-specification.md`](https://github.com/Sakwala/affiant/blob/main/docs/affiant-framework-specification.md);
*ComplianceHarness* — the shipped .NET test harness that fails an adopter's CI when a write strategy lacks tests asserting
provenance substance; *parity manifest* — the published, CI-asserted list of fixtures an implementation does not yet pass;
*the conformance release* — the .NET release (`beta.3`) that makes the shipped packages pass the v0.1 fixtures, emptying their
parity manifest.

---

## AF — Affidavit shape

### AF-1 — `fields[]` carries only the proposed fields; unknown provenance is `Empty`, not-proposed is absent *(skeleton)*
**MUST.** An applicable field whose provenance is unknown is present and tagged `Empty`; a field the operation does not propose
(untouched on an update, not applicable to the operation) is absent — never `Empty`-tagged.
*Why:* the specification's Rule 7 ("tag `Empty`, never omit") and its own worked example ("omit unset fields") disagreed; this
resolves it: omit the not-proposed, `Empty`-tag the unknown. *Fixtures:* `wire/evidence-card-request`;
`wire/evidence-card-request-resubmission`. *Source:* framework specification, Rule 7.

### AF-2 — Three confidence numbers; `aggregateConfidence` is the minimum over proposed fields with `Empty` = 0.0 *(skeleton)*
**MUST.** `aggregateConfidence` = min over every proposed field, `Empty` counting as 0.0 (so it is 0.0 iff a proposed field has
unknown provenance); `populatedConfidence` = min over the non-`Empty` proposed fields; `emptyFieldCount` = the number of
`Empty` proposed fields. A card shows all three. Neither the protocol nor a core package defines a threshold on any of them.
*Why:* a mean that first discards every `Empty` field lets a mostly-empty Affidavit report high confidence — the exact hole once
provenance authorises writes. The shipped .NET projection computes a mean over non-`Empty` fields; the parity manifest names
it until the conformance release. *Fixtures:* v0.1 (one partially-populated Affidavit so the three numbers differ).
*Source:* specification `AggregateConfidence // Minimum of all field confidences`; `SchemaDrivenAffidavitProjection` in
`Affiant.Core`.

### AF-3 — `entityId` non-null ⇔ update; updates carry `previousValue` *(skeleton)*
**MUST.** An update-shaped Affidavit names the entity it updates and carries a `previousValue` key on every proposed field,
holding the entity's stored value before the write, or `null` where the field had no stored value; a create-shaped Affidavit
has `entityId` null and `previousValue` null on every field. "Create-only" is therefore a predicate a policy can test.
*Why:* the shipped .NET projection hard-codes `EntityId` and every field's `previousValue` to null
(`SchemaDrivenAffidavitProjection.cs:129,142`), so every Affidavit it builds is create-shaped and the README's promise that a
field's `PreviousValue` shows "exactly what is changing" on an update cannot be met by the built-in projection; a host
supplies its own projection until a .NET release fixes it. *Fixtures:* `wire/evidence-card-request` (update shape: `entityId`
set, `Weight.previousValue` 10.0, `Status.previousValue` null); v0.1. *Source:* `SchemaDrivenAffidavitProjection` in `Affiant.Core`.

### AF-4 — An accepted amendment recomputes the three confidence numbers *(skeleton)*
**MUST.** When a reviewer's amendment is accepted, `aggregateConfidence`, `populatedConfidence` and `emptyFieldCount` are
recomputed over the amended fields; an amended field's provenance is the reviewer's act (see PV-2), never the machine's
pre-correction tag. *Why:* the shipped hosts return the amended Affidavit with the pre-correction machine confidence.
*Fixtures:* v0.1. *Source:* host executors in the demo applications.

### AF-5 — A tool's result is one discriminated union of three kinds *(skeleton)*
**MUST.** A tool's result on the wire is a discriminated union of three kinds — a read result, a write proposal, and a tool
error — carried on a single discriminator property (`$type` in the shipped .NET wire, spelled `kind` from v0.1 with the rename
recorded in the schema changelog). A consumer switches on the discriminator, never on the presence of fields. *Fixtures:* v0.1
(one payload per kind; no seed fixture carries a tool envelope). *Source:* `ToolEnvelope` in `Affiant.Abstractions`.

---

## PV — provenance and bindings

### PV-1 — The seven-source ladder, the chain, and the confidence-first / determinism-second merge *(skeleton)*
**MUST.** Sources, most to least deterministic: `UserStated`, `External`, `Computed`, `Conversation`, `Inferred`, `Default`,
`Empty`. A field's `ProvenanceChain` is the ordered history of its tags; on merge the winning tag is the higher confidence,
ties broken toward the more deterministic source, and the losing tag is preserved in the chain. *Fixtures:*
`wire/evidence-card-request` (chain shape); v0.1 (merge cases). *Source:* the specification's seven-source list and its merge
rule (`docs/affiant-framework-specification.md:57-60`, `:100`).

### PV-2 — A tag above `Conversation` SHOULD carry a binding; kinds are fixed *(skeleton)*
**SHOULD (v0.1), MUST (v0.2).** `binding: { kind, ref }` with `kind ∈ { utterance-span, reviewer-act, form-input,
external-ref, computation-ref }`: the span of the unmodified utterance (offset + hash); the Docket decision that amended the
field; the form field a person typed into; the source system and record an `External` value came from (a relayed capture binds
the channel identity, the relay's message id and the relay principal; a value read from a page with no API binds the canonical
URL, the fetch timestamp and a content hash); the deterministic rule and the field ids a `Computed` value consumed (where the computation
depends on an externally published constant, the binding also names that constant's own source and the date it was verified —
when a value was checked is a different fact from when the tag was written). A binding whose source cannot be re-fetched or
re-verified is not a binding. *Why:* "the person typed this" must point at something an auditor can check years later.
*Fixtures:* `wire/evidence-card-request` (tag shape today, no `binding` field); v0.1 (one fixture per binding kind, and one
unbound `External` tag).

### PV-3 — An implementation's own inference never mints `UserStated` *(skeleton)*
**MUST.** The inference step mints `Conversation` or `Inferred`; `UserStated` is an observation of the person's act (utterance
span, form input, reviewer amendment), never the host vouching for a value. *Fixtures:* v0.1.

### PV-4 — A verdict with no person present never depends on an unbound tag above `Conversation` *(skeleton)*
**MUST.** A policy declares the provenance sources it predicates on; before honouring a `StandingOrder` verdict the gate checks
that every declared source's tag carries a binding; a policy that predicates only on field values, host state, or tags at or
below `Conversation` is unaffected. Conformance fixtures assert on the policy's declared inputs, not on the Affidavit alone.
*Why:* in a host where provenance is an authorization input, a grade any caller can assert with no artifact must not key an
authorization. *Fixtures:* v0.1.

### PV-5 — No wire type raises a grade; a caller-asserted grade above `Conversation` without a binding is not honoured *(skeleton)*
**MUST NOT.** No field in the contract has the effect of promoting a provenance source — this is the schema-lint half of PV-4,
which governs the runtime half. *Fixtures:* v0.1 schema lint.

---

## GT — the gate pipeline

### GT-1 — Pipeline order is fixed *(skeleton)*
**MUST.** Explicit turn context passed in (GT-2) → deterministic interceptors → one tool-free structured inference against the
*unmodified* turn through a host-supplied inference port → merge (PV-1) → per-tool projection → runtime substance refusal (GT-3)
→ policy (the four requirement kinds, AZ-4; the risk function host-supplied, GT-5) → TTL stamped from the policy result (GT-4)
→ filed (DK-1). The inference port is host-supplied — a function from turn plus field schema to a structured result. A core
package ships no model client and no provider credential handling, so which model runs, and where, is a host configuration
change. *Fixtures:* v0.1 (a fixture per boundary).

### GT-2 — The conversation-scope contract: turn context is explicit and passed, never ambient *(v0.1 text, skeleton fixtures)*
**MUST.** Every gate entry point takes a turn-context object as a parameter — conversation id, tenant, channel, the principal
(if any), and the unmodified turn — supplied by the host or adapter at the call site. An implementation MUST NOT resolve any of
these from a process-global, thread-ambient or container-default source; two conversations interleaved in one process MUST
never observe each other's context, fabric, pending inference or proposals; an adapter that cannot obtain the context at its
seam MUST refuse (CV-2), never fall back to a shared default. What a host framework's own checkpoint may carry is CV-3. *Why:* in the
shipped .NET wiring the tool-invocation seam resolves its scoped context store from the application's root provider, so one
process-global instance is shared by every conversation: field provenance is overwritten across conversations, and where the
host supplies no conversation id the second and later conversations also skip write-tool inference silently. One class of bug
at the host-wiring level, designed out here rather than patched per adapter. *Fixtures:* v0.1 (two interleaved
conversations). *Source:* `Sakwala/affiant#41`; `AffiantDelegatingAIFunction.cs:217-237`; this is one of the two clauses the
.NET beta.2 release adopts as its design authority.

### GT-3 — Runtime substance refusal *(skeleton)*
**MUST.** A proposal with zero non-`Empty` proposed fields is refused at the gate — not filed, not counted, not broadcast — and
the refusal is observable (TL-1). A non-empty value with `Empty` provenance is *hollow* and is refused the same way.
*Why:* the founding incident (2026-04-30: 330/330 structural tests green while every Affidavit shipped empty) — the .NET
ComplianceHarness checks this at test time only; the runtime must too. *Fixtures:* v0.1 (the negative oracle's first entries).

### GT-4 — TTL is stamped from the policy result, after the policy chain *(skeleton)*
**MUST.** `expiresAt` is computed after the approval policy runs and may come from the policy's verdict; a single global
default TTL applied before policy is non-conformant. On an idempotent re-file (same `entryId`), the broadcast card carries the
*existing* entry's `expiresAt`, never a fresh one. *Fixtures:* v0.1. *Source:* `ReviewGate.FileForReviewCoreAsync`.

### GT-5 — The risk function and its thresholds are host-supplied; the core owns only the comparison *(skeleton)*
**MUST.** A core package ships no scoring formula and no floor. A Standing Order that declares no threshold fires on match; one
that declares a threshold requires a host-supplied scorer and fires iff `score <= threshold`; a declared threshold with no
scorer is a configuration error raised at wire-up (CV-1), never a silent non-fire. *Why:* the shipped .NET default scorer never
returns `Low` while the default threshold is `Low` (`src/Affiant.Policies/Services/RiskScoreCalculatorBase.cs:24-32`,
`src/Affiant.Policies/StandingOrders/StandingOrderBase.cs:27`), so a by-the-book Standing Order can never fire; the parity
manifest names it until a .NET release moves the risk function to the host. *Fixtures:* v0.1.

### GT-6 — Write tools can only produce proposals *(skeleton)*
**MUST.** The package's public types make the gated path the only way a proposal reaches an executor: a write tool's declared
return type is a proposal, and no public API lets a tool commit through the framework. A tool that opens its own connection
and writes inside its body is **outside the guarantee** — no wire-up check can see it (this is the honest boundary, stated as
such in the README, not a rule an implementation can enforce). *Fixtures:* v0.1 (type-level).

---

## DK — the Docket, states and expiry

### DK-1 — The review-outcome state machine *(v0.1 text, skeleton fixtures; referral transitions reserved)*
**MUST.** States: `pending` → one of `approved`, `rejected`, `expired`. `approved` carries an execution outcome:
`approved.unexecuted` (the row is approved, the executor has not reported) → `approved.executed` | `approved.failed` — an
approved-but-failed write MUST be distinguishable from an approved-and-committed one on the row. A `pending` entry may carry a
`blocked` marker (AZ-4) and remains `pending`. Every transition out of `pending` is a **guarded compare-and-set** keyed on
`entryId` and the expected current state: a second decision and a decision on a non-`pending` entry are refused with a stated
error code, never applied and never silently overwritten. A **file** with an `entryId` that already exists is an idempotent
replay, never a second entry and never an error: it returns the existing entry's state and, if still `pending`, re-broadcasts
that entry's card with its **existing** `expiresAt` (GT-4). **Expiry is a queryable state:** an entry past `expiresAt` reads as `expired` on query whether or not any sweep has run; the store exposes
`expireDue(now)` and the core owns no timer — the host schedules the sweep (DK-3). A decision arriving after `expiresAt` is
refused as `expired` and any amendments it carried are preserved on the row for resubmission. **Resubmission** creates a new
entry whose lineage names the entry it supersedes; the superseded entry keeps its terminal state and records its successor.
`deferred` and the referral outcome (an entry handed to another reviewer) are **reserved**. This clause is the design authority
the next .NET release adopts, not a description of it; the reservation exists because those transitions have not run anywhere
yet, and any fixture that names one is deleted back to *reserved* if the reference implementation's design diverges. The
shipped .NET gate writes `Deferred` on a `ReferralRequired` verdict today (`ReviewGate.cs:382`); the parity manifest carries
that until the transition is specified. On the wire the execution outcome is a separate property of the row (`status:
"approved"` with `execution: "unexecuted" | "executed" | "failed"`), written above as `approved.unexecuted` only for
readability; v0.1 fixes the encoding in the DocketEntry schema. *Why:* this is the one surface both implementations genuinely
share, so it is written first. *Fixtures:* `wire/docket-expiring`, `wire/docket-expired`; v0.1. *Source:* `ReviewStatus` and
`DocketEntry` in `Affiant.Abstractions`; the host vocabulary `approved | rejected | expired | resubmitted` in
`wire/action-decision-result` (a host payload, kept for reference).

### DK-2 — Amendments: `null` clears, absent leaves untouched *(skeleton)*
**MUST.** In an amendment map, `null` means "cleared" and an absent key means "untouched"; an implementation never conflates
them. *Fixtures:* `wire/evidence-card-request-resubmission` (`priorAmendments`); v0.1.

### DK-3 — The expiry sweep is bounded, paged and host-scheduled *(skeleton)*
**MUST.** `expireDue(now)` processes a bounded page per call and reports whether more remain; it is scoped to what the host asks
for (a tenant, a session) and never loads the whole Docket into memory; no implementation runs an unbounded periodic sweep of
its own. *Why:* the shipped .NET sweep runs every 30 s over every pending entry, unpaged, on every instance. *Fixtures:* v0.1.

### DK-4 — Retention, purge and export are hooks the host implements; the Docket is read-forward *(skeleton)*
**MUST.** The store interface exposes retention (age-out), purge (a tenant's data on demand) and export (the portable document
shape is reserved for v0.2 — see *Reserved*) operations the host implements; a decision, once recorded, is never edited in place — later facts are appended (execution
outcome, supersession), so a row reads forward. No field of an Affidavit is redacted by the framework; a host that must redact
does so before filing and the tag records it. *Fixtures:* v0.1 (store-semantics fixtures).

### DK-5 — Rehydration order is fixed *(skeleton)*
**MUST.** A session store rehydrates `pending` entries, then `approved.unexecuted` entries, in that order, so a reconnecting
client sees what still needs a decision before what still needs execution. *Fixtures:* v0.1 (`wire/session-rehydrated` is a
host payload carrying only a count; it cannot check the order).

---

## AZ — authorization, attestation and requirement levels

### AZ-1 — Every executed write carries an attestation record; no attribution, no execution *(skeleton)*
**MUST.** `attestation: { by, at, entryId }` with `by ∈ { { kind: "member", id }, { kind: "member-via-relay", memberId,
relay: { principal, channelIdentity, messageId } }, { kind: "standing-order", policyId, version } }`. The *mode* is the `kind`
of `by`; there is no separate mode field to drift from it. An implementation that cannot attribute a write refuses it. Writes a
host makes outside the gate (imports, migrations) carry a distinct `outsideGate: { reason, recordedBy, at }` that no export may
render in an attestation position. *Fixtures:* v0.1. *Source:* the .NET `DocketEntry` gains the record in the conformance
release; until then the parity manifest names it.

### AZ-2 — Tenant-scoped, fail-closed decision authorization with the approver's identity on the record *(skeleton)*
**MUST.** Who may decide an entry is checked by the framework, scoped to the entry's tenant, before any transition in DK-1: an
unresolved identity, a mismatched tenant, or a principal the host's authorization callback does not admit refuses the decision
— fail closed, never "identity unknown, allow". The deciding principal is written into the attestation (AZ-1). Identity is
*supplied* to a policy so it can bind (member-bound Standing Orders); *authorizing the actor* is this rule, enforced by the
framework, not delegated to a policy. *Why:* an ownership check hand-rolled per host tends to check the acting user and not the tenant, and to fall open when
identity is unresolved; a rule the framework enforces is the only version of this check that every host gets. *Fixtures:* v0.1.

### AZ-3 — What identity may attest what *(skeleton)*
**MUST.** A human-verified session may attest `member`. A machine caller (a service token, a relay) may **never** attest
`member`: a decision a person makes through a relay attests `member-via-relay`, naming the person and the relay; a capture a
relay auto-approves attests `standing-order` with the person carried in the policy's binding (PV-2). Which entries may be
decided through a relay is host policy. *Fixtures:* v0.1.

### AZ-4 — Requirement levels fail closed on authorization, not on evidence; the `blocked` marker and its codes *(skeleton)*
**MUST.** Requirement kinds: `StandingOrder`, `ReviewerConfirmation`, `ReferralRequired`, `MultiParty`. An implementation that
receives a requirement level it does not implement files the entry as `pending` with the requirement recorded verbatim and
`blocked: { code, … }`, refuses every decision on it, never executes it, and never degrades to a weaker requirement. Codes:
`requirement-not-implemented` (with `level`), and `coverage-refused` (with the tool name and the uncovered category, CV-4) —
**the second code's name is provisional until the ErrorCode registry is authored with the v0.1 schemas.** `MultiParty`
semantics are protocol v0.2; until then a host composes multi-party approval *above* the gate: one entry per approver, the
executor bound to the composite (`compositeRef` on each constituent entry), and no constituent's approval alone reaches the
executor. *Why:* the shipped .NET gate routes `MultiParty` to the single-card branch — a joint requirement silently gets one
approval. *Fixtures:* v0.1 (the negative oracle names this). *Source:* `ReviewGate` in `Affiant.Core`.

### AZ-5 — The Docket is the sole record of approval authority *(skeleton)*
**MUST.** An executor is reachable only through a Docket entry that carries an attestation (AZ-1); nothing replayed from a
client's history, a chat transcript or a framework checkpoint can stand in for that entry. A host's outbox is a retry of an
already-attested write, never a second authorization path. AZ-1 governs what the record must contain; this rule governs that
there is no other path to the executor. *Fixtures:* v0.1.

### AZ-6 — A degraded implementation never weakens an authorization rule *(skeleton)*
**MUST.** In degraded mode (no model, no transport) an implementation may limit the host to deterministic operations; it MUST
NOT relax AZ-1…AZ-5 or PV-4, and a queued inference resumes as a *new* proposal against the original, unmodified turn.
*Fixtures:* v0.1.

### AZ-7 — The framework never performs the write *(skeleton)*
**MUST NOT.** No package in an implementation writes to a host's store. The executor is a host-implemented interface the
framework calls with an attested Docket entry (AZ-1, AZ-5) and nothing else; an implementation that ships a default executor
that writes is non-conformant. *Fixtures:* v0.1 (a lint over the published surface).

---

## SR — serialization and the wire

### SR-1 — Canonical serialization is defined over the Affidavit and its accepted amendments *(v0.1 text, skeleton fixtures)*
**MUST.** The canonical form of a filed proposal is a deterministic byte sequence over the Affidavit **⊕ its accepted
amendments** (the amended field values with their reviewer-act tags, in the same field order), with: UTF-8; object keys sorted
by Unicode code point; no insignificant whitespace; numbers as their shortest round-trip decimal representation (SR-2 governs
money, which is a string); `null` written, absent omitted (AF-1, DK-2). `canonicalHash` is the SHA-256 of that form. Every
canonicalise-and-hash path is asynchronous in the contract (RT-1). *Why:* conformance fixtures compare canonical forms; an
utterance-span binding hashes; and a host's execution grant binds to `canonicalHash(Affidavit ⊕ amendments)` — a form over the
Affidavit alone would let an amended proposal execute against a grant minted for the unamended one. *Fixtures:* v0.1 (byte
vectors per fixture).

### SR-2 — Money on the wire is a decimal string plus an ISO 4217 currency code *(v0.1 text, skeleton fixtures)*
**MUST.** A monetary field value is `{ amount: "<decimal string>", currency: "<ISO 4217>" }` — the amount as a decimal string
with no exponent, no thousands separators, at most the currency's minor-unit scale unless the host declares otherwise; never a
binary float. This is a wire rule only: a host stores what it likes (integer minor units, for instance) and the store persists
the wire value without reinterpreting it. *Fixtures:* v0.1.

### SR-3 — JSON conventions *(skeleton)*
**MUST.** camelCase property names; enums as strings; explicit `null` for a null value; unknown properties rejected by the v0.1
schemas on core objects (`additionalProperties: false`). Enum values are written exactly as the schema's `enum` list spells
them; the seed carries both conventions and v0.1 freezes each set as it stands — provenance sources PascalCase
(`enum/provenanceSource`), review states and outcomes lowercase (`enum/actionDecisionResultOutcome`); no implementation
case-folds an enum value on the wire. *Fixtures:* every `wire/*` seed fixture; `conformance/lint`.
*Source:* the shipped .NET transport (`JsonHubProtocol` defaults + `JsonStringEnumConverter`).

### SR-4 — Every envelope carries `protocolVersion`; an implementation states the version it targets *(skeleton)*
**MUST (from v0.1).** Every envelope carries the protocol version string it conforms to. The seed fixtures predate the field
and carry it only at fixture-set level (`conformance/fixtures/MANIFEST.json` → `0.0.1-seed`); from `0.1.0` it is on the
envelope. An implementation's parity manifest names the tag it pins. *Fixtures:* v0.1 schemas.

### SR-5 — The transport is not the protocol *(skeleton)*
**MUST NOT.** No rule here depends on SignalR, SSE, REST or MCP framing; hub event names and invoke names are host-owned. The
four seed fixtures the manifest marks `schemaRelevant: false` — `wire/action-decision-result`, `wire/session-rehydrated`,
`wire/guide-ui`, `wire/system-notification` — are host and transport/UI shapes kept for reference, not protocol core.
*Fixtures:* none by construction — the negative case is the set of host-shaped seed fixtures, which no protocol rule cites as
a check; the coverage lint exempts this rule by name.

---

## RT — runtime neutrality and the resource envelope

### RT-1 — Core and contract packages are runtime-neutral: Node, Cloudflare workerd, Bun *(skeleton)*
**MUST.** `@affiant/core` and `@affiant/contract` use no Node-only API, no filesystem, and Web Crypto only — which has no
synchronous digest, so every hash path and the driver contract are asynchronous end to end (a stated portability choice; the
.NET core may stay synchronous because fixtures assert values, not call shapes). CI runs the suite on all three runtimes from the
first commit. A store or adapter package may use runtime-specific APIs if it declares the runtimes it supports and passes the
store-semantics fixtures on each. *Fixtures:* the conformance driver's three-runtime matrix.

### RT-2 — The serverless-isolate resource envelope *(skeleton)*
**MUST, for an implementation that claims a serverless-isolate runtime** (RT-1). A per-request gate path fits an isolate with
no persistent process, no filesystem between requests and no raw inbound TCP: no process-lifetime cache the core cannot
rebuild from the store; every bulk operation paged or streamed (DK-3); each per-request path inside a CPU and memory budget a
fixture asserts (the reference target is the Cloudflare Workers ceiling — 30 s CPU per request, 128 MB — with the exact budget
set in v0.1). An implementation that claims no such runtime states so in its parity manifest. *Fixtures:* v0.1 (a budget fixture).

### RT-3 — No Affidavit, Docket entry or attestation record lives in Durable Object storage *(skeleton)*
**MUST NOT.** Durable Object state is working state (an alarm, a cursor, an `entryId`); the audit record lives in the
production store (`@affiant/store-postgres` or a host store passing DK fixtures). A host adopting an agents SDK whose default
state store is DO-embedded must route the record elsewhere. *Fixtures:* v0.1 (a lint over the reference store and adapters).

---

## CV — coverage, delegation and call sites

### CV-1 — Hard-fail at wire-up; there is no disable switch *(skeleton)*
**MUST.** A misconfiguration the framework can detect (a tool it must gate but cannot intercept, a threshold without a scorer,
a missing executor or store, an unresolvable turn-context seam) fails at wire-up with a stated error; no option turns the gate
off for a tool it covers. *Fixtures:* v0.1.

### CV-2 — The fail-closed call-site rule *(skeleton)*
**MUST.** A new seam (a queue consumer, a cron trigger, an alarm, a second call site in a host) never reuses an ambient-context
filter; it calls the gate directly with an explicit turn context (GT-2) and throws when the gate is unreachable. A filter that
silently returns the raw proposal as the tool result when the gate is absent is non-conformant. *Why:* the shipped .NET filter
returns at debug-log level in three branches, leaving the model free to report an unfiled write as done. *Fixtures:* v0.1.

### CV-3 — The delegation clause: what a host framework may own *(skeleton)*
**MAY / MUST NOT.** An implementation may delegate turn durability and transport rendezvous to a host framework; it never
delegates entry identity, the guarded compare-and-set (DK-1), expiry-as-queryable-state, or resubmission lineage. A framework
checkpoint may carry an `entryId` and nothing else; the Docket row is the source of truth. *Fixtures:* v0.1.

### CV-4 — Coverage refusal *(skeleton)*
**MUST.** An adapter binds where the runtime lets it intercept (for the Vercel AI SDK: the tool object's `execute`, where one
exists) and *declares* the categories it cannot cover — tools with no `execute`, provider-executed tools, hosted-MCP
server-side writes. Any write-capable tool in an uncovered category is refused at wire-up (CV-1) or, where wire-up cannot see it,
marked `blocked` with code `coverage-refused` (AZ-4) on the Docket; it is never silently allowed to write. *Why:* the honest
boundary as a mechanism, not a paragraph. *Fixtures:* v0.1 (adapter fixtures: wrapped tool → proposal, never a write).

### CV-5 — No durability claim rests on a non-`latest` dist-tag of a third-party runtime *(skeleton)*
**MUST NOT.** An adapter may surface a pending entry through a runtime's approval mechanism, but any claim that a pause survives
a process restart rests only on runtime features published under the `latest` dist-tag with the provider pinned at build time;
otherwise the Docket row alone is the durable state. *Fixtures:* adapter documentation lint (v0.1).

---

## TL — telemetry and standards vocabulary

### TL-1 — The telemetry-key registry is a versioned API *(skeleton)*
**MUST.** Every event and attribute the gate emits is named in a registry under `schemas/` with a version; a key is never
renamed, only deprecated. Substance refusal (GT-3), coverage refusal (CV-4) and every DK-1 transition are observable events.
*Fixtures:* v0.1 registry lint.

### TL-2 — The standards-vocabulary layer *(skeleton)*
**SHOULD.** Where a public standard names the same thing, the registry uses its name: MCP (2026-07-28 revision) tool
annotations for a tool's write capability; the 2026-07-28 revision's in-band `resultType: input_required` on `tools/call` (and MCP Tasks, where an implementation
surfaces a pending entry as a task) for a pending entry surfaced over MCP; OpenTelemetry
`gen_ai.*` and `mcp.*` semantic-convention attributes for telemetry; W3C PROV-O terms for the export document (v0.2).
*Fixtures:* v0.1 registry lint.

---

## Reserved for v0.2 and later

- **Attestation export** — the portable document shape (a file an adopter hands to an auditor), PROV-O aligned (v0.2).
- **`MultiParty` and multi-step review semantics** — taken from a running host, not a whiteboard (v0.2).
- **Declarative policy schema** (v0.3).

## Changelog

- 2026-09-04 — skeleton opened: every decided clause as a one-liner with a permanent id; GT-2, DK-1, SR-1, SR-2 written in full.
