# The Codex

Research database for decoding codes. Which Life Paths dominate a field, which
compounds cluster where, which values are honestly overrepresented vs what the
calendar itself produces.

Built on the same mechanics as the numerology cockpit's EMAX database. The
calculation engines (numerology.js, compat-data.js, compat-engine.js,
overrides-engine.js, imprint-alignment.js, astro files) are read-only copies
from the cockpit. Never edit them here; re-copy from numerology-app when the
cockpit's versions change.

## Pages

- `index.html` - fields grid, global search, Leaderboard Lab, Reverse Lookup,
  Cross-Field Compare, baseline build, backup, cloud slot.
- `field.html?id=...` - one field: add via Wikidata lookup, manual add, bulk
  import, seed preload, distribution chart, sortable entry table.

## Rules baked in

- Dates are always real and day-precision. No fabricated days, no bare years.
  A subject Wikidata cannot date exactly is reported as a miss.
- The true baseline runs the real engines over every date 1900-2009 and is
  the honest "expected" distribution. Rest-of-DB mode compares against the
  collection instead. Raw mode shows counts only.
- All reductions come from the engines. Nothing here reinvents one.

## Cloud

Local-only until `firebase-config.js` is filled in. Then: Google sign-in,
owner-locked to the configured email, chunked Firestore sync, newer copy wins.

## Serving

Static files. Any static host works (GitHub Pages). Locally: any static
server from this folder.
