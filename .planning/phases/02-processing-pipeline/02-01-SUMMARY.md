---
phase: 02-processing-pipeline
plan: 01
subsystem: api
tags: [node-test, anthropic-sdk, commonjs, manifest, markdown, yaml-frontmatter]

# Dependency graph
requires:
  - phase: 01-extraction
    provides: Transcript JSON payload shape (lectureTitle, sectionName, transcript, wordCount, extractedAt, captionType, language)
provides:
  - manifest.js with loadManifest/saveManifest/shouldSkip for per-lecture processing state
  - prompt.js with buildMessages for Anthropic API call construction
  - markdown.js with buildMarkdown for YAML frontmatter + API text rendering
  - processor/package.json with @anthropic-ai/sdk ^0.80.0 installed
  - 35 passing unit tests across all three modules
affects:
  - 02-processing-pipeline/plan-02 (orchestrator wires these three modules)
  - 03-questions-flashcards (extends prompt.js system prompt with additional sections)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk ^0.80.0 (Anthropic Node.js SDK)"
    - "node:test (built-in Node.js 20+ test runner)"
    - "node:fs (built-in — manifest read/write)"
    - "node:assert/strict (built-in — test assertions)"
  patterns:
    - CommonJS module.exports pattern (no ES module syntax) — matches extractor/cleaning.js
    - node:test describe/it test structure — matches extractor/tests/extractor.test.js
    - Temp directory isolation per test using fs.mkdtempSync for manifest tests
    - YAML frontmatter with JSON.stringify for safe string field quoting

key-files:
  created:
    - processor/package.json
    - processor/package-lock.json
    - processor/manifest.js
    - processor/prompt.js
    - processor/markdown.js
    - processor/tests/manifest.test.js
    - processor/tests/prompt.test.js
    - processor/tests/markdown.test.js
    - .gitignore
  modified: []

key-decisions:
  - "shouldSkip returns true only when entry exists, status===complete, and force!==true — enables --force bypass"
  - "loadManifest catches both ENOENT and SyntaxError returning {} — first-run and corrupt manifest both safe"
  - "buildMarkdown uses JSON.stringify for YAML string values — handles quotes, backslashes, special chars safely"
  - "System prompt uses 'Output ONLY' instruction starting immediately with '## Key Concepts' — matches pitfall 4 mitigation"
  - "Test script updated to node --test tests/*.test.js from tests/ — Node.js v24 treats directory path as module, not glob"

patterns-established:
  - "Pure function modules with explicit path parameters (no module-level path constants) — enables test isolation"
  - "TDD RED-GREEN cycle: write failing tests first, then implement until green"
  - "Temp directory per test using mkdtempSync — no cross-test state leakage for file I/O tests"

requirements-completed: [PROC-01, PROC-04, PROC-05]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 2 Plan 01: Processing Pipeline Modules Summary

**Three CommonJS pure-function modules (manifest, prompt, markdown) with 35 passing node:test unit tests and @anthropic-ai/sdk installed, providing the complete contract layer for the orchestrator.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T18:49:42Z
- **Completed:** 2026-03-20T18:52:57Z
- **Tasks:** 3
- **Files modified:** 9 created, 0 modified

## Accomplishments

- manifest.js: loadManifest/saveManifest/shouldSkip with full test coverage (12 tests) — handles missing file, invalid JSON, round-trip fidelity, and force-bypass logic
- prompt.js: buildMessages builds system prompt with all three section headers and "Output ONLY" instruction, user message contains all transcript fields (13 tests)
- markdown.js: buildMarkdown prepends YAML frontmatter with JSON-quoted fields and ISO processedAt, trims apiText, appends trailing newline (10 tests)
- @anthropic-ai/sdk ^0.80.0 installed via npm, .gitignore added to exclude node_modules

## Task Commits

Each task was committed atomically:

1. **Task 1: processor/package.json, manifest.js, and manifest tests** - `89558d6` (feat)
2. **Task 2: prompt.js and prompt tests** - `8218ad1` (feat)
3. **Task 3: markdown.js and markdown tests** - `d3c7dbf` (feat)

**Auto-fix commits:**
- `99d6c44` (fix): Test script glob pattern for Node.js v24 compatibility
- `a99ab00` (chore): .gitignore to exclude node_modules

_Note: TDD tasks — tests written first (RED), then implementation (GREEN), committed together per task_

## Files Created/Modified

- `processor/package.json` - Project metadata, @anthropic-ai/sdk dependency, test script
- `processor/package-lock.json` - Lockfile from npm install
- `processor/manifest.js` - loadManifest, saveManifest, shouldSkip exports
- `processor/prompt.js` - buildMessages export for Anthropic API call construction
- `processor/markdown.js` - buildMarkdown export for YAML frontmatter + API text rendering
- `processor/tests/manifest.test.js` - 12 unit tests for manifest module
- `processor/tests/prompt.test.js` - 13 unit tests for prompt module
- `processor/tests/markdown.test.js` - 10 unit tests for markdown module
- `.gitignore` - Excludes node_modules/

## Decisions Made

- shouldSkip returns true only for complete+no-force, false for all other states (null, undefined, pending, failed) — makes the orchestrator's skip check a single function call
- loadManifest catches both ENOENT and SyntaxError with a single catch block returning {} — first run and corrupted manifest are treated identically (safe default)
- buildMarkdown uses JSON.stringify for YAML string values — handles titles with quotes, colons, or backslashes without a YAML library
- System prompt opens with "Output ONLY the three sections below, starting immediately with '## Key Concepts'" — mitigates LLM preamble deviation (pitfall 4 from research)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed npm test script for Node.js v24 compatibility**
- **Found during:** Overall verification after Task 3
- **Issue:** `node --test tests/` treats `tests/` as a module path in Node.js v24 (v24.14.0), not a directory glob — throws MODULE_NOT_FOUND
- **Fix:** Updated package.json test script to `node --test tests/*.test.js` which works via shell glob expansion
- **Files modified:** processor/package.json
- **Verification:** `npm test` runs all 35 tests with 0 failures
- **Committed in:** `99d6c44`

**2. [Rule 2 - Missing Critical] Added .gitignore to exclude node_modules**
- **Found during:** Post-task commit check
- **Issue:** No .gitignore existed; processor/node_modules/ showed as untracked — would pollute git history if accidentally committed
- **Fix:** Created .gitignore with `node_modules/` entry
- **Files modified:** .gitignore (created)
- **Verification:** git status no longer shows node_modules as untracked
- **Committed in:** `a99ab00`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correct operation. No scope creep.

## Issues Encountered

None — all three modules implemented in a single TDD cycle each with no debugging iterations required.

## User Setup Required

None - no external service configuration required. The Anthropic API key (`ANTHROPIC_API_KEY`) will be needed when the orchestrator (Plan 02) makes actual API calls, but the modules built here are pure functions with no runtime API dependency.

## Next Phase Readiness

- All three modules export their contracts and pass unit tests — Plan 02 orchestrator can wire them immediately
- @anthropic-ai/sdk is installed and available for the orchestrator's API call
- The `shouldSkip` function signature `(entry, force)` matches the manifest loop pattern from RESEARCH.md Pattern 1
- The `buildMessages` return shape `{ system, messages }` matches the SDK's `client.messages.create({ system, messages })` signature directly

---
*Phase: 02-processing-pipeline*
*Completed: 2026-03-20*

## Self-Check: PASSED

- All 9 files created/exist: CONFIRMED
- All 5 commits (89558d6, 8218ad1, d3c7dbf, 99d6c44, a99ab00) exist: CONFIRMED
- 35/35 tests pass via node:test: CONFIRMED
