// Non-release fixture. Tests the bundled donor only, never the House adapter.
// Vite's production entry remains index.html; this file is not imported by src.
import { createRoot } from 'react-dom/client';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import samples from './sample-scenes.json';

const root = document.getElementById('root');
if (!root) throw new Error('Missing local visual fixture root');
const ownerDocument = root.ownerDocument;
const params = new URLSearchParams(ownerDocument.defaultView?.location.search);
const sampleIndex = Number(params.get('scene') ?? '0');
const sample = samples[sampleIndex] ?? samples[0];
root.dataset.sampleTitle = sample.title;
const initialData = { ...sample.scene, scrollToContent: true } as unknown as ExcalidrawInitialDataState;

createRoot(root).render(
  <Excalidraw
    ownerDocument={ownerDocument}
    initialData={initialData}
    name={sample.title}
    aiEnabled={false}
    isCollaborating={false}
    validateEmbeddable={false}
    onLinkOpen={(_element, event) => event.preventDefault()}
    onInitialize={(api) => {
      root.dataset.initialized = 'true';
      root.dataset.elementCount = String(api.getSceneElements().length);
    }}
    onChange={(elements) => { root.dataset.elementCount = String(elements.filter(element => !element.isDeleted).length); }}
    UIOptions={{canvasActions:{export:false,loadScene:true,saveToActiveFile:true,saveAsImage:true}}}
  >
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
  </Excalidraw>,
);
