---
phase: 06-eco-domain-tagging
plan: "02"
subsystem: processor
tags: [eco-tagging, frontmatter, cli, node-test, manifest]

# Dependency graph
requires:
  - phase: 06-01
    provides: eco-prompt.js with buildEcoMessages, parseEcoTag, printEcoDomainSummary exports
  - phase: compiler/frontmatter.js
    provides: parseFrontmatter for reading existing ecoTag from .md files
  - phase: processor/manifest.js
    provides: loadManifest, saveManifest for updating manifest entries
provides:
  - Standalone eco-tagger.js CLI for re-classifying already-processed lecture .md files
  - patchFrontmatterEcoTag utility that inserts/replaces ecoTag in YAML frontmatter without touching body
  - retagAll function that processes outputDir, skips tagged files, supports --force, prints domain summary
  - Comprehensive test suite: 6 unit tests for patchFrontmatterEcoTag + 5 integration tests for retagAll
affects:
  - phase: 07 (any phase that processes compiled output) - eco-tagger can backfill ecoTag on legacy files

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD: failing tests written first (RED), then implementation (GREEN), all 11 tests pass
    - Frontmatter patch via regex replace: strict match then fallback for no-trailing-newline edge case
    - Body-preservation: slice at match[0].length guarantees body bytes are untouched
    - Mock client pattern: callCount object shared by reference to verify call count in assertions
    - console.log capture pattern: replace/restore console.log to assert CLI output format

key-files:
  created:
    - processor/eco-tagger.js
    - processor/tests/eco-tagger.test.js
  modified: []

key-decisions:
  - "patchFrontmatterEcoTag uses two-regex strategy: strict (trailing newline) then fallback (no trailing newline) to handle all real-world .md files"
  - "Body preservation: fileContent.slice(match[0].length) returns body bytes verbatim -- no parsing or modification"
  - "retagAll uses max_tokens:10 lightweight ECO call only -- does not call buildMessages, preventing content regeneration"
  - "Domain summary assertion in test captures console.log directly (People: 1 format) to verify ENHA-04 for re-classification path"

patterns-established:
  - "Pattern: patchFrontmatterEcoTag removes ecoTag line then re-inserts at end of frontmatter block (idempotent)"
  - "Pattern: retagAll iterates .md files sorted by name, logs progress with padded file counter [N/total]"

requirements-completed: [ENHA-06, ENHA-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 6 Plan 02: ECO Re-Tagger Summary

**Standalone eco-tagger.js CLI that patches YAML frontmatter ecoTag in processed lecture .md files via lightweight AI call (max_tokens:10), with body-preservation guarantee and --force re-tag support**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T22:17:31Z
- **Completed:** 2026-03-21T22:19:34Z
- **Tasks:** 2 (TDD: RED+GREEN combined in one pass)
- **Files modified:** 2

## Accomplishments

- `patchFrontmatterEcoTag` safely inserts or replaces ecoTag in YAML frontmatter using two-regex strategy with body-preservation via byte-exact slice
- `retagAll` processes entire output directory, skips already-tagged files (unless --force), makes ECO-only AI calls (max_tokens:10), updates manifest with ecoTag and ecoTaggedAt, prints domain summary
- 11 tests pass including body-preservation assertion, console.log capture test verifying domain summary format "People: N", and --force re-tag coverage

## Task Commits

Each task was committed atomically:

1. **Task 1+2: patchFrontmatterEcoTag + retagAll (TDD RED+GREEN)** - `4f7e99d` (test + feat)

## Files Created/Modified

- `processor/eco-tagger.js` - Standalone ECO re-classification CLI; exports patchFrontmatterEcoTag and retagAll
- `processor/tests/eco-tagger.test.js` - 6 unit tests (patchFrontmatterEcoTag) + 5 integration tests (retagAll)

## Decisions Made

- Two-regex frontmatter match strategy: strict (`/^---\n...\n---\n/`) then fallback (`/^---\n...\n---/`) handles both standard and edge-case .md files without trailing newline
- Body bytes returned via `fileContent.slice(match[0].length)` — no body parsing, no risk of content mutation
- `retagAll` uses max_tokens:10 ECO-only call, never imports buildMessages — cleanly separates re-classification from content generation
- ENHA-04 verified by console.log capture in test asserting "People: 1" format rather than just calling printEcoDomainSummary indirectly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- eco-tagger.js is ready to run: `node processor/eco-tagger.js processor/output/ [--force]`
- Backfill of legacy lectures (processed before Phase 6) can proceed immediately
- All 105 tests pass across the full test suite (eco-tagger, eco-prompt, processor, estimate, etc.)

---
*Phase: 06-eco-domain-tagging*
*Completed: 2026-03-21*
