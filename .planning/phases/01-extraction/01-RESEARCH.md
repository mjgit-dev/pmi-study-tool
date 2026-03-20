# Phase 1: Extraction - Research

**Researched:** 2026-03-20
**Domain:** Browser bookmarklet, Udemy DOM extraction, client-side file download, transcript text processing
**Confidence:** MEDIUM (Udemy DOM selectors require live inspection; all other areas HIGH)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Output delivery:** Auto-download as JSON file. Named after lecture title (e.g., `What-is-a-Project.json`). Flat JSON: `lectureTitle`, `sectionName`, `transcript`, `wordCount`, `extractedAt`. Browser can only suggest filename, not path — planner must address folder placement.
- **Script invocation:** Bookmarklet — one click from bookmarks bar. Script auto-opens/toggles transcript panel. Error if run outside lecture: "No transcript found — open a lecture first".
- **Cleaning rules:** Smart sentence joining (merge fragments, capitalize after periods, join mid-sentence splits, strip timestamps). Normalize whitespace. Strip filler words (um, uh, you know, like, etc.). Normalize/strip speaker labels. Auto-generated captions: extract as-is, include `captionType: "auto-generated"`.
- **Validation and feedback:** Success: toast/banner overlay — "✓ Extracted: [title] ([n] words)" — disappears after a few seconds. Low word count (<300): extract and download but show yellow/orange overlay. Edge cases to catch: No transcript, duplicate extraction, missing metadata (fallback to "Unknown Section"/"Unknown Lecture"), non-English captions (include `language` flag).

### Claude's Discretion
- Bookmarklet update mechanism (manual re-bookmark vs. self-updating from local file)
- Exact overlay styling and duration
- Filler word list completeness
- Duplicate detection implementation (localStorage vs. no state)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXTR-01 | User can run a browser script in Udemy DevTools to capture transcript and metadata (section name, lecture title) for the current lecture | Bookmarklet pattern, DOM selector strategy, `data-purpose` + `aria-*` stable selectors |
| EXTR-02 | Extracted transcripts are automatically cleaned (timestamps stripped, caption segments joined into readable sentences) | Transcript cleaning algorithm patterns, filler word list, sentence-joining regex approach |
| EXTR-03 | Extraction validates word count and flags captures under 300 words as likely failures | Word count computation, toast overlay pattern, download-anyway behavior |
</phase_requirements>

---

## Summary

Phase 1 delivers a single JavaScript bookmarklet that a user clicks while on any Udemy lecture page. It reads the transcript from the DOM, cleans the text, validates word count, triggers a JSON download, and shows a toast notification — all without any build tooling, external dependencies, or backend. The entire implementation is self-contained browser JavaScript.

The largest unknown is Udemy's exact current DOM structure for the transcript panel. Udemy uses a React SPA with CSS Modules (hashed class names) and a `data-purpose` attribute system for semantic targeting. Historical scripts reveal at least two confirmed stable selectors (`div[class*="transcript--transcript-panel"]` and `document.getElementById("ct-sidebar-scroll-container")`), plus the `data-purpose="course-header-title"` pattern for course-level metadata. Section name and lecture title selectors require live DOM inspection as part of Wave 0 — this is the documented blocker in STATE.md and is confirmed by multiple community tools that either avoid publishing selectors or warn they may change.

The bookmarklet pattern itself is well-understood. The 2000-character URL limit requires a loader-stub approach: the bookmarklet contains only a minimal `<script src>` injection that loads the actual implementation from a local file via `file://` URL — or alternatively the full minified script inlined if it fits. File download uses the universal Blob + anchor `download` attribute pattern. Toast overlay is 15-20 lines of vanilla JS + inline CSS — no library needed.

**Primary recommendation:** Implement as a loader-stub bookmarklet pointing to a local `extractor.js` file. Use `data-purpose` and `aria-*` selectors exclusively — never CSS class names. Plan Wave 0 as a DOM-inspection task that discovers and locks actual selectors before any extraction logic is written.

---

## Standard Stack

This phase uses zero npm packages. All implementation is vanilla browser JavaScript. There is no build step.

### Core
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Vanilla JavaScript (ES2020+) | N/A | All extraction, cleaning, download logic | No build toolchain; bookmarklets run in browser context |
| Blob API | Browser built-in | Create downloadable JSON file | Universal support since 2015; works in all major browsers |
| URL.createObjectURL() | Browser built-in | Generate temporary download URL | Paired with Blob; works with anchor `download` attribute |
| localStorage | Browser built-in | Duplicate extraction detection | Persists across page navigations; same-origin accessible |

### Supporting
| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| `<a download>` attribute | HTML5 | Trigger file save dialog with suggested filename | Always — the only cross-browser way to name a downloaded file |
| CSS Modules class glob `[class*="..."]` | N/A | Fall-back if `data-purpose` not present on transcript container | Only if direct `data-purpose` selector not found during inspection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Blob + anchor download | `showSaveFilePicker()` (File System Access API) | `showSaveFilePicker` can suggest a folder, but does NOT work in bookmarklet context; requires transient user activation from a real event handler, not a script element injection. Not viable. |
| Loader-stub bookmarklet | Full inline minified bookmarklet | Inline only works if script compresses under ~8000 chars (Chrome limit); update requires re-bookmarking. Loader-stub enables updates by editing the local `.js` file. |
| localStorage for duplicate detection | No-state approach | No-state is simpler; localStorage adds a one-time set/check before download. Either is acceptable — Claude's Discretion area. |

**Installation:** None. This is a browser bookmarklet + local JS file. No npm install required.

---

## Architecture Patterns

### Recommended Project Structure
```
extractor/
├── extractor.js          # Full implementation (loaded by bookmarklet)
├── bookmarklet.js        # Loader stub — the only thing in the bookmark URL
├── bookmarklet.txt       # URL-encoded bookmark string (copy-paste for install)
└── tests/
    ├── extractor.test.js # Node-compatible unit tests for cleaning logic
    └── fixtures/
        └── sample-transcript.html  # Captured Udemy DOM snapshot for tests
```

### Pattern 1: Loader-Stub Bookmarklet
**What:** The bookmark URL contains only a minimal script that injects a `<script>` tag pointing to the real implementation hosted as a local `file://` URL.
**When to use:** Always — the actual implementation will exceed 2000 characters once it includes cleaning, validation, toast, and download logic.
**Example:**
```javascript
// bookmarklet.js — this is what goes in the bookmark URL (URL-encoded)
javascript:(function(){
  var s = document.createElement('script');
  s.src = 'file:///C:/pmi-study-tool/extractor/extractor.js?t=' + Date.now();
  document.head.appendChild(s);
})();
```
Note: The `?t=Date.now()` cache-buster ensures the browser reloads the script on each click, not a stale cached version.

**IMPORTANT — file:// CORS caveat:** Loading `file://` scripts from an HTTPS page is blocked by browsers as a mixed-content violation. This is a critical constraint. Solutions:
1. **Serve locally:** Run a minimal `http-server` on localhost (e.g., `npx http-server extractor/ -p 8765`) — the bookmarklet points to `http://localhost:8765/extractor.js`. This is the cleanest approach for development and use.
2. **Inline the full script:** Minify and URL-encode the entire script into the bookmark. Viable if minified size stays under ~8000 characters (Chrome supports long bookmarklets; Firefox ~65535 chars). Requires re-bookmarking on every update.
3. **Data URI:** Encode the script as a `data:text/javascript,...` URI embedded directly in the bookmarklet. Works but makes updates cumbersome.

**Recommendation for Claude's Discretion area (update mechanism):** Use the localhost server approach during development. Provide a one-line `npm run serve` (or a bare `python -m http.server`) command that the user starts once. The bookmarklet then always loads the latest file without re-bookmarking.

### Pattern 2: Transcript DOM Extraction
**What:** Read transcript text from the Udemy sidebar panel, which contains individual cue/line elements.
**When to use:** Core extraction logic.

Known-stable Udemy selectors (from community scripts, MEDIUM confidence — require live verification):
```javascript
// Source: greasyfork.org/en/scripts/438682 (Copy Udemy Transcript)
// Transcript panel presence check (CSS Modules partial match — stable across React deploys):
const panel = document.querySelector('div[class*="transcript--transcript-panel"]');

// Full transcript text (ID-based — more stable than class):
const sidebar = document.getElementById('ct-sidebar-scroll-container');

// Course header title area (data-purpose — HIGH stability):
const headerTitle = document.querySelector('a[data-purpose="course-header-title"]');

// Curriculum section container (data-purpose — confirmed in multiple scripts):
const sections = document.querySelectorAll("div[data-purpose='curriculum-section-container']");
```

**For lecture title and section name:** These require live DOM inspection (Wave 0 task). Likely candidates based on Udemy's `data-purpose` convention:
- Lecture title: likely in `<h1>` or heading element with `data-purpose` containing "lecture" or in the page `<title>`
- Section name: likely in a parent container with `data-purpose="curriculum-section-container"` or a sibling heading

**Individual cue elements** (require live inspection): Udemy renders transcript as a list of timestamped segments. Each cue likely has a structure like:
```html
<div class="[hashed]" data-purpose="transcript-cue">
  <span class="[hashed]">0:04</span>
  <p class="[hashed]">The text content here</p>
</div>
```
The safest extraction approach: grab `sidebar.innerText` and post-process, OR query all `<p>` children of the transcript panel and collect their text.

### Pattern 3: Transcript Cleaning Pipeline
**What:** A pipeline of pure functions that transform raw cue text into clean prose.
**When to use:** Applied to raw extracted text before building the JSON output.

```javascript
// Source: Standard transcript cleaning approach (training knowledge, HIGH confidence)
function cleanTranscript(rawCues) {
  // Step 1: Strip timestamps (HH:MM:SS or MM:SS patterns)
  let text = rawCues
    .map(cue => cue.replace(/\d{1,2}:\d{2}(?::\d{2})?/g, '').trim())
    .filter(Boolean)
    .join(' ');

  // Step 2: Strip filler words (whole word match, case-insensitive)
  const fillers = /\b(um+|uh+|you know|like|you know what i mean|kind of|sort of|basically|literally|actually|right)\b[,]?/gi;
  text = text.replace(fillers, '').replace(/\s{2,}/g, ' ').trim();

  // Step 3: Strip/normalize speaker labels [Speaker:] or Speaker:
  text = text.replace(/\[?[A-Z][a-z]+:\]?\s*/g, '');

  // Step 4: Smart sentence joining — capitalize after period, join mid-sentence
  text = text
    .replace(/([.!?])\s+([a-z])/g, (_, punct, char) => `${punct} ${char.toUpperCase()}`)
    .replace(/([^.!?])\s*\n\s*/g, '$1 ');  // join non-sentence-ending line breaks

  // Step 5: Normalize whitespace
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}
```

### Pattern 4: Blob Download
**What:** Create a JSON file and trigger browser download with a suggested filename.
**When to use:** Final step after building the JSON payload.

```javascript
// Source: MDN Blob API / LogRocket blog (HIGH confidence)
function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;  // Browser uses this as the suggested filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);  // Clean up to prevent memory leak
}

// Filename from lecture title — sanitize for filesystem
function toFilename(lectureTitle) {
  return lectureTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '.json';
}
```

**Note on folder placement:** The browser's download system respects the user's browser download folder setting. The `download` attribute suggests a filename but not a path. The workaround is to configure the browser download folder to the project directory, or to document a manual step. `showSaveFilePicker()` cannot be used here (see Anti-Patterns).

### Pattern 5: Toast Overlay (No Library)
**What:** Inject a styled notification div directly into the Udemy page DOM.
**When to use:** After extraction succeeds or fails.

```javascript
// Source: Vanilla JS toast pattern (HIGH confidence — standard approach)
function showToast(message, type = 'success') {
  // Remove any existing toast
  const existing = document.getElementById('pmi-extractor-toast');
  if (existing) existing.remove();

  const colors = { success: '#22c55e', warning: '#f59e0b', error: '#ef4444' };
  const toast = document.createElement('div');
  toast.id = 'pmi-extractor-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '999999',
    background: colors[type] || colors.success,
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    maxWidth: '320px',
    lineHeight: '1.4'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);  // Claude's Discretion: duration
}
```

### Anti-Patterns to Avoid
- **Using hashed CSS class names as selectors:** Udemy's React build hashes class names (e.g., `.transcript--transcript-panel--Hx2e1`). These change on every deploy. The partial-match glob `[class*="transcript--transcript-panel"]` is the minimum viable compromise; `data-purpose` attributes are strictly preferred.
- **Using `document.title` for lecture title:** The page `<title>` element may contain stale or course-level text. Find the heading element within the player that reflects the current lecture.
- **Using `showSaveFilePicker()`:** Requires transient user activation from a native event handler; a dynamically injected script does not satisfy this requirement. Falls back required.
- **Loading external scripts via `file://` from HTTPS:** Blocked by browser security policy (mixed content). Must use `localhost` server or inline the script.
- **Skipping `URL.revokeObjectURL()`:** Creates a memory leak on pages where the user extracts many lectures.
- **Blocking extraction if transcript is auto-generated:** Auto-generated captions must be extracted as-is with a `captionType: "auto-generated"` flag, not skipped.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download trigger | Custom XHR / fetch-based download | Blob + `<a download>` | The anchor pattern is 3 lines and universally supported; custom approaches fail for same-origin reasons |
| Toast notification | Full CSS animation library | 20-line inline vanilla CSS | No external dependency needed; keeps bookmarklet self-contained |
| Transcript toggle button | Custom panel open/close logic | Click the existing toggle button in the Udemy DOM | Udemy's own toggle handles all React state; simulating it is more reliable than manipulating hidden state |

**Key insight:** This phase lives entirely in browser context. Every "library" adds either a CDN dependency (fragile in bookmarklet context) or build complexity. Vanilla JS with Blob/localStorage/querySelector is the correct tool.

---

## Common Pitfalls

### Pitfall 1: Hashed Class Names Break on Udemy Deploy
**What goes wrong:** Script stops working after Udemy pushes a React update because class names like `transcript--transcript-panel--Hx2e1` change.
**Why it happens:** CSS Modules append a content-hash to class names at build time.
**How to avoid:** Use ONLY `data-purpose`, `aria-*`, `id`, or element-type selectors. The partial-match `[class*="transcript--transcript-panel"]` is a tolerated fallback but still fragile.
**Warning signs:** Script suddenly returns empty transcript after Udemy UI change.

### Pitfall 2: Transcript Panel Not Yet Open
**What goes wrong:** Script runs before the transcript panel is open; querySelector returns null.
**Why it happens:** Udemy's transcript panel is conditionally rendered or visibility-toggled. If it has never been opened in this session, the DOM nodes may not exist yet.
**How to avoid:** The script must click/toggle the transcript panel open and wait for DOM nodes to appear before querying. Use a small polling loop (`setInterval` with a retry count) or observe DOM mutations (`MutationObserver`) after triggering the toggle.
**Warning signs:** `document.getElementById('ct-sidebar-scroll-container')` returns `null`.

### Pitfall 3: file:// Script Blocked by HTTPS
**What goes wrong:** Bookmarklet stub tries to load `file:///path/to/extractor.js` but Chrome/Firefox blocks the request as mixed content (HTTPS page loading a file:// resource).
**Why it happens:** Browser security policy prevents insecure resource loads on secure pages.
**How to avoid:** Serve the script from `http://localhost:PORT/extractor.js`. Document the `python -m http.server` or `npx http-server` command the user must run.
**Warning signs:** DevTools console shows "Not allowed to load local resource" error.

### Pitfall 4: Empty Transcript from innerText on Hidden Elements
**What goes wrong:** `innerText` returns empty string even though transcript is present.
**Why it happens:** `innerText` returns empty for elements with `display: none` or `visibility: hidden`. If the transcript panel is present in DOM but not visible, text is inaccessible.
**How to avoid:** Use `textContent` instead of `innerText` for hidden elements, OR ensure the panel is made visible before reading. Also: check `scrollHeight > 0` as a visibility proxy.
**Warning signs:** `sidebar.innerText === ''` but `sidebar.textContent !== ''`.

### Pitfall 5: Duplicate Download Confusion
**What goes wrong:** User clicks bookmarklet twice by accident; gets two files with the same name; confused about which is authoritative.
**Why it happens:** No state between bookmarklet invocations.
**How to avoid:** Use `localStorage.getItem('pmi-extracted-' + lectureTitle)` before downloading. If already extracted, show a warning toast. This is in Claude's Discretion — localStorage is the standard approach for this pattern.
**Warning signs:** Multiple identical files in downloads folder.

### Pitfall 6: Word Count Inflated by Timestamps
**What goes wrong:** Raw cue text includes timestamps like "0:04" which inflate word count and pollute transcript.
**Why it happens:** Udemy renders timestamps as visible text siblings to caption text in the DOM.
**How to avoid:** Strip timestamps BEFORE computing word count. Count after cleaning.

---

## Code Examples

Verified patterns from official/community sources:

### Full Extraction Flow (Pseudocode)
```javascript
// Source: Synthesized from community scripts + MDN APIs
(async function pmiExtract() {
  // 1. Ensure transcript panel is open
  const toggleBtn = document.querySelector('[data-purpose="transcript-toggle"]') // VERIFY during inspection
    || document.querySelector('button[aria-label*="transcript" i]');
  if (toggleBtn && toggleBtn.getAttribute('aria-expanded') !== 'true') {
    toggleBtn.click();
    await new Promise(r => setTimeout(r, 800)); // Wait for panel render
  }

  // 2. Find transcript container
  const sidebar = document.getElementById('ct-sidebar-scroll-container');
  if (!sidebar) {
    showToast('No transcript found — open a lecture first', 'error');
    return;
  }

  // 3. Detect auto-generated vs. manual captions
  const captionType = sidebar.querySelector('[class*="auto-generated"]') ? 'auto-generated' : 'manual';

  // 4. Detect language
  const langEl = document.querySelector('[lang]');
  const language = langEl ? langEl.getAttribute('lang') : 'en';

  // 5. Extract raw cue texts
  const cueElements = sidebar.querySelectorAll('p, [data-purpose*="cue"]'); // VERIFY during inspection
  const rawCues = Array.from(cueElements).map(el => el.textContent.trim());

  // 6. Extract metadata (VERIFY selectors during inspection)
  const lectureTitle = document.querySelector('[data-purpose="header-title"]')?.textContent.trim()
    || document.title.split('|')[0].trim()
    || 'Unknown Lecture';
  const sectionName = document.querySelector('[data-purpose="curriculum-section-container"] h2')?.textContent.trim()
    || 'Unknown Section';

  // 7. Clean transcript
  const transcript = cleanTranscript(rawCues);

  // 8. Validate
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const isLowWordCount = wordCount < 300;

  // 9. Duplicate detection
  const storageKey = 'pmi-extracted-' + lectureTitle;
  if (localStorage.getItem(storageKey)) {
    showToast(`⚠ Already extracted: ${lectureTitle}`, 'warning');
    // Optionally still proceed
  }

  // 10. Build JSON payload
  const payload = {
    lectureTitle,
    sectionName,
    transcript,
    wordCount,
    extractedAt: new Date().toISOString(),
    captionType,
    language
  };

  // 11. Download
  downloadJSON(payload, toFilename(lectureTitle));
  localStorage.setItem(storageKey, new Date().toISOString());

  // 12. Show feedback
  if (isLowWordCount) {
    showToast(`⚠ Low word count (${wordCount} words) — verify transcript`, 'warning');
  } else {
    showToast(`✓ Extracted: ${lectureTitle} (${wordCount} words)`, 'success');
  }
})();
```

### Selector Verification Snippet (For Wave 0 DOM Inspection)
```javascript
// Run this in Udemy DevTools console while on a lecture with transcript open
// to discover and verify the correct selectors
console.log('Panel:', document.querySelector('div[class*="transcript--transcript-panel"]'));
console.log('Sidebar:', document.getElementById('ct-sidebar-scroll-container'));
console.log('Cues:', document.querySelectorAll('[data-purpose*="transcript"]'));
console.log('Title:', document.querySelector('[data-purpose*="title"]'));
console.log('Section:', document.querySelector('[data-purpose="curriculum-section-container"]'));
console.table(
  Array.from(document.querySelectorAll('[data-purpose]'))
    .map(el => ({ tag: el.tagName, purpose: el.getAttribute('data-purpose'), text: el.textContent.slice(0,50) }))
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bookmarklet with full inline script | Loader-stub bookmarklet + external file | Udemy moved to HTTPS; scripts grew beyond URL limits | Must serve local file via localhost |
| CSS class-name selectors | `data-purpose` + `aria-*` selectors | Udemy adopted CSS Modules (hashed classes) | Class selectors break on every deploy; attribute selectors are stable |
| API-based transcript download | DOM extraction (this project's approach) | Udemy removed public API access; browser-only extraction is the only no-auth option | DOM selectors may drift but always reflects exactly what the user sees |
| `document.execCommand('copy')` | Blob + anchor download | `execCommand` deprecated | Blob approach is the current standard for all browsers |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated. Only needed for clipboard — we're doing file download instead.
- Udemy API endpoint for captions: Removed from public access; requires authentication tokens that change per-session.
- CSS class name selectors on Udemy (e.g., `.transcript-panel`): Unreliable due to CSS Modules.

---

## Open Questions

1. **Exact current Udemy DOM selectors for: transcript toggle button, cue elements, lecture title, section name**
   - What we know: `ct-sidebar-scroll-container` (ID) and `div[class*="transcript--transcript-panel"]` are from a script still actively maintained (greasyfork, 107 installs). `data-purpose` attribute system is confirmed active.
   - What's unclear: Whether `ct-sidebar-scroll-container` ID is still current (may have changed). Exact `data-purpose` values for lecture title heading and section name heading in the current player.
   - Recommendation: Wave 0 MUST include a DOM inspection task. The developer opens a Udemy lecture, opens transcript panel, and runs the verification snippet above to capture exact current selectors. These become the confirmed values used in implementation.

2. **file:// vs. localhost serving for bookmarklet**
   - What we know: `file://` loading from HTTPS is blocked. Localhost works.
   - What's unclear: Whether the user is willing to run a local server, or prefers the fully-inline minified approach.
   - Recommendation: Default to localhost server approach; provide `python -m http.server 8765` as the documented start command. Measure minified script size — if under 6000 chars, offer inline as an alternative.

3. **MutationObserver vs. polling for transcript panel ready-state**
   - What we know: Clicking the toggle does not synchronously render the panel.
   - What's unclear: Whether Udemy's panel uses a CSS transition (predictable delay) or lazy-renders via React (variable delay).
   - Recommendation: Use a 10-iteration polling loop with 100ms intervals (max 1 second wait). This is simpler than MutationObserver and sufficient for a UI toggle.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert` (no install required) OR Jest if preferred |
| Config file | None required for `node:test`; `jest.config.js` if Jest used |
| Quick run command | `node --test extractor/tests/extractor.test.js` |
| Full suite command | `node --test extractor/tests/` |

**Rationale for `node:test`:** The extraction logic (cleaning functions, word count, JSON building, filename sanitization) is pure JavaScript with no DOM dependency. These are pure functions that can be tested in Node.js with no browser. DOM interaction cannot be unit-tested without a DOM simulator (jsdom), but the business logic can be completely isolated.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXTR-01 | Metadata extraction produces correct JSON shape | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-01 | Script exits gracefully with error message when no transcript found | unit (mock DOM) | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-02 | Timestamps are stripped from cue text | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-02 | Filler words are removed (um, uh, you know, like) | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-02 | Sentences are joined correctly at mid-sentence splits | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-02 | Speaker labels stripped | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-03 | Word count < 300 returns `isLowWordCount: true` | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-03 | Word count >= 300 returns `isLowWordCount: false` | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |
| EXTR-03 | Download still proceeds when word count is low | unit | `node --test extractor/tests/extractor.test.js` | ❌ Wave 0 |

**Note:** End-to-end (bookmarklet running against live Udemy) is manual-only. Cannot automate browser + Udemy session in this workflow. Manual smoke test is the phase gate for EXTR-01 DOM integration.

### Sampling Rate
- **Per task commit:** `node --test extractor/tests/extractor.test.js`
- **Per wave merge:** `node --test extractor/tests/`
- **Phase gate:** All unit tests green + manual smoke test on live Udemy lecture before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `extractor/tests/extractor.test.js` — covers all EXTR-01 / EXTR-02 / EXTR-03 unit tests
- [ ] `extractor/extractor.js` — implementation file (created during implementation waves, not Wave 0)
- [ ] `extractor/bookmarklet.txt` — installation instructions file
- Framework install: None — `node:test` is built into Node.js >= 18

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — Blob API, URL.createObjectURL(), anchor `download` attribute, localStorage
- MDN Web Docs — `showSaveFilePicker()` — confirmed NOT viable for bookmarklets (secure context + transient activation required)
- LogRocket Blog — Blob + anchor download pattern for JSON files

### Secondary (MEDIUM confidence)
- [greasyfork.org/en/scripts/438682](https://greasyfork.org/en/scripts/438682-copy-udemy-transcript-to-the-clipboard/code) — Source of `ct-sidebar-scroll-container` and `transcript--transcript-panel` selectors; actively maintained userscript
- [gist.github.com/AstralJohn/330df494981ca97c92a95b65e28967d3](https://gist.github.com/AstralJohn/330df494981ca97c92a95b65e28967d3) — Confirms `data-purpose="curriculum-section-container"` and `aria-expanded` patterns on Udemy
- [greasyfork.org/en/scripts/422576](https://greasyfork.org/en/scripts/422576-udemy-subtitle-downloader-v3/code) — Confirms `a[data-purpose="course-header-title"]` pattern
- [blog.sverrirs.com bookmarklet guide](https://blog.sverrirs.com/2016/07/building-a-javascript-bookmarklet-app-complete-guide.html) — Loader-stub pattern, caching considerations
- [betterexplained.com bookmarklets](https://betterexplained.com/articles/how-to-make-a-bookmarklet-for-your-web-application/) — 2000 char URL limit confirmation

### Tertiary (LOW confidence — require live inspection)
- Candidate selectors for transcript toggle button, individual cue elements, lecture title heading, section name heading — inferred from `data-purpose` naming convention; not directly verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Blob, localStorage, anchor download are stable browser APIs
- Architecture (bookmarklet loader pattern): HIGH — well-documented approach
- Udemy DOM selectors for transcript panel/sidebar: MEDIUM — from active community scripts, may need minor updates
- Udemy DOM selectors for lecture title/section name: LOW — require live inspection (documented blocker)
- Transcript cleaning algorithm: HIGH — pure string manipulation, well-understood patterns
- Pitfalls: HIGH — file:// CORS, hashed classes, panel open timing all verified from multiple sources

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 for API patterns (stable); 2026-03-27 for Udemy DOM selectors (Udemy deploys frequently)
