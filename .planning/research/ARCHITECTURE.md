# Architecture Research

**Domain:** CLI study-content pipeline — v1.1 integration (Node.js, Anthropic API)
**Researched:** 2026-03-21
**Confidence:** HIGH — based on direct codebase analysis

## Standard Architecture

### System Overview (v1.0 baseline)

```
transcripts/                 raw JSON from extractor bookmarklet
    |
    v
processor/processor.js       batch loop: manifest check → API call → write .md
    |-- prompt.js             builds system + user message per transcript
    |-- markdown.js           wraps API response with YAML frontmatter
    |-- manifest.js           reads/writes processing-state.json
    |
    v
processor/output/            per-lecture .md files (YAML frontmatter + body)
    |
    v
compiler.js                  reads output/, groups by section, writes claude-package/
    |-- frontmatter.js        parses YAML frontmatter
    |-- sections.js           strips frontmatter, splits notes vs quiz
    |-- grouper.js            groups by sectionName, orders sections by processedAt
    |-- builder.js            assembles per-section .md files + handbook.md
    |-- system-prompt.js      generates static CLAUDE_INSTRUCTIONS.md
    |
    v
claude-package/              upload-ready: NN-section-notes.md, NN-section-quiz.md,
                             handbook.md, CLAUDE_INSTRUCTIONS.md
```

### Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| processor/processor.js | Batch loop: reads .json, skips completed, calls API, saves .md | processor.js |
| processor/prompt.js | Constructs system prompt + user message from transcript object | prompt.js |
| processor/markdown.js | Wraps API text in YAML frontmatter (lectureTitle, sectionName, processedAt) | markdown.js |
| processor/manifest.js | Reads/writes processing-state.json; skip/reprocess logic | manifest.js |
| compiler/frontmatter.js | Parses YAML frontmatter from per-lecture .md files | frontmatter.js |
| compiler/sections.js | Strips frontmatter, splits body at `## Practice Questions` marker | sections.js |
| compiler/grouper.js | Groups lectures by sectionName, orders sections by earliest processedAt | grouper.js |
| compiler/builder.js | Assembles per-section files and handbook.md with TOC | builder.js |
| compiler/system-prompt.js | Generates static CLAUDE_INSTRUCTIONS.md | system-prompt.js |

## Recommended Project Structure (v1.1 additions)

```
pmi-study-tool/
|-- transcripts/                  raw transcript .json files (extractor output)
|-- extractor/                    browser bookmarklet — unchanged
|   |-- bookmarklet.js
|   +-- cleaning.js
|-- processor/
|   |-- processor.js              MODIFY: call cost-estimate before batch loop
|   |-- prompt.js                 MODIFY: add ## ECO Domain + ## Glossary Terms sections
|   |-- markdown.js               MODIFY: write ecoTag to YAML frontmatter
|   |-- manifest.js               unchanged
|   |-- cost-estimate.js          NEW: token estimation + cost display before run
|   +-- output/                   per-lecture .md files
|-- compiler/
|   |-- compiler.js               MODIFY: pass ecoTag through; invoke glossary builder; pass weakAreas
|   |-- frontmatter.js            MODIFY: parse new ecoTag field
|   |-- sections.js               MODIFY: split out ## ECO Domain and ## Glossary Terms sections
|   |-- grouper.js                unchanged
|   |-- builder.js                MODIFY: include ECO tag annotation in section notes files
|   |-- glossary.js               NEW: aggregate + deduplicate glossary terms, return glossary.md
|   +-- system-prompt.js          MODIFY: accept weakAreas param, inject Focus Areas block
+-- claude-package/
    |-- NN-section-notes.md       (ECO domain labels added per lecture heading)
    |-- NN-section-quiz.md        (unchanged)
    |-- glossary.md               NEW
    |-- handbook.md               (unchanged structure)
    +-- CLAUDE_INSTRUCTIONS.md    (updated: weak-area hints if weakAreas provided)
```

### Structure Rationale

- **processor/cost-estimate.js:** Isolated module so token-counting logic is testable without running a real API batch. Called once at the start of processor.js before the loop begins.
- **compiler/glossary.js:** Separate from builder.js because glossary is a cross-section aggregation, not a per-section assembly task. builder.js is responsible for one section at a time; glossary.js works across the full lectures array.
- **compiler/system-prompt.js (modified):** Accepts optional weakAreas argument rather than reading configuration itself. Keeps I/O at the CLI boundary; the function remains pure and testable.

## Architectural Patterns

### Pattern 1: Prompt Section Extension (ECO Tag + Glossary)

**What:** Append new output sections (ECO Domain, Glossary Terms) to the existing system prompt in prompt.js. The API response already uses `##` heading delimiters to separate Notes / Practice Questions / Flashcards. The same split-by-marker pattern in sections.js extends naturally.

**When to use:** When new per-lecture content can be generated within the same API call. This preserves the single-call-per-lecture constraint that minimises cost.

**Trade-offs:** The prompt grows slightly (~200 tokens). The response parser (sections.js) must be updated to split additional `##` sections. The heading text in the prompt instruction must exactly match what the model outputs — specify the heading text explicitly in the prompt to avoid variation.

**Example — sections.js extension:**
```javascript
function splitLectureSections(body) {
  const ecoIdx  = body.indexOf('\n## ECO Domain');
  const qIdx    = body.indexOf('\n## Practice Questions');
  const notes   = body.slice(0, ecoIdx !== -1 ? ecoIdx : qIdx).trim();
  const ecoTag  = ecoIdx !== -1 ? extractEcoTag(body.slice(ecoIdx, qIdx)) : null;
  const quiz    = qIdx !== -1 ? body.slice(qIdx + 1).trim() : '';
  return { notes, ecoTag, quiz };
}
```

### Pattern 2: Frontmatter as Per-Lecture Metadata Carrier

**What:** The existing YAML frontmatter (lectureTitle, sectionName, processedAt) is the structured data handoff between processor and compiler. Adding ecoTag to frontmatter gives compiler access to the tag without re-parsing the body.

**When to use:** For any per-lecture metadata generated at processing time that is needed at compile time for grouping, labelling, or output decisions.

**Trade-offs:** Frontmatter fields must stay in sync between markdown.js (writer) and frontmatter.js (reader). Low risk — both are small, focused modules. The existing parseFrontmatter() handles JSON-quoted values and raw values; ecoTag is a short plain string and needs no special handling.

**Example — markdown.js write:**
```javascript
const frontmatter = [
  '---',
  `lectureTitle: ${JSON.stringify(transcript.lectureTitle)}`,
  `sectionName: ${JSON.stringify(transcript.sectionName)}`,
  `ecoTag: ${JSON.stringify(ecoTag || 'Unknown')}`,
  `processedAt: ${new Date().toISOString()}`,
  '---',
  ''
].join('\n');
```

### Pattern 3: Pre-Run Cost Estimation via Local Heuristic

**What:** Before the batch loop, scan all pending .json files, estimate token counts locally (prompt template size + transcript wordCount * ~1.35), multiply by model pricing, display total and per-lecture breakdown. No additional API calls required.

**When to use:** At the start of every processor run when there are pending transcripts. Shown before any API calls are made so the user can abort.

**Trade-offs:** A heuristic (words * 1.35 tokens) is accurate within ~15%, which is sufficient for a cost preview. Exact token counts would require one API call per file before the batch — that adds cost and latency for a preview that doesn't need to be exact.

**Example — cost-estimate.js heuristic:**
```javascript
function estimateCost(pendingTranscripts, promptTemplateTokens) {
  const INPUT_RATE  = 3.00  / 1_000_000;  // claude-sonnet-4-6 $/input token
  const OUTPUT_RATE = 15.00 / 1_000_000;  // claude-sonnet-4-6 $/output token
  const AVG_OUTPUT  = 2000;               // empirical tokens per lecture response
  let total = 0;
  for (const t of pendingTranscripts) {
    const inputTokens = promptTemplateTokens + Math.ceil((t.wordCount || 0) * 1.35);
    total += (inputTokens * INPUT_RATE) + (AVG_OUTPUT * OUTPUT_RATE);
  }
  return total;
}
```

Note: verify current claude-sonnet-4-6 pricing against https://www.anthropic.com/pricing before hardcoding rates. Rates should be configurable constants, not buried in logic.

### Pattern 4: Glossary as a Cross-Lecture Aggregation Pass

**What:** During compilation, after all lecture bodies are parsed into the lectures[] array, iterate all lectures and collect glossary sections. Deduplicate by term (case-insensitive, first occurrence wins), sort alphabetically, write glossary.md as a standalone reference file.

**When to use:** At compile time, not at processing time — compiler already holds all parsed lecture objects in memory. No additional API calls needed.

**Trade-offs:** Glossary quality depends on what the model extracted per lecture. The same term will appear across multiple lectures. First-occurrence deduplication is simple and sufficient for v1.1. If users later want "most detailed definition wins" logic, that can be added to glossary.js without touching other modules.

### Pattern 5: Weak-Area Hint Injection via CLI Argument

**What:** system-prompt.js receives an optional weakAreas array. When provided, it appends a "Focus Areas" block to the generated CLAUDE_INSTRUCTIONS.md. User supplies topics on the command line when running the compiler: `node compiler.js --weak-areas "risk management,stakeholder engagement"`.

**When to use:** At compile time. Re-running the compiler with different weak areas regenerates CLAUDE_INSTRUCTIONS.md in seconds — no API calls, no reprocessing.

**Trade-offs:** Weak areas are user-specified (manual), not automatically inferred from quiz performance. For v1.1, this is the correct scope. Automatic inference from session performance would require Claude Projects to expose a results API — it does not. Manual is explicit, zero-friction to change, and sufficient for the use case.

## Data Flow

### v1.1 Processing Flow (processor)

```
transcripts/*.json
    |
    v
cost-estimate.js
    counts pending transcripts (not in manifest as 'complete')
    estimates: promptTemplateTokens + transcript.wordCount * 1.35 per file
    displays: "N lectures pending. Estimated cost: $X.XX (~$Y per lecture)"
    |
    v (user confirms or --yes flag bypasses prompt)
    |
    v
processor.js batch loop — per lecture:
    prompt.js.buildMessages(transcript)
        system prompt now includes:
            ## ECO Domain section (output: single label — People | Process | Business Environment)
            ## Glossary Terms section (output: bullet list of term — definition pairs)
    Anthropic API call (unchanged — still 1 call per lecture)
    API response body structure:
        # [Lecture Title H1]         <- notes body
        ## [topic sections...]
        ## ECO Domain                <- NEW
        ## Practice Questions
        ## Flashcards
        ## Glossary Terms            <- NEW
    sections.js.splitLectureSections(body)
        -> { notes, ecoTag, quiz, glossaryRaw }
    markdown.js.buildMarkdown(transcript, apiText, ecoTag)
        -> YAML frontmatter: lectureTitle, sectionName, ecoTag, processedAt
        -> body: full apiText trimmed (notes + ECO Domain + quiz + Glossary Terms sections)
    write processor/output/[lecture].md
    manifest[file].status = 'complete'
```

### v1.1 Compilation Flow (compiler)

```
processor/output/*.md
    |
    v
compiler.js.compileAll():
    for each .md file:
        frontmatter.js.parseFrontmatter()   -> { lectureTitle, sectionName, ecoTag, processedAt }
        sections.js.splitLectureSections()  -> { notes, ecoTag, quiz, glossaryTerms[] }
        lectures[] entry: { filename, lectureTitle, sectionName, ecoTag, notes, quiz, glossaryTerms }
    |
    v
grouper.js (unchanged — groups/orders by sectionName)
    |
    v
builder.js.buildSectionFile()
    notes files: lecture heading now includes ECO domain label
        ## [Lecture Title] `[People]`
    quiz files: unchanged
    |
    v
glossary.js.buildGlossary(lectures)
    collects all glossaryTerms[] arrays across all lectures
    deduplicates by term (case-insensitive, first occurrence wins)
    sorts alphabetically
    returns glossary.md content
    |
    v
system-prompt.js.buildSystemPrompt({ weakAreas })
    if weakAreas provided, appends Focus Areas block
    |
    v
Write claude-package/:
    NN-section-notes.md       (ECO domain labels per lecture heading)
    NN-section-quiz.md        (unchanged)
    glossary.md               NEW
    handbook.md               (unchanged structure)
    CLAUDE_INSTRUCTIONS.md    (updated: Focus Areas block if weakAreas provided)
```

## Integration Points

### New vs. Modified Components

| Component | Status | Change Summary |
|-----------|--------|----------------|
| processor/cost-estimate.js | NEW | Token estimation + cost display before batch loop |
| processor/prompt.js | MODIFY | Add ECO Domain + Glossary Terms sections to system prompt |
| processor/markdown.js | MODIFY | Write ecoTag to YAML frontmatter |
| processor/processor.js | MODIFY | Call cost-estimate before loop; handle confirmation |
| compiler/sections.js | MODIFY | Split ECO Domain and Glossary Terms sections from body |
| compiler/frontmatter.js | MODIFY | Parse new ecoTag frontmatter field |
| compiler/glossary.js | NEW | Aggregate + deduplicate glossary terms across all lectures |
| compiler/builder.js | MODIFY | Include ECO tag label in section notes file lecture headings |
| compiler/system-prompt.js | MODIFY | Accept weakAreas param; inject Focus Areas block |
| compiler.js | MODIFY | Pass ecoTag/glossaryTerms through; invoke glossary.js; parse --weak-areas flag |
| extractor/ | UNCHANGED | No changes needed |
| processor/manifest.js | UNCHANGED | Manifest schema unchanged |
| compiler/grouper.js | UNCHANGED | Grouping logic unaffected |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| processor.js -> cost-estimate.js | Direct require() call | Receives pending file list + resolved input dir |
| prompt.js <-> sections.js | Text protocol: `## ECO Domain` and `## Glossary Terms` markers | Both sides must use the exact same heading strings |
| markdown.js <-> frontmatter.js | YAML frontmatter text | ecoTag field added; both sides update together |
| processor/output/ -> compiler.js | File system (.md files) | Existing contract; ecoTag now in frontmatter |
| compiler.js -> glossary.js | In-memory lectures[] array | Receives full parsed lectures after section grouping |
| compiler.js -> system-prompt.js | Function argument: weakAreas string[] or null | CLI parses --weak-areas flag, passes to buildSystemPrompt() |

### Key Risk: Response Section Parsing Contract

The split-by-heading pattern in sections.js is the most fragile integration point. If the model omits or renames a section heading:
- ecoTag defaults to null — logged as warning, compile continues
- glossaryTerms defaults to [] — glossary.md will have fewer entries
- Neither absence should fail the batch or mark the lecture as failed

The mitigation is graceful degradation: treat missing sections as data gaps, not errors.

## Anti-Patterns

### Anti-Pattern 1: Second API Call for ECO Tagging

**What people do:** Make a separate API call after the main processing call to classify the lecture into an ECO domain.

**Why it's wrong:** Doubles API cost per lecture. With 100+ lectures this adds $5-15 in additional calls with no quality benefit — the primary call has full transcript context and can tag simultaneously.

**Do this instead:** Add an `## ECO Domain` section to the existing prompt. One call, one cost, same context.

### Anti-Pattern 2: Storing Glossary in processor/output/ Only, Never Aggregating

**What people do:** Store glossary extraction per-lecture in the processor output files but never aggregate them at compile time.

**Why it's wrong:** The per-lecture glossary is only useful as a cross-lecture reference document. Scattered across 100+ per-lecture files, it is unsearchable in Claude Projects and provides no study value.

**Do this instead:** Extract per-lecture glossary terms at processing time (stored in the body), then aggregate at compile time into a single glossary.md.

### Anti-Pattern 3: Hard-Coding Weak Areas in system-prompt.js

**What people do:** Edit system-prompt.js source directly to add weak area topics.

**Why it's wrong:** Requires a code edit for a user-configuration concern. The system prompt regenerates at every compile run — weak areas must be user-configurable at runtime, not embedded in source.

**Do this instead:** Pass weakAreas as a parameter to buildSystemPrompt(). Source it from a CLI flag (`--weak-areas`) parsed in compiler.js.

### Anti-Pattern 4: Failing the Batch on Missing ECO or Glossary Sections

**What people do:** Throw an error or mark the manifest entry as 'failed' when the API response is missing the ECO Domain or Glossary Terms section.

**Why it's wrong:** ECO tagging and glossary are enhancements. Their absence from one lecture should not block processing of the remaining 99. The notes, questions, and flashcards are still complete.

**Do this instead:** Return null/empty defaults, emit a console warning, and continue. A lecture with ecoTag: null is fully usable; the glossary simply has fewer entries.

## Suggested Build Order

Dependencies flow from data-structure decisions outward. Build in this sequence:

**Step 1 — Cost Estimation (processor/cost-estimate.js + processor.js modification)**
- No dependencies on other new features
- Immediately verifiable against existing transcripts in processor/output/
- Highest user-visible value before committing to a full course batch

**Step 2 — ECO Domain Tagging (prompt.js + sections.js + markdown.js + frontmatter.js)**
- ECO tag flows through the entire pipeline; establish the data contract before compiler changes
- Validation: process 1-2 test transcripts, confirm ecoTag appears in YAML frontmatter
- sections.js split logic is the critical parser — unit test it in isolation before wiring up

**Step 3 — Glossary Extraction (prompt.js update + glossary.js + compiler.js)**
- Builds on Step 2: sections.js split already extended; glossary section parsing is additive
- glossary.js is a pure aggregation function — highly testable with mock lecture data
- Validation: compile with 2 existing processed lectures, inspect glossary.md output

**Step 4 — Weak-Area Hint Injection (system-prompt.js + compiler.js CLI)**
- No API changes — pure compiler/output concern
- Build last: no dependencies on Steps 1-3, simplest to add
- Validation: run `node compiler.js --weak-areas "risk management"`, inspect CLAUDE_INSTRUCTIONS.md

## Scaling Considerations

| Scale | Architecture Considerations |
|-------|----------------------------|
| 2 lectures (current) | All four features testable at this scale before full batch |
| 100+ lectures (full course) | Cost estimate becomes critical — user needs preview before committing. Glossary dedup across 100+ lectures is in-memory; no performance concern at this scale. |
| Re-runs after partial processing | Manifest skips completed lectures. Cost estimate must count only pending files. Lectures processed before v1.1 changes lack ecoTag in frontmatter — compiler must handle missing ecoTag gracefully (default to 'Unknown'). |

## Sources

- Direct codebase analysis: processor/processor.js, prompt.js, markdown.js, manifest.js
- Direct codebase analysis: compiler.js, compiler/sections.js, frontmatter.js, grouper.js, builder.js, system-prompt.js
- Direct codebase analysis: transcripts/what-is-a-project.json (data shape)
- Direct codebase analysis: processor/processing-state.json (manifest shape)
- .planning/PROJECT.md: v1.1 feature requirements and constraints

---
*Architecture research for: PMI Study Tool v1.1 — ECO domain tagging, glossary extraction, cost estimation, weak-area hints*
*Researched: 2026-03-21*
