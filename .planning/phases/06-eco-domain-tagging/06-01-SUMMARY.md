---
phase: 06-eco-domain-tagging
plan: "01"
subsystem: processor
tags: [eco-tagging, classification, manifest, frontmatter, tdd]
dependency_graph:
  requires: []
  provides: [eco-prompt-module, eco-tagging-in-processor, eco-frontmatter-in-markdown]
  affects: [processor/processor.js, processor/markdown.js, processor/eco-prompt.js]
tech_stack:
  added: []
  patterns: [separate-minimal-prompt, max_tokens-10-classification, tdd-red-green]
key_files:
  created:
    - processor/eco-prompt.js
    - processor/tests/eco-prompt.test.js
  modified:
    - processor/markdown.js
    - processor/processor.js
    - processor/tests/markdown.test.js
    - processor/tests/processor.test.js
decisions:
  - "ECO classification uses a separate API call (max_tokens:10) — never merged into main content prompt"
  - "ECO_WEIGHTS.current = {People:42, Process:50, 'Business Environment':8} with July 9 2026 changeover comment"
  - "schemaVersion:2 written to manifest on first ECO-tagged save"
  - "makeMockClient dispatches ECO calls by max_tokens<=10 guard, tracked in _ecoCallCount"
metrics:
  duration_seconds: 237
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 06 Plan 01: ECO Prompt Module and Processor Integration Summary

**One-liner:** ECO domain classification via separate 10-token API call with `buildEcoMessages`/`parseEcoTag`, writing domain tag to both YAML frontmatter and manifest with `schemaVersion:2`.

## What Was Built

### Task 1: eco-prompt.js module (TDD)

Created `processor/eco-prompt.js` exporting five symbols:

- `ECO_DOMAINS` — `['People', 'Process', 'Business Environment']`
- `ECO_WEIGHTS` — `{ current: { People:42, Process:50, 'Business Environment':8 } }` with July 9, 2026 changeover comment
- `buildEcoMessages(transcript)` — builds a constrained classification prompt returning `{system, messages}` with first 500 words of transcript
- `parseEcoTag(rawResponse)` — trims, exact-matches, fuzzy-falls-back, returns null on no match
- `printEcoDomainSummary(manifest)` — prints `People: N / Process: N / Business Environment: N` (+ `/ Untagged: N` when > 0), skipping non-entry keys like `schemaVersion`

27 unit tests written and passing (`eco-prompt.test.js`).

### Task 2: Integration into processor.js and markdown.js

**markdown.js:** `buildMarkdown(transcript, apiText, ecoTag)` now accepts optional third parameter. Inserts `ecoTag: "..."` into YAML frontmatter when provided; omits it when absent (backward compatible). 4 new tests added.

**processor.js:** After main content API call, makes a separate ECO classification call (`max_tokens:10`). Writes `ecoTag` and `ecoTaggedAt` to manifest entry. Sets `manifest.schemaVersion = 2` on first write. Calls `printEcoDomainSummary(manifest)` after batch loop.

**Test updates:**
- `makeMockClient` updated to dispatch ECO calls (detected by `max_tokens <= 10`) separately, tracked via `_ecoCallCount`
- Test 5 hand-rolled mock updated to properly distinguish content vs ECO calls
- 2 new processor tests: ecoTag in frontmatter/manifest, and console.log domain summary format assertion (ENHA-04)

All 51 tests pass: 27 (eco-prompt) + 14 (markdown) + 10 (processor).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Separate API call for ECO classification | Keeps re-classification pass (Plan 02) clean — no risk of regenerating notes/questions/flashcards |
| max_tokens:10 for ECO call | Sufficient for single-domain response; constrains cost |
| ECO_WEIGHTS as config constant | July 9, 2026 changeover is a one-line change; no hardcoded strings |
| schemaVersion:2 written on first ECO save | Designates Phase 6 as the manifest schema version bump per STATE.md decision |
| makeMockClient dispatch by max_tokens guard | Clean way to separate content vs ECO mock responses in tests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 5 custom mock counted all API calls including ECO calls**

- **Found during:** Task 2 — running processor tests after integrating ECO call
- **Issue:** Test 5 used a hand-rolled mock that counted every `messages.create` call in `_callCount`. After adding the ECO call for the second (successful) file, `_callCount.value` became 3 instead of 2.
- **Fix:** Updated the hand-rolled client to dispatch ECO calls (max_tokens <= 10) separately into `_ecoCallCount`, leaving `_callCount` tracking only content calls. Updated the assertion comment to "Content API should be called for both files".
- **Files modified:** `processor/tests/processor.test.js`
- **Commit:** a241e4c

## Self-Check: PASSED

- processor/eco-prompt.js: FOUND
- processor/tests/eco-prompt.test.js: FOUND
- processor/markdown.js: FOUND
- processor/processor.js: FOUND
- commit e6741fc: FOUND
- commit a241e4c: FOUND
