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

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 4 |
| Plans | 8 |
| LOC (JS) | ~1,523 |
| Timeline (days) | 2 |
| Commits | ~65 |
| Requirements satisfied | 11/11 (functional) |
| Tech debt items | 7 |

*Updated after each milestone.*
