// builder.test.js — Unit tests for section file and handbook builder module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test compiler/tests/builder.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSectionFile, sectionFilename, buildHandbook, toGfmAnchor } = require('../builder.js');

// Sample lectures for testing
const lectureA1 = {
  lectureTitle: 'What is a Project',
  sectionName: 'Intro',
  processedAt: '2026-03-20T10:00:00.000Z',
  notes: '## Key Concepts\n\nProjects are temporary.',
  quiz: '## Practice Questions\n\nQ1. What is a project?',
  filename: 'what-is-a-project.md'
};

const lectureA2 = {
  lectureTitle: 'Project Lifecycle',
  sectionName: 'Intro',
  processedAt: '2026-03-20T11:00:00.000Z',
  notes: '## Key Concepts\n\nProjects have phases.',
  quiz: '',
  filename: 'project-lifecycle.md'
};

const lectureB1 = {
  lectureTitle: 'Risk Overview',
  sectionName: 'Risk Management',
  processedAt: '2026-03-19T09:00:00.000Z',
  notes: '## Key Concepts\n\nRisk is uncertainty.',
  quiz: '## Practice Questions\n\nQ1. What is risk?',
  filename: 'risk-overview.md'
};

describe('buildSectionFile', () => {

  it('starts with "# {sectionName} \u2014 Notes" H1 heading for notes type', () => {
    const result = buildSectionFile('Intro', [lectureA1], 'notes');
    assert.ok(result.startsWith('# Intro \u2014 Notes'), `Should start with em-dash Notes heading, got: ${result.slice(0, 50)}`);
  });

  it('starts with "# {sectionName} \u2014 Quiz" H1 heading for quiz type', () => {
    const result = buildSectionFile('Intro', [lectureA1], 'quiz');
    assert.ok(result.startsWith('# Intro \u2014 Quiz'), `Should start with em-dash Quiz heading, got: ${result.slice(0, 50)}`);
  });

  it('includes lecture content under H2 heading with lecture title', () => {
    const result = buildSectionFile('Intro', [lectureA1, lectureA2], 'notes');
    assert.ok(result.includes('## What is a Project'), 'Should include first lecture H2');
    assert.ok(result.includes('## Project Lifecycle'), 'Should include second lecture H2');
    assert.ok(result.includes('Projects are temporary'), 'Should include notes content');
    assert.ok(result.includes('Projects have phases'), 'Should include second lecture content');
  });

  it('skips lectures with empty content for the given type', () => {
    // lectureA2 has empty quiz — should be skipped in quiz file
    const result = buildSectionFile('Intro', [lectureA1, lectureA2], 'quiz');
    assert.ok(result.includes('## What is a Project'), 'Should include lectureA1 (has quiz)');
    assert.ok(!result.includes('## Project Lifecycle'), 'Should skip lectureA2 (empty quiz)');
  });

  it('ends with a trailing newline', () => {
    const result = buildSectionFile('Intro', [lectureA1], 'notes');
    assert.ok(result.endsWith('\n'), 'Should end with trailing newline');
  });

  it('uses em dash character (not regular hyphen) in heading', () => {
    const result = buildSectionFile('Intro', [lectureA1], 'notes');
    // em dash is \u2014, not ASCII hyphen
    assert.ok(result.includes('\u2014'), 'Should contain em dash \u2014');
    assert.ok(!result.startsWith('# Intro - Notes'), 'Should not use regular hyphen');
    assert.ok(!result.startsWith('# Intro -- Notes'), 'Should not use double hyphen');
  });

});

describe('sectionFilename', () => {

  it('returns zero-padded number + slug + type + .md', () => {
    assert.equal(sectionFilename(1, 'Introduction to Project Management', 'notes'), '01-introduction-to-project-management-notes.md');
  });

  it('pads single-digit numbers with leading zero', () => {
    assert.equal(sectionFilename(3, 'Risk Management', 'quiz'), '03-risk-management-quiz.md');
  });

  it('handles double-digit section numbers', () => {
    assert.equal(sectionFilename(12, 'Agile Methods', 'notes'), '12-agile-methods-notes.md');
  });

});

describe('buildHandbook', () => {

  const orderedSections = ['Risk Management', 'Intro'];
  const { groupBySectionName } = require('../grouper.js');
  const groups = groupBySectionName([lectureA1, lectureA2, lectureB1]);

  it('starts with # PMP Study Handbook H1 heading', () => {
    const result = buildHandbook(orderedSections, groups);
    assert.ok(result.startsWith('# PMP Study Handbook'), `Should start with H1 title, got: ${result.slice(0, 50)}`);
  });

  it('contains ## Table of Contents H2 section', () => {
    const result = buildHandbook(orderedSections, groups);
    assert.ok(result.includes('## Table of Contents'), 'Should include Table of Contents H2');
  });

  it('ToC contains section links with GFM anchors', () => {
    const result = buildHandbook(orderedSections, groups);
    assert.ok(result.includes('- [Risk Management](#risk-management)'), 'Should include section ToC link');
    assert.ok(result.includes('- [Intro](#intro)'), 'Should include second section ToC link');
  });

  it('ToC contains nested lecture links with GFM anchors', () => {
    const result = buildHandbook(orderedSections, groups);
    assert.ok(result.includes('  - [What is a Project](#what-is-a-project)'), 'Should include lecture ToC link');
    assert.ok(result.includes('  - [Risk Overview](#risk-overview)'), 'Should include Risk lecture ToC link');
  });

  it('body contains ## section H2 and ### lecture H3 headings', () => {
    const result = buildHandbook(orderedSections, groups);
    assert.ok(result.includes('## Risk Management'), 'Should include section H2');
    assert.ok(result.includes('### Risk Overview'), 'Should include lecture H3');
    assert.ok(result.includes('## Intro'), 'Should include second section H2');
    assert.ok(result.includes('### What is a Project'), 'Should include lecture H3 from Intro');
  });

  it('includes notes content but NOT quiz content', () => {
    const result = buildHandbook(orderedSections, groups);
    assert.ok(result.includes('Projects are temporary'), 'Should include notes content');
    assert.ok(result.includes('Risk is uncertainty'), 'Should include risk notes content');
    assert.ok(!result.includes('Q1. What is a project?'), 'Should NOT include quiz content');
    assert.ok(!result.includes('Q1. What is risk?'), 'Should NOT include quiz content from risk lecture');
  });

  it('sections are separated by --- horizontal rules', () => {
    const result = buildHandbook(orderedSections, groups);
    // Should contain at least one --- separator between ToC and body, and between sections
    const hrCount = (result.match(/\n---\n/g) || []).length;
    assert.ok(hrCount >= 2, `Should have at least 2 horizontal rule separators, found ${hrCount}`);
  });

});

describe('toGfmAnchor', () => {

  it('converts heading to lowercase hyphenated anchor', () => {
    assert.equal(toGfmAnchor('Introduction to Project Management'), 'introduction-to-project-management');
  });

  it('removes special characters like question marks', () => {
    assert.equal(toGfmAnchor('What is a Project?'), 'what-is-a-project');
  });

  it('collapses spaces to single hyphens', () => {
    assert.equal(toGfmAnchor('Risk Overview'), 'risk-overview');
  });

  it('handles ampersands and punctuation', () => {
    const result = toGfmAnchor('Q&A: Introduction');
    // Chars that are not alphanumeric/space/hyphen should be removed
    assert.ok(!result.includes('&'), 'Should not contain ampersand');
    assert.ok(!result.includes(':'), 'Should not contain colon');
    assert.ok(result.startsWith('q'), 'Should start with q');
  });

});
