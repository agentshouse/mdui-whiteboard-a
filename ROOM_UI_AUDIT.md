# Master 12:25 donor chrome audit

Instruction: Porting `messages/20261011T1225Z-master-crm-room-label.md`, 2026-10-11. Donor Excalidraw at `e65eca9` has an offline warning only during its live collaboration mode (`excalidraw-app/App.tsx`, `isCollaborating && isOffline`). The House port does not run that donor collaboration mode, so its added persistent House sync row was not a donor-equivalent indicator.

Removed the added new-drawing Room selector and generic sync text. Retained the drawing picker/title, genuine unsaved-document warning and Save action, plus errors, refusal, returned-draft, storage-loss and write-halt notices. Exactly one runtime Room is accepted for creation; ambiguous bindings show a configuration error, hide the editor and block writes. No hardcoded Room locator, fallback, schema/manifest or provider changes.

Typecheck, lint, all 22 tests, build and release:check pass. Added source-contract regression ensures Room/sync chrome stays absent and document controls/warnings remain. This is local source/structural coverage, not hosted UI/pixel acceptance. Existing local provider tests retain exact bases and refusal behavior.
