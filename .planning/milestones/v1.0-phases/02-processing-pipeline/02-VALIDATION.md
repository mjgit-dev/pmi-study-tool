---
phase: 2
slug: processing-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, zero install) |
| **Config file** | none — built into Node.js >= 18 |
| **Quick run command** | `node --test processor/tests/` |
| **Full suite command** | `node --test processor/tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test processor/tests/`
- **After every plan wave:** Run `node --test processor/tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PROC-01 | unit | `node --test processor/tests/` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PROC-04 | unit | `node --test processor/tests/` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | PROC-05 | unit | `node --test processor/tests/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `processor/tests/processor.test.js` — stubs for PROC-01, PROC-04, PROC-05
- [ ] `processor/package.json` — scripts: test, process

*Existing infrastructure covers extractor tests only; new processor test file required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| API generates valid structured notes for a real transcript | PROC-01 | Requires live Anthropic API call with real content | Run processor on 1 sample JSON, verify output markdown has Key Concepts, Summary, Examples sections |
| Resume skips completed lectures after simulated failure | PROC-04 | Requires controlled failure simulation | Process 3 files, kill mid-run, re-run, verify only incomplete files reprocessed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
