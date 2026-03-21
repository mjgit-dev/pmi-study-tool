# PMI Study Tool

## What This Is

A toolkit that extracts lecture transcripts from a 30+ hour Udemy PMP certification course, processes them into structured study material (notes, practice questions, flashcards) using the Anthropic API, and compiles everything into a `claude-package/` directory ready for upload to Claude Projects — where the actual studying, quizzing, and Q&A happens.

## Core Value

A learner can go from watching a Udemy lecture to quizzing themselves on that content in Claude Projects within minutes — without manual copying, formatting, or summarizing.

## Requirements

### Validated

- ✓ Browser bookmarklet extracts transcript and metadata (section name, lecture title) from Udemy DevTools — v1.0
- ✓ Extracted transcripts are automatically cleaned (timestamps stripped, segments joined into readable sentences) — v1.0
- ✓ Extraction validates word count and flags captures under 300 words as likely failures — v1.0
- ✓ Pipeline processes raw transcript JSON through Anthropic API to produce structured notes per lecture — v1.0
- ✓ Pipeline generates PMP scenario-based practice questions (4-option, situational) with explained answers per lecture — v1.0
- ✓ Pipeline generates flashcard content (term → definition pairs) per lecture — v1.0
- ✓ Processing manifest tracks status (pending/complete/failed) per lecture and enables resume on failure — v1.0
- ✓ All content types generated in a single API call per lecture to minimize cost — v1.0
- ✓ Processed content assembled into one markdown file per course section optimized for Claude Projects — v1.0
- ✓ Compiled handbook generated as single reference document with linked table of contents — v1.0
- ✓ Claude Projects system prompt file generated, instructing Claude how to quiz and assist — v1.0

### Active

<!-- Milestone v1.1 scope -->
- [ ] PMI Exam Content Outline (ECO) domain tagging per lecture (People 42%, Process 50%, Business Environment 8%)
- [ ] Glossary auto-extraction — all PMI terms across lectures compiled into a single searchable reference
- [ ] Processing cost estimate displayed before any batch run begins
- [ ] Weak-area hint injection — system prompt includes guidance for Claude to focus on topics the user has struggled with

### Out of Scope

- Built-in chat UI — Claude Projects is the study interface, not a custom app
- User accounts / auth — single-user local tool
- Mobile app — desktop workflow
- Real-time transcript capture — batch processing is sufficient
- Video downloading — transcripts only, not video content
- Automatic Claude Projects upload — no public API exists for programmatic upload
- Per-lecture output files — section-scoped files (8–12) perform better in Claude Projects than 100+ files

## Current Milestone: v1.1 Study Intelligence

**Goal:** Add ECO domain awareness, glossary, cost visibility, and adaptive hints to the study pipeline.

**Target features:**
- ECO domain tagging per lecture (People / Process / Business Environment)
- Glossary auto-extraction — all PMI terms compiled into a searchable reference
- Processing cost estimate displayed before any batch run
- Weak-area hint injection — system prompt guided by user-specified struggle topics

## Context

Shipped v1.0 with ~1,523 lines JavaScript.

Tech stack: Node.js (CommonJS), Anthropic SDK, `node:test` built-in test runner, browser bookmarklet.

Architecture: extractor/ (browser) → processor/ (Anthropic API batch) → compiler/ → `claude-package/` upload directory.

The pipeline has been verified end-to-end with 2 transcripts. Full course processing (100+ lectures) untested at scale — performance and cost per full run are unknown.

Known tech debt from v1.0:
- Processor has no low-word-count guard (EXTR-03 only enforced at extraction time)
- H1 heading collision in compiled output (AI-generated H1 conflicts with section file hierarchy — visual only, content correct)

## Constraints

- **Platform**: Transcript extraction via browser bookmarklet (no Udemy API access)
- **AI Interface**: Claude Projects (claude.ai) — not a custom-built chat UI
- **Scale**: Must handle 30+ hours / 100+ transcripts without breaking
- **Format**: Markdown output — Claude Projects works best with clean, structured markdown

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Claude Projects as study interface | User has Pro plan, no need to build redundant chat UI | ✓ Good |
| Browser bookmarklet for extraction | No official Udemy transcript API; player shows transcripts in DOM | ✓ Good |
| Anthropic API for bulk processing | 100+ transcripts can't be manually pasted for processing | ✓ Good |
| Markdown as primary output format | Claude Projects ingests markdown well; portable to other tools | ✓ Good |
| Section-scoped output files (not per-lecture) | 8–12 section files perform better in Claude Projects than 100+ individual files | ✓ Good |
| Single API call per lecture for all content types | Minimizes cost; notes + questions + flashcards in one `messages.create` | ✓ Good |
| node:test built-in (no Jest) | Zero install; sufficient for unit testing pure functions | ✓ Good |
| CommonJS modules throughout | Consistent with Anthropic SDK and Node.js toolchain; no ESM friction | ✓ Good |

---
*Last updated: 2026-03-21 after v1.1 milestone start*
