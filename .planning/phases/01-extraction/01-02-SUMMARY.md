---
phase: 01-extraction
plan: 02
subsystem: extraction
tags: [javascript, bookmarklet, udemy, dom-extraction, transcript]

# Dependency graph
requires:
  - "extractor/cleaning.js (cleanTranscript, countWords, toFilename)"
  - "extractor/SELECTORS.md (verified data-purpose DOM selectors)"
provides:
  - "extractor/extractor.js: complete self-executing async extraction script (290 lines)"
  - "extractor/bookmarklet.js: localhost loader stub"
  - "extractor/bookmarklet.txt: URL-encoded installable bookmarklet with instructions"
  - "extractor/package.json: npm serve and test scripts"
affects:
  - "Phase 02 processing pipeline (receives JSON with 7 required fields)"

# Tech tracking
tech-stack:
  added:
    - "Blob + URL.createObjectURL/revokeObjectURL for client-side JSON download"
    - "setInterval-wrapped Promise for polling transcript panel appearance"
    - "localStorage for duplicate detection keyed on lecture title"
  patterns:
    - "Self-executing async IIFE (pmiExtract) — safe to inject multiple times"
    - "Inline copy of cleaning.js functions — browser context cannot use require()"
    - "Toast overlay with auto-remove (setTimeout 4000ms) using fixed positioning"
    - "data-purpose attribute selectors from SELECTORS.md — stable across Udemy CSS rebuilds"

key-files:
  created:
    - "extractor/extractor.js"
    - "extractor/bookmarklet.js"
    - "extractor/bookmarklet.txt"
    - "extractor/package.json"
  modified: []

key-decisions:
  - "Cue text extracted via [data-purpose='cue-text'] span child — more precise than cue element textContent"
  - "Caption type detected from [data-purpose='captions-dropdown-menu'] text containing [CC] or [Auto]"
  - "Duplicate detection uses localStorage key 'pmi-extracted-{lectureTitle}' — shows warning but does not block"
  - "Toggle panel check polls 10x at 100ms intervals before failing — handles React render delay"

# Metrics
duration: 10min
completed: 2026-03-20
---

# Phase 01 Plan 02: Extractor.js and Bookmarklet Package Summary

**Self-executing async bookmarklet script (290 lines) using verified data-purpose DOM selectors to extract, clean, validate, and download Udemy transcripts as JSON; smoke-tested on live Udemy and approved**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-20T17:32:08Z
- **Completed:** 2026-03-20
- **Tasks:** 2 of 2 complete
- **Files created:** 4

## Accomplishments

- Built complete `extractor.js` (290 lines) with inline cleaning functions, toast overlay, JSON download with memory-leak-safe `revokeObjectURL`, full 12-step extraction flow
- Used all verified `data-purpose` selectors from SELECTORS.md — no unstable hashed class names
- Implemented `setInterval`-wrapped Promise polling for transcript panel (handles React render delay)
- Duplicate detection via localStorage with warning toast (non-blocking)
- Caption type detection from captions dropdown menu (`[CC]` = manual, `[Auto]` = auto-generated)
- All 28 existing unit tests continue to pass

## Task Commits

1. **Task 1: Build extractor.js and bookmarklet package** - `d9fd71f` (feat)
2. **Task 2: Smoke test on live Udemy lecture** - approved by user (no code commit — verification only)
3. **Bug fix: bookmarklet.txt %0A → space** - `920fac0` (fix) — Firefox SyntaxError caused by literal newline in URL-encoded bookmarklet alert string

## Files Created/Modified

- `extractor/extractor.js` — 290-line self-executing async script: inline cleaning functions (A), showToast (B), downloadJSON with revokeObjectURL (C), 12-step main flow (D)
- `extractor/bookmarklet.js` — loader stub injecting extractor.js from `http://localhost:8765/extractor.js?t={timestamp}`
- `extractor/bookmarklet.txt` — installation instructions + URL-encoded bookmarklet string ready to paste as bookmark URL
- `extractor/package.json` — `serve` (python http.server 8765), `serve:npx` (npx http-server), `test` scripts

## Decisions Made

- Cue text extracted from `[data-purpose="cue-text"]` span inside each `[data-purpose="transcript-cue"]` — matches SELECTORS.md recommended pattern
- Caption detection reads `[data-purpose="captions-dropdown-menu"]` textContent for `[CC]` / `[Auto]` markers
- `localStorage` key is `pmi-extracted-{lectureTitle}` — warns on duplicate but continues (does not block)
- Panel polling uses 10 x 100ms intervals to allow React to render after toggle click

## Smoke Test Results (Task 2)

Tested on a live Udemy lecture. All checks passed:

- Toast notification appears (green success)
- JSON file downloads with all 7 required fields: `lectureTitle`, `sectionName`, `transcript`, `wordCount`, `extractedAt`, `captionType`, `language`
- Transcript is clean — no timestamps, no filler words, sentences joined — 1649 words
- Duplicate detection works — fires warning toast, then overwritten by success toast (minor UX issue, not a blocker)
- Error toast appears correctly on non-lecture pages

**Status: Approved**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Firefox SyntaxError in bookmarklet.txt**
- **Found during:** Post-Task-1 testing
- **Issue:** `%0A` (URL-encoded newline) in the bookmarklet alert string caused a SyntaxError in Firefox — literal newlines are not valid inside a JS string in a `javascript:` URL
- **Fix:** Replaced `%0A` with a space character in the alert string inside `bookmarklet.txt`
- **Files modified:** `extractor/bookmarklet.txt`
- **Commit:** `920fac0`

## Self-Check: PASSED

- `extractor/extractor.js` — exists, 290 lines, contains all 12 required strings
- `extractor/bookmarklet.js` — exists, contains `localhost:8765/extractor.js`
- `extractor/bookmarklet.txt` — exists, contains `javascript:` and `localhost:8765`
- `extractor/package.json` — exists, contains `"serve"` and `"test"` scripts
- Commit `d9fd71f` — verified in git log
- All 28 unit tests pass (28 pass, 0 fail)

## Status

Complete. Both tasks executed and verified. Phase 01-extraction is fully done.

---
*Phase: 01-extraction*
*Completed: 2026-03-20*
