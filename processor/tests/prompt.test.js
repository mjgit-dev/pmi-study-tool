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

  it('system prompt instructs to use ## H2 headings per topic', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('## H2'), 'System prompt should reference ## H2 headings');
  });

  it('system prompt instructs to add Exam Tip callouts', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('Exam Tip'), 'System prompt should contain "Exam Tip" instruction');
  });

  it('system prompt instructs to add Bottom line per section', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('Bottom line'), 'System prompt should contain "Bottom line" instruction');
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
    assert.ok(system.includes('Exam Tip'), 'System prompt should still have Exam Tip instruction');
  });

  // Phase 3 — Practice Questions prompt instructions
  it('system prompt includes ## Practice Questions section instruction', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('## Practice Questions'), 'System prompt should contain ## Practice Questions instruction');
  });

  it('system prompt requires questions grounded in THIS lecture transcript', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('Do NOT write generic PMBOK recall questions'), 'System prompt should forbid generic PMBOK recall');
  });

  it('system prompt requires explaining why wrong answers are wrong', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('Why each wrong option is wrong'), 'System prompt should instruct eliminator-style explanations');
  });

  // Phase 3 — Flashcards prompt instructions
  it('system prompt includes ## Flashcards section instruction', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('## Flashcards'), 'System prompt should contain ## Flashcards instruction');
  });

  it('system prompt specifies flashcard format as **Term** — definition', () => {
    const { system } = buildMessages(sampleTranscript);
    assert.ok(system.includes('**Term**'), 'System prompt should contain **Term** format instruction');
  });

  it('system prompt places Practice Questions before Flashcards in instructions', () => {
    const { system } = buildMessages(sampleTranscript);
    const pqIndex = system.indexOf('## Practice Questions');
    const fcIndex = system.indexOf('## Flashcards');
    assert.ok(pqIndex < fcIndex, 'Practice Questions instruction should appear before Flashcards instruction');
  });

});
