import assert from 'node:assert/strict';
import test from 'node:test';
import { DraftSession } from '../src/draft-session.ts';
import type { HouseRuntime } from '../src/house.ts';
function fixture() {
  const kept = new Map<string, any>(); let serial = 0;
  const saves: unknown[] = [];
  const runtime = { roomDraft: {
    read: async (_room: string, path: string) => structuredClone(kept.get(path) ?? null),
    write: async (room: string, path: string, revision: string | null, parts: any) => {
      const prior = kept.get(path) ?? null;
      if ((prior?.revision ?? null) !== revision) return { outcome: 'stale', current: structuredClone(prior) };
      const next = { room, path, revision: String(++serial), parts: structuredClone(parts), returned: prior?.returned ?? null, changedUnderneath: {} };
      for (const part of ['fields','sections']) for (const key of Object.keys(next.parts[part] ?? {})) {
        if (prior?.parts[part]?.[key]) next.parts[part][key].base = prior.parts[part][key].base;
      }
      kept.set(path, next); return { outcome: 'written', roomDraft: structuredClone(next) };
    },
  }, save: async (_room: string, entries: any[]) => { saves.push(entries); for (const entry of entries) kept.delete(entry.path); return { outcome: 'saved', identifier: 'local-queue' }; } } as unknown as HouseRuntime;
  return { runtime, kept, saves };
}
test('drafts hydrate through a fresh session using the same durable Runtime, without automatic Save', async () => {
  const f = fixture(), first = new DraftSession(f.runtime,'room','drawing.md');
  await first.stage({ sections: { Scene: { value:'draft scene',base:'opened scene' } } });
  const reload = new DraftSession(f.runtime,'room','drawing.md');
  assert.equal((await reload.read())?.parts.sections?.Scene.value,'draft scene');
  assert.equal(f.saves.length,0);
});
test('rapid changes serialize and keep original bases; commit is explicit and local', async () => {
  const f=fixture(),session=new DraftSession(f.runtime,'room','drawing.md');
  await Promise.all(['one','two','three'].map(value=>session.stage({fields:{title:{value,base:{value:'original'}}}})));
  assert.equal(session.current()?.parts.fields?.title.value,'three');
  assert.deepEqual(session.current()?.parts.fields?.title.base,{value:'original'});
  assert.equal(f.saves.length,0);assert.equal(await session.commit(),'local-queue');assert.equal(f.saves.length,1);
});
test('a stale revision reconciles disjoint concurrent parts without overwriting them', async () => {
  const f=fixture(),one=new DraftSession(f.runtime,'room','drawing.md'),two=new DraftSession(f.runtime,'room','drawing.md');
  await Promise.all([one.read(),two.read()]);
  await one.stage({fields:{title:{value:'other title',base:{value:'original'}}}});
  await two.stage({sections:{Scene:{value:'new canvas',base:'original canvas'}}});
  assert.equal(two.current()?.parts.fields?.title.value,'other title');
  assert.deepEqual(two.current()?.parts.fields?.title.base,{value:'original'});
  assert.equal(two.current()?.parts.sections?.Scene.value,'new canvas');
});
test('same-browser overlapping input wins after rereading the current revision, preserving first bases', async () => {
  const f=fixture(),one=new DraftSession(f.runtime,'room','drawing.md'),two=new DraftSession(f.runtime,'room','drawing.md');
  await Promise.all([one.read(),two.read()]);
  await one.stage({fields:{title:{value:'earlier input',base:{value:'original'}}}});
  await two.stage({fields:{title:{value:'later input',base:{value:'original'}}}});
  assert.equal(f.kept.get('drawing.md').parts.fields.title.value,'later input');
  assert.deepEqual(f.kept.get('drawing.md').parts.fields.title.base,{value:'original'});
  assert.equal(f.saves.length,0);
});
test('runtime Room Draft observation redraws other sessions, with no recovery paths or added document types', async () => {
  const f=fixture(),one=new DraftSession(f.runtime,'room','drawing.md'),two=new DraftSession(f.runtime,'room','drawing.md');
  await Promise.all([one.read(),two.read()]);
  const updates:any[]=[];const off=two.subscribe(draft=>updates.push(draft));
  await one.stage({fields:{title:{value:'shared text',base:{value:'original'}}}});
  two.accept(f.kept.get('drawing.md'));
  assert.equal(updates.at(-1).parts.fields.title.value,'shared text');
  assert.deepEqual([...f.kept.keys()],['drawing.md']);
  off();two.accept(null);assert.equal(updates.length,1);
});
