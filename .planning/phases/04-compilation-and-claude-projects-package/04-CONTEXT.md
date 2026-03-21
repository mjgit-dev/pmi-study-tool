# Phase 4: Compilation and Claude Projects Package - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Run a single compiler command (`node compiler.js`) that reads processed per-lecture markdown files from `processor/output/` and assembles an upload-ready Claude Projects package in `claude-package/` — containing numbered section notes files, numbered section quiz files, a compiled handbook, and a system prompt. Phase 4 does not modify the processing pipeline or generate any new AI content.

</domain>

<decisions>
## Implementation Decisions

### Section file structure
- **Two files per section**: a notes file and a quiz file
  - Notes file: Key Concepts + Summary + Examples
  - Quiz file: Practice Questions + Flashcards
- **Naming**: `01-section-name-notes.md` / `01-section-name-quiz.md` — numbered prefix preserves upload order (Claude Projects shows files alphabetically); slug derived from section name
- **Header**: `# [Section Name] — Notes` and `# [Section Name] — Quiz` (H1 at top of each file)
- **Lecture ordering within section**: sorted by lecture order from filenames (preserves Udemy course sequence)
- **Grouping key**: `sectionName` field from each processed markdown file's YAML frontmatter

### Handbook design
- **Contents**: Table of contents with anchor links + all Key Concepts and Summaries from every lecture — no Examples, Practice Questions, or Flashcards
- **Organization**: By section (H2), with lectures nested under each section (H3) — mirrors Udemy course structure
- **ToC format**: `- [Section Name](#anchor)` with nested `  - [Lecture Title](#anchor)` entries
- **Filename**: `handbook.md` in `claude-package/`
- **Purpose**: Single searchable reference doc; section files handle quizzing

### Claude Projects system prompt
- **Study modes enabled**: Quiz me, Explain a concept, Flashcard drill, Weak area focus
  - Quiz me: Claude picks a practice question from the uploaded files and walks through it with full explanation
  - Explain a concept: User asks about a term/concept; Claude retrieves and explains from uploaded notes
  - Flashcard drill: Claude presents term prompts one at a time for rapid review
  - Weak area focus: User names a topic/domain; Claude concentrates questions there
- **Grounding rule (strict)**: Claude must cite specific lectures and refuse to answer from general PMP knowledge not in the uploaded files — all answers grounded in the uploaded content
- **Filename**: `CLAUDE_INSTRUCTIONS.md` in `claude-package/`

### Compiler CLI
- **Invocation**: `node compiler.js` — reads from `processor/output/` by default, writes to `claude-package/` at project root
- **No explicit path arguments** — consistent with `processor.js` pattern (fixed input/output locations)
- **Flags**:
  - `--dry-run` — shows what would be compiled (sections found, lecture count per section, output file list) without writing anything
- **Overwrite behavior**: Claude's Discretion — decide whether to always overwrite or error on existing output
- **Progress output**: Claude's Discretion — same style as processor.js (`[ 1/8] Compiling: Project Fundamentals...`) or simpler summary

### Claude's Discretion
- Exact overwrite/error behavior when `claude-package/` already exists
- Progress reporting style during compilation
- Exact anchor format in handbook ToC (GitHub-flavored markdown slugs vs custom)
- How to handle edge cases: lectures with missing `sectionName`, sections with only 1 lecture, very short lectures

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — OUTP-01 (section files), OUTP-02 (handbook), OUTP-03 (system prompt) define acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 4 — Success criteria (4 items) that must all be TRUE for phase completion

### Project constraints
- `.planning/PROJECT.md` — Core value statement, constraints (markdown output, Claude Projects target, no custom UI)
- `.planning/STATE.md` §Decisions — Section-scoped output decision ("one file per course section, 8-12 files"), output structure decisions from prior phases

### Input contract (what the compiler reads)
- `.planning/phases/02-processing-pipeline/02-CONTEXT.md` — Output filename convention (`lectureTitle.md`), YAML frontmatter fields (`lectureTitle`, `sectionName`, `processedAt`), output directory location (`processor/output/`)
- `.planning/phases/03-ai-content-generation/03-CONTEXT.md` — Section order in per-lecture files (Key Concepts → Summary → Examples → Practice Questions → Flashcards), H2 heading names for each section

### Existing implementation (MUST read before implementing)
- `processor/processor.js` — CLI pattern, flag handling, progress reporting style to mirror in compiler.js
- `processor/output/` — Read 2-3 actual output files to understand the exact markdown structure the compiler will parse

No external specs beyond the above — requirements fully captured in decisions above and referenced planning docs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `processor/processor.js` — CLI entry point pattern (CommonJS, `require.main === module` guard, `--dry-run`/`--force` flag parsing via `process.argv`) — mirror this pattern in `compiler.js`
- `processor/manifest.js` — File I/O patterns (reading JSON, writing JSON, path construction) — reusable patterns for reading per-lecture markdown files
- `processor/markdown.js` `buildMarkdown()` — Shows how frontmatter is prepended; compiler will parse this frontmatter to extract `sectionName` grouping key

### Established Patterns
- CommonJS (`module.exports` / `require`) — no ES module syntax anywhere; maintain throughout compiler
- `node:test` for unit tests — no Jest; use built-in test runner
- Fixed input/output paths relative to script location — no path arguments in CLI invocation
- Progress output: `[ N/M] Verb: thing... ✓ done` pattern from processor.js

### Integration Points
- **Input**: `processor/output/*.md` — per-lecture markdown files with YAML frontmatter; `sectionName` is the grouping key
- **Output**: `claude-package/` at project root — new directory, does not touch processor output
- **Section ordering**: Inferred from filename sort order within each section group (filenames come from lecture titles; assume Udemy order is reflected in extraction order)

</code_context>

<specifics>
## Specific Ideas

- The `claude-package/` folder is the entire deliverable — user uploads its contents to Claude Projects directly
- Numbered section file prefix (01-, 02-...) is important because Claude Projects displays files alphabetically — the numbers ensure notes/quiz pairs stay in course order
- The strict grounding rule in the system prompt is intentional: the whole point is to study *this course*, not get generic PMP advice

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-compilation-and-claude-projects-package*
*Context gathered: 2026-03-21*
