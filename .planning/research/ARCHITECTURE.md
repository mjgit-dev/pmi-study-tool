# Architecture Research: PMI Study Tool

**Domain:** Transcript processing + AI content generation pipeline
**Date:** 2026-03-20

---

## System Overview

Three-stage pipeline:

```
[Udemy Course Player]
        │
        ▼
┌─────────────────────┐
│  Stage 1: EXTRACT   │  Browser DevTools script
│  Udemy → JSON       │  Output: raw transcripts + metadata
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Stage 2: PROCESS   │  Node.js + Anthropic API
│  JSON → Markdown    │  Output: structured notes, quizzes, flashcards
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Stage 3: COMPILE   │  Node.js assembly
│  Markdown → Handbook│  Output: single handbook + Claude Projects package
└─────────────────────┘
        │
        ▼
[Claude Projects Upload — manual]
```

---

## Components

### Stage 1: Extractor (Browser Script)

**Recommended approach:** DevTools console script (not a browser extension)

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| DevTools console script | No install, fast to build, easy to update | Must run manually per session | **Recommended** |
| Bookmarklet | One-click, persistent | URL length limits, harder to maintain | Fallback |
| Browser extension | Auto-runs, background | Chrome Web Store review, maintenance burden | Not recommended |

**Output schema:**
```json
{
  "course": "PMP Certification Course",
  "extracted_at": "2026-03-20T10:00:00Z",
  "lectures": [
    {
      "id": "lecture-123",
      "section": "Section 1: Project Integration Management",
      "section_index": 1,
      "title": "Introduction to Integration Management",
      "lecture_index": 1,
      "transcript": "raw transcript text...",
      "duration_seconds": 420
    }
  ]
}
```

**What to extract from Udemy DOM:**
- Transcript text (`.transcript` panel or captions track)
- Lecture title (heading in sidebar)
- Section name and index (sidebar grouping)
- Lecture order within section

---

### Stage 2: Processor (Node.js + Anthropic API)

**Pattern:** Sequential with exponential backoff + resumable state manifest

```
processor/
├── manifest.json          # Tracks processed/pending/failed lectures
├── process.js             # Main runner
├── prompts/
│   ├── notes.txt          # System prompt for structured notes
│   ├── quiz.txt           # System prompt for PMP scenario questions
│   └── flashcards.txt     # System prompt for flashcard generation
└── output/
    └── [section-name]/
        └── [lecture-title].md
```

**Processing manifest schema:**
```json
{
  "version": 1,
  "total": 120,
  "processed": 45,
  "failed": [],
  "lectures": {
    "lecture-123": {
      "status": "done",
      "output_file": "output/section-1/intro-integration.md",
      "processed_at": "2026-03-20T10:05:00Z",
      "tokens_used": 1240
    }
  }
}
```

**Two-pass AI strategy:**
- Pass 1 (bulk): `claude-haiku` — notes, summaries, key concepts (cost-efficient)
- Pass 2 (optional): `claude-sonnet` — PMP scenario questions (higher quality needed)

**Rate limiting:** 1 request/second with exponential backoff. At 120 lectures × ~2 API calls = ~240 requests ≈ 4 minutes total.

**Per-lecture output schema (markdown):**
```markdown
# [Lecture Title]

**Section:** [Section Name]
**Duration:** [X] minutes

## Summary
[3-5 sentence summary]

## Key Concepts
- **[Term]**: [Definition]
- **[Term]**: [Definition]

## Examples
[Real-world example illustrating the concept]

## Practice Questions
1. [Scenario-based PMP question]
   - A) [Option]
   - B) [Option]
   - C) [Option]
   - D) [Option]
   **Answer:** [X] — [Explanation of why, referencing PMI guidance]

## Flashcards
| Term | Definition |
|------|-----------|
| [Term] | [Definition] |
```

---

### Stage 3: Compiler

Assembles processed lecture files into:

1. **Compiled Handbook** (`handbook.md`) — single document, TOC, all sections in order
2. **Claude Projects Package** — organized folder of files optimized for Claude Projects ingestion
3. **System Prompt** (`CLAUDE_INSTRUCTIONS.md`) — tells Claude how to quiz the user, what tone to use, exam context

**Claude Projects package structure:**
```
claude-projects-upload/
├── CLAUDE_INSTRUCTIONS.md    # System prompt for the Project
├── handbook.md               # Full compiled reference
├── by-section/
│   ├── 01-integration-management.md
│   ├── 02-scope-management.md
│   └── ...
├── quizzes/
│   ├── all-questions.md      # All practice questions compiled
│   └── by-section/
└── flashcards/
    └── all-flashcards.md
```

---

## Build Order

1. **Extractor** — validates Udemy DOM access works before investing in pipeline
2. **Processor (notes only)** — get basic output working, verify quality
3. **Processor (quizzes + flashcards)** — extend once notes pipeline is solid
4. **Compiler** — assemble after processing proven
5. **Polish** — cost estimation, better error messages, manifest UI

---

## Anti-Patterns

| Anti-Pattern | Problem | Alternative |
|-------------|---------|-------------|
| Processing all lectures in parallel | Anthropic rate limits, unordered output | Sequential with backoff |
| Storing transcripts only in memory | Crash = restart from scratch | Write raw JSON to disk first |
| One giant prompt for all content types | Poor output quality, hard to tune | Separate prompts per content type |
| Building browser extension first | Long feedback loop, store review | DevTools script first |
| Skipping the manifest | Can't resume failed runs | Manifest is the first thing to build |

---

## Scalability

| Course Size | Lectures | API Calls | Est. Cost (Haiku) | Est. Time |
|------------|----------|-----------|-------------------|-----------|
| 30 hrs | ~60 | ~120 | ~$0.10 | ~2 min |
| 50 hrs | ~100 | ~200 | ~$0.17 | ~3 min |
| 80 hrs | ~160 | ~320 | ~$0.27 | ~5 min |

*Costs estimated at Haiku pricing. Add ~3-5x for Sonnet quiz generation pass.*
