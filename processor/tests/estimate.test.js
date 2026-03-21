// estimate.test.js — Unit tests for processor/estimate.js
// Tests pricing constants, cost calculation, token counting, and table formatting
// CommonJS — node:test built-in

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PRICING,
  DEFAULT_PRICING,
  MAX_OUTPUT_TOKENS,
  estimateCost,
  countLectureTokens,
  formatEstimateTable,
} = require('../estimate');

// ============================================================
// Test 1: PRICING object contains correct per-model rates
// ============================================================
test('PRICING contains correct rates for claude-sonnet-4-6', () => {
  assert.ok(PRICING['claude-sonnet-4-6'], 'claude-sonnet-4-6 should exist in PRICING');
  assert.equal(PRICING['claude-sonnet-4-6'].inputPerMTok, 3.00, 'sonnet inputPerMTok should be 3.00');
  assert.equal(PRICING['claude-sonnet-4-6'].outputPerMTok, 15.00, 'sonnet outputPerMTok should be 15.00');
});

test('PRICING contains correct rates for claude-opus-4-6', () => {
  assert.ok(PRICING['claude-opus-4-6'], 'claude-opus-4-6 should exist in PRICING');
  assert.equal(PRICING['claude-opus-4-6'].inputPerMTok, 5.00, 'opus inputPerMTok should be 5.00');
  assert.equal(PRICING['claude-opus-4-6'].outputPerMTok, 25.00, 'opus outputPerMTok should be 25.00');
});

test('DEFAULT_PRICING equals sonnet pricing { inputPerMTok: 3.00, outputPerMTok: 15.00 }', () => {
  assert.deepEqual(DEFAULT_PRICING, { inputPerMTok: 3.00, outputPerMTok: 15.00 });
});

// ============================================================
// Test 2: MAX_OUTPUT_TOKENS equals 8192
// ============================================================
test('MAX_OUTPUT_TOKENS equals 8192', () => {
  assert.equal(MAX_OUTPUT_TOKENS, 8192);
});

// ============================================================
// Test 3: estimateCost calculations
// ============================================================
test('estimateCost(1000, "claude-sonnet-4-6") returns correct dollar amount', () => {
  // (1000/1e6)*3.00 + (8192/1e6)*15.00 = 0.003 + 0.12288 = 0.12588
  const expected = (1000 / 1_000_000) * 3.00 + (8192 / 1_000_000) * 15.00;
  const result = estimateCost(1000, 'claude-sonnet-4-6');
  assert.ok(
    Math.abs(result - expected) < 1e-9,
    `Expected ~${expected} but got ${result}`
  );
});

test('estimateCost(5000, "unknown-model") uses DEFAULT_PRICING', () => {
  // (5000/1e6)*3.00 + (8192/1e6)*15.00 = 0.015 + 0.12288 = 0.13788
  const expected = (5000 / 1_000_000) * 3.00 + (8192 / 1_000_000) * 15.00;
  const result = estimateCost(5000, 'unknown-model');
  assert.ok(
    Math.abs(result - expected) < 1e-9,
    `Expected ~${expected} (DEFAULT_PRICING) but got ${result}`
  );
});

test('estimateCost(0, "claude-sonnet-4-6") returns output cost only', () => {
  // (8192/1e6)*15.00 = 0.12288
  const expected = (8192 / 1_000_000) * 15.00;
  const result = estimateCost(0, 'claude-sonnet-4-6');
  assert.ok(
    Math.abs(result - expected) < 1e-9,
    `Expected ~${expected} (output-only) but got ${result}`
  );
});

// ============================================================
// Test 4: countLectureTokens — async token counting
// ============================================================
test('countLectureTokens returns input_tokens from mock client', async () => {
  let capturedArgs = null;
  const mockClient = {
    beta: {
      messages: {
        countTokens: async (args) => {
          capturedArgs = args;
          return { input_tokens: 2500 };
        }
      }
    }
  };

  const transcript = {
    lectureTitle: 'Test Lecture',
    sectionName: 'Test Section',
    transcript: 'This is a test transcript for token counting.'
  };

  const result = await countLectureTokens(mockClient, 'claude-sonnet-4-6', transcript);

  assert.equal(result, 2500, 'Should return the input_tokens value from client');
  assert.ok(capturedArgs, 'countTokens should have been called');
  assert.equal(capturedArgs.model, 'claude-sonnet-4-6', 'model should be passed');
  assert.ok(typeof capturedArgs.system === 'string', 'system should be a string');
  assert.ok(Array.isArray(capturedArgs.messages), 'messages should be an array');
  assert.ok(capturedArgs.messages.length > 0, 'messages should not be empty');
  assert.equal(capturedArgs.messages[0].role, 'user', 'first message should be user role');
});

test('countLectureTokens propagates errors from countTokens', async () => {
  const errorClient = {
    beta: {
      messages: {
        countTokens: async () => {
          throw new Error('API token count failed');
        }
      }
    }
  };

  const transcript = {
    lectureTitle: 'Test Lecture',
    sectionName: 'Test Section',
    transcript: 'Test transcript.'
  };

  await assert.rejects(
    () => countLectureTokens(errorClient, 'claude-sonnet-4-6', transcript),
    { message: 'API token count failed' }
  );
});

// ============================================================
// Test 5: formatEstimateTable output structure
// ============================================================
test('formatEstimateTable contains correct headers and row data', () => {
  const rows = [
    { name: 'lecture-01', inputTokens: 1500, outputTokens: 8192, costDollars: 0.12588 }
  ];
  const totals = { inputTokens: 1500, outputTokens: 8192, costDollars: 0.12588 };

  const output = formatEstimateTable(rows, totals);

  assert.ok(typeof output === 'string', 'formatEstimateTable should return a string');
  assert.ok(output.includes('Lecture'), 'Should include "Lecture" header');
  assert.ok(output.includes('Input tok'), 'Should include "Input tok" column header');
  assert.ok(output.includes('Output tok'), 'Should include "Output tok" column header');
  assert.ok(output.includes('Est. cost'), 'Should include "Est. cost" column header');
  assert.ok(output.includes('lecture-01'), 'Should include lecture name in row');
  assert.ok(output.includes('$0.1259'), 'Should include formatted cost with 4 decimal places');
  assert.ok(output.includes('TOTAL'), 'Should include TOTAL row');
  assert.ok(output.includes('Estimated cost (upper bound)'), 'Should include upper bound label');
});

test('formatEstimateTable footnote contains token range numbers', () => {
  const rows = [
    { name: 'lecture-01', inputTokens: 1500, outputTokens: 8192, costDollars: 0.12588 }
  ];
  const totals = { inputTokens: 1500, outputTokens: 8192, costDollars: 0.12588 };

  const output = formatEstimateTable(rows, totals);

  assert.ok(output.includes('1,500'), 'Footnote should contain 1,500');
  assert.ok(output.includes('3,000'), 'Footnote should contain 3,000');
  assert.ok(output.includes('8,192'), 'Footnote should contain 8,192');
});

test('formatEstimateTable 2-row totals sum correctly', () => {
  const rows = [
    { name: 'lecture-01', inputTokens: 1500, outputTokens: 8192, costDollars: 0.12588 },
    { name: 'lecture-02', inputTokens: 2000, outputTokens: 8192, costDollars: 0.14388 }
  ];
  const totals = {
    inputTokens: 3500,
    outputTokens: 16384,
    costDollars: 0.26976
  };

  const output = formatEstimateTable(rows, totals);

  assert.ok(output.includes('lecture-01'), 'Should include first lecture');
  assert.ok(output.includes('lecture-02'), 'Should include second lecture');
  assert.ok(output.includes('TOTAL'), 'Should include TOTAL row');
  // Total cost should be formatted correctly (~$0.2698)
  assert.ok(output.includes('$0.2698'), 'Should include formatted total cost');
});
