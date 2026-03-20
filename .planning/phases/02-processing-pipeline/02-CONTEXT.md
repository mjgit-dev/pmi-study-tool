# Phase 2: Processing Pipeline - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI tool that reads raw transcript JSON files from a folder, calls Anthropic API to generate structured notes per lecture, and writes per-lecture markdown files to an output folder — with a manifest (processing-state.json) that tracks status and enables resume on failure. Generating practice questions and flashcards are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### CLI invocation & paths
- Invoked with a folder path: `node processor.js ./transcripts/` — scans all `.json` files in that folder
- Output lands in a fixed `output/` subfolder next to the processor script
- Two flags from launch:
  - `--dry-run` — shows which files would be processed without making any API calls
  - `--force` — reprocesses lectures already marked complete in the manifest (useful when prompt is updated)
- Auto-resume is always active — no special flag needed (see Resume below)

### Markdown output structure
- Three sections per lecture file: **Key Concepts**, **Summary**, **Examples**
- Phase 3 will append **Practice Questions** and **Flashcards** sections to these same files — section order is locked
- Key Concepts format: bullet list of terms with 1-sentence explanations (scannable for pre-exam review)
- Each file has YAML frontmatter: `lectureTitle`, `sectionName`, `processedAt`
- Output filename matches the input JSON filename with `.md` extension (e.g., `What-is-a-Project.md`)

### Progress & feedback
- Per-lecture status lines during the run: `[ 1/47] Processing: What-is-a-Project... ✓ done (2.3s)`
- End-of-run summary: `Processed: 45 | Failed: 2 | Skipped: 0 | Time: 4m 12s`

### Resume & failure behavior
- **Auto-resume**: same command always checks manifest and skips lectures already marked complete — no flag needed
- **On failure**: continue the batch, mark the lecture as `failed` in the manifest, continue processing the rest — all failures shown at the end
- **Manifest per lecture**: `{ filename, status: "pending"|"complete"|"failed", processedAt, error? }`
- `--force` flag bypasses the manifest and reprocesses everything

### API call design
- Single API call per lecture for all content types (notes, summary, examples in Phase 2; questions and flashcards added in Phase 3) — avoids 3× token cost at 100+ lecture scale (locked decision from STATE.md)

### Claude's Discretion
- Exact Anthropic API prompt structure (system prompt, user message format)
- Concurrency strategy for batch processing (sequential vs. limited parallel)
- Rate-limit handling (backoff, retry logic)
- Exact error message text for CLI output

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PROC-01, PROC-04, PROC-05 define acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (4 items) that must all be TRUE for phase completion

### Project constraints
- `.planning/PROJECT.md` — Key decisions (single API call per lecture, markdown output, single-user local tool)
- `.planning/STATE.md` §Decisions — "Single API call per lecture for all content types" and "Processing manifest is a Phase 2 prerequisite"

### Input contract
- `extractor/extractor.js` — JSON payload written by Phase 1 extractor; fields the processor reads: `lectureTitle`, `sectionName`, `transcript`, `wordCount`, `extractedAt`, `captionType`, `language`

No external specs — requirements fully captured in decisions above and the referenced planning docs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extractor/cleaning.js` — CommonJS module pattern (no ES module syntax); Phase 2 processor should follow the same style
- `extractor/package.json` — uses `node:test` (built-in, zero install) for testing; processor tests should use the same

### Established Patterns
- CommonJS (`module.exports` / `require`) — established in extractor; maintain for Node.js compatibility
- `node:test` for unit tests — no Jest or external test runner
- Single-user local tool — no auth, no multi-tenancy concerns

### Integration Points
- Processor reads JSON files written by `extractor/extractor.js` — the `transcript` field is the primary input; `lectureTitle` + `sectionName` become frontmatter in the output markdown
- Output markdown files are the direct input to the Phase 4 compiler — filename convention and frontmatter fields are part of the cross-phase contract
- `processing-state.json` manifest is the cross-run state — Phase 3 (questions/flashcards) and Phase 4 (compiler) may read it

</code_context>

<specifics>
## Specific Ideas

- No specific product references given for CLI design — open to standard Node.js CLI patterns
- The `--force` flag should reprocess even lectures marked complete — useful when the AI prompt is updated and all content needs regeneration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-processing-pipeline*
*Context gathered: 2026-03-20*
