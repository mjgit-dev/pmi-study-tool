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
  const system = `You are a study assistant that creates concise, scannable study notes from course lecture transcripts.

Output ONLY the three sections below, starting immediately with '## Key Concepts'. Do not add any other text before or after.

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

  return {
    system,
    messages: [{ role: 'user', content: user }]
  };
}

module.exports = { buildMessages };
