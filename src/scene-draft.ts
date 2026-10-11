import { parseScene, serializeScene, type Scene } from './house.ts';
import type { DraftPatch } from './draft-session';
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => same(value, b[index]));
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => Object.hasOwn(right, key) && same(left[key], right[key]));
}
/** Apply only the user's changed elements/properties to the current shared scene.
 * Disjoint element IDs survive; a later edit of the same element wins. */
export function mergeSceneInput(previous: Scene, input: Scene, current: Scene): Scene {
  const before = new Map(previous.elements.map(element => [element.id, element]));
  const next = new Map(input.elements.map(element => [element.id, element]));
  const merged = new Map(current.elements.map(element => [element.id, element]));
  for (const [id, element] of before) {
    if (!next.has(id)) merged.delete(id);
    else if (!same(element, next.get(id))) merged.set(id, next.get(id)!);
  }
  for (const [id, element] of next) if (!before.has(id)) merged.set(id, element);
  const appState = { ...current.appState }, files = { ...current.files };
  for (const key of new Set([...Object.keys(previous.appState), ...Object.keys(input.appState)])) {
    if (same(previous.appState[key], input.appState[key])) continue;
    if (Object.hasOwn(input.appState, key)) appState[key] = input.appState[key]; else delete appState[key];
  }
  for (const key of new Set([...Object.keys(previous.files), ...Object.keys(input.files)])) {
    if (same(previous.files[key], input.files[key])) continue;
    if (Object.hasOwn(input.files, key)) files[key] = input.files[key];
    else if (![...merged.values()].some(element => element.fileId === key)) delete files[key];
  }
  const previousOrder = previous.elements.map(element => element.id), nextOrder = input.elements.map(element => element.id);
  const order = same(previousOrder, nextOrder) ? [...merged.keys()] : [...nextOrder, ...merged.keys()].filter((id, index, values) => values.indexOf(id) === index);
  return { elements: order.filter(id => merged.has(id)).map(id => merged.get(id)!), appState, files };
}
export function sceneInputPatch(previous: Scene, input: Scene, base: string): DraftPatch {
  return draft => ({ sections: { Scene: {
    value: serializeScene(mergeSceneInput(previous, input, parseScene(draft?.parts.sections?.Scene?.value ?? base))),
    base,
  } } });
}
