// eco-tagger.test.js — Tests for ECO re-classification tagger
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test processor/tests/eco-tagger.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { patchFrontmatterEcoTag, retagAll } = require('../eco-tagger.js');

// ============================================================
// Test Fixtures
// ============================================================

const SAMPLE_MD_NO_TAG = '---\nlectureTitle: "Test"\nsectionName: "Section"\nprocessedAt: 2026-03-20T12:00:00.000Z\n---\n## Key Concepts\n- Concept one\n\n## Practice Questions\n1. Question?\n\n## Flashcards\n- Term: Definition\n';
const SAMPLE_MD_WITH_TAG = '---\nlectureTitle: "Test"\nsectionName: "Section"\nprocessedAt: 2026-03-20T12:00:00.000Z\necoTag: "People"\n---\n## Key Concepts\n- Concept one\n';

// ============================================================
// patchFrontmatterEcoTag
// ============================================================

describe('patchFrontmatterEcoTag', () => {

  it('inserts ecoTag into frontmatter that lacks one', () => {
    const result = patchFrontmatterEcoTag(SAMPLE_MD_NO_TAG, 'Process');
    assert.ok(result.includes('ecoTag: "Process"'), 'Result should contain ecoTag: "Process"');
    assert.ok(result.startsWith('---\n'), 'Result should start with frontmatter delimiter');
  });

  it('replaces existing ecoTag (idempotent)', () => {
    const result = patchFrontmatterEcoTag(SAMPLE_MD_WITH_TAG, 'Process');
    assert.ok(result.includes('ecoTag: "Process"'), 'Result should contain new ecoTag value');
    assert.ok(!result.includes('ecoTag: "People"'), 'Old ecoTag should be replaced');
  });

  it('body content after frontmatter is byte-identical before and after patch', () => {
    // Extract body from original (everything after closing ---)
    const originalBodyStart = SAMPLE_MD_NO_TAG.indexOf('\n---\n') + 5;
    const originalBody = SAMPLE_MD_NO_TAG.slice(originalBodyStart);

    const result = patchFrontmatterEcoTag(SAMPLE_MD_NO_TAG, 'Process');
    const resultBodyStart = result.indexOf('\n---\n') + 5;
    const resultBody = result.slice(resultBodyStart);

    assert.equal(resultBody, originalBody, 'Body content must be byte-identical after patch');
    assert.ok(result.includes('## Key Concepts'), 'Body should contain Key Concepts section');
    assert.ok(result.includes('## Practice Questions'), 'Body should contain Practice Questions section');
    assert.ok(result.includes('## Flashcards'), 'Body should contain Flashcards section');
  });

  it('throws Error with "No frontmatter found" when no frontmatter block', () => {
    const noFrontmatter = '## Key Concepts\n- Concept one\n';
    assert.throws(
      () => patchFrontmatterEcoTag(noFrontmatter, 'Process'),
      (err) => {
        assert.ok(err instanceof Error, 'Should throw an Error');
        assert.ok(err.message.includes('No frontmatter found'), 'Error message should include "No frontmatter found"');
        return true;
      }
    );
  });

  it('handles frontmatter without trailing newline after closing ---', () => {
    // No trailing newline after the closing ---
    const noTrailingNewline = '---\nlectureTitle: "Test"\nsectionName: "Section"\n---';
    const result = patchFrontmatterEcoTag(noTrailingNewline, 'People');
    assert.ok(result.includes('ecoTag: "People"'), 'Should patch frontmatter even without trailing newline');
  });

  it('does not create duplicate ecoTag lines when called twice with different values', () => {
    const first = patchFrontmatterEcoTag(SAMPLE_MD_NO_TAG, 'Process');
    const second = patchFrontmatterEcoTag(first, 'People');

    // Count occurrences of ecoTag: in the result
    const ecoTagMatches = second.match(/^ecoTag:/gm);
    assert.ok(ecoTagMatches !== null, 'Should have at least one ecoTag line');
    assert.equal(ecoTagMatches.length, 1, 'Should have exactly one ecoTag line (no duplicates)');
    assert.ok(second.includes('ecoTag: "People"'), 'Should have the last-set value');
    assert.ok(!second.includes('ecoTag: "Process"'), 'Old value should be replaced');
  });

});

// ============================================================
// retagAll integration tests
// ============================================================

function makeMockEcoClient(ecoTag) {
  const callCount = { value: 0 };
  return {
    _callCount: callCount,
    messages: {
      create: async () => {
        callCount.value++;
        return { content: [{ text: ecoTag || 'Process' }] };
      }
    }
  };
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pmi-eco-test-'));
}

describe('retagAll', () => {

  it('tags untagged .md files and updates manifest', async () => {
    const tmpDir = makeTempDir();
    const manifestPath = path.join(tmpDir, 'processing-state.json');
    const mdPath = path.join(tmpDir, 'lecture-01.md');

    fs.writeFileSync(mdPath, SAMPLE_MD_NO_TAG, 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify({
      'lecture-01.json': { filename: 'lecture-01.json', status: 'complete' }
    }, null, 2), 'utf8');

    const client = makeMockEcoClient('People');
    const result = await retagAll(tmpDir, {}, client, manifestPath);

    assert.equal(result.tagged, 1, 'Should report 1 tagged');
    assert.equal(result.skipped, 0, 'Should report 0 skipped');
    assert.equal(result.failed, 0, 'Should report 0 failed');

    const updatedContent = fs.readFileSync(mdPath, 'utf8');
    assert.ok(updatedContent.includes('ecoTag: "People"'), 'File should have ecoTag: "People" in frontmatter');

    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(updatedManifest['lecture-01.json'].ecoTag, 'People', 'Manifest entry should have ecoTag');
    assert.ok(updatedManifest['lecture-01.json'].ecoTaggedAt, 'Manifest entry should have ecoTaggedAt timestamp');
  });

  it('skips already-tagged files without --force', async () => {
    const tmpDir = makeTempDir();
    const manifestPath = path.join(tmpDir, 'processing-state.json');
    const mdPath = path.join(tmpDir, 'lecture-01.md');

    fs.writeFileSync(mdPath, SAMPLE_MD_WITH_TAG, 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify({
      'lecture-01.json': { filename: 'lecture-01.json', status: 'complete', ecoTag: 'People' }
    }, null, 2), 'utf8');

    const client = makeMockEcoClient('Process');
    const result = await retagAll(tmpDir, {}, client, manifestPath);

    assert.equal(result.skipped, 1, 'Should report 1 skipped');
    assert.equal(result.tagged, 0, 'Should report 0 tagged');
    assert.equal(client._callCount.value, 0, 'Mock client should not have been called');
  });

  it('retagAll --force re-tags already-tagged files', async () => {
    const tmpDir = makeTempDir();
    const manifestPath = path.join(tmpDir, 'processing-state.json');
    const mdPath = path.join(tmpDir, 'lecture-01.md');

    fs.writeFileSync(mdPath, SAMPLE_MD_WITH_TAG, 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify({
      'lecture-01.json': { filename: 'lecture-01.json', status: 'complete', ecoTag: 'People' }
    }, null, 2), 'utf8');

    const client = makeMockEcoClient('Process');
    const result = await retagAll(tmpDir, { force: true }, client, manifestPath);

    assert.equal(result.tagged, 1, 'Should report 1 tagged');
    assert.equal(client._callCount.value, 1, 'Mock client should have been called once');

    const updatedContent = fs.readFileSync(mdPath, 'utf8');
    assert.ok(updatedContent.includes('ecoTag: "Process"'), 'File should be re-tagged with new value');
  });

  it('does not modify body content during re-tagging', async () => {
    const tmpDir = makeTempDir();
    const manifestPath = path.join(tmpDir, 'processing-state.json');
    const mdPath = path.join(tmpDir, 'lecture-01.md');

    fs.writeFileSync(mdPath, SAMPLE_MD_NO_TAG, 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify({
      'lecture-01.json': { filename: 'lecture-01.json', status: 'complete' }
    }, null, 2), 'utf8');

    // Extract body before re-tagging
    const originalBodyStart = SAMPLE_MD_NO_TAG.indexOf('\n---\n') + 5;
    const originalBody = SAMPLE_MD_NO_TAG.slice(originalBodyStart);

    const client = makeMockEcoClient('Process');
    await retagAll(tmpDir, {}, client, manifestPath);

    const updatedContent = fs.readFileSync(mdPath, 'utf8');
    const updatedBodyStart = updatedContent.indexOf('\n---\n') + 5;
    const updatedBody = updatedContent.slice(updatedBodyStart);

    assert.equal(updatedBody, originalBody, 'Body content must be byte-identical after re-tagging');
  });

  it('prints domain summary after completion', async () => {
    const tmpDir = makeTempDir();
    const manifestPath = path.join(tmpDir, 'processing-state.json');
    const mdPath = path.join(tmpDir, 'lecture-01.md');

    fs.writeFileSync(mdPath, SAMPLE_MD_NO_TAG, 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify({
      'lecture-01.json': { filename: 'lecture-01.json', status: 'complete' }
    }, null, 2), 'utf8');

    const client = makeMockEcoClient('People');

    const logged = [];
    const origLog = console.log;
    const origWrite = process.stdout.write;
    console.log = (...args) => logged.push(args.join(' '));
    process.stdout.write = (str) => {};
    try {
      await retagAll(tmpDir, {}, client, manifestPath);
    } finally {
      console.log = origLog;
      process.stdout.write = origWrite;
    }

    const summaryLine = logged.find(l => l.includes('People:') && l.includes('Process:') && l.includes('Business Environment:'));
    assert.ok(summaryLine, 'Expected domain summary line in console output');
    assert.ok(summaryLine.includes('People: 1'), 'Expected People: 1 in summary');
  });

});
