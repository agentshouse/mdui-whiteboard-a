# Whiteboard A

Sketch, draw shapes, add text and arrange a canvas with local fonts, scene import/export and image export. Room documents use native Draft/Save with explicit synchronization status and conflict handling.

## Build and publish

Use Node >=24.21 and npm. Run `npm ci`, then `npm run verify` for type checks, lint, tests, provenance/security validation and a complete `dist/` build.

Configure `origin` to your House App HTTPS Git URL. Deliberately commit source changes on `main`, then run `npm run publish`. Publishing requires a clean source tree, repeats verification, and atomically pushes source and a parentless built release. It never stages or commits source changes. The command reports both commit IDs; House advertises only `main`, so verify App admission separately before claiming a current hosted release. GitHub publication is separate.

## Starter and shared schema

`starter/` contains the same existing licensed example in two separate editable representations: `drawings/` for Whiteboard A and `quickdraw/` for Whiteboard B. Both templates carry identical union schemas and starter bytes. Each App reads only its own type. Changes in one representation do not synchronize with the other. Copy the starter documents preserving their relative paths when setting up a Room; publishing does not modify Room data.

## Scope and licenses

No collaboration services, remote media imports, external data services or browser-storage fallback. Local automated checks do not establish hosted browser acceptance. Source and dependency attribution, original license grants and provenance are retained in `LICENSE`, `licenses/`, source headers and distributed notice files. Test inputs remain under `tests/support/`.
