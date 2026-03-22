# Udemy Transcript DOM Selectors

**Verified:** 2026-03-20
**Inspection method:** DevTools console snippet run on a live Udemy lecture page with transcript open
**Udemy build at time of inspection:** Hash-suffixed class names present (e.g., `JLceZ`, `ot5Wx`) — these are build artifacts and MUST NOT be used as selectors. All selectors below use stable `data-purpose` attributes or stable IDs.

---

## Core Transcript Selectors

### Transcript Panel

| Property | Value |
|---|---|
| Element | `div` |
| Verified selector | `[data-purpose="transcript-panel"]` |
| Class (for reference only, unstable) | `transcript--transcript-panel--JLceZ` |
| Status | VERIFIED |

```javascript
document.querySelector('[data-purpose="transcript-panel"]')
```

### Sidebar Scroll Container

| Property | Value |
|---|---|
| Element | `div` |
| ID | `ct-sidebar-scroll-container` |
| Verified selector | `#ct-sidebar-scroll-container` |
| Class (for reference only, unstable) | `sidebar--content--ot5Wx sidebar--transcript--D0uuI` |
| `data-purpose` | `sidebar-content` |
| Status | VERIFIED |

```javascript
document.getElementById('ct-sidebar-scroll-container')
// or
document.querySelector('#ct-sidebar-scroll-container')
```

---

## Cue (Individual Transcript Line) Selectors

### Cue Elements

| Property | Value |
|---|---|
| Element | `p` |
| Verified selector | `[data-purpose="transcript-cue"]` |
| Class (for reference only, unstable) | `transcript--underline-cue---xybZ` |
| Status | VERIFIED |

```javascript
document.querySelectorAll('[data-purpose="transcript-cue"]')
```

**Note on cue text content:** Cue text may include a speaker label prefix in the format `"-: "` (e.g., `"-: In this video we're gonna take a look at"`). The `cleanTranscript` function in `cleaning.js` strips these labels.

### Cue Text Span (child of each cue)

| Property | Value |
|---|---|
| Element | `span` |
| Verified selector | `[data-purpose="cue-text"]` |
| Parent | `[data-purpose="transcript-cue"]` |
| Status | VERIFIED |

```javascript
// Get text of a single cue
cueElement.querySelector('[data-purpose="cue-text"]').textContent
// Get all cue text spans
document.querySelectorAll('[data-purpose="cue-text"]')
```

### Active (Currently Playing) Cue

| Property | Value |
|---|---|
| Verified selector | `[data-purpose="transcript-cue-active"]` |
| Note | Different `data-purpose` value from standard cues |
| Status | VERIFIED |

```javascript
document.querySelector('[data-purpose="transcript-cue-active"]')
```

---

## Transcript Toggle Button

| Property | Value |
|---|---|
| Verified selector | `[data-purpose="transcript-toggle"]` |
| `aria-expanded` when open | `"true"` |
| `aria-expanded` when closed | `"false"` |
| Status | VERIFIED |

```javascript
const toggle = document.querySelector('[data-purpose="transcript-toggle"]');
const isOpen = toggle.getAttribute('aria-expanded') === 'true';
// To open programmatically if closed:
if (!isOpen) toggle.click();
```

---

## Lecture Title

No dedicated per-lecture title element was found directly in the transcript panel area.

### Primary approach: Active sidebar item

| Property | Value |
|---|---|
| Verified selector | `[aria-current="true"] span[data-purpose="item-title"]` |
| Usage | Active lecture in curriculum sidebar — reliable regardless of `document.title` format |
| Status | VERIFIED 2026-03-22 |

```javascript
const activeTitleEl = document.querySelector('[aria-current="true"] span[data-purpose="item-title"]');
const lectureTitle = activeTitleEl && activeTitleEl.textContent.trim();
```

### Fallback: `document.title`

| Property | Value |
|---|---|
| Method | `document.title` |
| Format | `"Lecture Name | Course Name | Udemy"` (historic) or `"Course: ... | Udemy"` (observed 2026-03-22) |
| Status | UNRELIABLE — Udemy sometimes returns course title instead of lecture title |

```javascript
// Only use as fallback if sidebar selector fails
const lectureTitle = document.title.split(' | ')[0].trim();
```

### Course header title

| Property | Value |
|---|---|
| Verified selector | `h1[data-purpose="course-header-title"]` |
| Note | Course-level title, not per-lecture |
| Status | VERIFIED |

```javascript
document.querySelector('h1[data-purpose="course-header-title"]')
```

---

## Section Name

### Section heading (preferred)

| Property | Value |
|---|---|
| Verified selector | `[data-purpose="section-heading"]` |
| Content format | Full section text, e.g., `"Section 1: Introduction"` |
| Status | VERIFIED |

```javascript
// Find the section heading that contains the active lecture
document.querySelector('[data-purpose="section-heading"]')
```

### Section container

| Property | Value |
|---|---|
| Verified selector | `[data-purpose="curriculum-section-container"]` |
| Note | Wraps the section heading and its lecture items |
| Status | VERIFIED |

```javascript
document.querySelector('[data-purpose="curriculum-section-container"]')
```

---

## Caption Type Detection

Determines whether transcript is manual (human-authored) or auto-generated.

| Property | Value |
|---|---|
| Verified selector | `[data-purpose="captions-dropdown-menu"]` |
| Manual caption pattern | Text contains `"[CC]"` (e.g., `"English [CC]"`) |
| Auto-generated pattern | Text contains `"[Auto]"` (e.g., `"Arabic [Auto]"`, `"Bulgarian [Auto]"`) |
| Status | VERIFIED |

```javascript
const captionsMenu = document.querySelector('[data-purpose="captions-dropdown-menu"]');
const isManual = captionsMenu && captionsMenu.textContent.includes('[CC]');
const isAuto = captionsMenu && captionsMenu.textContent.includes('[Auto]');
```

**Note:** The live inspection lecture had `"English [CC]"` — manual captions. Auto-generated transcripts may have lower quality text requiring more aggressive cleaning.

---

## Recommended Extraction Pattern

```javascript
// 1. Check transcript panel is visible
const panel = document.querySelector('[data-purpose="transcript-panel"]')
           || document.getElementById('ct-sidebar-scroll-container');

// 2. Collect all cue text
const cues = Array.from(document.querySelectorAll('[data-purpose="transcript-cue"]'))
  .map(el => {
    const span = el.querySelector('[data-purpose="cue-text"]');
    return span ? span.textContent.trim() : el.textContent.trim();
  })
  .filter(Boolean);

// 3. Get lecture title
const lectureTitle = document.title.split(' | ')[0].trim() || 'Unknown Lecture';

// 4. Get section name
const sectionEl = document.querySelector('[data-purpose="section-heading"]');
const sectionName = sectionEl ? sectionEl.textContent.trim() : '';

// 5. Check caption type
const captionsMenu = document.querySelector('[data-purpose="captions-dropdown-menu"]');
const captionType = captionsMenu && captionsMenu.textContent.includes('[CC]')
  ? 'manual'
  : captionsMenu && captionsMenu.textContent.includes('[Auto]')
    ? 'auto'
    : 'unknown';
```

---

## Selector Stability Notes

- `data-purpose` attributes are stable product attributes intentionally set by Udemy engineers for testing/automation — they survive CSS rebuilds.
- `#ct-sidebar-scroll-container` is a stable DOM ID used for scrolling behavior — unlikely to change.
- Class names with hash suffixes (e.g., `--JLceZ`, `--ot5Wx`) are CSS Modules build artifacts. They change on every Udemy deploy and MUST NOT be used as selectors.
- `document.title` format `"Lecture | Course | Udemy"` is a long-standing Udemy convention observed across multiple course types.

---

*Verified by live DOM inspection on 2026-03-20. Re-verify if Udemy makes major platform changes.*
