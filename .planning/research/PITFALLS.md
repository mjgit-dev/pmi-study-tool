# Domain Pitfalls

**Domain:** AI-powered transcript processing and study tool (Udemy PMP course)
**Researched:** 2026-03-20

---

## Critical Pitfalls

### Pitfall 1: Udemy DOM Structure Changes Break Extraction

**What goes wrong:** The browser script targets CSS classes in the Udemy player. Udemy uses React with hashed class names that change on deploys. A script that worked yesterday silently returns empty strings today.

**Prevention:**
- Target `[data-purpose]` attributes, `aria-label` values, or element roles — more stable than class names
- Implement a content sanity check: minimum word count threshold (real lecture = 300+ words), reject anything shorter
- Print first 100 characters of each transcript before bulk processing

**Warning signs:** Extracted files under 100 words; multiple lectures with identical content; transcripts containing only UI text ("Settings", "1x speed")

**Phase:** Transcript Extraction — address at implementation start.

---

### Pitfall 2: Rate Limit Errors Cause Silent Mid-Batch Failures

**What goes wrong:** Processing 100+ transcripts in a tight loop hits Anthropic rate limits (429 errors). Without retry logic, the script either crashes or skips lectures silently — producing a handbook with holes the user only discovers during study.

**Prevention:**
- Exponential backoff with jitter on all API calls — minimum 3 retries before marking failed
- Add 1–2 second delay between calls even below rate limits
- Maintain a persistent state file (`processing-state.json`) tracking `pending/complete/failed` per lecture — enables resume without reprocessing
- Run a pilot batch (5–10 lectures) before committing to full processing

**Warning signs:** Output directory has fewer files than input transcripts; processing completes faster than expected

**Phase:** AI Processing pipeline — build state tracking before running any batch.

---

### Pitfall 3: Prompt Mistakes Cause Cost Overrun

**What goes wrong:** Making 3 separate API calls per lecture (notes, questions, flashcards) triples cost. Large system prompts multiplied across 100+ lectures add up fast.

**Prevention:**
- Generate all content types in a **single API call** per lecture using a unified output schema
- Keep system prompts under 500 tokens
- Estimate cost before every batch: `(avg_input + avg_output tokens) × num_lectures × price_per_token`
- Test prompt iteration on 5 lectures only
- Set a hard spending cap in the Anthropic console

**Phase:** AI Processing — establish cost controls before first real batch run.

---

### Pitfall 4: Claude Projects Context Saturation Destroys Retrieval Quality

**What goes wrong:** Uploading 100+ lecture files to one Claude Project overwhelms the retrieval mechanism. Claude gives vague, blended answers instead of precise, lecture-specific responses.

**Prevention:**
- Output one file **per course section** (8–12 files), not per lecture (100+ files)
- Keep any individual file under 25,000 tokens (~18,000 words)
- Include a master index document for orientation
- Test retrieval with known-answer questions before committing to structure

**Warning signs:** Project has 20+ documents; Claude answers without citing a specific section

**Phase:** Output structure design — decide file organization before processing begins.

---

### Pitfall 5: PMP Content Hallucination Framed as Study Material

**What goes wrong:** When a transcript is thin, Claude fills gaps with plausible-sounding PMP content — wrong process group assignments, outdated PMBOK 6 terminology, invented ITTOs. The user studies incorrect information and fails the exam.

**Prevention:**
- Prompt explicitly: "Only generate content directly supported by the transcript below. Do not add PMP concepts not mentioned in the transcript."
- Include verbatim transcript excerpt supporting each practice question's correct answer
- Spot-check 10% of generated content against actual lectures before trusting output

**Warning signs:** Content mentions processes not discussed in that lecture; a 5-minute intro lecture produces as much output as a 30-minute deep-dive

**Phase:** AI Processing (prompt design) and Output Validation.

---

### Pitfall 6: Extraction Captures UI Text Instead of Lecture Content

**Prevention:** Scope DOM selector to the transcript panel only. Strip known UI patterns (timestamps `MM:SS`, repeated instructor name, Udemy branding) in a post-capture cleaning step.

**Phase:** Transcript Extraction.

---

### Pitfall 7: Timestamp Noise Pollutes Transcript Text

**What goes wrong:** Udemy timestamps (`00:03 The initiating process group 00:07 is where...`) fragment natural sentences and bloat token count.

**Prevention:** Strip timestamps with regex `/\d{1,2}:\d{2}/g` and rejoin segments with spaces.

**Phase:** Pre-processing.

---

### Pitfall 8: No Idempotent Re-run Strategy

**Prevention:**
- Name output files using deterministic IDs from lecture ID (not sequential numbering)
- Add `--force` flag to reprocess specific lectures
- Store content hash of input — skip reprocessing if unchanged

**Phase:** AI Processing pipeline architecture.

---

### Pitfall 9: Automation Risks Udemy Account Suspension

**What goes wrong:** A script that auto-navigates between 100+ lectures may trigger Udemy's abuse detection.

**Prevention:**
- Semi-manual extraction: user navigates normally, script activates per-lecture on demand (keyboard shortcut)
- Never automate login, enrollment, or inter-lecture navigation
- Add 3–5 second delays between any automated actions

**Phase:** Transcript Extraction design — decide before writing any automation.

---

### Pitfall 10: Practice Questions Are Recall-Level, Not Scenario-Based

**What goes wrong:** AI generates "What is a project charter?" instead of the scenario-based application questions the PMP exam actually uses.

**Prevention:** Instruct the AI explicitly to generate scenario-based questions only. Provide 2–3 example questions demonstrating the format.

**Phase:** Prompt design.

---

## Phase-Specific Quick Reference

| Phase | Top Pitfall | Mitigation |
|-------|------------|------------|
| DOM extraction | CSS class changes break selectors | Use `data-*` / `aria-label`; validate word count |
| Bulk API processing | Silent holes from 429 errors | Persistent state file + exponential backoff |
| Prompt design | Cost overrun from multiple calls | Single unified call per lecture; pre-flight estimate |
| Output structure | Context saturation in Claude Projects | Section-scoped files (not per-lecture); test retrieval |
| Question generation | Hallucinated PMP content | Transcript-grounded-only instruction; source citations |
| Extraction scope | Account suspension | Semi-manual design; no inter-lecture automation |
