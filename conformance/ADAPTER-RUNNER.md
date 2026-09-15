# ADAPTER-RUNNER — the adapter fixture format

**What this file is.** The complete description of the documents in `fixtures/adapter/` — ten JSON files, each one a
wiring, a tool set an adapter built, a call through it, and what must then be true. It is written so that somebody who
has written an Affiant adapter for a framework nobody here has used can read this file, bind these documents to their
own adapter, and publish what the run said in their implementation's parity manifest.

**Read [`RUNNER.md`](RUNNER.md) first.** An adapter fixture is a conformance fixture with two step kinds and five
`expect` clauses of its own: the same document, the same `given`, the same strictness, the same partial matchers. This
file describes only what is different, and the one thing about the section as a whole that a driver has to get right.

The two shapes are **separate variants** of [`fixture.schema.json`](fixture.schema.json) —
`#/$defs/conformanceFixture` and `#/$defs/adapterFixture` — and the lint validates each manifest section against its
own. That is not tidiness. A conformance fixture stating `hostExecuteRan`, or an `adapter-call` step, would be stating a
key the reference runner never reads: the document would assert nothing about that fact and every implementation, one
that does nothing included, would pass it. So a conformance fixture carrying an adapter step or an adapter clause is
**refused**, and so is an adapter fixture pretending to be a conformance one.

**What an adapter is.** The code that puts the Affiant gate between a host framework's tool-calling loop and the writes
a model proposes through it. A host hands the adapter its tool definitions; the adapter hands back the framework's own
tool objects, and the function behind each one calls the gate instead of the host's code. Three rules are about that
seam and nothing else, and none of them could be checked before an adapter existed:

- **CV-2**, the fail-closed call-site rule: a seam calls the gate directly, with an explicit turn context, and throws
  when the gate is unreachable. It never falls back to an ambient default and never hands the model the raw proposal.
- **CV-3**, the delegation clause: a host framework may own turn durability and transport rendezvous. It never owns
  entry identity, the guarded compare-and-set, expiry-as-queryable-state or resubmission lineage. A framework
  checkpoint may carry an `entryId` and nothing else, and the Docket row is the source of truth.
- **CV-5**, the durability-claim rule. It is a statement about documentation and packaging, which no fixture can
  observe; it is checked by [`ADAPTER-CLAIMS.md`](ADAPTER-CLAIMS.md)'s lint instead, and no document here is about it.

---

## 1. Who runs this section, and who does not

`fixtures/MANIFEST.json` has an `"adapter"` section beside `"conformance"`. The two are indexed the same way and are
scoped differently on purpose ([`DRIVER.md`](DRIVER.md) §7):

- a driver runs **every** entry of the `conformance` section, always;
- a driver runs **every** entry of the `adapter` section **once for each adapter its implementation ships and
  declares**, and an implementation that ships no adapter runs none of them and declares `adapters: []` in its parity
  manifest ([`PARITY.md`](PARITY.md)).

The scoping is at the section level because `DRIVER.md`'s sentence about the `conformance` section — run every entry, an
unrun entry is `error` — has to stay true, and an implementation with no adapter has no seam to bind. A fixture-level
"not applicable" would be the alternative, and the parity schema deliberately has no such state: a fixture an
implementation quietly excuses itself from is not a parity report.

**Every fixture here is model-free and network-free.** The call is made the way the framework makes it — the adapter's
tool object, the arguments a model would have produced, the context the framework carries for the call — and no model
is asked for anything. A driver needs no provider credential and no network to run the set.

## 2. What is the same

Everything in `RUNNER.md` that the two extra step kinds do not replace:

- the document's five keys (`id`, `rules`, `title`, `given`, `expect`) and their meanings (§1). An `adapter/` id is
  never renamed, for the reason every other id is never renamed: a parity manifest cites it by name;
- `given.clock`, `given.store`, `given.ctx` and `given.gate` (§2). The gate an adapter is handed is built from
  `given.gate` exactly as a conformance fixture's is, out of the same four ports (§7);
- `given.prior[]` and `given.step` (§3), and the keys every step may carry — `as`, `at`, `principal`, `tenantId`,
  `conversationId`, `entry`, `refusal`;
- **the eight conformance step kinds are all legal here.** An adapter fixture whose story is "file through the seam,
  then read the row back" uses `adapter-build`, `adapter-call` and then `get`, which is exactly what
  `adapter/cv3-docket-row-survives-history` does. A driver binds the kinds its own fixtures use; one it has **not**
  bound is an `error` outcome and it counts against the implementation exactly like a failure (`RUNNER.md` §8), in the
  step under test and in any `prior` step alike. Never a pass, and never a silent skip — a document whose scene was
  never set is a document whose expectations mean nothing;
- every `expect` clause of §4, including `entry`, `card`, `store`, `found`, `telemetry` and `canonicalHash`, with the
  matcher semantics of §5;
- the strictness of §6 — an unknown key anywhere fails the fixture, an `expect` that states no fact fails as vacuous, a
  refusal on the final step is compared, and a failed expectation is reported rather than thrown.

## 3. `adapter-build` — the adapter is handed the host's definitions

| Key | Required | What it is |
|---|---|---|
| `kind` | yes | `"adapter-build"`. |
| `definitions` | yes | The tool definitions the host hands the adapter, in order. §3.1. |
| `declared` | no | Tools the host declared it cannot intercept (CV-4): `{ tool, category: "no-execute" \| "provider-executed" \| "hosted-mcp" }`. The same shape as `given.gate.uncovered`. |

**`declared` is applied through the gate's own declaration entry point, before the set is built**, and the order is the
whole point: a declaration made afterwards would not have been there when the adapter classified the tool, so a
write-capable tool in an uncovered category would have been refused at wire-up (CV-1) rather than filed `blocked`
(CV-4, AZ-4). A driver that applied it later would be running a different fixture.

The step builds the framework's tool set from those definitions, against the gate `given.gate` describes. The set it
produces is what a later `adapter-call` names a tool in. A fixture may carry more than one `adapter-build`; the last one
wins, and a call that names a tool no build produced is an `error`, not a failure — the document could not be run.

**A wire-up refusal is a fixture.** An adapter that refuses to build — a write-capable definition in a category it
cannot intercept, a duplicate name, a definition it cannot derive a model-facing schema from — refuses exactly as a gate
refuses at wire-up (CV-1): the refusal is reported through `expect.error`, or through `refusal` on the step, and nothing
after it runs. On that path only `error`, `telemetry`, `telemetryAbsent`, `store` and `entries` are answerable.

### 3.1 A definition

`{ name, description?, entityType, entityId?, writeCapable?, executedBy?: "host" | "provider", hostedMcp?,
omitExecute?, sdkKind?, operationLabel?, fields }` — the same shape as a `wrap-execute` step's `tool` (`RUNNER.md` §3),
with one addition:

- **`sdkKind`** (`"function"` | `"dynamic"` | `"provider"`) is which kind of the framework's own tool the host exposes
  the definition as. It is a fact about the framework rather than about the tool, which is why a conformance fixture's
  `tool` has no place for it. A framework with no such distinction ignores it; a framework that has one maps the three
  as its own vocabulary spells them. An adapter that cannot gate a write-capable definition because of its `sdkKind`
  refuses at build, and the fixture says so through `expect.error`.

`entityId` `null` or absent means a create-shaped tool. `omitExecute` means the definition carries no host function at
all — the `no-execute` coverage category.

**`readResult`** is what the host function of a **read** definition returns, stated by the fixture. Without it
`expect.outcome.result` could not be compared at all: the driver would be choosing the value and then checking its own
choice, which is not a test of anything. Stating it makes a read's result a fact the document pins. It is meaningless on
a write-capable definition, whose own function is a tripwire that must never run.

**The driver supplies the host function, and it is a tripwire.** For a **write-capable** definition the function must
fail the fixture if it is ever called: the gate stands in front of writes and must never perform one (GT-6), and a
driver that supplied a harmless no-op would turn every document here into a document that cannot detect the bug it is
there for. For a **read** definition the function records that it ran and returns a value the driver chooses — which is
what lets a fixture state `hostExecuteRan: false` about a refused read and mean something by it.

**The operation a write proposes is derived, not stated.** A write-capable definition proposes an update against
`entityType`/`entityId` when `entityId` is present and a create against `entityType` when it is not, over the field
names the call's `args` carry. That is the same mapping a `wrap-execute` fixture's tool makes, and it is stated here so
that two drivers derive the same operation from the same document.

## 4. `adapter-call` — the framework calls one tool of the built set

| Key | Required | What it is |
|---|---|---|
| `kind` | yes | `"adapter-call"`. |
| `tool` | yes | The name of the tool in the built set. |
| `args` | yes | The input a model produced for the call: a field-name → value map. |
| `context` | yes | What the framework carries for **this call**. §4.1. |
| `gate` | no | `"present"` (the default) or `"absent"`. §4.2. |
| `messages` | no | The framework's own message history for the call, where the fixture is about what a framework carries (CV-3). §4.3. |

The step calls the tool through whatever entry point the framework calls it through — the function on the tool object,
the handler the framework invokes, whatever the framework's shape is — with `args` as the model's input and `context`
as the per-call context. **Not through the adapter's internals**: a driver that reached past the framework's own call
path would be testing something no host can reach.

### 4.1 `context`

Three values, and the distinction between the second and the third is the whole of CV-2:

- **`"turn"`** — `given.ctx`, with this step's own `principal`, `tenantId` and `conversationId` overrides applied, and
  the turn's instant taken from the clock as the step left it. This is the ordinary case: a host that has a turn
  context and passes it.
- **a context object** — the same shape as `given.ctx` (`RUNNER.md` §2.2), stated in full, for a fixture whose point is
  a context that differs from the fixture's own.
- **`null`** — the call arrives with no context at all. GT-2 says an adapter that cannot obtain the context at its seam
  refuses, and CV-2 says it never falls back to a shared default, so this call must produce a refusal and must file
  nothing.
- **`{ "malformed": <any JSON> }`** — the call arrives with something that is not a turn context, and the driver passes
  that value through as the context exactly as written. GT-2 is about a context an implementation can **read**, not
  about a property being present, and a format that could only say `null` could not state the case at all: a host that
  passed `{ turn: { nonsense: true } }` would be refused by an honest seam and silently tolerated by a careless one, and
  no fixture could tell them apart.

A context the framework's own validation rejects before the adapter sees it is still a refused call: what the fixture
states is that nothing was filed and the host's function did not run, not which layer said no.

The turn's `messageId` and `utterance` come from the context the fixture states. An adapter may require either to be
non-empty — a blank message id travels onto an attestation record (AZ-1) where nobody can tell it from an absent one —
so every fixture in this section states both.

### 4.2 `gate`

`"absent"` builds the tool set for this call against **a gate that cannot be reached** — one whose every entry point
raises — from the definitions of the last `adapter-build`. It is the seam CV-2's second sentence is about: a filter that
silently returns the raw proposal as the tool result when the gate is absent is non-conformant, so this call must raise
rather than return.

The default, `"present"`, uses the set the `adapter-build` step produced.

### 4.3 `messages`

The framework's own message history for the call, stated **abstractly** so a fixture names no framework:

```jsonc
"messages": [ { "kind": "framework-approval", "approved": true } ]
```

`framework-approval` is an approval the framework reconstructed from a client's reply — the path AZ-5 closes. A driver
maps it to its own framework's shape and passes it through whatever channel that framework passes a history on: the AI
SDK's driver builds a `tool-approval-response` part and hands it to the call as the SDK would. Naming that shape in the
fixture would make the document about one framework; naming the artefact makes it about the rule.

**An implementation whose framework has no such channel** cannot replay an artefact at all, and says so — in the
conformance note of its own driver, and in its parity manifest's `adapters[].note`. The fixture is then answered by its
**replay half** only: the call is made without the artefact, and the assertions about the Docket row and about the
model-facing output still hold, because a seam that cannot be handed an approval cannot read one either. What it may
**not** do is state that the fixture passed with the artefact half unrun and say nothing.

The `modelOutput` assertion holds either way, and it is the half that matters: a seam that read an approval out of the
history and told the model the row was `approved` would leave the Docket row untouched and still be exactly what AZ-5
forbids. §5.3's `status` is what sees it.

## 5. The `expect` clauses of this section

Five, beside every clause `RUNNER.md` §4 already defines. Each is optional; each is partial in the same sense.

### 5.1 `outcome`

What the call under test did, as the caller saw it. `{ kind, code?, messageContains?, result? }`:

| `kind` | Means |
|---|---|
| `filed` | The call returned a write result: a proposal was filed and the caller was handed the entry it produced. |
| `read` | The call returned a read result. `result`, when stated, is compared for structural equality against the definition's own `readResult` (§3.1). |
| `refused` | The call produced an Affiant refusal carrying one of the rulebook's codes — whether the seam raised it or returned it as the tool's error result. `code` is compared as a string, exactly, and `messageContains` must appear as a substring of the reason. |
| `thrown` | The call raised something that is **not** a refusal. This is what CV-2 requires of a seam whose gate is unreachable, and it is a different fact from a refusal: a refusal is the framework being told no in the vocabulary of the rulebook, and a throw is the seam refusing to answer at all. |

**How a driver decides which one it is.** A tool's result is a discriminated union of three kinds (AF-5), and a call
either returns one or raises. So:

1. the call **raised** an Affiant error — one carrying a rulebook refusal code — and the outcome is `refused` with that
   code;
2. the call **raised** anything else, and the outcome is `thrown`;
3. the call **returned** the write kind, and the outcome is `filed` with the entry id that result carries;
4. the call **returned** the read kind, and the outcome is `read` with the value;
5. the call **returned** the error kind, and the outcome is `refused` with its code — the same fact as (1), arriving by
   the other door, because whether a seam raises a refusal or returns it is the framework's convention rather than the
   rulebook's.

Anything else the call returned is an `error` outcome for the document: a result that is none of the three kinds is a
seam this format cannot describe, and reporting a pass for it would be reporting a pass for a shape nobody checked.

The **row** a `filed` call produced is stated through `expect.entry`, the matcher every other fixture uses — a fixture
that wants to pin the status writes `"entry": { "status": "pending" }`. Two clauses rather than a nested one, because
`expect.entry` already means exactly that and a second spelling of it would be a second thing to keep in step.

### 5.2 `entries`

How many rows the Docket holds in the step's own tenant afterwards, as an integer. The **tenant's whole list** — the
Docket operation that yields every row of a scope, never narrowed by conversation — because a row filed under a
conversation the fixture did not expect is exactly the kind of row this clause exists to see.

`0` is the statement a refused call makes and is the reason the clause exists: "it was refused" and "it was refused
**and nothing was filed**" are different claims, and only the second one closes CV-2. `1` after a second call is the
statement `adapter/cv2-second-call-without-context-refuses` makes, and it is the one that catches a seam caching the
first call's context per gate: such a seam refuses nothing and files a second row, and without a second call in the
document nothing would ever look.

### 5.3 `modelOutput`

What the framework was handed to put in its own history — the **model-facing** output of the call, not the result the
host received. Every adapter has both: the host gets the whole gated result, and the model gets a summary, because the
Affidavit and the Evidence Card must not go back into a transcript (CV-3, AZ-5).

**`"modelOutput": null` is a statement**, and it is the one the refusal fixtures make: the framework was handed
**nothing at all**. A call that raised — a refusal or a throw — leaves nothing for a framework to put in its history,
and a seam that instead returned the raw proposal as the tool's result is precisely what CV-2's second sentence
forbids. Without this clause a refusal fixture observes only that the Docket is empty, and a seam that refused *and*
handed the model the proposal anyway would pass it.

| Key | What it matches |
|---|---|
| `keys` | The **whole** key set of that output, sorted by Unicode code point. Stating it states all of them: an output carrying a key nobody asked for is exactly what this clause is for. |
| `fields` | The field names the output lists, in order. |
| `status` | The status the output tells the model the row reads at, which must be the row's own. A seam that read an approval out of the framework's history and told the model `approved` over a `pending` row is what AZ-5 closes, and nothing else in this matcher would see it. |
| `carriesNoFieldValues` | Derived, and the clause the rule is about. See below. |

**`carriesNoFieldValues` is a check over text, not over structure.** `true` asserts two things:

- **no key** anywhere in the output, at any depth, is the name of a field the filing swore to;
- **no serialisation of any sworn field's value appears as a substring of the JSON serialisation of the output**.

The second is stated over text on purpose. A structural comparison passes a summary whose `note` reads
`"priority=High"` — the sworn value is in the framework's history, in a sentence, exactly as surely as it would be as a
value, and CV-3 does not care which. A value whose JSON serialisation is shorter than three characters is compared as a
**whole JSON token** instead (that is, the serialisation must not appear as a complete token in the output), because a
one-character value would otherwise match almost any output and the clause would fail on every document.

An adapter whose framework has no separate model-facing output answers this clause with whatever the framework puts in
its history, which is then the thing CV-3 is about.

### 5.4 `frameworkCarries`

Every **path** in the model-facing output whose value is the filed entry's id, stated as the whole list and sorted. A
path is dotted for a nested match and bracketed for an array index — `entryId`, `result.entryId`, `items[0].entryId` —
so a summary that buried the id somewhere unexpected is named rather than merely counted.

CV-3 says a framework checkpoint may carry an `entryId` and nothing else; `["entryId"]` is that sentence as a matcher,
and together with `carriesNoFieldValues` it is what "nothing else" means: one pointer back at the Docket, and no copy of
what the Docket holds.

### 5.5 `hostExecuteRan`

Whether any host function the definitions carry ran **during the step under test** — reset before that step, so a prior
step that legitimately reached one does not answer for it. `false` on a write fixture is the GT-6 tripwire restating
itself; `false` on a read fixture is CV-2's real content, that the refusal happened at the seam and not after the host's
own code had already run.

## 6. What a run reports

Exactly what `RUNNER.md` §8 says, in the same `results.schema.json` document, with the adapter fixtures' ids beside the
conformance ones. An implementation that ships two adapters runs this section twice and emits one document per adapter
and runtime; the parity manifest names each adapter in `adapters[]` with the number of fixtures its run covered
([`PARITY.md`](PARITY.md)).

The failing set in a parity manifest is the union over the sections a run covered. A fixture here that fails is a
failing fixture like any other: it is listed, with a disposition and a detail a reader can act on.

## 7. The index

[`fixtures/MANIFEST.json`](fixtures/MANIFEST.json), section `"adapter"`, lists all ten documents with its `id`, its
`file`, the `rules` it checks, the `set` it belongs to, and its `oracle` — `null` on every row here, with
`acceptedOnReview: true` beside it. There is no negative oracle for this section: the fixtures were authored with the
first adapter, so there is no earlier release of an adapter whose recorded defect they refute. They are accepted on
review, the way the canonical vectors are, and named as such in the manifest ([`ORACLE.md`](ORACLE.md)).
