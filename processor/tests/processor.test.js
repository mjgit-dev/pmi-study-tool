// processor.test.js — Integration tests for processor.js orchestrator
// Uses mocked Anthropic client (no real API calls)
// CommonJS — node:test built-in

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// --- Test fixtures ---

const SAMPLE_TRANSCRIPT_1 = {
  lectureTitle: 'What is a Project',
  sectionName: 'Introduction to Project Management',
  transcript: 'A project is a temporary endeavor to create a unique product or result.',
  wordCount: 14,
  extractedAt: '2026-03-20T12:00:00.000Z',
  captionType: 'manual',
  language: 'en'
};

const SAMPLE_TRANSCRIPT_2 = {
  lectureTitle: 'Project Life Cycle',
  sectionName: 'Introduction to Project Management',
  transcript: 'Every project passes through distinct phases called the project life cycle.',
  wordCount: 13,
  extractedAt: '2026-03-20T12:01:00.000Z',
  captionType: 'manual',
  language: 'en'
};

const MOCK_API_RESPONSE_TEXT = '## Key Concepts\n- **Project**: A temporary endeavor.\n\n## Summary\nProjects are temporary.\n\n## Examples\nBuilding a bridge is a project.';

// --- Mock Anthropic client ---

function makeMockClient(opts = {}) {
  const callCount = { value: 0 };
  const countTokensCount = { value: 0 };
  const shouldThrow = opts.shouldThrow || false;
  const throwMessage = opts.throwMessage || 'API error';
  const countTokensResult = opts.countTokensResult || { input_tokens: 1500 };

  const client = {
    _callCount: callCount,
    _countTokensCount: countTokensCount,
    messages: {
      create: async () => {
        callCount.value++;
        if (shouldThrow) {
          throw new Error(throwMessage);
        }
        return { content: [{ text: MOCK_API_RESPONSE_TEXT }] };
      }
    },
    beta: {
      messages: {
        countTokens: async () => {
          countTokensCount.value++;
          return countTokensResult;
        }
      }
    }
  };
  return client;
}

// --- Helper to create temp dirs and files ---

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pmi-test-'));
}

function writeSampleJson(dir, filename, data) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data), 'utf8');
}

// --- Import the module under test ---
// processAll must be exported from processor.js
const { processAll } = require('../processor');

// ============================================================
// Test 1: processAll with 2 files — both produce .md output,
//         manifest shows "complete", mock called exactly 2 times
// ============================================================
test('processAll processes 2 files, writes .md for each, marks complete in manifest', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestPath = path.join(makeTempDir(), 'state.json');

  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);
  writeSampleJson(inputDir, 'lecture-02.json', SAMPLE_TRANSCRIPT_2);

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: false, force: false, estimate: false, yes: true }, client, manifestPath, outputDir);

  // API called exactly twice
  assert.equal(client._callCount.value, 2, 'API should be called exactly 2 times');

  // Both .md files written
  const outputFiles = fs.readdirSync(outputDir);
  assert.ok(outputFiles.includes('lecture-01.md'), 'lecture-01.md should exist in output');
  assert.ok(outputFiles.includes('lecture-02.md'), 'lecture-02.md should exist in output');

  // .md content starts with frontmatter
  const md1 = fs.readFileSync(path.join(outputDir, 'lecture-01.md'), 'utf8');
  assert.ok(md1.startsWith('---'), 'Output should start with YAML frontmatter');
  assert.ok(md1.includes('## Key Concepts'), 'Output should include Key Concepts section');

  // Manifest shows both complete
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest['lecture-01.json'].status, 'complete', 'lecture-01.json should be complete');
  assert.equal(manifest['lecture-02.json'].status, 'complete', 'lecture-02.json should be complete');

  // Return value correct
  assert.equal(result.processed, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.skipped, 0);
});

// ============================================================
// Test 2: processAll with 1 already-complete file in manifest
//         shouldSkip causes 0 API calls, skipped count = 1
// ============================================================
test('processAll skips already-complete lecture — 0 API calls, skipped=1', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestDir = makeTempDir();
  const manifestPath = path.join(manifestDir, 'state.json');

  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);

  // Pre-populate manifest with complete status
  const initialManifest = {
    'lecture-01.json': {
      filename: 'lecture-01.json',
      status: 'complete',
      processedAt: '2026-03-20T10:00:00.000Z'
    }
  };
  fs.writeFileSync(manifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: false, force: false, estimate: false, yes: true }, client, manifestPath, outputDir);

  assert.equal(client._callCount.value, 0, 'API should not be called for already-complete lecture');
  assert.equal(result.skipped, 1, 'Skipped count should be 1');
  assert.equal(result.processed, 0, 'Processed count should be 0');
  assert.equal(result.failed, 0, 'Failed count should be 0');
});

// ============================================================
// Test 3: processAll with --force and 1 complete file
//         API called 1 time (force bypasses skip)
// ============================================================
test('processAll --force reprocesses completed lecture — API called 1 time', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestDir = makeTempDir();
  const manifestPath = path.join(manifestDir, 'state.json');

  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);

  // Pre-populate manifest with complete status
  const initialManifest = {
    'lecture-01.json': {
      filename: 'lecture-01.json',
      status: 'complete',
      processedAt: '2026-03-20T10:00:00.000Z'
    }
  };
  fs.writeFileSync(manifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: false, force: true, estimate: false, yes: true }, client, manifestPath, outputDir);

  assert.equal(client._callCount.value, 1, 'API should be called once when --force is set');
  assert.equal(result.processed, 1, 'Processed count should be 1');
  assert.equal(result.skipped, 0, 'Skipped count should be 0');
});

// ============================================================
// Test 4: processAll with --dry-run
//         0 API calls, 0 .md files written, 0 manifest updates
// ============================================================
test('processAll --dry-run makes no API calls and writes no files', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestDir = makeTempDir();
  const manifestPath = path.join(manifestDir, 'state.json');

  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);
  writeSampleJson(inputDir, 'lecture-02.json', SAMPLE_TRANSCRIPT_2);

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: true, force: false, estimate: false, yes: false }, client, manifestPath, outputDir);

  assert.equal(client._callCount.value, 0, 'API should not be called during dry-run');

  // No .md files written
  const outputFiles = fs.readdirSync(outputDir);
  assert.equal(outputFiles.length, 0, 'No .md files should be written during dry-run');

  // Manifest not updated (file should not exist)
  assert.ok(!fs.existsSync(manifestPath), 'Manifest should not be created during dry-run');

  // Counts reflect nothing processed
  assert.equal(result.processed, 0);
  assert.equal(result.failed, 0);
});

// ============================================================
// Test 5: processAll with mock that throws
//         failed lecture marked "failed" in manifest,
//         error message recorded, batch continues to next file
// ============================================================
test('processAll handles API error — marks failed in manifest, continues batch', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestDir = makeTempDir();
  const manifestPath = path.join(manifestDir, 'state.json');

  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);
  writeSampleJson(inputDir, 'lecture-02.json', SAMPLE_TRANSCRIPT_2);

  // First call throws, second succeeds
  let callNum = 0;
  const client = {
    _callCount: { value: 0 },
    _countTokensCount: { value: 0 },
    messages: {
      create: async () => {
        client._callCount.value++;
        callNum++;
        if (callNum === 1) {
          throw new Error('rate_limit_error: Too many requests');
        }
        return { content: [{ text: MOCK_API_RESPONSE_TEXT }] };
      }
    },
    beta: {
      messages: {
        countTokens: async () => {
          client._countTokensCount.value++;
          return { input_tokens: 1500 };
        }
      }
    }
  };

  const result = await processAll(inputDir, { dryRun: false, force: false, estimate: false, yes: true }, client, manifestPath, outputDir);

  // Both files attempted (batch continued after failure)
  assert.equal(client._callCount.value, 2, 'API should be called for both files');

  // Manifest reflects correct statuses
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest['lecture-01.json'].status, 'failed', 'lecture-01.json should be failed');
  assert.ok(manifest['lecture-01.json'].error, 'Failed entry should have error message');
  assert.ok(manifest['lecture-01.json'].error.includes('rate_limit_error'), 'Error message should be preserved');
  assert.equal(manifest['lecture-02.json'].status, 'complete', 'lecture-02.json should be complete');

  // Return value reflects 1 failed, 1 processed
  assert.equal(result.failed, 1, 'Failed count should be 1');
  assert.equal(result.processed, 1, 'Processed count should be 1');

  // Only the successful file has .md output
  const outputFiles = fs.readdirSync(outputDir);
  assert.ok(!outputFiles.includes('lecture-01.md'), 'Failed lecture should not have .md output');
  assert.ok(outputFiles.includes('lecture-02.md'), 'Successful lecture should have .md output');
});

// ============================================================
// Test 6: --yes flag — countTokens called for pending lectures,
//         processing API also called (estimate gate passed via --yes)
// ============================================================
test('processAll with --yes counts tokens but makes no extra processing API calls', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestPath = path.join(makeTempDir(), 'state.json');
  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: false, force: false, estimate: false, yes: true }, client, manifestPath, outputDir);

  // countTokens called for the 1 pending lecture
  assert.equal(client._countTokensCount.value, 1, 'countTokens should be called once for the pending lecture');
  // Processing API also called
  assert.equal(client._callCount.value, 1, 'messages.create should be called once');
  assert.equal(result.processed, 1);
});

// ============================================================
// Test 7: estimate gate skipped when all lectures complete
//         (pendingFiles.length === 0)
// ============================================================
test('processAll skips estimate gate when all lectures already complete', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestDir = makeTempDir();
  const manifestPath = path.join(manifestDir, 'state.json');
  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);

  const initialManifest = {
    'lecture-01.json': { filename: 'lecture-01.json', status: 'complete', processedAt: '2026-03-20T10:00:00.000Z' }
  };
  fs.writeFileSync(manifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: false, force: false, estimate: false, yes: true }, client, manifestPath, outputDir);

  assert.equal(client._countTokensCount.value, 0, 'countTokens should not be called when no pending lectures');
  assert.equal(client._callCount.value, 0, 'messages.create should not be called');
  assert.equal(result.skipped, 1);
});

// ============================================================
// Test 8: --dry-run skips estimate gate entirely
//         (no countTokens calls)
// ============================================================
test('processAll --dry-run skips estimate gate — no countTokens calls', async () => {
  const inputDir = makeTempDir();
  const outputDir = makeTempDir();
  const manifestPath = path.join(makeTempDir(), 'state.json');
  writeSampleJson(inputDir, 'lecture-01.json', SAMPLE_TRANSCRIPT_1);

  const client = makeMockClient();
  const result = await processAll(inputDir, { dryRun: true, force: false, estimate: false, yes: false }, client, manifestPath, outputDir);

  assert.equal(client._countTokensCount.value, 0, 'countTokens should not be called during dry-run');
  assert.equal(client._callCount.value, 0, 'messages.create should not be called during dry-run');
});
