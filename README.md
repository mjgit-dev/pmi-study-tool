# PMI Study Tool

Extracts transcripts from a Udemy PMP course, processes them into structured study material using the Anthropic API, and packages everything for upload to Claude Projects — where the actual studying, quizzing, and Q&A happens.

**The workflow:** Watch a lecture → run the bookmarklet → repeat for all lectures → run the processor → run the compiler → upload `claude-package/` to Claude Projects → study.

---

## What It Produces

The `claude-package/` directory, ready to upload to Claude Projects:

| File | What it is |
|------|-----------|
| `01-{section}-notes.md` … | One notes file per course section (key concepts, summaries, examples) |
| `01-{section}-quiz.md` … | One quiz file per course section (PMP scenario questions + flashcards) |
| `handbook.md` | Single compiled reference with linked table of contents |
| `CLAUDE_INSTRUCTIONS.md` | System prompt that tells Claude how to quiz and assist |

---

## Project Structure

```
extractor/          # Browser bookmarklet — runs in Udemy DevTools
  extractor.js      # Main extraction script
  cleaning.js       # Transcript cleaning (timestamp stripping, segment joining)
  bookmarklet.txt   # Installable bookmarklet URL

processor/          # Batch processing pipeline
  processor.js      # CLI entry point — processes transcripts/ → output/
  prompt.js         # Anthropic API prompt builder (notes + questions + flashcards)
  manifest.js       # Processing state tracker (resume on failure)
  markdown.js       # Output formatter (YAML frontmatter + markdown)

compiler/           # Output assembly
  compiler.js       # CLI entry point — assembles output/ → claude-package/
  frontmatter.js    # Parses YAML frontmatter from processed files
  sections.js       # Splits notes from quiz content
  grouper.js        # Groups lectures by section, orders chronologically
  builder.js        # Builds section files and handbook
  system-prompt.js  # Generates CLAUDE_INSTRUCTIONS.md

transcripts/        # Drop extracted JSON files here
claude-package/     # Upload this to Claude Projects
```

---

## Setup

**Prerequisites:** Node.js 18+, an Anthropic API key.

```bash
cd processor
npm install
```

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## Usage

### Step 1 — Extract transcripts from Udemy

Install the bookmarklet:

1. `cd extractor && npm run serve` (starts localhost:8765)
2. Open `http://localhost:8765/bookmarklet.txt` in your browser
3. Copy the URL and drag it to your bookmarks bar

For each lecture on Udemy:

1. Open the lecture in the Udemy player
2. Click the bookmarklet
3. A JSON file downloads automatically to your machine
4. Move the file to `transcripts/`

### Step 2 — Process transcripts

```bash
cd processor
node processor.js ../transcripts
```

Processed markdown files appear in `processor/output/`. The manifest (`processing-state.json`) tracks completion — re-running skips already-processed lectures.

### Step 3 — Compile the Claude Projects package

```bash
node compiler.js
```

The `claude-package/` directory is created (or regenerated) with all section files, the handbook, and the system prompt.

### Step 4 — Upload to Claude Projects

1. Go to [claude.ai](https://claude.ai) → Projects → New Project
2. Upload all files from `claude-package/`
3. Paste the contents of `CLAUDE_INSTRUCTIONS.md` as the project system prompt
4. Start studying

---

## Running Tests

```bash
# Extractor tests
cd extractor && node --test tests/extractor.test.js

# Processor tests
cd processor && npm test

# Compiler tests
cd compiler && node --test tests/*.test.js
```

---

## Notes

- Processing cost: ~1 Anthropic API call per lecture (notes + questions + flashcards in a single call)
- The processor skips lectures already in `processing-state.json` — safe to re-run after failures
- `claude-package/` is regenerated from scratch on each compiler run — idempotent
- Extraction is semi-manual by design (one lecture at a time) to avoid Udemy ToS issues
