// processor.js — CLI entry point and batch orchestrator for PMI transcript processor
// Processes transcript JSON files into structured study notes markdown via Anthropic API
// CommonJS module — no ES module syntax

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const Anthropic = require('@anthropic-ai/sdk');
const { loadManifest, saveManifest, shouldSkip } = require('./manifest');
const { buildMessages } = require('./prompt');
const { buildMarkdown } = require('./markdown');
const { estimateCost, countLectureTokens, formatEstimateTable, MAX_OUTPUT_TOKENS } = require('./estimate');

const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output');

/**
 * promptConfirm()
 * Prompts the user for a y/N confirmation via stdin.
 * Returns true if user types 'y', false otherwise.
 */
async function promptConfirm() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Proceed with processing? [y/N]: ', answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

/**
 * runEstimate(pendingFiles, manifest, flags, client, inputDir)
 * Counts tokens for all pending lectures, displays the estimate table,
 * then either exits (--estimate), proceeds silently (--yes), or prompts.
 */
async function runEstimate(pendingFiles, manifest, flags, client, inputDir) {
  const model = process.env.PMI_MODEL || 'claude-sonnet-4-6';
  const rows = [];
  for (const file of pendingFiles) {
    const transcript = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
    const inputTokens = await countLectureTokens(client, model, transcript);
    const outputTokens = MAX_OUTPUT_TOKENS;
    const costDollars = estimateCost(inputTokens, model);
    rows.push({ name: file.replace('.json', ''), inputTokens, outputTokens, costDollars });
  }
  const totals = {
    inputTokens: rows.reduce((s, r) => s + r.inputTokens, 0),
    outputTokens: rows.reduce((s, r) => s + r.outputTokens, 0),
    costDollars: rows.reduce((s, r) => s + r.costDollars, 0),
  };
  console.log('\n' + formatEstimateTable(rows, totals) + '\n');

  if (flags.estimate) {
    process.exit(0);
  }

  if (flags.yes) {
    return; // proceed without prompting
  }

  if (process.stdin.isTTY !== true) {
    console.error('Error: confirmation required in non-interactive mode. Use --yes to skip.');
    process.exit(1);
  }

  const confirmed = await promptConfirm();
  if (!confirmed) {
    console.log('Aborted.');
    process.exit(1);
  }
}

/**
 * processAll(inputDir, flags, client, manifestPath, outputDir)
 * Core batch orchestration function. Processes all .json files in inputDir sequentially.
 * Exported for testability — the CLI main block calls this with the real Anthropic client.
 *
 * @param {string} inputDir - Directory containing transcript .json files
 * @param {{ dryRun: boolean, force: boolean, estimate: boolean, yes: boolean }} flags - CLI flags
 * @param {Object} client - Anthropic SDK client (or mock for testing)
 * @param {string} [manifestPath] - Path to processing-state.json (defaults to __dirname)
 * @param {string} [outputDir] - Output directory for .md files (defaults to processor/output/)
 * @returns {Promise<{ processed: number, failed: number, skipped: number }>}
 */
async function processAll(inputDir, flags, client, manifestPath, outputDir) {
  // 1. Resolve paths
  const resolvedInput = path.resolve(inputDir);
  const resolvedManifest = manifestPath || path.join(__dirname, 'processing-state.json');
  const resolvedOutput = outputDir || DEFAULT_OUTPUT_DIR;

  // 2. Read all .json files from inputDir
  const files = fs.readdirSync(resolvedInput).filter(f => f.endsWith('.json')).sort();
  if (files.length === 0) {
    console.log('No .json files found in ' + resolvedInput);
    return { processed: 0, failed: 0, skipped: 0 };
  }

  // 3. Ensure output dir exists
  fs.mkdirSync(resolvedOutput, { recursive: true });

  // 4. Load manifest
  const manifest = loadManifest(resolvedManifest);

  // 5. Filter to pending lectures for estimate
  const pendingFiles = files.filter(f => !shouldSkip(manifest[f], flags.force));

  if (pendingFiles.length > 0 && !flags.dryRun) {
    await runEstimate(pendingFiles, manifest, flags, client, resolvedInput);
  }

  const start = Date.now();
  let processed = 0, failed = 0, skipped = 0;
  const total = files.length;

  // 6. Sequential batch loop
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const entry = manifest[file];
    const padded = String(i + 1).padStart(String(total).length, ' ');

    if (shouldSkip(entry, flags.force)) {
      skipped++;
      process.stdout.write('[' + padded + '/' + total + '] Skipping: ' + file + ' (already complete)\n');
      continue;
    }

    if (flags.dryRun) {
      process.stdout.write('[' + padded + '/' + total + '] Would process: ' + file + ' (dry-run)\n');
      continue;
    }

    process.stdout.write('[' + padded + '/' + total + '] Processing: ' + file.replace('.json', '') + '...');
    const t = Date.now();

    try {
      const transcript = JSON.parse(fs.readFileSync(path.join(resolvedInput, file), 'utf8'));
      const { system, messages } = buildMessages(transcript);
      const response = await client.messages.create({
        model: process.env.PMI_MODEL || 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: system,
        messages: messages
      });
      const apiText = response.content[0].text;
      const md = buildMarkdown(transcript, apiText);
      fs.writeFileSync(path.join(resolvedOutput, file.replace('.json', '.md')), md, 'utf8');
      manifest[file] = { filename: file, status: 'complete', processedAt: new Date().toISOString() };
      saveManifest(resolvedManifest, manifest);
      processed++;
      process.stdout.write(' done (' + ((Date.now() - t) / 1000).toFixed(1) + 's)\n');
    } catch (err) {
      manifest[file] = { filename: file, status: 'failed', processedAt: new Date().toISOString(), error: err.message };
      saveManifest(resolvedManifest, manifest);
      failed++;
      process.stdout.write(' FAILED: ' + err.message + '\n');
    }
  }

  // 7. End-of-run summary
  const elapsed = Date.now() - start;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const timeStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
  console.log('\nProcessed: ' + processed + ' | Failed: ' + failed + ' | Skipped: ' + skipped + ' | Time: ' + timeStr);

  return { processed, failed, skipped };
}

// CLI entry point — only runs when executed directly (not during test imports)
if (require.main === module) {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    estimate: args.includes('--estimate'),
    yes: args.includes('--yes'),
  };
  const inputDir = args.filter(a => !a.startsWith('--'))[0];

  if (!inputDir) {
    console.error('Usage: node processor.js <input-dir> [--dry-run] [--force] [--estimate] [--yes]');
    process.exit(1);
  }

  if (!fs.existsSync(inputDir)) {
    console.error('Input directory not found: ' + inputDir);
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Get your key at: https://console.anthropic.com/ -> API Keys -> Create Key');
    process.exit(1);
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 2,
    timeout: 60000
  });

  processAll(inputDir, flags, client).catch(err => {
    console.error('Fatal error: ' + err.message);
    process.exit(1);
  });
}

module.exports = { processAll };
