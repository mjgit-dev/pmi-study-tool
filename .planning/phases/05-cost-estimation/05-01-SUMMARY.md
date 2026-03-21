---
phase: 05-cost-estimation
plan: 01
subsystem: processor/estimate
tags: [tdd, cost-estimation, pricing, token-counting, formatting]
dependency_graph:
  requires: [processor/prompt.js, "@anthropic-ai/sdk client.beta.messages.countTokens"]
  provides: [PRICING, DEFAULT_PRICING, MAX_OUTPUT_TOKENS, estimateCost, countLectureTokens, formatEstimateTable]
  affects: [processor/estimate.js, processor/tests/estimate.test.js]
tech_stack:
  added: []
  patterns: [TDD red-green, CommonJS module, node:test, node:assert/strict]
key_files:
  created:
    - processor/estimate.js
    - processor/tests/estimate.test.js
  modified: []
decisions:
  - "Pricing uses alignment spaces in PRICING object literal for readability — does not affect runtime behavior"
  - "formatEstimateTable strips .json extension and truncates names at 40 chars before display"
  - "estimateCost always uses MAX_OUTPUT_TOKENS (8192) for output cost — upper bound by design"
  - "countLectureTokens passes full { model, system, messages } to countTokens to avoid 30-50% underestimate"
metrics:
  duration_seconds: 107
  completed_date: "2026-03-21"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
  tests_written: 12
  tests_passing: 58
requirements_satisfied: [ENHA-03]
---

# Phase 05 Plan 01: Estimate Module Summary

**One-liner:** CommonJS estimate module with per-model PRICING constants, estimateCost using MAX_OUTPUT_TOKENS upper bound, async countLectureTokens calling client.beta.messages.countTokens, and fixed-width formatEstimateTable with footnote — all TDD'd with 12 passing tests.

## What Was Built

### processor/estimate.js

New CommonJS module exporting 6 items:

- `PRICING` — per-model USD rates keyed by model string (sonnet-4-6, sonnet-4-5, haiku-4-5, opus-4-6)
- `DEFAULT_PRICING` — fallback rates `{ inputPerMTok: 3.00, outputPerMTok: 15.00 }` for unrecognized models
- `MAX_OUTPUT_TOKENS` — `8192`, the worst-case output count used for upper-bound estimation
- `estimateCost(inputTokens, model)` — calculates `(inputTokens/1e6)*inputRate + (8192/1e6)*outputRate`
- `countLectureTokens(client, model, transcript)` — calls `client.beta.messages.countTokens({ model, system, messages })` using `buildMessages(transcript)` to construct the prompt
- `formatEstimateTable(rows, totals)` — renders a fixed-width ASCII table with Lecture/Input tok/Output tok/Est. cost columns, a separator line, TOTAL row, "Estimated cost (upper bound)" label, and footnote about actual (1,500-3,000) vs max (8,192) output tokens

### processor/tests/estimate.test.js

12 unit tests covering:
- PRICING rates for sonnet and opus models
- DEFAULT_PRICING deep equality
- MAX_OUTPUT_TOKENS value
- estimateCost with known model, unknown model, zero input tokens
- countLectureTokens: return value, argument verification (model, system, messages), error propagation
- formatEstimateTable: header columns, row data, cost formatting ($X.XXXX), TOTAL row, upper-bound label, footnote numbers (1,500 / 3,000 / 8,192), multi-row total correctness

## TDD Execution

- **RED:** Tests written first, failed with `Cannot find module '../estimate'`
- **GREEN:** Implementation written, all 12 tests passed first run
- **REFACTOR:** No cleanup needed — implementation was clean on first pass

## Verification

- `cd processor && node --test tests/estimate.test.js` — 12/12 pass
- `cd processor && node --test tests/processor.test.js` — 5/5 pass (no regression)
- `cd processor && node --test tests/*.test.js` — 58/58 pass

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash    | Phase | Description |
|---------|-------|-------------|
| 7a9a309 | RED   | test(05-01): add failing tests for estimate module |
| c127d3e | GREEN | feat(05-01): implement estimate module — pricing, cost calc, token counting, table formatting |

## Self-Check: PASSED

- processor/estimate.js: EXISTS
- processor/tests/estimate.test.js: EXISTS
- Commit 7a9a309: EXISTS
- Commit c127d3e: EXISTS
- All 58 tests passing
