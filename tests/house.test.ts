import { assertQueryPointers, rejectedPointerQueries } from './query-pointers.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDrawing, deleteDrawing, drawingsQuery, emptyScene, HouseWriteError,
  listRooms, observeConnectionRefusal, observeDrawings, observeQueue,
  observeRoomDrafts, observeRooms, observeServiceMode, observeStorageLoss,
  observeSyncStatus, parseScene, readDrawings, saveDrawing, serializeScene,
  type Drawing, type HouseRuntime, type Scene,
} from '../src/house.ts'

const oldScene = {
  elements: [{ id: 'rectangle-1', type: 'rectangle', x: 1, y: 2, width: 30, height: 40, link: null }],
  appState: { viewBackgroundColor: '#ffffff' },
  files: {},
} satisfies Scene
// A raw stored section may have whitespace. Its exact text must remain the base.
const sceneText = `${JSON.stringify(oldScene, null, 2)}\n`
const drawing: Drawing = {
  room: 'whiteboard-room', path: 'drawings/one.md', id: 'DRAWING-one',
  title: 'My drawing', updated_at: '2026-10-10T10:00:00.000Z', sceneText,
}
const markdown = `---\ntype: drawing\nid: ${drawing.id}\ntitle: ${drawing.title}\nupdated_at: ${drawing.updated_at}\n---\n# Scene\n${sceneText}`
const document = {
  room: drawing.room, path: drawing.path,
  fields: { id: drawing.id, title: drawing.title, updated_at: drawing.updated_at },
  sections: { Scene: sceneText }, markdown,
}
function mockRuntime(options: { existing?: unknown; writeResult?: unknown; saveResult?: unknown; documents?: unknown[]; failure?: Error } = {}) {
  const writes: { room: string; path: string; revision: string | null; parts: any }[] = []
  const saves: { room: string; drafts: unknown }[] = []
  const queries: unknown[] = []
  const observations: unknown[][] = []
  let reads = 0
  const md = {
    rooms: async () => [{ name: 'Whiteboard', locator: drawing.room }],
    observe: async (...args: unknown[]) => { if (args[0] === 'query') assertQueryPointers(args[1]); observations.push(args); return { current: () => null, subscribe: () => () => {}, close() {} } },
    roomDraft: {
      read: async () => { reads++; return options.existing ?? null },
      write: async (room: string, path: string, revision: string | null, parts: unknown) => {
        if (options.failure) throw options.failure
        writes.push({ room, path, revision, parts })
        return options.writeResult ?? { outcome: 'written', roomDraft: { revision: 'draft-1' } }
      },
    },
    save: async (room: string, drafts: unknown) => {
      saves.push({ room, drafts })
      return options.saveResult ?? { outcome: 'saved', identifier: 'batch-1' }
    },
    query: async (query: unknown) => { assertQueryPointers(query); queries.push(query); return { documents: options.documents ?? [document] } },
  } as unknown as HouseRuntime
  return { md, writes, saves, queries, observations, reads: () => reads }
}

test('Scene parses as plain JSON and preserves exact stored Scene text in drawings', () => {
  assert.deepEqual(parseScene(sceneText), oldScene)
  assert.equal(serializeScene(oldScene), JSON.stringify(oldScene))
  assert.deepEqual(readDrawings({ documents: [document] }), [drawing])
  assert.deepEqual(parseScene(serializeScene(emptyScene())), emptyScene())
  assert.deepEqual(drawingsQuery.select, { fields: ['/id', '/title', '/updated_at'], sections: ['Scene'] })
})

test('Scene rejects malformed JSON, missing structure, and malformed geometry', () => {
  assert.throws(() => parseScene('{broken'), /not valid JSON/)
  for (const value of [null, [], {}, { elements: {}, appState: {}, files: {} }, { elements: [], appState: null, files: {} }]) {
    assert.throws(() => parseScene(JSON.stringify(value)), /must contain/)
  }
  assert.throws(() => serializeScene({ ...oldScene, elements: [{ ...oldScene.elements[0], x: '10' }] }), /invalid x/)
  assert.throws(() => serializeScene({ ...oldScene, elements: [oldScene.elements[0], oldScene.elements[0]] }), /duplicate element IDs/)
  assert.throws(() => readDrawings({ documents: [{ ...document, sections: {} }] }), /missing its Scene/)
  assert.throws(() => readDrawings({ documents: [{ ...document, fields: { ...document.fields, title: 42 } }] }), /title/)
  assert.throws(() => readDrawings({ documents: [{ ...document, sections: { Scene: 'broken' } }] }), /not valid JSON/)
})

test('Scene rejects embedded elements, element links, unsafe properties, and remote image resources', () => {
  for (const type of ['iframe', 'embeddable', 'unknown']) {
    assert.throws(() => serializeScene({ ...oldScene, elements: [{ ...oldScene.elements[0], type }] }), /unsupported element/)
  }
  for (const link of ['https://example.com', 'javascript:alert(1)', 'mailto:test@example.com']) {
    assert.throws(() => serializeScene({ ...oldScene, elements: [{ ...oldScene.elements[0], link }] }), /links are disabled/)
  }
  assert.throws(() => parseScene('{"elements":[],"appState":{"__proto__":{}},"files":{}}'), /unsafe property/)
  for (const dataURL of ['https://example.com/picture.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,WA==', 'data:image/png;base64,']) {
    assert.throws(() => serializeScene({ ...oldScene, files: { img: { id: 'img', dataURL } } }), /data:image raster/)
  }
})

test('Scene accepts embedded raster images and refuses missing or inconsistent files', () => {
  const image = { ...oldScene.elements[0], type: 'image', fileId: 'img' }
  const file = { id: 'img', mimeType: 'image/png', dataURL: 'data:image/png;base64,aGVsbG8=' }
  const scene = { ...oldScene, elements: [image], files: { img: file } }
  assert.deepEqual(parseScene(serializeScene(scene)), scene)
  assert.throws(() => serializeScene({ ...scene, files: {} }), /missing file/)
  assert.throws(() => serializeScene({ ...scene, files: { img: { ...file, mimeType: 'image/jpeg' } } }), /mismatched image type/)
  assert.throws(() => serializeScene({ ...scene, files: { img: { ...file, id: 'different' } } }), /mismatched ID/)
})

test('save supplies exact old Scene, title, and timestamp bases and returns local queue success', async () => {
  const mock = mockRuntime()
  const changed = { ...oldScene, elements: [{ ...oldScene.elements[0], x: 45 }] }
  const result = await saveDrawing(mock.md, drawing, changed, 'Renamed drawing')
  assert.equal(result.outcome, 'queued')
  assert.equal(result.identifier, 'batch-1')
  assert.equal(result.drawing.title, 'Renamed drawing')
  assert.equal(result.drawing.sceneText, serializeScene(changed))
  assert.match(result.drawing.updated_at, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(mock.writes, [{
    room: drawing.room, path: drawing.path, revision: null,
    parts: {
      fields: {
        title: { value: 'Renamed drawing', base: { value: drawing.title } },
        updated_at: { value: result.drawing.updated_at, base: { value: drawing.updated_at } },
      },
      sections: { Scene: { value: serializeScene(changed), base: sceneText } },
    },
  }])
  assert.deepEqual(mock.saves, [{ room: drawing.room, drafts: [{ path: drawing.path, revision: 'draft-1' }] }])
  assert.equal(drawing.sceneText, sceneText)
  assert.equal(drawing.title, 'My drawing')
})

test('create makes a uniquely identified drawing with raw JSON Scene', async () => {
  const mock = mockRuntime()
  const first = await createDrawing(mock.md, drawing.room, 'New drawing', oldScene)
  const second = await createDrawing(mock.md, drawing.room, 'New drawing', emptyScene())
  assert.notEqual(first.drawing.id, second.drawing.id)
  assert.notEqual(first.drawing.path, second.drawing.path)
  assert.match(first.drawing.path, /^drawings\/drawing-[0-9a-f-]+\.md$/)
  assert.equal(first.outcome, 'queued')
  assert.deepEqual(mock.writes[0].parts, { creation: {
    type: 'drawing',
    fields: { id: first.drawing.id, title: 'New drawing', updated_at: first.drawing.updated_at },
    sections: { Scene: JSON.stringify(oldScene) },
  } })
  assert.equal(mock.writes[0].revision, null)
  assert.equal(mock.saves.length, 2)
})

test('a preexisting draft blocks create, save, and delete without overwriting it', async () => {
  const existing = { revision: 'another-tab', returned: { kind: 'conflicted', code: 'conflict' } }
  for (const operation of [
    (md: HouseRuntime) => createDrawing(md, drawing.room, 'New drawing', oldScene),
    (md: HouseRuntime) => saveDrawing(md, drawing, oldScene),
    (md: HouseRuntime) => deleteDrawing(md, drawing),
  ]) {
    const mock = mockRuntime({ existing })
    await assert.rejects(operation(mock.md), (error: unknown) => {
      assert.ok(error instanceof HouseWriteError)
      assert.match(error.message, /unfinished House draft/)
      assert.equal(error.details, existing)
      return true
    })
    assert.equal(mock.writes.length, 0)
    assert.equal(mock.saves.length, 0)
  }
})

test('a racing tab is refused atomically with no save or rebase', async () => {
  const refusal = { outcome: 'stale', current: { revision: 'racing-tab' } }
  const mock = mockRuntime({ writeResult: refusal })
  await assert.rejects(saveDrawing(mock.md, drawing, oldScene), (error: unknown) => {
    assert.ok(error instanceof HouseWriteError)
    assert.equal(error.details, refusal)
    return true
  })
  assert.equal(mock.writes.length, 1)
  assert.equal(mock.reads(), 1)
  assert.equal(mock.saves.length, 0)
})

test('a local Save refusal preserves all details and leaves its draft for explicit resolution', async () => {
  const refusal = { outcome: 'refused', code: 'changed-underneath', retryable: false, file: drawing.path, parts: [{ path: drawing.path, part: 'section', name: 'Scene' }] }
  const mock = mockRuntime({ saveResult: refusal })
  await assert.rejects(saveDrawing(mock.md, drawing, oldScene), (error: unknown) => {
    assert.ok(error instanceof HouseWriteError)
    assert.match(error.message, /changed-underneath.*draft has been kept/)
    assert.equal(error.details, refusal)
    assert.equal(error.cause, refusal)
    return true
  })
  assert.equal(mock.writes.length, 1)
  assert.equal(mock.saves.length, 1)
  assert.equal(mock.reads(), 1)
})

test('transport/runtime errors are preserved without interpreting them as rejection', async () => {
  const failure = new Error('Port closed while writing')
  const mock = mockRuntime({ failure })
  await assert.rejects(saveDrawing(mock.md, drawing, oldScene), (error: unknown) => error === failure)
  assert.equal(mock.saves.length, 0)
})

test('delete uses current full Markdown as its removal base', async () => {
  const mock = mockRuntime()
  const result = await deleteDrawing(mock.md, drawing)
  assert.equal(result.outcome, 'queued')
  assert.deepEqual(mock.writes, [{ room: drawing.room, path: drawing.path, revision: null, parts: { removal: { base: markdown } } }])
  assert.deepEqual(mock.queries, [{ rooms: [drawing.room], types: ['drawing'], where: { '/id': drawing.id }, select: { fields: ['/id', '/title', '/updated_at'], sections: ['Scene'], markdown: true } }])
})

test('delete refuses changed, missing, or incomplete documents without a draft write', async () => {
  const changes = [
    { ...document, fields: { ...document.fields, id: 'replacement' } },
    { ...document, fields: { ...document.fields, title: 'Changed' } },
    { ...document, fields: { ...document.fields, updated_at: 'later' } },
    { ...document, sections: { Scene: serializeScene(emptyScene()) } },
    { ...document, markdown: undefined },
    { ...document, room: 'different-room' },
    { ...document, path: 'drawings/different.md' },
  ]
  for (const documents of [[], ...changes.map((changed) => [changed])]) {
    const mock = mockRuntime({ documents })
    await assert.rejects(deleteDrawing(mock.md, drawing), /changed.*before deleting/)
    assert.equal(mock.writes.length, 0)
    assert.equal(mock.saves.length, 0)
  }
})

test('invalid input is refused before touching Room drafts', async () => {
  const mock = mockRuntime()
  await assert.rejects(createDrawing(mock.md, drawing.room, '  ', oldScene), /title/)
  await assert.rejects(saveDrawing(mock.md, drawing, {}, 'Drawing'), /must contain/)
  assert.equal(mock.reads(), 0)
  assert.equal(mock.writes.length, 0)
})

test('Room and observation access is available without importing Runtime from the app', async () => {
  const mock = mockRuntime()
  assert.equal((await listRooms(mock.md))[0].locator, drawing.room)
  await observeDrawings(mock.md)
  await observeRooms(mock.md)
  await observeSyncStatus(mock.md)
  await observeRoomDrafts(mock.md)
  await observeStorageLoss(mock.md)
  await observeConnectionRefusal(mock.md)
  await observeServiceMode(mock.md)
  await observeQueue(mock.md, drawing.room)
  assert.deepEqual(mock.observations, [
    ['query', drawingsQuery], ['rooms'], ['sync-status'], ['room-drafts'],
    ['storage-loss'], ['connection-refusal'], ['service-mode'], ['queue', drawing.room],
  ])
})


test('current Runtime query pointers reject old frontmatter names while preserving section headings and metadata', () => {
  assertQueryPointers(drawingsQuery)
  assert.deepEqual(drawingsQuery.select, { fields: ['/id', '/title', '/updated_at'], sections: ['Scene'] })
  assert.deepEqual(drawingsQuery.orderBy, [{ by: { field: '/updated_at' }, direction: 'desc' }])
  assertQueryPointers({ select: { fields: 'all', sections: ['Scene'] }, orderBy: [{ by: 'path' }] })
  assertQueryPointers({ select: { fields: ['/a~1b/c~0d', '/assignee/0'] }, where: { $or: [{ '/title': 'x' }, { '/nested/title': 'y' }] } })
  for (const query of rejectedPointerQueries) assert.throws(() => assertQueryPointers(query), /expects a JSON Pointer/)
})
