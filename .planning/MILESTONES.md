# Milestones

## v1.0 MVP (Shipped: 2026-03-21)

**Phases completed:** 4 phases, 8 plans
**Git range:** feat(01-01) → feat(04-02)
**Timeline:** 2026-03-20 → 2026-03-21 (2 days)
**Codebase:** ~1,523 lines JS

**Key accomplishments:**

1. Browser bookmarklet extracts and cleans Udemy transcripts via DevTools — zero manual copy-paste
2. Batch processing pipeline with Anthropic API integration, resume-on-failure manifest, and per-lecture markdown output
3. Extended prompt engineering delivers Notes + Practice Questions + Flashcards in a single API call per lecture
4. Compiler aggregates lectures into section-scoped files (notes + quiz), handbook with linked ToC, and Claude Projects system prompt
5. `claude-package/` directory ships upload-ready for Claude Projects — full study workflow end-to-end

**Known Gaps:**
- EXTR-01: REQUIREMENTS.md checkbox was unchecked — tracking artifact only; extractor.js exists and was smoke-tested
- Processor has no low-word-count guard (EXTR-03 enforced at extraction time only)
- H1 heading collision in compiled output (content correct, visual hierarchy inverted in semantic renderers)
- All VALIDATION.md files remain `draft` / Nyquist non-compliant

---
