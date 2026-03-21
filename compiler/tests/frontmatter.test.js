// frontmatter.test.js — Unit tests for frontmatter parsing module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test compiler/tests/frontmatter.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter } = require('../frontmatter.js');

describe('parseFrontmatter', () => {

  it('returns an object with lectureTitle, sectionName, and processedAt from standard frontmatter', () => {
    const content = '---\nlectureTitle: "What is a Project"\nsectionName: "Intro"\nprocessedAt: 2026-03-20T23:16:22.127Z\n---\nbody content here';
    const result = parseFrontmatter(content);
    assert.ok(result !== null, 'Should not return null for valid frontmatter');
    assert.equal(result.lectureTitle, 'What is a Project');
    assert.equal(result.sectionName, 'Intro');
    assert.equal(result.processedAt, '2026-03-20T23:16:22.127Z');
  });

  it('correctly unquotes JSON-quoted strings with special characters', () => {
    const content = '---\nlectureTitle: "Stakeholders & Communication"\nsectionName: "Q&A: Intro"\nprocessedAt: 2026-03-20T10:00:00.000Z\n---\nbody';
    const result = parseFrontmatter(content);
    assert.ok(result !== null, 'Should not return null');
    assert.equal(result.lectureTitle, 'Stakeholders & Communication');
    assert.equal(result.sectionName, 'Q&A: Intro');
  });

  it('returns null when content has no frontmatter', () => {
    const result = parseFrontmatter('no frontmatter here');
    assert.equal(result, null);
  });

  it('only matches the first --- block, not horizontal rules in body', () => {
    const content = '---\nlectureTitle: "My Lecture"\nsectionName: "My Section"\nprocessedAt: 2026-03-20T00:00:00.000Z\n---\n# Title\n\n---\n\nsome content after a horizontal rule\n\n---';
    const result = parseFrontmatter(content);
    assert.ok(result !== null, 'Should parse frontmatter despite --- in body');
    assert.equal(result.lectureTitle, 'My Lecture');
    assert.equal(result.sectionName, 'My Section');
    assert.equal(result.processedAt, '2026-03-20T00:00:00.000Z');
  });

  it('handles processedAt as a raw (unquoted) value', () => {
    const content = '---\nlectureTitle: "Test Lecture"\nsectionName: "Test Section"\nprocessedAt: 2026-01-15T12:30:00.000Z\n---\nbody';
    const result = parseFrontmatter(content);
    assert.ok(result !== null, 'Should not return null');
    assert.equal(result.processedAt, '2026-01-15T12:30:00.000Z');
  });

});
