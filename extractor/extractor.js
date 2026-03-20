// extractor.js — PMI Study Tool: Udemy Transcript Extractor
// Loaded by bookmarklet.js from localhost:8765
// Self-executing async function — runs immediately when injected into Udemy page

(async function pmiExtract() {

  // ============================================================
  // A) CLEANING FUNCTIONS (copied from cleaning.js — browser has no require())
  // ============================================================

  function cleanTranscript(rawCues) {
    if (!Array.isArray(rawCues) || rawCues.length === 0) {
      return '';
    }

    // Step 1: Strip timestamps (e.g., "0:04", "12:30", "1:23:45")
    var TIMESTAMP_RE = /\d{1,2}:\d{2}(?::\d{2})?/g;

    // Step 2: Strip each cue of timestamps, trim, filter empty
    var stripped = rawCues
      .map(function (cue) { return String(cue).replace(TIMESTAMP_RE, '').trim(); })
      .filter(Boolean);

    if (stripped.length === 0) {
      return '';
    }

    // Step 3: Join with space
    var text = stripped.join(' ');

    // Step 4: Remove filler words (whole-word, case-insensitive)
    // Word boundaries protect "likely" (contains "like"), "understand" (contains "uh"), etc.
    // The [,]? optionally consumes a trailing comma after a filler word.
    var FILLER_RE = /\b(um+|uh+|you know what i mean|you know|kind of|sort of|basically|literally|actually|like|right)\b[,]?\s*/gi;
    text = text.replace(FILLER_RE, ' ');

    // Step 5: Strip speaker labels — handles [John:] or John: (single-word capitalized label)
    var SPEAKER_RE = /\[?[A-Z][a-z]+:\]?\s*/g;
    text = text.replace(SPEAKER_RE, '');

    // Step 6: Capitalize the first letter after sentence-ending punctuation (. ! ?)
    // e.g., "hello. this" -> "hello. This"
    text = text.replace(/([.!?])\s+([a-z])/g, function (_, punct, char) {
      return punct + ' ' + char.toUpperCase();
    });

    // Step 7: Capitalize the very first character of the result
    text = text.charAt(0).toUpperCase() + text.slice(1);

    // Step 8: Collapse multiple whitespace characters to a single space
    text = text.replace(/\s{2,}/g, ' ');

    // Step 9: Trim leading/trailing whitespace
    text = text.trim();

    return text;
  }

  function countWords(text) {
    if (!text || typeof text !== 'string') {
      return { wordCount: 0, isLowWordCount: true };
    }
    var words = text.split(/\s+/).filter(Boolean);
    var wordCount = words.length;
    return {
      wordCount: wordCount,
      isLowWordCount: wordCount < 300
    };
  }

  function toFilename(lectureTitle) {
    if (!lectureTitle || typeof lectureTitle !== 'string') {
      return 'Unknown-Lecture.json';
    }

    var sanitized = lectureTitle
      .replace(/[^a-zA-Z0-9\s-]/g, '')  // keep alphanumeric, spaces, hyphens
      .trim()
      .replace(/\s+/g, '-');             // spaces -> hyphens

    if (!sanitized || sanitized === '') {
      return 'Unknown-Lecture.json';
    }

    return sanitized + '.json';
  }

  // ============================================================
  // B) TOAST FUNCTION
  // ============================================================

  function showToast(message, type) {
    // Remove existing toast if present
    var existing = document.getElementById('pmi-extractor-toast');
    if (existing) {
      existing.remove();
    }

    var bgColor = type === 'success' ? '#22c55e'
                : type === 'warning' ? '#f59e0b'
                : '#ef4444'; // error

    var toast = document.createElement('div');
    toast.id = 'pmi-extractor-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position: fixed',
      'top: 20px',
      'right: 20px',
      'z-index: 999999',
      'background: ' + bgColor,
      'color: #ffffff',
      'padding: 12px 20px',
      'border-radius: 6px',
      'font-size: 14px',
      'font-family: sans-serif',
      'box-shadow: 0 4px 12px rgba(0,0,0,0.3)',
      'max-width: 320px',
      'word-wrap: break-word'
    ].join('; ');

    document.body.appendChild(toast);

    setTimeout(function () {
      var el = document.getElementById('pmi-extractor-toast');
      if (el) { el.remove(); }
    }, 4000);
  }

  // ============================================================
  // C) DOWNLOAD FUNCTION
  // ============================================================

  function downloadJSON(data, filename) {
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // D) MAIN FLOW
  // ============================================================

  try {

    // Step 1 — Toggle transcript panel
    // Use verified selector from SELECTORS.md
    var toggleBtn = document.querySelector('[data-purpose="transcript-toggle"]');
    if (!toggleBtn) {
      showToast('No transcript found - open a lecture first', 'error');
      return;
    }

    var isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (!isExpanded) {
      toggleBtn.click();
    }

    // Poll for transcript panel presence: 10 iterations, 100ms interval
    var panel = await new Promise(function (resolve, reject) {
      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        var el = document.querySelector('[data-purpose="transcript-panel"]')
               || document.getElementById('ct-sidebar-scroll-container');
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (attempts >= 10) {
          clearInterval(interval);
          reject(new Error('Transcript panel did not appear'));
        }
      }, 100);
    });

    // Step 2 — Find transcript container (panel resolved above)
    if (!panel) {
      showToast('No transcript found - open a lecture first', 'error');
      return;
    }

    // Step 3 — Extract raw cue texts using verified cue selector
    var cueElements = panel.querySelectorAll('[data-purpose="transcript-cue"]');

    // If no cues found in panel, try document-level (panel may be the sidebar container)
    if (!cueElements || cueElements.length === 0) {
      cueElements = document.querySelectorAll('[data-purpose="transcript-cue"]');
    }

    if (!cueElements || cueElements.length === 0) {
      showToast('No transcript found - open a lecture first', 'error');
      return;
    }

    var rawCues = Array.from(cueElements).map(function (el) {
      // Prefer cue-text span (verified child selector from SELECTORS.md)
      var span = el.querySelector('[data-purpose="cue-text"]');
      return span ? span.textContent.trim() : el.textContent.trim();
    }).filter(Boolean);

    if (rawCues.length === 0) {
      showToast('No transcript found - open a lecture first', 'error');
      return;
    }

    // Step 4 — Extract metadata
    // lectureTitle: document.title format is "Lecture Name | Course Name | Udemy" (verified)
    var lectureTitle = document.title.split(' | ')[0].trim()
                    || document.title.split('|')[0].trim()
                    || 'Unknown Lecture';
    if (!lectureTitle) { lectureTitle = 'Unknown Lecture'; }

    // sectionName: verified selector from SELECTORS.md
    var sectionEl = document.querySelector('[data-purpose="section-heading"]');
    var sectionName = sectionEl ? sectionEl.textContent.trim() : 'Unknown Section';
    if (!sectionName) { sectionName = 'Unknown Section'; }

    // Step 5 — Detect caption type using verified captions dropdown selector
    var captionsMenu = document.querySelector('[data-purpose="captions-dropdown-menu"]');
    var captionType = 'unknown';
    if (captionsMenu) {
      if (captionsMenu.textContent.includes('[CC]')) {
        captionType = 'manual';
      } else if (captionsMenu.textContent.includes('[Auto]') || captionsMenu.textContent.includes('auto-generated')) {
        captionType = 'auto-generated';
      }
    } else {
      // Fallback: look for 'auto-generated' text anywhere near the transcript area
      var transcriptArea = document.querySelector('[data-purpose="transcript-panel"]');
      if (transcriptArea && transcriptArea.textContent.toLowerCase().includes('auto-generated')) {
        captionType = 'auto-generated';
      }
    }

    // Step 6 — Detect language
    var langEl = document.querySelector('[lang]');
    var language = (langEl ? langEl.getAttribute('lang') : null)
                || document.documentElement.lang
                || 'en';
    if (!language) { language = 'en'; }

    // Step 7 — Clean transcript
    var transcript = cleanTranscript(rawCues);

    // Step 8 — Validate word count
    var countResult = countWords(transcript);
    var wordCount = countResult.wordCount;
    var isLowWordCount = countResult.isLowWordCount;

    // Step 9 — Duplicate check
    var storageKey = 'pmi-extracted-' + lectureTitle;
    if (localStorage.getItem(storageKey)) {
      showToast('Already extracted: ' + lectureTitle + ' - downloading again', 'warning');
    }

    // Step 10 — Build payload
    var payload = {
      lectureTitle: lectureTitle,
      sectionName: sectionName,
      transcript: transcript,
      wordCount: wordCount,
      extractedAt: new Date().toISOString(),
      captionType: captionType,
      language: language
    };

    // Step 11 — Download
    downloadJSON(payload, toFilename(lectureTitle));
    localStorage.setItem(storageKey, new Date().toISOString());

    // Step 12 — Toast feedback
    if (isLowWordCount) {
      showToast('Low word count (' + wordCount + ' words) - verify transcript', 'warning');
    } else {
      showToast('Extracted: ' + lectureTitle + ' (' + wordCount + ' words)', 'success');
    }

  } catch (err) {
    showToast('Extraction failed: ' + err.message, 'error');
    console.error('PMI Extractor error:', err);
  }

})();
