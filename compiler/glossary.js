// glossary.js — Flashcard extraction and GLOSSARY.md building for the PMI Study Tool
// CommonJS module — no ES module syntax, no external dependencies

'use strict';

/**
 * extractFlashcards(body)
 * Parses flashcard entries from a lecture body (text after frontmatter).
 * Looks for a "## Flashcards" heading and extracts all bullet lines matching:
 *   - **{term}** — {definition}
 * The separator is a Unicode em-dash (U+2014), not a hyphen.
 *
 * @param {string} body - Lecture body text (after frontmatter)
 * @returns {{ term: string, definition: string }[]} Array of extracted entries
 */
function extractFlashcards(body) {
  if (!body) return [];

  const flashcardsMarker = '## Flashcards';
  const markerIdx = body.indexOf(flashcardsMarker);
  if (markerIdx === -1) return [];

  // Extract only the section after ## Flashcards
  const flashcardsSection = body.slice(markerIdx + flashcardsMarker.length);

  const entries = [];
  // Match bullet lines: - **term** — definition
  // \u2014 is the em-dash character
  const bulletRegex = /^- \*\*(.+?)\*\* \u2014 (.+)$/gm;
  let match;
  while ((match = bulletRegex.exec(flashcardsSection)) !== null) {
    entries.push({ term: match[1], definition: match[2] });
  }

  return entries;
}

/**
 * buildGlossary(allEntries)
 * Builds the content of GLOSSARY.md from a flat array of { term, definition } objects.
 * Deduplicates by lowercase term key (first-occurrence wins).
 * Sorts alphabetically by term (case-insensitive).
 *
 * Output format:
 *   # PMI Glossary
 *
 *   {N} terms compiled from lecture flashcards.
 *
 *   ---
 *
 *   **Term** — Definition
 *
 *   **Another Term** — Another definition
 *
 * @param {{ term: string, definition: string }[]} allEntries - All extracted flashcard entries
 * @returns {string} Markdown content for GLOSSARY.md
 */
function buildGlossary(allEntries) {
  if (!allEntries || allEntries.length === 0) {
    return '# PMI Glossary\n\nNo terms found.\n';
  }

  // Deduplicate: normalize term to lowercase for key comparison, first-occurrence wins
  const seen = new Map();
  for (const entry of allEntries) {
    const key = entry.term.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }

  // Sort alphabetically by term (case-insensitive)
  const sorted = Array.from(seen.values()).sort((a, b) =>
    a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })
  );

  const count = sorted.length;
  const lines = [
    '# PMI Glossary',
    '',
    count + ' terms compiled from lecture flashcards.',
    '',
    '---',
    '',
  ];

  for (const { term, definition } of sorted) {
    lines.push('**' + term + '** \u2014 ' + definition);
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { extractFlashcards, buildGlossary };
