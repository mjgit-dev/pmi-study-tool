// compiler.js — CLI entry point for assembling the Claude Projects package
// Reads processed lecture markdown from processor/output/ and writes claude-package/
// CommonJS module — no ES module syntax

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatter } = require('./compiler/frontmatter');
const { extractBody, splitNotesAndQuiz } = require('./compiler/sections');
const { groupBySectionName, orderSections, toSlug } = require('./compiler/grouper');
const { buildSectionFile, sectionFilename, buildHandbook } = require('./compiler/builder');
const { buildSystemPrompt } = require('./compiler/system-prompt');
const { extractFlashcards, buildGlossary } = require('./compiler/glossary');

const INPUT_DIR = path.join(__dirname, 'processor', 'output');
const OUTPUT_DIR = path.join(__dirname, 'claude-package');

/**
 * compileAll(inputDir, outputDir, flags)
 * Synchronous compilation pipeline. Reads all .md files from inputDir,
 * groups them by section, and writes the claude-package output files.
 *
 * @param {string} inputDir - Directory containing processed lecture .md files
 * @param {string} outputDir - Directory to write the Claude Projects package
 * @param {{ dryRun: boolean }} flags - CLI flags
 * @returns {{ sections: number, lectures: number, files: string[] }}
 */
function compileAll(inputDir, outputDir, flags) {
  // 1. Read all .md files from inputDir
  const filenames = fs.readdirSync(inputDir).filter(f => f.endsWith('.md')).sort();

  if (filenames.length === 0) {
    console.log('No .md files found in ' + inputDir);
    return { sections: 0, lectures: 0, files: [] };
  }

  // 2. Parse each file into a lecture object
  const lectures = [];
  for (const filename of filenames) {
    const content = fs.readFileSync(path.join(inputDir, filename), 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      console.log('Warning: skipping ' + filename + ' (no frontmatter)');
      continue;
    }
    const body = extractBody(content);
    const { notes, quiz } = splitNotesAndQuiz(body);
    lectures.push({
      filename,
      lectureTitle: fm.lectureTitle,
      sectionName: fm.sectionName,
      processedAt: fm.processedAt,
      ecoTag: fm.ecoTag || null,
      notes,
      quiz
    });
  }

  // Read weak-areas.json from project root (optional config)
  let weakAreas = null;
  const weakAreasPath = path.join(__dirname, 'weak-areas.json');
  if (fs.existsSync(weakAreasPath)) {
    try {
      const raw = fs.readFileSync(weakAreasPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.areas) && parsed.areas.length > 0) {
        weakAreas = parsed.areas;
      }
    } catch (_) {
      // Malformed JSON — skip silently, compile without focus areas
    }
  }

  // 3a. Extract flashcard terms from all lectures for glossary
  const allFlashcardEntries = [];
  for (const lecture of lectures) {
    const body = lecture.quiz; // quiz includes ## Practice Questions AND ## Flashcards
    const entries = extractFlashcards(body);
    allFlashcardEntries.push(...entries);
  }

  // 3. Compute ECO domain stats from parsed lectures
  const ecoStats = { People: 0, Process: 0, 'Business Environment': 0 };
  let hasAnyEcoTag = false;
  for (const lecture of lectures) {
    if (lecture.ecoTag && ecoStats[lecture.ecoTag] !== undefined) {
      ecoStats[lecture.ecoTag]++;
      hasAnyEcoTag = true;
    }
  }

  // 4. Group by section and determine order
  const groups = groupBySectionName(lectures);
  const orderedSections = orderSections(groups);
  const total = orderedSections.length;

  // 5. Dry run — report what would be compiled without writing
  if (flags.dryRun) {
    console.log('Dry run — would compile:');
    for (const sectionName of orderedSections) {
      const sectionLectures = groups.get(sectionName) || [];
      console.log('  Section: ' + sectionName + ' (' + sectionLectures.length + ' lectures)');
    }
    console.log('\nWould write:');
    orderedSections.forEach((sectionName, idx) => {
      console.log('  claude-package/' + sectionFilename(idx + 1, sectionName, 'notes'));
      console.log('  claude-package/' + sectionFilename(idx + 1, sectionName, 'quiz'));
    });
    console.log('  claude-package/handbook.md');
    console.log('  claude-package/CLAUDE_INSTRUCTIONS.md');
    console.log('  claude-package/GLOSSARY.md');
    if (weakAreas) {
      console.log('\nFocus areas from weak-areas.json: ' + weakAreas.join(', '));
    }
    return { sections: orderedSections.length, lectures: lectures.length, files: [] };
  }

  // 6. Full compilation — write all output files
  if (fs.existsSync(outputDir)) {
    console.log('Overwriting existing claude-package/');
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const filesWritten = [];

  for (let i = 0; i < orderedSections.length; i++) {
    const sectionName = orderedSections[i];
    const sectionLectures = groups.get(sectionName) || [];
    const padded = String(i + 1).padStart(String(total).length, ' ');

    // Build and write notes file
    const notesContent = buildSectionFile(sectionName, sectionLectures, 'notes');
    const notesFile = sectionFilename(i + 1, sectionName, 'notes');
    fs.writeFileSync(path.join(outputDir, notesFile), notesContent, 'utf8');
    filesWritten.push(notesFile);

    // Build and write quiz file
    const quizContent = buildSectionFile(sectionName, sectionLectures, 'quiz');
    const quizFile = sectionFilename(i + 1, sectionName, 'quiz');
    fs.writeFileSync(path.join(outputDir, quizFile), quizContent, 'utf8');
    filesWritten.push(quizFile);

    console.log('[' + padded + '/' + total + '] Compiling: ' + sectionName + '... done');
  }

  // Build and write handbook
  const handbookContent = buildHandbook(orderedSections, groups);
  fs.writeFileSync(path.join(outputDir, 'handbook.md'), handbookContent, 'utf8');
  filesWritten.push('handbook.md');

  // Build and write system prompt
  const systemPromptContent = buildSystemPrompt(hasAnyEcoTag ? ecoStats : null, weakAreas);
  fs.writeFileSync(path.join(outputDir, 'CLAUDE_INSTRUCTIONS.md'), systemPromptContent, 'utf8');
  filesWritten.push('CLAUDE_INSTRUCTIONS.md');

  // Build and write glossary
  const glossaryContent = buildGlossary(allFlashcardEntries);
  fs.writeFileSync(path.join(outputDir, 'GLOSSARY.md'), glossaryContent, 'utf8');
  filesWritten.push('GLOSSARY.md');

  // Count deduplicated terms for logging
  const termCount = allFlashcardEntries.length > 0
    ? glossaryContent.split('\n').filter(l => l.startsWith('**')).length
    : 0;
  console.log('Glossary: ' + termCount + ' terms');
  if (weakAreas) {
    console.log('Focus areas: ' + weakAreas.length + ' topics');
  }

  console.log('\nCompiled: ' + orderedSections.length + ' sections | ' + lectures.length + ' lectures | ' + filesWritten.length + ' files written');

  return { sections: orderedSections.length, lectures: lectures.length, files: filesWritten };
}

// CLI entry point — only runs when executed directly (not during test imports)
if (require.main === module) {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run')
  };

  if (!fs.existsSync(INPUT_DIR)) {
    console.error('Input directory not found: ' + INPUT_DIR);
    process.exit(1);
  }

  compileAll(INPUT_DIR, OUTPUT_DIR, flags);
}

module.exports = { compileAll };
