# ADAPTER-CLAIMS — the durability-claim declaration, and the lint that reads it

**What this file is.** CV-5's check. The rule says:

> No claim that a pause survives a process restart may rest on a runtime feature that is not published under the
> `latest` dist-tag with the provider pinned at build time; otherwise the Docket row alone is the durable state.

That is a statement about an adapter package's **documentation** and its **packaging**. No declarative fixture can
observe either — a fixture watches what code does, and this rule is about what a package says and what it depends on —
so CV-5's check is a lint over the package, [`lint/adapter-claims.mjs`](lint/adapter-claims.mjs), and this file is what
it reads and why.

**Why the rule exists.** A host framework that can pause a tool call and resume it later is the reason a host reaches
for one, and an adapter that surfaces a pending Docket entry through that mechanism is doing the right thing. The
danger is the sentence that follows: *and the pause survives a restart*. Where that is true only of a feature published
under a `beta` or a `next` tag, the adopter has been told their approval queue is durable on the strength of something
their package manager will not install. The Docket row is durable; a third-party pause on an unpublished tag is not,
and the difference is the whole of an audit record's value.

---

## 1. What an adapter package declares

In its `package.json`:

```jsonc
{
  "name": "@affiant/adapter-ai-sdk",
  "affiant": {
    "adapter": {
      "runtime": "ai",
      "surfaces": ["generateText", "streamText", "ToolLoopAgent"],
      "durabilityClaims": []
    }
  },
  "peerDependencies": { "ai": "^7.0.0" }
}
```

| Key | What it is |
|---|---|
| `runtime` | The npm package name of the framework this adapter is for. It **must** be one of the package's own `peerDependencies`: CV-5 is about a claim resting on a version the package pins at build time, and a runtime the package does not depend on pins nothing. |
| `surfaces` | The framework surfaces the adapter supports, by the framework's own names. At least one — an adapter that supports no surface is not an adapter. This is a published fact about the package, so a reader can see what it covers before installing it; the lint checks the shape and not the names, which only the framework can settle. |
| `durabilityClaims` | Every durability claim the package makes, each `{ feature, since }`: what the claim rests on, and the **runtime version the feature arrived in**. |

`"durabilityClaims": []` is a complete and ordinary declaration. It says the package claims no durability beyond the
Docket row — which is what AZ-5 says is true anyway — and it is what the first adapter declares.

## 2. What the lint checks

```
node conformance/lint/adapter-claims.mjs <package directory>
node conformance/lint/adapter-claims.mjs <package directory> --offline
```

**One: every declared claim, against the runtime's published `latest`.** For each `durabilityClaims` entry the lint
reads the runtime's dist-tags from the registry (`npm view <runtime> dist-tags --json`) and checks two things:

- `since` is inside the package's own declared peer range. A claim resting on a version a host installing the package
  may not get is a claim the packaging does not support.
- `since` is at or below the runtime's `latest`. A claim resting on a feature only a `beta`, a `next` or a `canary` tag
  carries is exactly what CV-5 forbids, and the lint says which tag reaches how far.

The peer-range forms the lint reads are `^x.y.z`, `~x.y.z`, `>=x.y.z` and an exact `x.y.z`. A range it cannot read is a
**failure**, not a pass: a lint that shrugged at a range it did not understand would report "no problems" about a claim
it never checked.

**Two: the README, against the declared claims.** The lint finds the sentences in the package's `README.md` that claim
durability, using the fixed phrase list of §3, and fails on any occurrence where `durabilityClaims` is empty. A package
that claims nothing and says nothing passes; a package that claims something and declares it passes if check one
passes; a package that *says* it and declares nothing fails, with the sentence quoted and its line named.

**Exit codes.** `0` when every check passed, `1` when a check failed, and **`2` when the registry could not be read at
all**. The third is what lets a continuous-integration job fall back to `--offline` on a runner with no route to the
registry without also swallowing the one failure that fallback cannot see: a claim resting on a version `latest` has not
reached is precisely what the registry half checks, and a job that retried offline on *any* failure would report CV-5
green for it.

**`--offline`** skips the registry read, prints why, and runs everything that needs no network — the declaration's
shape, the peer-range check and the whole README check. A run that used it has **not** verified any declared claim
against a published dist-tag, and it says so on the last line, so a result recorded from an offline run is recorded
honestly. Where a package declares no claims there is nothing the registry half could have checked, and the two runs
say the same thing.

## 3. The phrase list

Fixed, and documented here so an adapter author can write to it. A lint over prose that grew a new rule whenever
somebody found a phrasing it missed would be a lint nobody could predict.

Every pattern is an **affirmative** form — a subject claiming the thing — rather than the bare words *durable* and
*survives*:

| Phrase | What it reads as | Example it catches |
|---|---|---|
| `survives … restart / reboot / crash / redeploy / cold start / failover` | that something survives a restart | "a pending approval survives a process restart" |
| `is / are / stays / remains / becomes durable` | that something is durable | "the paused call is durable" |
| `durable pause / checkpoint / approval / resumption` (also *durably persisted*, *durably stored*) | that a pause or a checkpoint is a durable one | "a durable checkpoint holds the approval" |
| `resumes … after a restart / reboot / crash / redeploy` | that something resumes after a restart | "the workflow resumes after a redeploy" |

**An occurrence is discounted where the same sentence denies or quotes it first.** The lint looks in the text *before*
the phrase, in the same sentence, for one of: *no*, *not*, *never*, *cannot*, *can't*, *without*, *nothing*, *neither*,
*nor*, *unsupported*, *rather than*, *instead of*, *would have to*. Every discounted occurrence is printed with the
sentence, so a reader checks the discount rather than taking it.

That is the whole of the lint's reading of prose, and it is deliberately blunt. It means a README may state the rule —
"CV-5 says no claim that a pause survives a process restart may rest on a feature that is not published under `latest`"
— or name a framework's durability as the reason a host would want it, or say that the Docket row is the durable state,
without any of those reading as a promise. It also means a sentence could be written to slip through. The answer to
that is that such a sentence would be a false claim somebody put there on purpose, which is not what a lint is for; what
a lint is for is the sentence written in good faith on a Friday that nobody notices is a promise.

## 4. Where the result is recorded

The lint needs the registry, so it runs in the **adapter's own** continuous integration rather than in this repository,
and its result is published in the implementation's parity manifest: `adapters[].claimsLint`, `"pass"` or `"fail"`
([`PARITY.md`](PARITY.md)). A manifest that names an adapter and no `claimsLint` result is a manifest that has not
answered CV-5 for it.

This repository's own coverage lint ([`lint/lint.mjs`](lint/lint.mjs)) accepts CV-5's `lint:` citation as coverage,
which it does for no `suite:` and no `guard:` citation. The difference is that this script is **here**: it runs in this
repository's CI beside the coverage lint, against any package directory it is pointed at, and a reader can run it
themselves. The alternative would have been to exempt CV-5 for good and call that coverage.

## 5. The first adapter

`@affiant/adapter-ai-sdk` declares `runtime: "ai"`, the three surfaces it supports, and `durabilityClaims: []`. Its
README's CV-5 paragraph is the other half of the answer: it says that `WorkflowAgent` from `@ai-sdk/workflow` is not
supported, that the durability a workflow offers is the reason a host would reach for it, and that
`@ai-sdk/workflow`'s own `latest` release requires a peer range only a `beta` dist-tag satisfies — so until a run
proves otherwise, the Docket row alone is the durable state. Those sentences are the rule being stated, and the lint
discounts them as such; the empty `durabilityClaims` is the packaging half, and it has nothing for the registry to
refuse.
