# Project Research Summary

**Project:** PMI Study Tool (Local Transcript Processor)
**Domain:** AI-powered transcript processing + PMP exam preparation
**Researched:** 2026-03-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project is a local CLI pipeline that converts Udemy course transcripts into structured PMP study materials — structured notes, scenario-based practice questions, flashcards, and a compiled handbook — optimized for upload into a Claude Project for interactive exam prep. The tool is single-user, runs locally, and relies on Claude Projects as the study interface rather than building any custom UI. The correct mental model is a data-processing pipeline with three discrete stages: browser-based extraction, AI-powered processing, and file assembly. Research is clear that the Anthropic Message Batches API (or sequential calls with retry logic) and a persistent processing manifest are the two non-negotiable technical choices for the pipeline to be reliable at 100+ lectures.

The recommended approach is a lean Node.js + TypeScript CLI using the official `@anthropic-ai/sdk`. The critical architecture insight is that output files must be organized per course section (8–12 files), not per lecture (100+ files), or Claude Projects' retrieval degrades badly. A two-pass AI strategy is recommended: `claude-haiku` for notes and flashcards (cost-efficient), `claude-sonnet` optionally for scenario-based PMP questions (higher quality needed for exam prep). Total processing cost at scale is very low — under $1 for most courses — making cost a minor concern if prompts are consolidated into a single API call per lecture.

The top risks are: (1) the Udemy DOM script silently extracting empty or wrong content due to class name changes — mitigated by using `data-*`/`aria-label` selectors and word-count validation; (2) mid-batch silent failures from API rate limits — mitigated by a persistent state manifest and exponential backoff from day one; and (3) Claude generating hallucinated PMP content on thin transcripts — mitigated by prompt instructions that ground output strictly in the provided transcript. The PMP exam tests situational judgment, not recall — this must be enforced in every quiz generation prompt or the output study material will be misaligned with the actual exam format.

## Key Findings

### Recommended Stack

The stack is intentionally minimal for a local tool. Node.js 20/22 LTS with TypeScript gives type safety across the I/O-heavy pipeline without requiring a complex build environment. The `@anthropic-ai/sdk` is required (not bare `fetch`) because it handles batch polling, streaming, auth, and retry mechanics correctly. The Message Batches API is the optimal processing pattern for 100+ lectures — async, 50% cheaper per token, up to 10,000 requests per batch. For smaller runs, sequential calls with `p-retry` exponential backoff also work.

**Core technologies:**
- `Node.js 20/22 LTS`: runtime — LTS stability for a local tool, native ESM support
- `TypeScript ~5.4+` with `tsx`: type safety + fast dev iteration — I/O-heavy pipeline benefits from types
- `@anthropic-ai/sdk`: Anthropic API — handles batches, retries, streaming, auth correctly
- `p-limit` + `p-retry`: concurrency control and retry — critical for reliable 100+ lecture runs
- `commander` + `ora` + `chalk`: CLI interface — progress visibility and operator experience
- `glob` + `gray-matter`: file discovery and markdown metadata — keeps output organized
- Vanilla JS browser script: Udemy DOM extraction — runs in DevTools, no build step, no ToS risk
- `dotenv`: API key management — API key must never be hardcoded

What NOT to use: LangChain, vector databases, Electron, Next.js/React, SQLite, browser extensions. All are over-engineering for a single-user local pipeline.

### Expected Features

The feature dependency chain is strictly linear: extraction must work before processing can start, and processing must be solid before compiling a handbook. The processing manifest is a cross-cutting dependency — it must be built before any batch processing begins.

**Must have (table stakes):**
- Batch transcript extraction (100+ lectures) — core pipeline entry point
- Raw text cleaning (strip timestamps, UI text, filler words) — required before AI processing
- Per-lecture structured notes with key concepts and summary — core output unit
- Section/module organization mirroring Udemy course structure — preserves navigation model
- Markdown output optimized for Claude Projects ingestion — primary delivery format
- Compiled handbook (single document with TOC) — the reference artifact
- PMP practice questions — scenario-based situational judgment, not recall — non-negotiable for exam alignment
- Flashcard content (term to definition) — quick reference
- Processing manifest with idempotent re-run and resume — critical for reliability at 100+ lectures
- Claude Projects system prompt file (CLAUDE_INSTRUCTIONS.md) — high-leverage, tells Claude how to quiz

**Should have (differentiators):**
- PMI domain tagging (People 42%, Process 50%, Business Environment 8%) — aligns study to exam weight
- ECO (Exam Content Outline) mapping per lecture — ties content to official PMI blueprint
- Weak-area hint injection in quiz prompts — personalizes study focus
- Processing cost estimate before each run — prevents surprise API spend
- Glossary auto-extraction across all lectures — single searchable reference
- Examples bank (real-world scenarios per concept) — PMP exam is context-heavy

**Defer (v2+):**
- PMI ECO mapping and domain tagging
- Weak-area tracking and hint injection
- Glossary auto-extraction
- Processing cost estimator
- Examples bank with real-world scenarios

### Architecture Approach

The system is a three-stage sequential pipeline: a browser DevTools console script extracts Udemy transcript JSON, a Node.js processor sends each transcript to the Anthropic API and writes structured markdown output, and a compiler assembles the processed files into a handbook and Claude Projects upload package. Each stage is independently runnable and produces durable file artifacts — no stage needs to hold state in memory between runs. The processing manifest in Stage 2 is the backbone of reliability: it tracks `pending/complete/failed` per lecture and enables resume without reprocessing.

**Major components:**
1. Stage 1 — Extractor (browser DevTools script): reads Udemy DOM, outputs raw `transcripts.json` with lecture metadata
2. Stage 2 — Processor (Node.js + Anthropic API): reads transcript JSON, runs AI pass per lecture, writes per-lecture markdown; manifest tracks all state
3. Stage 3 — Compiler (Node.js file assembly): reads processed markdown files, produces compiled handbook, section-scoped Claude Projects files, and system prompt

**Output file structure for Claude Projects:** one file per course section (8–12 files), not per lecture. This is an architectural constraint driven by Claude Projects retrieval quality, not a preference.

### Critical Pitfalls

1. **Udemy DOM selectors targeting CSS classes** — Udemy uses React with hashed class names that change on deploys. Target `data-*` attributes and `aria-label` values. Validate extracted content with a minimum word count threshold (300+ words) before accepting a transcript.

2. **Silent mid-batch failures from API rate limits** — 429 errors without retry logic produce a handbook with holes the user discovers while studying. Build the processing manifest and exponential backoff before running any real batch. Run a 5-10 lecture pilot first.

3. **Multiple API calls per lecture multiplying cost** — three separate calls (notes, questions, flashcards) triples token spend across 100+ lectures. Use a single unified prompt per lecture generating all content types in one response.

4. **Claude Projects context saturation from too many files** — uploading 100+ per-lecture files overwhelms retrieval; Claude gives vague blended answers. Compile output to one file per section (8–12 files max). Test retrieval with known-answer questions before committing to structure.

5. **AI hallucinating PMP content on thin transcripts** — Claude fills gaps in sparse transcripts with plausible but wrong process group assignments, outdated PMBOK 6 terminology, and invented ITTOs. Prompt must include explicit instruction: "Only generate content directly supported by the transcript below." Spot-check 10% of output before trusting it.

## Implications for Roadmap

Based on research, the architecture's three discrete stages and the feature dependency chain (extraction → processing → compilation) map directly to phases. The processing manifest and DOM extraction validation are the two highest-leverage early investments.

### Phase 1: Transcript Extraction

**Rationale:** Everything downstream depends on reliable transcript data. Validate DOM extraction works before investing in any processing logic. Fail fast here.
**Delivers:** `transcripts.json` with all lectures, sections, and metadata; validation output showing word counts per lecture
**Addresses:** batch transcript extraction, raw text cleaning (timestamp stripping), section/module organization
**Avoids:** Pitfall 1 (CSS class fragility — use data-* selectors from the start), Pitfall 6 (UI text capture), Pitfall 7 (timestamp noise), Pitfall 9 (account suspension — semi-manual design only)

### Phase 2: Processing Pipeline Foundation

**Rationale:** The manifest and retry infrastructure must exist before any real batch processing. Build the skeleton before adding AI calls; iterate on a 5-lecture pilot.
**Delivers:** Processing manifest, per-lecture markdown output with notes and summaries, pilot validation on 5–10 lectures
**Uses:** `@anthropic-ai/sdk`, `p-retry`, `gray-matter`, `dotenv`
**Implements:** Stage 2 Processor with manifest, exponential backoff, idempotent file naming
**Avoids:** Pitfall 2 (silent mid-batch failures), Pitfall 3 (cost overrun — single unified prompt), Pitfall 8 (no idempotent re-run)

### Phase 3: AI Content Generation

**Rationale:** Once the pipeline skeleton is proven reliable on a pilot, extend the prompts to generate all content types in a single API call per lecture and process the full course.
**Delivers:** Complete per-lecture markdown files including key concepts, scenario-based PMP practice questions, and flashcard tables; `processing-state.json` showing 100% completion
**Uses:** `claude-haiku` (notes/flashcards), optionally `claude-sonnet` (scenario questions)
**Implements:** Unified prompt generating all output types in one call; transcript-grounded-only instruction
**Avoids:** Pitfall 5 (PMP hallucination), Pitfall 10 (recall-level questions — prompt must require scenario-based format with examples)

### Phase 4: Compilation and Claude Projects Package

**Rationale:** Assembly only makes sense after all processing is validated. Output structure decisions (section-scoped files) must be made before compilation.
**Delivers:** `handbook.md` (compiled reference), `claude-projects-upload/` folder (8–12 section files, quiz compilation, flashcard compilation), `CLAUDE_INSTRUCTIONS.md` system prompt
**Implements:** Stage 3 Compiler
**Avoids:** Pitfall 4 (context saturation — compile to section-scoped files, validate retrieval quality before finalizing structure)

### Phase 5: Polish and Reliability Hardening

**Rationale:** Once the full pipeline works end-to-end, add operator experience improvements that reduce friction on re-runs and future course updates.
**Delivers:** Pre-run cost estimator, `--force` flag for re-processing specific lectures, better error messages, manifest status UI
**Addresses:** Processing cost estimate feature, improved error handling, `--force` reprocessing flag

### Phase Ordering Rationale

- Extraction first: no pipeline without reliable transcript input. DOM fragility is the highest-probability point of failure.
- Manifest before batch: without durable state tracking, any mid-run failure requires starting over. This is not optional.
- Pilot before full run: 5-lecture test validates prompt quality and cost before committing to 100+ lectures.
- Section-scoped output is an architectural decision, not a cosmetic one — must be decided in Phase 4, not retrofitted.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Extraction):** Udemy DOM structure is undocumented and subject to change. Will need inspection of the actual Udemy player DOM at implementation time to identify stable selectors.
- **Phase 3 (AI Content Generation):** Unified prompt design for PMP scenario questions requires iteration. Prompt engineering for scenario-based questions with correct answer grounding needs empirical testing, not just design.

Phases with standard patterns (can skip research-phase):
- **Phase 2 (Pipeline Foundation):** Manifest pattern, exponential backoff with `p-retry`, and `@anthropic-ai/sdk` usage are well-documented with standard patterns.
- **Phase 4 (Compilation):** File system assembly with Node.js `fs/promises` is straightforward; no novel patterns needed.
- **Phase 5 (Polish):** CLI improvements with `commander` and `ora` are standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Node.js + TypeScript + `@anthropic-ai/sdk` are definitive choices. Message Batches API existence should be verified at docs.anthropic.com, but sequential-with-retry is a valid fallback. |
| Features | HIGH | PMP exam format constraints (situational judgment) are well-known. Feature dependency chain is unambiguous. v1/v2 split is clear. |
| Architecture | HIGH | Three-stage pipeline is the natural shape of this problem. Section-scoped output constraint for Claude Projects is a critical finding with high confidence. |
| Pitfalls | MEDIUM-HIGH | DOM fragility and API retry patterns are well-understood. Claude Projects context saturation behavior is based on known retrieval limitations — should be validated empirically with real data. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Message Batches API availability:** Research recommends it but notes it should be verified at docs.anthropic.com before the processing phase. The sequential-with-retry pattern is a complete fallback if batch API has changed.
- **Udemy DOM selectors:** Specific `data-*` attributes and `aria-label` values in the Udemy player cannot be known until implementation. Phase 1 must include DOM inspection as a first step.
- **Prompt quality for scenario-based questions:** Cannot be determined without empirical testing. A pilot run of 5–10 lectures in Phase 2/3 should include spot-check of generated questions against the PMI exam format.
- **Claude Projects file size limits:** The 25,000 token per file guideline should be tested; actual limits may differ.

## Sources

### Primary (HIGH confidence)
- Anthropic official SDK documentation — `@anthropic-ai/sdk`, Message Batches API pattern
- PMI Exam Content Outline (ECO) — domain weight distribution (People 42%, Process 50%, Business Environment 8%)

### Secondary (MEDIUM confidence)
- Community experience with Udemy DOM structure — selector stability guidance (`data-*` over class names)
- Claude Projects retrieval behavior — context saturation patterns, file count recommendations
- Anthropic rate limiting documentation — 429 behavior, retry guidance

### Tertiary (LOW confidence)
- Claude Projects per-file token limits — 25,000 token guideline needs empirical validation
- Cost estimates — Haiku pricing estimates are approximations; verify current pricing before committing

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
