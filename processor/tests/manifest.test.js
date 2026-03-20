// manifest.test.js — Unit tests for manifest state management
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test processor/tests/manifest.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { loadManifest, saveManifest, shouldSkip } = require('../manifest.js');

// Helper: create a unique temp directory for each test
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pmi-manifest-test-'));
}

// ============================================================
// loadManifest
// ============================================================

describe('loadManifest', () => {

  it('returns {} when no manifest file exists', () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'processing-state.json');
    const result = loadManifest(manifestPath);
    assert.deepEqual(result, {}, 'Should return empty object when file does not exist');
  });

  it('returns parsed object when manifest file has valid JSON', () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'processing-state.json');
    const data = {
      'What-is-a-Project.json': {
        filename: 'What-is-a-Project.json',
        status: 'complete',
        processedAt: '2026-03-20T12:00:00.000Z'
      }
    };
    fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf8');
    const result = loadManifest(manifestPath);
    assert.deepEqual(result, data, 'Should return the parsed manifest object');
  });

  it('returns {} when manifest file contains invalid JSON', () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'processing-state.json');
    fs.writeFileSync(manifestPath, 'not valid json {{{', 'utf8');
    const result = loadManifest(manifestPath);
    assert.deepEqual(result, {}, 'Should return empty object on parse error');
  });

});

// ============================================================
// saveManifest
// ============================================================

describe('saveManifest', () => {

  it('writes JSON with 2-space indentation to the manifest path', () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'processing-state.json');
    const data = {
      'Intro.json': { filename: 'Intro.json', status: 'complete', processedAt: '2026-03-20T12:00:00.000Z' }
    };
    saveManifest(manifestPath, data);
    const raw = fs.readFileSync(manifestPath, 'utf8');
    assert.ok(raw.includes('  '), 'Should use 2-space indentation');
    assert.deepEqual(JSON.parse(raw), data, 'Written JSON should match input data');
  });

  it('round-trips: save then load returns identical object', () => {
    const dir = makeTempDir();
    const manifestPath = path.join(dir, 'processing-state.json');
    const original = {
      'Lecture-A.json': { filename: 'Lecture-A.json', status: 'pending', processedAt: '2026-03-20T09:00:00.000Z' },
      'Lecture-B.json': { filename: 'Lecture-B.json', status: 'failed', processedAt: '2026-03-20T10:00:00.000Z', error: 'API timeout' }
    };
    saveManifest(manifestPath, original);
    const loaded = loadManifest(manifestPath);
    assert.deepEqual(loaded, original, 'Round-trip should preserve all data');
  });

});

// ============================================================
// shouldSkip
// ============================================================

describe('shouldSkip', () => {

  it('returns true when entry status is "complete" and force is false', () => {
    const entry = { filename: 'Lecture.json', status: 'complete', processedAt: '2026-03-20T12:00:00.000Z' };
    assert.equal(shouldSkip(entry, false), true, 'Should skip complete entries when force is false');
  });

  it('returns true when entry status is "complete" and force is not provided', () => {
    const entry = { filename: 'Lecture.json', status: 'complete', processedAt: '2026-03-20T12:00:00.000Z' };
    assert.equal(shouldSkip(entry), true, 'Should skip complete entries when force is not provided');
  });

  it('returns false when entry status is "complete" but force is true', () => {
    const entry = { filename: 'Lecture.json', status: 'complete', processedAt: '2026-03-20T12:00:00.000Z' };
    assert.equal(shouldSkip(entry, true), false, 'Should not skip complete entries when force is true');
  });

  it('returns false when entry status is "pending"', () => {
    const entry = { filename: 'Lecture.json', status: 'pending', processedAt: '2026-03-20T12:00:00.000Z' };
    assert.equal(shouldSkip(entry, false), false, 'Should not skip pending entries');
  });

  it('returns false when entry status is "failed"', () => {
    const entry = { filename: 'Lecture.json', status: 'failed', processedAt: '2026-03-20T12:00:00.000Z', error: 'API error' };
    assert.equal(shouldSkip(entry, false), false, 'Should not skip failed entries');
  });

  it('returns false when entry is null (does not exist in manifest)', () => {
    assert.equal(shouldSkip(null, false), false, 'Should not skip when entry does not exist');
  });

  it('returns false when entry is undefined', () => {
    assert.equal(shouldSkip(undefined, false), false, 'Should not skip when entry is undefined');
  });

});
