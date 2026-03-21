# Stack Research

**Domain:** Node.js CLI pipeline — study content enrichment (ECO tagging, glossary, cost estimation, weak-area hint injection)
**Researched:** 2026-03-21
**Confidence:** HIGH

---

## Context: Existing Stack (Validated, Do Not Re-Research)

The v1.0 stack is locked and running in production:

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js CommonJS | LTS |
| API client | `@anthropic-ai/sdk` | 0.80.0 (installed) |
| Test runner | `node:test` built-in | — |
| Module format | CommonJS (`require`/`module.exports`) | — |
| Output format | Markdown | — |

All four v1.1 features must integrate into this stack. No ESM conversion, no new frameworks.

---

## Feature-by-Feature Stack Analysis

### Feature 1: ECO Domain Tagging per Lecture

**What it needs:** Each processed lecture tagged with one PMI ECO domain: People (42%), Process (50%), Business Environment (8%).

**Stack answer: No new library needed.**

ECO domain classification is a prompt engineering problem. The existing `processor/prompt.js` system prompt already instructs Claude to produce structured markdown. Adding a domain tag means asking Claude to output `**ECO Domain:** Process` (or equivalent) as part of its response, then extracting it with a regex in a new `eco.js` helper:

```js
const match = apiText.match(/\*\*ECO Domain:\*\*\s*(People|Process|Business Environment)/i);
const ecoDomain = match ? match[1] : null;
```

The extracted value is stored in the manifest JSON per lecture alongside `status` and `processedAt`. The compiler reads it from the manifest when building section files and the handbook.

**No new dependencies.** `node:fs` and native regex handle this entirely.

---

### Feature 2: Glossary Auto-Extraction

**What it needs:** All `## Flashcards` sections across processed lectures compiled into one deduplicated, alphabetically sorted glossary file in `claude-package/`.

**Stack answer: No new library needed.**

The compiler already reads all `processor/output/*.md` files. Flashcard term-definition pairs follow a machine-generated, strictly controlled format authored by the system prompt:

```
- **Term** — definition.
```

A regex extracts every pair:

```js
const FLASHCARD_RE = /^- \*\*(.+?)\*\* — (.+)$/gm;
```

Deduplication by term (case-insensitive map) and alphabetical sort are native JS operations. The result is written as a new `GLOSSARY.md` file in `claude-package/`.

A markdown AST parser (`remark`, `unified`) would be engineering overhead for a pattern the system itself generated. Regex is correct here.

**No new dependencies.** Implemented as a new `compiler/glossary.js` module.

---

### Feature 3: Processing Cost Estimate Before Batch Run

**What it needs:** Before any batch run begins, display an estimated total cost (input + output tokens × price) and prompt the user to confirm or abort.

**Stack answer: `client.messages.countTokens()` — already in `@anthropic-ai/sdk` 0.80.0.**

The SDK's token counting API accepts the identical `{ model, system, messages }` shape as `messages.create()`. It returns `{ input_tokens: N }` and is **free to call** (no billing charge). Rate limits are independent of `messages.create` limits.

**Pricing constants to hardcode (verified from official docs, 2026-03-21):**

| Model | Input | Output | Batch Input | Batch Output |
|-------|-------|--------|-------------|--------------|
| claude-sonnet-4-6 | $3.00/MTok | $15.00/MTok | $1.50/MTok | $7.50/MTok |

Output token count is not available before a run. The estimator uses a conservative heuristic: output ≈ 3× input tokens (calibrated for the existing prompt which generates notes + questions + flashcards). This is clearly labeled as an estimate in the output.

**Confirm/abort:** `node:readline` (built-in) handles the yes/no prompt with ~5 lines of code. No `inquirer` or `prompts` package needed.

**No new dependencies.** Implemented as a new `processor/cost-estimate.js` module.

---

### Feature 4: Weak-Area Hint Injection into System Prompt

**What it needs:** The `claude-package/CLAUDE_INSTRUCTIONS.md` system prompt includes a user-specified "Focus Areas" section listing topics to emphasise during quizzing.

**Stack answer: No new library needed.**

`compiler/system-prompt.js` exports `buildSystemPrompt()` as a pure function returning a static string. Extending it to accept a `weakAreas` array parameter is a one-line signature change. The compiler reads weak areas from a JSON config file (e.g., `weak-areas.json` in the project root) before calling `buildSystemPrompt(weakAreas)`.

User workflow: edit `weak-areas.json`, re-run the compiler, upload the new `CLAUDE_INSTRUCTIONS.md` to Claude Projects. No runtime AI involved.

**No new dependencies.** Config file reading uses `node:fs`.

---

## Recommended Stack: New Additions for v1.1

### Core Technologies — No Changes Required

`@anthropic-ai/sdk` 0.80.0 already includes `client.messages.countTokens()`. No SDK upgrade needed.

### New Modules to Write (Zero External Dependencies)

| Module | Location | Purpose | Depends On |
|--------|----------|---------|-----------|
| `eco.js` | `processor/` | Parse ECO domain from Claude output; persist in manifest | `node:fs`, regex |
| `cost-estimate.js` | `processor/` | Token count pending transcripts, estimate cost, confirm/abort | `@anthropic-ai/sdk` (countTokens), `node:readline` |
| `glossary.js` | `compiler/` | Extract flashcard terms across all output files, deduplicate, sort | `node:fs`, regex |
| Updated `system-prompt.js` | `compiler/` | Accept `weakAreas[]` param; append focus section | None (pure function) |

### Supporting Libraries — None Required

All v1.1 capabilities are covered by:
- `@anthropic-ai/sdk` 0.80.0 — `countTokens()` method (verified)
- `node:fs`, `node:path`, `node:readline` — Node.js built-ins

---

## Installation

No new packages to install.

```bash
# All capabilities are already available via:
# - @anthropic-ai/sdk@0.80.0 (installed in processor/)
# - node:readline, node:fs, node:path (Node.js built-ins)

# Confirm countTokens is available in installed SDK:
node -e "const A = require('@anthropic-ai/sdk'); const c = new A.default(); console.log(typeof c.messages.countTokens);"
# Expected: function
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `countTokens()` from existing SDK | `tiktoken-node` or `anthropic-tokenizer-typescript` | Only if you need offline token counting without an API key — not applicable here |
| Regex on machine-generated flashcard format | `remark`/`unified` AST parser | When parsing user-generated or structurally variable markdown — not this case |
| `node:readline` for confirm prompt | `inquirer`, `prompts`, `enquirer` | When you need multi-step interactive menus — overkill for a single yes/no |
| Flat `weak-areas.json` config | Per-run CLI flags | When weak areas change every run — config file is better for a persistent preference |
| ECO tag embedded in Claude's markdown output | Separate classification API call | A second API call per lecture doubles cost and complexity for a single field |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tiktoken-node` | Requires native binaries; can diverge from Anthropic billing; countTokens() is free and exact | `client.messages.countTokens()` |
| `remark` / `unified` / `marked` | Heavy dependency for parsing a strictly controlled machine-generated format | Regex on known pattern |
| `inquirer` / `prompts` / `enquirer` | 3–5 dependencies for a yes/no prompt | `node:readline` (4 lines) |
| ESM conversion | Breaks CommonJS consistency; no benefit for this pipeline | CommonJS throughout |
| Per-lecture adaptive difficulty scoring | Requires embeddings, similarity search, or a second AI call — scope creep | User-specified weak areas via `weak-areas.json` |

---

## Version Compatibility

| Package | Version | Compatibility Notes |
|---------|---------|---------------------|
| `@anthropic-ai/sdk` | 0.80.0 | `client.messages.countTokens()` confirmed available in this version |
| Node.js | 18+ LTS | `node:readline` Promises API available since Node 17; `node:test` since 18 |

---

## Sources

- https://platform.claude.com/docs/en/about-claude/pricing — Model pricing table with batch discounts; verified 2026-03-21 (HIGH confidence)
- https://platform.claude.com/docs/en/build-with-claude/token-counting — `countTokens()` API docs, Node.js examples, confirmed free to use, rate limits listed (HIGH confidence)
- `C:/pmi-study-tool/processor/package-lock.json` — Confirms `@anthropic-ai/sdk` 0.80.0 is the installed version (HIGH confidence)
- `C:/pmi-study-tool/processor/processor.js` — Confirms CommonJS, `messages.create()` call shape, `process.env.PMI_MODEL` pattern (HIGH confidence)
- `C:/pmi-study-tool/compiler/system-prompt.js` — Confirms `buildSystemPrompt()` is a zero-param pure function; trivially extensible (HIGH confidence)
- `C:/pmi-study-tool/processor/prompt.js` — Confirms existing system prompt and output structure including `## Flashcards` format (HIGH confidence)

---

*Stack research for: PMI Study Tool v1.1 — ECO tagging, glossary extraction, cost estimation, weak-area hint injection*
*Researched: 2026-03-21*
