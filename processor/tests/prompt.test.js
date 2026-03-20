// prompt.test.js — Unit tests for prompt construction module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test processor/tests/prompt.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildMessages } = require('../prompt.js');

// Sample transcript matching the Phase 1 extractor payload shape
const sampleTranscript = {
  lectureTitle: 'What is a Project',
  sectionName: 'Introduction to Project Management',
  transcript: 'A project is a temporary endeavor undertaken to create a unique product, service, or result.',
  wordCount: 15,
  extractedAt: '2026-03-20T12:00:00.000Z',
  captionType: 'manual',
  language: 'en'
};

// ============================================================
// buildMessages
// ============================================================

describe('buildMessages', () => {

  it('returns an object with system and messages properties', () => {
    const result = buildMessages(sampleTranscript);
    assert.ok(result !== null && typeof result === 'object', 'Should return an object');
    assert.ok('system' in result, 'Should have a system property');
    assert.ok('messages' in result, 'Should have a messages property');
  });

  it('system is a string', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.equal(typeof system, 'string', 'system should be a string');
    assert.ok(system.length > 0, 'system should not be empty');
  });

  it('messages is an array with exactly one element', () => {
    const { messages } = buildMessages(sampleTranscript);
    assert.ok(Array.isArray(messages), 'messages should be an array');
    assert.equal(messages.length, 1, 'messages should have exactly 1 element');
  });

  it('messages[0] has role "user"', () => {
    const { messages } = buildMessages(sampleTranscript);
    assert.equal(messages[0].role, 'user', 'First message should have role "user"');
  });

  it('messages[0] has a content string', () => {
    const { messages } = buildMessages(sampleTranscript);
    assert.equal(typeof messages[0].content, 'string', 'Message content should be a string');
    assert.ok(messages[0].content.length > 0, 'Message content should not be empty');
  });

  it('system prompt contains "## Key Concepts" header instruction', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('## Key Concepts'), 'System prompt should contain "## Key Concepts"');
  });

  it('system prompt contains "## Summary" header instruction', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('## Summary'), 'System prompt should contain "## Summary"');
  });

  it('system prompt contains "## Examples" header instruction', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('## Examples'), 'System prompt should contain "## Examples"');
  });

  it('system prompt instructs to output ONLY those three sections with no preamble', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('Output ONLY'), 'System prompt should include "Output ONLY" instruction');
  });

  it('user message contains transcript.lectureTitle value', () => {
    const { messages } = buildMessages(sampleTranscript);
    assert.ok(
      messages[0].content.includes(sampleTranscript.lectureTitle),
      'User message should contain lectureTitle'
    );
  });

  it('user message contains transcript.sectionName value', () => {
    const { messages } = buildMessages(sampleTranscript);
    assert.ok(
      messages[0].content.includes(sampleTranscript.sectionName),
      'User message should contain sectionName'
    );
  });

  it('user message contains transcript.transcript value', () => {
    const { messages } = buildMessages(sampleTranscript);
    assert.ok(
      messages[0].content.includes(sampleTranscript.transcript),
      'User message should contain transcript text'
    );
  });

  it('works with different transcript data', () => {
    const other = {
      lectureTitle: 'Stakeholder Management',
      sectionName: 'People Domain',
      transcript: 'Stakeholders are individuals who are affected by a project outcome.',
      wordCount: 10,
      extractedAt: '2026-03-20T14:00:00.000Z',
      captionType: 'auto-generated',
      language: 'en'
    };
    const { system, messages } = buildMessages(other);
    assert.ok(messages[0].content.includes('Stakeholder Management'), 'Should include different lectureTitle');
    assert.ok(messages[0].content.includes('People Domain'), 'Should include different sectionName');
    assert.ok(messages[0].content.includes('Stakeholders are individuals'), 'Should include different transcript');
    assert.ok(system.includes('## Key Concepts'), 'System prompt should still have Key Concepts header');
  });

});
