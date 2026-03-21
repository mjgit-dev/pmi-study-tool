// frontmatter.js — YAML frontmatter parser for compiled lecture files
// CommonJS module — no ES module syntax, no external dependencies

'use strict';

/**
 * parseFrontmatter(fileContent)
 * Extracts YAML frontmatter fields from a markdown file string.
 *
 * Frontmatter format (from processor/markdown.js):
 *   ---
 *   lectureTitle: "JSON-quoted string"
 *   sectionName: "JSON-quoted string"
 *   processedAt: 2026-03-20T23:16:22.127Z
 *   ---
 *
 * - JSON-quoted values (starting with ") are parsed via JSON.parse
 * - Unquoted values (like processedAt ISO timestamps) are returned as raw strings
 * - Only the FIRST frontmatter block (anchored to start of file) is matched
 * - Returns null if no frontmatter found
 *
 * @param {string} fileContent - Full file content as string
 * @returns {Object|null} Parsed frontmatter fields, or null if no frontmatter
 */
function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim();
    fields[key] = raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  return fields;
}

module.exports = { parseFrontmatter };
