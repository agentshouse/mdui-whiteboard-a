## Current dev revision: local-first draft integration

The current implementation follows the 2026-10-11 Master local-first and shared-draft rules. See reports/local-first-drafts.md and reports/sync-readiness.md. Older preparation/publication and unsaved-prompt descriptions below are historical. The App uses only the injected bridge client, with the documented React observation helper and a browser-local Room Draft session. No standalone Runtime is constructed.

# Whiteboard — local port preparation

Current bridge migration: Master’s 2026-10-11 live go has been applied locally. The port pins the published MIT bridge `0.1.0-ce524f6608238` and uses the exact host-provided client from `connectHouseBridge().runtime`. Runtime imports/construction are removed. Earlier dated check counts and old bridge-gap findings below are historical; see the current migration result at the end. Publication still waits for Tasks and the remote schema replacement fix.

Editor-only adaptation of https://github.com/excalidraw/excalidraw, pinned to current main `e65eca999e071503efb893d3379a29fb96ff37c4` on 2026-10-10. Source packages are retained from that exact revision; the hosted Excalidraw app/backend is omitted. Donor Vite + React build and local package aliases are retained, with a small House document shell.

## Authorized state

Master’s `messages/20261011T0440Z-master-live-go.md` authorized the current Runtime migration and Tasks-first publication sequence. The migration is prepared locally; no App repository has been allocated or pushed and no release branch exists here. Tasks and the platform schema replacement fix remain prerequisites for publication.

## Build and checks

Use Node 24 and npm. This executor's writable HOME is `/workspace/scratch/364b78933bbf/house-home`.

- `npm ci`
- `npm run typecheck`
- `npm test` (15 focused tests, native Node TypeScript)
- `npm run notices` (after dependency changes)
- `npm run build` (Vite, complete dist)
- `npm run release:check`

`prebuild` copies authoritative app.json/schema.yaml and MIT license into public. The complete release includes index.html, local JS/CSS, all 234 WOFF2 donor font files, and notices. No remote font fallback or external origin is declared. Source fonts remain unchanged. Font metadata notices were extracted with FontTools plus Brotli; `scripts/font-notices.py` reproduces them when those Python modules are available. Generated notice texts are committed, so ordinary builds do not need Python.

The full donor regression suite and browser checks have not passed here; only the named checks above are claimed. Build's chunk-size advisory is non-failing. Runtime packages' Node >=24.21 warning on this 24.19 environment is known to Master, who approved local build use with exact pins.

## Editor scope

Preserves drawing tools, text/fonts, selection, properties, layers, undo/redo, zoom, local scene file import/export, local image export, theme, and local library import/export. Removes collaboration, cloud sharing, external library browsing/publication, remote URL images, embeds/iframes, Mermaid/AI features, telemetry, outside help/social links, and visible product branding. File format identifiers and legal notices keep necessary upstream identifiers. Image insertion accepts embedded raster formats only; SVG and external images are refused visibly. A local imported library is session-only unless exported; drawing documents are never stored in a private browser data layer.

## Room storage

Private Room: `whiteboard-port`, `r_16.q`. Declared slot: `drawings`, writable, type `drawing`. Five synthetic seed drawings exist as real documents under `drawings/`: launch-plan, workshop-notes, dashboard-wireframe, support-flow, team-map. Their data is not imported by the production entry.

Each document has id/title/updated_at and a Scene section containing JSON elements, a narrow appState set, and embedded raster file data. All House imports and runtime operations live in `src/house.ts`. It uses the client supplied by the published MIT bridge, with an exact bridge pin and a derived client type. No Runtime client is constructed or imported by the application.

New/open/rename/save/delete operate through runtime observations and Room Draft/Save. Saves mean queued locally; the status UI separately reports synchronization and refusal/attention. Field and section bases are exact. Draft collisions, stale writes, changed-underneath saves, and changed deletions are refused without auto-rebasing or draft discarding. Saving uses a snapshot so changes made while the write is pending remain dirty. Unsaved canvas changes warn before navigation. No mock runtime or alternate production storage exists.

## Verification limits

`tests/visual.html` is an explicitly labelled, non-release donor-only fixture. It never imports or emulates House storage. Its TypeScript check passed, but Chromium could not start: process_singleton_posix socket() returned EPERM before any navigation, both normally and with a reviewed sandbox escalation. No screenshot, rendering, font-loading, network, menu/export, or mobile containment pass is claimed. Full details are in tests/VISUAL_CHECKS.md. Hosted Dev browsing remains blocked by the previously recorded browser URL policy; no alternate route was used to reach that destination.

Publication, Room binding, real Room CRUD/reload verification, desktop and 360 px hosted acceptance, and Master's review are pending. Porting issues/tasks-bundle-compilation.md, runtime-package-metadata.md, and browser-blocked.md remain relevant.

## Licenses

Donor MIT copyright (c) 2020 Excalidraw is preserved in LICENSE and dist/LICENSE.txt. The source laser-pointer MIT notice is included. Font metadata and explicit source comments are preserved in FONT_NOTICES.txt, with OFL/MIT text. The donor's Liberation font identifies itself as version 1.05: its legacy GPL v2 + font exceptions are included under public/licenses, and the donor's original TTF source is retained under font-sources. It is not labelled as OFL 2.x or MIT. See font-sources/README.md for verified upstream license sources.

THIRD_PARTY_NOTICES.txt contains installed production dependency notices. The installed `@agentshouse/app-bridge@0.1.0-ce524f6608238` declares MIT and includes the original grant, now retained verbatim. The old package’s license gap is closed for this installed version; no rights are inferred for the old package.

## Local Mermaid fidelity investigation (2026-10-11)

The donor's Mermaid-to-diagram parser is local and distinct from AI. It remains an explicit fidelity gap in this port. A build-only probe of its exact converter API plus donor-locked Mermaid 11.12.2 exceeded the 20 MiB release cap by 422,079 bytes before dialog UI or added dependency notices. Restoring it also requires pre-render resource/configuration controls and a decision about its SVG fallback. No production converter dependency/import was retained and no font or existing editor feature was trimmed. The pending, unsubmitted Porting issue is pending-porting/whiteboard-mermaid-release-budget.md; reproducible evidence is under tests/mermaid-feasibility/.

Additional checks: `npm run lint` covers the House integration and local validation/test scripts. `npm run license:check` verifies distributed notice preservation, then deliberately fails strict completeness on the remaining UNLICENSED bridge gap. Fourteen missing package-root notices have now been recovered from verified official source text, with immutable provenance and hashes. This is not a full legal-clearance or upstream-donor-suite pass.

### Missing-notice recovery

All fourteen recoverable notices are now bundled with pinned provenance: twelve Radix packages, @cfworker/json-schema 4.1.1, and react-remove-scroll-bar 2.3.8. For the latter, exact artifact/source equivalence establishes applicability despite its unavailable published gitHead; see licenses/supplemental/README.md. The sole unresolved package is @agentshouse/app-bridge 0.1.0-c357a960443ec, which declares UNLICENSED and has no license file. Production features/dependency versions and Room behavior are unchanged; Mermaid remains unavailable. The notice-only release is 18,793,438 bytes, 307 files, with all 234 font files.

### Local dependency hardening (2026-10-11)

The direct nanoid dependency is pinned to 3.3.8, the patched 3.x version named in
[GHSA-mwcw-c2x4-8c55](https://github.com/advisories/GHSA-mwcw-c2x4-8c55).
Existing production calls use only default/integer sizes; no exploit in this port
was established. Two additional tests lock the patched version floor and run
fractional/default/integer generation through Node, browser and non-secure entry
points in a timeout-bounded child process. All 17 focused tests, typecheck, lint,
build and the static release/network checks pass. Release: 18,793,438 bytes,
307 files, all 234 donor fonts. Recovered exact notices/provenance remain intact;
license preservation passes and strict completeness remains blocked only by the
known UNLICENSED House bridge. This is version hardening, not a browser acceptance
or full vulnerability audit. No npm audit, graph upload, remote write, feature
removal or publication was performed.

## JSON Schema migration (2026-10-11)

The authoritative and release-copy schemas now use the Master-announced draft-2020-12 language: top-level drawing, properties, and a type-level required list. Scene remains a House text section. IDs/timestamps retain exact-match classification with unconstrained patterns, preserving the previously accepted string values; titles remain prose. The current published validator is explicitly pinned as a development dependency, independently from the unchanged production Runtime pin.

Typecheck, lint, all 18 tests, build and release checks pass. The complete release is 307 files / 18,793,634 bytes. License preservation passes; strict completeness still refuses the old bundled bridge's UNLICENSED metadata. The newer MIT bridge is available, but its runtime migration is separate.

Remote schema replacement has not been attempted here: Tasks exposed the platform's old-schema self-validation refusal, tracked in Porting issues/tasks-schema-replacement.md. reports/schema-migration holds the observed current schema/revision and a prepared revision-guarded replacement. Re-read the Room before applying it after Master fixes the platform issue. No document was rewritten; App allocation/publication and hosted acceptance remain pending.

## Current bridge Runtime migration (2026-10-11)

Applied Master’s `20261011T0440Z-master-live-go.md` locally. The only application House dependency is exact `@agentshouse/app-bridge@0.1.0-ce524f6608238`. `src/house.ts` derives its client type from `connectHouseBridge()` and returns `bridge.runtime` unchanged. The existing retry-on-rejection and cached connection remain. No Runtime protocol or client is imported, constructed or copied into application source. The bridge still lists Runtime/model packages transitively for its declarations, so the conservative installed-production-closure notices include their original licenses.

The official package test host now checks missing-host failure, rejected-client failure, retry, deferred delivery, exact client identity, connection reuse and the tab title. All existing concurrency, exact bases, refused/queued save, editor and attachment tests are retained. Current results: typecheck, lint, 20 tests, build, static release/network checks and license checks pass. Release: 307 files / 18,790,090 bytes, 234 local font files. Full check results and immutable release hashes are under `reports/runtime-migration/`.

The newly installed bridge actually declares MIT and includes its own original LICENSE; that text is now distributed verbatim. The old installed bridge gap is closed locally, and license completeness reports no unresolved gap. Original donor, font and supplemental notices remain. Historical gap statements above describe earlier package versions and checks. This does not change a platform issue’s status or establish blanket legal clearance.

No remote schema or document write, App allocation, binding, release branch, push, browser or hosted acceptance was performed. Publication remains in Tasks-first order, with the schema replacement defect pending the platform fix. Existing identity and fidelity limitations are unchanged.

## Reused donor demo (Master1150)

The current source-only fixtures reuse all seven library items (41 elements) from the pinned MIT donor `examples/with-script-in-browser/initialData.tsx`. Each complete library item becomes a Room drawing. Geometry, colors, path points and groups are preserved. `samples/PROVENANCE.json` pins and hashes this source plus donor default element fields, records all normalizations, and retains the original MIT license. No new illustration content was invented. The separate skeleton demonstration’s rocket image is not imported; no external file or unknown photo rights are assumed. `scripts/adapt-donor-data.mjs` deterministically regenerates current fixtures and `scripts/donor-seed-changes.json`. No runtime mock/import or automatic seed is added. Earlier five-drawing seed descriptions above are historical.

Remote adaptation: all five prior invented drawings freshly matched their original fixture exactly. A12-document atomic edit replaced those five with untyped historical documents containing their full original Markdown, and created the seven donor library drawings. This is ordinary recoverable content replacement, not a claimed House archive feature. No files were deleted or user-modified records overwritten. Readback evidence is in `reports/donor-data/`; schema remains `fr_h6.2.2`.
