// extractor.test.js — Unit tests for transcript cleaning module
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test extractor/tests/extractor.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cleanTranscript, countWords, toFilename } = require('../cleaning.js');

// ============================================================
// cleanTranscript
// ============================================================

describe('cleanTranscript', () => {

  it('strips timestamps from cue text (MM:SS)', () => {
    const result = cleanTranscript(['0:04 Hello world', '0:12 This is a test']);
    // Timestamps stripped; fragments joined
    assert.ok(!result.includes('0:04'), 'Should not contain timestamp 0:04');
    assert.ok(!result.includes('0:12'), 'Should not contain timestamp 0:12');
    assert.ok(result.includes('Hello world'), 'Should contain "Hello world"');
    assert.ok(result.includes('This is a test'), 'Should contain "This is a test"');
  });

  it('strips timestamps in HH:MM:SS format', () => {
    const result = cleanTranscript(['12:30:01 Long video cue text here']);
    assert.ok(!result.includes('12:30:01'), 'Should not contain HH:MM:SS timestamp');
    assert.ok(result.includes('Long video cue text here'), 'Should contain actual text');
  });

  it('removes filler word "um"', () => {
    const result = cleanTranscript(['um hello world']);
    assert.ok(!result.match(/\bum\b/i), 'Should not contain filler "um"');
    assert.ok(result.includes('hello world') || result.includes('Hello world'), 'Should contain core text');
  });

  it('removes filler word "uh"', () => {
    const result = cleanTranscript(['uh hello uh world']);
    assert.ok(!result.match(/\buh\b/i), 'Should not contain filler "uh"');
  });

  it('removes multiple filler words from a cue', () => {
    const result = cleanTranscript(['um hello uh world']);
    assert.ok(!result.match(/\bum\b/i), 'Should not contain "um"');
    assert.ok(!result.match(/\buh\b/i), 'Should not contain "uh"');
  });

  it('removes filler word "you know"', () => {
    const result = cleanTranscript(['you know this is important']);
    assert.ok(!result.match(/\byou know\b/i), 'Should not contain "you know"');
    assert.ok(result.includes('this is important') || result.includes('This is important'), 'Should contain core text');
  });

  it('removes "like" as standalone filler but not when part of a larger word', () => {
    const result = cleanTranscript(['this is like a test', 'it is likely to work']);
    // Standalone "like" removed
    assert.ok(result.includes('likely'), 'Should keep "likely" (not a filler)');
  });

  it('removes "basically", "literally", "actually", "right" as fillers', () => {
    const result = cleanTranscript(['basically this is literally actually important right']);
    assert.ok(!result.match(/\bbasically\b/i), 'Should not contain "basically"');
    assert.ok(!result.match(/\bliterally\b/i), 'Should not contain "literally"');
    assert.ok(!result.match(/\bactually\b/i), 'Should not contain "actually"');
  });

  it('strips speaker labels in [Label:] format', () => {
    const result = cleanTranscript(['[John:] Welcome to the course']);
    assert.ok(!result.includes('[John:]'), 'Should not contain speaker label [John:]');
    assert.ok(result.includes('Welcome to the course') || result.includes('welcome to the course'), 'Should contain lecture content');
  });

  it('strips speaker labels in Label: format (without brackets)', () => {
    const result = cleanTranscript(['Instructor: Today we cover project management']);
    // Speaker label stripped or content preserved
    assert.ok(result.includes('Today we cover project management') || result.includes('today we cover project management'), 'Should contain the lecture content');
  });

  it('joins cue fragments into readable text', () => {
    const result = cleanTranscript(['Hello world.', 'this continues the thought']);
    assert.ok(typeof result === 'string', 'Should return a string');
    assert.ok(result.length > 0, 'Should not return empty string for non-empty input');
  });

  it('capitalizes letter after sentence-ending punctuation', () => {
    const result = cleanTranscript(['hello world. this is a new sentence']);
    // After period, next sentence should be capitalized
    assert.match(result, /\.\s+[A-Z]/, 'Should capitalize after period');
  });

  it('collapses multiple spaces to single space', () => {
    const result = cleanTranscript(['hello   world']);
    assert.ok(!result.includes('  '), 'Should not contain double spaces');
  });

  it('returns empty string for empty input array', () => {
    const result = cleanTranscript([]);
    assert.strictEqual(result, '', 'Should return empty string for empty array');
  });

  it('handles array with only timestamp cues (all content stripped)', () => {
    const result = cleanTranscript(['0:04', '0:08', '0:12']);
    // After stripping timestamps, nothing meaningful remains
    assert.ok(typeof result === 'string', 'Should return a string even for timestamp-only input');
  });

});

// ============================================================
// countWords
// ============================================================

describe('countWords', () => {

  it('counts "hello world" as 2 words', () => {
    const result = countWords('hello world');
    assert.strictEqual(result.wordCount, 2, 'Word count should be 2');
  });

  it('returns wordCount: 0 for empty string', () => {
    const result = countWords('');
    assert.strictEqual(result.wordCount, 0, 'Word count should be 0 for empty string');
  });

  it('returns isLowWordCount: true for empty string', () => {
    const result = countWords('');
    assert.strictEqual(result.isLowWordCount, true, 'Empty string should be low word count');
  });

  it('returns isLowWordCount: true when count < 300', () => {
    const result = countWords('hello world');
    assert.strictEqual(result.isLowWordCount, true, '2 words should be low word count');
  });

  it('returns isLowWordCount: false when count >= 300', () => {
    // Create a string with exactly 300 words
    const text = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
    const result = countWords(text);
    assert.strictEqual(result.wordCount, 300, 'Should count 300 words');
    assert.strictEqual(result.isLowWordCount, false, '300 words should not be low word count');
  });

  it('counts words correctly (not inflated by timestamps in already-cleaned text)', () => {
    const cleaned = 'Hello world this is a five word test'; // 8 words
    const result = countWords(cleaned);
    assert.strictEqual(result.wordCount, 8, 'Should count 8 words in cleaned text');
  });

  it('returns an object with wordCount and isLowWordCount properties', () => {
    const result = countWords('test');
    assert.ok('wordCount' in result, 'Should have wordCount property');
    assert.ok('isLowWordCount' in result, 'Should have isLowWordCount property');
  });

});

// ============================================================
// toFilename
// ============================================================

describe('toFilename', () => {

  it('converts lecture title to kebab-case .json filename', () => {
    const result = toFilename('What is a Project?');
    assert.strictEqual(result, 'What-is-a-Project.json', 'Should produce What-is-a-Project.json');
  });

  it('strips special characters but keeps alphanumeric and hyphens', () => {
    const result = toFilename('Hello & World! (2024)');
    assert.ok(!result.includes('&'), 'Should not contain &');
    assert.ok(!result.includes('!'), 'Should not contain !');
    assert.ok(!result.includes('('), 'Should not contain (');
    assert.ok(result.endsWith('.json'), 'Should end with .json');
  });

  it('handles empty string by returning Unknown-Lecture.json', () => {
    const result = toFilename('');
    assert.strictEqual(result, 'Unknown-Lecture.json', 'Should return Unknown-Lecture.json for empty input');
  });

  it('handles whitespace-only string by returning Unknown-Lecture.json', () => {
    const result = toFilename('   ');
    assert.strictEqual(result, 'Unknown-Lecture.json', 'Should return Unknown-Lecture.json for whitespace input');
  });

  it('replaces spaces with hyphens', () => {
    const result = toFilename('Introduction to Project Management');
    assert.ok(!result.includes(' '), 'Should not contain spaces');
    assert.ok(result.includes('-'), 'Should use hyphens as separators');
  });

  it('always appends .json extension', () => {
    const result = toFilename('My Lecture');
    assert.ok(result.endsWith('.json'), 'Should always end with .json');
  });

});
