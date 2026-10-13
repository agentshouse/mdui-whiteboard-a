import { checkCurrentStarter } from './check-current-starter.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {verify, validate} from '@agentshouse/mdmodel';
const source = fs.readFileSync('schema.yaml', 'utf8');
const schema = verify(source);
assert.equal(schema.verdict, 'accept');
assert.deepEqual(Object.keys(schema.model.types).sort(), ['drawing', 'quickdraw_drawing']);
const documents = {};
function walk(directory) {
 for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
  assert(!entry.isSymbolicLink());
  const filename = path.join(directory, entry.name);
  if (entry.isDirectory()) walk(filename);
  else { assert(entry.isFile() && filename.endsWith('.md')); documents[path.relative('starter', filename)] = fs.readFileSync(filename, 'utf8'); }
 }
}
walk('starter');
checkCurrentStarter(documents);
assert.deepEqual(validate(documents, {binaryTargets:[]}, schema.model), {verdict:'accept'});
const seedFile = fs.existsSync('tests/support/donor-seed-changes.json') ? 'tests/support/donor-seed-changes.json' : 'tests/support/samples/seed-changes.json';
const seeds = JSON.parse(fs.readFileSync(seedFile, 'utf8')).changes;
assert.deepEqual(validate(Object.fromEntries(seeds.map(change => [change.path.split('/rooms/whiteboard-port/').pop(), change.content])), {binaryTargets:[]}, schema.model), {verdict:'accept'});
for (const change of seeds) {
 const name = change.path.split('/rooms/whiteboard-port/').pop();
 if (name in documents) assert.equal(documents[name], change.content);
}
const manifest = JSON.parse(fs.readFileSync('app.json', 'utf8'));
assert.equal(manifest.room_slots.length, 1);
assert.equal(manifest.room_slots[0].types.length, 1);
assert(manifest.room_slots[0].types.every(type => type in schema.model.types));
console.log('Template schema, current dual-format starter, licensed seed library and type-filtered manifest passed.');
