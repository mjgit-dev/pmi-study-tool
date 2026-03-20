// cleaning.js — Pure functions for transcript text processing
// Loaded in both Node.js (for tests) and browser (via extractor.js script tag)
// No ES module syntax — uses CommonJS exports for Node.js test compatibility

/**
 * cleanTranscript(rawCues)
 * Takes an array of raw transcript cue strings from the Udemy DOM and returns
 * a single cleaned, readable prose string.
 *
 * Pipeline:
 *   1. Strip timestamps (MM:SS or HH:MM:SS)
 *   2. Filter empty cues
 *   3. Join cues with a space
 *   4. Remove filler words (whole-word match)
 *   5. Strip speaker labels ([Speaker:] or Speaker:)
 *   6. Capitalize first letter after sentence-ending punctuation
 *   7. Collapse multiple spaces
 *   8. Trim
 *
 * @param {string[]} rawCues - Array of raw cue text strings from the transcript panel
 * @returns {string} Cleaned prose text
 */
function cleanTranscript(rawCues) {
  if (!Array.isArray(rawCues) || rawCues.length === 0) {
    return '';
  }

  // Step 1: Strip timestamps (e.g., "0:04", "12:30", "1:23:45")
  var TIMESTAMP_RE = /\d{1,2}:\d{2}(?::\d{2})?/g;

  // Step 2: Strip each cue of timestamps, trim, filter empty
  var stripped = rawCues
    .map(function (cue) { return String(cue).replace(TIMESTAMP_RE, '').trim(); })
    .filter(Boolean);

  if (stripped.length === 0) {
    return '';
  }

  // Step 3: Join with space
  var text = stripped.join(' ');

  // Step 4: Remove filler words (whole-word, case-insensitive)
  // Word boundaries protect "likely" (contains "like"), "understand" (contains "uh"), etc.
  // The [,]? optionally consumes a trailing comma after a filler word.
  var FILLER_RE = /\b(um+|uh+|you know what i mean|you know|kind of|sort of|basically|literally|actually|like|right)\b[,]?\s*/gi;
  text = text.replace(FILLER_RE, ' ');

  // Step 5: Strip speaker labels — handles [John:] or John: (single-word capitalized label)
  var SPEAKER_RE = /\[?[A-Z][a-z]+:\]?\s*/g;
  text = text.replace(SPEAKER_RE, '');

  // Step 6: Capitalize the first letter after sentence-ending punctuation (. ! ?)
  // e.g., "hello. this" -> "hello. This"
  text = text.replace(/([.!?])\s+([a-z])/g, function (_, punct, char) {
    return punct + ' ' + char.toUpperCase();
  });

  // Step 7: Capitalize the very first character of the result
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Step 8: Collapse multiple whitespace characters to a single space
  text = text.replace(/\s{2,}/g, ' ');

  // Step 9: Trim leading/trailing whitespace
  text = text.trim();

  return text;
}

/**
 * countWords(text)
 * Counts words in a cleaned transcript string.
 *
 * @param {string} text - Cleaned text string
 * @returns {{ wordCount: number, isLowWordCount: boolean }}
 *   wordCount: number of whitespace-delimited tokens
 *   isLowWordCount: true if wordCount < 300 (likely capture failure)
 */
function countWords(text) {
  if (!text || typeof text !== 'string') {
    return { wordCount: 0, isLowWordCount: true };
  }
  var words = text.split(/\s+/).filter(Boolean);
  var wordCount = words.length;
  return {
    wordCount: wordCount,
    isLowWordCount: wordCount < 300
  };
}

/**
 * toFilename(lectureTitle)
 * Converts a lecture title into a safe, readable JSON filename.
 *
 * Rules:
 *   - Strip all characters except alphanumeric, spaces, and hyphens
 *   - Trim result
 *   - Replace whitespace runs with a single hyphen
 *   - Append ".json"
 *   - If the result would be empty (or just ".json"), return "Unknown-Lecture.json"
 *
 * @param {string} lectureTitle - Raw lecture title from the DOM
 * @returns {string} Sanitized filename (e.g., "What-is-a-Project.json")
 */
function toFilename(lectureTitle) {
  if (!lectureTitle || typeof lectureTitle !== 'string') {
    return 'Unknown-Lecture.json';
  }

  var sanitized = lectureTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')  // keep alphanumeric, spaces, hyphens
    .trim()
    .replace(/\s+/g, '-');             // spaces -> hyphens

  if (!sanitized || sanitized === '') {
    return 'Unknown-Lecture.json';
  }

  return sanitized + '.json';
}

// CommonJS export — works in Node.js test runner and can be required in extractor.js
module.exports = { cleanTranscript, countWords, toFilename };
