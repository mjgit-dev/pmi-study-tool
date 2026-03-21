// eco-tagger.js — Standalone ECO re-classification CLI for already-processed lectures
// Adds ECO domain tags to lecture markdown files without regenerating notes/questions/flashcards
// CommonJS module — no ES module syntax
//
// Usage: node processor/eco-tagger.js <output-dir> [--force] [--yes]

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { buildEcoMessages, parseEcoTag, printEcoDomainSummary } = require('./eco-prompt');
const { loadManifest, saveManifest } = require('./manifest');
const { parseFrontmatter } = require('../compiler/frontmatter');

/**
 * patchFrontmatterEcoTag(fileContent, ecoTag)
 * Inserts or replaces the ecoTag field in YAML frontmatter.
 * Body content (everything after the closing ---) is returned byte-identical.
 *
 * - Tries strict regex first (closing --- with trailing newline)
 * - Falls back to closing --- without trailing newline
 * - Throws if no frontmatter found
 * - Idempotent: removes existing ecoTag line before inserting the new one
 *
 * @param {string} fileContent - Full file content as string
 * @param {string} ecoTag - ECO domain to tag (e.g. 'People', 'Process', 'Business Environment')
 * @returns {string} Updated file content with patched frontmatter
 */
function patchFrontmatterEcoTag(fileContent, ecoTag) {
  // Try strict regex first (with trailing newline after closing ---)
  let match = fileContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    // Fallback: closing --- without trailing newline
    match = fileContent.match(/^---\n([\s\S]*?)\n---/);
  }
  if (!match) throw new Error('No frontmatter found');

  const existingFm = match[1];
  // Remove any existing ecoTag line (idempotent -- prevents duplicates)
  const cleaned = existingFm.replace(/^ecoTag:.*$/m, '').replace(/\n\n/g, '\n').replace(/\n$/, '');
  const newFm = `---\n${cleaned}\necoTag: ${JSON.stringify(ecoTag)}\n---\n`;
  return newFm + fileContent.slice(match[0].length);
}

/**
 * retagAll(outputDir, flags, client, manifestPath)
 * Reads all .md files from outputDir, classifies each untagged lecture into an ECO domain
 * via a lightweight AI call (max_tokens: 10), patches frontmatter in-place, and updates manifest.
 *
 * - Already-tagged lectures are skipped unless flags.force is true
 * - Files without frontmatter are skipped (logged)
 * - Domain count summary is printed after completion
 *
 * @param {string} outputDir - Directory containing processed .md files
 * @param {Object} flags - { force: boolean }
 * @param {Object} client - Anthropic client (or mock)
 * @param {string} [manifestPath] - Path to processing-state.json (defaults to processor dir)
 * @returns {Promise<{ tagged: number, skipped: number, failed: number }>}
 */
async function retagAll(outputDir, flags, client, manifestPath) {
  const resolvedOutput = path.resolve(outputDir);
  const resolvedManifest = manifestPath || path.join(__dirname, 'processing-state.json');
  const manifest = loadManifest(resolvedManifest);

  // Read all .md files from outputDir
  const mdFiles = fs.readdirSync(resolvedOutput).filter(f => f.endsWith('.md')).sort();
  if (mdFiles.length === 0) {
    console.log('No .md files found in ' + resolvedOutput);
    return { tagged: 0, skipped: 0, failed: 0 };
  }

  const total = mdFiles.length;
  let tagged = 0, skipped = 0, failed = 0;

  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i];
    const filePath = path.join(resolvedOutput, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const padded = String(i + 1).padStart(String(total).length, ' ');

    if (!fm) {
      console.log('[' + padded + '/' + total + '] Skipping: ' + file + ' (no frontmatter)');
      skipped++;
      continue;
    }

    // Skip already-tagged files unless --force
    if (fm.ecoTag && !flags.force) {
      console.log('[' + padded + '/' + total + '] Skipping: ' + file + ' (already tagged: ' + fm.ecoTag + ')');
      skipped++;
      continue;
    }

    process.stdout.write('[' + padded + '/' + total + '] Tagging: ' + file.replace('.md', '') + '...');

    try {
      // Build transcript-like object from frontmatter + file content body
      const body = content.slice(content.indexOf('\n---\n') + 5);
      const transcript = {
        lectureTitle: fm.lectureTitle || file,
        sectionName: fm.sectionName || '',
        transcript: body  // use full body as transcript context
      };

      const ecoPrompt = buildEcoMessages(transcript);
      const ecoResponse = await client.messages.create({
        model: process.env.PMI_MODEL || 'claude-sonnet-4-6',
        max_tokens: 10,
        system: ecoPrompt.system,
        messages: ecoPrompt.messages
      });
      const ecoTag = parseEcoTag(ecoResponse.content[0].text);

      if (!ecoTag) {
        process.stdout.write(' FAILED: could not parse ECO tag from response\n');
        failed++;
        continue;
      }

      // Patch frontmatter in .md file
      const patched = patchFrontmatterEcoTag(content, ecoTag);
      fs.writeFileSync(filePath, patched, 'utf8');

      // Update manifest -- find the .json key for this .md file
      const jsonKey = file.replace('.md', '.json');
      if (manifest[jsonKey]) {
        manifest[jsonKey].ecoTag = ecoTag;
        manifest[jsonKey].ecoTaggedAt = new Date().toISOString();
      }
      if (!manifest.schemaVersion) {
        manifest.schemaVersion = 2;
      }
      saveManifest(resolvedManifest, manifest);

      tagged++;
      process.stdout.write(' ' + ecoTag + '\n');
    } catch (err) {
      failed++;
      process.stdout.write(' FAILED: ' + err.message + '\n');
    }
  }

  console.log('\nTagged: ' + tagged + ' | Skipped: ' + skipped + ' | Failed: ' + failed);
  printEcoDomainSummary(manifest);

  return { tagged, skipped, failed };
}

// ============================================================
// CLI entry point
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const flags = {
    force: args.includes('--force'),
    yes: args.includes('--yes'),
  };
  const outputDir = args.filter(a => !a.startsWith('--'))[0];

  if (!outputDir) {
    console.error('Usage: node eco-tagger.js <output-dir> [--force] [--yes]');
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    console.error('Output directory not found: ' + outputDir);
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Get your key at: https://console.anthropic.com/ -> API Keys -> Create Key');
    process.exit(1);
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60000 });

  retagAll(outputDir, flags, client).catch(err => {
    console.error('Fatal error: ' + err.message);
    process.exit(1);
  });
}

module.exports = { retagAll, patchFrontmatterEcoTag };
