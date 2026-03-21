'use strict';

// estimate.js — Cost estimation utilities for PMI Study Tool processor
// Provides pricing constants, cost calculation, token counting, and table formatting

const { buildMessages } = require('./prompt');

// Per-model pricing in USD per million tokens
const PRICING = {
  'claude-sonnet-4-6': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  'claude-sonnet-4-5': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  'claude-haiku-4-5':  { inputPerMTok: 1.00, outputPerMTok: 5.00  },
  'claude-opus-4-6':   { inputPerMTok: 5.00, outputPerMTok: 25.00 },
};

const DEFAULT_PRICING = { inputPerMTok: 3.00, outputPerMTok: 15.00 };

// Worst-case output token count used for upper-bound cost estimation
const MAX_OUTPUT_TOKENS = 8192;

/**
 * estimateCost(inputTokens, model)
 * Returns estimated cost in USD for a single lecture call.
 * Uses MAX_OUTPUT_TOKENS as the output token count (upper bound).
 * Falls back to DEFAULT_PRICING for unrecognized models.
 *
 * @param {number} inputTokens - Number of input tokens counted for the lecture
 * @param {string} model - Anthropic model string (e.g. 'claude-sonnet-4-6')
 * @returns {number} Estimated cost in USD
 */
function estimateCost(inputTokens, model) {
  const price = PRICING[model] || DEFAULT_PRICING;
  const inputCost  = (inputTokens / 1_000_000) * price.inputPerMTok;
  const outputCost = (MAX_OUTPUT_TOKENS / 1_000_000) * price.outputPerMTok;
  return inputCost + outputCost;
}

/**
 * countLectureTokens(client, model, transcript)
 * Calls the Anthropic token counting API for a single lecture transcript.
 * Returns the number of input tokens that would be consumed by the full prompt.
 *
 * @param {object} client - Anthropic SDK client with beta.messages.countTokens
 * @param {string} model - Anthropic model string
 * @param {object} transcript - Transcript object (lectureTitle, sectionName, transcript)
 * @returns {Promise<number>} Input token count
 */
async function countLectureTokens(client, model, transcript) {
  const { system, messages } = buildMessages(transcript);
  const result = await client.beta.messages.countTokens({ model, system, messages });
  return result.input_tokens;
}

/**
 * formatEstimateTable(rows, totals)
 * Renders a fixed-width table with per-lecture cost rows and a TOTAL row.
 * Includes an upper-bound footnote about actual vs max output tokens.
 *
 * @param {Array<{ name: string, inputTokens: number, outputTokens: number, costDollars: number }>} rows
 * @param {{ inputTokens: number, outputTokens: number, costDollars: number }} totals
 * @returns {string} Multi-line formatted table string
 */
function formatEstimateTable(rows, totals) {
  // Strip .json extension and truncate names at 40 chars
  const cleanName = (name) => {
    const stripped = name.replace(/\.json$/i, '');
    return stripped.length > 40 ? stripped.slice(0, 37) + '...' : stripped;
  };

  // Compute name column width from longest name (min 10, max 40)
  const maxNameLen = Math.max(
    10,
    ...rows.map((r) => cleanName(r.name).length)
  );

  // Column widths
  const nameW   = maxNameLen;
  const inputW  = 10;
  const outputW = 11;
  const costW   = 10;

  const sep = '-'.repeat(nameW + inputW + outputW + costW + 9);

  // Format a number with comma separators (integer)
  const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
  // Format cost as $X.XXXX
  const fmtCost = (n) => '$' + n.toFixed(4);

  // Header
  const header = [
    'Lecture'.padEnd(nameW),
    'Input tok'.padStart(inputW),
    'Output tok'.padStart(outputW),
    'Est. cost'.padStart(costW),
  ].join('  ');

  // Data rows
  const dataRows = rows.map((r) => {
    const name = cleanName(r.name);
    return [
      name.padEnd(nameW),
      fmtInt(r.inputTokens).padStart(inputW),
      fmtInt(r.outputTokens).padStart(outputW),
      fmtCost(r.costDollars).padStart(costW),
    ].join('  ');
  });

  // TOTAL row
  const totalRow = [
    'TOTAL'.padEnd(nameW),
    fmtInt(totals.inputTokens).padStart(inputW),
    fmtInt(totals.outputTokens).padStart(outputW),
    fmtCost(totals.costDollars).padStart(costW),
  ].join('  ');

  // Estimated cost label line
  const labelRow = [
    'Estimated cost (upper bound)'.padEnd(nameW),
    ''.padStart(inputW),
    ''.padStart(outputW),
    fmtCost(totals.costDollars).padStart(costW),
  ].join('  ');

  // Footnote
  const footnote =
    'Note: Output tokens use max (8,192) per lecture. ' +
    'Actual output is typically 1,500-3,000 tokens.';

  const lines = [
    header,
    sep,
    ...dataRows,
    sep,
    totalRow,
    labelRow,
    '',
    footnote,
  ];

  return lines.join('\n');
}

module.exports = {
  PRICING,
  DEFAULT_PRICING,
  MAX_OUTPUT_TOKENS,
  estimateCost,
  countLectureTokens,
  formatEstimateTable,
};
