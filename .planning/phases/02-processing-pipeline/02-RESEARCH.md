# Phase 2: Processing Pipeline - Research

**Researched:** 2026-03-20
**Domain:** Node.js CLI, Anthropic API (SDK v0.80.0), filesystem I/O, JSON manifest, markdown generation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **CLI invocation:** `node processor.js ./transcripts/` — scans all `.json` files in that folder
- **Output location:** Fixed `output/` subfolder next to the processor script
- **Flags:** `--dry-run` (no API calls, shows what would run) and `--force` (bypass manifest, reprocess all)
- **Auto-resume:** Always active — no flag needed; manifest is checked and completed lectures skipped automatically
- **Markdown sections per lecture:** Key Concepts, Summary, Examples (in this order; Phase 3 appends Practice Questions and Flashcards)
- **Key Concepts format:** Bullet list of terms with 1-sentence explanations
- **YAML frontmatter fields:** `lectureTitle`, `sectionName`, `processedAt`
- **Output filename:** Input JSON filename with `.md` extension (e.g., `What-is-a-Project.md`)
- **Progress output:** Per-lecture status line format: `[ 1/47] Processing: What-is-a-Project... ✓ done (2.3s)`
- **End-of-run summary:** `Processed: 45 | Failed: 2 | Skipped: 0 | Time: 4m 12s`
- **On failure:** Mark lecture as `failed` in manifest, continue batch, report all failures at end
- **Manifest schema:** `{ filename, status: "pending"|"complete"|"failed", processedAt, error? }`
- **Single API call per lecture:** All content types (notes, summary, examples) in one call — avoid 3x token cost
- **Code style:** CommonJS (`module.exports` / `require`) — no ES module syntax
- **Test runner:** `node:test` (built-in) — no Jest or external runner

### Claude's Discretion

- Exact Anthropic API prompt structure (system prompt, user message format)
- Concurrency strategy for batch processing (sequential vs. limited parallel)
- Rate-limit handling (backoff, retry logic)
- Exact error message text for CLI output

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROC-01 | Pipeline processes raw transcript JSON through Anthropic API to produce structured notes (key concepts, summary, examples) per lecture | Anthropic SDK `messages.create`, prompt design patterns, markdown generation with YAML frontmatter |
| PROC-04 | A processing manifest tracks status (pending/complete/failed) per lecture and enables resume on failure without reprocessing completed lectures | `fs.readFileSync`/`writeFileSync` with `processing-state.json`; atomic write pattern to prevent corruption |
| PROC-05 | All content types (notes, questions, flashcards) are generated in a single API call per lecture to minimize cost | Single `messages.create` call with structured output prompt returning all sections; Phase 3 extends the same prompt |
</phase_requirements>

---

## Summary

Phase 2 builds a Node.js CLI that orchestrates batch processing of transcript JSON files through the Anthropic API. The dominant technical challenge is **reliable batching at 100+ lecture scale** — not the individual API call. Every design decision (manifest, resume, single call) exists to make a run of 100+ lectures survivable: resumable on crash, transparent on failure, cost-efficient.

The Anthropic Node.js SDK (`@anthropic-ai/sdk` v0.80.0, published 2026-03-18) handles authentication, retries (429 and 5xx auto-retried 2x by default), and error typing — the processor code should use the SDK, not raw `fetch`. The SDK is an ES module package but ships CommonJS-compatible exports via CJS interop; it can be `require()`'d in Node.js 20+ without issue.

Concurrency is left to Claude's discretion. Given Tier 1 limits (50 RPM for Sonnet 4.x), sequential processing is safe and simpler to implement correctly. Limited parallelism (2-3 concurrent) is viable at higher tiers but adds error-handling complexity that is not justified for a single-user local tool.

**Primary recommendation:** Sequential processing with manifest-backed resume, SDK's built-in retry (default 2), and graceful per-lecture error catch with `continue` semantics. Use `claude-haiku-4-5` for cost efficiency (fastest, cheapest at 50K ITPM Tier 1 limit); allow model to be overridden by env var for flexibility.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (2026-03-18) | Anthropic API client | Official SDK; built-in retry, error types, CJS interop |
| `node:fs` | built-in | Read transcripts, write markdown, read/write manifest | Zero install; all needed ops are synchronous-friendly at this scale |
| `node:path` | built-in | File path construction | Handles Windows/Unix path differences |
| `node:process` | built-in | `argv` parsing, `env` access, `hrtime` timing | No install; sufficient for two-flag CLI |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `node:assert` | built-in | Unit tests for manifest logic and markdown builder | Already established pattern in extractor |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:process.argv` parsing | `minimist`, `yargs`, `commander` | Two flags (`--dry-run`, `--force`) don't justify a dependency; manual `argv.includes()` is trivial |
| Sequential processing | `p-limit` + concurrent | Concurrency adds retry-interaction complexity; not needed at Tier 1 RPM |
| `node:fs` (sync writes) | Atomic write via temp file + rename | Temp+rename is safer for manifest corruption on crash — worth considering for manifest writes specifically |

**Installation:**

```bash
npm install @anthropic-ai/sdk
```

**Version verification:** Confirmed via `npm view @anthropic-ai/sdk version` on 2026-03-20: `0.80.0`, published 2026-03-18.

---

## Architecture Patterns

### Recommended Project Structure

```
processor/
├── processor.js         # Entry point: CLI arg parsing, orchestration loop
├── manifest.js          # Read/write/update processing-state.json
├── prompt.js            # Build system prompt + user message for API call
├── markdown.js          # Render API response into YAML frontmatter + sections
├── package.json         # { "dependencies": { "@anthropic-ai/sdk": "^0.80.0" }, "scripts": { "test": "node --test tests/" } }
└── tests/
    ├── manifest.test.js # Tests for manifest read/write/update logic
    ├── markdown.test.js # Tests for markdown generation from mocked API response
    └── prompt.test.js   # Tests for prompt construction from transcript JSON
output/                  # Created by processor if absent; per-lecture .md files land here
processing-state.json    # Written by processor after each lecture; lives in processor/
```

### Pattern 1: Manifest-Backed Resume Loop

**What:** Before processing each file, check manifest status. Skip `complete` entries unless `--force`. Mark `failed` entries for retry. Write manifest after every lecture (not only at end) to survive mid-run crashes.

**When to use:** Always — this is the core correctness guarantee for PROC-04.

**Example:**

```javascript
// Source: project design — no external library
const { loadManifest, saveManifest, updateEntry } = require('./manifest');

async function runBatch(files, flags) {
  const manifest = loadManifest(); // reads processing-state.json or returns {}
  const start = Date.now();
  let processed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const entry = manifest[file] || { filename: file, status: 'pending' };

    if (entry.status === 'complete' && !flags.force) {
      skipped++;
      process.stdout.write(`[${pad(i+1, files.length)}/${files.length}] Skipping: ${file} (already complete)\n`);
      continue;
    }

    process.stdout.write(`[${pad(i+1, files.length)}/${files.length}] Processing: ${file}...`);
    const t = Date.now();

    if (flags.dryRun) {
      process.stdout.write(` (dry-run)\n`);
      continue;
    }

    try {
      const transcript = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
      const markdown = await processLecture(transcript);
      fs.writeFileSync(path.join(outputDir, file.replace('.json', '.md')), markdown, 'utf8');
      manifest[file] = { filename: file, status: 'complete', processedAt: new Date().toISOString() };
      saveManifest(manifest);
      processed++;
      process.stdout.write(` done (${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
    } catch (err) {
      manifest[file] = { filename: file, status: 'failed', processedAt: new Date().toISOString(), error: err.message };
      saveManifest(manifest);
      failed++;
      process.stdout.write(` FAILED: ${err.message}\n`);
    }
  }

  const elapsed = formatDuration(Date.now() - start);
  console.log(`\nProcessed: ${processed} | Failed: ${failed} | Skipped: ${skipped} | Time: ${elapsed}`);
}
```

### Pattern 2: Single-Call Structured Output Prompt

**What:** One `messages.create` call per lecture that returns all three Phase 2 sections (Key Concepts, Summary, Examples) in a structured format the markdown builder can parse. The system prompt instructs Claude to return a fixed-delimiter format — not JSON (fragile for long text) — so the markdown builder can split on section headers.

**When to use:** Always — required by PROC-05; also matches Phase 3 extension point.

**Example (prompt.js):**

```javascript
// Source: Anthropic docs + project design
function buildMessages(transcript) {
  const system = `You are a study assistant that creates concise, scannable study notes from course lecture transcripts.
Output exactly three sections using these exact headers — no other text before or after:

## Key Concepts
[Bullet list: "- **Term**: One-sentence explanation." — 5-10 terms per lecture]

## Summary
[2-4 paragraph prose summary of the lecture's main ideas]

## Examples
[Concrete examples from the lecture content that illustrate key concepts]`;

  const user = `Create study notes for this lecture.

Title: ${transcript.lectureTitle}
Section: ${transcript.sectionName}

Transcript:
${transcript.transcript}`;

  return { system, messages: [{ role: 'user', content: user }] };
}
module.exports = { buildMessages };
```

**Phase 3 extension:** Add Practice Questions and Flashcards headers to the system prompt — same call, same parse logic extended.

### Pattern 3: Anthropic SDK Initialization (CJS)

**What:** The SDK ships ESM-first but supports CJS `require()` via its interop exports. In Node.js 20+, `require('@anthropic-ai/sdk')` works without any flag.

**Example:**

```javascript
// Source: @anthropic-ai/sdk README + official docs
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // required — no default
  maxRetries: 2,    // default; handles 429 + 5xx automatically
  timeout: 60000    // 60s — appropriate for lecture-length transcripts
});

async function callAPI(transcript) {
  const { system, messages } = buildMessages(transcript);
  const response = await client.messages.create({
    model: process.env.PMI_MODEL || 'claude-haiku-4-5',
    max_tokens: 2048,
    system,
    messages
  });
  return response.content[0].text;
}
```

### Pattern 4: Markdown Builder with YAML Frontmatter

**What:** Pure function that takes `transcript` (for metadata) and `apiText` (raw API response text) and returns a complete markdown string.

**Example:**

```javascript
// Source: project design — standard YAML frontmatter convention
function buildMarkdown(transcript, apiText) {
  const frontmatter = [
    '---',
    `lectureTitle: ${JSON.stringify(transcript.lectureTitle)}`,
    `sectionName: ${JSON.stringify(transcript.sectionName)}`,
    `processedAt: ${new Date().toISOString()}`,
    '---',
    ''
  ].join('\n');

  return frontmatter + apiText.trim() + '\n';
}
module.exports = { buildMarkdown };
```

The API is prompted to output exactly `## Key Concepts`, `## Summary`, `## Examples` headers — the markdown builder prepends frontmatter and appends a trailing newline. No regex parsing of sections needed in Phase 2.

### Anti-Patterns to Avoid

- **Writing manifest only at end of run:** A crash on lecture 47/100 loses all progress. Write after every lecture.
- **Parsing API response as JSON:** Long markdown content with quotes, brackets, colons breaks JSON parsing silently. Use header-delimited plain text output instead.
- **Concatenating all transcripts into one prompt:** Token cost explodes; rate limits hit; individual failure handling becomes impossible. One call per lecture is locked.
- **Using `fs.writeFileSync` without ensuring output dir exists:** Will throw if `output/` doesn't exist. Call `fs.mkdirSync(outputDir, { recursive: true })` once at startup.
- **Parsing `process.argv` with index assumptions:** Use `includes()` for flags and explicit positional extraction by filtering non-flag args.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry with backoff on 429 | Custom retry loop with `setTimeout` | SDK's built-in `maxRetries` (default: 2) | SDK already implements exponential backoff; 429 is auto-retried |
| API error type detection | `err.status === 429` string checks | `err instanceof Anthropic.RateLimitError` | SDK exports typed error classes for all status codes |
| API key injection into headers | Manual header construction | `new Anthropic({ apiKey })` | SDK handles `x-api-key`, `anthropic-version`, `content-type` automatically |
| YAML serialization library | `js-yaml` or similar | Template string with `JSON.stringify` for string values | Frontmatter is 3 scalar string fields; full YAML library is overkill |

**Key insight:** The SDK handles the entire HTTP layer including auth, versioning, retries, and error typing. The processor's job is orchestration (file I/O, manifest, prompt construction, markdown rendering) — not HTTP.

---

## Common Pitfalls

### Pitfall 1: SDK is ESM — CJS `require()` may need interop

**What goes wrong:** `const Anthropic = require('@anthropic-ai/sdk')` may return `{ default: [Function] }` instead of the constructor in some Node.js versions.

**Why it happens:** The SDK's primary entry is ESM; CJS interop via `exports` map varies by Node.js version and package.json `"type"` field.

**How to avoid:** In Node.js 20+ (confirmed: v24.14.0 on this machine), CJS `require()` returns the default export directly via the SDK's interop shim. If `require('@anthropic-ai/sdk')` returns an object with `.default`, use `require('@anthropic-ai/sdk').default`. Test at project setup with `node -e "const A = require('@anthropic-ai/sdk'); console.log(typeof A)"` — should print `function`.

**Warning signs:** `TypeError: Anthropic is not a constructor` at runtime.

### Pitfall 2: Rate limit 429 after burst — SDK retry may not be enough

**What goes wrong:** SDK retries 429 twice by default with exponential backoff, but at Tier 1 (50 RPM, 50K ITPM for Haiku), a tight sequential loop processing short transcripts can still exhaust RPM quickly.

**Why it happens:** Token bucket algorithm — burst capacity exists but depletes. Sequential processing should be fine for normal lecture lengths (300-2000 words), but very short lectures processed rapidly could hit RPM.

**How to avoid:** Sequential processing with `maxRetries: 2` (SDK default) covers most cases. If failures show `RateLimitError` after 2 retries, add a `await new Promise(r => setTimeout(r, 2000))` sleep between lectures. Don't pre-emptively add sleep — it slows normal runs unnecessarily.

**Warning signs:** `RateLimitError` appearing in failed lectures at end-of-run summary.

### Pitfall 3: Manifest corruption on concurrent writes

**What goes wrong:** If processor is accidentally run twice simultaneously (unlikely for a local tool, but possible), two processes overwrite `processing-state.json` — last-writer-wins causes lost entries.

**Why it happens:** `fs.writeFileSync` is not atomic across processes.

**How to avoid:** Write to a temp file then rename (`fs.renameSync(tmp, target)`) for atomic replacement on POSIX. On Windows, `rename` is not atomic across volumes but is sufficient for a local single-user tool. Add a `_pid` field to the manifest so a running instance can detect a conflict.

**Warning signs:** Manifest entries disappearing between runs.

### Pitfall 4: API response does not match expected section headers

**What goes wrong:** Claude occasionally adds preamble ("Sure! Here are your notes:") before the first `##` header, or renames sections ("### Key Concepts" vs "## Key Concepts").

**Why it happens:** LLMs are probabilistic; even with explicit instructions, formatting deviations occur.

**How to avoid:** The system prompt should include "Output ONLY the three sections below, starting immediately with '## Key Concepts'. Do not add any other text." In Phase 2 the markdown builder prepends frontmatter and passes through the API text — a light sanity check (does the text contain all three headers?) can be added to flag unexpected outputs without blocking the batch.

**Warning signs:** Markdown files that open with narrative text instead of frontmatter + `## Key Concepts`.

### Pitfall 5: `output/` directory not created before first write

**What goes wrong:** `fs.writeFileSync('output/Lecture.md', ...)` throws `ENOENT` if `output/` does not exist.

**Why it happens:** Node.js `writeFileSync` does not create parent directories.

**How to avoid:** Add `fs.mkdirSync(outputDir, { recursive: true })` once at startup before the batch loop. `recursive: true` is a no-op if the directory already exists.

---

## Code Examples

Verified patterns from official sources:

### Anthropic SDK — messages.create (CJS)

```javascript
// Source: https://platform.claude.com/docs/en/api/sdks/typescript (verified 2026-03-20)
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();
// Reads ANTHROPIC_API_KEY from env automatically

const message = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 2048,
  system: 'Your system prompt here.',
  messages: [{ role: 'user', content: 'User message here.' }]
});

const text = message.content[0].text;
```

### Anthropic SDK — error handling

```javascript
// Source: https://platform.claude.com/docs/en/api/sdks/typescript (verified 2026-03-20)
const Anthropic = require('@anthropic-ai/sdk');

try {
  const response = await client.messages.create({ /* ... */ });
} catch (err) {
  if (err instanceof Anthropic.RateLimitError) {
    // 429 — SDK already retried twice; log and mark as failed
  } else if (err instanceof Anthropic.APIConnectionError) {
    // Network failure
  } else if (err instanceof Anthropic.InternalServerError) {
    // 5xx — SDK already retried twice
  } else {
    throw err; // unexpected
  }
}
```

### SDK auto-retry configuration

```javascript
// Source: https://platform.claude.com/docs/en/api/sdks/typescript (verified 2026-03-20)
const client = new Anthropic({
  maxRetries: 2,   // default — retries 429, 408, 409, 5xx
  timeout: 60000   // 60 seconds per request
});
```

### node:test pattern (matching extractor)

```javascript
// Source: extractor/tests/extractor.test.js (established project pattern)
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildMarkdown } = require('../markdown.js');

describe('buildMarkdown', () => {
  it('includes YAML frontmatter with lectureTitle', () => {
    const transcript = { lectureTitle: 'What is a Project', sectionName: 'Intro', transcript: '...' };
    const result = buildMarkdown(transcript, '## Key Concepts\n- **Project**: A temporary endeavor.');
    assert.ok(result.startsWith('---\n'), 'Should start with frontmatter');
    assert.ok(result.includes('lectureTitle: "What is a Project"'));
  });
});
```

### Manifest read/write

```javascript
// Source: project design — uses only built-in node:fs
const fs = require('node:fs');
const MANIFEST_PATH = require('node:path').join(__dirname, 'processing-state.json');

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};  // first run — no manifest yet
  }
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `fetch` + `x-api-key` header | `@anthropic-ai/sdk` client | SDK v1.0 (2023) | Retry, error types, streaming built-in |
| `claude-3-haiku` model IDs | `claude-haiku-4-5` | 2025 | Faster, cheaper, higher ITPM limits |
| Separate API calls per content type | Single structured call with all sections | Project decision | 3x cost reduction at scale |
| `node:test` was experimental | Stable in Node.js 20 LTS | Node 20 (2023-04) | No external test runner needed |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Deprecated; use `claude-haiku-4-5`
- `claude-3-5-sonnet-20241022`: Deprecated per Anthropic docs
- Manual `anthropic-version` header: SDK sets it automatically

---

## Open Questions

1. **Which model to use by default**
   - What we know: `claude-haiku-4-5` is fastest and cheapest; Tier 1 ITPM limit is 50K (vs. 30K for Sonnet 4.x). For a 1000-word transcript + 2K output, each call consumes ~1500 input + 2000 output tokens — well within limits.
   - What's unclear: User's Anthropic account tier is unknown. Haiku produces sufficient quality for study notes; Sonnet produces higher quality.
   - Recommendation: Default to `claude-haiku-4-5`; allow override via `PMI_MODEL` environment variable. Document the tradeoff in `--dry-run` output or a startup banner.

2. **Concurrency — sequential vs. limited parallel**
   - What we know: Sequential is safe at all tiers. At Tier 1 (50 RPM), processing 100 lectures sequentially at ~3s/call takes ~5 minutes — acceptable. Limited parallel (2-3) would cut time to ~2 minutes.
   - What's unclear: User's API tier.
   - Recommendation: Sequential first (simpler, correct, adequate). If user finds it too slow, parallelism can be added as a `--concurrency N` flag in a later iteration.

3. **API response validation strictness**
   - What we know: The system prompt can strongly constrain output format, but LLMs occasionally deviate.
   - What's unclear: How often Claude Haiku will produce non-conforming output for typical PMI lecture transcripts.
   - Recommendation: Soft validation in Phase 2 — log a warning if expected headers are missing, but write the file anyway. Hard validation (retry or fail) can be added if quality issues surface during pilot run.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node.js 20+) |
| Config file | None — invoked directly |
| Quick run command | `node --test processor/tests/` |
| Full suite command | `node --test processor/tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROC-01 | `buildMarkdown()` produces YAML frontmatter + correct sections | unit | `node --test processor/tests/markdown.test.js` | Wave 0 |
| PROC-01 | `buildMessages()` includes lectureTitle, sectionName, transcript in prompt | unit | `node --test processor/tests/prompt.test.js` | Wave 0 |
| PROC-04 | `loadManifest()` returns `{}` when no manifest exists | unit | `node --test processor/tests/manifest.test.js` | Wave 0 |
| PROC-04 | `saveManifest()` writes valid JSON; `loadManifest()` round-trips | unit | `node --test processor/tests/manifest.test.js` | Wave 0 |
| PROC-04 | Processing loop skips entries with `status: "complete"` | unit | `node --test processor/tests/manifest.test.js` | Wave 0 |
| PROC-04 | `--force` flag causes skipping logic to be bypassed | unit | `node --test processor/tests/manifest.test.js` | Wave 0 |
| PROC-04 | Failed lecture sets `status: "failed"` and saves manifest | unit | `node --test processor/tests/manifest.test.js` | Wave 0 |
| PROC-05 | Single `messages.create` call per lecture (API call count assertion) | unit w/ mock | `node --test processor/tests/processor.test.js` | Wave 0 |
| PROC-05 | API response text lands in correct markdown sections | unit | `node --test processor/tests/markdown.test.js` | Wave 0 |

**Note on API tests:** Tests involving the Anthropic API should use a mock/stub. The real API is exercised during the Phase 2 pilot smoke test (5-10 lectures), not in automated unit tests.

### Sampling Rate

- **Per task commit:** `node --test processor/tests/`
- **Per wave merge:** `node --test processor/tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `processor/tests/manifest.test.js` — covers PROC-04 (manifest read/write/update/skip logic)
- [ ] `processor/tests/markdown.test.js` — covers PROC-01, PROC-05 (markdown builder, frontmatter)
- [ ] `processor/tests/prompt.test.js` — covers PROC-01 (prompt construction)
- [ ] `processor/tests/processor.test.js` — covers PROC-05 (single-call assertion with mocked Anthropic client)
- [ ] `processor/package.json` — with `@anthropic-ai/sdk` dependency and `node --test` script

---

## Sources

### Primary (HIGH confidence)

- `@anthropic-ai/sdk` npm registry — version 0.80.0, published 2026-03-18 (verified via `npm view @anthropic-ai/sdk version`)
- https://platform.claude.com/docs/en/api/sdks/typescript — SDK usage, CJS interop, error handling, retry configuration, timeout defaults
- https://platform.claude.com/docs/en/api/rate-limits — Tier 1 RPM/ITPM/OTPM limits for all model classes; 429 retry-after header; token bucket algorithm
- https://platform.claude.com/docs/en/api/messages — `messages.create` parameters, response structure, model IDs
- `extractor/cleaning.js`, `extractor/tests/extractor.test.js` — established CommonJS + `node:test` patterns for this project

### Secondary (MEDIUM confidence)

- https://platform.claude.com/docs/en/api/getting-started — model IDs (claude-haiku-4-5, claude-sonnet-4-6, claude-opus-4-6); basic request/response structure

### Tertiary (LOW confidence)

None — all critical claims verified against official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry (2026-03-20)
- Architecture: HIGH — patterns derived from official SDK docs and established project conventions
- Pitfalls: HIGH — ESM/CJS interop and rate limits verified against official docs; manifest atomicity is a known Node.js pattern

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (Anthropic SDK and model IDs change frequently; re-verify model IDs before implementation)
