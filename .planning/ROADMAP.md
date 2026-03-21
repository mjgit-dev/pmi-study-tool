# Roadmap: PMI Study Tool

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-03-21)
- 🚧 **v1.1 Study Intelligence** — Phases 5–8 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4) — SHIPPED 2026-03-21</summary>

- [x] Phase 1: Extraction (2/2 plans) — completed 2026-03-20
- [x] Phase 2: Processing Pipeline (2/2 plans) — completed 2026-03-20
- [x] Phase 3: AI Content Generation (2/2 plans) — completed 2026-03-21
- [x] Phase 4: Compilation and Claude Projects Package (2/2 plans) — completed 2026-03-21

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Study Intelligence (In Progress)

**Milestone Goal:** Add ECO domain awareness, cost visibility, glossary extraction, and adaptive study hints so the pipeline produces richer, more trustworthy study material.

- [ ] **Phase 5: Cost Estimation** — User can see estimated API cost for pending lectures and confirm before any batch run starts
- [ ] **Phase 6: ECO Domain Tagging** — Every processed lecture is classified into a PMI ECO domain; a re-classification pass allows tagging already-processed lectures without regenerating notes, questions, or flashcards; domain data flows through the manifest, compiled output, and study instructions
- [ ] **Phase 7: Glossary Extraction** — All PMI terms from existing flashcard sections are aggregated into a single deduplicated, alphabetically sorted GLOSSARY.md at compile time — no new API calls required
- [ ] **Phase 8: Weak-Area Hints** — User can declare weak topics in a config file and have them injected as focus guidance into CLAUDE_INSTRUCTIONS.md

## Phase Details

### Phase 5: Cost Estimation
**Goal**: Users can see a per-lecture and total cost estimate for pending lectures before committing to a batch run
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: ENHA-03
**Success Criteria** (what must be TRUE):
  1. Running the processor with an estimate flag shows per-lecture token/cost estimates and a total, scoped only to pending lectures
  2. The processor does not start any API calls until the user explicitly confirms the estimate
  3. The cost estimate accounts for the full prompt shape (system prompt + messages) — not just message tokens
  4. User can decline the estimate prompt and the batch is aborted with no charges incurred
**Plans**: 2 plans
Plans:
- [ ] 05-01-PLAN.md — TDD: estimate module (pricing, cost calc, token counting, table formatting)
- [ ] 05-02-PLAN.md — Integrate estimate gate into processor.js with CLI flags and confirmation flow

### Phase 6: ECO Domain Tagging
**Goal**: Every lecture in the pipeline can be classified as People, Process, or Business Environment — either during normal processing (ENHA-01) or via a dedicated re-classification pass that calls the AI only for ECO tagging on already-processed lectures without regenerating notes, questions, or flashcards (ENHA-06); the classification is persisted in the manifest and YAML frontmatter, surfaced in CLI output, and reflected in the Claude Projects study instructions
**Depends on**: Phase 5
**Requirements**: ENHA-01, ENHA-06, ENHA-04, ENHA-05
**Success Criteria** (what must be TRUE):
  1. After normal processing, each lecture's markdown file includes an ecoTag field in its YAML frontmatter (People, Process, or Business Environment) and the manifest stores the tag
  2. User can run a re-classification command that adds ECO tags to already-processed lectures using a lightweight AI call — notes, questions, and flashcards are not regenerated and no existing content is modified
  3. After processing or re-classification, the CLI prints a per-domain lecture count (e.g., People: 12 / Process: 20 / Business Environment: 8)
  4. The compiled CLAUDE_INSTRUCTIONS.md includes the current ECO domain weight percentages and a per-domain lecture breakdown
**Plans**: TBD

### Phase 7: Glossary Extraction
**Goal**: All PMI terms from all processed lectures are compiled into a single searchable reference file in the claude-package/ directory using only the existing flashcard sections — no new API calls, no re-processing of any lecture
**Depends on**: Phase 6
**Requirements**: ENHA-02
**Success Criteria** (what must be TRUE):
  1. After compiling, a GLOSSARY.md file exists in claude-package/ containing PMI terms extracted from the ## Flashcards sections of already-processed lecture markdown files
  2. The glossary is deduplicated (same term appearing in multiple lectures appears once) and sorted alphabetically
  3. Generating the glossary requires zero new Anthropic API calls — it is a pure compiler operation over existing files
  4. The compiler logs the total glossary term count on completion
**Plans**: TBD

### Phase 8: Weak-Area Hints
**Goal**: Users can declare topics they struggle with in a config file and have targeted focus guidance automatically injected into the Claude Projects system prompt
**Depends on**: Phase 7
**Requirements**: STDY-01
**Success Criteria** (what must be TRUE):
  1. When weak-areas.json exists in the project root, CLAUDE_INSTRUCTIONS.md includes a Focus Areas section listing the configured topics
  2. When weak-areas.json is absent, CLAUDE_INSTRUCTIONS.md is generated without a Focus Areas section and no error is thrown
  3. Editing weak-areas.json and re-running the compiler updates the Focus Areas section in the output
**Plans**: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Extraction | v1.0 | 2/2 | Complete | 2026-03-20 |
| 2. Processing Pipeline | v1.0 | 2/2 | Complete | 2026-03-20 |
| 3. AI Content Generation | v1.0 | 2/2 | Complete | 2026-03-21 |
| 4. Compilation and Claude Projects Package | v1.0 | 2/2 | Complete | 2026-03-21 |
| 5. Cost Estimation | v1.1 | 0/2 | Not started | - |
| 6. ECO Domain Tagging | v1.1 | 0/? | Not started | - |
| 7. Glossary Extraction | v1.1 | 0/? | Not started | - |
| 8. Weak-Area Hints | v1.1 | 0/? | Not started | - |
