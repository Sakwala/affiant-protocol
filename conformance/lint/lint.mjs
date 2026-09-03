// Validates every schema-relevant conformance fixture against the schema the manifest
// assigns it. The fixtures are hand-authored examples, not captures: their key sets are
// asserted against the shipped .NET serializer by the hosts' wire-shape tests, but their
// values are illustrative. So a failure here means the schema and the example disagree;
// decide which is right against the .NET serializer.
//
// It also checks that the manifest names every wire fixture file exactly once, that no
// manifest id or file is duplicated, and that every enum set the manifest maps to a schema
// matches that schema's `enum` exactly, in order.
//
// Run: node conformance/lint/lint.mjs   (from the repository root, or anywhere)

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const fixturesDir = join(repoRoot, 'conformance', 'fixtures');
const schemasDir = join(repoRoot, 'schemas');
const manifestPath = join(fixturesDir, 'MANIFEST.json');

const failures = [];
const fail = (message) => failures.push(message);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (!existsSync(manifestPath)) {
  console.error(`FATAL  manifest not found: ${manifestPath}`);
  process.exit(1);
}
const manifest = readJson(manifestPath);

// Load every schema in schemas/ so that $ref between them resolves by $id.
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const name of readdirSync(schemasDir).filter((n) => n.endsWith('.schema.json')).sort()) {
  ajv.addSchema(readJson(join(schemasDir, name)));
}

const compiled = new Map();
const compile = (schemaRelPath) => {
  if (compiled.has(schemaRelPath)) return compiled.get(schemaRelPath);
  const schema = readJson(join(repoRoot, schemaRelPath));
  const validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  compiled.set(schemaRelPath, validate);
  return validate;
};

console.log(`affiant-protocol fixture lint — protocolVersion ${manifest.protocolVersion}`);
const derivedFrom = manifest.derivedFrom ?? {};
console.log('the wire fixtures are hand-authored examples; their shapes were asserted against:');
console.log(`  framework  ${derivedFrom.framework}`);
console.log(`  hosts      ${derivedFrom.hosts}`);
console.log(`  date       ${derivedFrom.date}`);
console.log('');

let checked = 0;

// (b) No manifest entry may repeat an id or a file — a duplicate would otherwise be
// validated twice and silently inflate the count.
const seenIds = new Set();
const seenFiles = new Set();
let duplicates = 0;
for (const entry of manifest.fixtures) {
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
  console.log(`OK    manifest: ${manifest.fixtures.length} entries, no duplicate id or file`);
}

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

// (a) Every wire fixture file on disk must be claimed by the manifest — an unlisted file is
// never validated, so it must not exist unnoticed.
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

// The enum sets the manifest lists must exist in the enum fixture, and (c) where the manifest
// maps a set to a schema, the set and that schema's `enum` must be identical, in order — the
// order of provenanceSource is normative (it is the determinism ladder).
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
    if (!set.schema) continue;
    const schemaPath = join(repoRoot, set.schema);
    if (!existsSync(schemaPath)) {
      fail(`${set.id}: manifest names a schema that does not exist — ${set.schema}`);
      continue;
    }
    const schemaEnum = readJson(schemaPath).enum;
    if (!Array.isArray(schemaEnum)) {
      fail(`${set.id}: ${set.schema} has no top-level enum to compare against`);
      continue;
    }
    if (JSON.stringify(schemaEnum) !== JSON.stringify(values)) {
      fail(`${set.id}: differs from ${set.schema} enum`);
      console.log(`FAIL  ${set.id}  ==  ${set.schema}`);
      console.log(`        ${manifest.enums.file}: ${JSON.stringify(values)}`);
      console.log(`        ${set.schema}: ${JSON.stringify(schemaEnum)}`);
    } else {
      console.log(`OK    ${set.id}  ==  ${set.schema}`);
    }
  }
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`${checked} schema-relevant fixture(s) validated, 0 problems.`);
