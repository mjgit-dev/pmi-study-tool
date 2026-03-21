# Phase 5: Cost Estimation - Research

**Researched:** 2026-03-21
**Domain:** Anthropic SDK token counting, CLI UX, Node.js TTY detection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Flag behavior:**
- `--estimate` flag: show the estimate table and exit immediately, no processing. Lets the user preview cost before committing.
- Normal runs (without `--estimate`): always show the estimate first, then prompt for confirmation, then process if confirmed.
- `--yes` flag: bypasses the confirmation gate — run proceeds immediately after displaying the estimate. For scripting.

**Display format:**
- Per-lecture breakdown table plus a total row at the bottom.
- Columns: `Lecture name | Input tokens | Output tokens | Est. cost`
- Output token count is `max_tokens` (8192) — label the total as "Estimated cost (upper bound)" and include a footnote that actual output is typically 1,500–3,000 tokens vs 8,192 max.
- Scoped to pending lectures only — already-complete lectures are excluded from the table.

**Confirmation flow:**
- Prompt text: `Proceed with processing? [y/N]:`
- Default is N — pressing Enter without typing declines.
- On decline: print `Aborted.` and exit with code 1.
- Non-interactive mode (stdin is not a TTY): do not auto-proceed. Print: `Error: confirmation required in non-interactive mode. Use --yes to skip.` and exit 1. Requires `--yes` explicitly.

**Token counting:**
- Use `client.beta.messages.countTokens({ model, system, messages })` — full prompt shape, not just message tokens, to avoid 30–50% underestimate.
- Output token estimate = `max_tokens` (8192) per lecture as conservative upper bound.
- Pricing: use Anthropic published rates for the active model (read from a small pricing constants object, not hardcoded strings).

### Claude's Discretion
- Exact column widths and table formatting (fixed-width vs tab-aligned)
- How to handle the case where countTokens API call itself fails (error vs skip that lecture)
- Whether to show elapsed time for the token-counting pass

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENHA-03 | User sees estimated API cost (per-lecture and total) for pending lectures before the processor runs, and must confirm before the batch starts | `client.beta.messages.countTokens` API verified working in SDK 0.80.0; pricing constants pattern documented; TTY detection pattern documented; confirmation gate pattern documented |
</phase_requirements>

---

## Summary

Phase 5 adds a pre-run cost estimation gate to `processor.js`. Before any API calls to generate study notes, the processor counts tokens for every pending lecture using the SDK's `client.beta.messages.countTokens()` method, renders a per-lecture table with input tokens, output tokens (fixed at `max_tokens` 8192 as the conservative upper bound), and estimated cost, then either exits (`--estimate`) or prompts for user confirmation before proceeding.

The implementation is an insertion into the existing `processAll()` function before the sequential batch loop (step 5 in the current code). All the required building blocks are already in the codebase: `shouldSkip()` identifies pending lectures, `buildMessages()` produces the exact `{ system, messages }` shape that `countTokens` accepts, and the flag-parsing pattern is already established.

The Anthropic SDK version installed (`@anthropic-ai/sdk@0.80.0`) exposes `client.beta.messages.countTokens()` as a live function. The response returns `{ input_tokens: number }`. Pricing for `claude-sonnet-4-6` is verified from official docs as $3.00/MTok input and $15.00/MTok output.

**Primary recommendation:** Implement as a new `runEstimate(files, manifest, flags, client, inputDir)` function extracted from `processAll`, called before the batch loop. Keep it in `processor.js` or extract to a sibling `estimate.js` module — either is fine given the codebase's current flat structure.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | `countTokens` API call | Already installed; `client.beta.messages.countTokens` verified present |
| `node:readline` | built-in | TTY confirmation prompt (if needed) | Standard Node.js; no dependency; project uses zero external helpers |
| `node:process` | built-in | `process.stdin.isTTY`, `process.stdout.write`, `process.exit` | Already used throughout processor.js |

### No New Dependencies Required

This phase requires zero new npm packages. All building blocks are already installed or are Node.js built-ins. The pricing constants are a plain JS object inside the source file.

**Installation:** none needed.

**Version verification (already confirmed):**
```bash
cd processor && node -e "const Anthropic = require('@anthropic-ai/sdk'); console.log(typeof new Anthropic({apiKey:'x'}).beta.messages.countTokens);"
# outputs: function
```

---

## Architecture Patterns

### Recommended Module Structure

The estimate logic is small enough to live in `processor.js` or be extracted to `processor/estimate.js`. Given the project's flat structure and the fact the planner has previously kept everything in one file, adding a dedicated `estimate.js` module is the cleaner choice for testability. Either approach is acceptable.

```
processor/
├── processor.js       # CLI entry + processAll() — receives estimate gate before batch loop
├── estimate.js        # NEW: runEstimate(), PRICING, formatTable() — exported for testing
├── manifest.js        # existing — shouldSkip() reused as-is
├── prompt.js          # existing — buildMessages() reused as-is
├── markdown.js        # existing — untouched
└── tests/
    ├── processor.test.js   # existing — update mock client to include countTokens
    └── estimate.test.js    # NEW: unit tests for estimate logic
```

### Pattern 1: Pricing Constants Object

Store pricing as a module-level constant keyed by model string. This satisfies the "not hardcoded strings" decision and makes it easy to add future models.

```javascript
// Source: official Anthropic pricing docs (verified 2026-03-21)
// https://platform.claude.com/docs/en/about-claude/pricing
const PRICING = {
  'claude-sonnet-4-6': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  'claude-sonnet-4-5': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  'claude-haiku-4-5':  { inputPerMTok: 1.00, outputPerMTok: 5.00  },
  'claude-opus-4-6':   { inputPerMTok: 5.00, outputPerMTok: 25.00 },
};
const DEFAULT_PRICING = { inputPerMTok: 3.00, outputPerMTok: 15.00 }; // sonnet-4-6 fallback
```

If the active model is not found in `PRICING`, fall back to `DEFAULT_PRICING` and log a warning.

### Pattern 2: countTokens API Call

```javascript
// Source: verified from @anthropic-ai/sdk@0.80.0 type definitions
// client.beta.messages.countTokens returns Promise<{ input_tokens: number, context_management: ... }>
async function countLectureTokens(client, model, transcript) {
  const { system, messages } = buildMessages(transcript);
  const result = await client.beta.messages.countTokens({
    model,
    system,
    messages
  });
  return result.input_tokens; // number
}
```

**Key fact:** The response object is `BetaMessageTokensCount` with shape `{ input_tokens: number, context_management: BetaCountTokensContextManagementResponse | null }`. Only `input_tokens` is needed.

### Pattern 3: TTY Detection for Confirmation Gate

```javascript
// Standard Node.js pattern — process.stdin.isTTY is undefined when piped
function isInteractive() {
  return process.stdin.isTTY === true;
}
```

`process.stdin.isTTY` is `true` when stdin is a real terminal, `undefined` (falsy) when stdin is piped or redirected. Do NOT check `=== false` — always check `=== true` to treat the undefined case as non-interactive.

### Pattern 4: Readline-based Confirmation

```javascript
// No readline needed if using process.stdin directly for single keypress
// For robustness, use a simple readline line reader:
const readline = require('node:readline');

async function promptConfirm() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Proceed with processing? [y/N]: ', answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
```

### Pattern 5: Table Formatting (Fixed-Width)

Pad columns to fixed widths using `String.prototype.padEnd` / `padStart`. Compute column widths from the data before rendering.

```javascript
function formatTable(rows, totals) {
  // rows: Array<{ name, inputTokens, outputTokens, costDollars }>
  const nameWidth = Math.max(12, ...rows.map(r => r.name.length));
  const header = [
    'Lecture'.padEnd(nameWidth),
    'Input tok'.padStart(10),
    'Output tok'.padStart(11),
    'Est. cost'.padStart(10),
  ].join('  ');
  const separator = '-'.repeat(header.length);
  const lines = [header, separator];
  for (const r of rows) {
    lines.push([
      r.name.padEnd(nameWidth),
      String(r.inputTokens).padStart(10),
      String(r.outputTokens).padStart(11),
      ('$' + r.costDollars.toFixed(4)).padStart(10),
    ].join('  '));
  }
  lines.push(separator);
  lines.push([
    'TOTAL'.padEnd(nameWidth),
    String(totals.inputTokens).padStart(10),
    String(totals.outputTokens).padStart(11),
    ('$' + totals.costDollars.toFixed(4)).padStart(10),
  ].join('  '));
  return lines.join('\n');
}
```

### Pattern 6: Integration Point in processAll()

```javascript
// Before step 5 (the batch loop) in processAll():
const pendingFiles = files.filter(f => !shouldSkip(manifest[f], flags.force));

if (pendingFiles.length === 0) {
  console.log('All lectures already complete. Nothing to process.');
  return { processed: 0, failed: 0, skipped: files.length };
}

const estimateResult = await runEstimate(pendingFiles, manifest, flags, client, resolvedInput, resolvedManifest);
// runEstimate handles --estimate (print+exit) and --yes (print, no prompt)
// On decline it prints 'Aborted.' and calls process.exit(1)
// On confirm it returns normally and the batch loop proceeds
```

### Anti-Patterns to Avoid

- **Counting tokens with just `messages` omitting `system`:** Will undercount by 30–50% because the system prompt is the largest part of the prompt. Always pass `{ model, system, messages }`.
- **Hardcoding pricing strings:** Makes future model additions fragile. Use the `PRICING` object.
- **`process.stdin.isTTY === false` to detect pipes:** This is wrong because `isTTY` is `undefined` (not `false`) when piped. Always check `=== true`.
- **Auto-proceeding in non-TTY without `--yes`:** Breaks the safety contract. Non-interactive without `--yes` must error and exit 1.
- **Calling `processAll()` unchanged and trying to hook around it:** The estimate gate belongs inside `processAll` before the loop, not wrapping it from outside — this keeps the exported signature stable and tests simple.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Character-count heuristics or tiktoken | `client.beta.messages.countTokens()` | SDK method accounts for actual model tokenizer; matches what the API will charge |
| Readline prompting | Raw `process.stdin.on('data')` | `node:readline` createInterface | Handles encoding, line buffering, EOF correctly with zero extra dependencies |
| Pricing lookup | Hardcoded string comparisons | `PRICING` constant object with `DEFAULT_PRICING` fallback | Extensible without logic changes |

**Key insight:** Token counting is deceptively model-specific. Character-count heuristics routinely miss by 20–40% in real prompts. The SDK's `countTokens` uses the actual tokenizer for the target model.

---

## Common Pitfalls

### Pitfall 1: Missing `system` in countTokens Call
**What goes wrong:** Cost is underestimated by 30–50% because the system prompt is large (~900 tokens based on the prompt in `prompt.js`).
**Why it happens:** Developers pass only `messages` because that's the minimum required field.
**How to avoid:** Always destructure `{ system, messages }` from `buildMessages()` and pass both to `countTokens`.
**Warning signs:** Estimate is much lower than actual charges; input token count looks suspiciously low for the prompt size.

### Pitfall 2: TTY Detection false-negative
**What goes wrong:** `process.stdin.isTTY === false` is used — but in a pipe context `isTTY` is `undefined`, so the check evaluates false and the code incorrectly treats a pipe as interactive.
**Why it happens:** Developers assume boolean property instead of checking docs.
**How to avoid:** Use `process.stdin.isTTY === true` (explicit strict equality with `true`).

### Pitfall 3: countTokens Errors During Estimate Pass
**What goes wrong:** If one lecture's token count call fails (network blip, invalid API key before batch), the whole estimate pass crashes.
**Why it happens:** No error handling around the `await countTokens` call.
**How to avoid:** Wrap each `countTokens` call in try/catch. On error: either (a) surface the error and abort the estimate (safe default), or (b) log the failure and exclude that lecture from the estimate with a visible warning. Decision is Claude's discretion per CONTEXT.md — option (a) is recommended as the simpler and safer choice.

### Pitfall 4: `--estimate` and `--yes` Interaction
**What goes wrong:** `--estimate --yes` together — `--estimate` should always exit after showing the table regardless of `--yes`.
**Why it happens:** Flags evaluated in wrong order.
**How to avoid:** Check `flags.estimate` first; if true, print table and `process.exit(0)` immediately. `--yes` is only relevant when `flags.estimate` is false.

### Pitfall 5: Readline Leaves stdin Open
**What goes wrong:** After `rl.question(...)`, the readline interface is not closed, keeping the process alive.
**Why it happens:** Missing `rl.close()` after reading the answer.
**How to avoid:** Always call `rl.close()` in the answer callback before resolving the Promise.

### Pitfall 6: processAll Signature Change Breaking Tests
**What goes wrong:** Adding `estimate`/`yes` to the flags object inside processAll changes behavior of existing tests that pass `{ dryRun: false, force: false }`.
**Why it happens:** New flags gate logic is not guarded for `undefined`.
**How to avoid:** `flags.estimate` and `flags.yes` should default to `false` with `|| false` guards, or the estimate gate should only engage when `pendingFiles.length > 0` — either way, existing tests with no estimate flag must remain unaffected.

---

## Code Examples

### Verified: countTokens Response Shape

```javascript
// Verified from @anthropic-ai/sdk@0.80.0 type definitions:
// BetaMessageTokensCount = { input_tokens: number, context_management: ... | null }
const result = await client.beta.messages.countTokens({
  model: 'claude-sonnet-4-6',
  system: systemPrompt,          // string
  messages: [{ role: 'user', content: userContent }]
});
const inputTokenCount = result.input_tokens; // number
```

### Verified: Pricing Calculation

```javascript
// Source: https://platform.claude.com/docs/en/about-claude/pricing (verified 2026-03-21)
// claude-sonnet-4-6: $3.00/MTok input, $15.00/MTok output
const MAX_OUTPUT_TOKENS = 8192;

function estimateCost(inputTokens, model) {
  const price = PRICING[model] || DEFAULT_PRICING;
  const inputCost  = (inputTokens  / 1_000_000) * price.inputPerMTok;
  const outputCost = (MAX_OUTPUT_TOKENS / 1_000_000) * price.outputPerMTok;
  return inputCost + outputCost;
}
```

### Verified: Flag Parsing Pattern (Matches Existing Style)

```javascript
// Source: processor.js lines 106-111 — existing pattern to follow
const flags = {
  dryRun:   args.includes('--dry-run'),
  force:    args.includes('--force'),
  estimate: args.includes('--estimate'),  // NEW
  yes:      args.includes('--yes'),       // NEW
};
```

### Verified: Mock Client Shape for Tests

```javascript
// Existing tests use a mock client with messages.create
// Phase 5 tests need to also mock beta.messages.countTokens:
function makeMockClient(opts = {}) {
  const countTokensResult = opts.countTokensResult || { input_tokens: 1500 };
  const countTokensThrow  = opts.countTokensThrow  || false;
  return {
    messages: {
      create: async () => ({ content: [{ text: 'mock output' }] })
    },
    beta: {
      messages: {
        countTokens: async () => {
          if (countTokensThrow) throw new Error('countTokens failed');
          return countTokensResult;
        }
      }
    }
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Character heuristics for token estimates | `client.beta.messages.countTokens()` | SDK v0.20+ | Accurate per-model counts, no guesswork |
| Manual TTY detection with `process.stdin.on` | `process.stdin.isTTY === true` | Node.js built-in | One-liner, reliable across all platforms |

**Deprecated/outdated:**
- Token estimation via `text.length / 4`: Never use. Misses model-specific tokenization and system prompt overhead.

---

## Open Questions

1. **countTokens failure handling**
   - What we know: The API call can fail (network, auth, rate limit)
   - What's unclear: Per CONTEXT.md, this is Claude's discretion
   - Recommendation: On failure, print the error and abort the entire estimate with a non-zero exit. This is safer than silently skipping a lecture from the estimate (user might proceed thinking they know full cost when they don't).

2. **Elapsed time for token-counting pass**
   - What we know: Counting N lectures serially takes N API round-trips; timing is available via `Date.now()`
   - What's unclear: Per CONTEXT.md, showing elapsed time is Claude's discretion
   - Recommendation: Do not show elapsed time — it adds noise without value. The table itself is the useful output. If the pass is slow enough to need feedback, a simple per-lecture `[counting...]` progress line would be sufficient, but even that is optional.

3. **Lecture name display length**
   - What we know: Filenames like `lecture-01-what-is-a-project.json` can be 40+ characters
   - Recommendation: Strip the `.json` extension and truncate to 40 characters with `...` if the name column would make the table wider than ~100 characters. Use dynamic column width (max of all names, capped at 40).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node.js 18+) |
| Config file | none — scripts.test in package.json: `node --test tests/*.test.js` |
| Quick run command | `cd processor && node --test tests/estimate.test.js` |
| Full suite command | `cd processor && node --test tests/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENHA-03 | Estimate table shows only pending lectures | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | Input token count comes from countTokens (not heuristic) | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | Output token count is max_tokens (8192) per lecture | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | Cost calculation uses PRICING object, not inline math | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | `--estimate` flag prints table and exits 0 (no processing) | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | `--yes` flag skips confirmation, batch proceeds | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | Decline at prompt exits 1 and makes 0 API calls | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | Non-interactive mode without `--yes` exits 1 with error message | unit | `node --test tests/estimate.test.js` | ❌ Wave 0 |
| ENHA-03 | Existing processAll tests still pass (no regression) | regression | `node --test tests/processor.test.js` | ✅ exists |

### Sampling Rate

- **Per task commit:** `cd processor && node --test tests/estimate.test.js`
- **Per wave merge:** `cd processor && node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `processor/tests/estimate.test.js` — covers all ENHA-03 behaviors listed above
- [ ] `processor/tests/estimate.test.js` — needs updated `makeMockClient` with `beta.messages.countTokens` mock (or a shared fixture — existing `makeMockClient` in `processor.test.js` does not include `beta`)

Note: No framework installation needed — `node:test` is already in use. No new config files needed.

---

## Sources

### Primary (HIGH confidence)
- `@anthropic-ai/sdk@0.80.0` installed in `processor/node_modules` — `client.beta.messages.countTokens` type verified in `messages.d.ts`; `BetaMessageTokensCount.input_tokens: number` confirmed
- https://platform.claude.com/docs/en/about-claude/pricing — Claude Sonnet 4.6 pricing: $3.00/MTok input, $15.00/MTok output (fetched 2026-03-21)
- `processor/processor.js` — existing CLI flag parsing pattern, processAll() structure
- `processor/prompt.js` — buildMessages() returns `{ system, messages }` confirmed
- `processor/manifest.js` — shouldSkip() logic confirmed

### Secondary (MEDIUM confidence)
- Node.js documentation pattern for `process.stdin.isTTY` — standard cross-version behavior, well established

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK verified installed, countTokens verified as function, response shape verified from type definitions
- Architecture: HIGH — all integration points read from existing source; patterns match codebase conventions exactly
- Pitfalls: HIGH — TTY and countTokens pitfalls are well-documented; regression pitfall derived from reading existing test suite

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (pricing stable; SDK changes slowly)
