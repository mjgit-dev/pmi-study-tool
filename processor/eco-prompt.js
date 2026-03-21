// eco-prompt.js — ECO domain classification prompt builder and response parser
// Builds the minimal prompt for classifying a lecture into a PMI ECO domain
// CommonJS module — no ES module syntax

'use strict';

/**
 * PMI ECO domain names — the three valid classification values.
 */
const ECO_DOMAINS = ['People', 'Process', 'Business Environment'];

/**
 * ECO domain weights as exam content percentages.
 *
 * IMPORTANT: PMI exam weights change July 9, 2026 from 42/50/8 to 33/41/26.
 * Update ECO_WEIGHTS.current at that time (one-line change).
 * Reference: PMI Exam Content Outline (ECO), documented in STATE.md decisions.
 */
const ECO_WEIGHTS = {
  current: { People: 42, Process: 50, 'Business Environment': 8 },
  // upcoming: { People: 33, Process: 41, 'Business Environment': 26 } // effective July 9 2026
};

/**
 * buildEcoMessages(transcript)
 * Constructs the system prompt and user message for ECO domain classification.
 * Returns a { system, messages } object compatible with the Anthropic SDK messages.create() call.
 *
 * Uses a minimal prompt (max_tokens: 10 expected by caller) — response is one of the three domain names.
 * This is a separate call from buildMessages() in prompt.js — intentionally kept isolated
 * so the re-classification pass (eco-tagger.js) can tag without regenerating notes/questions/flashcards.
 *
 * @param {Object} transcript - Transcript JSON object from the Phase 1 extractor
 * @param {string} transcript.lectureTitle  - Lecture title
 * @param {string} transcript.sectionName   - Section heading text
 * @param {string} transcript.transcript    - Cleaned prose transcript text
 * @returns {{ system: string, messages: Array<{ role: string, content: string }> }}
 */
function buildEcoMessages(transcript) {
  const system = `You are a PMI exam content classifier. Classify the lecture into exactly one PMI ECO domain.

Respond with ONLY one of these three values — no punctuation, no explanation:
People
Process
Business Environment

Definitions:
- People: Leadership, team management, conflict resolution, stakeholder engagement, motivation, emotional intelligence, servant leadership
- Process: Planning, scheduling, budgeting, risk management, procurement, quality management, scope control, change management, execution methods
- Business Environment: Organizational strategy, compliance, benefits realization, governance, external factors, agile transformation, organizational change`;

  const first500Words = transcript.transcript.split(' ').slice(0, 500).join(' ');

  const user = `Classify this PMP lecture:

Title: ${transcript.lectureTitle}
Section: ${transcript.sectionName}

Transcript excerpt (first 500 words):
${first500Words}`;

  return {
    system,
    messages: [{ role: 'user', content: user }]
  };
}

/**
 * parseEcoTag(rawResponse)
 * Parses the AI classification response into a valid ECO domain string.
 *
 * 1. Trims whitespace
 * 2. Exact match against ECO_DOMAINS
 * 3. Fuzzy fallback: checks if the response contains a domain name
 * 4. Returns null if no match (caller handles: retry or mark as untagged)
 *
 * @param {string} rawResponse - Raw text response from the classification API call
 * @returns {string|null} One of ECO_DOMAINS, or null if unrecognized
 */
function parseEcoTag(rawResponse) {
  const text = rawResponse.trim();
  if (ECO_DOMAINS.includes(text)) return text;
  // Fuzzy fallback: check if response contains a domain name
  for (const domain of ECO_DOMAINS) {
    if (text.includes(domain)) return domain;
  }
  return null;
}

/**
 * printEcoDomainSummary(manifest)
 * Prints a per-domain lecture count line to stdout.
 * Format: "People: N / Process: N / Business Environment: N"
 * Appends "/ Untagged: N" only when untagged > 0.
 *
 * Skips non-entry values (e.g. schemaVersion number) by checking
 * typeof entry !== 'object' || !entry || !entry.status.
 *
 * @param {Object} manifest - Processing state manifest (from loadManifest)
 */
function printEcoDomainSummary(manifest) {
  const counts = { People: 0, Process: 0, 'Business Environment': 0, untagged: 0 };

  for (const entry of Object.values(manifest)) {
    // Skip non-entry values (e.g. schemaVersion: 2 is a number, not an object)
    if (typeof entry !== 'object' || !entry || !entry.status) continue;

    if (entry.ecoTag && ECO_DOMAINS.includes(entry.ecoTag)) {
      counts[entry.ecoTag]++;
    } else if (entry.status === 'complete') {
      counts.untagged++;
    }
  }

  const parts = ECO_DOMAINS.map(d => `${d}: ${counts[d]}`);
  if (counts.untagged > 0) parts.push(`Untagged: ${counts.untagged}`);
  console.log(parts.join(' / '));
}

module.exports = { buildEcoMessages, parseEcoTag, ECO_DOMAINS, ECO_WEIGHTS, printEcoDomainSummary };
