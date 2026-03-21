// markdown.js — Markdown rendering with YAML frontmatter
// Combines transcript metadata and Anthropic API response text into a complete .md string
// CommonJS module — no ES module syntax

'use strict';

/**
 * buildMarkdown(transcript, apiText, ecoTag)
 * Builds a complete markdown string with YAML frontmatter followed by the API response text.
 *
 * YAML frontmatter fields:
 *   - lectureTitle: JSON-quoted string from transcript.lectureTitle
 *   - sectionName:  JSON-quoted string from transcript.sectionName
 *   - processedAt:  Current ISO 8601 timestamp (set at call time)
 *   - ecoTag:       Optional PMI ECO domain ('People', 'Process', or 'Business Environment')
 *                   Omitted from frontmatter when not provided (backward compatible)
 *
 * The apiText is trimmed of leading/trailing whitespace. A single trailing newline is appended.
 *
 * @param {Object} transcript - Transcript JSON object from the Phase 1 extractor
 * @param {string} transcript.lectureTitle - Lecture title for frontmatter
 * @param {string} transcript.sectionName  - Section name for frontmatter
 * @param {string} apiText - Raw API response text (the three section bodies)
 * @param {string} [ecoTag] - Optional ECO domain tag ('People', 'Process', or 'Business Environment')
 * @returns {string} Complete markdown string with YAML frontmatter and API content
 */
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

module.exports = { buildMarkdown };
