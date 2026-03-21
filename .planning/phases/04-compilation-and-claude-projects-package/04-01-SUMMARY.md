---
phase: 04-compilation-and-claude-projects-package
plan: 01
subsystem: compiler
tags: [compiler, tdd, node-test, pure-functions, markdown, commonjs]
dependency_graph:
  requires: []
  provides:
    - compiler/frontmatter.js (parseFrontmatter)
    - compiler/sections.js (extractBody, splitNotesAndQuiz)
    - compiler/grouper.js (groupBySectionName, orderSections, toSlug)
    - compiler/builder.js (buildSectionFile, sectionFilename, buildHandbook, toGfmAnchor)
  affects:
    - compiler CLI (Plan 02) wires these modules together
tech_stack:
  added: []
  patterns:
    - node:test with node:assert/strict (same as processor tests)
    - CommonJS module.exports for all compiler modules
    - TDD red-green cycle per task
key_files:
  created:
    - compiler/frontmatter.js
    - compiler/sections.js
    - compiler/grouper.js
    - compiler/builder.js
    - compiler/tests/frontmatter.test.js
    - compiler/tests/sections.test.js
    - compiler/tests/grouper.test.js
    - compiler/tests/builder.test.js
  modified: []
decisions:
  - "extractBody uses startsWith('---\\n') check then finds second \\n---\\n — handles frontmatter anchored at file start without double-newline prefix"
  - "splitNotesAndQuiz splits at '\\n## Practice Questions' and includes Flashcards in quiz portion — Flashcards is not an independent split point"
  - "groupBySectionName uses ISO 8601 string comparison for processedAt sorting — string sort is correct for ISO dates"
  - "toGfmAnchor removes non-alphanumeric/space/hyphen chars then collapses spaces — matches GitHub's anchor generation behavior"
  - "buildHandbook includes only lecture.notes (not quiz) to keep handbook content clean for Claude Projects retrieval"
metrics:
  duration: 2 minutes
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_created: 8
---

# Phase 04 Plan 01: Compiler Pure-Function Modules Summary

Pure-function compiler modules (frontmatter parsing, body/quiz splitting, section grouping, file assembly) built with full TDD coverage using node:test — 39 tests pass across all 4 modules.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build frontmatter, sections, and grouper modules with tests | fce1003 | frontmatter.js, sections.js, grouper.js + 3 test files |
| 2 | Build section file and handbook builder module with tests | 2e5d6e4 | builder.js + builder.test.js |

## Modules Produced

**compiler/frontmatter.js** — `parseFrontmatter(fileContent)`: Extracts YAML frontmatter fields from processor output files. Anchored regex matches only the first `---` block. JSON-quoted values (lectureTitle, sectionName) are parsed via `JSON.parse`; unquoted values (processedAt ISO timestamps) returned as raw strings.

**compiler/sections.js** — Two functions:
- `extractBody(fileContent)`: Returns everything after the closing `---\n` of frontmatter, using `startsWith('---\n')` plus index search for the second `\n---\n`.
- `splitNotesAndQuiz(body)`: Splits at `\n## Practice Questions`. Everything before is notes; from that point onward (including Flashcards) is quiz.

**compiler/grouper.js** — Three functions:
- `groupBySectionName(lectures)`: Groups into a Map by sectionName (falsy -> `'__unknown__'`), sorted by processedAt ascending with filename tiebreaker.
- `orderSections(groups)`: Returns section names sorted by earliest processedAt per group (determines 01-/02-/... numbering).
- `toSlug(sectionName)`: Lowercase hyphenated slug for filenames.

**compiler/builder.js** — Four functions:
- `buildSectionFile(sectionName, lectures, type)`: Assembles notes or quiz markdown with `# {name} \u2014 Notes/Quiz` H1, `## {lectureTitle}` H2 per lecture. Skips lectures with empty content for the given type.
- `sectionFilename(num, name, type)`: Returns zero-padded `NN-slug-type.md` filename.
- `buildHandbook(orderedSections, groups)`: Full handbook with ToC (GFM anchors), `## section` / `### lecture` body structure. Notes content only — no quiz.
- `toGfmAnchor(heading)`: Lowercase, remove non-alphanumeric/space/hyphen, spaces to hyphens, collapse duplicates.

## Test Coverage

- frontmatter.test.js: 5 tests
- sections.test.js: 6 tests
- grouper.test.js: 8 tests
- builder.test.js: 20 tests
- **Total: 39 tests, all passing**

Run: `node --test compiler/tests/frontmatter.test.js compiler/tests/sections.test.js compiler/tests/grouper.test.js compiler/tests/builder.test.js`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed extractBody to handle frontmatter anchored at file start**
- **Found during:** Task 1 GREEN phase (test run)
- **Issue:** Initial implementation searched for `\n---\n` twice, but the opening `---` in processor output files starts at position 0 with no preceding newline — so `indexOf('\n---\n')` from position 0 found the closing delimiter on the first search
- **Fix:** Changed to `startsWith('---\n')` check then `indexOf('\n---\n', 4)` to find the closing block
- **Files modified:** compiler/sections.js
- **Commit:** fce1003 (fix applied in same commit after iterating)

## Self-Check: PASSED
