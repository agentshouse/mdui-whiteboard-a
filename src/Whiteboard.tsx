import { useEffect, useRef, useState } from 'react';
import { useObserve } from './house';
import { DraftSession } from './draft-session';
import { DrawingDraftInput } from './drawing-draft-input';
import { Excalidraw, MainMenu, restoreElements } from '@excalidraw/excalidraw';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/element/types';
import { houseRuntime, observeDrawings, observeRoomDrafts, observeStorageLoss, observeConnectionRefusal, observeServiceMode, readDrawings, parseScene, serializeScene, createDrawing, deleteDrawing, type Drawing, type Scene, type HouseRuntime } from './house';

const EMPTY: Scene = { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} };
const keyOf = (drawing: Drawing) => `${drawing.room}/${drawing.path}`;
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
function sceneFromEditor(elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles): Scene {
  const active = elements.filter(element => !element.isDeleted);
  const imageIds = new Set<string>(active.flatMap(element => element.type === 'image' && element.fileId ? [element.fileId] : []));
  return { elements: active.map(element => ({...element, link: null})), appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize, gridStep: appState.gridStep }, files: Object.fromEntries(Object.entries(files).filter(([id]) => imageIds.has(id))) };
}
export function Whiteboard({ ownerDocument }: { ownerDocument: Document }) {
  const [runtime, setRuntime] = useState<HouseRuntime | null>(null);
  const runtimeRef = useRef<HouseRuntime | null>(null);
  const sessions = useRef(new Map<string, DraftSession>());
  const currentSession = useRef<DraftSession | null>(null);
  const inputSessions = useRef(new Map<DraftSession, DrawingDraftInput>());
  const drawingInput = (session: DraftSession, drawing: Drawing) => {
    let input = inputSessions.current.get(session);
    if (!input) { input = new DrawingDraftInput(session, drawing); inputSessions.current.set(session, input); }
    input.drawing = drawing;
    return input;
  };
  const opening = useRef(0);
  const openingKey = useRef('');
  const sharedUpdate = useRef(false);
  const sessionUnsubscribe = useRef<(() => void) | null>(null);
  const pendingInput = useRef(new Map<DraftSession, { scene: number; title: number; sceneFailed: boolean; titleFailed: boolean }>());
  const redrawDraft = useRef<(() => void) | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const rooms = useObserve(runtime, 'rooms');
  const sync = useObserve(runtime, 'sync-status');
  const synced = sync?.lastCompleted != null;
  const room = synced && rooms?.length === 1 ? rooms[0].locator : '';
  const [readyOnce, setReadyOnce] = useState(false);
  const [refused, setRefused] = useState('');
  const [storageLost, setStorageLost] = useState(false);
  useEffect(() => { if (room) setReadyOnce(true); }, [room]);
  const [selected, setSelected] = useState<Drawing | null>(null);
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState>();
  const [editorKey, setEditorKey] = useState(0);
  const [title, setTitle] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [writeHalted, setWriteHalted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [attention, setAttention] = useState('');
  const currentScene = useRef<Scene>(EMPTY);
  const baseline = useRef('');
  const selectedRef = useRef<Drawing | null>(null);
  const dirtyRef = useRef(false);
  const initialized = useRef(false);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const titleRef = useRef('');
  const changeDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value); };
  const showDrawing = (drawing: Drawing, scene: Scene, localTitle: string, session: DraftSession) => {
    initialized.current = false;
    sessionUnsubscribe.current?.();
    currentSession.current = session;
    const redraw = (draft: ReturnType<DraftSession['current']>) => {
      if (currentSession.current !== session || !draft) return;
      const pending = pendingInput.current.get(session);
      try {
        const value = draft.parts.sections?.Scene?.value;
        if (!pending?.scene && !pending?.sceneFailed && value !== undefined && value !== serializeScene(currentScene.current)) {
          const scene = parseScene(value);
          sharedUpdate.current = true;
          currentScene.current = scene;
          const { viewBackgroundColor, gridSize, gridStep } = scene.appState;
          api.current?.updateScene({ elements: restoreElements(scene.elements as unknown as Parameters<typeof restoreElements>[0], null), appState: { viewBackgroundColor, gridSize, gridStep } } as unknown as Parameters<ExcalidrawImperativeAPI['updateScene']>[0]);
          if (Object.keys(scene.files).length) api.current?.addFiles(Object.values(scene.files) as unknown as Parameters<ExcalidrawImperativeAPI['addFiles']>[0]);
          sharedUpdate.current = false;
        }
        const title = draft.parts.fields?.title?.value;
        if (!pending?.title && !pending?.titleFailed && typeof title === 'string' && title !== titleRef.current) { titleRef.current = title; setTitle(title); }
        changeDirty(serializeScene(currentScene.current) !== baseline.current || titleRef.current !== selectedRef.current?.title);
      } catch (error) { sharedUpdate.current = false; setError(errorText(error)); }
    };
    redrawDraft.current = () => redraw(session.current());
    sessionUnsubscribe.current = session.subscribe(redraw);
    currentScene.current = scene;
    selectedRef.current = drawing;
    setSelected(drawing); setTitle(localTitle); titleRef.current = localTitle;
    baseline.current = serializeScene(parseScene(drawing.sceneText));
    changeDirty(serializeScene(scene) !== baseline.current || localTitle !== drawing.title); setError('');
    const { viewBackgroundColor, gridSize, gridStep } = scene.appState;
    setInitialData({ elements: scene.elements, files: scene.files, appState: { viewBackgroundColor, gridSize, gridStep }, scrollToContent: true } as unknown as ExcalidrawInitialDataState);
    setEditorKey(key => key + 1);
  };
  const openDrawing = async (drawing: Drawing) => {
    const md = runtimeRef.current;
    if (!md) return;
    const token = ++opening.current;
    const key = keyOf(drawing); openingKey.current = key;
    let session = sessions.current.get(key);
    if (!session) { session = new DraftSession(md, drawing.room, drawing.path); sessions.current.set(key, session); }
    try {
      const input = drawingInput(session, drawing);
      const draft = await input.read();
      if (opening.current !== token) return;
      if (draft?.parts.creation || draft?.parts.move || draft?.parts.removal || draft?.parts.markdown) throw new Error('This drawing has a structural Room Draft. Review it in House before editing the canvas.');
      const { scene, title: localTitle } = input.preview(draft);
      if (typeof localTitle !== 'string') throw new Error('The local drawing title draft is invalid. It has been kept in House.');
      showDrawing(drawing, scene, localTitle, session);
      if (input.hasFailures) setError("This drawing has local input that could not be kept. Retry that input before Save.");
    } catch (error) { if (opening.current === token) setError(errorText(error)); }
    finally { if (opening.current === token) openingKey.current = ''; }
  };
  const keepDraft = (kind: 'scene' | 'title', previous = currentScene.current) => {
    const drawing = selectedRef.current, session = currentSession.current;
    if (!drawing || !session) return;
    const input = drawingInput(session, drawing);
    const pending = pendingInput.current.get(session) ?? { scene: 0, title: 0, sceneFailed: false, titleFailed: false };
    pendingInput.current.set(session, pending); pending[kind]++;
    const staged = kind === 'scene' ? input.scene(previous, currentScene.current) : input.title(titleRef.current);
    void staged.then(() => {
      pending[kind === 'scene' ? 'sceneFailed' : 'titleFailed'] = false;
    }, error => {
      pending[kind === 'scene' ? 'sceneFailed' : 'titleFailed'] = true;
      if (currentSession.current === session) setError(errorText(error));
    }).finally(() => {
      pending[kind]--;
      if (currentSession.current === session) redrawDraft.current?.();
    });
  };
  useEffect(() => {
    let disposed = false;
    const cleanup: (() => void)[] = [];
    async function run() {
      const md = await houseRuntime();
      if (disposed) return;
      runtimeRef.current = md; setRuntime(md);
      const listen = async <T,>(promise: Promise<{ current(): T; subscribe(fn: (value:T)=>void): ()=>void; close():void }>, apply: (value:T)=>void) => {
        const observation = await promise;
        if (disposed) { observation.close(); return; }
        apply(observation.current());
        cleanup.push(observation.subscribe(value => { if (!disposed) apply(value); }), () => observation.close());
      };
      await Promise.all([
        listen(observeDrawings(md), value => {
          try {
            const next = readDrawings(value); setDrawings(next); setLoaded(true);
            const open = selectedRef.current;
            if (!open && next[0] && openingKey.current !== keyOf(next[0])) void openDrawing(next[0]);
            else if (open) {
              const update = next.find(drawing => keyOf(drawing) === keyOf(open));
              if (!update) { setAttention('This drawing was removed from its Room. Your current canvas is still open; export it to a local file before closing.'); }
              else if (update.sceneText !== open.sceneText || update.title !== open.title) {
                if (dirtyRef.current && !busyRef.current) setAttention('This drawing changed in another tab. The local Room Draft is kept for review.');
                else if (!dirtyRef.current) void openDrawing(update);
              }
            }
          } catch (e) { setError(errorText(e)); }
        }),
        listen(observeRoomDrafts(md), value => { sessions.current.forEach(session => session.accept(value.find(draft => draft.room === session.room && draft.path === session.path) ?? null)); if (value.some(draft => draft.returned)) setAttention('A Room draft needs attention. Resolve it in House before saving again.'); }),
        listen(observeServiceMode(md), value => { setWriteHalted(value === 'write-halted'); }),
        listen(observeStorageLoss(md), value => { setStorageLost(!!value); if (value) setAttention(`House storage warning: ${value}`); }),
        listen(observeConnectionRefusal(md), value => { setRefused(value ? `House connection refused: ${value.reason}` : ''); }),
      ]);
    }
    run().catch(e => { if (!disposed) setError(errorText(e)); });
    return () => { disposed = true; ++opening.current; sessionUnsubscribe.current?.(); cleanup.forEach(fn=>fn()); };
  }, []);
  const act = async (work: () => Promise<void>) => { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); try { await work(); } catch(e) { setError(errorText(e)); } finally { busyRef.current = false; setBusy(false); } };
  const save = () => act(async () => {
    if (!runtime || !selectedRef.current || unavailable || selectedRef.current.room !== room) return;
    const savingScene = currentScene.current;
    const savingTitle = titleRef.current;
    const savingText = serializeScene(savingScene);
    const session = currentSession.current;
    if (!session) return;
    const input = drawingInput(session, selectedRef.current);
    await input.flush();
    const updatedAt = new Date().toISOString();
    await session.stage({ fields: { updated_at: { value: updatedAt, base: { value: selectedRef.current.updated_at } } } });
    await input.flush();
    await session.commit();
    const drawing = { ...selectedRef.current, title: savingTitle, updated_at: updatedAt, sceneText: savingText };
    selectedRef.current = drawing; setSelected(drawing);
    baseline.current = savingText; changeDirty(serializeScene(currentScene.current) !== savingText || titleRef.current !== savingTitle);
  });
  const makeNew = () => { if (!runtime || !room || unavailable) return; void act(async () => { const result = await createDrawing(runtime, room, 'Untitled drawing', EMPTY); await openDrawing(result.drawing); }); };
  const remove = () => { if (!runtime || !selected || unavailable || selected.room !== room || !ownerDocument.defaultView?.confirm(`Delete “${selected.title}” from its Room?`)) return; void act(async () => { await deleteDrawing(runtime, selected); selectedRef.current = null; setSelected(null); setInitialData(undefined); changeDirty(false); }); };
  const onChange = (elements: readonly OrderedExcalidrawElement[], state: AppState, files: BinaryFiles) => {
    try {
      if (sharedUpdate.current) return;
      const previousScene = currentScene.current;
      const previous = serializeScene(previousScene);
      const scene = sceneFromEditor(elements, state, files);
      currentScene.current = scene;
      const text = serializeScene(scene);
      if (!initialized.current) return;
      changeDirty(text !== baseline.current || titleRef.current !== selectedRef.current?.title);
      if (text !== previous) keepDraft('scene', previousScene);
    } catch(e) { changeDirty(true); setError(errorText(e)); }
  };
  const bindingError = !synced || rooms === undefined || rooms.length === 1 ? '' : rooms.length > 1 ? 'Whiteboard received multiple data bindings. Check this App’s configuration in House.' : 'Bind a drawings Room to this App in House.';
  const unavailable = !room || !!refused || storageLost;
  const syncAttention = sync?.attentionRequired.length ? 'House returned changes that need attention. Your Room drafts are preserved; resolve them in House before saving again.' : '';
  return <main className="whiteboard-app">
    <header className="document-bar">
      <span className="app-name">Whiteboard</span>
      <select aria-label="Open drawing" value={selected ? keyOf(selected) : ''} disabled={busy || !loaded} onChange={event => { const drawing = drawings.find(d=>keyOf(d)===event.target.value); if(drawing) void openDrawing(drawing); }}>
        <option value="" disabled>Choose a drawing</option>
        {drawings.map(drawing=><option key={keyOf(drawing)} value={keyOf(drawing)}>{drawing.title}</option>)}
      </select>
      <input aria-label="Drawing title" value={title} placeholder="Drawing title" disabled={!selected || busy} onChange={event=>{titleRef.current=event.target.value;setTitle(event.target.value);changeDirty(event.target.value!==selected?.title || serializeScene(currentScene.current)!==baseline.current);keepDraft('title');}} />
      <button onClick={makeNew} disabled={!runtime || busy || unavailable}>New</button>
      <button className="primary" onClick={()=>void save()} disabled={!selected || !dirty || busy || unavailable || selected.room !== room}>{busy ? 'Working…' : 'Save'}</button>
      <button onClick={remove} disabled={!selected || busy || unavailable || selected.room !== room} aria-label="Delete drawing">Delete</button>
    </header>
    {writeHalted && <div className="notice" role="status">House publishing is paused. Local drafts and Saves still work; queued changes submit when writes reopen.</div>}
    {(bindingError||refused||error) && <div className="notice error" role="alert">{bindingError||refused||error}</div>}
    {!synced && <div className="notice" role="status">Loading…</div>}
    {syncAttention && <div className="notice" role="status">{syncAttention}</div>}
    {attention && <div className="notice" role="status">{attention}<button onClick={()=>setAttention('')} aria-label="Dismiss notice">×</button></div>}
    <section className="editor" aria-label="Drawing editor">
      {readyOnce && selected && initialData ? <Excalidraw key={editorKey} ownerDocument={ownerDocument} initialData={initialData} onExcalidrawAPI={value=>{api.current=value;}} onInitialize={value=>{ currentScene.current=sceneFromEditor(value.getSceneElements(),value.getAppState(),value.getFiles());initialized.current=true;changeDirty(serializeScene(currentScene.current)!==baseline.current || titleRef.current!==selectedRef.current?.title); }} onChange={onChange} name={selected.title} viewModeEnabled={busy} aiEnabled={false} isCollaborating={false} validateEmbeddable={false} onLinkOpen={(_element,event)=>event.preventDefault()} UIOptions={{canvasActions:{export:false,loadScene:true,saveToActiveFile:true,saveAsImage:true}}}>
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme allowSystemTheme={false} />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw> : <div className="empty-state"><h1>Whiteboard</h1><p>{error || refused ? 'The editor is waiting for a House connection.' : !synced ? 'Loading…' : bindingError || (loaded ? 'Create a drawing to start sketching.' : 'Loading…')}</p>{loaded && !!room && <button onClick={makeNew} disabled={busy || unavailable}>Create drawing</button>}</div>}
    </section>
  </main>;
}
