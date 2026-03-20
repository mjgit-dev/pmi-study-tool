# Roadmap: PMI Study Tool

## Overview

Four phases that follow the natural dependency chain of the pipeline: get reliable transcripts out of Udemy, build a processing pipeline that can handle 100+ lectures without failing, extend it with all AI content types, and assemble the final Claude Projects upload package. No phase is useful without the one before it — the order is forced by the work itself.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Extraction** - Browser script reliably captures and cleans Udemy transcripts with validation (completed 2026-03-20)
- [ ] **Phase 2: Processing Pipeline** - Manifest-backed pipeline processes transcripts into structured notes via Anthropic API
- [ ] **Phase 3: AI Content Generation** - Pipeline extended to produce practice questions and flashcards in a single API call per lecture
- [ ] **Phase 4: Compilation and Claude Projects Package** - Processed content assembled into section-scoped files, compiled handbook, and system prompt

## Phase Details

### Phase 1: Extraction
**Goal**: Users can reliably extract cleaned, validated transcripts from any Udemy lecture into a local JSON file ready for processing
**Depends on**: Nothing (first phase)
**Requirements**: EXTR-01, EXTR-02, EXTR-03
**Success Criteria** (what must be TRUE):
  1. User can run a single browser script in Udemy DevTools and receive a JSON file containing the transcript, section name, and lecture title for the current lecture
  2. Extracted transcript text has timestamps stripped and caption segments joined into readable sentences (not raw caption fragments)
  3. The script outputs a word count per capture and visibly flags any transcript under 300 words as a likely extraction failure
  4. The script uses stable DOM selectors (data-* attributes or aria-label values) so it does not break when Udemy deploys a React update
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Discover live Udemy DOM selectors and build the tested transcript cleaning module
- [ ] 01-02-PLAN.md — Build the complete extractor.js and bookmarklet installation package

### Phase 2: Processing Pipeline
**Goal**: Users can run a single CLI command to process any number of raw transcript JSON files into structured notes markdown, with a manifest that tracks status and enables resume on failure
**Depends on**: Phase 1
**Requirements**: PROC-01, PROC-04, PROC-05
**Success Criteria** (what must be TRUE):
  1. User can run the processor on a batch of 5–10 transcripts and receive per-lecture markdown files containing key concepts, a summary, and examples
  2. A processing manifest file (processing-state.json) exists after each run, showing pending/complete/failed status per lecture
  3. Re-running the processor after a mid-batch failure skips already-completed lectures and only reprocesses failures — no duplicate API calls
  4. All content types requested from the API are generated in a single call per lecture (not separate calls for notes, questions, and flashcards)
**Plans**: TBD

### Phase 3: AI Content Generation
**Goal**: Users can process the full course and receive complete per-lecture content — notes, scenario-based PMP practice questions, and flashcard term/definition pairs — with processing-state.json showing 100% completion
**Depends on**: Phase 2
**Requirements**: PROC-02, PROC-03
**Success Criteria** (what must be TRUE):
  1. Every processed lecture's markdown file contains a section of PMP scenario-based practice questions (4-option, situational, with explained answers)
  2. Every processed lecture's markdown file contains a flashcard section with term-to-definition pairs for key concepts introduced in that lecture
  3. Practice questions are visibly grounded in the lecture transcript content — not generic PMP knowledge or PMBOK recall questions
  4. processing-state.json shows 100% completion after a full course run, confirming all lectures processed without silent failures
**Plans**: TBD

### Phase 4: Compilation and Claude Projects Package
**Goal**: Users can run a compiler command and receive an upload-ready Claude Projects package — section-scoped markdown files, a compiled handbook, and a system prompt — that enables effective PMP study in Claude Projects
**Depends on**: Phase 3
**Requirements**: OUTP-01, OUTP-02, OUTP-03
**Success Criteria** (what must be TRUE):
  1. The output folder contains one markdown file per course section (not per lecture), organized to mirror the Udemy course structure
  2. A single compiled handbook file exists with a linked table of contents covering all processed lectures
  3. A CLAUDE_INSTRUCTIONS.md system prompt file exists that instructs Claude how to quiz the user and assist with PMP study
  4. User can upload the section files and handbook to Claude Projects and receive accurate, grounded answers to questions about specific lecture content
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Extraction | 2/2 | Complete   | 2026-03-20 |
| 2. Processing Pipeline | 0/? | Not started | - |
| 3. AI Content Generation | 0/? | Not started | - |
| 4. Compilation and Claude Projects Package | 0/? | Not started | - |
