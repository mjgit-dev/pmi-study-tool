---
phase: 06-eco-domain-tagging
plan: 03
subsystem: compiler
tags: [eco-domain, system-prompt, compiler, node-test, tdd, CLAUDE_INSTRUCTIONS]

# Dependency graph
requires:
  - phase: 06-01
    provides: ecoTag written to processed .md frontmatter by processor

provides:
  - buildSystemPrompt(ecoStats) renders ECO domain weight percentages and lecture count table
  - compiler.js aggregates ecoTag counts from lecture frontmatter and passes to buildSystemPrompt
  - CLAUDE_INSTRUCTIONS.md contains ## ECO Domain Coverage section when lectures have ECO tags
  - ECO section gracefully omitted when no lectures have ecoTag (no crash, no empty table)

affects:
  - phase 07 (glossary): reads compiler output; ECO section will be present in compiled packages
  - any future phase that calls buildSystemPrompt or modifies compiler output

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ECO stats aggregation: iterate lectures array, count ecoTag occurrences before write"
    - "Conditional ECO section: pass null to buildSystemPrompt when no tags — omits section"
    - "TDD for system-prompt: RED (write tests) -> GREEN (implement) -> verify"

key-files:
  created:
    - compiler/tests/compiler.test.js
  modified:
    - compiler/system-prompt.js
    - compiler/tests/system-prompt.test.js
    - compiler.js

key-decisions:
  - "ECO_WEIGHTS constant defined locally in system-prompt.js (not imported from processor) — compiler/processor are separate packages; local constant is cleaner than cross-package import"
  - "buildSystemPrompt(null) omits ECO section — backward compatible; pre-Phase-6 packages compile without ECO table"
  - "hasAnyEcoTag gate in compiler.js: only pass ecoStats when at least one lecture has a tag — avoids showing all-zero table for pre-Phase-6 content"

patterns-established:
  - "Pattern: conditional ECO section in system prompt — guard with if (ecoStats) before appending markdown block"
  - "Pattern: ecoTag aggregation in compiler — accumulate counts during lecture assembly loop, separate from group-by-section step"

requirements-completed: [ENHA-05]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 06 Plan 03: Compiler ECO Domain Stats Summary

**buildSystemPrompt(ecoStats) injects ECO domain weight percentages (42/50/8) and per-domain lecture count table into CLAUDE_INSTRUCTIONS.md, gracefully omitting the section when no lectures have ECO tags**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T22:17:36Z
- **Completed:** 2026-03-21T22:19:48Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- buildSystemPrompt accepts optional ecoStats parameter — backward compatible (no args returns identical output)
- ECO_WEIGHTS constant with July 9, 2026 changeover comment added to system-prompt.js
- compiler.js reads ecoTag from frontmatter, aggregates domain counts, conditionally passes to buildSystemPrompt
- Integration test proves full path: ecoTag frontmatter -> compileAll -> CLAUDE_INSTRUCTIONS.md with ECO section
- 18 total tests pass: 15 unit (system-prompt) + 3 integration (compiler)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update buildSystemPrompt to accept ecoStats and render domain table** - `bc87c68` (feat)
2. **Task 2: Wire compiler.js to collect ecoTag and pass ecoStats to buildSystemPrompt** - `3f998c4` (feat)
3. **Task 3: Add compiler integration test for full ECO compile path** - `7cf2173` (test)

## Files Created/Modified

- `compiler/system-prompt.js` - Added ECO_WEIGHTS constant, updated buildSystemPrompt(ecoStats) signature, conditional ECO section appended when ecoStats is truthy
- `compiler/tests/system-prompt.test.js` - Added 6 new tests for ECO section presence/absence, weights, table rows, and quiz weighting instruction
- `compiler.js` - Added ecoTag to lectures.push, ecoStats aggregation loop, hasAnyEcoTag gate, updated buildSystemPrompt call
- `compiler/tests/compiler.test.js` - New integration test file: 3 test cases exercising full compile path with temp fixture .md files

## Decisions Made

- ECO_WEIGHTS defined locally in system-prompt.js rather than imported from processor/eco-prompt.js — compiler and processor are separate packages; local constant avoids cross-package coupling
- buildSystemPrompt(null) and buildSystemPrompt() both omit ECO section — backward compatible with any existing callers
- hasAnyEcoTag gate prevents showing all-zero domain table for pre-Phase-6 compiled packages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Compiler now produces CLAUDE_INSTRUCTIONS.md with ECO domain guidance proportional to exam weights
- Phase 06-02 (re-classification pass, ENHA-06) can proceed independently — its output feeds back into Phase 06-01's processor which writes ecoTag to .md frontmatter, which then flows through this plan's compiler path
- Phase 07 (glossary compiler feature) unaffected — reads ## Flashcards sections, no interaction with ECO stats path

---
*Phase: 06-eco-domain-tagging*
*Completed: 2026-03-21*
