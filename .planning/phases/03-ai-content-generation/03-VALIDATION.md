---
phase: 3
slug: ai-content-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner / Jest (check package.json) |
| **Config file** | package.json |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | PROC-02 | unit | `npm test` | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | PROC-02 | unit | `npm test` | ✅ | ⬜ pending |
| 3-01-03 | 01 | 1 | PROC-03 | unit | `npm test` | ✅ | ⬜ pending |
| 3-02-01 | 02 | 2 | PROC-02 | manual | pilot run + inspect output | ✅ | ⬜ pending |
| 3-02-02 | 02 | 2 | PROC-03 | manual | pilot run + inspect output | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update existing test assertions in `processor/__tests__/` to expect new output sections (practice questions + flashcards)
- [ ] Add test fixture for prompt builder output validation

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Practice questions are grounded in lecture content | PROC-02 | Requires human judgment to evaluate scenario specificity | Run pilot on 1 lecture, read questions, verify they reference lecture-specific scenarios |
| Flashcard terms match lecture content | PROC-03 | Requires reading transcript and output together | Compare generated flashcard terms against lecture transcript concepts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
