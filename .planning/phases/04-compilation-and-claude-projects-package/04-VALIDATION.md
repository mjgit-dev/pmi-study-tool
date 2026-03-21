---
phase: 4
slug: compilation-and-claude-projects-package
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — built-in |
| **Quick run command** | `node --test src/compiler.test.js` |
| **Full suite command** | `node --test src/**/*.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test src/compiler.test.js`
- **After every plan wave:** Run `node --test src/**/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | OUTP-01 | unit | `node --test src/compiler.test.js` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | OUTP-02 | unit | `node --test src/compiler.test.js` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | OUTP-03 | unit | `node --test src/compiler.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/compiler.test.js` — stubs for OUTP-01, OUTP-02, OUTP-03
- [ ] Existing `node:test` infrastructure covers framework requirement

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Projects upload produces grounded answers | OUTP-01 | Requires human judgment in Claude Projects UI | Upload package to Claude Projects, ask questions about specific lecture content, verify answers are grounded |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
