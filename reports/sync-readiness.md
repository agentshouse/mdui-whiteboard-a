# Initial synchronization and binding recovery

Master instruction: Porting `messages/20261011T1400Z-master-rooms-wait-for-sync.md`, read 2026-10-11.

The runtime's `rooms()` reads local state and may initially be empty. Readiness now follows ongoing Rooms and Sync Status observations. Before `lastCompleted` is non-null the App displays Loading rather than diagnosing a missing binding. After completion, binding diagnostics follow the latest Rooms value and clear on recovery.

The documented `@agentshouse/mdruntime/react` useObserve helper consumes only the bridge-supplied client. It does not construct a runtime, access a provider, change CSP, or add external services. The helper is pinned to the already installed MIT dependency version and its original grant remains in the complete notices. 

The one-Room contract remains. Temporary missing/ambiguous bindings and connection refusal disable writes without unmounting the opened editor. Returning valid bindings clear the warning. No Room, schema, binding, demo data, or donor assets change.

Regression coverage includes initial empty/cached bindings before sync, completed invalid state, later valid binding, transient reach/refusal loss, and retention of an unfinished canvas/editor/composer. These are synthetic DOM/store checks, not a claim of live browser, media, Agent, or two-device acceptance.

## Follow-on local-first review

The later Master SPA/drafts instruction (20261011T1415Z) is being audited separately. This readiness revision preserves in-memory edit buffers during transient loss; it does not claim that every edit buffer already persists across a full reload. Existing client-side navigation remains. No unsaved-work prompt is removed without an actual persistent replacement.
