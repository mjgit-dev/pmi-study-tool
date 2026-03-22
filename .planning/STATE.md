---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Study Intelligence
status: milestone_complete
stopped_at: v1.1 Study Intelligence shipped
last_updated: "2026-03-22T00:50:00.000Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 7
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-22 after v1.1 milestone complete)

**Core value:** A learner can go from watching a Udemy lecture to quizzing themselves on that content in Claude Projects within minutes — without manual copying, formatting, or summarizing.
**Current focus:** Planning next milestone (v1.2)

## Current Position

Milestone v1.1 complete. All 8 phases shipped across v1.0 and v1.1.
Ready for `/gsd:new-milestone` to define v1.2 scope.

## Performance Metrics

**Velocity (v1.0 baseline):**

- Total plans completed: 8
- v1.0 phases: 4 phases, 8 plans, 2 days

**By Phase (v1.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Extraction | 2 | Complete |
| 2. Processing Pipeline | 2 | Complete |
| 3. AI Content Generation | 2 | Complete |
| 4. Compilation | 2 | Complete |

*v1.1 metrics will accumulate during execution*
| Phase 05 P01 | 107 | 1 tasks | 2 files |
| Phase 05 P02 | 2 | 2 tasks | 2 files |
| Phase 06 P01 | 237 | 2 tasks | 6 files |
| Phase 06 P02 | 3 | 2 tasks | 2 files |
| Phase 06 P03 | 2 | 3 tasks | 4 files |
| Phase 07 P01 | 119 | 2 tasks | 4 files |
| Phase 08 P01 | 114 | 2 tasks | 4 files |

## Accumulated Context

### Decisions

All key decisions logged in PROJECT.md Key Decisions table.

Recent decisions affecting v1.1:

- Use `countTokens({ model, system, messages })` — not just messages — to avoid 30-50% cost underestimate
- ECO domain weights stored as a config constant (not hardcoded strings) — July 9, 2026 changeover to 33/41/26 must be documented alongside current 42/50/8
- [Phase 06-01]: ECO classification uses a separate API call (max_tokens:10) — never merged into main content prompt to keep re-classification pass clean
- [Phase 06-01]: schemaVersion:2 written to manifest on first ECO-tagged save (Phase 6 designated as schema version bump)
- [Phase 06-01]: makeMockClient in processor.test.js dispatches ECO calls by max_tokens<=10 guard, tracked separately via _ecoCallCount
- Manifest schema: add null-guards for all new fields + schemaVersion: 2 in Phase 6 (first phase to write new manifest fields)
- Glossary deduplication: normalize term keys to lowercase before dedup; first-occurrence definition wins
- Phase 6: ENHA-06 re-classification pass calls AI only for ECO tagging — must not regenerate notes, questions, or flashcards
- [Phase 06-02]: patchFrontmatterEcoTag uses two-regex strategy (strict then fallback) and slices body bytes verbatim — guarantees zero body mutation
- [Phase 06-02]: retagAll uses max_tokens:10 ECO-only call, never imports buildMessages — cleanly separates re-classification from content generation
- Phase 7: Glossary is a compiler-only feature reading existing ## Flashcards sections — zero new API calls
- [Phase 05]: estimateCost always uses MAX_OUTPUT_TOKENS (8192) for output cost — upper bound by design, documented in CLI table footnote
- [Phase 05]: countLectureTokens passes full { model, system, messages } to client.beta.messages.countTokens to avoid 30-50% cost underestimate
- [Phase 05]: --estimate exits 0 after table display; --yes bypasses prompt; process.stdin.isTTY !== true guard for non-TTY; estimate gate fires only when pendingFiles.length > 0 && !dryRun
- [Phase 06-03]: ECO_WEIGHTS defined locally in compiler/system-prompt.js (not imported from processor) — compiler/processor are separate packages; avoids cross-package coupling
- [Phase 06-03]: hasAnyEcoTag gate in compiler.js: pass ecoStats only when at least one lecture has a tag — prevents all-zero ECO table in pre-Phase-6 compiled packages
- [Phase 07-01]: extractFlashcards operates on quiz section (not notes) — splitNotesAndQuiz places ## Flashcards inside quiz
- [Phase 07-01]: Glossary term count logged by counting lines starting with '**' in compiled glossaryContent — accurate post-dedup
- [Phase 08-01]: weak-areas.json is read from project root with existsSync guard and try/catch for graceful degradation — missing/empty/malformed file never crashes the compiler
- [Phase 08-01]: weakAreas parameter in buildSystemPrompt is backward compatible — undefined/null/[] produce no Focus Areas section, existing call sites work unchanged

### v1.2 Candidate Checklist

**Note these while using the product — bring answers back when starting v1.2.**

#### Things to observe while studying

- [ ] Is the compiled package actually useful for quizzing, or is something missing from the output?
- [ ] Do the weak-area hints change how Claude responds? Are they phrased well enough to be useful?
- [ ] Is the glossary the right shape — or do you want terms cross-referenced, grouped by domain, or linked back to lectures?
- [ ] Does the ECO domain breakdown (People/Process/Business Environment) change how you study? Would you want to quiz by domain?
- [ ] Are there lectures you want to re-process (better notes, more questions, different flashcard format)?
- [ ] Does the practice question format feel realistic to the actual PMP exam style?
- [ ] Is there anything you wish Claude Projects knew that isn't in the package?

#### Known tech debt to fix in v1.2

- [ ] H1 heading collision in compiled output — AI-generated H1 conflicts with section file hierarchy (visual issue, content correct)
- [ ] No post-run actual API cost summary — only pre-run estimate shown; actual spend never reported
- [ ] ECO domain label not shown inline next to lecture headings in section notes
- [ ] Processor has no low-word-count guard — EXTR-03 only enforced at extraction time, not at processing time
- [ ] Full-scale pipeline test with 100+ transcripts (only 2 tested at v1.0/v1.1)
- [ ] ECO domain weights will change July 9, 2026 (42/50/8 → 33/41/26) — needs config update + re-tag pass

### Pending Todos

None.

### Blockers/Concerns

Carried from v1.0 (not in v1.1 scope — deferred to v2):

- Full-scale pipeline test with 100+ transcripts (only 2 tested at v1.0)
- H1 heading collision in compiled output (RELI-02)
- Processor low-word-count guard missing (RELI-01)

v1.1 watch items:

- Phase 6: Verify LLM ECO tag output reliability with 3-5 real transcripts before building full validation layer
- Phase 5: Cost estimate uses max_tokens (8192) as worst-case upper bound — actual is 1,500–3,000 tokens; document as conservative estimate in CLI display
- Phase 6: Re-classification pass (ENHA-06) must isolate the ECO-only prompt from the full processing prompt to avoid accidental content regeneration

## Session Continuity

Last session: 2026-03-21T23:39:58.485Z
Stopped at: Completed 08-01-PLAN.md
Resume file: None
