# Feature Research

**Domain:** PMP certification study tool — v1.1 Study Intelligence features
**Researched:** 2026-03-21
**Confidence:** HIGH (ECO domain facts from PMI official docs; implementation patterns from Anthropic SDK docs and direct codebase inspection)

---

**Scope note:** This file covers ONLY the four v1.1 features being added. The existing pipeline (bookmarklet extraction, API batch processing, notes/questions/flashcards generation, section compiler, claude-package output, system prompt) is already shipped and is treated as a foundation here.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are necessary for v1.1 to feel complete and correct. Missing any of these means the milestone goal is not met.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ECO domain tag per processed lecture | The whole point of v1.1 is ECO awareness — without it, the other features have no domain signal | MEDIUM | Must be assigned at processing time; three values only: People, Process, Business Environment. The 2026 ECO shifts weights significantly (People 33%, Process 41%, Business Environment 26% — up from 8%) so hardcoded 2020 weights would be wrong. Tags must be stored somewhere accessible to the compiler and to users. |
| Glossary file in claude-package/ | Users expect a single searchable reference for PMP terminology after a full course run; manually searching across 8+ section files is broken | MEDIUM | Extraction must be additive across all lectures (not per-lecture). Output must go into claude-package/ alongside section files. The PMI Lexicon (official source, ~200 terms) provides the authoritative definition format. |
| Cost estimate before batch run | Users will not blindly kick off a 100+ lecture run without knowing the dollar cost upfront — this is a non-negotiable trust feature | LOW | Anthropic SDK provides `client.messages.countTokens()` natively — free API call, no billing. Must include system prompt tokens (they recur on every request). Formula: `(system_tokens + avg_transcript_tokens) * pending_lecture_count * input_rate + max_tokens * pending_lecture_count * output_rate`. Should show estimate in CLI before asking confirmation. |
| Weak-area section in CLAUDE_INSTRUCTIONS.md | System prompt must carry domain focus guidance into Claude Projects — without it the "Weak Area Focus" study mode in the existing system prompt has no data to act on | LOW | This is a system prompt text addition, not a new runtime system. Must read user-specified struggle topics and inject them as named guidance. Simplest viable form: user edits a config file or passes CLI flag; compiler reads it and adds a section. |

### Differentiators (Competitive Advantage)

Features that go beyond baseline correctness and provide meaningful study value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| ECO weight-aware study guidance | The 2026 ECO nearly triples Business Environment weight (8% to 26%) — surfacing this in the system prompt tells Claude to emphasize high-weight domains during quizzing | LOW | Requires only that the compiler read the domain tag distribution and inject a weighting note into CLAUDE_INSTRUCTIONS.md. No new data collection needed once tags exist. |
| Glossary deduplication across lectures | The same term (e.g., "Change Control Board") appears in multiple lectures; a deduplicated glossary with the best definition is far more useful than a dump | MEDIUM | Requires merge logic: collect all term/definition pairs, group by term, select canonical definition (longest, or first-occurrence). This is pure string/data processing with no API calls. |
| Per-domain lecture count in CLI output | After processing, showing "People: 42 lectures, Process: 50 lectures, Business Environment: 8 lectures" gives the user an immediate sanity check on coverage gaps | LOW | Trivial aggregation over manifest/tags data. High value relative to implementation cost. |
| Cost estimate that excludes already-complete lectures | Estimate should be scoped to pending lectures only (respect the manifest), not total lectures — users re-run the processor incrementally | LOW | The manifest already tracks complete/pending/failed state. Cost estimation just needs to filter the same way `shouldSkip()` does. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic ECO domain scoring / performance tracking | Sounds like useful analytics — "you're weak in Business Environment based on wrong answers" | Requires a quiz runtime with answer tracking. Claude Projects has no outbound API; there is no way to read back user session data. Building a separate quiz tracker is out of scope and duplicates what Claude Projects already does. | Let Claude Projects handle adaptive quizzing. The weak-area hint injection provides the input signal; users self-report their struggle topics based on their own study sessions. |
| Per-lecture ECO sub-task tagging (e.g., "Task 3 under Process domain") | Granular tagging looks thorough | The 2026 ECO has 26 tasks across three domains. Reliably tagging to sub-task level via LLM requires validation data that doesn't exist for this codebase. Domain-level (3 values) is accurate and sufficient for study guidance. | Tag at domain level only. Domain is what determines exam question proportion. |
| Automatic glossary publishing / export to Anki/CSV | Users want glossary in flashcard apps | Adds a format conversion layer and external dependency. The compiled glossary markdown already works natively in Claude Projects, which is the study interface. | Compile to markdown in claude-package/. If a user wants Anki export later, that is a v2 feature. |
| Real-time cost tracking during a run | Show spend per lecture as it processes | The Anthropic API returns usage in the response object (`response.usage`) — this is already available. But displaying running totals adds output noise and misleads (batch pricing vs. real-time pricing differs). | Show pre-run estimate (accurate) and post-run total (from summed `response.usage`). Skip per-lecture cost display. |
| User-facing weak-area dashboard / score history | Persist quiz scores per domain over time | Requires a database, a session model, and a UI — none of which exist. This is a full product build, not a study tool addition. | Weak-area hints are user-declared ("I keep getting Business Environment questions wrong") and injected as a static section in the system prompt. This covers 80% of the value. |

---

## Feature Dependencies

```
[ECO domain tagging]
    └──required by──> [ECO weight-aware study guidance in system prompt]
    └──required by──> [Per-domain lecture count in CLI output]
    └──enables──> [Weak-area hint injection] (domain names must match ECO vocabulary)

[Glossary extraction]
    └──requires──> [Existing API processing loop] (extracts terms from same API call)
    └──produces──> [Deduplicated glossary file in claude-package/]

[Cost estimation]
    └──requires──> [Existing manifest] (filters to pending lectures only)
    └──requires──> [Existing prompt builder] (must include system prompt tokens in count)
    └──independent of──> [ECO tagging, Glossary, Weak-area hints]

[Weak-area hint injection]
    └──requires──> [Existing compiler / system-prompt.js] (adds a section to CLAUDE_INSTRUCTIONS.md)
    └──enhanced by──> [ECO domain tagging] (hint can reference domain names authoritatively)
    └──independent of──> [Glossary]
```

### Dependency Notes

- **ECO tagging must come before domain-aware compiler outputs:** The compiler reads tags to generate domain coverage stats and weight guidance. If tagging is added after compiler work, the compiler must be revisited.
- **Glossary extraction can be added to existing prompt.js or as a post-processing step:** Either approach works, but adding a `## Glossary Terms` section to the same API call is simpler than a second pass. Risk: increases output token length, which affects cost. Alternative: dedicated compiler pass over existing processed markdown files.
- **Cost estimation is fully independent:** Can be implemented as a `--estimate` flag on the existing processor CLI without touching any other feature.
- **Weak-area hints require zero new runtime data:** The user specifies struggle topics once (CLI flag or config file); the compiler reads them at compile time and injects into CLAUDE_INSTRUCTIONS.md. No tracking system needed.

---

## MVP Definition

### Launch With (v1.1)

This IS the v1.1 milestone. All four features are in scope.

- [ ] ECO domain tag per lecture — stored in manifest or sidecar; three values (People, Process, Business Environment) matching 2026 ECO vocabulary
- [ ] Glossary file — `GLOSSARY.md` in claude-package/ with all PMP terms extracted across all lectures, deduplicated
- [ ] Cost estimate — `node processor.js <dir> --estimate` prints token estimate and dollar cost before any API calls; scoped to pending lectures
- [ ] Weak-area hint injection — compiler reads user-specified topics and adds a `## Focus Areas` section to CLAUDE_INSTRUCTIONS.md

### Add After Validation (v1.x)

- [ ] Post-run cost summary (sum of `response.usage` across all lectures) — low effort, adds closure to the run
- [ ] ECO domain distribution shown in compiler output log — "Compiled 42 People / 50 Process / 8 Business Environment lectures"
- [ ] Glossary term count reported at end of compile — "Extracted 247 unique PMP terms"

### Future Consideration (v2+)

- [ ] Sub-task level ECO tagging — requires validation dataset and is not needed for exam weighting guidance
- [ ] Anki/CSV glossary export — useful but out of scope for Claude Projects-focused workflow
- [ ] Automated weak-area scoring from quiz history — requires session tracking infrastructure that doesn't exist

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ECO domain tagging per lecture | HIGH — unlocks all domain-aware features | MEDIUM — must extend prompt, store tag, thread through compiler | P1 |
| Glossary extraction + deduplication | HIGH — fills a real gap in the existing output | MEDIUM — new extraction logic + merge pass | P1 |
| Cost estimate before batch run | HIGH — trust/safety feature; users won't run blind | LOW — `countTokens()` API exists, formula is simple | P1 |
| Weak-area hint injection | HIGH — closes the loop on the "Weak Area Focus" study mode | LOW — compiler text addition, reads config/flag | P1 |
| Per-domain lecture count in CLI | MEDIUM — useful sanity check | LOW — aggregation over existing tag data | P2 |
| Post-run cost summary | MEDIUM — confirms actual spend | LOW — sum `response.usage.input_tokens` and `output_tokens` | P2 |
| Glossary term count in compiler log | LOW — nice to know | LOW — trivial count | P3 |

**Priority key:**
- P1: Must have for v1.1
- P2: Should have, add when P1 complete
- P3: Nice to have, add if time permits

---

## Implementation Notes by Feature

### ECO Domain Tagging

The 2026 ECO (effective July 2026) changes domain weights from People 42% / Process 50% / Business Environment 8% to People 33% / Process 41% / Business Environment 26%. Source: PMI official ECO document (pmi.org). Tagging logic must be assigned by the LLM during the existing API call (cheapest — no extra call) OR by a heuristic keyword match (zero cost, less accurate). Recommended: extend the existing `buildMessages()` prompt in `prompt.js` to output a structured tag at the top of the response (e.g., `ECO_DOMAIN: Process`), then parse it out in `markdown.js` and store in the manifest. This adds ~5 output tokens per call — negligible cost impact.

### Glossary Extraction

Two approaches viable:
1. **In-call extraction (same API call):** Add `## Glossary Terms` to the existing prompt output spec. Increases output tokens but avoids a second pass. Risk: dilutes focus of the notes/questions/flashcard generation.
2. **Post-processing compiler pass:** After processing is complete, the compiler scans all `.md` files in `processor/output/` for the existing `## Flashcards` section (which already contains `**Term** — definition` pairs) and aggregates them. This reuses existing structured output with no prompt change and no added API cost. Recommended approach.

The PMI Lexicon (v5.0, January 2026) defines ~200 canonical terms. The compiled glossary will likely extract 300-500 terms across 100+ lectures (with duplicates); deduplication will reduce to roughly 150-250 unique terms.

### Cost Estimation

Anthropic SDK method: `client.messages.countTokens({ model, system, messages })`. Returns `{ input_tokens: N }` with no billing charge. Formula for estimate display:

```
pending = lectures not yet 'complete' in manifest
input_tokens_per_lecture = countTokens(system_prompt + transcript)
total_input = input_tokens_per_lecture * pending
total_output = max_tokens * pending  (8192 per call = worst-case)
cost = (total_input * INPUT_RATE) + (total_output * OUTPUT_RATE)
```

Current rates (March 2026): claude-sonnet-4-6 standard API: ~$3/M input, ~$15/M output. Batch API (50% discount): ~$1.50/M input, ~$7.50/M output. The tool uses real-time API (not Batch API), so use standard rates. These rates must be documented as constants that can be updated — they change.

### Weak-Area Hint Injection

The existing `system-prompt.js` already has a `### Weak Area Focus` study mode. The enhancement adds a `## Your Current Focus Areas` section listing domains/topics the user has flagged as weak. Input mechanism options:
1. `--weak-areas "Business Environment,Stakeholder Engagement"` CLI flag to `compiler.js`
2. A `weak-areas.txt` or JSON config file read by the compiler

Either approach produces the same output. A config file is more ergonomic for repeated runs (user sets it once, not on every compile). Recommended: `weak-areas.json` in project root, read by compiler, injected into CLAUDE_INSTRUCTIONS.md as a named section. If the file doesn't exist or is empty, the section is omitted — backward compatible.

---

## Existing System Integration Points

| New Feature | Touches Which Existing File | Change Type |
|-------------|----------------------------|-------------|
| ECO tagging | `processor/prompt.js` — add tag instruction | Extend prompt output spec |
| ECO tagging | `processor/markdown.js` — parse tag from API response | New parsing logic |
| ECO tagging | `processor/manifest.js` — store tag in manifest entry | New manifest field |
| Glossary extraction | `compiler/builder.js` or new `compiler/glossary.js` | New compiler step |
| Glossary output | `compiler/compiler.js` — write GLOSSARY.md to claude-package/ | New output file |
| Cost estimation | `processor/processor.js` — new `--estimate` flag | New CLI mode, pre-run |
| Weak-area injection | `compiler/system-prompt.js` — new optional section | Extend system prompt builder |
| Weak-area injection | `compiler/compiler.js` — read config, pass to system-prompt builder | New config read |

---

## Sources

- PMI 2026 Exam Content Outline (official): https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf
- PMI Lexicon of Project Management Terms v5.0 (January 2026): https://www.pmi.org/-/media/pmi/documents/registered/pdf/pmbok-standards/pmi-lexicon-pm-terms.pdf
- Anthropic token counting API docs: https://docs.anthropic.com/en/api/messages-count-tokens
- Anthropic token counting guide: https://platform.claude.com/docs/en/build-with-claude/token-counting
- PMP 2026 domain weight changes: https://shrilearning.com/pmp-business-environment-2026/
- BrainBOK ECO alignment approach (competitor pattern): https://www.brainbok.com/blog/pmp/pmp-practice-exams-blueprint-aligned-with-pmp-exam-content-outline
- PMI certification page (2026 exam launch date): https://www.pmi.org/certifications/project-management-pmp/new-exam
- Direct codebase inspection: processor/prompt.js, processor/processor.js, compiler/system-prompt.js

---
*Feature research for: PMI Study Tool v1.1 Study Intelligence*
*Researched: 2026-03-21*
