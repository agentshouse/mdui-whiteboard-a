# Local donor visual fixture

This is a non-release visual fixture for the patched `@excalidraw/excalidraw` donor. It imports `tests/sample-scenes.json` directly, using the same synthetic scene data prepared for House Room seeding. It does not import or imitate the House runtime, bridge, document adapter, header, or persistence. It is not included by the production `index.html` or `src` entry.

Run the existing Vite dependency with `./node_modules/.bin/vite --host 127.0.0.1 --port 5189 --strictPort`, then open `http://127.0.0.1:5189/tests/visual.html`. The optional query `?scene=0` through `?scene=4` chooses a supplied sample. The visible yellow banner identifies the fixture.

## Attempt on 2026-10-11

- Vite started successfully on `127.0.0.1:5189`.
- Fixture TypeScript check passed: `./node_modules/.bin/tsc --noEmit -p tests/tsconfig.visual.json`. The fixture config includes donor ambient declarations; it does not change the production TypeScript configuration.
- Installed Python Playwright and `/usr/bin/chromium` were used. The browser was configured to abort every non-local HTTP request before navigation.
- Chromium failed during process launch, before any navigation, with `process_singleton_posix.cc:297: socket() failed: Operation not permitted (1)`.
- The same local-only launch with standard sandbox escalation failed with the same socket restriction. No alternate browser route was used.
- No hosted House URL was visited. No publication was attempted.
- No screenshots were captured; `tests/screenshots/` is empty.

## Checks still unverified

The intended desktop 1280×900 and mobile 360×800 checks remain unrun: full editor and scene rendering, local font loading, runtime off-origin request audit, menu and Save-as-image modal operation, same-screen drawing edits, and mobile containment.

Even a successful run of this fixture would validate only the donor/editor visual and local capabilities. It would not establish production header containment, House Room CRUD, reload persistence, synchronization, hosted acceptance, or release approval.

## Exact attempted browser command

Working directory: `/workspace/scratch/364b78933bbf/ports/whiteboard`.
This command was attempted once normally and once with the execution tool's `sandbox_permissions="require_escalated"`; both failed at the `launch` line. The browser did not reach `page.goto` in either attempt.

```sh
mkdir -p tests/screenshots && python - <<'PY'
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':900})
 page.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1:5189/') else r.abort())
 page.on('pageerror', lambda e: print('PAGEERROR',str(e)))
 page.on('console', lambda m: print('CONSOLE',m.type,m.text) if m.type=='error' else None)
 page.goto('http://127.0.0.1:5189/tests/visual.html',wait_until='networkidle')
 page.wait_for_selector('#root[data-initialized="true"]',timeout=60000)
 page.screenshot(path='tests/screenshots/desktop-donor.png')
 print('READY',page.locator('#root').get_attribute('data-element-count'))
 print(page.locator('button').evaluate_all('(els)=>els.map(e=>({text:e.textContent,label:e.getAttribute("aria-label"),title:e.getAttribute("title"),test:e.getAttribute("data-testid")}))'))
 print('RADIOS',page.locator('input[type=radio]').evaluate_all('(els)=>els.map(e=>({label:e.getAttribute("aria-label"),title:e.getAttribute("title"),test:e.getAttribute("data-testid"),value:e.value}))'))
 b.close()
PY
```

The local Vite process was stopped with Ctrl+C through its execution session; the tool confirmed exit code 130. No local server was left running by this check.
