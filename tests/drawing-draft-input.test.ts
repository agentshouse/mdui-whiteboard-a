import assert from 'node:assert/strict';
import test from 'node:test';
import { DrawingDraftInput } from '../src/drawing-draft-input.ts';
import { DraftSession } from '../src/draft-session.ts';
import { parseScene, serializeScene, type Drawing, type HouseRuntime, type Scene } from '../src/house.ts';
const empty: Scene = { elements: [], appState: { viewBackgroundColor: '#fff' }, files: {} };
const element = (id: string) => ({ id, type: 'rectangle', x: 1, y: 1, width: 10, height: 10 });
function fixture() {
  const kept = new Map<string, any>(); let revision = 0, failNext = false;
  const saves: any[] = [];
  const runtime = { roomDraft: {
    read: async (_room: string, path: string) => structuredClone(kept.get(path) ?? null),
    write: async (room: string, path: string, base: string | null, parts: any) => {
      if (failNext) { failNext = false; throw new Error('local write failed'); }
      const prior = kept.get(path);
      if ((prior?.revision ?? null) !== base) return { outcome: 'stale', current: prior };
      const next = { room, path, revision: String(++revision), parts: structuredClone(parts) };
      for (const group of ['fields', 'sections']) for (const key of Object.keys(next.parts[group] ?? {})) if (prior?.parts[group]?.[key]) next.parts[group][key].base = prior.parts[group][key].base;
      kept.set(path, next); return { outcome: 'written', roomDraft: structuredClone(next) };
    },
  }, save: async (_room: string, entries: any[]) => { saves.push(entries.map(entry => structuredClone(kept.get(entry.path)))); entries.forEach(entry => kept.delete(entry.path)); return { outcome: 'saved', identifier: 'queued' }; } } as unknown as HouseRuntime;
  const drawing: Drawing = { room: 'room', path: 'drawings/one.md', id: 'one', title: 'Opened title', updated_at: '2026-10-11T00:00:00Z', sceneText: serializeScene(empty) };
  const session = new DraftSession(runtime, drawing.room, drawing.path), input = new DrawingDraftInput(session, drawing);
  return { runtime, drawing, session, input, kept, saves, fail: () => { failNext = true; } };
}
test('a failed title cannot be cleared by a successful canvas or saved until its own retry', async () => {
  const f = fixture(); f.fail(); await assert.rejects(f.input.title('Unkept title'), /local write failed/);
  await f.input.scene(empty, { ...empty, elements: [element('a')] });
  await assert.rejects(f.input.flush(), /could not be kept: title/);
  assert.equal(f.input.preview(await f.input.read()).title, 'Unkept title');
  assert.equal(f.saves.length, 0);
  await f.input.title('Unkept title'); await f.input.flush(); await f.session.commit();
  assert.equal(f.saves[0][0].parts.fields.title.value, 'Unkept title');
});
test('retrying a failed canvas delta preserves another tab and later disjoint local changes', async () => {
  const f = fixture(), first = { ...empty, elements: [element('a')] };
  f.fail(); await assert.rejects(f.input.scene(empty, first), /local write failed/);
  const other = new DraftSession(f.runtime, f.drawing.room, f.drawing.path);
  await other.stage({ sections: { Scene: { value: serializeScene({ ...empty, elements: [element('remote')] }), base: f.drawing.sceneText } } });
  await f.input.title('Different field'); await assert.rejects(f.input.flush(), /canvas/);
  await f.input.scene(first, { ...first, elements: [...first.elements, element('b')] });
  await f.input.flush();
  const scene = parseScene(f.kept.get(f.drawing.path).parts.sections.Scene.value);
  assert.deepEqual(scene.elements.map(value => value.id).sort(), ['a', 'b', 'remote']);
  assert.equal(f.kept.get(f.drawing.path).parts.sections.Scene.base, f.drawing.sceneText);
  await f.session.commit(); assert.equal(f.saves.length, 1);
});
test('rapid queued canvas edits retry an earlier rejected delta before clearing its failure', async () => {
  const f = fixture(), first = { ...empty, elements: [element('a')] };
  f.fail();
  const failed = f.input.scene(empty, first);
  const later = f.input.scene(first, { ...first, elements: [...first.elements, element('b')] });
  await assert.rejects(failed, /local write failed/); await later; await f.input.flush();
  assert.deepEqual(parseScene(f.kept.get(f.drawing.path).parts.sections.Scene.value).elements.map(value => value.id), ['a', 'b']);
});
test('retrying only one failed input leaves the other blocked and another drawing editable', async () => {
  const f = fixture(); f.fail(); await assert.rejects(f.input.title('Raw title'));
  f.fail(); await assert.rejects(f.input.scene(empty, { ...empty, elements: [element('a')] }));
  await f.input.title('Raw title'); await assert.rejects(f.input.flush(), /canvas/);
  const otherDrawing = { ...f.drawing, path: 'drawings/two.md', id: 'two' };
  const otherSession = new DraftSession(f.runtime, otherDrawing.room, otherDrawing.path), other = new DrawingDraftInput(otherSession, otherDrawing);
  await other.title('Other drawing'); await other.flush(); await otherSession.commit();
  assert.equal(f.saves.length, 1); await assert.rejects(f.input.flush(), /canvas/);
});
