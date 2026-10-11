// Size probe only. Never included by the production entry.
import '../../src/main';
// Retain the exact public converter API that the donor calls, loaded on demand.
Object.defineProperty(window, 'loadMermaidSizeProbe', {
  value: async () => (await import('@excalidraw/mermaid-to-excalidraw')).parseMermaidToExcalidraw,
});
