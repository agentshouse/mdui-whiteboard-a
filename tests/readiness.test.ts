import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

type Observation = { current(): any; subscribe(fn: (value: any) => void): () => void; close(): void; emit(value: any): void };
function observation(initial: any): Observation {
  let value = initial;
  const listeners = new Set<(value: any) => void>();
  return { current: () => value, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }, close: () => listeners.clear(), emit: next => { value = next; listeners.forEach(fn => fn(value)); } };
}
const browser = new Window();
const globals = globalThis as any;
globals.window = browser;
globals.document = browser.document;
globals.HTMLElement = browser.HTMLElement;
globals.IS_REACT_ACT_ENVIRONMENT = true;
const harness = globals.__whiteboardHarness = { observations: new Map<string, Observation>(), mounts: 0, runtime: {}, drafts: new Map<string, any>(), writes: 0, saves: 0 };
const compiled = path.resolve('tests/.readiness-ui.mjs');
let Whiteboard: React.ComponentType<{ ownerDocument: Document }>;
let root: Root;
let container: HTMLDivElement;
before(async () => {
  await build({ entryPoints: ['src/Whiteboard.tsx'], outfile: compiled, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external', plugins: [{ name: 'synthetic-editor', setup(builder) {
    builder.onResolve({ filter: /^@excalidraw\/excalidraw$/ }, () => ({ path: 'editor', namespace: 'fixture' }));
    builder.onResolve({ filter: /^\.\/house$/ }, args => args.importer.endsWith('Whiteboard.tsx') ? { path: 'house', namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', resolveDir: process.cwd(), contents: args.path === 'house' ? `
      export * from ${JSON.stringify(path.resolve('src/house.ts'))};
      const h = globalThis.__whiteboardHarness;
      export const houseRuntime = async () => h.runtime;
      export const observeDrawings = async () => h.observations.get('query');
      export const observeRoomDrafts = async () => h.observations.get('room-drafts');
      export const observeStorageLoss = async () => h.observations.get('storage-loss');
      export const observeConnectionRefusal = async () => h.observations.get('connection-refusal');
      export const observeServiceMode = async () => h.observations.get('service-mode');
    ` : `
      import React, {useEffect, useState} from 'react';
      export function Excalidraw({onInitialize,onChange,onExcalidrawAPI,initialData}) {
        const [draft,setDraft] = useState(initialData.elements.length ? 'Restored sketch' : '');
        useEffect(() => { globalThis.__whiteboardHarness.mounts++; onExcalidrawAPI({updateScene:value=>setDraft(value.elements.length?'Shared sketch':''),addFiles:()=>{}}); onInitialize({getSceneElements:()=>initialData.elements,getAppState:()=>initialData.appState,getFiles:()=>initialData.files}); }, []);
        return React.createElement('input', { 'aria-label':'Canvas draft',value:draft,onInput:event=>{setDraft(event.currentTarget.value);onChange([{id:'rectangle-1',type:'rectangle',x:0,y:0,width:10,height:10}],{viewBackgroundColor:'#fff'},{});}});
      }
      export const restoreElements = elements => elements;
      export const MainMenu = () => null;
      MainMenu.DefaultItems = Object.fromEntries(['LoadScene','SaveToActiveFile','SaveAsImage','SearchMenu','ClearCanvas','ToggleTheme','Help'].map(name=>[name,()=>null]));
      MainMenu.Separator = () => null;
    ` }));
  } }] });
  Whiteboard = (await import(pathToFileURL(compiled).href)).Whiteboard;
});
after(async () => { await fs.rm(compiled, { force: true }); await browser.happyDOM.close(); });
async function mount(rooms: any[], lastCompleted: string | null, reload = false) {
  if (!reload) { harness.drafts.clear(); harness.writes = 0; harness.saves = 0; }
  harness.observations.clear(); harness.mounts = 0;
  const drawing = {room:'r_board',path:'drawings/one.md',fields:{id:'drawing-one',title:'Existing drawing',updated_at:'2026-10-11T13:00:00Z'},sections:{Scene:JSON.stringify({elements:[],appState:{viewBackgroundColor:'#fff'},files:{}})}};
  for (const [topic,value] of Object.entries({ rooms, 'sync-status':{lastCompleted,attentionRequired:[]}, query:{documents:[drawing]}, 'room-drafts':[...harness.drafts.values()], 'storage-loss':null, 'connection-refusal':null, 'service-mode':'open' })) harness.observations.set(topic,observation(value));
  harness.runtime = {
    observe: async (topic: string) => harness.observations.get(topic),
    roomDraft: {
      read: async (_room: string, path: string) => structuredClone(harness.drafts.get(path) ?? null),
      write: async (room: string, path: string, revision: string | null, parts: any) => {
        const existing = harness.drafts.get(path);
        if ((existing?.revision ?? null) !== revision) return {outcome:'stale',current:structuredClone(existing)};
        const draft = {room,path,revision:String(++harness.writes),parts:structuredClone(parts),returned:null,changedUnderneath:{}};
        harness.drafts.set(path,draft); harness.observations.get('room-drafts')!.emit([...harness.drafts.values()]); return {outcome:'written',roomDraft:structuredClone(draft)};
      },
    },
    save: async (_room: string, entries: any[]) => { harness.saves++; for (const entry of entries) harness.drafts.delete(entry.path); harness.observations.get('room-drafts')!.emit([...harness.drafts.values()]); return {outcome:'saved',identifier:'queued'}; },
  };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(React.createElement(Whiteboard,{ownerDocument:document})); });
}
async function emit(topic: string, value: any) { await act(async () => { harness.observations.get(topic)!.emit(value); }); }
async function unmount() { await act(async () => root.unmount()); container.remove(); }
const rooms = [{locator:'r_board',name:'Whiteboard'}];
const button = (name: string) => [...container.querySelectorAll('button')].find(item=>item.textContent===name)!;

test('Whiteboard waits for first sync, diagnoses completed invalid bindings, and recovers on a late Room', async () => {
  try {
    await mount([],null);
    assert.match(container.textContent!,/Loading…/);
    assert.equal(container.querySelector('[role="alert"]'),null);
    assert.equal(container.querySelector('[aria-label="Canvas draft"]'),null);
    await emit('sync-status',{lastCompleted:'2026-10-11T13:00:00Z',attentionRequired:[]});
    assert.match(container.querySelector('[role="alert"]')!.textContent!,/Bind a drawings Room/);
    await emit('rooms',rooms);
    assert.equal(container.querySelector('[role="alert"]'),null);
    assert.ok(container.querySelector('[aria-label="Canvas draft"]'));
    assert.equal(harness.mounts,1);
  } finally { await unmount(); }
});

test('Whiteboard preserves the mounted unsaved canvas through ambiguity, reach loss, refusal and recovery', async () => {
  try {
    await mount(rooms,'2026-10-11T13:00:00Z');
    const input = container.querySelector<HTMLInputElement>('[aria-label="Canvas draft"]')!;
    await act(async () => { input.value='Unfinished sketch'; input.dispatchEvent(new browser.Event('input',{bubbles:true}) as unknown as Event); });
    assert.equal(button('Save').disabled,false);
    for (const unavailable of [[],[...rooms,{locator:'other',name:'Other'}]]) {
      await emit('rooms',unavailable);
      assert.equal(button('Save').disabled,true);
      assert.equal(container.querySelector('[aria-label="Canvas draft"]'),input);
      assert.equal(input.value,'Unfinished sketch');
    }
    await emit('rooms',rooms);
    await emit('connection-refusal',{reason:'temporary_reach_loss'});
    assert.equal(button('Save').disabled,true);
    await emit('connection-refusal',null);
    assert.equal(button('Save').disabled,false);
    assert.equal(container.querySelector('[role="alert"]'),null);
    assert.equal(input.value,'Unfinished sketch');
    assert.equal(harness.mounts,1);
  } finally { await unmount(); }
});


test('Whiteboard stages typed canvas edits as durable Room Drafts and restores after full unmount/reload', async () => {
  await mount(rooms,'2026-10-11T13:00:00Z');
  const input = container.querySelector<HTMLInputElement>('[aria-label="Canvas draft"]')!;
  await act(async () => { input.value='A durable local sketch'; input.dispatchEvent(new browser.Event('input',{bubbles:true}) as unknown as Event); });
  assert.ok(harness.drafts.get('drawings/one.md')?.parts.sections.Scene.value.includes('rectangle-1'));
  assert.equal(harness.saves,0,'Typing must not save or send to a Provider');
  assert.doesNotMatch(container.textContent!,/Unsaved changes/);
  await unmount();
  try {
    await mount(rooms,'2026-10-11T13:00:00Z',true);
    assert.equal(container.querySelector<HTMLInputElement>('[aria-label="Canvas draft"]')!.value,'Restored sketch');
    assert.equal(button('Save').disabled,false);
    await act(async()=>button('Save').click());
    assert.equal(harness.saves,1,'Only explicit Save queues the durable draft');
    assert.equal(harness.drafts.size,0);
  } finally { await unmount(); }
});


test('Whiteboard redraws another tab’s Room Draft without remounting the donor canvas', async () => {
  try {
    await mount(rooms,'2026-10-11T13:00:00Z');
    const canvas=container.querySelector<HTMLInputElement>('[aria-label="Canvas draft"]')!;
    const shared={room:'r_board',path:'drawings/one.md',revision:'remote-1',returned:null,changedUnderneath:{},parts:{fields:{title:{value:'Shared title',base:{value:'Existing drawing'}}},sections:{Scene:{value:JSON.stringify({elements:[{id:'shared',type:'rectangle',x:1,y:1,width:10,height:10}],appState:{viewBackgroundColor:'#fff'},files:{}}),base:'opened scene'}}}};
    harness.drafts.set(shared.path,shared);
    await emit('room-drafts',[shared]);
    assert.equal(container.querySelector('[aria-label="Canvas draft"]'),canvas);
    assert.equal(canvas.value,'Shared sketch');
    assert.equal(container.querySelector<HTMLInputElement>('[aria-label="Drawing title"]')!.value,'Shared title');
    assert.equal(harness.mounts,1);assert.equal(harness.saves,0);
  } finally { await unmount(); }
});


test('Whiteboard keeps local Save enabled while Provider writes are halted', async () => {
  try {
    await mount(rooms,'2026-10-11T13:00:00Z');
    await emit('service-mode','write-halted');
    const input = container.querySelector<HTMLInputElement>('[aria-label="Canvas draft"]')!;
    await act(async () => { input.value='Paused local sketch'; input.dispatchEvent(new browser.Event('input',{bubbles:true}) as unknown as Event); });
    assert.equal(harness.saves,0); assert.equal(button('Save').disabled,false);
    await act(async()=>button('Save').click()); assert.equal(harness.saves,1);
  } finally { await unmount(); }
});
