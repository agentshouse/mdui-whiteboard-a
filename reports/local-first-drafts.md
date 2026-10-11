# Local-first Whiteboard typing

Follows Master messages 20261011T1415Z-master-spa-and-drafts, 20261011T1420Z-master-local-first-apps, and 20261011T1420Z-master-draft-overlap.

- Canvas changes and title input immediately stage the actual drawing path through the host client's browser-local Room Draft API. Typing does not call Save, Provider APIs, attachments, or an Agent.
- Opening a drawing hydrates that Room Draft before showing its editor. Switching drawings keeps each draft and never asks an unsaved-work question. The navigation warning and visible unsaved-change indicator are removed; explicit Save still queues the prepared drawing locally.
- Live room-drafts observation redraws shared title/canvas changes without remounting the donor editor. Pending newer local input is not overwritten by an earlier write reply.
- Writes serialize per drawing, name the known revision, and preserve first bases and unrelated fields/sections. After a stale answer they read the current shared draft and reapply the latest queued input, per Master's same-browser last-input-wins rule. Canvas deltas merge by element ID and changed app-state/file keys, retaining disjoint changes and respecting later local ordering edits. No recovery paths, extra document types, inferred identity, or automatic Save are introduced.
- Cross-device conflicts remain ordinary Room Save outcomes. Returned drafts and persistence failures stay actionable; no existing draft is discarded as part of navigation.
- All donor/application JavaScript and locales are carried in the initial executable asset. The release audit rejects additional JavaScript chunks. Full donor fonts, notices, schema and data are preserved. The donor's existing main-thread fallback handles font subsetting when its worker is in the initial chunk.

Tests exercise fresh-session draft hydration, rapid typing, explicit Save only, first-base retention, disjoint and overlapping local writes, observing another tab, canvas input restoration after full React unmount/remount, scope checks, and Scene element/state merging. These are local synthetic contract/DOM tests. Real hosted reload, visual, media, and multi-device acceptance are not inferred from them; the known House installed-release activation defect remains an independent browser verification constraint.

Runtime service-mode correction: Provider write-halted still permits local draft edits and explicit document Save/queue. The UI keeps these available, while attachment Actions remain separately gated. Regression coverage asserts this documented distinction.
