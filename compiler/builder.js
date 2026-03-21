// builder.js — Section file and handbook content builder for compiler pipeline
// CommonJS module — no ES module syntax, no external dependencies

'use strict';

const { toSlug } = require('./grouper.js');

/**
 * toGfmAnchor(headingText)
 * Converts a heading text to a GitHub Flavored Markdown anchor ID.
 * Lowercase, remove non-alphanumeric/space/hyphen chars, replace spaces with hyphens,
 * collapse multiple hyphens.
 *
 * @param {string} headingText
 * @returns {string} GFM anchor string (without leading #)
 */
function toGfmAnchor(headingText) {
  return headingText
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')  // remove chars that are not alphanumeric, space, or hyphen
    .replace(/ +/g, '-')           // replace spaces with hyphens
    .replace(/-+/g, '-')           // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens
}

/**
 * sectionFilename(sectionNumber, sectionName, type)
 * Returns the output filename for a section file.
 * Format: '{NN}-{slug}-{type}.md' where NN is zero-padded 2-digit number.
 *
 * @param {number} sectionNumber - 1-based section index
 * @param {string} sectionName - Human-readable section name
 * @param {string} type - 'notes' or 'quiz'
 * @returns {string} Filename
 */
function sectionFilename(sectionNumber, sectionName, type) {
  const nn = String(sectionNumber).padStart(2, '0');
  const slug = toSlug(sectionName);
  return `${nn}-${slug}-${type}.md`;
}

/**
 * buildSectionFile(sectionName, lectures, type)
 * Assembles a markdown file for a single section containing either notes or quiz content.
 *
 * Structure:
 *   # {sectionName} \u2014 Notes  (or Quiz)
 *   ## {lectureTitle}
 *   {lecture notes or quiz content}
 *   (blank line between lectures)
 *
 * Lectures with empty content for the given type are skipped entirely.
 * File ends with a trailing newline.
 *
 * @param {string} sectionName
 * @param {Array<{lectureTitle: string, notes: string, quiz: string}>} lectures
 * @param {string} type - 'notes' or 'quiz'
 * @returns {string} Markdown file content
 */
function buildSectionFile(sectionName, lectures, type) {
  const label = type === 'quiz' ? 'Quiz' : 'Notes';
  const lines = [`# ${sectionName} \u2014 ${label}`];

  for (const lecture of lectures) {
    const content = type === 'quiz' ? lecture.quiz : lecture.notes;
    if (!content) continue; // skip lectures with empty content for this type

    lines.push('');
    lines.push(`## ${lecture.lectureTitle}`);
    lines.push('');
    lines.push(content);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * buildHandbook(orderedSections, groups)
 * Assembles the PMP Study Handbook markdown file.
 *
 * Structure:
 *   # PMP Study Handbook
 *
 *   ## Table of Contents
 *   - [Section Name](#anchor)
 *     - [Lecture Title](#anchor)
 *
 *   ---
 *
 *   ## Section Name
 *   ### Lecture Title
 *   {lecture.notes content}
 *
 *   ---  (between sections)
 *
 * Only notes content is included — quiz content (Practice Questions, Flashcards) is excluded.
 *
 * @param {string[]} orderedSections - Section names in display order (from orderSections)
 * @param {Map<string, Array>} groups - Lecture groups (from groupBySectionName)
 * @returns {string} Handbook markdown content
 */
function buildHandbook(orderedSections, groups) {
  const lines = ['# PMP Study Handbook', ''];

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  for (const sectionName of orderedSections) {
    const lectures = groups.get(sectionName) || [];
    lines.push(`- [${sectionName}](#${toGfmAnchor(sectionName)})`);
    for (const lecture of lectures) {
      lines.push(`  - [${lecture.lectureTitle}](#${toGfmAnchor(lecture.lectureTitle)})`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Section bodies
  for (let i = 0; i < orderedSections.length; i++) {
    const sectionName = orderedSections[i];
    const lectures = groups.get(sectionName) || [];

    lines.push(`## ${sectionName}`);
    lines.push('');

    for (const lecture of lectures) {
      lines.push(`### ${lecture.lectureTitle}`);
      lines.push('');
      if (lecture.notes) {
        lines.push(lecture.notes);
        lines.push('');
      }
    }

    // Add separator after each section except the last
    if (i < orderedSections.length - 1) {
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n') + '\n';
}

module.exports = { buildSectionFile, sectionFilename, buildHandbook, toGfmAnchor };
