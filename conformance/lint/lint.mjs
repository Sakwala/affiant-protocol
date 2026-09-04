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
