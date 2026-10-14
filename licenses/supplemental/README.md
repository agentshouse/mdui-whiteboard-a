# Recovered package notices

These source copies fill missing package-root notice files in the installed production dependency closure. Build scripts verify exact package/version mapping, immutable official source links, copyright text and SHA-256 before including the full text in THIRD_PARTY_NOTICES.txt. Provenance is also distributed as licenses/SUPPLEMENTAL-PROVENANCE.json.

No package license was inferred from its identifier alone. The known @agentshouse/app-bridge UNLICENSED package remains unresolved; this directory does not supply or invent a grant for it.

## Source verification

- @cfworker/json-schema 4.1.1: official npm gitHead equals the annotated official release tag's commit 5409fdc2bd144f68e8b28c61c71fcb16600000a6. Source manifest confirms the exact version. Root MIT notice names Copyright (c) 2020 Jeremy Danyow.
- Twelve Radix packages: exact npm registry versions all identify fcef0668a5c827e5a4baac405474d75680f9a4eb. Installed source-map sourcesContent matches the pinned source, and lockfile integrity matches npm metadata. The source manifests contain pre-publication -rc.9 versions; pinned release scripts/documentation explain bumping stable versions before publishing, then committing the version changes afterward. The full root MIT notice names Copyright (c) 2022 WorkOS. Details for every package are in radix/provenance.json.
- react-remove-scroll-bar 2.3.8: published gitHead b3b1287aad81def2e2ae707274b74531b61ddbaf cannot be retrieved from the official repository. Rather than use a current license without evidence, compared both official npm releases: all 26 files other than package.json are byte-identical between 2.3.8 and 2.3.7. Only version and the react-style-singleton dependency range differ. Version 2.3.7's exact published gitHead/tag is 29e9fcd1eecf7d3b77a767941c4a57fe461fc1e4. Its entire src tree is identical to the later official commit 7301c160fda44cb8cf2b9fdfde61efad35736196 that adds the full MIT notice, Copyright (c) 2025 Anton Korzunov. That pinned grant applies to the unchanged source. Artifact equality evidence, registry metadata and source-tree IDs are retained. Checks rehash all 26 installed files before accepting this recovery.

All research was read-only against public official registries/repositories. No production dependency version, feature, or Room behavior was changed. These are packaging/provenance checks, not a blanket legal opinion.
