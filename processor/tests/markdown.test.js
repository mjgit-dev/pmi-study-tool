// markdown.test.js — Unit tests for markdown rendering module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test processor/tests/markdown.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildMarkdown } = require('../markdown.js');

// Sample transcript and API response text for testing
const transcript = {
  lectureTitle: 'What is a Project',
  sectionName: 'Introduction to Project Management',
  transcript: '...',
  wordCount: 500,
  extractedAt: '2026-03-20T12:00:00.000Z',
  captionType: 'manual',
  language: 'en'
};

const apiText = '## Key Concepts\n- **Project**: A temporary endeavor.\n\n## Summary\nProjects are temporary.\n\n## Examples\nBuilding a house is a project.';

// ============================================================
// buildMarkdown
// ============================================================

describe('buildMarkdown', () => {

  it('returns a string starting with "---\\n"', () => {
    const result = buildMarkdown(transcript, apiText);
    assert.ok(typeof result === 'string', 'Should return a string');
    assert.ok(result.startsWith('---\n'), 'Result should start with "---\\n"');
  });

  it('output contains YAML frontmatter with lectureTitle as JSON-quoted string', () => {
    const result = buildMarkdown(transcript, apiText);
    assert.ok(
      result.includes('lectureTitle: "What is a Project"'),
      'Should contain lectureTitle as JSON-quoted string'
    );
  });

  it('output contains YAML frontmatter with sectionName as JSON-quoted string', () => {
    const result = buildMarkdown(transcript, apiText);
    assert.ok(
      result.includes('sectionName: "Introduction to Project Management"'),
      'Should contain sectionName as JSON-quoted string'
    );
  });

  it('output contains YAML frontmatter with processedAt field', () => {
    const result = buildMarkdown(transcript, apiText);
    assert.ok(result.includes('processedAt:'), 'Should contain processedAt field');
  });

  it('processedAt value is an ISO 8601 string', () => {
    const result = buildMarkdown(transcript, apiText);
    // Extract the processedAt value from the frontmatter
    const match = result.match(/processedAt:\s*(.+)/);
    assert.ok(match, 'processedAt line should be present');
    const dateStr = match[1].trim();
    // ISO 8601 pattern: YYYY-MM-DDTHH:MM:SS.mmmZ or similar
    const iso8601Re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    assert.ok(iso8601Re.test(dateStr), `processedAt "${dateStr}" should match ISO 8601 format`);
  });

  it('frontmatter is closed with "---" on its own line', () => {
    const result = buildMarkdown(transcript, apiText);
    // The frontmatter should have an opening --- and a closing ---
    const lines = result.split('\n');
    assert.equal(lines[0], '---', 'First line should be "---"');
    // Find closing ---
    const closingIndex = lines.indexOf('---', 1);
    assert.ok(closingIndex > 1, 'Should have a closing "---" line after the opening');
  });

  it('API text appears after frontmatter, trimmed', () => {
    const result = buildMarkdown(transcript, apiText);
    // Split on closing --- to get the body
    const parts = result.split('---\n');
    // parts[0] = '' (before first ---), parts[1] = frontmatter fields, parts[2] = body
    const body = parts.slice(2).join('---\n').trimStart();
    assert.ok(body.startsWith('## Key Concepts'), 'API text should start with ## Key Concepts after frontmatter');
  });

  it('output ends with a trailing newline', () => {
    const result = buildMarkdown(transcript, apiText);
    assert.ok(result.endsWith('\n'), 'Result should end with a trailing newline');
  });

  it('handles apiText with leading and trailing whitespace (trims it)', () => {
    const paddedApiText = '\n\n  ## Key Concepts\n- **Project**: A temporary endeavor.\n\n  ';
    const result = buildMarkdown(transcript, paddedApiText);
    // API text should be trimmed — no leading whitespace before ## Key Concepts
    const parts = result.split('---\n');
    const body = parts.slice(2).join('---\n');
    assert.ok(
      body.startsWith('## Key Concepts') || body.startsWith('\n## Key Concepts'),
      'API text should be trimmed of leading/trailing whitespace'
    );
    // Result should still end with exactly one trailing newline
    assert.ok(result.endsWith('\n'), 'Result should end with trailing newline even with padded input');
  });

  it('handles title with special characters that need JSON quoting', () => {
    const specialTranscript = Object.assign({}, transcript, {
      lectureTitle: 'What\'s a "Project"?',
      sectionName: 'Q&A: Introduction'
    });
    const result = buildMarkdown(specialTranscript, apiText);
    // JSON.stringify handles quoting of special characters
    assert.ok(result.includes('lectureTitle:'), 'Should include lectureTitle field');
    assert.ok(result.includes('sectionName:'), 'Should include sectionName field');
  });

});
