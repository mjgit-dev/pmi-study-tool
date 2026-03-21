# Phase 1: Extraction - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Browser script (bookmarklet) that users click while viewing any Udemy lecture to extract, clean, and download the transcript as a local JSON file. Output feeds directly into the Phase 2 processing pipeline. Creating the pipeline, processing content, or generating study materials are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Output delivery
- Auto-download as a JSON file — no clipboard or console-only output
- File named after the lecture title (e.g., `What-is-a-Project.json`) — human-readable, easy to identify
- Flat JSON structure with all fields at the top level: `lectureTitle`, `sectionName`, `transcript`, `wordCount`, `extractedAt`
- User wants files to land in a consistent, known project folder without manual moving — browser can only suggest a filename (not path), so the planner must address this constraint (possible approaches: browser download settings, companion script, or documented manual step)

### Script invocation
- Delivered as a bookmarklet — one click from the browser bookmarks bar while on any Udemy lecture
- Script automatically opens/toggles the transcript panel before extracting (no manual panel setup required)
- If run outside a lecture context: clear error — "No transcript found — open a lecture first"
- Update mechanism: Claude's Discretion (left to planner)

### Cleaning rules
- Smart sentence joining: merge fragments using punctuation cues, capitalize after periods, join mid-sentence splits, strip all timestamps
- Normalize whitespace: collapse multiple spaces, trim leading/trailing whitespace
- Strip filler words: remove "um", "uh", "you know", "like" and similar spoken filler
- Normalize speaker labels: strip or standardize any [Speaker:] markers if present
- Auto-generated captions: extract as-is and include `captionType: "auto-generated"` flag in JSON — do not skip or block

### Validation & feedback
- Success: brief toast/banner overlay on the Udemy page — e.g., "✓ Extracted: What is a Project? (847 words)" — visible without DevTools, disappears after a few seconds
- Low word count (<300 words): extract anyway and download, but overlay shows in yellow/orange — "⚠ Low word count (142 words) — verify transcript" — non-blocking
- Edge cases to explicitly catch and report:
  - **No transcript**: "No transcript found for this lecture"
  - **Duplicate extraction**: warn user if same lecture title already downloaded
  - **Missing metadata**: use fallback values (e.g., "Unknown Section", "Unknown Lecture") and flag in JSON
  - **Non-English captions**: detect and include a `language` flag in the JSON output

### Claude's Discretion
- Bookmarklet update mechanism (manual re-bookmark vs. self-updating from local file)
- Exact overlay styling and duration
- Filler word list completeness
- Duplicate detection implementation (localStorage vs. no state)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — EXTR-01, EXTR-02, EXTR-03 define the acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 1 — Success criteria (4 items) that must all be TRUE for phase completion

### Project constraints
- `.planning/PROJECT.md` — Out of scope list and key decisions (browser-only extraction, no Udemy API)
- `.planning/STATE.md` §Blockers — "Udemy DOM selectors for transcript elements are undocumented — Phase 1 planning must include DOM inspection of the live player as a first step"

No external specs — requirements fully captured in decisions above and the referenced planning docs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — project has no existing code. This is the first phase.

### Established Patterns
- None yet — this phase establishes the first patterns.

### Integration Points
- JSON output from this script is the direct input to the Phase 2 processing pipeline
- Fields `lectureTitle`, `sectionName`, `transcript` are the contract downstream phases depend on
- `wordCount` and `extractedAt` are metadata the pipeline may use for logging/filtering

</code_context>

<specifics>
## Specific Ideas

- No specific UI or product references given — open to standard approaches for toast overlays
- The <300 word threshold is the stated validation threshold from ROADMAP.md success criteria

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-extraction*
*Context gathered: 2026-03-20*
