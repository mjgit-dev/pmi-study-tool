// grouper.js — Section grouping and ordering for compiler pipeline
// CommonJS module — no ES module syntax, no external dependencies

'use strict';

/**
 * groupBySectionName(lectures)
 * Groups an array of lecture objects by their sectionName field.
 * Lectures with falsy sectionName go under '__unknown__'.
 * Within each group, lectures are sorted by processedAt ascending (ISO 8601).
 * Filename is used as secondary tiebreaker for equal processedAt values.
 *
 * @param {Array<{lectureTitle: string, sectionName: string, processedAt: string, notes: string, quiz: string, filename: string}>} lectures
 * @returns {Map<string, Array>} Map keyed by sectionName
 */
function groupBySectionName(lectures) {
  const groups = new Map();
  for (const lecture of lectures) {
    const key = lecture.sectionName || '__unknown__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(lecture);
  }
  // Sort each group by processedAt ascending, filename as tiebreaker
  for (const [, group] of groups) {
    group.sort((a, b) => {
      const timeCmp = a.processedAt.localeCompare(b.processedAt);
      if (timeCmp !== 0) return timeCmp;
      return (a.filename || '').localeCompare(b.filename || '');
    });
  }
  return groups;
}

/**
 * orderSections(groups)
 * Returns section names sorted by the earliest processedAt timestamp in each group.
 * This determines the 01-, 02-, ... numbering of output files.
 *
 * @param {Map<string, Array>} groups - Result of groupBySectionName
 * @returns {string[]} Ordered array of section names
 */
function orderSections(groups) {
  const sectionNames = Array.from(groups.keys());
  return sectionNames.sort((a, b) => {
    // Each group is already sorted ascending, so first element has earliest processedAt
    const aEarliest = groups.get(a)[0].processedAt;
    const bEarliest = groups.get(b)[0].processedAt;
    return aEarliest.localeCompare(bEarliest);
  });
}

/**
 * toSlug(sectionName)
 * Converts a section name to a URL-safe lowercase hyphenated slug.
 * Replaces non-alphanumeric sequences with hyphens, trims leading/trailing hyphens.
 *
 * @param {string} sectionName
 * @returns {string} Slug string
 */
function toSlug(sectionName) {
  return sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { groupBySectionName, orderSections, toSlug };
