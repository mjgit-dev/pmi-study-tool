// eco-prompt.test.js — Unit tests for ECO domain classification module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test processor/tests/eco-prompt.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildEcoMessages, parseEcoTag, ECO_DOMAINS, ECO_WEIGHTS, printEcoDomainSummary } = require('../eco-prompt.js');

// Sample transcript for testing
const sampleTranscript = {
  lectureTitle: 'Stakeholder Engagement',
  sectionName: 'People Domain',
  transcript: 'Stakeholder engagement is about identifying and managing the expectations of people affected by the project. This includes team members, sponsors, customers, and other parties with an interest in the outcome.',
  wordCount: 32,
  extractedAt: '2026-03-21T12:00:00.000Z',
  captionType: 'manual',
  language: 'en'
};

// ============================================================
// ECO_DOMAINS
// ============================================================

describe('ECO_DOMAINS', () => {

  it('is an array with exactly 3 elements', () => {
    assert.ok(Array.isArray(ECO_DOMAINS), 'ECO_DOMAINS should be an array');
    assert.equal(ECO_DOMAINS.length, 3, 'ECO_DOMAINS should have 3 elements');
  });

  it('contains People, Process, and Business Environment', () => {
    assert.ok(ECO_DOMAINS.includes('People'), 'ECO_DOMAINS should contain "People"');
    assert.ok(ECO_DOMAINS.includes('Process'), 'ECO_DOMAINS should contain "Process"');
    assert.ok(ECO_DOMAINS.includes('Business Environment'), 'ECO_DOMAINS should contain "Business Environment"');
  });

});

// ============================================================
// ECO_WEIGHTS
// ============================================================

describe('ECO_WEIGHTS', () => {

  it('has a current key with People, Process, Business Environment percentages', () => {
    assert.ok(typeof ECO_WEIGHTS === 'object' && ECO_WEIGHTS !== null, 'ECO_WEIGHTS should be an object');
    assert.ok('current' in ECO_WEIGHTS, 'ECO_WEIGHTS should have a current key');
    assert.equal(ECO_WEIGHTS.current.People, 42, 'People weight should be 42');
    assert.equal(ECO_WEIGHTS.current.Process, 50, 'Process weight should be 50');
    assert.equal(ECO_WEIGHTS.current['Business Environment'], 8, 'Business Environment weight should be 8');
  });

});

// ============================================================
// buildEcoMessages
// ============================================================

describe('buildEcoMessages', () => {

  it('returns an object with system and messages properties', () => {
    const result = buildEcoMessages(sampleTranscript);
    assert.ok(result !== null && typeof result === 'object', 'Should return an object');
    assert.ok('system' in result, 'Should have a system property');
    assert.ok('messages' in result, 'Should have a messages property');
  });

  it('system is a non-empty string', () => {
    const { system } = buildEcoMessages(sampleTranscript);
    assert.equal(typeof system, 'string', 'system should be a string');
    assert.ok(system.length > 0, 'system should not be empty');
  });

  it('system prompt contains all three domain names', () => {
    const { system } = buildEcoMessages(sampleTranscript);
    assert.ok(system.includes('People'), 'system should contain "People"');
    assert.ok(system.includes('Process'), 'system should contain "Process"');
    assert.ok(system.includes('Business Environment'), 'system should contain "Business Environment"');
  });

  it('system prompt contains domain definitions', () => {
    const { system } = buildEcoMessages(sampleTranscript);
    assert.ok(system.includes('Leadership'), 'system should include People definition keyword "Leadership"');
    assert.ok(system.includes('Planning'), 'system should include Process definition keyword "Planning"');
    assert.ok(system.includes('governance'), 'system should include Business Environment definition keyword "governance"');
  });

  it('messages is an array with exactly one element', () => {
    const { messages } = buildEcoMessages(sampleTranscript);
    assert.ok(Array.isArray(messages), 'messages should be an array');
    assert.equal(messages.length, 1, 'messages should have exactly 1 element');
  });

  it('messages[0] has role "user"', () => {
    const { messages } = buildEcoMessages(sampleTranscript);
    assert.equal(messages[0].role, 'user', 'First message should have role "user"');
  });

  it('messages[0] content is a non-empty string', () => {
    const { messages } = buildEcoMessages(sampleTranscript);
    assert.equal(typeof messages[0].content, 'string', 'Message content should be a string');
    assert.ok(messages[0].content.length > 0, 'Message content should not be empty');
  });

  it('user message includes lectureTitle', () => {
    const { messages } = buildEcoMessages(sampleTranscript);
    assert.ok(
      messages[0].content.includes(sampleTranscript.lectureTitle),
      'User message should contain lectureTitle'
    );
  });

  it('user message includes sectionName', () => {
    const { messages } = buildEcoMessages(sampleTranscript);
    assert.ok(
      messages[0].content.includes(sampleTranscript.sectionName),
      'User message should contain sectionName'
    );
  });

  it('user message includes first 500 words of transcript', () => {
    const longTranscript = {
      lectureTitle: 'Long Lecture',
      sectionName: 'Section',
      transcript: Array.from({ length: 600 }, (_, i) => `word${i}`).join(' '),
    };
    const { messages } = buildEcoMessages(longTranscript);
    // The content should include word0 through word499 but not word500
    assert.ok(messages[0].content.includes('word0'), 'Should include first word');
    assert.ok(messages[0].content.includes('word499'), 'Should include word at index 499');
    assert.ok(!messages[0].content.includes('word500'), 'Should not include word at index 500');
  });

});

// ============================================================
// parseEcoTag
// ============================================================

describe('parseEcoTag', () => {

  it('returns "People" for exact "People" input', () => {
    assert.equal(parseEcoTag('People'), 'People');
  });

  it('returns "Process" for exact "Process" input', () => {
    assert.equal(parseEcoTag('Process'), 'Process');
  });

  it('returns "Business Environment" for exact "Business Environment" input', () => {
    assert.equal(parseEcoTag('Business Environment'), 'Business Environment');
  });

  it('trims whitespace before matching', () => {
    assert.equal(parseEcoTag('  People  '), 'People', 'Should trim whitespace and return People');
    assert.equal(parseEcoTag('\tProcess\n'), 'Process', 'Should trim tabs and newlines');
  });

  it('fuzzy fallback: returns People when text contains "People"', () => {
    assert.equal(
      parseEcoTag('The domain is People based on leadership content'),
      'People',
      'Should fuzzy-match People'
    );
  });

  it('fuzzy fallback: returns Process when text contains "Process"', () => {
    assert.equal(
      parseEcoTag('I believe this falls under Process domain'),
      'Process',
      'Should fuzzy-match Process'
    );
  });

  it('fuzzy fallback: returns Business Environment when text contains "Business Environment"', () => {
    assert.equal(
      parseEcoTag('This is a Business Environment lecture'),
      'Business Environment',
      'Should fuzzy-match Business Environment'
    );
  });

  it('returns null for empty string', () => {
    assert.equal(parseEcoTag(''), null, 'Should return null for empty string');
  });

  it('returns null for invalid domain name', () => {
    assert.equal(parseEcoTag('InvalidDomain'), null, 'Should return null for unrecognized domain');
  });

  it('returns null for whitespace-only input', () => {
    assert.equal(parseEcoTag('   '), null, 'Should return null for whitespace-only input');
  });

});

// ============================================================
// printEcoDomainSummary
// ============================================================

describe('printEcoDomainSummary', () => {

  it('prints domain counts in correct format', () => {
    const manifest = {
      'a.json': { filename: 'a.json', status: 'complete', ecoTag: 'People' },
      'b.json': { filename: 'b.json', status: 'complete', ecoTag: 'Process' },
    };

    const logged = [];
    const origLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      printEcoDomainSummary(manifest);
    } finally {
      console.log = origLog;
    }

    assert.equal(logged.length, 1, 'Should log exactly one line');
    assert.ok(logged[0].includes('People: 1'), 'Should show People: 1');
    assert.ok(logged[0].includes('Process: 1'), 'Should show Process: 1');
    assert.ok(logged[0].includes('Business Environment: 0'), 'Should show Business Environment: 0');
  });

  it('appends Untagged count when complete entries have no ecoTag', () => {
    const manifest = {
      'a.json': { filename: 'a.json', status: 'complete', ecoTag: 'People' },
      'b.json': { filename: 'b.json', status: 'complete' }, // no ecoTag
    };

    const logged = [];
    const origLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      printEcoDomainSummary(manifest);
    } finally {
      console.log = origLog;
    }

    assert.ok(logged[0].includes('Untagged: 1'), 'Should append Untagged: 1 when complete entry has no ecoTag');
  });

  it('skips non-entry keys like schemaVersion (typeof entry !== object or missing status)', () => {
    const manifest = {
      schemaVersion: 2,
      'a.json': { filename: 'a.json', status: 'complete', ecoTag: 'Process' },
    };

    const logged = [];
    const origLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      printEcoDomainSummary(manifest);
    } finally {
      console.log = origLog;
    }

    assert.ok(logged[0].includes('Process: 1'), 'Should count Process: 1');
    assert.ok(!logged[0].includes('Untagged: 1'), 'Should not count schemaVersion as untagged');
  });

  it('does not append Untagged when untagged count is 0', () => {
    const manifest = {
      'a.json': { filename: 'a.json', status: 'complete', ecoTag: 'People' },
    };

    const logged = [];
    const origLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      printEcoDomainSummary(manifest);
    } finally {
      console.log = origLog;
    }

    assert.ok(!logged[0].includes('Untagged'), 'Should not include Untagged when count is 0');
  });

});
