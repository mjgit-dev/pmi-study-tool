// glossary.test.js — Unit tests for glossary extraction module
// Tests extractFlashcards and buildGlossary functions
// Uses Node.js built-in test runner (node:test) — no install required
// Run: node --test compiler/tests/glossary.test.js

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractFlashcards, buildGlossary } = require('../glossary.js');

describe('extractFlashcards', () => {

  it('returns [] for empty string', () => {
    const result = extractFlashcards('');
    assert.deepEqual(result, []);
  });

  it('returns [] when no ## Flashcards heading present', () => {
    const result = extractFlashcards('no flashcards here\n\nJust some content.');
    assert.deepEqual(result, []);
  });

  it('parses two flashcard entries from a body containing ## Flashcards', () => {
    const body = '## Flashcards\n\n- **Project** \u2014 A temporary endeavor.\n\n- **Operations** \u2014 Ongoing work.\n';
    const result = extractFlashcards(body);
    assert.deepEqual(result, [
      { term: 'Project', definition: 'A temporary endeavor.' },
      { term: 'Operations', definition: 'Ongoing work.' },
    ]);
  });

  it('handles body with ## Flashcards at end of file (no trailing sections)', () => {
    const body = '## Key Concepts\n\n- Some concept\n\n## Flashcards\n\n- **Scope** \u2014 The sum of work to be done.';
    const result = extractFlashcards(body);
    assert.equal(result.length, 1);
    assert.equal(result[0].term, 'Scope');
    assert.equal(result[0].definition, 'The sum of work to be done.');
  });

  it('handles body with ## Flashcards followed by other content — only parses flashcard bullets', () => {
    const body = '## Flashcards\n\n- **Risk** \u2014 An uncertain event.\n\n## Appendix\n\nSome other section.';
    const result = extractFlashcards(body);
    assert.equal(result.length, 1);
    assert.equal(result[0].term, 'Risk');
    assert.equal(result[0].definition, 'An uncertain event.');
  });

  it('uses em-dash (\u2014) separator not hyphen — hyphen lines are not parsed as entries', () => {
    const body = '## Flashcards\n\n- **Term A** \u2014 Valid definition.\n\n- **Term B** - Hyphen not em-dash, should be skipped.\n';
    const result = extractFlashcards(body);
    assert.equal(result.length, 1);
    assert.equal(result[0].term, 'Term A');
  });

});

describe('buildGlossary', () => {

  it('returns "No terms found" message when allEntries is empty', () => {
    const result = buildGlossary([]);
    assert.equal(result, '# PMI Glossary\n\nNo terms found.\n');
  });

  it('output starts with "# PMI Glossary"', () => {
    const result = buildGlossary([{ term: 'Project', definition: 'A temporary endeavor.' }]);
    assert.ok(result.startsWith('# PMI Glossary'), 'Should start with # PMI Glossary');
  });

  it('deduplicates by lowercase term key with first-occurrence definition winning', () => {
    const entries = [
      { term: 'Project', definition: 'First definition.' },
      { term: 'project', definition: 'Second definition that should be ignored.' },
      { term: 'PROJECT', definition: 'Third definition that should also be ignored.' },
    ];
    const result = buildGlossary(entries);
    assert.ok(result.includes('First definition.'), 'Should use first-occurrence definition');
    assert.ok(!result.includes('Second definition'), 'Duplicate should be removed');
    assert.ok(!result.includes('Third definition'), 'Duplicate should be removed');
    // Only one occurrence of the term
    const count = (result.match(/\*\*Project\*\*/gi) || []).length;
    assert.equal(count, 1, 'Term should appear only once');
  });

  it('sorts entries alphabetically by term (case-insensitive)', () => {
    const entries = [
      { term: 'Scope', definition: 'The sum of work.' },
      { term: 'Project', definition: 'A temporary endeavor.' },
      { term: 'stakeholder', definition: 'An interested party.' },
    ];
    const result = buildGlossary(entries);
    const projectIdx = result.indexOf('**Project**');
    const scopeIdx = result.indexOf('**Scope**');
    const stakeholderIdx = result.indexOf('**stakeholder**');
    assert.ok(projectIdx < scopeIdx, 'Project should come before Scope');
    assert.ok(scopeIdx < stakeholderIdx, 'Scope should come before stakeholder');
  });

  it('output format: includes term count line and --- separator', () => {
    const entries = [
      { term: 'Alpha', definition: 'First.' },
      { term: 'Beta', definition: 'Second.' },
    ];
    const result = buildGlossary(entries);
    assert.ok(result.includes('2 terms compiled from lecture flashcards.'), 'Should include count line');
    assert.ok(result.includes('---'), 'Should include horizontal rule separator');
  });

  it('each entry is formatted as "**Term** \u2014 Definition" followed by blank line', () => {
    const entries = [{ term: 'Charter', definition: 'A document that authorizes the project.' }];
    const result = buildGlossary(entries);
    assert.ok(result.includes('**Charter** \u2014 A document that authorizes the project.'), 'Entry format should use em-dash');
  });

  it('dedup test: two entries with term "Project" produces one entry with first definition', () => {
    const entries = [
      { term: 'Project', definition: 'A temporary endeavor undertaken to create a unique product.' },
      { term: 'Project', definition: 'A different definition that should be ignored.' },
    ];
    const result = buildGlossary(entries);
    assert.ok(result.includes('A temporary endeavor undertaken'), 'First definition should be present');
    assert.ok(!result.includes('A different definition'), 'Second definition should be absent');
    // Count occurrences of the term in the output body
    const matches = result.match(/^\*\*Project\*\*/gm) || [];
    assert.equal(matches.length, 1, 'Term should appear exactly once');
  });

});
