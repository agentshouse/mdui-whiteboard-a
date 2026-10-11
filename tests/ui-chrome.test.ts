import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
test('Whiteboard has document controls and actionable warnings without added Room/sync chrome', () => {
 const source = fs.readFileSync('src/Whiteboard.tsx', 'utf8');
 assert.doesNotMatch(source, /aria-label="Room for new drawings"|\{r\.name\}|Synced to House|Syncing to House|Offline ·/);
 assert.match(source, /aria-label="Open drawing"/);
 assert.doesNotMatch(source, /Unsaved changes|beforeunload|mayLeave/);
 assert.match(source, /multiple data bindings/);
 assert.match(source, /rooms\?\.length === 1/);
 assert.match(source, /sync\?\.lastCompleted != null/);
 assert.doesNotMatch(source, /initialData && !bindingError/);
 for (const warning of ['connection refused','returned changes that need attention','storage warning','publishing is paused']) assert.ok(source.includes(warning));
});
