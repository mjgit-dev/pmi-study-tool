---
phase: 6
slug: eco-domain-tagging
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none -- run via `node --test` |
| **Quick run command** | `node --test processor/tests/eco-prompt.test.js` |
| **Full suite command** | `node --test processor/tests/*.test.js && node --test compiler/tests/*.test.js` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's specific test file via `node --test`
- **After every plan wave:** Run `node --test processor/tests/*.test.js && node --test compiler/tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | ENHA-01 | unit | `node --test processor/tests/eco-prompt.test.js` | W0 | pending |
| 6-01-02 | 01 | 1 | ENHA-01, ENHA-04 | unit+integration | `node --test processor/tests/markdown.test.js && node --test processor/tests/processor.test.js` | exists (modified) | pending |
| 6-02-01 | 02 | 2 | ENHA-06 | unit | `node --test processor/tests/eco-tagger.test.js` | W0 | pending |
| 6-02-02 | 02 | 2 | ENHA-06, ENHA-04 | integration | `node --test processor/tests/eco-tagger.test.js` | W0 | pending |
| 6-03-01 | 03 | 2 | ENHA-05 | unit | `node --test compiler/tests/system-prompt.test.js` | exists (modified) | pending |
| 6-03-02 | 03 | 2 | ENHA-05 | integration | `node -e "const {compileAll} = require('./compiler.js'); console.log('compiler loads OK')" && node --test compiler/tests/system-prompt.test.js` | exists | pending |
| 6-03-03 | 03 | 2 | ENHA-05 | integration | `node --test compiler/tests/compiler.test.js` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `processor/tests/eco-prompt.test.js` -- covers `buildEcoMessages()`, `parseEcoTag()`, `printEcoDomainSummary()` (ENHA-01, ENHA-04)
- [ ] `processor/tests/eco-tagger.test.js` -- covers `patchFrontmatterEcoTag()`, `retagAll()`, frontmatter patch, idempotency, --force, domain summary output (ENHA-06, ENHA-04)
- [ ] `compiler/tests/compiler.test.js` -- covers full compile path: ecoTag frontmatter -> CLAUDE_INSTRUCTIONS.md with ECO section (ENHA-05)
- Note: `processor/tests/markdown.test.js`, `processor/tests/processor.test.js`, `compiler/tests/system-prompt.test.js` already exist and are modified in-place (no Wave 0 needed)
- No framework install needed -- node:test is built-in to Node

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ECO tag prompt accuracy on real transcripts | ENHA-01 | AI output quality requires human review | Run processor on 3-5 real lecture transcripts, verify tags are contextually correct |
| Re-classification leaves content unchanged | ENHA-06 | Diff comparison requires human review | Run re-classify on processed lecture, diff markdown files before/after to confirm notes/questions/flashcards unchanged |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all new test file references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
