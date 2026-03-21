// sections.test.js — Unit tests for sections splitting module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test compiler/tests/sections.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractBody, splitNotesAndQuiz } = require('../sections.js');

describe('extractBody', () => {

  it('returns everything after the closing --- of frontmatter', () => {
    const content = '---\nlectureTitle: "Test"\nsectionName: "S1"\nprocessedAt: 2026-01-01T00:00:00.000Z\n---\n# Title\n\nBody content here';
    const body = extractBody(content);
    assert.ok(body.includes('# Title'), 'Should include body content');
    assert.ok(!body.includes('lectureTitle'), 'Should not include frontmatter fields');
  });

  it('returns full content if no frontmatter present', () => {
    const content = 'No frontmatter here\njust plain text';
    const body = extractBody(content);
    assert.equal(body, content);
  });

});

describe('splitNotesAndQuiz', () => {

  it('splits body at ## Practice Questions returning notes before and quiz from that point onward', () => {
    const body = '# Title\n\n## Key Concepts\n\nSome notes content.\n\n## Practice Questions\n\nQ1. What is a project?\n\n## Flashcards\n\n- **Term**: Definition';
    const { notes, quiz } = splitNotesAndQuiz(body);
    assert.ok(notes.includes('## Key Concepts'), 'Notes should include Key Concepts section');
    assert.ok(!notes.includes('## Practice Questions'), 'Notes should not include Practice Questions');
    assert.ok(quiz.includes('## Practice Questions'), 'Quiz should start with Practice Questions');
    assert.ok(quiz.includes('## Flashcards'), 'Quiz should include Flashcards section');
  });

  it('returns full body as notes and empty string as quiz when no ## Practice Questions present', () => {
    const body = '# Title\n\n## Key Concepts\n\nContent here.';
    const { notes, quiz } = splitNotesAndQuiz(body);
    assert.ok(notes.includes('## Key Concepts'), 'Notes should include all content');
    assert.equal(quiz, '', 'Quiz should be empty string');
  });

  it('quiz portion includes both ## Practice Questions and ## Flashcards content', () => {
    const body = '# Title\n\nNotes content.\n\n## Practice Questions\n\nQ1. Question one.\n\n## Flashcards\n\n- **Card**: Answer';
    const { notes, quiz } = splitNotesAndQuiz(body);
    assert.ok(quiz.includes('Q1. Question one.'), 'Quiz should include practice question content');
    assert.ok(quiz.includes('- **Card**: Answer'), 'Quiz should include flashcard content');
  });

  it('does not split at ## Flashcards — Flashcards is part of quiz section', () => {
    const body = 'Notes section.\n\n## Practice Questions\n\nSome questions.\n\n## Flashcards\n\n- Term: def';
    const { notes, quiz } = splitNotesAndQuiz(body);
    assert.ok(quiz.includes('## Flashcards'), 'Flashcards should be in quiz not split off');
    assert.ok(!notes.includes('## Flashcards'), 'Notes should not include Flashcards');
  });

});
