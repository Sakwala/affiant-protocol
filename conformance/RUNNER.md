# RUNNER — the declarative fixture format

**What this file is.** The complete description of the documents in `fixtures/gate/`, `fixtures/decide/`,
`fixtures/sequence-a/` and `fixtures/sequence-c/` — 56 JSON files, each one a wiring, a sequence of acts and what must
then be true — and of the seven byte vectors in `fixtures/canonical/`. It is written so that somebody implementing Affiant
in a language nobody has used yet can read this file, write a **driver** (`DRIVER.md`) that binds these documents to their
own code, and publish a **parity manifest** (`PARITY.md`) saying which of them they pass. Nothing here assumes you have
read the reference implementation.

**Where the format came from.** It is the reference runner's, written out from
[`Sakwala/affiant-ts`](https://github.com/Sakwala/affiant-ts) `packages/core/src/testing.ts` (published as
`@affiant/core/testing`) at commit `c4591ea` — the commit `fixtures/PROMOTED_FROM` names. The fixtures were promoted here
byte-identical. The machine-readable form of this document is `fixture.schema.json`, which carries the same allowed key
sets; the fixture lint validates every promoted fixture against it.

**Terms.** *Affidavit* — the per-field evidence record (the value, the previous value, where each value came from, how
confident) an agent's proposed write is turned into. *Docket* — the durable store of pending review entries; a *Docket
entry* or *row* is one of them. *Evidence Card* — the envelope that carries an Affidavit to a person, who approves,
amends or rejects it. *Standing Order* — a policy verdict that approves a write with no person present. *Gate* — the
in-process pipeline from a tool's proposal to a filed Docket entry. *Rule ids* (`AF-1`, `GT-4`, `AZ-2` …) are the numbered
invariants in [`../INVARIANTS.md`](../INVARIANTS.md); every rule cited below is defined there in full.

---

## 1. The document

```jsonc
{
  "id": "gate/standing-order-by-the-book",
  "rules": ["GT-5", "AZ-1"],
  "title": "A Standing Order with no threshold fires on the verdict alone",
  "given": {
    "clock": "2026-09-04T09:00:00.000Z",
    "store": "memory",
    "gate": { "defaultTtlMs": 1800000, "authorization": { "allow": ["*"] } },
    "ctx": { "tenantId": "tenant-a", "conversationId": "conv-1", "channel": "chat" },
    "prior": [],
    "step": { "kind": "file", "toolName": "capture", "operation": { "…": "…" } }
  },
  "expect": { "entry": { "status": "approved" } }
}
```

| Key | Required | What it is |
|---|---|---|
| `id` | yes | A stable id, unique across the set, prefixed by the directory it lives in. **Never renamed** — a parity manifest cites it by name, so a rename silently changes what a published document refers to. |
| `rules` | yes | The rulebook ids this fixture checks. At least one. The coverage lint checks both directions: every rule must be cited by a fixture, and every id a fixture names must exist. |
| `title` | yes | What the fixture asserts, in a sentence somebody can read without opening the JSON. It is the test name in every runner. |
| `given` | yes | The wiring, the acts, and the turn they happen in. |
| `expect` | yes | What must be true afterwards. |

Unknown keys are a failure, at every level — see §6.

## 2. `given`

| Key | Required | What it is |
|---|---|---|
| `gate` | yes | Everything the gate is built from. §2.1. |
| `clock` | yes | The ISO 8601 instant the clock starts at. Every step may move it forward with `at`. |
| `ctx` | yes | The turn every step runs in. §2.2. |
| `step` | yes | The act under test. §3. `expect.error` is about this one. |
| `prior` | no | The acts that set the scene, in order, each of the same shape as `step`. A prior step may declare the refusal it is expected to produce (`"refusal": "decision-expired"`), so the reader sees the refusal beside the act that caused it. |
| `store` | no | Which reference store to file into. `"memory"` is the only value at v0.1. |

### 2.1 `given.gate`

| Key | Required | What it is |
|---|---|---|
| `defaultTtlMs` | yes | The review deadline, in milliseconds, applied when neither the verdict nor the policy names one (GT-4). A whole number, one or more. |
| `authorization` | yes | Who may decide (AZ-2): `{ "allow": ["<principal id>", …] }`, where `"*"` admits everyone, plus optional `"throws": true` — a port that falls over instead of answering, which the gate must read as a **refusal** and never as an approval. |
| `policies` | no | The approval chain, **in order** (AZ-4). Each entry: `id` (the host's id, written into a Standing Order attestation), `version`, `declaredInputs` (the provenance sources it predicates on — PV-4), `declaresThreshold` (whether any verdict it can return names a risk ceiling — GT-5, CV-1), `defaultTtlMs` (its own deadline — GT-4), and `verdict`: `{ requirement, ttlMs?, threshold?, reason? }` or `null` for "no opinion". `requirement` is one of `StandingOrder`, `ReviewerConfirmation`, `ReferralRequired`, `MultiParty`. |
| `riskScorer` | no | What the host's risk function returns — a single number for every call — or `null` for **no scorer wired** (GT-5). The distinction matters: a policy that declares a threshold with no scorer wired is a wire-up refusal, not a silent non-fire. |
| `interceptors` | no | Deterministic resolvers (PV-2, GT-1 step 2): `{ name, fields: { <field>: { value, source: "External" \| "Computed", confidence, binding, evidence? } } }`. A binding is `{ kind: "external-ref" \| "computation-ref", ref }` — the two kinds a machine may mint. A machine never binds a value to a person's act (PV-3). |
| `inference` | no | What the host's inference reports, keyed by field name (GT-1 step 3): `{ value, confidence, presence: "literal" \| "inferred", utteranceSpan? }`. **Scripted, never computed** — the gate's contract is that it asks the host for values and tags whatever it gets, so a fixture that also decided *how* the values were found would be testing a model the framework does not ship. `null` or absent means the port reports nothing. |
| `entities` | no | What the host's entities hold **now**, keyed `"<entityType>/<entityId>"` (AF-3). The projection port reads this table, so a fixture states the world rather than the answer: an update names an entity, and the previous values are whatever the table says it holds. An entity not in the table **does not exist**, and the port answers "nothing to project" — which is not the same as "every field was empty". |
| `uncovered` | no | Tools the host declared it cannot intercept (CV-4): `{ tool, category: "no-execute" \| "provider-executed" \| "hosted-mcp" }`. |
| `sessions` | no | Whether a rehydration surface is wired (DK-5). Defaults to `true`. |

### 2.2 `given.ctx`

The turn every step runs in — explicit in every property, **never ambient** (GT-2). `tenantId`, `conversationId` and
`channel` are required; `utterance` and `messageId` are the turn's own content; `principal` is who is acting, or `null`
for an **unresolved** identity, which is not the same as anonymous (AZ-2).

A principal is either `{ "kind": "member", "id": … }` — a human-verified session — or `{ "kind": "service", "id": …,
"relay"?: { channelIdentity, messageId }, "assertedMember"?: … }` — a machine caller, which may *assert* a person's
identity without authenticating them. An assertion never upgrades a `service` to a `member` (AZ-3).

## 3. `given.step` and `given.prior[]` — the eight step kinds

The gate's whole surface is reachable from these eight, so a fixture about a decision and a fixture about a filing differ
in their **steps**, not in their format.

Every step may carry: `kind` (required), `as` (a label later steps and expectations name this step's entry by), `at`
(moves the clock before the step runs), `principal` (overrides the fixture's for this step; `null` is unresolved),
`tenantId` (the tenant this step is performed from, when it is not the fixture's — AZ-2), `conversationId` (likewise,
GT-2), `entry` (the entry this step acts on: a label from an earlier `as`, or, absent, **the last entry filed**), and
`refusal` (the refusal code this step is expected to produce, or `null` for none).

| `kind` | Own keys | What it does |
|---|---|---|
| `wrap-execute` | `tool`, `args` | A model calls a wrapped tool — Sequence A's way in (GT-6, CV-4). The fixture describes the tool; the driver supplies an `execute` that **fails if the gate ever calls it**, which makes GT-6 a tripwire on every such fixture. `args` is the field-name → value map the model passed. |
| `file` | `toolName`, `operation`, `schema?`, `preparedFields?`, `args?`, `operationLabel?` | The host files a proposal it assembled — Sequence C's way in (GT-1). |
| `decide` | `decision` | Approve, amend or reject (DK-1, AZ-1, AZ-2). `decision` is `{ kind: "approve" \| "reject", amendments?, reason? }`. |
| `resubmit` | — | File an expired entry again (DK-1). A resubmission is a **new** entry, never a reopened one. |
| `markExecuted` | `outcome`, `detail?` | The host's executor reports what it did (DK-1, AZ-5, AZ-7): `outcome` is `"executed"` or `"failed"`. The framework never performs the write. |
| `expireDue` | `limit`, `scope?` | The host-scheduled sweep (DK-3). Bounded and paged: `limit` is how many the sweep may take. |
| `get` | — | Read the entry as it stands, with the deadline applied (DK-1). |
| `rehydrate` | `page`, `scope?` | One page of what a reconnecting client needs (DK-5). `page` is `{ limit, cursor? }`. |

`tool` (on `wrap-execute`) is `{ name, description?, entityType, entityId?, writeCapable?, executedBy?: "host" |
"provider", hostedMcp?, omitExecute?, operationLabel?, fields }`, where `entityId` `null` (or absent) means a
create-shaped tool, `omitExecute` means the tool carries no `execute` at all — the `no-execute` coverage category — and
each entry of `fields` is `{ name, kind: "text" | "number" | "date" | "enum", description?, required?, allowedValues?,
pattern? }`.

`operation` (on `file`) is one create-or-update against one entity: `{ kind: "create", entityType, entityId: null, fields:
[…] }` or `{ kind: "update", entityType, entityId: "…", fields: […] }`. It is a discriminated union rather than a
nullable id because the create branch is exactly what turns into `previousValue: null` on every field (AF-3).

`preparedFields` (on `file`) are fields the host has already tagged, for a capture whose provenance is settled: `{ name,
kind, value, isMandatory?, provenance?: { source, confidence, binding?, note? } | null }`. Provenance **absent** means
"proposed, provenance unknown", which is a real state (AF-1) and not the same as `null`.

`scope` (on `expireDue` and `rehydrate`) is `{ tenantId?, conversationId? }`, defaulting to the step's own turn.

## 4. `expect`

Every clause is optional and **every matcher is partial**: a fixture states the facts its rule is about and says nothing
about the rest, so an unrelated addition to a Docket row does not break thirty documents.

| Clause | What it matches |
|---|---|
| `error` | The refusal the step under test must produce: `{ code, messageContains? }`, or `null`/absent for none. |
| `entry` | The row the step acted on, or the row it filed. §4.1. |
| `superseded` | The row a `resubmit` superseded — the same matcher as `entry`. |
| `card` | The Evidence Card a filing produced. §4.2. |
| `telemetry` | Telemetry keys that must have been emitted at some point (TL-1). |
| `telemetryAbsent` | Telemetry keys that must **never** have been emitted. |
| `store` | What the Docket holds afterwards: `{ count?, pending?, approvedUnexecuted? }`. |
| `expired` | What an `expireDue` step reported: `{ count?, more? }` (DK-3). |
| `page` | What a `rehydrate` step returned: `{ count?, more?, statuses? }` (DK-5). |
| `found` | Whether the row a `get` step read was found. |
| `canonicalHash` | The row's canonical hash as 64 lowercase hex characters (SR-1). §4.3. |

### 4.1 `expect.entry` (and `expect.superseded`)

`status` (`pending` \| `approved` \| `rejected` \| `expired`), `execution` (`unexecuted` \| `executed` \| `failed` \|
`null`), `executionDetail`, `requirement`, `blocked`, `toolName`, `channel`, `tenantId`, `conversationId`,
`attestation`, `decision`, `amendments`, `preservedAmendments`, `lineage`, `expiresAtOffsetMs`, `affidavit`,
`amendedAffidavit`, `canonicalDiffersFromProposal`.

Five of those are not plain property reads and a driver must implement them as described or the fixture means something
else:

- **`status` is the status the row *reads*, not the one it stores.** A row past its deadline reads `expired` whether or
  not a sweep has run, and every fixture about expiry is about the read (DK-1).
- **`attestation` is the attestation record's *attestor*** — `{ kind: "member", id }`, `{ kind: "member-via-relay",
  memberId, relay }` or `{ kind: "standing-order", policyId, version }` — not the whole record, or `null` for none.
  Whenever a fixture states a non-null attestation, the runner **also** checks that the attestation names the entry it
  attests to: a record that cannot name its own subject is not evidence (AZ-1).
- **`decision` is `{ kind, reason }` only**, or `null`. The attestation says who may be held to this; the decision says
  what they chose and why. A Standing Order produces an attestation and no decision record.
- **`expiresAtOffsetMs` is an offset**, in milliseconds, from the instant the entry was filed — a fixture cannot state an
  absolute deadline it did not compute (GT-4).
- **`lineage`** is `{ supersedes?, supersededBy? }`, where the sentinel **`"@some"`** asserts only that the link is
  present. An entry id is derived from the proposal, so a fixture cannot state one; what the rule is about is that a
  resubmission names what it replaces and the replaced row names it back (DK-1).
- **`canonicalDiffersFromProposal`** is derived: whether the row's canonical form differs from its proposal's. `true` is
  the substitution guard — a grant minted over the Affidavit a reviewer was shown must not validate the one they amended
  (SR-1).

`affidavit` and `amendedAffidavit` take a partial Affidavit matcher: `operationType` (`create` \| `update`),
`entityType`, `entityId`, `aggregateConfidence`, `populatedConfidence`, `emptyFieldCount`, and `fields`. **Stating
`fields` asserts the field list exactly, in order** (AF-1) — that is the whole point of the clause. Each field entry is
`{ name, value?, previousValue?, kind?, isMandatory?, source?, bound?, bindingKind?, confidence?, priorSources? }`, where
`source`, `bound`, `bindingKind`, `confidence` and `priorSources` are projections of the field's provenance chain:
`source` and `confidence` are the tag **in force**, `bound` is whether that tag points at something checkable (PV-2,
PV-4), `bindingKind` is which kind it points with, and `priorSources` is the grades the chain displaced, **newest
first** — nothing is ever dropped from a chain.

`amendedAffidavit: null` is itself a statement: "no amendment has been accepted" (AF-4).

### 4.2 `expect.card`

`requiresConfirmation`, `warningsContain`, `priorAmendments`, `blocked`, `protocolVersion`, `aggregateConfidence`,
`populatedConfidence`, `emptyFieldCount`, `fields`, `presentation`. `warningsContain` is a list of **substrings** each of
which must appear somewhere in the card's warnings. `fields` matches the reviewer-facing shape of each **sworn** field,
in order: `{ name, kind?, value?, isMandatory? }`.

`presentation` matches the card envelope's rendering hints: `{ name, kind?, allowedValues?, pattern? }` per entry, in
the order the card carries them. A closed value set and an input mask are **presentation, not substance** — the gate
carries them and validates nothing against either, and neither is part of the canonical form, which is defined over the
Affidavit and its accepted amendments alone (SR-1). That is why they are on the envelope and not on the field, and why a
fixture states them here. A fixture that states `presentation` states the **whole** array and not a subset: a card
carrying a hint nobody asked for renders a control a reviewer did not expect, and a matcher that ignored the extra
entries could not say so. A field the host declared no hint for gets **no entry at all** — absence is how the wire
spells "render this field from its own kind" — so a card with no hints anywhere omits the property and a fixture
asserting that states `"presentation": []`.

**Some card facts are checked on every filing, stated or not**, because they hold for every card the gate ever produces
and repeating them in fifty files would stop each file being about its own rule:

- the card points at the row it was built from, and carries that row's own deadline and protocol version (SR-4, GT-4);
- the card's three confidence numbers are the **record's** — the state an approval accepted where there is one, the
  proposal otherwise. A card whose numbers were recomputed for display could disagree with the row (AF-2, SR-1);
- a blocked row says so on the card, and a blocked card never asks for a confirmation no decision path will accept
  (AZ-4, CV-4).

A driver must perform these three on every filing. A driver that only checked what a fixture states would pass a card
that disagreed with its own row on every one of the 56.

### 4.3 `expect.canonicalHash`

The exact value a host's execution grant binds to: the Affidavit **combined with its accepted amendments**, never the
proposal alone once an amendment has been accepted, taken through the **implementation's own exported canonical-hash
helper** rather than re-derived by the driver. An oracle that re-derived the binding could not catch an implementation
whose exported helper disagreed with it, which is precisely the substitution SR-1 exists to prevent.

## 5. Matcher semantics

1. **Partial object match.** A key a matcher does not state is not checked. A key it states is compared for structural
   equality — arrays by length then element-wise, objects by key set then value-wise, scalars by identity.
2. **`null` is a fact; absent is not.** `"amendedAffidavit": null` asserts that no amendment has been accepted;
   omitting the key asserts nothing. The same holds for `blocked`, `attestation`, `decision`, `amendments`,
   `priorAmendments` and `execution`. A driver that treats a stated `null` as "unset" turns a fixture that pins a rule
   into a fixture that passes on anything.
3. **`expect.error.code` is compared as a string, exactly.** A refusal carries a code and a human-readable reason; the
   code is what the fixture pins, and `messageContains`, when stated, must appear **as a substring** of the reason.
   `expect.error` absent or `null` asserts that the step under test produced **no** refusal — a positive statement, not
   a lack of one.
4. **A refusal declared on a step is compared wherever it is declared.** A `prior` step's `refusal` is compared after
   that step runs; so is one on the step under test. The step under test may instead leave `refusal` off and state its
   refusal in `expect.error`, which is where the format asks for it. It may not state both differently.
5. **A step with no `entry` acts on the last entry filed.** A step naming `entry: "label"` acts on whatever step carried
   `as: "label"`.
6. **The clock only moves when a step moves it.** `at` sets it; nothing else advances it. Every fixture is deterministic
   on a fixed clock.
7. **`"@some"`** in a lineage link asserts the link is present, nothing more (§4.1).

## 6. Strictness — what makes a fixture a test

The runner checks the **document** before it runs it, and a fixture that fails that check is **not run at all**: running
it would report a pass, and a pass is the one answer it must never give.

- **An unknown key anywhere fails the fixture, naming its path.** `statuz` for `status`, `valu` for `value` — a key the
  format does not define is a key the checker never reads, so the fixture asserts nothing about that fact and every
  implementation passes it, including one that does nothing. `fixture.schema.json` carries the same closed key sets;
  adding a clause to the format means adding it in both places in the same change.
- **An `expect` that states no fact fails as vacuous.** `{}`, `{ "entry": {} }` and `{ "telemetryAbsent": [] }` are the
  three shapes this catches. The count is of **leaf facts stated**, not of comparisons performed — a run also performs
  the card invariants of §4.2, and a vacuous fixture with a filing step would otherwise clear that bar without stating
  a thing.
- **A telemetry clause may only name keys the registry knows** (TL-1). An unregistered key fails the fixture.
- **A refusal on the final step is compared**, not skipped. Skipping it once let a fixture claim its own act was refused
  and pass when it was not.
- **A wiring the gate refuses is itself a fixture** (CV-1): the refusal is reported through `expect.error` exactly as a
  step's refusal is, and nothing after it runs, because there is no gate to run it on. On that path only `error`,
  `telemetry`, `telemetryAbsent` and `store` are answerable; a fixture that states `entry`, `card` or `page` on a
  wiring-refused run **fails**, because nothing was filed and a clause nobody can answer is a clause nobody checks.
- **The runner never throws for a failed expectation.** It returns every failure it found, each with the path and the
  two values. A runner that stopped at the first mismatch could tell you a fixture failed; it could not produce the list
  of everything an implementation does not pass, which is the document a parity manifest is derived from. It *does*
  propagate a programming error in the fixture or a port — those are not behaviours a rule is about, and swallowing them
  would hide a broken document behind a red test.

## 7. The four ports a fixture assumes

A fixture never names a class, a file or a language. It states what four abstract collaborators must answer, and a driver
supplies its own (`DRIVER.md` §2):

| Port | What the fixture states | What it must do |
|---|---|---|
| **Inference** | `given.gate.inference` | Report exactly the scripted fields, for every turn, unchanged. It never invents, filters or re-scores. Absent or `null` → it reports nothing. |
| **Projection** | `given.gate.entities` | Answer, for an **update** only, the entity's stored values before the write, taken from the fixture's entity table. An entity the table does not name does not exist: answer "nothing to project", which the pipeline must distinguish from "every field was empty". For a **create**, it is not consulted (AF-3). |
| **Authorization** | `given.gate.authorization` | Admit a principal iff its id is in `allow`, or `allow` contains `"*"`. When `throws` is set, fall over instead of answering — and the gate must read that as a **refusal** (AZ-2, AZ-6). |
| **Clock** | `given.clock`, each step's `at` | Return a fixed instant, moving only when a step moves it. No wall-clock reads anywhere in a run. |

Two more collaborators are supplied by the driver rather than stated by the fixture: a **Docket store** (in-memory,
tenant-scoped) and a **telemetry sink** that records the keys emitted so `expect.telemetry` can be answered.

## 8. What a run must report

A run emits one document per implementation-and-runtime, validating against
[`results.schema.json`](results.schema.json):

- the **implementation** under test (`name`, `version`, optionally `commit` and `runtime`) and the **protocol tag** the
  fixtures came from — a result whose tag is not the one the parity manifest names is not a comparison;
- `producedAt`;
- a **summary**: `total`, `passed`, `failed`, `errored`, `skipped`, and optionally `durationMs`;
- **one entry per fixture in the manifest**, including the ones that passed — a run that reported only failures could
  not be checked for completeness. Each carries `id`, `outcome` and optionally `diff`, `durationMs` and `reason`.

`outcome` is one of four:

| Value | Meaning |
|---|---|
| `pass` | Every fact the fixture stated held. |
| `fail` | At least one did not. `diff` lists them, each as `{ at, expected, actual }` where `at` is the dotted path — `"entry.status"`, `"card.fields[1].kind"`. |
| `error` | The driver could not run the fixture at all: a port it cannot supply, a step kind it has not bound, a crash. **An error is not a pass and not a silent skip**, and it counts against the implementation exactly like a failure in the parity manifest. |
| `skipped` | Deliberately not run — and only for a reason the parity manifest declares (an exemption inherited from the rulebook, or a runtime the implementation does not claim). A skip nobody declared is a hole. |

## 9. The canonical vectors

`fixtures/canonical/*.json` are a **different document shape** and are not run through the step machinery. Each is an
input Affidavit, the amendments accepted on it, the decision they arrived on, and the exact canonical bytes and SHA-256
those produce (SR-1). Their schema is [`canonical-vector.schema.json`](canonical-vector.schema.json):

```jsonc
{
  "id": "canonical/money-and-escapes",
  "rules": ["SR-1", "SR-2"],
  "note": "…what this vector stresses and why…",
  "input": { "…the Affidavit…" },
  "amendments": null,
  "reviewerAct": null,
  "expectedBytesUtf8": "{\"aggregateConfidence\":0,…}",
  "expectedSha256": "…64 lowercase hex characters…"
}
```

Unlike a fixture, the expected values here **were written by an implementation** — a 1,500-byte canonical document typed
by hand is a transcription waiting to enshrine a typo. What makes a vector trustworthy is that three paths sharing no
code have to agree on it: the implementation, a second canonicalizer written out from the rule, and an off-the-shelf
SHA-256. A driver **reproduces** the bytes and the digest; it does not re-derive them, and it does not regenerate them
when they disagree — a disagreement is the finding.

Because no known release violates them, the vectors carry no negative-oracle entry and are marked `acceptedOnReview` in
the manifest (`ORACLE.md`, `fixtures/MANIFEST.json`).

## 10. The index

[`fixtures/MANIFEST.json`](fixtures/MANIFEST.json), section `"conformance"`, lists every promoted document with its `id`,
its `file`, the `rules` it checks, the `set` it belongs to, and its `oracle` — either `null`, or the release it MUST fail
against and the shipped defect it refutes ([`ORACLE.md`](ORACLE.md)). A driver runs **every fixture the manifest lists**;
running a subset and reporting a pass is the failure mode the whole arrangement exists to prevent.
