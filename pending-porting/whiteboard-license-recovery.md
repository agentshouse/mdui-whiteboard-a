# Whiteboard license recovery — local pending update

Not sent to the Porting Room. No remote document or status changes were made.

Fourteen missing package-root notices were recovered from official source text and bundled in THIRD_PARTY_NOTICES.txt with immutable URLs, verification history and SHA-256. Full provenance is also distributed under licenses/SUPPLEMENTAL-PROVENANCE.json.

- Twelve Radix packages use MIT Copyright (c) 2022 WorkOS from published gitHead fcef0668a5c827e5a4baac405474d75680f9a4eb. Installed source-map bytes, published-version metadata, lockfile integrity and the repository's release process were checked.
- @cfworker/json-schema 4.1.1 uses MIT Copyright (c) 2020 Jeremy Danyow from exact gitHead/release tag 5409fdc2bd144f68e8b28c61c71fcb16600000a6; its source manifest confirms 4.1.1.
- react-remove-scroll-bar 2.3.8's registry gitHead is unavailable. All 26 non-package.json files match official npm 2.3.7 exactly; only version/dependency-range metadata differs. The 2.3.7 tag/gitHead source tree exactly matches official commit 7301c160fda44cb8cf2b9fdfde61efad35736196, which adds the complete MIT Copyright (c) 2025 Anton Korzunov notice. This equivalence chain is preserved, and strict checks rehash every matching installed file.

The exact unresolved list now contains only @agentshouse/app-bridge 0.1.0-c357a960443ec: UNLICENSED, no root license file. No grant is supplied or inferred for it. Strict license completeness therefore still returns blocked/exit 1, while preservation and all fourteen recoveries pass. This is the known platform license gate rather than fourteen remaining fixable packaging omissions.

Current complete release: 18,793,438 bytes (17.923 MiB), 307 files, all 234 fonts. The changes are notices/provenance/checks only: editor code, Room behavior and runtime dependency versions are unchanged, and Mermaid stays out. Typecheck, scoped lint, all 15 regressions, Vite build and strict release checks pass. No browser or publication was attempted.
