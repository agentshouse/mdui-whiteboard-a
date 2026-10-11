import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeSceneInput } from '../src/scene-draft.ts';
import type { Scene } from '../src/house.ts';
const shape = (id: string, x = 0) => ({ id, type:'rectangle',x,y:0,width:10,height:10 });
const scene = (elements: Scene['elements']): Scene => ({elements,appState:{viewBackgroundColor:'#fff'},files:{}});
test('same-browser disjoint Scene elements merge while later edits of one element win',()=>{
  const before=scene([shape('one'),shape('two')]);
  const current=scene([shape('one'),shape('two',20),shape('other')]);
  const input=scene([shape('one',30),shape('two')]);
  assert.deepEqual(mergeSceneInput(before,input,current).elements,[shape('one',30),shape('two',20),shape('other')]);
  assert.equal(mergeSceneInput(before,scene([shape('one',40),shape('two')]),scene([shape('one',10),shape('two')])).elements[0].x,40);
});
test('Scene removal and state edits change only the locally edited parts',()=>{
  const before=scene([shape('one'),shape('two')]),current=scene([shape('one'),shape('two'),shape('other')]);
  current.appState.gridSize=20;
  const input=scene([shape('one')]);input.appState.viewBackgroundColor='#000';
  const result=mergeSceneInput(before,input,current);
  assert.deepEqual(result.elements,[shape('one'),shape('other')]);
  assert.deepEqual(result.appState,{viewBackgroundColor:'#000',gridSize:20});
});
