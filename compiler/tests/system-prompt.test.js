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

describe('buildSystemPrompt with ecoStats', () => {
  it('buildSystemPrompt(null) returns prompt without ECO section', () => {
    const result = buildSystemPrompt(null);
    assert.ok(!result.includes('## ECO Domain Coverage'), 'ECO section should be absent when null passed');
  });

  it('buildSystemPrompt with ecoStats includes ECO Domain Coverage heading', () => {
    const result = buildSystemPrompt({ People: 12, Process: 20, 'Business Environment': 8 });
    assert.ok(result.includes('## ECO Domain Coverage'), 'Missing ECO Domain Coverage heading');
  });

  it('buildSystemPrompt with ecoStats includes weight percentages', () => {
    const result = buildSystemPrompt({ People: 12, Process: 20, 'Business Environment': 8 });
    assert.ok(result.includes('People: 42%'), 'Missing People: 42% weight');
    assert.ok(result.includes('Process: 50%'), 'Missing Process: 50% weight');
    assert.ok(result.includes('Business Environment: 8%'), 'Missing Business Environment: 8% weight');
  });

  it('buildSystemPrompt with ecoStats includes lecture count table', () => {
    const result = buildSystemPrompt({ People: 12, Process: 20, 'Business Environment': 8 });
    assert.ok(result.includes('| People | 12 | 42% |'), 'Missing People row in table');
    assert.ok(result.includes('| Process | 20 | 50% |'), 'Missing Process row in table');
    assert.ok(result.includes('| Business Environment | 8 | 8% |'), 'Missing Business Environment row in table');
  });

  it('buildSystemPrompt with ecoStats includes quiz weighting instruction', () => {
    const result = buildSystemPrompt({ People: 12, Process: 20, 'Business Environment': 8 });
    assert.ok(result.includes('weight your question selection proportionally'), 'Missing quiz weighting instruction');
  });

  it('buildSystemPrompt with zero counts still includes ECO section', () => {
    const result = buildSystemPrompt({ People: 0, Process: 0, 'Business Environment': 0 });
    assert.ok(result.includes('## ECO Domain Coverage'), 'ECO section should be present even with zero counts');
    assert.ok(result.includes('| People | 0 | 42% |'), 'Missing People row with zero count');
  });
});
