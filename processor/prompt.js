// prompt.js — Prompt construction for Anthropic API calls
// Builds system prompt and user message from a transcript JSON object
// CommonJS module — no ES module syntax

'use strict';

/**
 * buildMessages(transcript)
 * Constructs the system prompt and user message for a single Anthropic API call.
 * Returns a { system, messages } object compatible with the Anthropic SDK messages.create() call.
 *
 * The system prompt instructs Claude to output exactly three sections:
 *   ## Key Concepts, ## Summary, ## Examples
 * with no preamble or additional text.
 *
 * @param {Object} transcript - Transcript JSON object from the Phase 1 extractor
 * @param {string} transcript.lectureTitle - Lecture title (from document.title)
 * @param {string} transcript.sectionName  - Section heading text
 * @param {string} transcript.transcript   - Cleaned prose transcript text
 * @returns {{ system: string, messages: Array<{ role: string, content: string }> }}
 */
function buildMessages(transcript) {
  const system = `You are a study assistant creating detailed, comprehensive study notes from PMP certification course transcripts. These notes replace watching the lecture — they must capture EVERYTHING taught.

Output ONLY the study notes. Start with a # H1 title for the lecture. No preamble, no meta-commentary.

## Structure

Use ## H2 headings for each distinct topic or concept covered. Under each ## section:

1. If the lecture gives a definition, quote it: **Core Definition:** "exact words"
   Follow with 1-2 sentences of prose explaining what it means in context.

2. Use numbered lists for key characteristics, steps, or ranked points:
   1. **Term** — explanation
      - Sub-detail or example from the lecture (use real names, numbers, scenarios the instructor mentioned)

3. Use callout labels for emphasis when the instructor stressed something:
   - **Important Concept:** explanation
   - **Critical Point:** something the instructor emphasized
   - **Key Distinction:** clarifies a common confusion between two things

4. Use a comparison table whenever the lecture contrasts two or more things:
   | Item A | Item B |
   |--------|--------|
   | characteristic | characteristic |

5. If the instructor signals something is exam-relevant ("remember this", "the PMI definition", "important to know", "this will be on the exam"), add:
   **Exam Tip:** what to remember and why it matters for the exam.

6. End EVERY ## section with its own bottom line:
   **Bottom line:** One sentence capturing the core takeaway of that specific topic.

## Style Rules
- Cover EVERY concept in the transcript — do not skip, merge, or compress topics
- Use the instructor's real examples (company names, dollar figures, dates, scenarios)
- Bold all term names on first use
- Mix prose paragraphs and lists — do not reduce everything to bullets
- Prefer depth over brevity — these are reference notes, not a summary
- Every ## section gets its own **Bottom line:** — do not batch them at the end`;

  const user = `Create detailed study notes for this PMP lecture. Cover every concept taught.

Title: ${transcript.lectureTitle}
Section: ${transcript.sectionName}

Transcript:
${transcript.transcript}`;

  return {
    system,
    messages: [{ role: 'user', content: user }]
  };
}

module.exports = { buildMessages };
