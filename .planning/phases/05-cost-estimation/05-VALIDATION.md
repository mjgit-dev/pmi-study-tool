---
phase: 5
slug: cost-estimation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node.js 18+) |
| **Config file** | none — scripts.test in package.json: `node --test tests/*.test.js` |
| **Quick run command** | `cd processor && node --test tests/estimate.test.js` |
| **Full suite command** | `cd processor && node --test tests/*.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd processor && node --test tests/estimate.test.js`
- **After every plan wave:** Run `cd processor && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | ENHA-03 | unit | `cd processor && node --test tests/estimate.test.js` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | ENHA-03 | unit | `cd processor && node --test tests/estimate.test.js` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | ENHA-03 | unit | `cd processor && node --test tests/estimate.test.js` | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 1 | ENHA-03 | regression | `cd processor && node --test tests/processor.test.js` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `processor/tests/estimate.test.js` — stubs for all ENHA-03 behaviors (estimate table, flag interactions, confirm/decline, non-TTY guard)
- [ ] `processor/tests/estimate.test.js` — shared `makeMockClient` helper with `beta.messages.countTokens` mock

*Existing `node:test` infrastructure covers everything — no framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TTY confirmation prompt interaction | ENHA-03 | Requires live terminal stdin; readline cannot be fully mocked for E2E | Run `node processor.js process ./lectures --manifest manifest.json`, type `y` or `N` at prompt, verify batch proceeds or aborts respectively |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
