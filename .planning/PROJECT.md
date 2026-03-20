# PMI Study Tool

## What This Is

A toolkit that extracts lecture transcripts from a 30+ hour Udemy PMP certification course, processes them into structured study material using AI, and packages everything for use inside Claude Projects — where the actual studying, quizzing, and Q&A happens. The output is a comprehensive knowledge base and handbook that replaces the current manual workflow of copy-pasting transcripts into Claude.ai one at a time.

## Core Value

A learner can go from watching a Udemy lecture to quizzing themselves on that content in Claude Projects within minutes — without manual copying, formatting, or summarizing.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Browser script extracts transcripts from Udemy course player automatically
- [ ] Raw transcripts are processed into structured notes (key concepts, summaries, examples)
- [ ] Output is organized as clean markdown optimized for Claude Projects upload
- [ ] A compiled handbook (single reference document) is generated from all processed content
- [ ] PMP exam-style practice questions are generated per topic (scenario-based, with reasoning)
- [ ] Flashcard-style content is generated for key terms and concepts
- [ ] Content is organized by course section/module to mirror the Udemy structure
- [ ] Processing pipeline handles 100+ transcripts without manual intervention

### Out of Scope

- Built-in chat UI — Claude Projects is the study interface, not a custom app
- User accounts / auth — single-user local tool
- Mobile app — desktop workflow
- Real-time transcript capture — batch processing is sufficient
- Video downloading — transcripts only, not video content

## Context

- User is studying for PMP (Project Management Professional) certification
- Course is 30+ hours on Udemy — likely 100+ individual lectures
- Current workflow: copy transcript manually → paste into Claude.ai → copy summary → paste into Google Docs
- User has Claude Pro (claude.ai subscription) — Claude Projects is the target study environment
- Claude Projects supports document upload + persistent AI conversation over those docs
- Processing pipeline will use Anthropic API (separate from Pro plan) for bulk transcript processing
- Output structure should align with how Claude Projects best ingests information

## Constraints

- **Platform**: Transcript extraction via browser script (no Udemy API access)
- **AI Interface**: Claude Projects (claude.ai) — not a custom-built chat UI
- **Scale**: Must handle 30+ hours / 100+ transcripts without breaking
- **Format**: Markdown output — Claude Projects works best with clean, structured markdown

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Claude Projects as study interface | User has Pro plan, no need to build redundant chat UI | — Pending |
| Browser script for extraction | No official Udemy transcript API; player shows transcripts in DOM | — Pending |
| Anthropic API for bulk processing | 100+ transcripts can't be manually pasted for processing | — Pending |
| Markdown as primary output format | Claude Projects ingests markdown well; portable to other tools | — Pending |

---
*Last updated: 2026-03-20 after initialization*
