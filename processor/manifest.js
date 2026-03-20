// manifest.js — Processing state management for PMI batch processor
// Reads and writes processing-state.json to track per-lecture processing status
// CommonJS module — no ES module syntax

'use strict';

const fs = require('node:fs');

/**
 * loadManifest(manifestPath)
 * Reads and parses the processing manifest JSON file.
 * Returns {} if the file does not exist or contains invalid JSON.
 *
 * @param {string} manifestPath - Absolute path to processing-state.json
 * @returns {Object} Parsed manifest object, or {} on missing/invalid file
 */
function loadManifest(manifestPath) {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // ENOENT (file not found) or SyntaxError (invalid JSON) — return empty object
    return {};
  }
}

/**
 * saveManifest(manifestPath, manifest)
 * Writes the manifest object as JSON with 2-space indentation.
 *
 * @param {string} manifestPath - Absolute path to processing-state.json
 * @param {Object} manifest - The manifest object to persist
 */
function saveManifest(manifestPath, manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * shouldSkip(entry, force)
 * Determines whether a lecture should be skipped during batch processing.
 * Returns true only when the entry exists, has status "complete", and force is not true.
 *
 * Manifest entry shape:
 *   { filename: string, status: "pending"|"complete"|"failed", processedAt: string, error?: string }
 *
 * @param {Object|null|undefined} entry - The manifest entry for a lecture file, or null/undefined if not in manifest
 * @param {boolean} [force] - If true, bypass skip logic and reprocess
 * @returns {boolean} true if the lecture should be skipped, false otherwise
 */
function shouldSkip(entry, force) {
  if (!entry) return false;
  if (entry.status !== 'complete') return false;
  if (force === true) return false;
  return true;
}

module.exports = { loadManifest, saveManifest, shouldSkip };
