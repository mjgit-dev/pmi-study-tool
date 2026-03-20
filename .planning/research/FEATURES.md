# Features Research: PMI Study Tool

**Domain:** AI-powered transcript processing + PMP exam preparation tool
**Date:** 2026-03-20

---

## Table Stakes

Features users expect — missing these makes the tool unusable.

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Batch transcript extraction (100+ lectures) | Medium | Core pipeline entry point |
| Raw text cleaning (strip timestamps, filler words) | Low | Required before AI processing |
| Per-lecture structured notes (key concepts + summary) | Medium | Core output unit |
| Section/module organization mirroring Udemy structure | Low | Preserves course navigation mental model |
| Markdown output optimized for Claude Projects | Low | Primary delivery format |
| Compiled handbook (single doc with TOC) | Medium | "The book" users reference |
| PMP practice questions — scenario-based, not recall | Medium | Non-negotiable: PMP tests situational judgment |
| Flashcard content (term → definition) | Low | Quick reference / memorization |
| Idempotent processing (skip already-processed lectures) | Medium | Critical for 100+ lecture runs |
| Error handling + resume from manifest | Medium | Must survive API failures mid-run |

### Critical PMP-Specific Insight

The PMP exam tests **situational judgment**, not factual recall. Scenario-based questions (4 options, pick best action) are the dominant question type. Quiz generation prompts must be designed around this constraint — simple "what is X?" questions are anti-patterns for PMP prep.

---

## Differentiators

Features that make this tool significantly better than the current copy-paste workflow.

| Feature | Complexity | Value |
|---------|-----------|-------|
| PMI domain tagging (People 42%, Process 50%, Business Environment 8%) | Medium | Aligns study to exam weight distribution |
| Exam Content Outline (ECO) mapping | Medium | Maps each lecture to PMI's official exam blueprint |
| System prompt / Claude Projects instruction file | Low | High leverage — tells Claude how to quiz the user |
| Weak-area hint injection in quiz prompts | Medium | Guides Claude Projects to focus on gaps |
| Processing cost estimate before run | Low | Prevents surprise API bills on 100+ lectures |
| Glossary extraction (all PMI terms across lectures) | Medium | Single searchable reference |
| Examples bank (real-world scenarios per concept) | Medium | PMP exam context-heavy — examples matter |

---

## Anti-Features

Deliberately excluded — these would add complexity without value.

| Feature | Reason |
|---------|--------|
| Custom chat UI | Claude Projects handles this — don't rebuild it |
| Spaced repetition system | Use Anki if needed; out of scope |
| Automatic Claude Projects upload | No public API exists for this |
| Video/audio capture | ToS risk + transcripts are sufficient |
| Multi-user, auth, dashboards | Single-user local tool |
| Real-time transcript capture | Batch processing is sufficient |
| Mobile app | Desktop workflow |

---

## Feature Dependencies

```
Transcript extraction
  └─→ Text cleaning
        └─→ Per-lecture notes (requires Anthropic API)
              └─→ Compiled handbook
              └─→ PMP practice questions
              └─→ Flashcards
              └─→ Glossary extraction
              └─→ PMI domain tagging
```

Processing manifest (tracking what's been processed) is a dependency for all pipeline stages — must be built early.

---

## v1 vs v2 Split

**v1 (build now):**
- Transcript extraction script
- Text cleaning + processing pipeline
- Per-lecture structured notes + summaries
- PMP practice questions (scenario-based)
- Flashcard content
- Compiled handbook
- Processing manifest + resume capability
- Claude Projects system prompt file

**v2 (later):**
- PMI ECO mapping / domain tagging
- Weak-area tracking hints
- Glossary auto-extraction
- Processing cost estimator
- Examples bank with real-world scenarios
