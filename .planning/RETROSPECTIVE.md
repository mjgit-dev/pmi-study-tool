# Retrospective: PMI Study Tool

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-21
**Phases:** 4 | **Plans:** 8

### What Was Built

- Phase 1: Browser bookmarklet extracts and cleans Udemy transcripts via DevTools — zero manual copy-paste
- Phase 2: Batch processing pipeline with Anthropic API integration, resume-on-failure manifest, and per-lecture markdown output
- Phase 3: Extended prompt engineering delivers Notes + Practice Questions + Flashcards in a single API call per lecture
- Phase 4: Compiler aggregates lectures into section-scoped files (notes + quiz), handbook with linked ToC, and `CLAUDE_INSTRUCTIONS.md` system prompt

End result: `claude-package/` is upload-ready for Claude Projects — full study workflow end-to-end in ~1,523 lines of JavaScript.

### What Worked

- **Strict dependency chain**: Each phase produced exactly what the next needed (extractor JSON → processor → compiler). No integration surprises because the dependency was explicit from the start.
- **TDD on pure functions**: Using `node:test` built-in with pure functions (cleaning.js, manifest.js, prompt.js, compiler modules) meant fast red-green cycles and confident refactors with zero test infrastructure overhead.
- **Single API call design**: Committing to notes + questions + flashcards in one `messages.create` call upfront (PROC-05) avoided a refactor that would have been painful at 100+ lecture scale.
- **Section-scoped output**: Deciding early to compile to 8–12 section files instead of 100+ per-lecture files was the right call — Claude Projects retrieval quality is the goal, not file count.
- **Idempotent compiler**: `rmSync` on each compiler run means the output is always fresh. No stale file debugging.

### What Was Inefficient

- **Tracking artifact gaps**: EXTR-01 checkbox was never updated to `[x]` despite the feature shipping in Phase 1. PROC-02/PROC-03 never appeared in SUMMARY frontmatter despite being implemented. These created audit noise.
- **VALIDATION.md files stayed draft**: All 4 phases had Nyquist VALIDATION.md created as `draft` and never promoted. This is scaffolding that added cognitive overhead without payoff.
- **PROC-05 partial re-verification**: The single-call architecture was proven in Phase 2 (notes only) then silently extended in Phase 3 (+ questions + flashcards). Phase 3 VERIFICATION.md didn't re-confirm PROC-05, requiring the audit to reconstruct it from integration evidence.

### Patterns Established

- **CommonJS throughout**: Processor and compiler modules all use `module.exports`. Consistent with Anthropic SDK; no ESM friction.
- **`require.main === module` guard**: Used in processor.js to isolate CLI behavior from module imports during tests. Reusable pattern for future CLI modules.
- **Static system prompt**: `buildSystemPrompt()` returns a static string — no runtime parameters because PMP study instructions are course-agnostic. Simple and robust.
- **`data-purpose` selectors on Udemy**: Stable attribute-based selectors survive React deploys. Always check for `data-*` or `aria-label` before using CSS class names.

### Key Lessons

1. **Lock the dependency contract early**: Defining the JSON shape from extractor.js → processor.js before writing either meant Phase 2 had a clear interface to target. Do this for every cross-phase handoff.
2. **Checkbox hygiene matters**: Updating REQUIREMENTS.md checkboxes as requirements ship (not retroactively) would have saved audit confusion. Keep the traceability table live, not aspirational.
3. **Integration is in the split point**: The `## Practice Questions` section header in prompt.js is the coupling point between processor and compiler. If you change one you must change the other. Document split points explicitly.
4. **Pilot before full batch**: Running 2 transcripts through the full pipeline before full-scale was the right instinct. At 100+ lectures, prompt bugs or API errors compound.

### Cost Observations

- Sessions: ~4 (one per phase, rough estimate)
- Model mix: Not tracked at v1.0 — track in v1.1
- Notable: Single API call per lecture design kept processing cost proportional to lecture count — no multiplicative cost from separate calls per content type.

---

## Milestone: v1.1 — Study Intelligence

**Shipped:** 2026-03-22
**Phases:** 4 | **Plans:** 7

### What Was Built

- Phase 5: Pre-run cost estimator — per-lecture token counts + total cost displayed, batch aborts if user declines
- Phase 6: ECO domain tagging — lectures classified into People/Process/Business Environment during processing or via standalone re-tagger; domain stats flow into CLI output and `CLAUDE_INSTRUCTIONS.md`
- Phase 7: Glossary extraction — pure compiler operation reads all `## Flashcards` sections and outputs a deduplicated, alphabetically sorted `GLOSSARY.md` in `claude-package/` with zero new API calls
- Phase 8: Weak-area hints — `weak-areas.json` opt-in config injects a `## Focus Areas` section into `CLAUDE_INSTRUCTIONS.md` at compile time; absent = no section, no error

End result: v1.1 adds intelligence to the pipeline — cost visibility before commitment, domain-aware study instructions, searchable term reference, and adaptive focus guidance.

### What Worked

- **Compiler-only features are cheap**: Glossary (Phase 7) and weak-area hints (Phase 8) are pure compiler operations — zero API calls, fast TDD cycles, no side effects. Design new features as compiler passes whenever possible.
- **TDD discipline held**: Every plan opened with failing tests. RED-GREEN cycle caught several off-by-one issues in the ECO tagging prompt parser and the glossary deduplication logic before they became integration bugs.
- **Re-tagger as separate concern**: Making ECO re-classification a standalone `eco-tagger.js` tool (rather than re-running the full processor) kept the cost proportional — only ECO classification API calls, no notes/questions/flashcards regeneration.
- **opt-in config pattern**: `weak-areas.json` absent = feature silently disabled. This is the right default for local tools — no config file creation required to get started.

### What Was Inefficient

- **Phase 7 ROADMAP progress tracking**: Phase 7 shipped `roadmap_complete: false` — plans showed as unchecked in the roadmap despite completion. Minor bookkeeping miss; the CLI tools didn't auto-update plan checkboxes consistently.
- **Test runner discovery**: `node --test` doesn't accept space-separated file args on Windows — requires sequential calls. Small friction but caught developers off-guard in regression gate.

### Patterns Established

- **`existsSync` guard for optional config**: Read optional files with `existsSync` + `try/catch` to handle absent or malformed JSON gracefully. Pattern used in `compiler.js` for `weak-areas.json`.
- **Compiler module signature**: `buildSystemPrompt(manifest, weakAreas)` pattern — manifest carries structured data, weakAreas is nullable. Null/empty = section omitted.
- **ECO weight calculation**: Weights derived from manifest at compile time (not stored) — always reflects current manifest state after any re-tagging.

### Key Lessons

1. **Compiler-pass features compound cheaply**: Adding features as post-processing compiler steps (glossary, hints) costs nothing at runtime and nothing in API calls. Prefer this over adding new AI calls where possible.
2. **State tracking discipline**: Keep roadmap plan checkboxes live during execution — don't let the progress table drift from actual status. Stale tracking creates confusion in verification.
3. **Test the absent case explicitly**: Both glossary (no flashcards) and weak-areas (no config file) had absent-case tests. These caught graceful-degradation bugs that would have surfaced only in fresh installs.

### Cost Observations

- Sessions: ~5 (one per phase approximately)
- Model mix: Sonnet 4.6 throughout (executor + verifier)
- Notable: All 7 plans used TDD — test-first approach added upfront cost but eliminated debugging sessions post-implementation. Net token cost likely lower.

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Phases | 4 | 4 |
| Plans | 8 | 7 |
| LOC (JS) | ~1,523 | ~4,600 |
| Timeline (days) | 2 | 2 |
| Commits | ~65 | ~112 (cumulative) |
| Requirements satisfied | 11/11 | 7/7 |
| Tech debt items | 7 | 4 (new) |

*Updated after each milestone.*
