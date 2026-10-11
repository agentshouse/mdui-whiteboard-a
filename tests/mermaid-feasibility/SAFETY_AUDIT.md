# Mermaid feasibility: safety audit

Date: 2026-10-11. Read-only source audit of `@excalidraw/mermaid-to-excalidraw` 2.2.2 and donor-pinned Mermaid 11.12.2, plus one Node-only configuration test.

**Decision:** Production Mermaid remains unavailable. The separately measured full dependency closure exceeded the package-size cap. This report records additional safety and fidelity constraints; none of the proposed mitigations was implemented. No fonts/features were trimmed, and no replacement renderer was built.

## Evidence locations

These are the original local probe locations, relative to the workspace root. Probe dependencies were subsequently removed from production; these references describe the files inspected, not files guaranteed to remain installed.

- **C:** `ports/whiteboard/node_modules/@excalidraw/mermaid-to-excalidraw/dist`
- **M:** `ports/whiteboard/node_modules/@excalidraw/mermaid-to-excalidraw/node_modules/mermaid/dist`
- **D:** `ports/whiteboard-donor/packages/excalidraw/components/TTDDialog`
- Donor version evidence: `ports/whiteboard-donor/yarn.lock:7830–7837` pins Mermaid 11.12.2; `:2106–2111` pins `@mermaid-js/parser` 0.6.3. Installed Mermaid `package.json:3` confirmed 11.12.2 at the nested probe location.

## Strict security is not an offline boundary

- C/`constants.js:7–15` sets `startOnLoad:false`, 500 edges and 50,000 characters, but does not set `securityLevel` or `htmlLabels`.
- Mermaid inherits `securityLevel:"strict"`; diagram directives cannot change this protected key. M/`chunks/mermaid.core/chunk-ABZYJK2D.mjs:2143–2161,2539–2561`. Flowchart HTML labels default true at `:1684`.
- YAML frontmatter and init directives become live rendering configuration: M/`mermaid.core.mjs:770–845,871–875`.
- CSS sanitization checks brace balance, not external-resource references: M/`chunks/mermaid.core/chunk-ABZYJK2D.mjs:2446–2481`. Custom CSS reaches a live style element before final output sanitization: M/`mermaid.core.mjs:896–935,1042–1048`.

### Exact Node configuration test

Run from `/workspace/scratch/364b78933bbf` while the pinned probe dependency was installed:

```sh
node --input-type=module <<'NODE'
import {setSiteConfig, addDirective, getConfig} from './ports/whiteboard/node_modules/@excalidraw/mermaid-to-excalidraw/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ABZYJK2D.mjs';
setSiteConfig({securityLevel:'strict', startOnLoad:false, htmlLabels:false, flowchart:{htmlLabels:false}});
addDirective({securityLevel:'loose', htmlLabels:true, themeCSS:'@font-face {font-family: external;src:url(https://example.invalid/font.woff2)} .node {font-family:external}', fontFamily:'external'});
const {securityLevel, htmlLabels, themeCSS, fontFamily} = getConfig();
console.log(JSON.stringify({securityLevel, htmlLabels, themeCSS, fontFamily}, null, 2));
NODE
```

Observed output (exit code 0):

```json
{
  "securityLevel": "strict",
  "htmlLabels": true,
  "themeCSS": "@font-face {font-family: external;src:url(https://example.invalid/font.woff2)} .node {font-family:external}",
  "fontFamily": "external"
}
```

This establishes configuration acceptance only. It did not render a diagram, start a browser, or request the example URL.

## Resource-loading and HTML/SVG paths

- Flowchart images assign `node.img` to `new Image().src` and await `decode()` without a security-level guard: M/`chunks/mermaid.core/chunk-JZLCHNYA.mjs:2201–2204`. SVG image `href` is subsequently inserted at `:2240–2242`.
- Sequence actor `properties.icon` is treated as an image URL unless prefixed `@`: M/`chunks/mermaid.core/sequenceDiagram-WL72ISMW.mjs:1954–1959,2026–2031,2109–2116`. Shared `drawImage` sets `xlink:href` after URL sanitization, which does not enforce no-network operation: M/`chunks/mermaid.core/chunk-TZMSLE5B.mjs:65–70`.
- Registered icon packs may execute loader functions: M/`chunks/mermaid.core/chunk-JA3XYJ7Z.mjs:25–61`. No automatic CDN fetch was found in this mechanism. Missing packs become fallback icons; Font Awesome fallback depends on CSS-backed `i` elements at `:361–377`.
- KaTeX is dynamically imported from the installed package and may emit MathML or HTML: M/`chunks/mermaid.core/chunk-ABZYJK2D.mjs:2782–2809`. No automatic font CDN import was found here. Custom CSS remains an external-font resource path.
- C/`parseMermaid.js:75–86` appends a live off-screen div, renders into it, then assigns returned SVG through `innerHTML`.
- Mermaid's final DOMPurify pass follows renderer drawing and permits `foreignObject`: M/`mermaid.core.mjs:1044–1073`. HTML labels use `foreignObject` and `span.html`: M/`chunks/mermaid.core/chunk-JA3XYJ7Z.mjs:269–277`. Sanitizing final converted elements cannot prevent earlier resource requests.

## Native conversion versus SVG fallback

- Native converters exist for flowchart/graph, sequence, class, ER and state: C/`parseMermaid.js:89–111`; C/`graphToExcalidraw.js:30–49`.
- Other diagram families and native extraction exceptions silently become a single SVG image: C/`parseMermaid.js:113–120`; C/`converter/types/graphImage.js:3–23`. This is not per-node editable and conflicts with the current production embedded-raster-only image policy.
- Native conversion is not complete visual fidelity. Flowchart vertices default to rectangles; only stadium/round, doublecircle, circle and diamond receive dedicated shape conversion: C/`converter/types/flowchart.js:118–179`. Cylinders and many newer shapes are not faithfully preserved.

## Constraints for any future restoration — not implemented

1. Guard every parser entry point, including preview, quote-retry and auto-fix calls. Current donor direct call sites: D/`common.ts:78,87` and D/`MermaidToExcalidraw.tsx:176`.
2. Apply input limits before parsing. Enforce strict security, disabled HTML labels, fixed local fonts and `startOnLoad:false`. Preserve existing protected keys if extending Mermaid's `secure` list.
3. Reject or structurally constrain diagram configuration, directives, frontmatter, resource properties, HTML/Markdown images, external styles and interaction links before rendering. Literal `http` matching is insufficient because relative and encoded references may load resources.
4. Use a restrictive image/font/connect policy around rendering for a robust zero-egress boundary. Input filtering alone was not established as sufficient offline isolation.
5. If preserving production's no-SVG policy, visibly reject SVG fallback and image/file results rather than silently inserting them.
6. Remove donor private-storage behavior or adapt it to the approved host state policy: D/`MermaidToExcalidraw.tsx:70–74,124,217–224`; D/`common.ts:132–136`.
7. Describe a future limited implementation as constrained Mermaid import into editable basic shapes, with explicit unsupported features. Do not claim full Mermaid fidelity or restored AI text-to-diagram.

## Verification boundary

Source inspection and the exact Node-only configuration test above were completed. Browser rendering, network interception, interactive behavior, adversarial input behavior and safe-restoration integration were **not** tested. No browser was used, no remote House/Room/App/schema/status/issue writes were performed, and no production safety mitigation or Mermaid restoration is claimed by this audit.
