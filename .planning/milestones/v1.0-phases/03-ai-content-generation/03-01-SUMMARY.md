---
phase: 03-ai-content-generation
plan: "01"
subsystem: processor/prompt
tags: [prompt-engineering, tdd, practice-questions, flashcards, anthropic-api]
dependency_graph:
  requires: []
  provides: [extended-system-prompt, practice-questions-instructions, flashcards-instructions]
  affects: [processor/prompt.js, processor/processor.js, processor/tests/prompt.test.js]
tech_stack:
  added: []
  patterns: [tdd-red-green, node-test-builtin, template-literal-extension]
key_files:
  created: []
  modified:
    - processor/prompt.js
    - processor/processor.js
    - processor/tests/prompt.test.js
decisions:
  - "Append Practice Questions and Flashcards instructions at end of system prompt template literal — preserves all existing prompt text and existing test assertions"
  - "max_tokens increased from 4096 to 8192 — accommodates ~550 extra tokens per lecture (3 questions + 5-8 flashcards)"
  - "Section order in prompt matches locked Phase 2 decision: topic notes then Practice Questions then Flashcards"
metrics:
  duration: 136s
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 3 Plan 1: Prompt Extension for Practice Questions and Flashcards Summary

**One-liner:** Extended buildMessages() system prompt with transcript-grounded PMP practice questions and **Term** — definition flashcards, and bumped max_tokens to 8192 to accommodate the expanded output.

## What Was Built

The `buildMessages()` function in `processor/prompt.js` now instructs the AI to append two additional sections to every lecture's output:

- **## Practice Questions** — exactly 3 scenario-based PMP questions, each grounded in a specific concept or example from the lecture transcript. Questions must not be generic PMBOK recall. Answer explanations use eliminator style: why the correct answer is right and why each wrong option is wrong.
- **## Flashcards** — 5-8 term/definition pairs formatted as `**Term** — definition` bullet list, prioritizing PMP-specific terms the instructor explicitly named.

The existing prompt text (Output ONLY, Style Rules, Exam Tip, Bottom line instructions) is fully preserved and unchanged.

`processor.js` had `max_tokens` increased from 4096 to 8192 to prevent output truncation when the AI produces the full expanded content.

6 new unit tests were added to `processor/tests/prompt.test.js` following the existing `node:test` + `assert/strict` pattern. All 19 prompt tests and all 5 processor integration tests pass.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add unit tests for Practice Questions and Flashcards prompt instructions (RED) | a6ca90c | processor/tests/prompt.test.js |
| 2 | Extend buildMessages() system prompt and bump max_tokens to 8192 (GREEN) | 3d737b1 | processor/prompt.js, processor/processor.js |

## Decisions Made

1. **Append-only prompt extension:** New section instructions are appended after the existing Style Rules block. This avoids any risk of breaking existing test assertions on "Output ONLY", "Exam Tip", and "Bottom line" — all three preserved verbatim.

2. **max_tokens 8192:** Research identified ~550 token overhead per lecture for new content types. With some lectures potentially near the old 4096 ceiling, 8192 provides headroom without excessive cost. Single-line change in processor.js.

3. **Section ordering locked:** Practice Questions before Flashcards, both after all topic note sections — matches Phase 2 locked decision and 03-CONTEXT.md.

## Verification

```
node --test processor/tests/prompt.test.js  → 19 pass, 0 fail
node --test processor/tests/processor.test.js → 5 pass, 0 fail
grep '## Practice Questions' processor/prompt.js → match found
grep '## Flashcards' processor/prompt.js → match found
grep 'max_tokens: 8192' processor/processor.js → match found
grep 'Output ONLY' processor/prompt.js → match found (preserved)
```

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
