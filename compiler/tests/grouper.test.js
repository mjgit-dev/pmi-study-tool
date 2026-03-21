// grouper.test.js — Unit tests for section grouping module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test compiler/tests/grouper.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { groupBySectionName, orderSections, toSlug } = require('../grouper.js');

const lectureA1 = {
  lectureTitle: 'What is a Project',
  sectionName: 'Section A',
  processedAt: '2026-03-20T10:00:00.000Z',
  notes: 'Notes A1',
  quiz: 'Quiz A1',
  filename: 'what-is-a-project.md'
};

const lectureA2 = {
  lectureTitle: 'Project Lifecycle',
  sectionName: 'Section A',
  processedAt: '2026-03-20T11:00:00.000Z',
  notes: 'Notes A2',
  quiz: 'Quiz A2',
  filename: 'project-lifecycle.md'
};

const lectureB1 = {
  lectureTitle: 'Risk Overview',
  sectionName: 'Section B',
  processedAt: '2026-03-19T09:00:00.000Z',
  notes: 'Notes B1',
  quiz: 'Quiz B1',
  filename: 'risk-overview.md'
};

describe('groupBySectionName', () => {

  it('groups lectures by sectionName returning a Map with correct keys', () => {
    const groups = groupBySectionName([lectureA1, lectureA2, lectureB1]);
    assert.ok(groups instanceof Map, 'Should return a Map');
    assert.ok(groups.has('Section A'), 'Map should have Section A key');
    assert.ok(groups.has('Section B'), 'Map should have Section B key');
    assert.equal(groups.get('Section A').length, 2, 'Section A should have 2 lectures');
    assert.equal(groups.get('Section B').length, 1, 'Section B should have 1 lecture');
  });

  it('sorts lectures within each group by processedAt ascending', () => {
    const outOfOrder = [lectureA2, lectureA1, lectureB1];
    const groups = groupBySectionName(outOfOrder);
    const sectionA = groups.get('Section A');
    assert.equal(sectionA[0].lectureTitle, 'What is a Project', 'Earlier processedAt should come first');
    assert.equal(sectionA[1].lectureTitle, 'Project Lifecycle', 'Later processedAt should come second');
  });

  it('groups lectures with missing sectionName under __unknown__', () => {
    const noSection = {
      lectureTitle: 'Orphan Lecture',
      sectionName: null,
      processedAt: '2026-03-21T00:00:00.000Z',
      notes: 'Notes',
      quiz: '',
      filename: 'orphan.md'
    };
    const groups = groupBySectionName([lectureA1, noSection]);
    assert.ok(groups.has('__unknown__'), 'Should have __unknown__ group');
    assert.equal(groups.get('__unknown__').length, 1);
  });

  it('uses filename as secondary tiebreaker when processedAt values are equal', () => {
    const tie1 = { ...lectureA1, lectureTitle: 'Alpha', filename: 'alpha.md', processedAt: '2026-03-20T10:00:00.000Z' };
    const tie2 = { ...lectureA1, lectureTitle: 'Zeta', filename: 'zeta.md', processedAt: '2026-03-20T10:00:00.000Z' };
    const groups = groupBySectionName([tie2, tie1]);
    const sectionA = groups.get('Section A');
    assert.equal(sectionA[0].lectureTitle, 'Alpha', 'alpha.md should sort before zeta.md as tiebreaker');
  });

});

describe('orderSections', () => {

  it('returns section names sorted by earliest processedAt in each group', () => {
    // Section B has earlier processedAt (2026-03-19) vs Section A (2026-03-20)
    const groups = groupBySectionName([lectureA1, lectureA2, lectureB1]);
    const ordered = orderSections(groups);
    assert.ok(Array.isArray(ordered), 'Should return an array');
    assert.equal(ordered[0], 'Section B', 'Section B should come first (earlier date)');
    assert.equal(ordered[1], 'Section A', 'Section A should come second (later date)');
  });

});

describe('toSlug', () => {

  it('converts section name to lowercase hyphenated slug', () => {
    assert.equal(toSlug('Introduction to Project Management'), 'introduction-to-project-management');
  });

  it('removes non-alphanumeric characters and trims leading/trailing hyphens', () => {
    assert.equal(toSlug('Q&A: Introduction!'), 'q-a-introduction');
  });

  it('collapses multiple hyphens into one', () => {
    assert.equal(toSlug('Risk -- Management'), 'risk-management');
  });

});
