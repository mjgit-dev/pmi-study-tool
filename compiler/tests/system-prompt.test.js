'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSystemPrompt } = require('../system-prompt');

describe('buildSystemPrompt', () => {
  it('returns a string', () => {
    const result = buildSystemPrompt();
    assert.equal(typeof result, 'string');
  });

  it('contains an H1 title with PMP Study Assistant', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('# PMP Study Assistant'), 'Missing H1 title');
  });

  it('contains Quiz me study mode', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('Quiz me') || result.includes('Quiz Me'), 'Missing Quiz me study mode');
  });

  it('contains Explain a Concept study mode', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('Explain a Concept') || result.includes('Explain a concept'), 'Missing Explain a concept study mode');
  });

  it('contains Flashcard Drill study mode', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('Flashcard Drill') || result.includes('Flashcard drill'), 'Missing Flashcard drill study mode');
  });

  it('contains Weak Area Focus study mode', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('Weak Area Focus') || result.includes('Weak area focus'), 'Missing Weak area focus study mode');
  });

  it('contains grounding rule requiring citation of specific lectures', () => {
    const result = buildSystemPrompt();
    assert.ok(
      result.includes('cite the specific lecture') || result.includes('cite specific lectures'),
      'Missing grounding rule about citing specific lectures'
    );
  });

  it('contains grounding rule requiring refusal of ungrounded answers', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('refuse') || result.includes('do NOT supplement'), 'Missing refusal grounding rule');
  });

  it('does not contain placeholder text like TODO or TBD', () => {
    const result = buildSystemPrompt();
    assert.ok(!result.includes('TODO'), 'Output contains TODO placeholder');
    assert.ok(!result.includes('TBD'), 'Output contains TBD placeholder');
  });
});
