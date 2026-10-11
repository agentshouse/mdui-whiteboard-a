---
status: open
port: whiteboard
---

# Portable Mermaid import exceeds the current release budget

LOCAL DRAFT ONLY. Not submitted to the Porting Room. No remote document, status, issue, schema, App, push, or publication was changed during this investigation.

## Finding

Mermaid-to-diagram is a genuinely local donor feature and must not be described as intrinsically dependent on AI or an outside service. The donor calls a bundled converter in packages/excalidraw/components/TTDDialog/common.ts:75–87. It was omitted from the prepared Whiteboard source together with the AI dialog. This investigation measured its restoration without changing the production editor or Room behavior.

The callable converter alone puts the unchanged editor and all donor fonts above the 20 MiB limit. Production Mermaid import therefore remains unavailable, explicitly recorded as a fidelity gap. No donor fonts/features were trimmed and no replacement renderer was invented to make it fit.

## Exact versions

- Donor source: excalidraw/excalidraw e65eca999e071503efb893d3379a29fb96ff37c4
- Baseline port source: 00c8571537a2d3c4ba63faa504d98c330621b5ff
- @excalidraw/mermaid-to-excalidraw 2.2.2
- mermaid 11.12.2, pinned to the donor yarn.lock rather than the newer version its semver range currently resolves
- @mermaid-js/parser 0.6.3
- Probe npm manifest and complete lock are preserved in tests/mermaid-feasibility/package.probe.json and package-lock.probe.json.

## Measurements

The built, minified production baseline is 306 regular files and 18,726,413 bytes. It contains every one of the donor's 234 WOFF2 files. Its remaining allowance under 20,971,520 bytes is 2,245,107 bytes.

The isolated probe imports the unchanged production entry and makes the exact converter's public parseMermaidToExcalidraw API reachable by a dynamic import. Vite builds the actual transitive dependency closure. It is a build-only probe, never a production entry or a browser-executed test.

- Probe before added notices: 356 files, 21,393,599 bytes (20.402526 MiB)
- Added bytes above baseline: 2,667,186
- Bytes above release limit: 422,079
- Existing production dependency notice file: 303,302 bytes
- Re-generated probe dependency-closure notice file: 543,473 bytes
- Added notice cost: 240,171 bytes
- Probe plus those additional notices: 21,633,770 bytes, 662,250 bytes above limit

The dependency notice generator intentionally includes the installed production dependency closure, a conservative superset of bundled code. Even the probe before this conservative notice cost already fails the cap.

The donor Mermaid dialog, CodeMirror input, preview/error UI, offline-safety wrapper, additional asset audits and associated UI CSS have NOT been restored or measured. Their additional cost is not assumed to be zero: the figures above are the already-failing parser-only build, not an estimate of a complete safe implementation. Lazy loading changes startup cost but does not remove files from the release's total-size cap.

Largest added dependency chunks include the converter/Mermaid shared entry (~560,712 bytes), Cytoscape (~443,805), treemap (~330,919), KaTeX (~258,490), and architecture (~148,755). The exact emitted file list's largest entries are in size-result.json. Diagram-family removal or font removal was not attempted.

## Reproduction commands

Run only in an isolated copy of the Whiteboard source; do not replace the production manifest in place. No House access is needed.

```sh
# From the isolated copy's root; these snapshots match the measured install.
cp tests/mermaid-feasibility/package.probe.json package.json
cp tests/mermaid-feasibility/package-lock.probe.json package-lock.json
npm ci --no-audit --no-fund
node scripts/prepare-release.mjs
node tests/mermaid-feasibility/measure.mjs
# Output: .mermaid-feasibility-dist and tests/mermaid-feasibility/size-result.json

# Separately measure the dependency-notice increment.
node scripts/generate-notices.mjs
wc -c public/THIRD_PARTY_NOTICES.txt
```

The measurement script uses the same Vite config/build options as production, changing only input and output paths. The browser was never opened. It uses raw emitted file bytes, not gzip or package-tarball sizes. The postbuild size calculation initially hit package-export resolution errors after Vite succeeded; it was corrected to read the preserved exact probe lock. Recounting the same generated artifact produced the recorded totals; this is not a failed-build estimate.

## Safety and portable scope

A future implementation needs safety work in addition to more release space. Full evidence and an exact local Node-only configuration test are in tests/mermaid-feasibility/SAFETY_AUDIT.md.

- The converter renders Mermaid into a live off-screen DOM, including assigning SVG through innerHTML, before it extracts Excalidraw elements. Sanitizing only the returned elements is too late to guarantee no external requests.
- Mermaid 11.12.2 inherits strict security, but strict still allows image-loading code paths. Flowchart image properties assign a URL directly to new Image().src. Sequence participant icon properties can become SVG image URLs. Relative and encoded URLs matter too.
- Directives/frontmatter can modify HTML-label and CSS settings; a local Node test retained an external @font-face rule even while securityLevel remained strict. This test did not fetch its example URL.
- The donor has multiple direct parser entry points, including auto-fix probes. An offline wrapper must cover all of them, constrain configuration/resources before render, use bundled fonts, and provide a robust no-egress rendering boundary. Such a wrapper has not been implemented or runtime-verified here.
- Native editable converters exist for flowcharts, sequence, class, ER and state diagrams. Other families and extraction failures silently fall back to an SVG image. That conflicts with current Whiteboard's raster-only scene validation. Even some native flowchart shapes are simplified to rectangles.
- Restoring only editable basic-shape families would be a deliberately constrained feature, not full Mermaid support. Supporting the SVG fallback would require a separate reviewed safe media path; it must not bypass current Room validation.
- Donor localStorage-based text saving and external documentation links must be removed; input should remain session UI state and inserted scene elements should use the existing Room save flow. AI, remote images, and third-party services remain outside this restoration scope.

## Production state and final checks

The converter was removed from production dependencies after measurement. No converter import is reachable from production. Source editor packages, src/, manifest, schema, public assets/notices, and Room adapter are unchanged from the baseline. At the time of that probe, rebuilt production was exactly 18,726,413 bytes / 306 files / 234 fonts. The later notice-only recovery below changes that current total.

- Source TypeScript: passed
- Fifteen existing Room/refusal/seed regression tests: passed
- ESLint for the House integration, validation/measurement scripts, and local unit tests: passed. This is scoped lint; it does not assert the full upstream donor suite passed.
- Production Vite build: passed, with the existing non-failing large-chunk advisory
- Strict release size/file/asset-closure/font/domain checks: passed
- License text preservation: passed for installed production package-root texts and distributed source/font notices
- Strict license completeness: BLOCKED, exit 1. The initial audit found 15 missing package-root notices, including @agentshouse/app-bridge declaring UNLICENSED. Fourteen notices were subsequently recovered as described below; the current tests/license-check.json has only the bridge gap. No license permission was inferred from metadata alone.
- Browser/hosted behavior: not run in this investigation, as instructed

## Requested next decision once communication resumes

Please advise a release allowance/approved portable Mermaid scope before restoration. A complete safe local feature cannot be claimed under the current tested package closure and cap. No source, release, or Room update should be published from this probe. Tasks remains first under the existing sequence.

## Later notice-only recovery — 2026-10-11 03:48 UTC

Verified official source text and immutable provenance now resolve fourteen of the fifteen missing package-root notices. The only unresolved package is @agentshouse/app-bridge 0.1.0-c357a960443ec (UNLICENSED; no license file), the known platform gate. The complete current production release is 18,793,438 bytes, 307 files, and all 234 font files; remaining allowance is 2,178,082 bytes. This change adds notices/provenance only, leaving every production JS/CSS/font and Room feature unchanged. The original Mermaid probe measurements above are retained as historical measured evidence; Mermaid has not been added.
