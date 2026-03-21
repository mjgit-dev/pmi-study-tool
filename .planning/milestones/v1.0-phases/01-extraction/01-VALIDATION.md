---
phase: 1
slug: extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, no install required) |
| **Config file** | none — Wave 0 creates test stubs |
| **Quick run command** | `node --test tests/unit/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/unit/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | EXTR-01 | manual | DOM inspection in DevTools | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | EXTR-01 | unit | `node --test tests/unit/extractor.test.js` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | EXTR-02 | unit | `node --test tests/unit/cleaner.test.js` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | EXTR-03 | unit | `node --test tests/unit/validator.test.js` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 2 | EXTR-01 | manual | Run bookmarklet on live Udemy lecture | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/extractor.test.js` — stubs for EXTR-01 (DOM extraction logic)
- [ ] `tests/unit/cleaner.test.js` — stubs for EXTR-02 (transcript cleaning)
- [ ] `tests/unit/validator.test.js` — stubs for EXTR-03 (word count / validation)
- [ ] `tests/unit/` directory created

*No framework install needed — node:test is built into Node.js.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bookmarklet downloads JSON file to browser downloads folder | EXTR-01 | Requires live browser + Udemy login; no headless alternative for injected scripts | Open a Udemy lecture, activate bookmarklet, verify JSON file appears in Downloads |
| Lecture title and section name correctly captured | EXTR-01 | Selectors discovered via live DOM inspection only | Run DOM inspection snippet in DevTools on a live lecture |
| Word count < 300 triggers visible warning | EXTR-03 | Requires browser UI overlay rendering | Run bookmarklet on a short/empty transcript and observe toast warning |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
