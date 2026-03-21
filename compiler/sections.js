// sections.js — Body extraction and notes/quiz splitting for lecture files
// CommonJS module — no ES module syntax, no external dependencies

'use strict';

/**
 * extractBody(fileContent)
 * Returns the body portion of a lecture file after the closing --- of frontmatter.
 * If no frontmatter is detected, returns the full content unchanged.
 *
 * @param {string} fileContent - Full file content as string
 * @returns {string} Body text after frontmatter, or full content if no frontmatter
 */
function extractBody(fileContent) {
  // Frontmatter format: starts with ---\n, then fields, then \n---\n
  // The opening --- is at position 0 (no preceding newline)
  if (!fileContent.startsWith('---\n')) return fileContent;
  // Find the closing \n---\n after the opening ---\n
  const closeStart = fileContent.indexOf('\n---\n', 4);
  if (closeStart === -1) return fileContent;
  // Return everything after the closing ---\n
  return fileContent.slice(closeStart + 5); // '\n---\n' is 5 chars
}

/**
 * splitNotesAndQuiz(body)
 * Splits lecture body text into notes (before ## Practice Questions)
 * and quiz (from ## Practice Questions onward, including ## Flashcards).
 *
 * Split point: '\n## Practice Questions' — Flashcards is part of quiz, not a split point.
 *
 * @param {string} body - Lecture body text (after frontmatter)
 * @returns {{ notes: string, quiz: string }}
 */
function splitNotesAndQuiz(body) {
  const splitMarker = '\n## Practice Questions';
  const idx = body.indexOf(splitMarker);
  if (idx === -1) {
    return { notes: body.trim(), quiz: '' };
  }
  const notes = body.slice(0, idx).trim();
  const quiz = body.slice(idx + 1).trim(); // skip the leading \n
  return { notes, quiz };
}

module.exports = { extractBody, splitNotesAndQuiz };
