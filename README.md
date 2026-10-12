# Whiteboard A

Sketch, draw shapes, add text and arrange a canvas with local fonts, scene import/export and image export. Room documents use native Draft/Save with explicit synchronization status and conflict handling.

## Build and publish

Use Node >=24.21 and npm. Run `npm ci`, then `npm run verify` for type checks, lint, tests, provenance/security validation and a complete `dist/` build.

Configure `origin` to your House App HTTPS Git URL. Deliberately commit source changes on `main`, then run `npm run publish`. Publishing requires a clean source tree, repeats verification, and atomically pushes source and a parentless built release. It never stages or commits source changes. The command reports both commit IDs; House advertises only `main`, so verify App admission separately before claiming a current hosted release. GitHub publication is separate.

## Starter and shared schema

`starter/` contains the same existing licensed example in two separate editable representations: `drawings/` for Whiteboard A and `quickdraw/` for Whiteboard B. Both templates carry identical union schemas and starter bytes. Each App reads only its own type. Changes in one representation do not synchronize with the other. Copy the starter documents preserving their relative paths when setting up a Room; publishing does not modify Room data.

## Scope and licenses

No collaboration services, remote media imports, external data services or browser-storage fallback. Local automated checks do not establish hosted browser acceptance. Source and dependency attribution, original license grants and provenance are retained in `LICENSE`, `licenses/`, source headers and distributed notice files. Test inputs remain under `tests/support/`.

## Portable publisher safety

The publisher accepts credential-free HTTPS House App remotes on any host, including
`https://<host>/app/new.git` for creation. Choose only a host and App you are authorized
to publish to. Host portability does not authorize publication to another environment.
For initial creation, use `npm run publish -- --name "<display name>"`; `--name` is
optional and no default display name is invented. The helper reports only complete,
explicitly returned App/Git receipt URLs and never changes `origin`. After creation,
inspect the returned canonical App in House and set its actual Git URL as `origin`
before another publication. Never retry an uncertain creation blindly.

`npm run test:publisher` runs offline local-Git regression fixtures with mocked
push/remote transport; it installs no packages and does not contact House. These
checks are included in `npm run verify` before the existing App-specific gates.
Publication requires clean committed `main`, runs exactly that full verify gate,
pins the source SHA, and atomically pushes source `main` plus a parentless dist-only
`release`. It preserves the normal index and source branch, rejects unsafe origin
rewrites, index flags, metadata mismatches, and conflicting publisher/worktree locks.
It never commits source, resets work, or substitutes a build-only verification.

Failure diagnostics suppress arbitrary subprocess output to avoid leaking credentials.
Run `npm run verify` locally for full compiler/test output; never share credential
values or verbose HTTP traces. A reported creation receipt or advertised source SHA
does not prove release admission: inspect the known App's published revision in House.
After a failed or uncertain push, inspect that state before deciding whether to retry.

## House navigation

Drawing identity is retained in `/drawings?room=<locator>&path=<document path>` through the existing House bridge. Back, Forward, copied links and reload resolve the exact observed drawing after synchronization. Root replaces itself with the first drawing; missing or wrong-Room targets are never created or replaced with unrelated content.

Native scene/title drafts outlive their canvas views. Navigation does not Save or discard. Save, New and Delete capture their original document and navigation generation so a delayed completion cannot change a newer view. Live query updates continue to preserve dirty canvases and returned drafts.
