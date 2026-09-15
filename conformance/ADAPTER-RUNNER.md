# ADAPTER-RUNNER — the adapter fixture format

**What this file is.** The complete description of the documents in `fixtures/adapter/` — seven JSON files, each one a
wiring, a tool set an adapter built, a call through it, and what must then be true. It is written so that somebody who
has written an Affiant adapter for a framework nobody here has used can read this file, bind these documents to their
own adapter, and publish what the run said in their implementation's parity manifest.

**Read [`RUNNER.md`](RUNNER.md) first.** An adapter fixture *is* a conformance fixture: the same document, the same
`given` and `expect`, the same strictness, the same partial matchers, validated against the same
[`fixture.schema.json`](fixture.schema.json). This file describes only what is different — two step kinds and five
`expect` clauses — and the one thing about the section as a whole that a driver has to get right.

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
  `adapter/cv3-docket-row-survives-history` does;
- every `expect` clause of §4, including `entry`, `card`, `store`, `found`, `telemetry` and `canonicalHash`, with the
  matcher semantics of §5;
- the strictness of §6 — an unknown key anywhere fails the fixture, an `expect` that states no fact fails as vacuous, a
  refusal on the final step is compared, and a failed expectation is reported rather than thrown.

## 3. `adapter-build` — the adapter is handed the host's definitions

| Key | Required | What it is |
|---|---|---|
| `kind` | yes | `"adapter-build"`. |
| `definitions` | yes | The tool definitions the host hands the adapter, in order. §3.1. |
| `declared` | no | Tools the host declared it cannot intercept **before** the set is built (CV-4): `{ tool, category: "no-execute" \| "provider-executed" \| "hosted-mcp" }`. The same shape as `given.gate.uncovered`, stated here because a declaration is part of how a host wires an adapter. |

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

A context the framework's own validation rejects before the adapter sees it is still a refused call: what the fixture
states is that nothing was filed and the host's function did not run, not which layer said no.

### 4.2 `gate`

`"absent"` builds the tool set for this call against **a gate that cannot be reached** — one whose every entry point
raises — from the definitions of the last `adapter-build`. It is the seam CV-2's second sentence is about: a filter that
silently returns the raw proposal as the tool result when the gate is absent is non-conformant, so this call must raise
rather than return.

The default, `"present"`, uses the set the `adapter-build` step produced.

### 4.3 `messages`

The framework's own message history for the call, passed through whatever channel the framework passes it. It exists
for CV-3: a fixture states it to put a framework-side artefact — an approval response, a replayed tool result, a
checkpoint — in front of the seam and assert that the adapter reads nothing out of it. An adapter reads no approval, no
Affidavit and no entry state from a framework's history; the Docket row is the source of truth. A framework with no
such channel ignores the key, and a fixture that states it is then answered by the rest of its expectations, which are
about the Docket and not about the framework.

## 5. The `expect` clauses of this section

Five, beside every clause `RUNNER.md` §4 already defines. Each is optional; each is partial in the same sense.

### 5.1 `outcome`

What the call under test did, as the caller saw it. `{ kind, code?, messageContains?, result? }`:

| `kind` | Means |
|---|---|
| `filed` | The call returned a write result: a proposal was filed and the caller was handed the entry it produced. |
| `read` | The call returned a read result. `result`, when stated, is compared for structural equality. |
| `refused` | The call produced an Affiant refusal carrying one of the rulebook's codes — whether the seam raised it or returned it as the tool's error result. `code` is compared as a string, exactly, and `messageContains` must appear as a substring of the reason. |
| `thrown` | The call raised something that is **not** a refusal. This is what CV-2 requires of a seam whose gate is unreachable, and it is a different fact from a refusal: a refusal is the framework being told no in the vocabulary of the rulebook, and a throw is the seam refusing to answer at all. |

The **row** a `filed` call produced is stated through `expect.entry`, the matcher every other fixture uses — a fixture
that wants to pin the status writes `"entry": { "status": "pending" }`. Two clauses rather than a nested one, because
`expect.entry` already means exactly that and a second spelling of it would be a second thing to keep in step.

### 5.2 `entries`

How many rows the Docket holds in the step's own tenant afterwards, as an integer. `0` is the statement a refused call
makes and is the reason the clause exists: "it was refused" and "it was refused **and nothing was filed**" are different
claims, and only the second one closes CV-2.

### 5.3 `modelOutput`

What the framework was handed to put in its own history — the **model-facing** output of the call, not the result the
host received. Every adapter has both: the host gets the whole gated result, and the model gets a summary, because the
Affidavit and the Evidence Card must not go back into a transcript (CV-3, AZ-5).

| Key | What it matches |
|---|---|
| `keys` | The **whole** key set of that output, sorted by Unicode code point. Stating it states all of them: an output carrying a key nobody asked for is exactly what this clause is for. |
| `fields` | The field names the output lists, in order. |
| `carriesNoFieldValues` | Derived, and the clause the rule is about. `true` asserts two things at once: **no key** anywhere in the output is the name of a field the filing swore to, and **no value** of any such field appears anywhere inside it, at any depth. |

An adapter whose framework has no separate model-facing output answers this clause with whatever the framework puts in
its history, which is then the thing CV-3 is about.

### 5.4 `frameworkCarries`

Every key of the model-facing output whose value **is** the filed entry's id, stated as the whole list and sorted. CV-3
says a framework checkpoint may carry an `entryId` and nothing else; `["entryId"]` is that sentence as a matcher, and
together with `carriesNoFieldValues` it is what "nothing else" means: one pointer back at the Docket, and no copy of
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

[`fixtures/MANIFEST.json`](fixtures/MANIFEST.json), section `"adapter"`, lists every document with its `id`, its
`file`, the `rules` it checks, the `set` it belongs to, and its `oracle` — `null` on every row here, with
`acceptedOnReview: true` beside it. There is no negative oracle for this section: the fixtures were authored with the
first adapter, so there is no earlier release of an adapter whose recorded defect they refute. They are accepted on
review, the way the canonical vectors are, and named as such in the manifest ([`ORACLE.md`](ORACLE.md)).
