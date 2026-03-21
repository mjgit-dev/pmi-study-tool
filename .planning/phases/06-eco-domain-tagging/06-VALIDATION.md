---
phase: 6
slug: eco-domain-tagging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (existing) |
| **Config file** | package.json (jest config) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | ENHA-01 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | ENHA-01 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 2 | ENHA-06 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 2 | ENHA-04 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 6-04-01 | 04 | 3 | ENHA-05 | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/eco-classifier.test.js` — stubs for ENHA-01 (ECO tag generation in processor)
- [ ] `tests/eco-reclassify.test.js` — stubs for ENHA-06 (re-classification command)
- [ ] `tests/eco-stats.test.js` — stubs for ENHA-04 (per-domain CLI output)
- [ ] `tests/eco-instructions.test.js` — stubs for ENHA-05 (CLAUDE_INSTRUCTIONS.md ECO section)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ECO tag prompt accuracy on real transcripts | ENHA-01 | AI output quality requires human review | Run processor on 3-5 real lecture transcripts, verify tags are contextually correct |
| Re-classification leaves content unchanged | ENHA-06 | Diff comparison requires human review | Run re-classify on processed lecture, diff markdown files before/after to confirm notes/questions/flashcards unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
