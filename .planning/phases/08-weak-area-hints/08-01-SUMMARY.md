---
phase: 08-weak-area-hints
plan: 01
subsystem: compiler
tags: [compiler, system-prompt, weak-areas, tdd, node-test]

# Dependency graph
requires:
  - phase: 07-glossary-extraction
    provides: compiler/system-prompt.js and compiler.js infrastructure used as extension points
provides:
  - buildSystemPrompt accepts optional weakAreas string array and appends ## Focus Areas section
  - compiler.js reads weak-areas.json from project root and passes topics to buildSystemPrompt
  - Graceful degradation: missing/empty/malformed weak-areas.json compiles without error
affects: [09-any-future-compiler-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional JSON config file read with existsSync guard and try/catch for graceful degradation
    - TDD with Node.js built-in test runner: RED (failing tests) -> GREEN (implementation) cycle

key-files:
  created: []
  modified:
    - compiler/system-prompt.js
    - compiler/tests/system-prompt.test.js
    - compiler.js
    - compiler/tests/compiler.test.js

key-decisions:
  - "weak-areas.json is read from project root (same directory as compiler.js) — not from processor/output or claude-package"
  - "weakAreas parameter is backward compatible: undefined/null/[] all produce no Focus Areas section"
  - "Malformed JSON silently skipped (catch block swallows error) — compiler always succeeds"
  - "Focus Areas section appended after ECO Domain Coverage when both are present"
  - "Log line 'Focus areas: N topics' added after Glossary log for visibility without verbosity"

patterns-established:
  - "Optional project-root config file pattern: existsSync guard + try/catch + graceful null fallback"
  - "TDD integration tests write to actual project root and clean up in afterEach via unlinkSync"

requirements-completed: [STDY-01]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 8 Plan 1: Weak Area Hints Summary

**Compiler reads weak-areas.json from project root and injects a ## Focus Areas section into CLAUDE_INSTRUCTIONS.md with per-topic bullet points and study guidance**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T23:37:05Z
- **Completed:** 2026-03-21T23:39:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended `buildSystemPrompt(ecoStats, weakAreas)` with optional second parameter that appends a Focus Areas section when non-empty
- Added `weak-areas.json` reading to `compiler.js` with existsSync guard and JSON parse try/catch for graceful degradation
- 11 new tests added (7 unit + 4 integration), all 44 compiler tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend buildSystemPrompt to accept and render weak areas (TDD)** - `2f2ba77` (feat)
2. **Task 2: Integrate weak-areas.json reading into compiler.js (TDD)** - `02b017c` (feat)

**Plan metadata:** (docs commit follows)

_Note: Both tasks used full TDD cycle — RED (failing tests committed in same feat commit) -> GREEN (implementation)_

## Files Created/Modified
- `compiler/system-prompt.js` - Extended with weakAreas second parameter and Focus Areas section builder
- `compiler/tests/system-prompt.test.js` - Added 7 new tests in 'buildSystemPrompt with weakAreas' describe block
- `compiler.js` - Added weak-areas.json reading with existsSync+try/catch; updated buildSystemPrompt call; added log line
- `compiler/tests/compiler.test.js` - Added 4 integration tests in 'compileAll weak-areas.json integration' describe block

## Decisions Made
- `weak-areas.json` read from `__dirname` (project root, where `compiler.js` lives) — consistent with how the tool is run
- `weakAreas` parameter defaults to undefined when not passed — backward compatible, no existing callers broken
- JSON parse errors caught silently — user gets compiled output without Focus Areas, no crash or confusing error
- Focus Areas section placed after ECO Domain Coverage to maintain a logical reading order in CLAUDE_INSTRUCTIONS.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

Users who want to activate weak-area hints create `weak-areas.json` in the project root:
```json
{"areas": ["Risk Management", "Stakeholder Engagement"]}
```
Then re-run `node compiler.js`. No code changes needed.

## Next Phase Readiness
- Phase 8 (weak-area-hints) is the final phase of v1.1 — no further plans in this phase
- Compiler pipeline is complete and stable across all phases (05-08)
- v1.1 milestone ready for review

---
*Phase: 08-weak-area-hints*
*Completed: 2026-03-22*
