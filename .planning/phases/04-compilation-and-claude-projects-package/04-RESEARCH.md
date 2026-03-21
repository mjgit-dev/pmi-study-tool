# Phase 4: Compilation and Claude Projects Package - Research

**Researched:** 2026-03-21
**Domain:** Node.js file orchestration, markdown assembly, YAML frontmatter parsing, Claude Projects system prompt design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Section file structure
- Two files per section: a notes file and a quiz file
  - Notes file: Key Concepts + Summary + Examples
  - Quiz file: Practice Questions + Flashcards
- Naming: `01-section-name-notes.md` / `01-section-name-quiz.md` — numbered prefix preserves upload order (Claude Projects shows files alphabetically); slug derived from section name
- Header: `# [Section Name] — Notes` and `# [Section Name] — Quiz` (H1 at top of each file)
- Lecture ordering within section: sorted by lecture order from filenames (preserves Udemy course sequence)
- Grouping key: `sectionName` field from each processed markdown file's YAML frontmatter

#### Handbook design
- Contents: Table of contents with anchor links + all Key Concepts and Summaries from every lecture — no Examples, Practice Questions, or Flashcards
- Organization: By section (H2), with lectures nested under each section (H3) — mirrors Udemy course structure
- ToC format: `- [Section Name](#anchor)` with nested `  - [Lecture Title](#anchor)` entries
- Filename: `handbook.md` in `claude-package/`
- Purpose: Single searchable reference doc; section files handle quizzing

#### Claude Projects system prompt
- Study modes enabled: Quiz me, Explain a concept, Flashcard drill, Weak area focus
  - Quiz me: Claude picks a practice question from the uploaded files and walks through it with full explanation
  - Explain a concept: User asks about a term/concept; Claude retrieves and explains from uploaded notes
  - Flashcard drill: Claude presents term prompts one at a time for rapid review
  - Weak area focus: User names a topic/domain; Claude concentrates questions there
- Grounding rule (strict): Claude must cite specific lectures and refuse to answer from general PMP knowledge not in the uploaded files — all answers grounded in the uploaded content
- Filename: `CLAUDE_INSTRUCTIONS.md` in `claude-package/`

#### Compiler CLI
- Invocation: `node compiler.js` — reads from `processor/output/` by default, writes to `claude-package/` at project root
- No explicit path arguments — consistent with `processor.js` pattern (fixed input/output locations)
- Flags: `--dry-run` — shows what would be compiled (sections found, lecture count per section, output file list) without writing anything
- Overwrite behavior: Claude's Discretion — decide whether to always overwrite or error on existing output
- Progress output: Claude's Discretion — same style as processor.js (`[ 1/8] Compiling: Project Fundamentals...`) or simpler summary

### Claude's Discretion
- Exact overwrite/error behavior when `claude-package/` already exists
- Progress reporting style during compilation
- Exact anchor format in handbook ToC (GitHub-flavored markdown slugs vs custom)
- How to handle edge cases: lectures with missing `sectionName`, sections with only 1 lecture, very short lectures

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUTP-01 | Processed content is assembled into one markdown file per course section (not per lecture) optimized for Claude Projects ingestion | Compiler reads YAML frontmatter `sectionName` to group lectures; two files per section (notes + quiz); numbered prefix controls Claude Projects sort order |
| OUTP-02 | A compiled handbook is generated as a single reference document with a linked table of contents | Handbook assembles Key Concepts + Summary sections from each lecture into a single file with GitHub-flavored anchor links; H2 sections, H3 lectures |
| OUTP-03 | A Claude Projects system prompt file is generated, instructing Claude how to quiz and assist with PMP study | CLAUDE_INSTRUCTIONS.md defines four study modes and the strict content-grounding rule; written once as a static template by the compiler |
</phase_requirements>

---

## Summary

Phase 4 is a pure file-assembly operation. The compiler reads per-lecture markdown files from `processor/output/`, parses their YAML frontmatter to group them by section, then writes a structured `claude-package/` directory containing section notes files, section quiz files, a handbook, and a system prompt. No API calls, no new content generation.

The technical work falls into three areas: (1) YAML frontmatter parsing from the per-lecture `.md` files, (2) markdown section extraction using H2 heading patterns, and (3) GitHub-flavored markdown anchor generation for the handbook table of contents. All three are straightforward pure-function transformations over strings and arrays. The Node.js standard library (`node:fs`, `node:path`) handles all I/O.

The project's established patterns constrain most implementation choices: CommonJS modules, `node:test` for testing, `require.main === module` CLI guard, and `[ N/M] Verb: thing...` progress output. The compiler is a new top-level script (`compiler.js` at project root) that mirrors `processor.js` structurally but contains no async code — all compilation is synchronous.

**Primary recommendation:** Build `compiler.js` as a synchronous, modular script with one pure function per concern (parse frontmatter, extract sections, group by section, build section files, build handbook, build system prompt). Tests cover each pure function independently using `node:test`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:fs | built-in | Read input files, write output files | No dependency; all I/O is local filesystem |
| node:path | built-in | Path construction, filename derivation | No dependency; cross-platform path handling |
| node:test | built-in (Node >= 18) | Unit tests | Already established in this project |
| node:assert/strict | built-in | Test assertions | Already established in this project |

### No External Dependencies Needed
The compiler requires zero npm packages. All operations are:
- File reading/writing: `node:fs`
- Path manipulation: `node:path`
- String parsing: native JavaScript string methods
- YAML frontmatter parsing: hand-written (the format is simple and fixed)

**Installation:** None required — zero new dependencies.

**Version verification:** Node.js >= 18 required (for `node:test`). Already satisfied by the existing project.

---

## Architecture Patterns

### Recommended Project Structure
```
compiler.js              # CLI entry point at project root (mirrors processor/processor.js)
compiler/
├── frontmatter.js       # Parse YAML frontmatter from .md file string
├── sections.js          # Extract named H2 sections from markdown body
├── grouper.js           # Group lectures by sectionName, sort within section
├── builder.js           # Build section notes/quiz files and handbook content
└── tests/
    ├── frontmatter.test.js
    ├── sections.test.js
    ├── grouper.test.js
    └── builder.test.js
claude-package/          # Compiler output (created by compiler.js, NOT committed)
```

The planner may choose to keep all logic in `compiler.js` itself or split into modules under `compiler/`. Given the existing pattern where `processor.js` delegates to `manifest.js`, `prompt.js`, `markdown.js`, splitting is preferred — it makes each concern independently testable.

### Pattern 1: YAML Frontmatter Parsing
**What:** Extract `lectureTitle` and `sectionName` from the `---` delimited frontmatter block at the top of each `.md` file.
**When to use:** Applied to every file in `processor/output/` before grouping.

The frontmatter format is fixed and simple (three fields, JSON-quoted strings). No YAML library needed.

```javascript
// Source: observation of processor/markdown.js output format
// Frontmatter format produced by buildMarkdown():
// ---
// lectureTitle: "What is a Project"
// sectionName: "Introduction to Project Management"
// processedAt: 2026-03-20T23:16:22.127Z
// ---

function parseFrontmatter(fileContent) {
  // Split on --- delimiters
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const result = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();
    // Values are JSON-quoted strings — parse with JSON.parse
    result[key] = rawValue.startsWith('"') ? JSON.parse(rawValue) : rawValue;
  }
  return result;
}
```

**Confidence:** HIGH — format is exactly defined by `markdown.js` in this codebase.

### Pattern 2: Section Extraction from Markdown Body
**What:** Extract named content blocks (Key Concepts, Summary, Examples, Practice Questions, Flashcards) from the markdown body after the frontmatter.
**When to use:** Applied to every per-lecture file to split notes content from quiz content.

The H2 headings (`## Key Concepts`, `## Summary`, etc.) are the delimiters. Extract by finding `## ` lines and capturing all text until the next `## ` line or end of file.

```javascript
// Source: observation of processor/output/*.md files
// H2 headings in output files: ## Key Concepts, ## Summary, ## Examples,
//                               ## Practice Questions, ## Flashcards
// (Note: actual files use varied H2 titles e.g. "## Definition of a Project"
//  — the NOTES sections are sub-concepts; ## Practice Questions and ## Flashcards
//  are the stable delimiters)

function extractSectionByHeading(body, headingText) {
  // Match ## HeadingText and capture content until next ## or end
  const pattern = new RegExp(
    `## ${escapeRegex(headingText)}[\\s\\S]*?(?=\\n## |$)`,
    'g'
  );
  const match = body.match(pattern);
  return match ? match[0].trim() : '';
}
```

**IMPORTANT CLARIFICATION from reading actual output files:** The per-lecture files do NOT use `## Key Concepts` as a top-level heading for all concepts. Instead, each concept has its own H2 heading (e.g., `## Definition of a Project`, `## Temporary Nature of Projects`). The `## Practice Questions` and `## Flashcards` headings ARE stable delimiters at the bottom of each file.

**Revised approach for notes vs quiz split:** Split the file at `## Practice Questions` — everything before that line goes into the notes file, everything from `## Practice Questions` onward goes into the quiz file.

```javascript
// Actual reliable split point is ## Practice Questions
function splitNotesAndQuiz(body) {
  const splitIdx = body.indexOf('\n## Practice Questions');
  if (splitIdx === -1) {
    return { notes: body.trim(), quiz: '' };
  }
  return {
    notes: body.slice(0, splitIdx).trim(),
    quiz: body.slice(splitIdx + 1).trim()
  };
}
```

**Confidence:** HIGH — verified by reading actual output files in `processor/output/`.

### Pattern 3: Section Grouping and Sort Order
**What:** Group lectures by `sectionName`, preserve Udemy course order within each section.
**When to use:** Applied to the full array of parsed lecture objects.

Filenames in `processor/output/` are derived from lecture titles (e.g., `what-is-a-project.md`, `project-life-cycle.md`). `fs.readdirSync().sort()` returns them in alphabetical order, which may not match Udemy course order. The correct approach is to sort by the filesystem modification time or rely on the `processedAt` timestamp from frontmatter — however, `processedAt` reflects API call order (lectures are processed sequentially in extraction order), so it IS a proxy for Udemy course order.

**Recommended:** Sort within each section group by `processedAt` timestamp from frontmatter. This preserves the original extraction/processing order which mirrors the Udemy course sequence.

```javascript
function groupBySectionName(lectures) {
  // lectures: [{ filename, lectureTitle, sectionName, processedAt, body }]
  const groups = new Map();
  for (const lecture of lectures) {
    const key = lecture.sectionName || '__unknown__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lecture);
  }
  // Sort within each section by processedAt (ISO string sort = chronological)
  for (const [, group] of groups) {
    group.sort((a, b) => a.processedAt.localeCompare(b.processedAt));
  }
  return groups;
}
```

**Confidence:** HIGH — processedAt is in the frontmatter, ISO strings sort chronologically.

### Pattern 4: Section Numbering and Slug Generation
**What:** Assign `01-`, `02-`... prefixes and derive slugs from section names for filenames.
**When to use:** When writing section notes/quiz files.

Section order in the output should match Udemy course order. The first section encountered (by its earliest `processedAt` lecture) defines its position number.

```javascript
function toSlug(sectionName) {
  return sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Example: "Introduction to Project Management" -> "introduction-to-project-management"
// File: "01-introduction-to-project-management-notes.md"
```

**Confidence:** HIGH — standard slug pattern, matches CONTEXT.md spec.

### Pattern 5: Handbook ToC Anchors (GitHub-Flavored Markdown)
**What:** Generate anchor links for the handbook table of contents.
**When to use:** When building the ToC and H2/H3 headings in `handbook.md`.

GitHub-flavored markdown (GFM) anchor generation rules:
1. Lowercase all characters
2. Replace spaces with hyphens
3. Remove any character that is not alphanumeric, space, or hyphen

```javascript
function toGfmAnchor(headingText) {
  return headingText
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars except hyphens
    .replace(/\s+/g, '-')        // spaces to hyphens
    .replace(/-+/g, '-');        // collapse multiple hyphens
}

// ToC entry: `  - [What is a Project](#what-is-a-project)`
// Heading:   `### What is a Project`
```

Claude Projects renders markdown files; GFM anchors are the correct standard for anchor links between headings and ToC entries in a single file.

**Confidence:** MEDIUM — GFM anchor spec is well-documented; Claude Projects markdown rendering behavior for in-file anchor links is not explicitly documented but follows the same convention as GitHub and most markdown renderers.

### Pattern 6: CLI Structure (mirrors processor.js)
**What:** CLI entry point with `require.main === module` guard, flag parsing, fixed paths.
**When to use:** `compiler.js` top-level structure.

```javascript
// Source: processor/processor.js — established project pattern
'use strict';

const fs = require('node:fs');
const path = require('node:path');
// ... require compiler modules

const INPUT_DIR = path.join(__dirname, 'processor', 'output');
const OUTPUT_DIR = path.join(__dirname, 'claude-package');

function compileAll(inputDir, outputDir, flags) {
  // synchronous — no API calls
  // returns { sections, lectures, files }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const flags = { dryRun: args.includes('--dry-run') };

  if (!fs.existsSync(INPUT_DIR)) {
    console.error('Input directory not found: ' + INPUT_DIR);
    process.exit(1);
  }

  compileAll(INPUT_DIR, OUTPUT_DIR, flags);
}

module.exports = { compileAll };
```

**Confidence:** HIGH — directly mirrors the existing `processor.js` pattern in this codebase.

### Anti-Patterns to Avoid
- **Parsing YAML with a regex that assumes value order:** Frontmatter field order is fixed by `buildMarkdown()`, but parse by key name, not position.
- **Sorting lectures alphabetically by filename:** Filenames are slugified lecture titles — alphabetical sort does NOT preserve Udemy course order. Use `processedAt`.
- **Using `---` as a section separator inside the notes body:** The `---` horizontal rule is used between lecture sections in the output files — do NOT mistake it for a frontmatter delimiter when parsing the body.
- **Building custom YAML parser that handles YAML arrays/objects:** Frontmatter only has three scalar fields. Parse only what exists; reject any attempt to generalize.
- **Async I/O for compilation:** This is synchronous file assembly. `fs.readFileSync` / `fs.writeFileSync` is correct — no promises needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | A general YAML parser | Direct string parsing of the known three-field format | The format is fully controlled and fixed; a general parser adds a dependency for zero benefit |
| Markdown rendering | HTML generation | Write raw markdown strings | Claude Projects consumes `.md` files directly — no HTML rendering step |
| Slug generation | A unicode-aware slugifier | Simple lowercase + replace regex | Content is English lecture titles with no special characters in practice |

**Key insight:** This phase is pure string transformation with no external I/O beyond the local filesystem. Every "library" suggestion adds complexity with no payoff.

---

## Common Pitfalls

### Pitfall 1: Horizontal Rule (`---`) Mistaken for Frontmatter Delimiter
**What goes wrong:** The compiler reads `---` as the start or end of YAML frontmatter, but `---` also appears as a horizontal rule between concept sections in the body.
**Why it happens:** `buildMarkdown()` uses `---` as both the frontmatter delimiter AND the body uses `---` as a separator between H2 sections (as seen in actual output files).
**How to avoid:** Parse frontmatter by matching the FIRST `---\n...\n---\n` block only (anchored to start of file). After that, treat `---` in the body as horizontal rules.
**Warning signs:** `sectionName` parsing returns garbage or `undefined`.

### Pitfall 2: Section Order Not Matching Udemy Course Order
**What goes wrong:** Sections appear in alphabetical order in `claude-package/` instead of Udemy course order.
**Why it happens:** `fs.readdirSync().sort()` gives alphabetical order; Map insertion order gives processing order; neither is guaranteed Udemy order.
**How to avoid:** Derive section order from the earliest `processedAt` timestamp among lectures in each section. The first section lectured in the course has the earliest `processedAt`.
**Warning signs:** "Introduction to Project Management" numbered 03 because "I" sorts after other section names.

### Pitfall 3: Missing `## Practice Questions` Causes Empty Quiz Files
**What goes wrong:** A lecture file is missing the `## Practice Questions` heading (e.g., a very short lecture or a failed partial generation), and the quiz file for that section is empty or malformed.
**Why it happens:** Phase 3 generation could theoretically produce a file without the section if the API response was truncated.
**How to avoid:** When splitting notes/quiz, check that `## Practice Questions` exists before splitting. If missing, log a warning and put entire body in notes; quiz contribution is empty string.
**Warning signs:** Quiz files that are very short or contain only a header.

### Pitfall 4: Duplicate Anchor IDs in Handbook ToC
**What goes wrong:** Two lectures with the same title (e.g., "Introduction") in different sections generate identical GFM anchors, breaking ToC navigation.
**Why it happens:** GFM anchor generation is purely text-based; duplicate headings in the same file produce duplicate anchors (most renderers append `-1`, `-2` for duplicates).
**How to avoid:** For the handbook, make lecture-level H3 anchors unique by prepending the section slug, or simply accept that duplicate anchors will fall back to the first match (acceptable for a study tool). Alternatively, de-duplicate by appending a counter.
**Warning signs:** Clicking a ToC link jumps to the wrong lecture.

### Pitfall 5: `claude-package/` Overwrite Behavior
**What goes wrong:** Re-running `node compiler.js` after a previous run either fails with "directory exists" or silently overwrites files the user has customized.
**Why it happens:** No guidance was locked in CONTEXT.md — this is Claude's Discretion.
**How to avoid:** Recommended behavior: always overwrite (no error). Rationale: (1) the package is generated content, not hand-edited; (2) consistency with `processor.js` which overwrites output files; (3) simplicity. Add a console message: `Overwriting existing claude-package/`.
**Warning signs:** User confusion if re-run fails on existing directory.

---

## Code Examples

Verified patterns from codebase inspection:

### Frontmatter Parse (complete, verified against actual output)
```javascript
// Source: verified against processor/output/what-is-a-project.md
function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim();
    fields[key] = raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  return fields;  // { lectureTitle, sectionName, processedAt }
}
```

### Notes/Quiz Split (verified against actual output structure)
```javascript
// Source: verified against processor/output/what-is-a-project.md
// Body structure: concept H2 sections... \n## Practice Questions\n...\n## Flashcards\n...
function splitNotesAndQuiz(body) {
  const marker = '\n## Practice Questions';
  const idx = body.indexOf(marker);
  if (idx === -1) return { notes: body.trim(), quiz: '' };
  return {
    notes: body.slice(0, idx).trim(),
    quiz: body.slice(idx + 1).trim()
  };
}
```

### Section File Writer
```javascript
// Source: CONTEXT.md spec + project patterns
function buildSectionFile(sectionName, lectures, type) {
  // type: 'notes' | 'quiz'
  const title = type === 'notes'
    ? `# ${sectionName} — Notes`
    : `# ${sectionName} — Quiz`;

  const parts = [title, ''];
  for (const lecture of lectures) {
    const content = type === 'notes' ? lecture.notes : lecture.quiz;
    if (content) {
      parts.push(`## ${lecture.lectureTitle}`);
      parts.push('');
      parts.push(content);
      parts.push('');
    }
  }
  return parts.join('\n');
}
```

### Progress Output (mirrors processor.js exactly)
```javascript
// Source: processor/processor.js — established project pattern
const padded = String(i + 1).padStart(String(total).length, ' ');
process.stdout.write('[' + padded + '/' + total + '] Compiling: ' + sectionName + '...');
// ... do work ...
process.stdout.write(' done\n');
```

### Dry-Run Output
```javascript
// Source: CONTEXT.md spec
// Shows: sections found, lecture count per section, output file list
console.log('Dry run — would compile:');
for (const [sectionName, lectures] of sectionGroups) {
  console.log('  Section: ' + sectionName + ' (' + lectures.length + ' lectures)');
}
console.log('\nWould write:');
for (const filename of outputFiles) {
  console.log('  claude-package/' + filename);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-lecture output files | Section-scoped files (8-12) | Phase 4 design decision | Claude Projects retrieval quality improves with fewer, denser files |
| Generic system prompt | Study-mode-specific prompt with grounding rule | Phase 4 | Claude stays on-topic and cites the course content |

**Deprecated/outdated:**
- Per-lecture markdown files in `claude-package/`: Out of scope. Section files replace them.

---

## Input Contract (What the Compiler Reads)

This section documents the exact shape of `processor/output/*.md` files, verified from reading actual files.

### File Format
```
---
lectureTitle: "What is a Project"
sectionName: "Introduction to Project Management"
processedAt: 2026-03-20T23:16:22.127Z
---
# [Lecture Title] — PMP Certification Lecture Notes

## [Concept Name]
[content with **bold**, bullet points, tables, exam tips, bottom lines]

---

## [Another Concept Name]
[content...]

---

## Practice Questions

**Q1.** [scenario question]

A) ...  B) ...  C) ...  D) ...

**Answer: X** — [explanation]

---

**Q2.** [...]

---

## Flashcards

- **[Term]** — [definition]

- **[Term]** — [definition]
```

### Key Observations
1. `lectureTitle` and `sectionName` are always JSON-quoted strings (double quotes)
2. `processedAt` is an ISO 8601 string WITHOUT quotes
3. The body starts immediately after the closing `---` of frontmatter (blank line separator)
4. `## Practice Questions` and `## Flashcards` are the two stable section delimiters at the bottom
5. All concept sections before `## Practice Questions` constitute the "notes" content
6. The body uses `---` horizontal rules between concept sections
7. Both output files in `processor/output/` share the same `sectionName: "Introduction to Project Management"` — confirming one section maps to multiple lectures

---

## Open Questions

1. **Section ordering when only one section exists in output/**
   - What we know: Both current output files are in "Introduction to Project Management"
   - What's unclear: How to determine section numbering when only one section is present (trivially `01-`)
   - Recommendation: Assign numbers based on first-seen `processedAt` order; single section gets `01-`; no special handling needed

2. **Lecture ordering within sections when processedAt timestamps are very close**
   - What we know: `processedAt` is set at API call time; sequential batch processing means timestamps will differ by seconds
   - What's unclear: If two lectures are processed in the same second (unlikely but possible), sort order is undefined
   - Recommendation: Secondary sort by filename as tiebreaker (stable fallback)

3. **What "lectures with missing sectionName" means in practice**
   - What we know: CONTEXT.md lists this as a Claude's Discretion edge case
   - What's unclear: Whether any actual output files have a missing `sectionName`
   - Recommendation: Skip files with missing `sectionName`, log a warning with filename. Do not crash.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node >= 18) |
| Config file | none — run directly with `node --test` |
| Quick run command | `node --test compiler/tests/*.test.js` |
| Full suite command | `node --test compiler/tests/*.test.js && node --test processor/tests/*.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUTP-01 | Section grouping produces correct files per section | unit | `node --test compiler/tests/grouper.test.js` | Wave 0 |
| OUTP-01 | Notes file contains only Key Concepts, Summary, Examples (no quiz content) | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |
| OUTP-01 | Quiz file contains only Practice Questions and Flashcards | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |
| OUTP-01 | Output filenames follow `NN-slug-notes.md` / `NN-slug-quiz.md` pattern | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |
| OUTP-02 | Handbook contains a ToC with section and lecture anchor links | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |
| OUTP-02 | Handbook contains Key Concepts and Summary per lecture, no Practice Questions | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |
| OUTP-03 | CLAUDE_INSTRUCTIONS.md is written to claude-package/ | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |
| OUTP-03 | System prompt references all four study modes | unit | `node --test compiler/tests/builder.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test compiler/tests/*.test.js`
- **Per wave merge:** `node --test compiler/tests/*.test.js && node --test processor/tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `compiler/tests/frontmatter.test.js` — covers frontmatter parsing with YAML-quoted strings, missing frontmatter, processedAt without quotes
- [ ] `compiler/tests/sections.test.js` — covers notes/quiz split at `## Practice Questions`, missing section handling
- [ ] `compiler/tests/grouper.test.js` — covers section grouping, processedAt sort order, missing sectionName handling
- [ ] `compiler/tests/builder.test.js` — covers section file content, handbook structure, filename generation, system prompt content

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `processor/processor.js` — CLI pattern, flag parsing, progress output
- Direct inspection of `processor/markdown.js` — frontmatter format produced
- Direct inspection of `processor/manifest.js` — file I/O patterns
- Direct inspection of `processor/output/what-is-a-project.md` — actual markdown structure
- Direct inspection of `processor/output/project-life-cycle.md` — confirms structure is consistent
- Direct inspection of `processor/tests/markdown.test.js` — node:test pattern, test style

### Secondary (MEDIUM confidence)
- GitHub-flavored markdown anchor specification — GFM anchors for handbook ToC

### Tertiary (LOW confidence)
- Claude Projects markdown rendering behavior for in-file anchor links — assumed to follow GFM conventions; not explicitly verified against Claude Projects documentation

---

## Metadata

**Confidence breakdown:**
- Input contract (frontmatter/body format): HIGH — read from actual output files
- Standard stack: HIGH — zero new dependencies; built-ins only
- Architecture patterns: HIGH — mirrors established processor.js patterns
- Frontmatter parsing approach: HIGH — format is fixed and verified
- Notes/quiz split approach: HIGH — verified against actual output file structure
- Handbook ToC anchors: MEDIUM — GFM spec is standard; Claude Projects rendering assumed
- Section order from processedAt: HIGH — ISO string sort is deterministic and chronological

**Research date:** 2026-03-21
**Valid until:** No external dependencies — valid indefinitely (no library versions to expire)
