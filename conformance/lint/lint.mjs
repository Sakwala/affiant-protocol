// The fixture lint. It runs over two fixture sets that live side by side in this
// repository and are checked the same way, against different schema directories:
//
//   0.0.1-seed  `conformance/fixtures/wire/`  ->  `schemas/`
//               hand-authored examples of the wire one shipped implementation
//               sends today. Their key sets are asserted against the shipped .NET
//               serializer by the hosts' wire-shape tests; their values are
//               illustrative. A failure here means the schema and the example
//               disagree; decide which is right against that serializer.
//
//   0.1.0       `conformance/fixtures/v0.1/`  ->  `schemas/0.1.0/`
//               the designed protocol version. Each document was produced by
//               running the TypeScript reference implementation and writing down
//               what it emitted (see MANIFEST.json -> "0.1.0" -> derivedFrom). Each
//               schema carries at least one POSITIVE, which must validate, and at
//               least one NEGATIVE, a single deliberate mutation of a positive,
//               which must FAIL. A negative that passes is the more interesting
//               failure: it means the schema does not refuse what the rulebook says
//               it must. A few rules are relations between two objects that no JSON
//               Schema can express; those are checked here instead, and a negative
//               that breaks one is marked `"check": "cross-object"` in the manifest.
//
// It also checks that every fixture file on disk is claimed by the manifest exactly
// once, that no id or file is listed twice, that every v0.1 schema has a fixture and
// every v0.1 fixture has a schema, and that every enum set the manifest maps to a
// schema matches that schema's `enum` exactly, in order — in both directories.
//
// Run: node conformance/lint/lint.mjs   (from the repository root, or anywhere)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const fixturesDir = join(repoRoot, 'conformance', 'fixtures');
const seedSchemasDir = join(repoRoot, 'schemas');
const v01SchemasDir = join(seedSchemasDir, '0.1.0');
const manifestPath = join(fixturesDir, 'MANIFEST.json');

const failures = [];
const fail = (message) => failures.push(message);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (!existsSync(manifestPath)) {
  console.error(`FATAL  manifest not found: ${manifestPath}`);
  process.exit(1);
}
const manifest = readJson(manifestPath);

// Every schema in both directories goes into one Ajv instance: the `$id`s differ by
// version, so a `$ref` from a v0.1 schema can never resolve to a seed one by accident.
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaFilesIn = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.schema.json')).sort() : [];
for (const name of schemaFilesIn(seedSchemasDir)) ajv.addSchema(readJson(join(seedSchemasDir, name)));
for (const name of schemaFilesIn(v01SchemasDir)) ajv.addSchema(readJson(join(v01SchemasDir, name)));

const compiled = new Map();
const compile = (schemaRelPath) => {
  if (compiled.has(schemaRelPath)) return compiled.get(schemaRelPath);
  const schema = readJson(join(repoRoot, schemaRelPath));
  const validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  compiled.set(schemaRelPath, validate);
  return validate;
};

console.log(`affiant-protocol fixture lint — seed ${manifest.protocolVersion}, and ${manifest['0.1.0'].protocolVersion}`);
const derivedFrom = manifest.derivedFrom ?? {};
console.log('the seed wire fixtures are hand-authored examples; their shapes were asserted against:');
console.log(`  framework  ${derivedFrom.framework}`);
console.log(`  hosts      ${derivedFrom.hosts}`);
console.log(`  date       ${derivedFrom.date}`);
console.log('the v0.1 fixtures were produced by running:');
console.log(`  reference  ${manifest['0.1.0'].derivedFrom.referenceImplementation}`);
console.log('');

const seenIds = new Set();
const seenFiles = new Set();

/** No manifest entry may repeat an id or a file, across BOTH sets. */
const checkUnique = (entries, where) => {
  let duplicates = 0;
  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      fail(`manifest: duplicate fixture id — ${entry.id}`);
      duplicates += 1;
    }
    seenIds.add(entry.id);
    if (seenFiles.has(entry.file)) {
      fail(`manifest: duplicate fixture file — ${entry.file}`);
      duplicates += 1;
    }
    seenFiles.add(entry.file);
  }
  if (duplicates === 0) {
    console.log(`OK    manifest ${where}: ${entries.length} entries, no duplicate id or file`);
  }
};

// ---------------------------------------------------------------------------
// 0.0.1-seed
// ---------------------------------------------------------------------------

checkUnique(manifest.fixtures, 'seed');
let checked = 0;

for (const entry of manifest.fixtures) {
  const fixturePath = join(fixturesDir, entry.file);
  if (!existsSync(fixturePath)) {
    fail(`${entry.id}: manifest names a fixture file that does not exist — ${entry.file}`);
    continue;
  }

  if (!entry.schemaRelevant) {
    if (entry.schema !== null && entry.schema !== undefined) {
      fail(`${entry.id}: schemaRelevant is false but the manifest names a schema — ${entry.schema}`);
    }
    continue;
  }

  if (!entry.schema) {
    fail(`${entry.id}: schemaRelevant is true but the manifest names no schema`);
    continue;
  }
  if (!existsSync(join(repoRoot, entry.schema))) {
    fail(`${entry.id}: manifest names a schema that does not exist — ${entry.schema}`);
    continue;
  }

  const validate = compile(entry.schema);
  const data = readJson(fixturePath);
  checked += 1;

  if (validate(data)) {
    console.log(`PASS  ${entry.id}  ->  ${entry.schema}`);
  } else {
    console.log(`FAIL  ${entry.id}  ->  ${entry.schema}`);
    for (const err of validate.errors ?? []) {
      const at = err.instancePath || '(root)';
      console.log(`        ${at} ${err.message}${err.params ? ' ' + JSON.stringify(err.params) : ''}`);
    }
    fail(`${entry.id}: does not validate against ${entry.schema}`);
  }
}

// Every seed wire fixture on disk must be claimed by the manifest — an unlisted file
// is never validated, so it must not exist unnoticed.
const wireDir = join(fixturesDir, 'wire');
const onDisk = existsSync(wireDir)
  ? readdirSync(wireDir).filter((n) => n.endsWith('.json')).sort()
  : [];
const unlisted = onDisk.filter((n) => !seenFiles.has(`wire/${n}`));
for (const name of unlisted) {
  fail(`wire/${name}: fixture file is not listed in MANIFEST.json`);
}
if (unlisted.length === 0) {
  console.log(`OK    manifest covers all ${onDisk.length} file(s) in conformance/fixtures/wire/`);
}

// ---------------------------------------------------------------------------
// Cross-object rules
// ---------------------------------------------------------------------------

/**
 * The rules a JSON Schema cannot state, because they relate two objects inside one
 * document. A document that breaks one is as wrong as one that breaks its schema, so
 * a positive must satisfy both and a negative may fail either.
 *
 * Today there is one: an Evidence Card's `presentation` hints are hints about the
 * fields of THAT card's Affidavit (schemas/0.1.0/README.md). A hint naming a field
 * the record does not carry renders a control over nothing, and the schema accepts
 * it — `presentation[].name` is only a non-empty string there.
 */
const crossObjectErrors = (schemaRelPath, data) => {
  const errors = [];
  if (schemaRelPath === 'schemas/0.1.0/evidence-card-request.schema.json') {
    const hints = data?.presentation;
    const fields = data?.affidavit?.fields;
    if (Array.isArray(hints) && Array.isArray(fields)) {
      const names = new Set(fields.map((field) => field?.name));
      for (const [index, hint] of hints.entries()) {
        if (!names.has(hint?.name)) {
          errors.push(
            `/presentation/${index}/name ${JSON.stringify(hint?.name)} is not a field of this ` +
              `card's Affidavit (it carries ${JSON.stringify([...names])})`,
          );
        }
      }
    }
  }
  return errors;
};

// ---------------------------------------------------------------------------
// 0.1.0
// ---------------------------------------------------------------------------

console.log('');
const v01 = manifest['0.1.0'];
if (!v01 || !Array.isArray(v01.fixtures)) {
  fail('manifest: no "0.1.0" section, or it lists no fixtures');
} else {
  checkUnique(v01.fixtures, '0.1.0');

  const definitionsOnly = new Set(v01.definitionsOnly ?? []);
  const schemasWithPositive = new Set();
  let positives = 0;
  let negatives = 0;

  for (const entry of v01.fixtures) {
    const fixturePath = join(fixturesDir, entry.file);
    if (!existsSync(fixturePath)) {
      fail(`${entry.id}: manifest names a fixture file that does not exist — ${entry.file}`);
      continue;
    }
    if (!entry.schema) {
      fail(`${entry.id}: a v0.1 fixture must name the schema it is about`);
      continue;
    }
    if (!existsSync(join(repoRoot, entry.schema))) {
      fail(`${entry.id}: manifest names a schema that does not exist — ${entry.schema}`);
      continue;
    }
    if (entry.kind !== 'positive' && entry.kind !== 'negative') {
      fail(`${entry.id}: kind must be "positive" or "negative", not ${JSON.stringify(entry.kind)}`);
      continue;
    }

    const validate = compile(entry.schema);
    const data = readJson(fixturePath);
    const crossErrors = crossObjectErrors(entry.schema, data);
    const valid = validate(data) && crossErrors.length === 0;

    if (entry.kind === 'positive') {
      positives += 1;
      schemasWithPositive.add(entry.schema);
      if (valid) {
        console.log(`PASS  ${entry.id}  ->  ${entry.schema}`);
      } else {
        console.log(`FAIL  ${entry.id}  ->  ${entry.schema}`);
        for (const err of validate.errors ?? []) {
          const at = err.instancePath || '(root)';
          console.log(`        ${at} ${err.message}${err.params ? ' ' + JSON.stringify(err.params) : ''}`);
        }
        for (const err of crossErrors) console.log(`        ${err}`);
        fail(`${entry.id}: does not validate against ${entry.schema}`);
      }
    } else {
      negatives += 1;
      if (valid) {
        console.log(`FAIL  ${entry.id}  ->  ${entry.schema}  (a negative fixture validated)`);
        fail(
          `${entry.id}: this document is supposed to FAIL ${entry.schema} and it validated. ` +
            `Either the mutation is not the violation the manifest claims, or the schema does not ` +
            `refuse what the rulebook says it must.`,
        );
      } else {
        console.log(`REFUSED  ${entry.id}  ->  ${entry.schema}`);
      }
    }
  }

  // Coverage, both ways: a schema with no positive fixture is a shape nothing pins,
  // and a fixture directory nobody listed is a document nothing validates.
  for (const name of schemaFilesIn(v01SchemasDir)) {
    const rel = `schemas/0.1.0/${name}`;
    if (definitionsOnly.has(rel)) continue;
    if (!schemasWithPositive.has(rel)) {
      fail(`${rel}: no positive fixture in the 0.1.0 manifest section validates against it`);
    }
  }
  const v01Dir = join(fixturesDir, 'v0.1');
  const walk = (dir) => {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.json') ? [full] : [];
    });
  };
  const v01OnDisk = walk(v01Dir).map((p) => relative(fixturesDir, p)).sort();
  const v01Unlisted = v01OnDisk.filter((p) => !seenFiles.has(p));
  for (const p of v01Unlisted) fail(`${p}: fixture file is not listed in MANIFEST.json`);
  if (v01Unlisted.length === 0) {
    console.log(`OK    manifest covers all ${v01OnDisk.length} file(s) in conformance/fixtures/v0.1/`);
  }
  console.log(
    `OK    0.1.0: ${positives} positive and ${negatives} negative fixture(s) over ` +
      `${schemasWithPositive.size} of ${schemaFilesIn(v01SchemasDir).length - definitionsOnly.size} schema(s)`,
  );
}

// ---------------------------------------------------------------------------
// Enum parity
// ---------------------------------------------------------------------------

console.log('');

/** Read `enum` out of a schema, following an optional JSON pointer to a subschema. */
const enumAt = (schemaRelPath, pointer) => {
  let node = readJson(join(repoRoot, schemaRelPath));
  for (const step of (pointer ?? '/enum').split('/').filter(Boolean)) {
    if (node === undefined || node === null) return undefined;
    node = node[step];
  }
  return node;
};

const enumsFile = join(fixturesDir, manifest.enums.file);
if (!existsSync(enumsFile)) {
  fail(`enums: manifest names a file that does not exist — ${manifest.enums.file}`);
} else {
  const enums = readJson(enumsFile);
  for (const set of manifest.enums.sets) {
    const key = set.id.replace(/^enum\//, '');
    const values = enums[key];
    if (!Array.isArray(values)) {
      fail(`${set.id}: not an array in ${manifest.enums.file}`);
      continue;
    }
    // The set is compared against every schema the manifest maps it to — the seed's
    // and v0.1's — so a value added to one and not the other fails here rather than
    // in an implementation months later. The ORDER is normative for provenanceSource:
    // it is the determinism ladder.
    for (const [schemaRelPath, pointer] of [
      [set.schema, undefined],
      [set.v01Schema, set.v01Pointer],
    ]) {
      if (!schemaRelPath) continue;
      if (!existsSync(join(repoRoot, schemaRelPath))) {
        fail(`${set.id}: manifest names a schema that does not exist — ${schemaRelPath}`);
        continue;
      }
      const schemaEnum = enumAt(schemaRelPath, pointer);
      if (!Array.isArray(schemaEnum)) {
        fail(`${set.id}: ${schemaRelPath}${pointer ?? ''} has no enum to compare against`);
        continue;
      }
      if (JSON.stringify(schemaEnum) !== JSON.stringify(values)) {
        fail(`${set.id}: differs from ${schemaRelPath}${pointer ?? ''} enum`);
        console.log(`FAIL  ${set.id}  ==  ${schemaRelPath}`);
        console.log(`        ${manifest.enums.file}: ${JSON.stringify(values)}`);
        console.log(`        ${schemaRelPath}: ${JSON.stringify(schemaEnum)}`);
      } else {
        console.log(`OK    ${set.id}  ==  ${schemaRelPath}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The promoted conformance suite (conformance/fixtures/{gate,decide,sequence-a,
// sequence-c,canonical}, MANIFEST.json -> "conformance")
//
// Four checks, each a function below, all of them additions to the sections above
// rather than changes to them:
//
//   (a) checkRuleCoverage    INVARIANTS.md's rules against the promoted fixtures,
//                            BOTH ways: every non-exempt rule must be checked by at
//                            least one fixture that exists and names it back, and
//                            every rule id a fixture names must exist.
//   (b) checkFixtureSchema   every promoted document against the runner's own format
//                            (conformance/fixture.schema.json; the byte vectors
//                            against conformance/canonical-vector.schema.json).
//   (b2) checkVectorRecords  every byte vector's `input` — and its `amendedInput`,
//                            where it carries one — against the AFFIDAVIT schema.
//                            The vector format says an input is an object; SR-1 says
//                            the canonical form is over the accepted state of the
//                            Affidavit as the schema defines it, and that is a
//                            stronger claim nothing was checking.
//   (c) checkOracle          the manifest's oracle entries against ORACLE.md's table,
//                            as an exact set, with the defect sentence carried over.
//   (d) checkMatcherShapes   the expect.entry / expect.card matchers inside the
//                            fixtures against the v0.1 wire schemas, AS PARTIALS —
//                            only the keys present, each against that key's own
//                            subschema. These are findings, not failures: a matcher
//                            key is allowed to be a projection with no property of
//                            its own. A TYPE mismatch is a failure, because that is
//                            the fixtures and the schemas disagreeing about a shape.
// ---------------------------------------------------------------------------

/** The label a rule's fixture citations follow in INVARIANTS.md. */
const CHECKED_BY = '*Checked by:*';

/** A citation that names a promoted fixture, as opposed to a suite, a lint or a seed shape. */
const PROMOTED_SET = /^(gate|decide|sequence-a|sequence-c|canonical)\//;

/** Matcher keys whose value is a projection or a derived fact, not a wire property. */
const DERIVED_MATCHER_KEYS = new Set([
  'expiresAtOffsetMs',
  'canonicalDiffersFromProposal',
  'bound',
  'warningsContain',
]);

/**
 * Matcher keys the wire spells somewhere other than a property of the same name.
 *
 * A matcher is written against what a reviewer or an auditor sees, and the wire puts
 * some of that in a different place: the row's `attestation` matcher is the attestation
 * record's attestor; a card's three confidence numbers live on its Affidavit; a field's
 * grade and confidence are the provenance tag in force; and a card field's `kind` is
 * repeated on the card's `presentation` hints, which are supplied by the host and sworn
 * to by nobody. The closed value set and the input mask are stated on `expect.card.
 * presentation` from v0.1 and need no override: they are checked against the envelope's
 * own `presentation` subschema, where they live.
 */
const MATCHER_OVERRIDES = {
  'entry.attestation': ['attestation', '/properties/by'],
  'card.aggregateConfidence': ['affidavit', '/properties/aggregateConfidence'],
  'affidavit.field.source': ['provenance-tag', '/properties/source'],
  'affidavit.field.confidence': ['provenance-tag', '/properties/confidence'],
  'affidavit.field.bindingKind': ['binding', '/properties/kind'],
  'card.field.kind': ['evidence-card-request', '/properties/presentation/items/properties/kind'],
};

/** An Ajv holding a relaxed copy of every v0.1 schema, for the partial matcher check. */
const partialAjv = new Ajv2020({ allErrors: true, strict: false });
addFormats(partialAjv);
const v01Documents = new Map();
for (const name of schemaFilesIn(v01SchemasDir)) {
  const document = readJson(join(v01SchemasDir, name));
  v01Documents.set(name.replace(/\.schema\.json$/, ''), document);
  partialAjv.addSchema(relaxDocument(document));
}

const partialValidators = new Map();

console.log('');
const conformance = manifest.conformance;
if (!conformance || !Array.isArray(conformance.fixtures)) {
  fail('manifest: no "conformance" section, or it lists no fixtures');
} else {
  checkUnique(conformance.fixtures, 'conformance');
  checkPromotedFilesListed(conformance);
  checkFixtureSchema(conformance);
  checkVectorRecords(conformance);
  checkOracle(conformance);
  checkRuleCoverage(conformance);
  checkMatcherShapes(conformance);
  checkPublished(conformance);
}

/**
 * (e) Every published parity manifest and every published run, against their own schemas.
 *
 * A parity manifest is the one document a reader deciding whether to adopt an implementation is
 * asked to trust, and a run is the evidence under it. Both are published in this repository, so
 * both are checked here rather than only in the repository that produced them: `parity/*.json`
 * against `parity/MANIFEST.schema.json`, `results/<implementation>-<version>/results.json` against
 * `results.schema.json`.
 *
 * Beyond the schemas, three things no schema can state:
 *   - every fixture id either document names is one the conformance index lists, so a rename or a
 *     typo cannot leave a published claim pointing at nothing;
 *   - a published run directory carries a README, because a run with no provenance — which driver,
 *     which release, which protocol ref, when — is not evidence a reader can use;
 *   - where a run and a manifest are about the same implementation and version, the run's
 *     fail-or-error set equals the manifest's `failing[]` EXACTLY, which is the rule PARITY.md
 *     states and the implementation's own CI asserts. Checking it here too means the published pair
 *     cannot drift apart in this repository.
 */
function checkPublished(section) {
  const parityDir = join(repoRoot, 'conformance', 'parity');
  const resultsDir = join(repoRoot, 'conformance', 'results');
  const fixtureIds = new Set(section.fixtures.map((f) => f.id));

  // Its own Ajv. The parity schema states its conditional requirements as `if`/`then` subschemas
  // (`disposition: "planned"` -> `plannedFor` is required, and not legal on `fixed` or `ignored`),
  // and Ajv's strictRequired refuses a `required` in a subschema that does not restate the property
  // beside it. Restating them would say the same thing twice in the published schema for the
  // benefit of one linter, so the linter relaxes that one rule instead. Everything else stays
  // strict, and the implementations validate these documents with their own JSON Schema libraries.
  const documents = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(documents);
  const compileDocument = (relative) => {
    const schema = readJson(join(repoRoot, relative));
    return documents.getSchema(schema.$id) ?? documents.compile(schema);
  };

  const manifests = [];
  const manifestFiles = existsSync(parityDir)
    ? readdirSync(parityDir).filter((n) => n.endsWith('.json') && n !== 'MANIFEST.schema.json').sort()
    : [];

  if (manifestFiles.length > 0) {
    const validate = compileDocument('conformance/parity/MANIFEST.schema.json');
    for (const name of manifestFiles) {
      const document = readJson(join(parityDir, name));
      if (!validate(document)) {
        for (const error of validate.errors ?? []) {
          fail(`parity/${name}${error.instancePath}: ${error.message}`);
        }
        continue;
      }
      for (const row of document.failing ?? []) {
        if (!fixtureIds.has(row.id)) {
          fail(`parity/${name}: declares a failing fixture the index does not list — ${row.id}`);
        }
      }
      manifests.push({ name, document });
    }
    const rows = manifests.reduce((n, m) => n + (m.document.failing?.length ?? 0), 0);
    console.log(
      `OK    parity: ${manifests.length} manifest(s) validate, ${rows} declared failing row(s), ` +
        'every id one the index lists',
    );
  }

  const runDirectories = existsSync(resultsDir)
    ? readdirSync(resultsDir).filter((n) => statSync(join(resultsDir, n)).isDirectory()).sort()
    : [];

  if (runDirectories.length === 0) return;

  const validate = compileDocument('conformance/results.schema.json');
  let checked = 0;
  for (const directory of runDirectories) {
    const where = `results/${directory}`;
    const runPath = join(resultsDir, directory, 'results.json');
    if (!existsSync(runPath)) {
      fail(`${where}: a published run directory carries results.json — the run this is evidence of`);
      continue;
    }
    if (!existsSync(join(resultsDir, directory, 'README.md'))) {
      fail(`${where}: no README.md — a published run states its provenance, or it is not evidence`);
    }

    const run = readJson(runPath);
    if (!validate(run)) {
      for (const error of validate.errors ?? []) {
        fail(`${where}/results.json${error.instancePath}: ${error.message}`);
      }
      continue;
    }
    checked += 1;

    for (const result of run.results) {
      if (!fixtureIds.has(result.id)) {
        fail(`${where}/results.json: reports a fixture the index does not list — ${result.id}`);
      }
    }

    const about = manifests.filter(
      (m) =>
        m.document.implementation === run.implementation.name &&
        m.document.version === run.implementation.version,
    );
    if (about.length !== 1) continue;

    const { name, document } = about[0];
    const observed = new Set(
      run.results.filter((r) => r.outcome === 'fail' || r.outcome === 'error').map((r) => r.id),
    );
    const declared = new Set(document.failing.map((row) => row.id));
    for (const id of observed) {
      if (!declared.has(id)) fail(`${where}: fails ${id}, which parity/${name} does not declare`);
    }
    for (const id of declared) {
      if (!observed.has(id)) fail(`parity/${name}: declares ${id}, which ${where} does not fail`);
    }
    const skipped = run.results.filter((r) => r.outcome === 'skipped').map((r) => r.id);
    for (const id of skipped) {
      fail(`${where}: skipped ${id}; a skip is legitimate only where the manifest declares one`);
    }
    console.log(
      `OK    ${where}: ${String(run.summary.passed)} passed, ${String(run.summary.failed)} failed, ` +
        `${String(run.summary.errored)} errored, ${String(run.summary.skipped)} skipped of ` +
        `${String(run.summary.total)} — the failing set is exactly parity/${name}`,
    );
  }
  console.log(`OK    results: ${String(checked)} published run(s) validate against results.schema.json`);
}

/** The promoted fixture document a manifest row names, or null when it is missing. */
function readPromoted(entry) {
  const path = join(fixturesDir, entry.file);
  if (!existsSync(path)) {
    fail(`${entry.id}: manifest names a promoted fixture that does not exist — ${entry.file}`);
    return null;
  }
  const document = readJson(path);
  if (document.id !== entry.id) {
    fail(`${entry.id}: the file says its id is ${JSON.stringify(document.id)} — a promoted fixture is copied unchanged, ids included`);
  }
  return document;
}

/**
 * Every promoted file on disk is claimed by the manifest exactly once.
 *
 * An unlisted file is never run by a driver — a driver reads the manifest, not the
 * directory — so a fixture nobody listed is a fixture nobody checks.
 */
function checkPromotedFilesListed(section) {
  const sets = Object.keys(section.sets ?? {});
  let unlisted = 0;
  let onDisk = 0;
  for (const set of sets) {
    const dir = join(fixturesDir, set);
    if (!existsSync(dir)) {
      fail(`conformance: the manifest names a set with no directory — conformance/fixtures/${set}/`);
      continue;
    }
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      onDisk += 1;
      if (!seenFiles.has(`${set}/${name}`)) {
        fail(`${set}/${name}: promoted fixture file is not listed in MANIFEST.json`);
        unlisted += 1;
      }
    }
  }
  if (unlisted === 0) {
    console.log(`OK    manifest covers all ${onDisk} promoted file(s) in ${sets.join('/, ')}/`);
  }
}

/**
 * (b) Every promoted document validates against the format it is written in.
 *
 * The declarative fixtures against conformance/fixture.schema.json — the same closed
 * key sets the reference runner enforces, so a document this accepts is a document
 * that runner will run rather than refuse. The byte vectors are a different shape and
 * go against conformance/canonical-vector.schema.json.
 */
function checkFixtureSchema(section) {
  const validateFixture = compile('conformance/fixture.schema.json');
  const validateVector = compile('conformance/canonical-vector.schema.json');
  let declarative = 0;
  let vectors = 0;
  for (const entry of section.fixtures) {
    const document = readPromoted(entry);
    if (document === null) continue;
    const isVector = entry.set === 'canonical';
    const validate = isVector ? validateVector : validateFixture;
    if (validate(document)) {
      if (isVector) vectors += 1;
      else declarative += 1;
      continue;
    }
    console.log(`FAIL  ${entry.id}  ->  ${isVector ? 'canonical-vector' : 'fixture'}.schema.json`);
    for (const err of validate.errors ?? []) {
      const at = err.instancePath || '(root)';
      console.log(`        ${at} ${err.message}${err.params ? ' ' + JSON.stringify(err.params) : ''}`);
    }
    fail(`${entry.id}: does not validate against the ${isVector ? 'canonical vector' : 'fixture'} format`);
  }
  console.log(
    `OK    format: ${declarative} declarative fixture(s) and ${vectors} byte vector(s) validate`,
  );
}

/**
 * (b2) Every byte vector's record is an Affidavit the v0.1 schema accepts.
 *
 * `canonical-vector.schema.json` says an `input` is an object, and no more: the vector
 * format is about the vector, not about the document inside it. SR-1 is the stronger
 * claim — *the canonical form of a filed proposal is a deterministic byte sequence over
 * the Affidavit and its accepted amendments* — and "the Affidavit" is the record
 * `schemas/0.1.0/affidavit.schema.json` defines (AF-1, AF-5). A vector whose input is
 * not that record pins the bytes of a document this protocol does not have.
 *
 * That is not hypothetical. The seven vectors promoted at v0.1.0 came from the
 * TypeScript reference implementation before it was aligned to the v0.1 wire, and every
 * one of them described a seed-shaped record: `operationType: "WriteUpdate"`,
 * `allowedValues` and `pattern` on the fields, `warnings` and `requiresConfirmation` on
 * the record, `evidence` where a tag now says `note`, and no `protocolVersion`,
 * `conversationTurn` or `createdAt` at all. Nothing here refused them, so they were
 * promoted, tagged and re-vendored by two drivers. This is the check that would have
 * caught it, and it runs on every push.
 *
 * Both ends of an amended vector are checked. `input` is the proposal; `amendedInput`
 * is the accepted state its amendments produce, which is the document the bytes are
 * actually taken over — so it is the one an execution grant binds to, and the one that
 * most has to be a record the protocol describes.
 */
function checkVectorRecords(section) {
  const affidavit = compile('schemas/0.1.0/affidavit.schema.json');
  let valid = 0;
  let refused = 0;
  for (const entry of section.fixtures) {
    if (entry.set !== 'canonical') continue;
    const document = readPromoted(entry);
    if (document === null) continue;
    for (const property of ['input', 'amendedInput']) {
      const record = document[property];
      if (record === undefined) continue;
      if (affidavit(record)) {
        valid += 1;
        continue;
      }
      refused += 1;
      console.log(`FAIL  ${entry.id} ${property}  ->  schemas/0.1.0/affidavit.schema.json`);
      for (const err of affidavit.errors ?? []) {
        const at = err.instancePath || '(root)';
        console.log(`        ${at} ${err.message}${err.params ? ' ' + JSON.stringify(err.params) : ''}`);
      }
      fail(
        `${entry.id}: its ${property} is not an Affidavit the v0.1 schema accepts — SR-1's ` +
          `canonical form is over the Affidavit as schemas/0.1.0/affidavit.schema.json defines it`,
      );
    }
  }
  if (refused === 0) {
    console.log(`OK    vectors: ${String(valid)} canonical record(s) validate against the Affidavit schema`);
  } else {
    console.log(
      `      vectors: ${String(valid)} canonical record(s) validate against the Affidavit schema, ` +
        `${String(refused)} refused`,
    );
  }
}

/** The fixture ids and the defect sentences ORACLE.md's table states, keyed by id. */
function readOracleTable() {
  const path = join(repoRoot, 'conformance', 'ORACLE.md');
  const byId = new Map();
  if (!existsSync(path)) {
    fail('conformance: ORACLE.md is missing — the negative-oracle list is not optional');
    return byId;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, line.lastIndexOf('|')).split('|').map((c) => c.trim());
    if (cells.length !== 3) continue;
    if (/^:?-+:?$/.test(cells[0])) continue;
    if (cells[0].startsWith('Shipped defect')) continue;
    for (const [, id] of cells[2].matchAll(/`([^`]+)`/g)) {
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push({ defect: cells[0], rules: cells[1].split(',').map((r) => r.trim()) });
    }
  }
  return byId;
}

/**
 * (c) The manifest's oracle entries and ORACLE.md's table are the same list.
 *
 * The negative oracle is the rule that a fixture whose rule a known defective release
 * violates is accepted only if it FAILS against that release — a fixture a broken
 * implementation passes is not a test. The list is stated twice, in prose for a reader
 * and as data for a driver, and this is what keeps the two honest.
 */
function checkOracle(section) {
  const table = readOracleTable();
  const inManifest = new Map();
  for (const entry of section.fixtures) {
    if (entry.oracle === null || entry.oracle === undefined) continue;
    inManifest.set(entry.id, entry.oracle);
  }
  for (const [id, rows] of table) {
    const stated = inManifest.get(id);
    if (stated === undefined) {
      fail(`oracle: ORACLE.md says ${id} must fail on the defective release and the manifest gives it no oracle entry`);
      continue;
    }
    const defects = rows.map((row) => row.defect);
    if (!defects.includes(stated.defect)) {
      fail(`oracle: ${id}'s defect sentence is not one ORACLE.md states for it`);
    }
    if (!Array.isArray(stated.mustFailOn) || stated.mustFailOn.length === 0) {
      fail(`oracle: ${id} names no release it must fail on`);
    }
  }
  for (const id of inManifest.keys()) {
    if (!table.has(id)) {
      fail(`oracle: the manifest gives ${id} an oracle entry that ORACLE.md's table does not list`);
    }
  }
  const multi = [...table].filter(([, rows]) => rows.length > 1).map(([id]) => id);
  console.log(
    `OK    oracle: ${table.size} fixture(s) must fail on ${[...new Set([...inManifest.values()].flatMap((o) => o.mustFailOn))].join(', ')}` +
      (multi.length === 0 ? '' : ` (${multi.join(', ')} refute more than one defect; the manifest carries the first)`),
  );
}

/** Every rule heading in INVARIANTS.md, with the fixture ids its *Checked by* line cites. */
function readRules() {
  const path = join(repoRoot, 'INVARIANTS.md');
  if (!existsSync(path)) {
    fail('INVARIANTS.md is missing — the coverage lint has nothing to check against');
    return [];
  }
  const rules = [];
  let current = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const heading = /^###\s+([A-Z]{2}-\d+)\s+—/.exec(line);
    if (heading) {
      current = { id: heading[1], body: [] };
      rules.push(current);
      continue;
    }
    if (line.startsWith('# ') || line.startsWith('## ')) current = null;
    else if (current !== null) current.body.push(line);
  }
  for (const rule of rules) {
    const body = rule.body.join('\n');
    const start = body.indexOf(CHECKED_BY);
    if (start < 0) {
      rule.cites = [];
      continue;
    }
    // *Checked by:* runs to the next labelled clause on the same rule. A `wire/`
    // citation is deliberately NOT a check — it means "this rule constrains this
    // shape" — and a suite:/lint:/guard: entry is a supplement, never a substitute.
    let clause = body.slice(start + CHECKED_BY.length);
    for (const stop of ['*Source:*', '*Constrains:*']) {
      const end = clause.indexOf(stop);
      if (end >= 0) clause = clause.slice(0, end);
    }
    rule.cites = [...clause.matchAll(/`([^`]+)`/g)]
      .map(([, cite]) => cite)
      .filter((cite) => PROMOTED_SET.test(cite));
  }
  return rules;
}

/**
 * (a) The coverage lint, both ways.
 *
 * Forward: every rule INVARIANTS.md states must be checked by at least one promoted
 * fixture that exists and whose own `rules[]` names it back — a citation the fixture
 * does not reciprocate is a rule nobody actually checks. A rule may be excused only
 * by name in coverage-exemptions.json, with a version and a reason.
 *
 * Backward: every rule id a promoted fixture names must be a rule that exists — a
 * fixture citing `AF-9` is a fixture whose claim about the rulebook is unreadable.
 */
function checkRuleCoverage(section) {
  const rules = readRules();
  if (rules.length === 0) return;
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const byId = new Map(section.fixtures.map((entry) => [entry.id, entry]));

  const exemptionsPath = join(repoRoot, 'conformance', 'lint', 'coverage-exemptions.json');
  const exemptions = existsSync(exemptionsPath) ? readJson(exemptionsPath).exemptions ?? [] : [];
  const exempt = new Map(exemptions.map((entry) => [entry.rule, entry]));
  for (const rule of exempt.keys()) {
    if (!ruleIds.has(rule)) fail(`coverage: the exemption file excuses ${rule}, which INVARIANTS.md does not define`);
  }

  // Backward, first: a fixture naming a rule that does not exist.
  for (const entry of section.fixtures) {
    if (!Array.isArray(entry.rules) || entry.rules.length === 0) {
      fail(`${entry.id}: a promoted fixture must name at least one rule it checks`);
      continue;
    }
    for (const rule of entry.rules) {
      if (!ruleIds.has(rule)) fail(`${entry.id}: names ${rule}, which INVARIANTS.md does not define`);
    }
  }

  // Forward, with the per-rule report.
  console.log('coverage — every rule in INVARIANTS.md against the promoted fixtures:');
  let covered = 0;
  let excused = 0;
  for (const rule of rules) {
    const reciprocating = [];
    for (const cite of rule.cites) {
      const fixture = byId.get(cite);
      if (fixture === undefined) {
        fail(`coverage: ${rule.id} cites ${cite}, which the promoted suite does not contain`);
        continue;
      }
      if (!fixture.rules.includes(rule.id)) {
        console.log(`WARN  ${rule.id.padEnd(6)} cites ${cite}, whose rules[] does not name it back`);
        continue;
      }
      reciprocating.push(cite);
    }
    // Named by a fixture without being cited back is coverage too — the fixture is the
    // check, and the citation is the index into it — so it is reported, not required.
    const namedBy = section.fixtures
      .filter((entry) => entry.rules.includes(rule.id) && !reciprocating.includes(entry.id))
      .map((entry) => entry.id);
    const exemption = exempt.get(rule.id);
    if (reciprocating.length === 0) {
      if (exemption === undefined) {
        fail(
          `coverage: ${rule.id} is checked by no promoted fixture and is not in coverage-exemptions.json — ` +
            `a rule with zero fixtures is a rule nothing enforces`,
        );
        console.log(`FAIL  ${rule.id.padEnd(6)}  0 fixtures, no exemption`);
      } else {
        excused += 1;
        console.log(
          `EXEMPT ${rule.id.padEnd(5)} until ${String(exemption.until)} — ${exemption.reason}` +
            (namedBy.length === 0 ? '' : `  [also named by ${namedBy.length} fixture(s)]`),
        );
      }
      continue;
    }
    covered += 1;
    console.log(
      `RULE  ${rule.id.padEnd(6)} ${String(reciprocating.length).padStart(2)} fixture(s)  ${reciprocating.join(', ')}` +
        (namedBy.length === 0 ? '' : `  [+${String(namedBy.length)} naming it uncited]`),
    );
  }
  console.log(
    `OK    coverage: ${covered} of ${rules.length} rule(s) checked by a promoted fixture, ${excused} exempt by name`,
  );
}

// --- (d) the matchers against the v0.1 wire schemas, as partials ------------

/**
 * A copy of a v0.1 schema document with `required` dropped and `additionalProperties`
 * opened, all the way down — `$id`, `$defs` and `$ref` left alone so references (the
 * recursive `jsonValue` among them) still resolve.
 *
 * "As a partial" means exactly this: a matcher states the keys its rule is about and
 * nothing else, so a required key it does not state is not a mismatch — but the keys
 * it DOES state must still be the shape the wire says they are.
 */
function relaxDocument(node) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(relaxDocument);
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'required' || key === 'additionalProperties') continue;
    out[key] = relaxDocument(value);
  }
  return out;
}

/** A validator for one property of one v0.1 schema, with the requirements relaxed. */
function partialValidator(stem, pointer) {
  const key = `${stem}${pointer}`;
  if (partialValidators.has(key)) return partialValidators.get(key);
  const document = v01Documents.get(stem);
  let validate = null;
  if (document !== undefined) {
    try {
      validate = partialAjv.compile({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $ref: `${document.$id}#${pointer}`,
      });
    } catch {
      validate = null;
    }
  }
  partialValidators.set(key, validate);
  return validate;
}

/**
 * A copy of `value` with every `"@some"` dropped.
 *
 * A fixture cannot state a derived entry id — the id is a hash of the proposal — so it
 * writes `"@some"` to assert only that the link is there (RUNNER.md §5). That is a
 * statement about presence, not about shape, and the wire schema has nothing to say
 * about it.
 */
function withoutSentinels(value) {
  if (value === '@some') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(withoutSentinels);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const kept = withoutSentinels(item);
    if (kept !== undefined) out[key] = kept;
  }
  return out;
}

/** Whether a v0.1 schema document has the property a pointer names, without following refs. */
function hasPointer(stem, pointer) {
  let node = v01Documents.get(stem);
  for (const step of pointer.split('/').filter(Boolean)) {
    if (node === null || node === undefined || typeof node !== 'object') return false;
    node = node[step];
  }
  return node !== undefined;
}

/**
 * (d) The matchers inside the promoted fixtures against the v0.1 wire schemas.
 *
 * A fixture's `expect.entry` and `expect.card` are partial matchers over a Docket row
 * and an Evidence Card, so the values they state are values the v0.1 schemas describe.
 * Checking them here is what stops the two halves of this repository — the schemas and
 * the behaviour suite — from drifting into describing different protocols.
 *
 * Most of what this finds is not a defect: a matcher key may legitimately be a
 * projection of something the wire spells differently (`bound`, `priorSources`), or a
 * reviewer-facing fact the wire does not carry, or one of the two sentinels a fixture
 * uses where it cannot know a derived value. Those are printed as findings and named
 * as such. A TYPE mismatch is different — the schemas and the fixtures disagreeing
 * about what shape a value has — and it fails the lint.
 */
function checkMatcherShapes(section) {
  const findings = [];
  const noCounterpart = new Map();
  let checkedKeys = 0;

  const check = (where, id, rawValue, stem, pointer, path) => {
    // A stated `null` says "there is none" — a fact about presence, not about shape —
    // so there is nothing to check. `"@some"` is the sentinel for a link whose id a
    // fixture cannot know (RUNNER.md §5); it is dropped wherever it appears, because
    // it stands for "some entry id", not for a value the wire schema describes.
    const value = withoutSentinels(rawValue);
    if (value === null || value === undefined) return;
    if (!hasPointer(stem, pointer)) {
      const key = `${where} → ${stem}${pointer}`;
      noCounterpart.set(key, (noCounterpart.get(key) ?? 0) + 1);
      return;
    }
    const validate = partialValidator(stem, pointer);
    if (validate === null) {
      findings.push(`${id}: ${path} — the v0.1 subschema ${stem}${pointer} could not be compiled for a partial check`);
      return;
    }
    checkedKeys += 1;
    if (validate(value)) return;
    for (const err of validate.errors ?? []) {
      const at = `${path}${err.instancePath}`;
      const line = `${id}: ${at} ${err.message}${err.params ? ' ' + JSON.stringify(err.params) : ''}`;
      if (err.keyword === 'type') {
        console.log(`FAIL  ${line}`);
        fail(`matchers: ${line} — the fixtures and the v0.1 schemas disagree about a shape`);
      } else {
        findings.push(line);
      }
    }
  };

  const checkObject = (id, matcher, stem, path, family) => {
    if (matcher === null || typeof matcher !== 'object') return;
    for (const [key, value] of Object.entries(matcher)) {
      if (DERIVED_MATCHER_KEYS.has(key)) continue;
      if (key === 'fields' || key === 'affidavit' || key === 'amendedAffidavit') continue;
      const override = MATCHER_OVERRIDES[`${family}.${key}`];
      const target = override ?? [stem, `/properties/${key}`];
      check(`${family}.${key}`, id, value, target[0], target[1], `${path}.${key}`);
    }
  };

  const checkFields = (id, fields, path, family) => {
    if (!Array.isArray(fields)) return;
    for (const [index, field] of fields.entries()) {
      checkObject(id, field, 'affidavit-field', `${path}[${String(index)}]`, family);
    }
  };

  for (const entry of section.fixtures) {
    if (entry.set === 'canonical') continue;
    const document = readPromoted(entry);
    if (document === null) continue;
    const expectation = document.expect ?? {};

    for (const which of ['entry', 'superseded']) {
      const row = expectation[which];
      if (row === null || row === undefined) continue;
      checkObject(entry.id, row, 'docket-entry', `expect.${which}`, 'entry');
      for (const affidavit of ['affidavit', 'amendedAffidavit']) {
        const value = row[affidavit];
        if (value === null || value === undefined) continue;
        checkObject(entry.id, value, 'affidavit', `expect.${which}.${affidavit}`, 'affidavit');
        checkFields(entry.id, value.fields, `expect.${which}.${affidavit}.fields`, 'affidavit.field');
      }
    }

    const card = expectation.card;
    if (card === null || card === undefined) continue;
    checkObject(entry.id, card, 'evidence-card-request', 'expect.card', 'card');
    checkFields(entry.id, card.fields, 'expect.card.fields', 'card.field');
  }

  if (noCounterpart.size > 0) {
    console.log('matchers — stated keys with no property of that name on the v0.1 schema (a projection, or a fact the wire does not carry):');
    for (const [key, count] of [...noCounterpart].sort()) {
      console.log(`      ${key}  (${String(count)} fixture(s))`);
    }
  }
  if (findings.length > 0) {
    console.log(`matchers — ${String(findings.length)} finding(s), none of them a type mismatch:`);
    for (const finding of findings) console.log(`      ${finding}`);
  }
  console.log(
    `OK    matchers: ${checkedKeys} stated key(s) checked against a v0.1 subschema as a partial`,
  );
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `${checked} seed fixture(s) validated; ` +
    `${manifest['0.1.0'].fixtures.length} v0.1 fixture(s) checked (positives validated, negatives refused); ` +
    `0 problems.`,
);
