# Phase 3: AI Content Generation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the processing pipeline to generate two new content types per lecture — PMP scenario-based practice questions and flashcard term/definition pairs — appended as new sections in each lecture's markdown file. Phase 3 modifies the AI prompt and regenerates all files via `--force`. Output pipeline, manifest, and CLI mechanics are already built in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Practice question count
- 3 questions per lecture — enough to cover main concepts without padding or forcing weak questions on thin lectures

### Answer explanation depth
- Explain why the correct answer is right AND why each wrong answer (A/B/C/D) is wrong
- This is the PMP prep standard — eliminators are as important as recognizing the correct answer

### Question grounding requirement
- Questions MUST use a specific concept, term, or scenario from that lecture's transcript
- The scenario setup must reference something concrete the instructor described — a specific process, constraint, or situation
- Generic PMBOK recall questions are explicitly not allowed

### Question format in markdown
- Numbered questions with lettered options: `Q1. [scenario]` / `A) ... B) ... C) ... D) ...`
- Answer and explanation immediately below: `**Answer: B** — [explanation covering why B is right and why A/C/D are wrong]`
- All 3 questions under a single `## Practice Questions` H2 section

### Flashcard design
- Claude's Discretion: 5–8 term/definition pairs per lecture — prioritize PMP-specific terms, PMI definitions, and concepts the instructor explicitly named or defined
- Definitions should be 1–2 sentences: precise enough to quiz from, not a paragraph
- Format: `**Term** — definition` as a bullet list under a `## Flashcards` H2 section

### Integration method
- Update `prompt.js` (`buildMessages()`) to include Practice Questions and Flashcards in the unified system prompt
- Run `processor.js --force` to regenerate all existing lecture files with the updated prompt
- Section order in output: Key Concepts → Summary → Examples → Practice Questions → Flashcards (locked — matches Phase 2 decision)
- No separate append pass — single API call per lecture generates all content types together (locked decision from STATE.md)

### Quality gate
- STATE.md flags: "pilot run of 5-10 lectures must include spot-check of question quality before full batch"
- Phase 3 must include a documented pilot step: run on a small subset first, review questions for grounding and quality, then proceed to full batch
- Claude's Discretion: exact CLI mechanic for subset run (e.g., separate test input folder with 5 sample transcripts)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PROC-02 (practice questions) and PROC-03 (flashcards) define the acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 3 — Success criteria (4 items) that must all be TRUE for phase completion

### Project constraints
- `.planning/PROJECT.md` — Key decisions (single API call per lecture, markdown output, Anthropic API for bulk processing)
- `.planning/STATE.md` §Decisions — "Single API call per lecture for all content types" (locked), section order lock, pilot run blocker note

### Existing implementation (MUST read before modifying)
- `processor/prompt.js` — Current `buildMessages()` implementation; Phase 3 extends this file's system prompt to add questions + flashcards
- `processor/processor.js` — Batch orchestrator; `--force` flag already implemented for reprocessing complete entries
- `processor/markdown.js` — `buildMarkdown()` wraps API text with frontmatter; no changes expected but read to understand the output contract

### Phase 2 output contract
- `.planning/phases/02-processing-pipeline/02-CONTEXT.md` — Section order decision (locked), single-API-call decision, CommonJS pattern requirement

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `processor/prompt.js` `buildMessages(transcript)` — the only file that needs to change; extend the system prompt string to instruct Claude to also output `## Practice Questions` and `## Flashcards` sections
- `processor/processor.js` `processAll()` — already supports `--force` flag for full reprocessing; no changes needed to orchestrator
- `processor/manifest.js` — manifest already tracks per-file status; Phase 3 uses `--force` to bypass skip logic, no manifest changes needed
- `processor/markdown.js` `buildMarkdown()` — takes raw API text and prepends frontmatter; transparent to section content; no changes needed

### Established Patterns
- CommonJS (`module.exports` / `require`) — no ES module syntax anywhere; maintain throughout
- `node:test` for unit tests — no Jest or external runner; processor tests use this pattern
- System prompt opens with output-only instruction ("Output ONLY...") to prevent preamble — extend this pattern for the new sections
- Single API call per lecture for all content — do not introduce a second API call

### Integration Points
- `buildMessages()` in `prompt.js` is the only integration point — add Practice Questions and Flashcards to the system prompt's output structure
- Output markdown files feed into Phase 4 compiler — the `## Practice Questions` and `## Flashcards` H2 headings become part of the per-lecture file contract that Phase 4 will assemble

</code_context>

<specifics>
## Specific Ideas

- Answer explanations should follow the PMP prep book convention: why the correct answer is right + why each distractor is wrong
- Questions must be scenario-based (situational), not recall-based — the exam tests judgment, not memorization
- The pilot run is a quality gate, not a technical test — the goal is human review of 5–10 question sets before committing to 100+ lecture regeneration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-ai-content-generation*
*Context gathered: 2026-03-20*
