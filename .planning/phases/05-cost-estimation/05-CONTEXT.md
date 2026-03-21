# Phase 5: Cost Estimation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Gate the batch processor with a pre-run cost estimate scoped to pending lectures. The estimate is calculated from token counts (not guessed), shown to the user, and requires explicit confirmation before any API calls begin. Processing of already-complete lectures is excluded from the estimate.

</domain>

<decisions>
## Implementation Decisions

### Flag behavior
- `--estimate` flag: show the estimate table and exit immediately, no processing. Lets the user preview cost before committing.
- Normal runs (without `--estimate`): always show the estimate first, then prompt for confirmation, then process if confirmed.
- `--yes` flag: bypasses the confirmation gate — run proceeds immediately after displaying the estimate. For scripting.

### Display format
- Per-lecture breakdown table plus a total row at the bottom.
- Columns: `Lecture name | Input tokens | Output tokens | Est. cost`
- Output token count is `max_tokens` (8192) — label the total as "Estimated cost (upper bound)" and include a footnote that actual output is typically 1,500–3,000 tokens vs 8,192 max.
- Scoped to pending lectures only — already-complete lectures are excluded from the table.

### Confirmation flow
- Prompt text: `Proceed with processing? [y/N]:`
- Default is N — pressing Enter without typing declines.
- On decline: print `Aborted.` and exit with code 1.
- Non-interactive mode (stdin is not a TTY): do not auto-proceed. Print: `Error: confirmation required in non-interactive mode. Use --yes to skip.` and exit 1. Requires `--yes` explicitly.

### Token counting
- Use `client.beta.messages.countTokens({ model, system, messages })` — full prompt shape, not just message tokens, to avoid 30–50% underestimate.
- Output token estimate = `max_tokens` (8192) per lecture as conservative upper bound.
- Pricing: use Anthropic published rates for the active model (read from a small pricing constants object, not hardcoded strings).

### Claude's Discretion
- Exact column widths and table formatting (fixed-width vs tab-aligned)
- How to handle the case where countTokens API call itself fails (error vs skip that lecture)
- Whether to show elapsed time for the token-counting pass

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above.

Key source files to read before implementing:
- `processor/processor.js` — existing CLI entry point, flags object, processAll() signature
- `processor/prompt.js` — buildMessages() returns { system, messages } — this is what countTokens receives
- `processor/manifest.js` — shouldSkip() logic identifies pending vs complete lectures (reuse for estimate scope)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shouldSkip(entry, flags.force)` in manifest.js: already identifies which lectures to skip. Can be reused to filter the estimate to pending-only lectures.
- `buildMessages(transcript)` in prompt.js: returns `{ system, messages }` — exactly the shape `countTokens` needs.
- `flags` object in processor.js: already has `dryRun` and `force` booleans. `estimate` and `yes` slots in cleanly.
- Model string: `process.env.PMI_MODEL || 'claude-sonnet-4-6'` — already in one place, reuse for countTokens call.

### Established Patterns
- CLI flags parsed manually via `args.includes('--flag')` — no external arg parser; follow the same pattern for `--estimate` and `--yes`.
- `process.stdout.write(...)` for progress output, `console.log(...)` for summaries — maintain the same pattern.
- Sequential loop over `files.filter(f => f.endsWith('.json')).sort()` — the estimate pass should follow the same ordering so the table matches processing order.

### Integration Points
- `processAll()` is the single orchestration entry point. The estimate + confirmation gate should run before the sequential batch loop begins (step 5 in processAll).
- The `if (require.main === module)` block handles CLI entry. `--estimate` and `--yes` should be parsed there alongside `--dry-run` and `--force`.

</code_context>

<specifics>
## Specific Ideas

No specific UI references — open to standard CLI table formatting (aligned columns with spaces).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-cost-estimation*
*Context gathered: 2026-03-21*
