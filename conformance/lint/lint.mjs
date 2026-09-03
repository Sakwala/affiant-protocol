// Validates every schema-relevant conformance fixture against the schema the manifest
// assigns it. The fixtures are the truth: they are byte-for-byte captures of payloads
// a shipped implementation really sends, so a failure here means the schema is wrong,
// not the fixture.
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
console.log(`captured from ${manifest.capturedFrom.framework}, hosts ${manifest.capturedFrom.hosts}, ${manifest.capturedFrom.date}`);
console.log('');

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

// The enum sets the manifest lists must exist in the enum fixture.
const enumsFile = join(fixturesDir, manifest.enums.file);
if (!existsSync(enumsFile)) {
  fail(`enums: manifest names a file that does not exist — ${manifest.enums.file}`);
} else {
  const enums = readJson(enumsFile);
  for (const set of manifest.enums.sets) {
    const key = set.id.replace(/^enum\//, '');
    if (!Array.isArray(enums[key])) {
      fail(`${set.id}: not an array in ${manifest.enums.file}`);
    }
    if (set.schema && !existsSync(join(repoRoot, set.schema))) {
      fail(`${set.id}: manifest names a schema that does not exist — ${set.schema}`);
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
