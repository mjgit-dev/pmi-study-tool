// markdown.js — Markdown rendering with YAML frontmatter
// Combines transcript metadata and Anthropic API response text into a complete .md string
// CommonJS module — no ES module syntax

'use strict';

/**
 * buildMarkdown(transcript, apiText)
 * Builds a complete markdown string with YAML frontmatter followed by the API response text.
 *
 * YAML frontmatter fields:
 *   - lectureTitle: JSON-quoted string from transcript.lectureTitle
 *   - sectionName:  JSON-quoted string from transcript.sectionName
 *   - processedAt:  Current ISO 8601 timestamp (set at call time)
 *
 * The apiText is trimmed of leading/trailing whitespace. A single trailing newline is appended.
 *
 * @param {Object} transcript - Transcript JSON object from the Phase 1 extractor
 * @param {string} transcript.lectureTitle - Lecture title for frontmatter
 * @param {string} transcript.sectionName  - Section name for frontmatter
 * @param {string} apiText - Raw API response text (the three section bodies)
 * @returns {string} Complete markdown string with YAML frontmatter and API content
 */
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
