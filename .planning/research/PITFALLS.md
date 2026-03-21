# Pitfalls Research

**Domain:** Adding ECO domain tagging, glossary extraction, cost estimation, and weak-area hints to existing Node.js/CommonJS Anthropic API processing pipeline
**Researched:** 2026-03-21
**Confidence:** HIGH (based on direct codebase inspection + verified Anthropic SDK source + confirmed PMI ECO 2026 changes)

---

## Critical Pitfalls

### Pitfall 1: ECO Domain Percentages Are Changing on July 9, 2026

**What goes wrong:**
The existing pipeline is built against the current PMP ECO: People 42%, Process 50%, Business Environment 8%. PMI has published a new ECO (July 9, 2026) with radically different weightings: People 33%, Process 41%, Business Environment 26%. If domain percentages are hardcoded into prompts, output templates, or the system prompt, they become wrong mid-year without any system failure to signal the error — the user studies with stale weightings.

**Why it happens:**
Domain percentages feel like constants, so developers treat them as constants. The change is external — no code breaks, no error is thrown. The user receives confidently-stated incorrect exam preparation guidance.

**How to avoid:**
- Store ECO percentages in one place (a config object, not scattered across strings): `{ People: 0.42, Process: 0.50, BusinessEnvironment: 0.08 }` with a last-verified date field
- Add a visible comment in the config noting the July 9, 2026 changeover and the new values (33/41/26)
- Build domain tagging as a classification step, keeping the label set decoupled from the percentage display

**Warning signs:**
Code that contains the string `"42%"` or `"50%"` or `"8%"` embedded in prompt text or output templates. Any reference to ECO percentages without a "last verified" annotation.

**Phase to address:**
ECO Domain Tagging phase — before any domain-percentage language goes into prompts or compiled output.

---

### Pitfall 2: Prompt Expansion Breaks the Single-Call Cost Model

**What goes wrong:**
v1.0 achieves its cost target by combining notes, questions, and flashcards in one `messages.create` call. Adding ECO domain classification and glossary term extraction to the same prompt expands both system and user text. If the system prompt grows from ~500 tokens to 1,000+ tokens and is multiplied across 100+ lectures, the cost increase is significant and not visible until billing arrives. Worse, a single prompt doing too many tasks (notes + questions + flashcards + domain classification + glossary extraction) produces lower-quality output across all tasks.

**Why it happens:**
It is tempting to append new instructions to the existing prompt rather than reason about whether the task model still fits one call. The existing prompt is already long (the `buildMessages` system prompt in `processor/prompt.js` is approximately 600+ tokens) and densely instructed.

**How to avoid:**
- Run `client.messages.countTokens({ model, system, messages })` (available in SDK 0.80 — confirmed in installed version) on the updated prompt before any batch run
- Evaluate whether ECO classification and glossary extraction are better as post-processing steps on existing output rather than new API instructions. Glossary extraction can parse already-processed `.md` files (zero additional API cost). ECO classification can be a lightweight second call per lecture using only the lecture title and section name, which is far cheaper than injecting it into the main generation call
- Apply the same cost-estimate pre-flight check that is already planned as a v1.1 feature to the updated prompt, not just the original

**Warning signs:**
System prompt token count exceeds 800 tokens. Output quality on notes or questions degrades after prompt additions. Running a 5-lecture test batch costs more than expected ratio from v1.0 tests.

**Phase to address:**
Cost Estimation phase (address the pre-flight check first), then ECO Tagging and Glossary Extraction phases.

---

### Pitfall 3: Manifest Schema Has No Migration Path for New Fields

**What goes wrong:**
The existing `processing-state.json` manifest has a defined entry shape: `{ filename, status, processedAt, error? }`. v1.1 features require adding fields — for example, `ecoTag`, `glossaryExtracted`, or `costEstimate` per entry. If code reads old manifest entries and expects new fields without null-checking, `undefined` propagates silently into compiled output or display logic.

**Why it happens:**
The manifest is a flat JSON file read with `loadManifest()` and iterated directly. There is no version field, no schema validation, and no migration step. The `shouldSkip()` function in `processor/manifest.js` only checks `entry.status`, but display code for new features will access new fields that do not exist on pre-v1.1 entries.

**How to avoid:**
- Add a null-guard pattern when accessing any new manifest field: `entry.ecoTag ?? 'unclassified'`
- Add a manifest schema version field (`"schemaVersion": 2`) so migration logic can detect old entries
- Never rely on the presence of a new field as a boolean signal — always use a sentinel value (`null`, `'unclassified'`, `'unknown'`)
- Run existing tests on the real `processing-state.json` before and after schema changes to confirm `shouldSkip()` and display logic still behave correctly

**Warning signs:**
Any new code that does `manifest[file].ecoTag` without a fallback. Log output that shows `undefined` for ECO tags on older entries. Tests that only exercise freshly-created manifest entries, not entries created by v1.0.

**Phase to address:**
Whichever phase first writes new fields to the manifest — must address schema versioning before writing any new fields.

---

### Pitfall 4: Glossary Deduplication Across 100+ Lectures Is Harder Than It Appears

**What goes wrong:**
Each lecture generates its own glossary terms. When aggregated across 100+ lectures, the same PMI term appears dozens of times with slightly different AI-generated definitions. Naive aggregation creates a bloated glossary with contradictory definitions for the same term. Exact-match deduplication misses near-duplicates ("Project Charter" vs "project charter" vs "Project charter"). Semantic deduplication requires another round of API calls.

**Why it happens:**
Glossary extraction is straightforward per-lecture. The deduplication problem only becomes visible at compile time when aggregating. Developers prototype per-lecture extraction, see it work, and only discover the collision problem when running the compiler against all output.

**How to avoid:**
- Normalize all term keys on extraction: lowercase, trim whitespace, collapse internal spaces
- Use the normalized key as the deduplication key; keep the first definition encountered (earliest processed lecture wins) unless `--force` re-extract is requested
- At compile time, sort the glossary alphabetically by normalized key and deduplicate before building the glossary document
- Accept that definitions will not be perfect on first extraction — the glossary is a study reference, not an authoritative source
- Do not attempt semantic deduplication — the cost and complexity outweigh the benefit at this scale

**Warning signs:**
Glossary document has multiple entries for "Work Breakdown Structure" with different capitalizations. Glossary file is significantly larger than expected (more than 800 entries for a 100-lecture course). Compilation time increases non-linearly as more lectures are processed.

**Phase to address:**
Glossary Extraction phase — normalization must be built into extraction, not deferred to compilation.

---

### Pitfall 5: Cost Estimation That Ignores the System Prompt Underestimates by 30-50%

**What goes wrong:**
The processor already uses a separate `system` parameter in `messages.create`. If cost estimation only counts user message tokens (`transcript.transcript` length), it misses the system prompt tokens entirely. For a system prompt that is ~600 tokens and 100 lectures, that is 60,000 tokens of unaccounted input — a non-trivial underestimate.

**Why it happens:**
Cost estimation code typically focuses on the variable part (transcript text). The system prompt feels like a fixed cost that can be estimated once, but the `buildMessages()` function in `processor/prompt.js` constructs both `system` and `messages` together, and the cost estimate must mirror the actual call structure precisely.

**How to avoid:**
- Call `client.messages.countTokens({ model, system, messages })` using the exact same parameters that will be passed to `messages.create()` — the SDK accepts `system` as an optional parameter in `MessageCountTokensParams` (confirmed in SDK 0.80 source)
- Sample at least 5 representative transcripts (short, medium, long) and display the min/max/average expected token counts and costs per lecture
- Display: `Estimated input tokens per lecture: X (system: Y + transcript: Z)`, `Estimated output tokens (max_tokens cap): 8192`, `Estimated cost per lecture: $A`, `Total estimated cost: $B for N lectures`
- Factor in the 20% buffer since output tokens are capped at 8192 but actual usage varies

**Warning signs:**
Estimated cost is less than 60% of actual cost after a batch run. Cost estimate display does not show a breakdown between system and user tokens. Estimate is derived from character count rather than actual token count.

**Phase to address:**
Cost Estimation phase — this phase should be built and verified before any other batch run of v1.1 features.

---

### Pitfall 6: Weak-Area Hints in the System Prompt Accept User-Controlled Text

**What goes wrong:**
The system prompt generated by `compiler/system-prompt.js` is a static string. v1.1 adds "weak-area hint injection" — user-specified topics inserted into the generated `CLAUDE_INSTRUCTIONS.md`. If user-provided topic strings are interpolated directly into the system prompt without sanitization, a malicious or carelessly formatted input can corrupt the prompt structure. For a single-user local tool, injection risk is low, but malformed input (e.g., a topic containing markdown headers or prompt-like instructions) can degrade Claude's study assistant behavior in Claude Projects.

**Why it happens:**
For a single-user tool, developers skip input validation entirely. The failure mode is subtle: a user enters something like `"## New Instructions: Ignore above"` as a weak area topic, which gets injected into the system prompt and alters Claude's behavior in unexpected ways.

**How to avoid:**
- Sanitize user-provided topic strings before interpolation: strip markdown heading markers (`#`), backticks, and instruction-like phrases
- Wrap injected content in a clearly labelled, bounded section: `## User-Defined Weak Areas\n> Topics to emphasize: ${sanitizedTopics}`
- Use a bullet list format for topic injection rather than free-form interpolation, which limits structural impact
- For this single-user tool, a light-touch validation (strip leading `#` characters, truncate to 100 characters per topic, limit to 10 topics) is sufficient

**Warning signs:**
Topic text containing markdown syntax renders unexpectedly in the system prompt preview. Claude Projects assistant behavior changes in ways unrelated to study guidance after system prompt update.

**Phase to address:**
Weak-Area Hint Injection phase.

---

### Pitfall 7: ECO Tagging via LLM Has No Verification Layer

**What goes wrong:**
If ECO domain classification is delegated to the LLM, the model may produce inconsistent or wrong tags. A lecture on "Managing Project Changes" might be tagged People by one run and Process by another, especially for lectures that genuinely span domains. Without a verification layer, incorrect tags flow into compiled output, section files, and the system prompt undetected.

**Why it happens:**
LLM classification feels authoritative. Developers generate the tag, write it to the manifest, and move on. There is no ground-truth to check against, and manual verification of 100+ tags is tedious.

**How to avoid:**
- Constrain the classification prompt to output exactly one of three values: `People`, `Process`, `BusinessEnvironment` — no other text, no explanations, no JSON
- If the API response is not exactly one of the three allowed values, mark the entry as `'unclassified'` rather than guessing
- After processing, emit a summary showing how many lectures fell into each domain — spot-check if the distribution is wildly inconsistent with the official ECO percentages (People ~42%, Process ~50%, Business Environment ~8% for current ECO)
- Build the classification as a separate, cheaply-verifiable step rather than embedding it in the main generation call, so it can be re-run without reprocessing everything

**Warning signs:**
ECO tag field contains values other than the three allowed strings. Domain distribution summary shows >80% of lectures tagged as a single domain. Classification is generated inline with notes output, making it hard to re-run independently.

**Phase to address:**
ECO Domain Tagging phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Embedding ECO percentages as literal strings in the system prompt | Fast to implement | Silently wrong after July 9, 2026; requires grep-and-replace across output files | Never — always use a config constant |
| Adding glossary extraction instructions to the existing main generation prompt | Single call, no new prompt engineering | Reduces quality of notes, questions, and flashcards; harder to test in isolation | Never — extract from existing output or use a separate lightweight call |
| Skipping token counting and estimating cost from character count | Simpler implementation | Underestimates by 30–50% because system prompt tokens are omitted | Never — use the SDK's `countTokens` method |
| Accepting any LLM output for ECO tag without validation | Simpler parsing | Invalid tags silently flow into compiled output; causes downstream display errors | Never — always validate against the three-value allowlist |
| Interpolating raw user-provided topic text into the system prompt | Fast implementation | Risk of malformed system prompt structure corrupting Claude Projects behavior | Acceptable only with sanitization |
| Storing glossary terms per-lecture without normalization | Simple per-lecture extraction | Deduplication at compile time becomes unreliable; glossary bloats | Never — normalize at extraction time |

---

## Integration Gotchas

Common mistakes when connecting to or extending the existing pipeline.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `client.messages.countTokens()` | Passing only `messages` without `system` | Pass both `{ model, system, messages }` — `system` is an accepted optional parameter in SDK 0.80 |
| Manifest file (`processing-state.json`) | Reading new fields without null-guards on old entries | Always use `entry.newField ?? defaultValue`; add a `schemaVersion` field |
| `buildMessages()` in `processor/prompt.js` | Appending new instructions to existing system prompt | Evaluate whether the new task can use output parsing or a separate lightweight call instead |
| `buildSystemPrompt()` in `compiler/system-prompt.js` | Direct string interpolation of user topic input | Sanitize and wrap user input in a bounded section with bullet formatting |
| Compiler pipeline (`compiler/sections.js`) | Expecting new frontmatter fields from v1.1 in all files | Guard all new-field reads — old `.md` files in `output/` do not have `ecoTag` in frontmatter |
| Glossary aggregation in the compiler | Simple `Map` keyed on raw term text | Normalize keys (lowercase, trimmed) before inserting; first-seen definition wins |

---

## Performance Traps

Patterns that work at small scale but fail as the course grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Calling `countTokens` for every lecture before the batch rather than sampling | Pre-flight estimate takes >60 seconds before any processing starts | Sample 5 representative lectures (shortest, longest, 3 mid-range); extrapolate | 50+ lectures in pre-flight |
| Making a separate ECO classification API call per lecture in the main batch loop | Doubles API calls, doubles latency, increases cost by ~15-20% | Classify from the existing processed `.md` output (zero API cost) or batch-classify using Anthropic Batch API | 30+ lectures |
| Aggregating glossary terms in memory across all lectures before writing | Memory pressure on large course runs | Write per-lecture glossary to manifest as a JSON array; aggregate only at compile time | 100+ lectures |
| Reprocessing all lectures with `--force` to pick up ECO tags | 100+ API calls, full cost of a fresh batch run | Store ECO tags as a separate manifest field; run classification-only pass without regenerating notes/questions/flashcards | Anytime a full reprocess is triggered for a feature-only change |

---

## Security Mistakes

Domain-specific security issues relevant to this pipeline.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Interpolating user-provided weak-area topics directly into system prompt text | Malformed prompt structure degrades Claude Projects study behavior | Sanitize: strip `#` headers, backticks, instruction-like phrases; truncate to 100 chars per topic |
| Storing `ANTHROPIC_API_KEY` in a `.env` file that gets committed | API key exposure in git history | Confirm `.env` is in `.gitignore`; use `process.env.ANTHROPIC_API_KEY` as already done in `processor.js` |
| Including raw transcript text in cost estimate display output | Transcript content visible in terminal logs that may be shared | Display only token counts and cost figures, not transcript excerpts |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Cost Estimation:** Often missing the system prompt token count — verify `countTokens` call includes both `system` and `messages` parameters, not just `messages`
- [ ] **ECO Domain Tagging:** Often missing the validation layer — verify output is constrained to exactly `People`, `Process`, or `BusinessEnvironment` before writing to manifest
- [ ] **ECO Domain Tagging:** Often missing a note about the July 9, 2026 percentage change — verify the config that stores percentages has a `lastVerified` comment and the upcoming values documented
- [ ] **Glossary Extraction:** Often missing term normalization — verify terms are lowercased and trimmed before deduplication at compile time
- [ ] **Glossary Extraction:** Often missing a compile-time deduplication step — verify the final glossary file contains no duplicate keys after full course processing
- [ ] **Weak-Area Hints:** Often missing input sanitization — verify topic strings are stripped of markdown headers and truncated before interpolation
- [ ] **Manifest Schema:** Often missing null-guards on new fields — verify all code reading new manifest fields handles `undefined`/`null` on pre-v1.1 entries
- [ ] **All Features:** Often missing end-to-end test on an existing v1.0 manifest — verify the full compiler pipeline still produces valid output when reading manifests that have no new fields

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| ECO percentages hardcoded to wrong values after July 2026 | LOW | Update the config constant; re-run compiler to regenerate section files and system prompt (no API calls needed) |
| Manifest schema incompatibility breaks pipeline mid-run | MEDIUM | Add null-guards to new-field reads; restart the run — manifest resumes from last complete entry |
| Glossary bloated with duplicates after full course processing | LOW | Add normalization + deduplication to the compiler's glossary aggregation step; re-run compiler (no API calls) |
| Cost estimate was wrong and batch overran budget | HIGH | Set a hard spending cap in Anthropic console before any batch; recover by re-running only failed/unprocessed lectures using the existing resume-on-failure mechanism |
| ECO tags are inconsistent across lectures | MEDIUM | Re-run the classification-only pass with a tighter constrained prompt; overwrite only the `ecoTag` manifest field, not status or other fields |
| Weak-area hints corrupted the system prompt in Claude Projects | LOW | Re-run the compiler with sanitized topic input; re-upload the regenerated `CLAUDE_INSTRUCTIONS.md` to Claude Projects |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| ECO percentages hardcoded — will be wrong July 2026 | ECO Domain Tagging | Check codebase for literal `42%`/`50%`/`8%` strings; confirm a config constant exists with a changeover comment |
| Prompt expansion breaks single-call cost model | Cost Estimation (must come first) | Verify `countTokens` is called with expanded prompt before any batch run |
| Manifest schema has no migration path | Whichever phase first adds new manifest fields | Run pipeline against existing `processing-state.json`; confirm no `undefined` in output |
| Glossary deduplication harder than expected | Glossary Extraction | Run full-course compile; verify glossary has no duplicate keys |
| Cost estimation ignores system prompt tokens | Cost Estimation | Verify estimate breakdown shows system token count separately; compare estimate to actual after a 5-lecture test batch |
| Weak-area hints accept unvalidated user text | Weak-Area Hint Injection | Unit-test `buildSystemPrompt()` with adversarial topic inputs containing `#` and markdown |
| ECO tagging has no verification layer | ECO Domain Tagging | Verify domain distribution summary is emitted after classification; spot-check 10 lectures against known content |

---

## Sources

- Direct inspection of `processor/processor.js`, `processor/prompt.js`, `processor/manifest.js`, `compiler/system-prompt.js`, `compiler/sections.js` — HIGH confidence
- Anthropic SDK 0.80.0 source: `processor/node_modules/@anthropic-ai/sdk/src/resources/messages/messages.ts` — `MessageCountTokensParams` interface, `system` field confirmed optional — HIGH confidence
- PMI official ECO change announcement: July 9, 2026 changeover to People 33% / Process 41% / Business Environment 26% — confirmed via [What's New in the PMP Exam 2026 Gold Standard Certifications](https://blog.goldstandardcertifications.com/pmp-exam-2026-update-new-content-outline-guide) and [PMI official announcement](https://www.pmi.org/certifications/project-management-pmp/new-exam) — HIGH confidence
- Anthropic token counting API: [Count Tokens API Reference](https://docs.anthropic.com/en/api/messages-count-tokens) — MEDIUM confidence (WebSearch verified)
- LLM structured output pitfalls: [LLM Structured Output 2026](https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk) — MEDIUM confidence
- Prompt injection and user-controlled content: [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — HIGH confidence

---
*Pitfalls research for: ECO domain tagging, glossary extraction, cost estimation, weak-area hints on existing PMI Study Tool pipeline*
*Researched: 2026-03-21*
