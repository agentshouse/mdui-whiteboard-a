export { useObserve } from "@agentshouse/mdruntime/react";
import { connectHouseBridge } from '@agentshouse/app-bridge'

// House owns storage, authorization, synchronization, and the Runtime host.
// The host supplies its connected Runtime client through the bridge.
export type HouseRuntime = Awaited<ReturnType<typeof connectHouseBridge>['runtime']>
export type HouseRoom = Awaited<ReturnType<HouseRuntime['rooms']>>[number]
export type Drawing = {
  room: string
  path: string
  id: string
  title: string
  updated_at: string
  /** Keep the exact text shown on open: it is the next Room Draft's base. */
  sceneText: string
}
export type Scene = {
  elements: Record<string, unknown>[]
  appState: Record<string, unknown>
  files: Record<string, Record<string, unknown>>
}
export type QueuedWrite = { outcome: 'queued'; identifier: string }
export type QueuedDrawingWrite = QueuedWrite & { drawing: Drawing }
type DraftParts = Parameters<HouseRuntime['roomDraft']['write']>[3]
type DocumentResult = {
  documents: readonly {
    room: string
    path: string
    fields?: Readonly<Record<string, unknown>>
    sections?: Readonly<Record<string, string>>
    markdown?: string
  }[]
}

let bridge:ReturnType<typeof connectHouseBridge>|undefined
export function houseBridge(){if(!bridge){bridge=connectHouseBridge();bridge.setTab({title:'Whiteboard'})}return bridge}
let connection: Promise<HouseRuntime> | undefined
export function houseRuntime(): Promise<HouseRuntime> {
  connection ??= (async () => {
    return houseBridge().runtime
  })().catch((error: unknown) => {
    connection = undefined
    bridge = undefined
    throw error
  })
  return connection
}

export const drawingsQuery = {
  types: ['drawing'],
  select: { fields: ['/id', '/title', '/updated_at'], sections: ['Scene'] },
  orderBy: [{ by: { field: '/updated_at' }, direction: 'desc' as const }],
}
export const listRooms = (md: HouseRuntime) => md.rooms()
export const observeDrawings = (md: HouseRuntime) => md.observe('query', drawingsQuery)
export const observeRooms = (md: HouseRuntime) => md.observe('rooms')
export const observeSyncStatus = (md: HouseRuntime) => md.observe('sync-status')
export const observeRoomDrafts = (md: HouseRuntime) => md.observe('room-drafts')
export const observeStorageLoss = (md: HouseRuntime) => md.observe('storage-loss')
export const observeConnectionRefusal = (md: HouseRuntime) => md.observe('connection-refusal')
export const observeServiceMode = (md: HouseRuntime) => md.observe('service-mode')
export const observeQueue = (md: HouseRuntime, room: string) => md.observe('queue', room)

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function nonempty(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Drawing ${name} must be a nonempty string.`)
  return value
}

const elementTypes = new Set(['rectangle', 'diamond', 'ellipse', 'text', 'arrow', 'line', 'freedraw', 'image', 'frame'])
const rasterData = /^data:(image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon));base64,[A-Za-z0-9+/\r\n]+={0,2}$/i
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor'])
/** Reject values that should never reach the editor's restore/merge operations. */
function validateJson(value: unknown, depth = 0): void {
  if (depth > 64) throw new Error('Drawing Scene is nested too deeply.')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (Array.isArray(value)) {
    for (const item of value) validateJson(item, depth + 1)
    return
  }
  if (record(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (unsafeKeys.has(key)) throw new Error(`Drawing Scene contains an unsafe property: ${key}.`)
      validateJson(item, depth + 1)
    }
    return
  }
  throw new Error('Drawing Scene must contain only JSON values.')
}

/** Scene is plain JSON; it never contains executable code or remote resources. */
export function validateScene(value: unknown): Scene {
  if (!record(value) || !Array.isArray(value.elements) || !record(value.appState) || !record(value.files)) {
    throw new Error('Drawing Scene must contain elements, appState, and files.')
  }
  validateJson(value)
  const ids = new Set<string>()
  for (const element of value.elements) {
    if (!record(element) || typeof element.id !== 'string' || !element.id || typeof element.type !== 'string' || !elementTypes.has(element.type)) {
      throw new Error('Drawing Scene contains an invalid or unsupported element. Embedded content is disabled.')
    }
    if (ids.has(element.id)) throw new Error('Drawing Scene contains duplicate element IDs.')
    ids.add(element.id)
    for (const key of ['x', 'y', 'width', 'height']) {
      if (typeof element[key] !== 'number' || !Number.isFinite(element[key])) throw new Error(`Drawing element ${element.id} has invalid ${key}.`)
    }
    if (element.link !== undefined && element.link !== null && element.link !== '') {
      throw new Error('Drawing element links are disabled in Whiteboard.')
    }
    if (element.type === 'image' && element.fileId !== null && element.fileId !== undefined) {
      if (typeof element.fileId !== 'string') throw new Error('Drawing image has an invalid file ID.')
      if (!Object.hasOwn(value.files, element.fileId)) throw new Error('Drawing image refers to a missing file.')
    }
  }
  for (const [id, file] of Object.entries(value.files)) {
    if (!record(file) || typeof file.dataURL !== 'string') throw new Error(`Drawing file ${id} has no embedded image data.`)
    const match = rasterData.exec(file.dataURL)
    if (!match) throw new Error('Drawing files must be embedded data:image raster images. Remote files and SVG are disabled.')
    if (file.mimeType !== undefined && (typeof file.mimeType !== 'string' || file.mimeType.toLowerCase() !== match[1].toLowerCase())) {
      throw new Error(`Drawing file ${id} has a mismatched image type.`)
    }
    if (file.id !== undefined && file.id !== id) throw new Error(`Drawing file ${id} has a mismatched ID.`)
  }
  return { elements: value.elements, appState: value.appState, files: value.files as Scene['files'] }
}

export function parseScene(sceneText: string): Scene {
  let value: unknown
  try { value = JSON.parse(sceneText) }
  catch (cause) { throw new Error('Drawing Scene is not valid JSON.', { cause }) }
  return validateScene(value)
}
export function serializeScene(scene: unknown): string {
  let sceneText: string | undefined
  try { sceneText = JSON.stringify(scene) }
  catch (cause) { throw new Error('Drawing Scene could not be serialized.', { cause }) }
  if (sceneText === undefined) throw new Error('Drawing Scene could not be serialized.')
  // Normalize the editor's optional undefined properties through JSON first.
  return JSON.stringify(parseScene(sceneText))
}
export function emptyScene(): Scene {
  return { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} }
}

export function readDrawings(result: DocumentResult): Drawing[] {
  return result.documents.map((document) => {
    const fields = document.fields ?? {}
    const id = nonempty(fields.id, 'id')
    const title = nonempty(fields.title, 'title')
    const updated_at = nonempty(fields.updated_at, 'updated_at')
    const sceneText = document.sections?.Scene
    if (typeof sceneText !== 'string') throw new Error(`Drawing ${document.path} is missing its Scene section.`)
    // Fail visibly instead of opening a corrupt/unsafe drawing as a blank canvas.
    parseScene(sceneText)
    return { room: document.room, path: document.path, id, title, updated_at, sceneText }
  })
}

export class HouseWriteError extends Error {
  readonly details: unknown
  constructor(message: string, details: unknown) {
    super(message, { cause: details })
    this.name = 'HouseWriteError'
    this.details = details
  }
}

/** A successful Save means queued locally, never accepted by the Provider. */
async function queueChange(md: HouseRuntime, room: string, path: string, parts: DraftParts): Promise<QueuedWrite> {
  const existing = await md.roomDraft.read(room, path)
  if (existing) {
    throw new HouseWriteError('This drawing has an unfinished House draft. Resolve it in House before editing it again.', existing)
  }
  // null is an atomic "there was no draft" precondition. A racing tab is refused.
  const written = await md.roomDraft.write(room, path, null, parts)
  if (written.outcome !== 'written' || !written.roomDraft) {
    throw new HouseWriteError('The drawing draft changed in another tab. Reload and review it before retrying.', written)
  }
  const answer = await md.save(room, [{ path, revision: written.roomDraft.revision }])
  if (answer.outcome !== 'saved') {
    throw new HouseWriteError(`House did not queue this change: ${answer.rule}. Your Room draft has been kept.`, answer)
  }
  return { outcome: 'queued', identifier: answer.identifier }
}

export async function createDrawing(md: HouseRuntime, room: string, title: string, scene: unknown): Promise<QueuedDrawingWrite> {
  nonempty(room, 'Room')
  const identity = crypto.randomUUID()
  const drawing: Drawing = {
    room,
    path: `drawings/drawing-${identity}.md`,
    id: `DRAWING-${identity}`,
    title: nonempty(title, 'title'),
    updated_at: new Date().toISOString(),
    sceneText: serializeScene(scene),
  }
  const result = await queueChange(md, room, drawing.path, {
    creation: {
      type: 'drawing',
      fields: { id: drawing.id, title: drawing.title, updated_at: drawing.updated_at },
      sections: { Scene: drawing.sceneText },
    },
  })
  return { ...result, drawing }
}

export async function saveDrawing(md: HouseRuntime, drawing: Drawing, scene: unknown, title = drawing.title): Promise<QueuedDrawingWrite> {
  const next: Drawing = { ...drawing, title: nonempty(title, 'title'), updated_at: new Date().toISOString(), sceneText: serializeScene(scene) }
  const result = await queueChange(md, drawing.room, drawing.path, {
    fields: {
      title: { value: next.title, base: { value: drawing.title } },
      updated_at: { value: next.updated_at, base: { value: drawing.updated_at } },
    },
    sections: { Scene: { value: next.sceneText, base: drawing.sceneText } },
  })
  return { ...result, drawing: next }
}

export async function deleteDrawing(md: HouseRuntime, drawing: Drawing): Promise<QueuedWrite> {
  // Read the current Markdown only for this destructive operation. Check the
  // opened snapshot before adopting it as a whole-document removal base.
  const result = await md.query({
    rooms: [drawing.room],
    types: ['drawing'],
    where: { '/id': drawing.id },
    select: { fields: ['/id', '/title', '/updated_at'], sections: ['Scene'], markdown: true },
  })
  const current = result.documents.find((document) => document.room === drawing.room && document.path === drawing.path)
  if (!current || typeof current.markdown !== 'string' ||
      current.fields?.id !== drawing.id || current.fields?.title !== drawing.title ||
      current.fields?.updated_at !== drawing.updated_at || current.sections?.Scene !== drawing.sceneText) {
    throw new HouseWriteError('This drawing changed. Reload and review it before deleting.', current ?? null)
  }
  return queueChange(md, drawing.room, drawing.path, { removal: { base: current.markdown } })
}
