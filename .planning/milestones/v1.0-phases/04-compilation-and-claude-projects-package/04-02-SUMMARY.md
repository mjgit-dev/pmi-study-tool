---
phase: 04-compilation-and-claude-projects-package
plan: 02
subsystem: compiler
tags: [node, commonjs, compiler, claude-projects, system-prompt, tdd]

# Dependency graph
requires:
  - phase: 04-01
    provides: frontmatter.js, sections.js, grouper.js, builder.js — all pure compiler modules
provides:
  - compiler/system-prompt.js — buildSystemPrompt() generating CLAUDE_INSTRUCTIONS.md content
  - compiler.js — CLI entry point wiring all modules, producing claude-package/
  - claude-package/ — upload-ready directory with numbered section files, handbook.md, and CLAUDE_INSTRUCTIONS.md
affects:
  - users of claude-package/ (direct upload to Claude Projects)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD with node:test — RED (failing test) then GREEN (implementation) cycle
    - require.main === module guard for CLI isolation from module imports
    - Synchronous fs operations (readdirSync, readFileSync, writeFileSync) for simple batch file pipeline

key-files:
  created:
    - compiler/system-prompt.js
    - compiler/tests/system-prompt.test.js
    - compiler.js
    - claude-package/01-introduction-to-project-management-notes.md
    - claude-package/01-introduction-to-project-management-quiz.md
    - claude-package/handbook.md
    - claude-package/CLAUDE_INSTRUCTIONS.md
  modified: []

key-decisions:
  - "System prompt content is a static string returned from buildSystemPrompt() — no runtime parameters needed since instructions are course-agnostic"
  - "claude-package/ is regenerated from scratch on each compiler.js run (rmSync recursive) — idempotent, no stale file accumulation"
  - "Section files numbered with 1-based index from orderSections output — preserves Udemy course order established in grouper"

patterns-established:
  - "Compiler pipeline: readdirSync -> parseFrontmatter -> extractBody -> splitNotesAndQuiz -> groupBySectionName -> orderSections -> buildSectionFile/buildHandbook/buildSystemPrompt -> write"
  - "Progress output uses padStart to align section numbers matching processor.js style"

requirements-completed: [OUTP-01, OUTP-02, OUTP-03]

# Metrics
duration: 45min (including human checkpoint for output verification)
completed: 2026-03-21
---

# Phase 4 Plan 02: Compiler CLI and Claude Projects Package Summary

**compiler.js wires all five compiler modules into a single CLI that produces a numbered, upload-ready claude-package/ with section notes, quiz files, handbook.md with ToC, and CLAUDE_INSTRUCTIONS.md containing four study modes and a strict grounding rule**

## Performance

- **Duration:** ~45 min (including human checkpoint)
- **Started:** 2026-03-21T07:10:00Z
- **Completed:** 2026-03-21T08:15:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Built system-prompt.js with buildSystemPrompt() returning full CLAUDE_INSTRUCTIONS.md content (four study modes: Quiz Me, Explain a Concept, Flashcard Drill, Weak Area Focus; grounding rule requiring lecture citation and refusal of general-knowledge answers)
- Built compiler.js CLI wiring frontmatter, sections, grouper, builder, and system-prompt modules with --dry-run support and progress output
- Generated claude-package/ from real processor/output/ data: numbered section notes and quiz file pair, handbook.md with linked ToC, CLAUDE_INSTRUCTIONS.md — all verified and approved by user

## Task Commits

Each task was committed atomically:

1. **Task 1: Build system prompt module with tests** - `08685ff` (feat — TDD: test then impl)
2. **Task 2: Wire compiler.js CLI entry point** - `2799fba` (feat)
3. **Task 3: Run full compilation and verify Claude Projects package** - `5c65e6c` (feat)

**Plan metadata:** _(final docs commit follows)_

_Note: Task 1 used TDD cycle — tests written first (RED), then implementation (GREEN)._

## Files Created/Modified
- `compiler/system-prompt.js` - buildSystemPrompt() returning CLAUDE_INSTRUCTIONS.md content
- `compiler/tests/system-prompt.test.js` - 9 tests covering all four study modes, grounding rule, no-placeholder check
- `compiler.js` - CLI entry point: reads processor/output/, groups by section, writes claude-package/
- `claude-package/01-introduction-to-project-management-notes.md` - Compiled section notes (11,446 bytes)
- `claude-package/01-introduction-to-project-management-quiz.md` - Compiled section quiz (9,531 bytes)
- `claude-package/handbook.md` - Full handbook with Table of Contents (11,656 bytes)
- `claude-package/CLAUDE_INSTRUCTIONS.md` - System prompt for Claude Projects (1,836 bytes)

## Decisions Made
- Static string for buildSystemPrompt() — no runtime parameters because instructions are course-agnostic and content is fully specified in the plan
- rmSync recursive on each compiler.js run ensures idempotent output — no stale files from prior runs
- 1-based section numbering from orderSections order — preserves Udemy course sequence

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met on first run.

## Issues Encountered

None. All 89 tests (48 compiler + 41 processor) passed with zero failures after implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- claude-package/ is complete and ready to upload to Claude Projects as knowledge files
- CLAUDE_INSTRUCTIONS.md is ready to paste as the Claude Projects system prompt
- Phase 4 is fully complete — all compilation and package generation requirements satisfied
- No blockers for final use

---
*Phase: 04-compilation-and-claude-projects-package*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: claude-package/handbook.md
- FOUND: claude-package/CLAUDE_INSTRUCTIONS.md
- FOUND: claude-package/01-introduction-to-project-management-notes.md
- FOUND: claude-package/01-introduction-to-project-management-quiz.md
- FOUND: compiler/system-prompt.js
- FOUND: compiler.js
- FOUND: .planning/phases/04-compilation-and-claude-projects-package/04-02-SUMMARY.md
- FOUND commit: 08685ff (Task 1 — system prompt module)
- FOUND commit: 2799fba (Task 2 — compiler.js CLI)
- FOUND commit: 5c65e6c (Task 3 — claude-package)
