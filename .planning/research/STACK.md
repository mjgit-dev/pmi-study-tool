# Technology Stack

**Project:** PMI Study Tool (Local Transcript Processor)
**Researched:** 2026-03-20

---

## Recommended Stack

### Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20 LTS or 22 LTS | Script runtime | LTS stability for a local tool; native ESM support |
| TypeScript | ~5.4+ | Type safety | Pipeline touching file I/O, API responses, structured markdown benefits from types. Use `tsx` for dev. |

### Core Processing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@anthropic-ai/sdk` | latest | Anthropic API client | Official SDK. Handles auth, retries, streaming, and the Message Batches API. Batches API is correct for 100+ transcripts — async, 50% cheaper per token. Do NOT use bare `fetch`. |
| `p-limit` | latest | Concurrency control | Gates parallel requests to stay within rate limits |
| `p-retry` | latest | Retry with backoff | Wraps API calls with exponential backoff. Critical so one failure doesn't abort a 100+ transcript pipeline. |

### File System & I/O

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js `fs/promises` | built-in | File read/write | No third-party library needed |
| `glob` | latest | File discovery | Find all transcript files without manual listing. ESM-native. |
| `gray-matter` | latest | YAML front matter | Add metadata (section, lecture number) to output markdown files |

### CLI Interface

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `commander` | latest | CLI argument parsing | Industry standard for Node.js CLIs |
| `ora` | latest | Spinner / progress | User feedback during 100+ transcript batch — without it the tool looks frozen |
| `chalk` | latest | Terminal colors | Colored success/error/warning output |

### Browser Extraction Script

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vanilla JavaScript | — | Udemy DOM scraping | Runs in DevTools console in the user's authenticated session. No build step. No dependencies. |

### Configuration & Environment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `dotenv` | latest | API key management | Standard `.env` file loading. API key must never be hardcoded. |
| JSON config file | — | Pipeline config | Input/output dirs, model choice, prompt templates |

---

## Key Architecture: Anthropic Message Batches API

The Message Batches API is the correct approach for bulk transcript processing.

- Submit up to 10,000 requests per batch
- 50% cost reduction vs standard Messages API
- Poll for completion; each request in the batch is independent

**Pipeline pattern:**
1. Read all transcript files from input directory
2. Build batch request array (one request per transcript)
3. Submit single `client.beta.messages.batches.create()` call
4. Poll until `processing_status === 'ended'`
5. Stream results and write each to output markdown file

This is categorically better than a serial loop with `await` on each transcript.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Runtime | Node.js | Python | Both valid. Node.js keeps the whole toolchain one language. |
| API Client | `@anthropic-ai/sdk` | `fetch` directly | SDK handles retries, streaming, batch polling, and auth correctly. |
| Batch processing | Message Batches API | Serial `messages.create` | Serial: slow, expensive, rate-limited. Batches: async, 50% cheaper. |
| Browser script | Vanilla JS | Puppeteer/Playwright | Can't use user's authenticated session easily. Console script is simpler. |

---

## What NOT to Use

| Technology | Reason to Avoid |
|------------|----------------|
| LangChain / LlamaIndex | Over-engineering. One AI task, one prompt per transcript. |
| Vector databases | Claude Projects handles semantic search natively. Don't replicate. |
| Electron / Tauri | Desktop app overkill. CLI is sufficient. |
| Next.js / React | Web UI is explicitly out of scope. Claude Projects is the UI. |
| SQLite / Prisma | No persistent database needed. File system is the database. |

---

## Installation

```bash
npm init -y
npm install @anthropic-ai/sdk dotenv commander p-limit p-retry glob gray-matter ora chalk
npm install -D typescript tsx @types/node
```

**package.json key settings:**
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## Confidence Notes

- Node.js, TypeScript, `@anthropic-ai/sdk` — HIGH confidence
- Message Batches API existence — MEDIUM (verify at docs.anthropic.com)
- All package versions — verify with `npm view <package> version` before installing
