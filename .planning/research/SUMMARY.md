# Project Research Summary

**Project:** PMI Study Tool v1.1 — Study Intelligence
**Domain:** Node.js CLI pipeline — Anthropic API content enrichment
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

PMI Study Tool v1.1 adds four study intelligence features to a proven v1.0 pipeline: ECO domain tagging per lecture, glossary extraction and deduplication, cost estimation before batch runs, and weak-area hint injection into the Claude Projects system prompt. The existing stack (Node.js CommonJS, `@anthropic-ai/sdk` 0.80.0, no external test frameworks) is locked and fully sufficient — all four features require zero new npm dependencies. Research confirms this is a pure extension project: new modules slot into well-defined boundaries without requiring any structural changes to the pipeline's two-stage processor-then-compiler architecture.

The recommended build order is cost estimation first (fully independent, immediately reduces batch-run risk), ECO tagging second (establishes the data contract that flows through the rest of the pipeline), glossary extraction third (builds on the split-section parsing already extended for ECO), and weak-area injection last (pure compiler output concern, no API involvement). This ordering is driven by data-flow dependencies — ECO tag must be in the YAML frontmatter before the compiler can use it, and the cost estimation pre-flight check should be verified on the expanded prompt before any batch run occurs.

The primary risks are a July 9, 2026 PMI ECO percentage change (People/Process/Business Environment shifts from 42/50/8 to 33/41/26) that will silently produce incorrect study guidance if percentages are hardcoded as strings, and a cost estimation error if the system prompt tokens are excluded from the `countTokens()` call (which causes a 30-50% underestimate). Both are preventable with a single config constant for domain weights and by passing `{ model, system, messages }` — not just `messages` — to `client.messages.countTokens()`.

---

## Key Findings

### Recommended Stack

The v1.0 stack requires no changes. All v1.1 capabilities are already available via `@anthropic-ai/sdk` 0.80.0's `client.messages.countTokens()` method and Node.js built-ins (`node:fs`, `node:path`, `node:readline`). The relevant alternative tools (tiktoken-node, remark/unified markdown parsers, inquirer for prompts, ESM module format) were each evaluated and rejected — they add dependency weight for problems the existing stack already solves.

**Core technologies:**
- `@anthropic-ai/sdk` 0.80.0: API calls and token counting — already installed, `countTokens()` confirmed available in this version
- `node:readline` (built-in): yes/no confirmation prompt for cost estimate — 4 lines, no package needed
- `node:fs` / `node:path` (built-in): config file reading (`weak-areas.json`), manifest access, output writing
- Regex on machine-generated markdown: flashcard extraction for glossary — correct for controlled-format output; AST parsers would be overengineering

### Expected Features

**Must have (table stakes — all four are v1.1 scope):**
- ECO domain tag per lecture (People / Process / Business Environment) — stored in manifest and YAML frontmatter; prerequisite for all domain-aware compiler outputs
- Glossary file (`GLOSSARY.md` in `claude-package/`) — deduplicated, alphabetically sorted; extracted from existing `## Flashcards` sections at compile time, no new API calls
- Cost estimate before batch run (`--estimate` flag) — scoped to pending lectures only; displays per-lecture and total; requires user confirmation before proceeding
- Weak-area hint injection — compiler reads `weak-areas.json` and appends a `## Focus Areas` section to `CLAUDE_INSTRUCTIONS.md`; backward compatible (section omitted if file absent)

**Should have (differentiators — add after P1 complete):**
- ECO weight-aware study guidance in system prompt — compiler reads domain tag distribution and injects weighting note; depends on ECO tagging being complete
- Per-domain lecture count in CLI output — trivial aggregation over manifest data; high value-to-effort ratio
- Post-run cost summary — sums `response.usage` across all lectures; provides actual vs. estimated comparison

**Defer to v2+:**
- Sub-task level ECO tagging (26 ECO tasks) — requires validation dataset not available
- Anki/CSV glossary export — out of scope for Claude Projects workflow
- Automated weak-area scoring from quiz history — requires session tracking infrastructure that does not exist

### Architecture Approach

The v1.0 pipeline is a clean two-stage architecture: the processor reads transcripts and calls the Anthropic API to produce per-lecture `.md` files with YAML frontmatter; the compiler reads those files, groups by section, and writes the `claude-package/` output directory. All four v1.1 features integrate at well-defined points within this existing architecture — two new modules (`processor/cost-estimate.js` and `compiler/glossary.js`) plus targeted modifications to six existing modules. No new pipeline stages are introduced and the file-system boundary between processor output and compiler input is unchanged. The most fragile integration point is the `## heading` marker protocol between `prompt.js` and `sections.js` — both sides must use identical heading strings, and missing sections must degrade gracefully (null/empty, not errors that abort the batch).

**Major components added or modified:**
1. `processor/cost-estimate.js` (NEW) — token estimation and cost display before batch loop; calls `countTokens()` with full `{model, system, messages}` shape
2. `compiler/glossary.js` (NEW) — cross-lecture aggregation, case-insensitive deduplication, alphabetical sort; pure function over `lectures[]` array
3. `processor/prompt.js` (MODIFY) — add `## ECO Domain` and `## Glossary Terms` output sections to system prompt
4. `processor/markdown.js` + `compiler/frontmatter.js` (MODIFY) — write and read `ecoTag` YAML frontmatter field
5. `compiler/system-prompt.js` (MODIFY) — accept optional `weakAreas[]` param; append Focus Areas block when provided
6. `processor/processor.js` + `compiler/compiler.js` (MODIFY) — wire new modules at batch entry points; parse `--weak-areas` CLI flag

### Critical Pitfalls

1. **ECO percentages hardcoded as strings** — will silently produce wrong exam guidance after July 9, 2026 (new weights: People 33%, Process 41%, Business Environment 26%). Store in a single config object with a `lastVerified` date and upcoming values documented. Never embed `"42%"` or `"8%"` in prompt text or output templates.

2. **Cost estimate excludes system prompt tokens** — the system prompt is ~600 tokens per call; omitting it from `countTokens()` causes a 30-50% underestimate across a 100-lecture batch. Always pass `{ model, system, messages }` — `system` is a confirmed accepted parameter in SDK 0.80.0's `MessageCountTokensParams`.

3. **Manifest schema breaks on pre-v1.1 entries** — `processing-state.json` has no version field; old entries lack `ecoTag` and other new fields. Every new-field read must use `entry.newField ?? 'defaultValue'`. Add `schemaVersion: 2` and test the full compiler pipeline against the existing manifest before shipping any phase that writes new fields.

4. **ECO tag LLM output not validated** — the model may return values outside the three-value allowlist. Constrain the prompt to output exactly `People`, `Process`, or `BusinessEnvironment`; any other value defaults to `'unclassified'`. Emit a domain distribution summary after classification for spot-checking.

5. **Glossary deduplication silently fails on case variants** — "Project Charter" and "project charter" are the same term. Normalize all term keys (lowercase, trimmed) before inserting into the deduplication map; first-occurrence definition wins. Never deduplicate on raw term text.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Cost Estimation
**Rationale:** Fully independent of the other three features; addresses the highest trust risk (users will not run a blind 100-lecture batch); establishes the `countTokens()` usage pattern and validates the expanded prompt's cost impact before ECO and glossary additions go live. Architecture research explicitly identifies this as the correct first step.
**Delivers:** `processor/cost-estimate.js`; `--estimate` flag on processor; pending-lecture-scoped estimate with per-lecture and total cost display; yes/no confirmation prompt via `node:readline`.
**Addresses:** Cost estimate (table stakes P1), cost estimate scoped to pending lectures (differentiator P1).
**Avoids:** Pitfall 5 (system prompt tokens excluded from estimate), prompt expansion cost surprises during later phases.

### Phase 2: ECO Domain Tagging
**Rationale:** Establishes the data contract (`ecoTag` in YAML frontmatter) that the compiler relies on in phases 3 and 4. Must come before any compiler changes that consume domain data. Validates the `sections.js` section-split parser extension before glossary adds a second new `##` section using the same pattern.
**Delivers:** `## ECO Domain` prompt section; `ecoTag` persisted in YAML frontmatter and manifest; ECO domain label in section notes file lecture headings (`## Lecture Title [People]`); domain distribution summary in CLI output.
**Addresses:** ECO domain tag per lecture (table stakes P1), ECO weight-aware study guidance (differentiator P2), per-domain lecture count (differentiator P2).
**Avoids:** Pitfall 1 (hardcoded percentages — config constant established here with July 2026 changeover documented), Pitfall 3 (manifest schema — null-guards and schemaVersion added here), Pitfall 7 (no verification layer — distribution summary built into the phase).

### Phase 3: Glossary Extraction
**Rationale:** Builds on the `sections.js` split extension from Phase 2 — adding a `## Glossary Terms` section to the prompt is additive to the pattern already established and tested. `compiler/glossary.js` is a pure function over the `lectures[]` array that Phase 2's frontmatter changes already typed out. Testable in isolation with mock lecture data before wiring into the full compiler.
**Delivers:** `## Glossary Terms` prompt section; `compiler/glossary.js`; `GLOSSARY.md` in `claude-package/`; deduplicated, alphabetically sorted glossary across all processed lectures; glossary term count logged at compile time.
**Addresses:** Glossary file (table stakes P1), glossary deduplication (differentiator P1), glossary term count in compiler log (P3).
**Avoids:** Pitfall 4 (deduplication harder than expected — normalization built into extraction, not deferred to a later pass), Anti-Pattern 2 (glossary terms stored per-lecture only, never aggregated).

### Phase 4: Weak-Area Hint Injection
**Rationale:** No API changes, no new data structures — pure compiler output concern. Has no code-level dependencies on Phases 1-3, but building last means the compiler is already fully updated from ECO and glossary work, reducing integration risk. Simplest feature; clean milestone close.
**Delivers:** `compiler/system-prompt.js` updated to accept `weakAreas[]`; `weak-areas.json` config file support; `## Focus Areas` section in `CLAUDE_INSTRUCTIONS.md` when config is present; backward-compatible when config is absent.
**Addresses:** Weak-area hint injection (table stakes P1).
**Avoids:** Pitfall 6 (user-controlled text interpolated directly into system prompt — sanitize topic strings before injection: strip `#` headers, backticks, truncate to 100 chars per topic, limit to 10 topics).

### Phase Ordering Rationale

- **Cost estimation first** because the expanded prompt must be validated for cost impact before committing to a 100-lecture batch. Running Phase 1 first means the cost estimation feature itself will catch any surprise from adding `## ECO Domain` and `## Glossary Terms` to the system prompt in phases 2 and 3.
- **ECO before glossary** because ECO tagging establishes and validates the `sections.js` split pattern that glossary reuses. Building on a known-working pattern reduces integration risk on the more complex cross-lecture aggregation.
- **Weak-area injection last** because it is independent of the other three features at the code level. Building it after the compiler is fully updated by phases 2 and 3 avoids any risk of its changes interfering with ECO/glossary integration testing.
- **Manifest schema versioning (null-guards + `schemaVersion`)** must be addressed in Phase 2 — the first phase that writes new manifest fields — and verified before any compiler changes in Phase 3.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (ECO Tagging):** LLM constrained output reliability is well-understood in general but project-specific; a short spike with 3-5 real transcripts is recommended before designing the full validation layer. Specifically: verify that the model reliably outputs exactly one of the three allowed values when the prompt format is `## ECO Domain\nPeople`, `Process`, or `Business Environment` with no explanation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Cost Estimation):** `countTokens()` API is fully documented and confirmed in installed SDK; implementation is deterministic.
- **Phase 3 (Glossary):** Pure string aggregation and deduplication with no novel patterns.
- **Phase 4 (Weak-Area Hints):** Pure function signature extension and config file read — no research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase inspection; SDK 0.80.0 installed version confirmed; `countTokens()` availability verified against installed package source at `processor/node_modules/@anthropic-ai/sdk/` |
| Features | HIGH | Four v1.1 features sourced from PMI official ECO docs plus Anthropic SDK docs; ECO percentage change confirmed via PMI official announcement with specific July 9, 2026 date |
| Architecture | HIGH | Direct inspection of all 9 processor and compiler modules; data flow traced end-to-end; all integration boundaries and fragile points identified |
| Pitfalls | HIGH | All 7 critical pitfalls verified against installed SDK source, existing manifest JSON shape, and confirmed PMI ECO 2026 change date; not inference-based |

**Overall confidence:** HIGH

### Gaps to Address

- **ECO percentage update timing:** July 9, 2026 changeover is confirmed. The Phase 2 config constant must document both the current (42/50/8) and upcoming (33/41/26) values with a `lastVerified` annotation. The roadmapper should include a post-July-2026 maintenance note.
- **Cost estimation approach — heuristic vs. SDK call:** ARCHITECTURE.md recommends a local heuristic (`wordCount * 1.35`) for speed, while STACK.md prefers the exact SDK `countTokens()` call (free, no extra latency per lecture for a pre-flight sample). Phase 1 planning should resolve this — recommend the SDK call as primary since it costs nothing and produces exact counts; the heuristic is only needed if the SDK call's rate limit becomes a concern for very large batches.
- **Output token estimate conservatism:** No mechanism can predict output tokens before generation. The current plan uses `max_tokens` (8192) as a worst-case upper bound. Actual usage is empirically 1,500-3,000 tokens per lecture. Phase 1 should document this as a conservative upper bound in the CLI display, not a mean estimate, to avoid user confusion when actual costs are lower.
- **Glossary completeness vs. PMI Lexicon:** The PMI Lexicon v5.0 defines ~200 canonical terms; the compiled glossary will cover 150-250 unique terms across a full course but there is no automated mechanism to validate coverage against the official lexicon. Accept this limitation for v1.1.

---

## Sources

### Primary (HIGH confidence)
- `c:/pmi-study-tool/processor/processor.js`, `prompt.js`, `markdown.js`, `manifest.js` — pipeline architecture, data shapes, and CommonJS module patterns
- `c:/pmi-study-tool/compiler/compiler.js`, `sections.js`, `frontmatter.js`, `grouper.js`, `builder.js`, `system-prompt.js` — compiler architecture and integration boundaries
- `c:/pmi-study-tool/processor/node_modules/@anthropic-ai/sdk/src/resources/messages/messages.ts` — `MessageCountTokensParams` interface; `system` field confirmed optional in SDK 0.80.0
- `c:/pmi-study-tool/processor/package-lock.json` — confirms `@anthropic-ai/sdk@0.80.0` installed
- https://platform.claude.com/docs/en/about-claude/pricing — claude-sonnet-4-6 pricing ($3.00/MTok input, $15.00/MTok output); verified 2026-03-21
- https://platform.claude.com/docs/en/build-with-claude/token-counting — `countTokens()` API; confirmed free, independent rate limits, Node.js examples
- https://www.pmi.org/certifications/project-management-pmp/new-exam — July 9, 2026 ECO changeover; new domain weights People 33% / Process 41% / Business Environment 26%
- https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf — PMI 2026 Exam Content Outline (official)

### Secondary (MEDIUM confidence)
- https://docs.anthropic.com/en/api/messages-count-tokens — `countTokens` API reference (WebSearch-verified, not direct library source inspection)
- https://shrilearning.com/pmp-business-environment-2026/ — ECO 2026 domain weight context and analysis
- https://blog.goldstandardcertifications.com/pmp-exam-2026-update-new-content-outline-guide — secondary confirmation of July 9, 2026 changeover date
- PMI Lexicon of Project Management Terms v5.0 (January 2026) — ~200 canonical PMP terms for glossary quality baseline

### Tertiary (LOW confidence)
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/ — OWASP LLM01:2025 guidance for weak-area hint sanitization; general principle, not PMI-specific
- https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk — LLM structured output pitfalls context

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
