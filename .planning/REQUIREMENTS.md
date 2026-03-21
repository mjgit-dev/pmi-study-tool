# Requirements: PMI Study Tool

**Defined:** 2026-03-21
**Core Value:** A learner can go from watching a Udemy lecture to quizzing themselves on that content in Claude Projects within minutes — without manual copying, formatting, or summarizing.

## v1.1 Requirements

Requirements for v1.1 Study Intelligence. Continues from v1.0 (phases 1-4 complete).

### Cost Estimation

- [ ] **ENHA-03**: User sees estimated API cost (per-lecture and total) for pending lectures before the processor runs, and must confirm before the batch starts

### ECO Domain Tagging

- [ ] **ENHA-01**: Processor classifies each lecture as People, Process, or Business Environment and stores the tag in the manifest and per-lecture YAML frontmatter
- [ ] **ENHA-04**: After processing, CLI shows a per-domain lecture count (e.g. People: 12 / Process: 20 / Business Environment: 8)
- [ ] **ENHA-05**: Compiled `CLAUDE_INSTRUCTIONS.md` includes ECO domain weight percentages and per-domain lecture breakdown to guide study emphasis

### Glossary

- [ ] **ENHA-02**: Compiler aggregates all PMI terms from processed flashcard sections into a deduplicated, alphabetically sorted `GLOSSARY.md` in `claude-package/`

### Study Intelligence

- [ ] **STDY-01**: User can list weak topics in a `weak-areas.json` config file and have them injected as a Focus Areas section in `CLAUDE_INSTRUCTIONS.md`; section is omitted when file is absent

## v2 Requirements

Deferred from v1.1 or acknowledged but not yet scoped.

### Enhanced Processing

- **ENHA-06**: Post-run actual API cost summary — sums response.usage across all lectures and compares to pre-run estimate
- **ENHA-07**: ECO domain label shown in section notes next to each lecture heading (e.g. `## Lecture Title [Process]`)

### Study Intelligence

- **STDY-02**: Examples bank — real-world scenario examples per concept, separate from practice questions

### Pipeline Reliability

- **RELI-01**: Processor enforces low-word-count guard (< 300 words) at processing time, not only at extraction time
- **RELI-02**: H1 heading collision in compiled output fixed (AI-generated H1 conflicts with section file hierarchy)
- **RELI-03**: Full-scale pipeline test with 100+ transcripts validated

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom chat UI | Claude Projects is the study interface — don't rebuild it |
| Per-lecture output files | Section-scoped files (8–12) perform better in Claude Projects than 100+ files |
| Automatic Claude Projects upload | No public API exists for programmatic upload |
| Video/audio capture | Transcripts are sufficient; video capture is ToS risk |
| Mobile app | Desktop workflow |
| User accounts / auth | Single-user local tool |
| Real-time transcript capture | Batch processing is sufficient |
| Sub-task level ECO tagging | Requires validation dataset not available; 26 ECO tasks is excessive granularity for v1.1 |
| Anki/CSV glossary export | Out of scope for Claude Projects workflow |
| Automated weak-area scoring from quiz history | Requires session tracking infrastructure that does not exist |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENHA-03 | Phase ? | Pending |
| ENHA-01 | Phase ? | Pending |
| ENHA-04 | Phase ? | Pending |
| ENHA-05 | Phase ? | Pending |
| ENHA-02 | Phase ? | Pending |
| STDY-01 | Phase ? | Pending |

**Coverage:**
- v1.1 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6 ⚠️

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial v1.1 definition*
