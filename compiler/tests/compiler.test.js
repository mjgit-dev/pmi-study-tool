// compiler.test.js — Integration tests for compileAll ECO domain tagging
// Exercises the full path: .md files with ecoTag frontmatter -> compileAll() -> CLAUDE_INSTRUCTIONS.md
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test compiler/tests/compiler.test.js

'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { compileAll } = require('../../compiler.js');

// Helper: create temp dir with .md fixture files
function createTempFixtures(files) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compiler-eco-'));
  const inputDir = path.join(tmpDir, 'input');
  const outputDir = path.join(tmpDir, 'output');
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(inputDir, name), content, 'utf8');
  }
  return { tmpDir, inputDir, outputDir };
}

// Fixture templates
const FIXTURE_MD_WITH_TAG = (title, section, tag) => `---
lectureTitle: ${JSON.stringify(title)}
sectionName: ${JSON.stringify(section)}
processedAt: "2026-03-20T12:00:00.000Z"
ecoTag: ${JSON.stringify(tag)}
---

## Key Concepts
- Sample concept for ${title}

## Practice Questions
1. Sample question?

## Flashcards
- Term: Definition for ${title}
`;

const FIXTURE_MD_NO_TAG = (title, section) => `---
lectureTitle: ${JSON.stringify(title)}
sectionName: ${JSON.stringify(section)}
processedAt: "2026-03-20T12:00:00.000Z"
---

## Key Concepts
- Sample concept for ${title}

## Practice Questions
1. Sample question?

## Flashcards
- Term: Definition for ${title}
`;

describe('compileAll ECO domain integration', () => {
  const cleanupDirs = [];

  afterEach(() => {
    for (const dir of cleanupDirs.splice(0)) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it('compileAll with ecoTag-bearing .md files includes ECO Domain Coverage in CLAUDE_INSTRUCTIONS.md', () => {
    const { tmpDir, inputDir, outputDir } = createTempFixtures({
      'lecture-a.md': FIXTURE_MD_WITH_TAG('Lecture A', 'Section One', 'People'),
      'lecture-b.md': FIXTURE_MD_WITH_TAG('Lecture B', 'Section One', 'People'),
      'lecture-c.md': FIXTURE_MD_WITH_TAG('Lecture C', 'Section Two', 'Process'),
    });
    cleanupDirs.push(tmpDir);

    compileAll(inputDir, outputDir, { dryRun: false });

    const output = fs.readFileSync(path.join(outputDir, 'CLAUDE_INSTRUCTIONS.md'), 'utf8');
    assert.ok(output.includes('## ECO Domain Coverage'), 'Missing ## ECO Domain Coverage heading');
    assert.ok(output.includes('People: 42%'), 'Missing People: 42% weight');
    assert.ok(output.includes('| People | 2 | 42% |'), 'Missing People row with count 2');
    assert.ok(output.includes('| Process | 1 | 50% |'), 'Missing Process row with count 1');
    assert.ok(output.includes('| Business Environment | 0 | 8% |'), 'Missing Business Environment row with count 0');
  });

  it('compileAll without ecoTag in .md files omits ECO section from CLAUDE_INSTRUCTIONS.md', () => {
    const { tmpDir, inputDir, outputDir } = createTempFixtures({
      'lecture-x.md': FIXTURE_MD_NO_TAG('Lecture X', 'Section Alpha'),
      'lecture-y.md': FIXTURE_MD_NO_TAG('Lecture Y', 'Section Alpha'),
    });
    cleanupDirs.push(tmpDir);

    compileAll(inputDir, outputDir, { dryRun: false });

    const output = fs.readFileSync(path.join(outputDir, 'CLAUDE_INSTRUCTIONS.md'), 'utf8');
    assert.ok(!output.includes('## ECO Domain Coverage'), 'ECO section should be absent when no ecoTag in fixtures');
    assert.ok(output.includes('# PMP Study Assistant'), 'Basic content should still be present');
  });

  it('compileAll with mixed tagged/untagged files includes ECO section with partial counts', () => {
    const { tmpDir, inputDir, outputDir } = createTempFixtures({
      'lecture-p.md': FIXTURE_MD_WITH_TAG('Lecture P', 'Section Biz', 'Business Environment'),
      'lecture-q.md': FIXTURE_MD_NO_TAG('Lecture Q', 'Section Biz'),
    });
    cleanupDirs.push(tmpDir);

    compileAll(inputDir, outputDir, { dryRun: false });

    const output = fs.readFileSync(path.join(outputDir, 'CLAUDE_INSTRUCTIONS.md'), 'utf8');
    assert.ok(output.includes('## ECO Domain Coverage'), 'ECO section should be present — at least one file has a tag');
    assert.ok(output.includes('| Business Environment | 1 | 8% |'), 'Missing Business Environment row with count 1');
  });
});
