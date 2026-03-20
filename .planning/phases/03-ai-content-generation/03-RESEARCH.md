# Phase 3: AI Content Generation - Research

**Researched:** 2026-03-20
**Domain:** Prompt engineering / Anthropic Claude API / Node.js test patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Practice question count:** 3 questions per lecture
- **Answer explanation depth:** Explain why the correct answer is right AND why each wrong answer (A/B/C/D) is wrong — full eliminator style
- **Question grounding requirement:** Questions MUST use a specific concept, term, or scenario from that lecture's transcript; generic PMBOK recall questions are explicitly not allowed
- **Question format in markdown:** Numbered questions with lettered options (`Q1. [scenario]` / `A) ... B) ... C) ... D) ...`); answer and explanation immediately below (`**Answer: B** — [explanation]`); all 3 questions under a single `## Practice Questions` H2
- **Flashcard format:** `**Term** — definition` as a bullet list under a `## Flashcards` H2; definitions 1–2 sentences
- **Integration method:** Update `prompt.js` (`buildMessages()`) only — single API call per lecture generates all sections together; no separate append pass
- **Section order (locked from Phase 2):** Key Concepts → Summary → Examples → Practice Questions → Flashcards
- **Regeneration approach:** Run `processor.js --force` to regenerate all existing lecture files with the updated prompt
- **Quality gate:** Pilot run of 5–10 lectures with human spot-check of question quality before full batch

### Claude's Discretion

- **Flashcard count:** 5–8 term/definition pairs per lecture — prioritize PMP-specific terms, PMI definitions, and concepts the instructor explicitly named or defined
- **Pilot run mechanic:** Exact CLI approach for subset run (e.g., separate test input folder with 5 sample transcripts vs. running on the real input folder with a small subset manually placed there)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROC-02 | Pipeline generates PMP scenario-based practice questions (4-option, situational) with explained answers per lecture | Prompt engineering section covers exact system prompt additions needed; test map covers unit test for new sections |
| PROC-03 | Pipeline generates flashcard content (term → definition pairs) per lecture | Prompt engineering section covers exact system prompt additions needed; test coverage covers section presence |
</phase_requirements>

---

## Summary

Phase 3 is a prompt engineering and testing task, not a new-module task. The entire implementation is a targeted change to one function — `buildMessages()` in `processor/prompt.js` — plus new unit tests for the expanded prompt contract. The processing pipeline (manifest, orchestrator, markdown renderer) requires no changes. The `--force` flag that enables full-batch regeneration is already implemented and tested.

The core technical challenge is writing a system prompt that reliably produces three new H2 sections — `## Practice Questions` and `## Flashcards` — appended after the existing three sections, without disrupting the existing content structure. The existing prompt already uses a "Output ONLY" pattern to prevent preamble; the new sections extend that same constraint. The secondary challenge is prompt quality: questions must be transcript-grounded (not generic PMBOK recall), which requires careful prompt language and a human pilot review step before full-batch regeneration.

The pilot run mechanic is the only open architectural decision: whether to use a dedicated `pilot/` input folder with 5 copies of real transcripts, or to run the real input folder with only 5 transcripts placed there before adding the rest. A dedicated folder is cleaner and less error-prone.

**Primary recommendation:** Extend `buildMessages()` system prompt with exact section format instructions for `## Practice Questions` and `## Flashcards`, add corresponding unit tests to `prompt.test.js`, and run pilot with a dedicated `pilot-input/` folder containing 5 representative transcripts before full-batch `--force` regeneration.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | Already installed (Phase 2) | Anthropic API client | Already in use — no new dependency |
| `node:test` | Built-in (Node >= 18) | Unit test runner | Already in use — zero install, zero config |
| `node:assert/strict` | Built-in | Assertions in tests | Already in use |

### Supporting

No new libraries needed. All work is within existing modules and built-in Node.js capabilities.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending single system prompt | Second API call for questions/flashcards | Second call = 2–3x token cost at 100+ lectures — locked out by PROC-05 |
| `node:test` | Jest | Jest requires install and config; no reason to switch mid-project |

**Installation:** No new packages needed.

---

## Architecture Patterns

### What Changes vs. What Stays

```
processor/
├── prompt.js          ← ONLY FILE THAT CHANGES
│                        Add ## Practice Questions + ## Flashcards to system prompt
├── processor.js       No changes — --force already implemented
├── manifest.js        No changes
├── markdown.js        No changes — transparent to section count
└── tests/
    └── prompt.test.js ← ADD NEW TESTS for new section instructions
```

### Pattern 1: Extending the Unified System Prompt

**What:** The current `buildMessages()` system prompt instructs Claude to produce notes with per-topic H2 sections. Phase 3 appends two additional fixed-format sections at the end of the output specification.

**When to use:** The existing prompt already uses a format-enforcement pattern ("Output ONLY the study notes..."). The new sections extend that same format contract. The output-only instruction at the top must be updated to acknowledge all five section types will appear.

**Key structural insight from reading `prompt.js`:** The current prompt does NOT enumerate the three output sections by name in the opening instruction — it says "Output ONLY the study notes" and then describes the H2 structure. This means adding Practice Questions and Flashcards does NOT require rewriting the top instruction; it means appending new explicit sections with format specs after the existing style rules. The opening instruction remains valid.

**Example prompt structure:**

```
[existing system prompt content — unchanged]

## Practice Questions

At the end of your notes, add a ## Practice Questions section with exactly 3 scenario-based PMP questions.

Rules for practice questions:
- Each question MUST be grounded in a specific concept, term, or scenario from THIS lecture's transcript
- The scenario setup must reference something the instructor described in this lecture — a process, constraint, or situation
- Do NOT write generic PMBOK recall questions (e.g., "What are the five process groups?")
- Format:

Q1. [scenario setup referencing this lecture's content]
A) [option]
B) [option]
C) [option]
D) [option]

**Answer: X** — [Why X is correct. Why A is wrong. Why B is wrong. Why C is wrong. Why D is wrong — whichever apply.]

Q2. ...
Q3. ...

## Flashcards

After the practice questions, add a ## Flashcards section with 5–8 term/definition pairs.

Rules for flashcards:
- Prioritize PMP-specific terms, PMI definitions, and concepts the instructor explicitly named or defined in this lecture
- Definitions must be 1–2 sentences: precise enough to quiz from, not a paragraph
- Format (bullet list):

- **Term** — definition sentence(s).
```

### Anti-Patterns to Avoid

- **Putting new section instructions BEFORE style rules:** The LLM needs the note-taking style rules first, then the fixed-format append sections. Order matters — format-deviation risk increases if the append sections interrupt the main structure description.
- **Enumerating all five sections in the opening "Output ONLY" line:** This creates a fragile instruction that breaks if sections are reordered. The existing opening is section-type agnostic; keep it that way.
- **Using max_tokens: 4096 without adjustment:** Adding two new content sections increases output length. 3 practice questions with full eliminator explanations (~400 tokens) plus 5–8 flashcards (~150 tokens) adds ~550 tokens per lecture. With some lectures already near 4096, this may cause truncation. Increase to 8192.
- **Forgetting to update the `prompt.test.js` tests:** The existing tests check for "Output ONLY" and specific structural markers. New tests must verify `## Practice Questions` and `## Flashcards` appear in the system prompt instructions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pilot subset processing | Custom subset flag in processor.js | Dedicated `pilot-input/` folder with 5 copied transcripts | `processAll()` already takes any input dir; no code change needed |
| Question validation | Output parser that checks question format | Human review in pilot step | Format compliance is a prompt quality problem, not a code problem at this scale |
| Flashcard extraction | Post-process API text to extract terms | Let the API output the section directly | API already outputs structured markdown; parsing adds complexity without benefit |

**Key insight:** This phase's work is almost entirely in the prompt string. Resist the urge to add code to validate or parse the AI output — the correct tool is better prompt instructions and a human pilot review.

---

## Common Pitfalls

### Pitfall 1: Token Budget Truncation

**What goes wrong:** `max_tokens: 4096` is the current limit in `processor.js` (line 75). With expanded output (notes + 3 questions + up to 8 flashcards), longer lectures may hit this ceiling, causing truncated flashcard sections or cut-off answers.

**Why it happens:** Adding ~550 tokens of new content per lecture while keeping the same ceiling.

**How to avoid:** Increase `max_tokens` to 8192 in `processor.js`. The Anthropic API supports this on Claude claude-sonnet-4-6. This is a one-line change in `processor.js` even though `processor.js` "requires no changes" otherwise — this is the exception.

**Warning signs:** Markdown files where `## Flashcards` section is missing or cut off mid-list.

### Pitfall 2: Generic PMBOK Questions Despite Instructions

**What goes wrong:** The LLM produces recall questions ("What does PMI define as a project?") instead of transcript-grounded scenario questions ("In this lecture, the instructor described a situation where...").

**Why it happens:** The LLM has strong priors about PMP questions from training. Weak prompt language ("use the lecture content") is overridden by these priors.

**How to avoid:** Use explicit negative constraints in the prompt: "Do NOT write questions that test PMBOK recall or could be answered without reading this specific transcript." Add a positive grounding instruction: "The scenario setup must name a specific thing from this transcript — a term the instructor defined, an example they gave, or a constraint they described."

**Warning signs:** Questions that would work identically on a different lecture. Pilot review catches this.

### Pitfall 3: Breaking Existing Test Assertions

**What goes wrong:** The existing `prompt.test.js` test at line 71 checks `system.includes('Output ONLY')`. If the opening instruction is rewritten to enumerate all five sections, this test may still pass but future intent is muddied. More critically, if the opening line changes structure, tests that check specific phrases may break.

**Why it happens:** Expanding the system prompt requires careful preservation of existing text patterns the tests assert on.

**How to avoid:** Append new section instructions at the END of the system prompt string, after all existing content. Do not rewrite or restructure the existing prompt text — only add to it.

**Warning signs:** Test failures on "Output ONLY", "Exam Tip", or "Bottom line" checks.

### Pitfall 4: Pilot Run Using Wrong Manifest

**What goes wrong:** Running the pilot on `pilot-input/` but the manifest path defaults to `processor/processing-state.json`, which is shared with the real batch. After the pilot, the main batch run may behave unexpectedly.

**Why it happens:** `processAll()` uses a default manifest path if none is provided — but the CLI entry point doesn't accept a `--manifest` flag.

**How to avoid:** Either (a) use a separate working directory for pilot runs so the default manifest path is isolated, or (b) document that pilot runs should use a temp directory and the real `processing-state.json` should be backed up first. Option (a) is cleaner. Since `processAll()` accepts `manifestPath` and `outputDir` parameters, an alternative is a small pilot runner script.

**Warning signs:** Real manifest entries being overwritten by pilot run results.

### Pitfall 5: Section Order Deviation

**What goes wrong:** LLM outputs `## Flashcards` before `## Practice Questions`, or inserts them between the existing sections.

**Why it happens:** Without explicit ordering constraints, the LLM may reorder freely.

**How to avoid:** The system prompt must explicitly state the section order: "Output all five sections in this exact order: 1) your topic-based H2 notes sections, 2) ## Practice Questions, 3) ## Flashcards."

---

## Code Examples

### Verified pattern: Existing prompt structure to extend

Current `buildMessages()` in `processor/prompt.js` ends at line 60 with:

```javascript
// Source: processor/prompt.js (read directly)
const system = `You are a study assistant...

Output ONLY the study notes. Start with a # H1 title for the lecture. No preamble, no meta-commentary.

## Structure
[...existing structure rules...]

## Style Rules
- Cover EVERY concept in the transcript...
- Every ## section gets its own **Bottom line:** — do not batch them at the end`;
```

The extension appends two new top-level sections to this template literal:

```javascript
// Phase 3 addition — appended after existing Style Rules block
`...

## Practice Questions

After your topic notes, output a ## Practice Questions section with exactly 3 scenario-based PMP questions. Rules:
- Questions MUST reference a specific concept, term, example, or scenario from THIS lecture's transcript
- Do NOT write generic PMBOK recall questions or questions answerable without this specific lecture
- Format exactly as shown:

Q1. [scenario grounded in this lecture]
A) [option]
B) [option]
C) [option]
D) [option]

**Answer: X** — [Why X is correct. Why each wrong option is wrong.]

Q2. [scenario]
...
Q3. [scenario]
...

## Flashcards

After the practice questions, output a ## Flashcards section with 5–8 term/definition pairs. Rules:
- Prioritize PMP-specific terms, PMI definitions, and concepts the instructor explicitly named in this lecture
- Each definition: 1–2 sentences, precise enough to quiz from
- Format as a bullet list:

- **Term** — definition.`
```

### Verified pattern: max_tokens change in processor.js

```javascript
// processor.js line 73–78 — current
const response = await client.messages.create({
  model: process.env.PMI_MODEL || 'claude-sonnet-4-6',
  max_tokens: 4096,   // ← change to 8192
  system: system,
  messages: messages
});
```

### Verified pattern: New test assertions for prompt.test.js

```javascript
// Follows existing node:test + assert/strict pattern (prompt.test.js)
it('system prompt includes ## Practice Questions section instruction', () => {
  const { system } = buildMessages(sampleTranscript);
  assert.ok(system.includes('## Practice Questions'), 'System prompt should contain ## Practice Questions instruction');
});

it('system prompt includes ## Flashcards section instruction', () => {
  const { system } = buildMessages(sampleTranscript);
  assert.ok(system.includes('## Flashcards'), 'System prompt should contain ## Flashcards instruction');
});

it('system prompt instructs to ground questions in lecture transcript', () => {
  const { system } = buildMessages(sampleTranscript);
  assert.ok(system.includes('transcript'), 'System prompt should reference grounding questions in transcript');
});

it('system prompt instructs to explain why wrong answers are wrong', () => {
  const { system } = buildMessages(sampleTranscript);
  assert.ok(system.includes('wrong'), 'System prompt should instruct to explain wrong answers');
});
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node >= 18) |
| Config file | None — no config required |
| Quick run command | `node --test processor/tests/prompt.test.js` |
| Full suite command | `node --test processor/tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROC-02 | `buildMessages()` system prompt contains `## Practice Questions` instruction | unit | `node --test processor/tests/prompt.test.js` | ❌ Wave 0 — new tests to add |
| PROC-02 | System prompt instructs to ground questions in THIS lecture's transcript | unit | `node --test processor/tests/prompt.test.js` | ❌ Wave 0 |
| PROC-02 | System prompt instructs to explain why wrong answers are wrong (eliminator style) | unit | `node --test processor/tests/prompt.test.js` | ❌ Wave 0 |
| PROC-03 | `buildMessages()` system prompt contains `## Flashcards` instruction | unit | `node --test processor/tests/prompt.test.js` | ❌ Wave 0 |
| PROC-03 | System prompt instructs to format flashcards as bullet list with `**Term** — definition` | unit | `node --test processor/tests/prompt.test.js` | ❌ Wave 0 |
| PROC-02/03 | Existing tests still pass after prompt changes (no regressions) | unit | `node --test processor/tests/prompt.test.js` | ✅ Exists |
| PROC-02/03 | `processAll()` with mock client produces `.md` files (pipeline still works) | integration | `node --test processor/tests/processor.test.js` | ✅ Exists |

**Manual-only validation:**
- Quality gate: 3 practice questions from pilot lectures are scenario-grounded (not generic PMBOK) — requires human review of pilot output
- `processing-state.json` shows 100% completion after full batch — verified by human inspection of manifest after run

### Sampling Rate

- **Per task commit:** `node --test processor/tests/prompt.test.js`
- **Per wave merge:** `node --test processor/tests/`
- **Phase gate:** Full suite green + pilot human review before full `--force` batch run

### Wave 0 Gaps

- [ ] `processor/tests/prompt.test.js` — add 5 new test cases for Practice Questions and Flashcards instructions (file exists; tests must be added to it)
- [ ] No new files needed — existing test infrastructure covers all automated checks

---

## Open Questions

1. **max_tokens ceiling**
   - What we know: Current `processor.js` uses `max_tokens: 4096`. Adding ~550 tokens of new content per lecture risks truncation on longer lectures.
   - What's unclear: The actual maximum output length for the longest transcripts in the course.
   - Recommendation: Increase to 8192 as a one-line change in `processor.js`. This is outside the stated scope ("no changes to processor.js") but is a necessary exception — flag this explicitly in the plan.

2. **Pilot run manifest isolation**
   - What we know: `processAll()` accepts `outputDir` and `manifestPath` as parameters but the CLI doesn't expose `--manifest`. A pilot using the CLI with the default manifest path will write pilot results into the real `processing-state.json`.
   - What's unclear: Whether the plan should add a `--manifest` CLI flag or use a simpler workaround.
   - Recommendation: Use a dedicated `pilot-input/` directory and run the pilot from a clean working directory (or temporarily rename the real manifest), OR add a `--manifest` CLI flag as a small focused addition to `processor.js`. The latter is cleaner and reusable.

---

## Sources

### Primary (HIGH confidence)

- `processor/prompt.js` — read directly; `buildMessages()` implementation, system prompt structure, extension point
- `processor/processor.js` — read directly; `--force` flag implementation, `max_tokens` value, `processAll()` signature
- `processor/markdown.js` — read directly; `buildMarkdown()` contract — transparent to section content
- `processor/manifest.js` — read directly; manifest schema and `shouldSkip()` logic
- `processor/tests/prompt.test.js` — read directly; existing test patterns and assertions to preserve
- `processor/tests/processor.test.js` — read directly; integration test pattern with mock client
- `.planning/phases/03-ai-content-generation/03-CONTEXT.md` — read directly; locked decisions
- `.planning/REQUIREMENTS.md` — read directly; PROC-02 and PROC-03 acceptance criteria
- `.planning/STATE.md` — read directly; locked architectural decisions (single API call, section order)

### Secondary (MEDIUM confidence)

- Anthropic Claude claude-sonnet-4-6 context/output limits — `max_tokens: 8192` is within the model's supported range based on current knowledge

### Tertiary (LOW confidence)

- None — all findings are grounded in the actual codebase read directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read directly from codebase
- Architecture: HIGH — change is additive to a single function with clear extension point
- Pitfalls: HIGH — identified from actual code (token limit, test assertions, manifest path) not speculation
- Prompt quality: MEDIUM — LLM behavior with grounding instructions requires empirical pilot validation

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain — Anthropic SDK and prompt engineering patterns don't change rapidly)
