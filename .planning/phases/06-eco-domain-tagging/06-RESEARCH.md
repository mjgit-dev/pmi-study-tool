# Phase 6: ECO Domain Tagging - Research

**Researched:** 2026-03-21
**Domain:** Prompt engineering, manifest schema extension, YAML frontmatter mutation, CLI re-classification pass, compiler system-prompt extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENHA-01 | Processor classifies each lecture as People, Process, or Business Environment and stores the tag in the manifest and per-lecture YAML frontmatter | ECO tag prompt pattern documented; frontmatter write/rewrite strategy documented; manifest schema extension (schemaVersion: 2) documented |
| ENHA-06 | User can run a re-classification pass that adds ECO tags to already-processed lectures without regenerating notes, questions, or flashcards | Dedicated `eco-tag.js` module pattern documented; AI called only for classification (not notes/Q/flashcards); frontmatter patch strategy documented |
| ENHA-04 | After processing (or re-classification), CLI shows a per-domain lecture count (e.g. People: 12 / Process: 20 / Business Environment: 8) | Domain count pattern: scan manifest ecoTag fields; output format documented |
| ENHA-05 | Compiled CLAUDE_INSTRUCTIONS.md includes ECO domain weight percentages and a per-domain lecture breakdown to guide study emphasis | ECO_WEIGHTS config constant pattern documented; buildSystemPrompt injection point identified in compiler/system-prompt.js |
</phase_requirements>

---

## Summary

Phase 6 adds PMI ECO domain classification to the pipeline. The PMI Exam Content Outline (ECO) divides exam content across three domains: People (42%), Process (50%), and Business Environment (8%) — with a scheduled weight change to 33%/41%/26% on July 9, 2026. Every lecture must be tagged as one of these three domains.

The phase has two distinct integration points. First, during normal processing in `processor.js`, each lecture receives an ECO tag alongside its notes/questions/flashcards — this tag is written to YAML frontmatter and the manifest. Second, a dedicated re-classification command (`eco-tag.js`) allows tagging already-processed lectures using a minimal AI call that touches only the ECO classification, never regenerating content.

Domain counts surface in two places: a per-domain summary line printed by the CLI after each processor or re-tagger run, and a domain breakdown table injected into `CLAUDE_INSTRUCTIONS.md` by the compiler. The manifest schema is bumped to `schemaVersion: 2` (first phase to write new manifest fields), with null-guards on all new fields for backward compatibility.

**Primary recommendation:** Implement ECO tagging as a separate minimal AI call (not merged into the main content generation prompt) — this keeps the re-classification pass clean and prevents any risk of content regeneration.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.80.0 (installed) | ECO classification API call | Already in use; `messages.create` with a minimal prompt |
| node:fs | built-in | Read/write frontmatter and manifest | Established pattern throughout codebase |
| node:path | built-in | Path resolution | Established pattern |
| node:test | built-in | Unit + integration tests | Project standard — no Jest |

### No New Dependencies Required
This phase introduces no new npm packages. All functionality is achievable with the existing Anthropic SDK, Node.js built-ins, and established project patterns.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Module Structure

```
processor/
├── processor.js         # existing — add ECO tag step to processing loop
├── prompt.js            # existing — unchanged (content generation prompt)
├── eco-prompt.js        # NEW — builds minimal ECO classification prompt
├── eco-tagger.js        # NEW — standalone re-classification CLI entry point
├── manifest.js          # existing — unchanged (schemaVersion: 2 written by processor)
├── markdown.js          # existing — add ecoTag param to buildMarkdown()
└── tests/
    ├── eco-prompt.test.js   # NEW
    ├── eco-tagger.test.js   # NEW
    └── processor.test.js    # MODIFIED — add ecoTag assertions

compiler/
├── compiler.js          # existing — pass ecoTag data to buildSystemPrompt()
├── system-prompt.js     # existing — MODIFIED: accept ECO stats, inject domain table
└── tests/
    └── system-prompt.test.js  # MODIFIED
```

### Pattern 1: ECO Classification as a Separate Minimal Prompt

**What:** A dedicated `eco-prompt.js` builds a small prompt that sends only the lecture title, section name, and transcript to the AI and expects a single-word response: `People`, `Process`, or `Business Environment`.

**When to use:** Both during normal processing (called after main content generation, same API client) and during the re-classification pass.

**Why separate:** Keeping ECO tagging isolated from the main content prompt (a) prevents the re-classification pass from touching existing content, (b) makes the ECO prompt testable in isolation, (c) allows the token cost to be minimized (no 8192 max_tokens needed — response is ~5 tokens).

**Example:**
```javascript
// eco-prompt.js
'use strict';

const ECO_DOMAINS = ['People', 'Process', 'Business Environment'];

function buildEcoMessages(transcript) {
  const system = `You are a PMI exam content classifier. Classify the lecture into exactly one PMI ECO domain.

Respond with ONLY one of these three values — no punctuation, no explanation:
People
Process
Business Environment

Definitions:
- People: Leadership, team management, conflict resolution, stakeholder engagement, motivation, emotional intelligence, servant leadership
- Process: Planning, scheduling, budgeting, risk management, procurement, quality management, scope control, change management, execution methods
- Business Environment: Organizational strategy, compliance, benefits realization, governance, external factors, agile transformation, organizational change`;

  const user = `Classify this PMP lecture:

Title: ${transcript.lectureTitle}
Section: ${transcript.sectionName}

Transcript excerpt (first 500 words):
${transcript.transcript.split(' ').slice(0, 500).join(' ')}`;

  return { system, messages: [{ role: 'user', content: user }] };
}

function parseEcoTag(rawResponse) {
  const text = rawResponse.trim();
  if (ECO_DOMAINS.includes(text)) return text;
  // Fuzzy fallback: check if response contains a domain name
  for (const domain of ECO_DOMAINS) {
    if (text.includes(domain)) return domain;
  }
  return null; // caller handles null (retry or mark as untagged)
}

module.exports = { buildEcoMessages, parseEcoTag, ECO_DOMAINS };
```

### Pattern 2: Manifest Schema Extension (schemaVersion: 2)

**What:** Manifest entries gain an `ecoTag` field. A top-level `schemaVersion: 2` is written on first save that includes the new field.

**When to use:** Phase 6 is the designated phase for bumping schema version per STATE.md decision.

**Manifest entry v2 shape:**
```json
{
  "what-is-a-project.json": {
    "filename": "what-is-a-project.json",
    "status": "complete",
    "processedAt": "2026-03-20T23:16:22.127Z",
    "ecoTag": "Process",
    "ecoTaggedAt": "2026-03-21T12:00:00.000Z"
  },
  "schemaVersion": 2
}
```

**Null-guard pattern:** Any code that reads `entry.ecoTag` must treat `null | undefined` as "untagged" — never assume it exists. This allows the re-classifier to operate on a manifest where older entries have no ecoTag field.

### Pattern 3: YAML Frontmatter Patch Strategy

**What:** Adding `ecoTag` to an already-written `.md` file requires reading the file, replacing the frontmatter block, and rewriting.

**When to use:** Re-classification pass (ENHA-06) needs to patch existing files without regenerating body content.

**Pattern:** Read file → use regex to match frontmatter block → insert `ecoTag` line before closing `---` → write back. Do not re-parse the body. The existing `parseFrontmatter()` in `compiler/frontmatter.js` shows the regex to match: `/^---\n([\s\S]*?)\n---\n/`.

```javascript
// Frontmatter patch — inserts ecoTag without touching body
function patchFrontmatterEcoTag(fileContent, ecoTag) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('No frontmatter found');
  const existingFm = match[1];
  // Remove any existing ecoTag line (idempotent)
  const cleaned = existingFm.replace(/^ecoTag:.*\n?/m, '');
  const newFm = `---\n${cleaned}\necoTag: ${JSON.stringify(ecoTag)}\n---\n`;
  return newFm + fileContent.slice(match[0].length);
}
```

### Pattern 4: buildMarkdown() Extension for ecoTag

**What:** `markdown.js`'s `buildMarkdown()` gains an optional `ecoTag` parameter that adds `ecoTag` to the YAML frontmatter during normal processing.

```javascript
// markdown.js — updated signature
function buildMarkdown(transcript, apiText, ecoTag) {
  const fmLines = [
    '---',
    `lectureTitle: ${JSON.stringify(transcript.lectureTitle)}`,
    `sectionName: ${JSON.stringify(transcript.sectionName)}`,
    `processedAt: ${new Date().toISOString()}`,
  ];
  if (ecoTag) {
    fmLines.push(`ecoTag: ${JSON.stringify(ecoTag)}`);
  }
  fmLines.push('---', '');
  return fmLines.join('\n') + apiText.trim() + '\n';
}
```

### Pattern 5: ECO Stats in CLAUDE_INSTRUCTIONS.md

**What:** The compiler reads `ecoTag` from manifest entries, tallies by domain, and passes stats to `buildSystemPrompt()`.

**ECO_WEIGHTS config constant (locked decision from STATE.md):**
```javascript
// ECO domain weights — current exam percentages
// IMPORTANT: PMI exam weights change July 9, 2026 from 42/50/8 to 33/41/26
const ECO_WEIGHTS = {
  current: { People: 42, Process: 50, 'Business Environment': 8 },
  // upcoming: { People: 33, Process: 41, 'Business Environment': 26 } // effective July 9 2026
};
```

**buildSystemPrompt() updated signature:**
```javascript
function buildSystemPrompt(ecoStats) {
  // ecoStats: { People: 12, Process: 20, 'Business Environment': 8 } | null
  // If null (no ECO data yet), omit the domain table
}
```

**Injected section in CLAUDE_INSTRUCTIONS.md:**
```markdown
## ECO Domain Coverage

PMI exam domain weights (current):
- People: 42%
- Process: 50%
- Business Environment: 8%

Lectures in this package by domain:
| Domain | Lectures | Weight |
|--------|----------|--------|
| People | 12 | 42% |
| Process | 20 | 50% |
| Business Environment | 8 | 8% |

When quizzing, weight your question selection proportionally to these domain percentages.
```

### Pattern 6: eco-tagger.js (Re-Classification Pass)

**What:** A standalone CLI entry point that reads already-processed `.md` files, identifies those without an ECO tag (by checking manifest or frontmatter), calls the AI for ECO classification only, and patches both the file and the manifest.

**CLI usage:**
```bash
node processor/eco-tagger.js processor/output/ [--force] [--yes]
```

**Critical safety constraint (from STATE.md):** Must never regenerate notes, questions, or flashcards. The AI call uses `buildEcoMessages()` (not `buildMessages()`), with `max_tokens: 10` to ensure only a tag is returned — not prose.

**Idempotency:** If a file already has `ecoTag` in frontmatter and manifest, skip it unless `--force`.

### Anti-Patterns to Avoid

- **Merging ECO tag into main content prompt:** If the ECO classification is embedded in the main `buildMessages()` prompt output (e.g., "at the top, output your ECO domain, then your notes"), the re-classifier cannot work without regenerating content. Keep them separate.
- **Parsing AI body text for ECO classification:** The AI response to `buildMessages()` is raw markdown that should not be scanned for ECO keywords. Classify via a dedicated call.
- **Storing only the frontmatter tag:** The manifest must also store `ecoTag` — the compiler reads the manifest (not individual frontmatter files) to build stats.
- **Hardcoded weight strings:** ECO percentages must come from the `ECO_WEIGHTS` constant (STATE.md decision) since they change on July 9, 2026.
- **Non-idempotent frontmatter patch:** The patch function must remove any existing `ecoTag` line before inserting the new one, or re-running produces duplicate fields.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom YAML parser | `parseFrontmatter()` already in `compiler/frontmatter.js` | Already tested; sufficient for this project's simple key: value format |
| AI response validation | Complex NLP matching | Simple `ECO_DOMAINS.includes(text.trim())` + fuzzy fallback | Response is constrained to 3 exact strings by the prompt |
| File diffing for frontmatter patch | Full file re-parse | Regex replace on frontmatter block only | Body is never touched; regex is sufficient and safe |
| Schema migration tool | Version-checking loader | `null` guard on `entry.ecoTag` | Backward compat is trivially handled by checking for undefined |

**Key insight:** The AI response validation problem looks complex but isn't — with a well-constrained system prompt and `max_tokens: 10`, the model reliably outputs one of the three exact strings. A simple includes-check plus one fuzzy fallback is sufficient for v1.1.

---

## Common Pitfalls

### Pitfall 1: ECO Tag Contamination from Main Prompt

**What goes wrong:** The developer adds "also output the ECO domain at the top" to the existing `buildMessages()` system prompt. The tag is then parsed out of the AI response. When re-classification runs, it calls `buildMessages()` to get the tag — and regenerates all notes/questions/flashcards.

**Why it happens:** Feels like "one fewer API call."

**How to avoid:** Separate prompts for separate concerns. `buildMessages()` = content generation. `buildEcoMessages()` = ECO classification only. Never mix.

**Warning signs:** `eco-tagger.js` imports `buildMessages` — immediate red flag.

### Pitfall 2: Frontmatter Patch Breaks if File Lacks Trailing Newline After Closing `---`

**What goes wrong:** The regex `/^---\n([\s\S]*?)\n---\n/` requires a newline after the closing `---`. Files written by the current `buildMarkdown()` always have this (it appends `\n`), but if a file was manually edited, this could fail.

**Why it happens:** Regex is fragile to whitespace variants.

**How to avoid:** Add a fallback: if the strict regex fails, try `/^---\n([\s\S]*?)\n---/` and insert a newline before reassembling.

### Pitfall 3: ECO Stats Missing from Compiler When Manifest Not Available

**What goes wrong:** Compiler reads `processor/output/*.md` files (not the manifest) and the manifest isn't in scope. ECO stats are undefined; `buildSystemPrompt()` crashes or omits the section silently.

**Why it happens:** Compiler reads frontmatter from `.md` files (not manifest). ECO tag IS in frontmatter — but compiler needs to collect it from parsed lectures.

**How to avoid:** Compiler already parses frontmatter for `lectureTitle` and `sectionName`. Simply add `ecoTag: fm.ecoTag || null` to the lecture object during compilation. No manifest read needed — frontmatter is the source of truth for the compiler.

**Warning signs:** `buildSystemPrompt()` receives `null` for ecoStats when lectures have tags.

### Pitfall 4: Re-Classifier Overwrites Output File While Processor Is Running

**What goes wrong:** User runs eco-tagger on same output directory while processor is mid-batch. Race condition corrupts a `.md` file.

**Why it happens:** Both tools write to `processor/output/`.

**How to avoid:** Document that these tools must not run concurrently. No file locking needed for v1.1 (single-user, sequential workflow). Add a warning to CLI output.

### Pitfall 5: July 9, 2026 Weight Changeover Not Handled

**What goes wrong:** ECO_WEIGHTS constant is hardcoded to `42/50/8`. After July 9, 2026, the compiled CLAUDE_INSTRUCTIONS.md shows stale weights.

**Why it happens:** No mechanism to select the active weight set.

**How to avoid:** Define `ECO_WEIGHTS` with a `current` key and comment listing the upcoming change date. In v1.1, `current` is the only active set. Updating for July 2026 is a one-line change when the time comes — acceptable for v1.1.

---

## Code Examples

Verified patterns from codebase analysis:

### Existing Manifest Entry Shape (v1)
```json
{
  "what-is-a-project.json": {
    "filename": "what-is-a-project.json",
    "status": "complete",
    "processedAt": "2026-03-20T23:16:22.127Z"
  }
}
```

### Existing Frontmatter Shape (from processor/output/)
```
---
lectureTitle: "What is a Project"
sectionName: "Introduction to Project Management"
processedAt: 2026-03-20T23:16:22.127Z
---
```

### Existing parseFrontmatter() — already handles ecoTag without modification
```javascript
// compiler/frontmatter.js — parses any key: value pair
// If ecoTag is written to frontmatter, parseFrontmatter already returns it:
const fm = parseFrontmatter(content);
// fm.ecoTag === 'Process'  (if present)
// fm.ecoTag === undefined  (if absent — older files)
```

### Existing buildMarkdown() call site in processor.js
```javascript
// processor.js line 147-148 — change site for ENHA-01
const md = buildMarkdown(transcript, apiText);        // current
const md = buildMarkdown(transcript, apiText, ecoTag); // phase 6
```

### Compiler lecture object extension for ECO stats
```javascript
// compiler.js — existing lecture push (lines 47-57)
lectures.push({
  filename,
  lectureTitle: fm.lectureTitle,
  sectionName: fm.sectionName,
  processedAt: fm.processedAt,
  ecoTag: fm.ecoTag || null,  // ADD THIS (Phase 6)
  notes,
  quiz
});
```

### Domain Count Display (ENHA-04)
```javascript
function printEcoDomainSummary(manifest) {
  const counts = { People: 0, Process: 0, 'Business Environment': 0, untagged: 0 };
  for (const entry of Object.values(manifest)) {
    if (entry && entry.ecoTag && counts[entry.ecoTag] !== undefined) {
      counts[entry.ecoTag]++;
    } else if (entry && entry.status === 'complete') {
      counts.untagged++;
    }
  }
  const parts = ['People', 'Process', 'Business Environment']
    .map(d => `${d}: ${counts[d]}`);
  if (counts.untagged > 0) parts.push(`Untagged: ${counts.untagged}`);
  console.log(parts.join(' / '));
}
// Example output: People: 12 / Process: 20 / Business Environment: 8
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No ECO domain awareness | ECO tag per lecture in manifest + frontmatter | Phase 6 | Study instructions reflect actual exam domain distribution |
| Static system prompt | Dynamic system prompt with ECO domain table | Phase 6 | Claude Projects knows which domain each lecture belongs to |
| schemaVersion absent | schemaVersion: 2 | Phase 6 | Enables future schema migration tooling |

**ECO weight schedule:**
- Current (through July 8, 2026): People 42% / Process 50% / Business Environment 8%
- Upcoming (July 9, 2026+): People 33% / Process 41% / Business Environment 26%
- Source: PMI Exam Content Outline (ECO), documented in STATE.md decisions

---

## Open Questions

1. **ECO tag reliability — how often does the AI misclassify?**
   - What we know: With a constrained 3-option prompt and concrete per-domain definitions, Claude models reliably produce one of the valid strings
   - What's unclear: Whether lecture titles and transcripts in this specific PMP course are ambiguous enough to cause frequent misclassification
   - Recommendation: STATE.md watch item says "Verify LLM ECO tag output reliability with 3-5 real transcripts before building full validation layer." Run the eco-prompt against the 2 existing transcripts as a smoke test before locking the prompt.

2. **Should eco-tagger be a separate CLI or a flag on processor.js?**
   - What we know: Phase requirement says "user can run a re-classification command" — implies separate command
   - What's unclear: Whether it should be `node eco-tagger.js <dir>` or `node processor.js <dir> --retag`
   - Recommendation: Separate file (`eco-tagger.js`) keeps concerns isolated and simplifies testing. The re-classification logic is distinct enough to warrant its own entry point.

3. **What happens to compiler if some lectures have ecoTag and some don't?**
   - What we know: Frontmatter `ecoTag` will be absent on older `.md` files until re-tagged
   - What's unclear: Should compiler omit the domain table if any lectures are untagged, or show partial counts?
   - Recommendation: Show partial counts with an "Untagged: N" line in the domain table. Never crash on missing ecoTag — always null-guard.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in) |
| Config file | none — run via `node --test tests/*.test.js` |
| Quick run command | `node --test processor/tests/eco-prompt.test.js` |
| Full suite command | `node --test processor/tests/*.test.js && node --test compiler/tests/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENHA-01 | `buildMarkdown()` includes `ecoTag` in frontmatter when provided | unit | `node --test processor/tests/markdown.test.js` | Exists — MODIFIED |
| ENHA-01 | `buildEcoMessages()` returns valid system+messages shape | unit | `node --test processor/tests/eco-prompt.test.js` | Wave 0 |
| ENHA-01 | `parseEcoTag()` returns correct domain for all 3 valid strings | unit | `node --test processor/tests/eco-prompt.test.js` | Wave 0 |
| ENHA-01 | `parseEcoTag()` returns null for invalid/empty response | unit | `node --test processor/tests/eco-prompt.test.js` | Wave 0 |
| ENHA-01 | `processAll()` calls ECO API and writes ecoTag to manifest + frontmatter | integration | `node --test processor/tests/processor.test.js` | Exists — MODIFIED |
| ENHA-06 | `eco-tagger.js` skips lectures that already have ecoTag (idempotent) | integration | `node --test processor/tests/eco-tagger.test.js` | Wave 0 |
| ENHA-06 | `eco-tagger.js` patches frontmatter without modifying notes/questions/flashcards body | integration | `node --test processor/tests/eco-tagger.test.js` | Wave 0 |
| ENHA-06 | `eco-tagger.js --force` re-tags already-tagged lectures | integration | `node --test processor/tests/eco-tagger.test.js` | Wave 0 |
| ENHA-06 | `patchFrontmatterEcoTag()` inserts ecoTag line without duplicating | unit | `node --test processor/tests/eco-tagger.test.js` | Wave 0 |
| ENHA-04 | Domain count summary printed after processing (People: N / Process: N / Business Environment: N) | integration | `node --test processor/tests/processor.test.js` | Exists — MODIFIED |
| ENHA-05 | `buildSystemPrompt(ecoStats)` includes domain weight table when ecoStats provided | unit | `node --test compiler/tests/system-prompt.test.js` | Exists — MODIFIED |
| ENHA-05 | `buildSystemPrompt(null)` omits domain table gracefully | unit | `node --test compiler/tests/system-prompt.test.js` | Exists — MODIFIED |
| ENHA-05 | `compileAll()` passes ecoStats to buildSystemPrompt() | integration | `node --test compiler/tests/compiler.test.js` (if exists) | check |

### Sampling Rate
- **Per task commit:** `node --test processor/tests/eco-prompt.test.js` (new file for that task)
- **Per wave merge:** `node --test processor/tests/*.test.js && node --test compiler/tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `processor/tests/eco-prompt.test.js` — covers `buildEcoMessages()` and `parseEcoTag()` (ENHA-01)
- [ ] `processor/tests/eco-tagger.test.js` — covers frontmatter patch, idempotency, --force (ENHA-06)
- No framework install needed — node:test is built-in to Node v24

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `processor/processor.js`, `processor/manifest.js`, `processor/prompt.js`, `processor/markdown.js`, `processor/estimate.js` — full source reviewed
- Direct codebase read: `compiler/compiler.js`, `compiler/frontmatter.js`, `compiler/builder.js`, `compiler/system-prompt.js` — full source reviewed
- Direct codebase read: `processor/processing-state.json` — current manifest schema confirmed
- Direct codebase read: `processor/output/what-is-a-project.md` — current frontmatter format confirmed
- `.planning/STATE.md` — locked decisions: schemaVersion: 2, ECO_WEIGHTS config constant, re-classification pass isolation

### Secondary (MEDIUM confidence)
- PMI ECO weight percentages (42/50/8 current, 33/41/26 from July 9 2026) — from STATE.md and PROJECT.md; PMI source not verified this session but documented as a project decision
- Anthropic SDK `@anthropic-ai/sdk` version 0.80.0 — verified from `processor/node_modules/@anthropic-ai/sdk/package.json`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing libraries confirmed
- Architecture: HIGH — patterns derived from direct reading of all relevant source files
- Pitfalls: HIGH — derived from actual code structure (frontmatter regex, manifest schema, existing test patterns)
- ECO weights: MEDIUM — documented in STATE.md as locked decision; PMI primary source not re-verified this session

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — only risk is Anthropic SDK minor version bump, unlikely to break patterns used)
