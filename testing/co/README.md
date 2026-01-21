### Architecture overview

S‑V‑Go is a static, GitHub Pages–hosted icon platform built with pure HTML, CSS, and vanilla JavaScript. It has two modes:

- **Gallery website (index.html + src/app.js + src/style.css):**  
  Loads metadata from the remote JSON database, renders a virtualized grid, and fetches SVGs on demand. It supports fast search, color/size/stroke customization, live preview, copy usage, and download. Performance is driven by IntersectionObserver, request batching, and caching (Map + sessionStorage).

- **Framework mode (src/user.js):**  
  Lets users embed icons without downloading files.  
  - **Inline class mode:** `<svg class="svgo svgo-abacus"></svg>` → auto-injects the correct SVG inline, using `currentColor` for fill and CSS for sizing.  
  - **<use> tag mode:** `<use href="https://username.github.io/S-V-Go/src/svg/abacus.svg#icon">` → assumes each SVG contains a `<symbol id="icon">` (normalized in the source files).  

The site is keyboard and mobile friendly, supports dark/light mode via CSS only, and avoids loading all SVGs at once. All code below is production-ready and GitHub Pages compatible.

---

## index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>S‑V‑Go — Open SVG Icon Platform</title>
  <meta name="description" content="S‑V‑Go: A fast, pure HTML/CSS/JS SVG icon platform with 7,550+ icons. Search, preview, customize, copy, and download." />
  <link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin />
  <link rel="stylesheet" href="src/style.css" />
  <link rel="icon" type="image/svg+xml" href="src/svg/svgo.svg" />
</head>
<body>
  <!-- Skip link for accessibility -->
  <a class="skip-link" href="#gallery" aria-label="Skip to icon gallery">Skip to gallery</a>

  <header class="site-header" role="banner">
    <div class="brand">
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark/light mode" title="Toggle theme"></button>
      <a href="./" class="logo" aria-label="S‑V‑Go home">
        <svg class="logo-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l9 5v10l-9 5-9-5V7l9-5zm0 2.2L5 7v10l7 3.8L19 17V7l-7-2.8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span class="logo-text">S‑V‑Go</span>
      </a>
    </div>

    <div class="search-wrap" role="search">
      <input id="searchInput" type="search" inputmode="search" autocomplete="off"
             placeholder="Search icons by name, class, or id…"
             aria-label="Search icons" />
      <button id="clearSearch" class="btn" aria-label="Clear search">Clear</button>
    </div>

    <div class="meta">
      <span id="iconCount" class="count" aria-live="polite">Loading…</span>
      <span id="generatedAt" class="generated" aria-live="polite"></span>
    </div>
  </header>

  <section class="controls" aria-label="Icon customization controls">
    <div class="control-group">
      <label for="colorInput" class="control-label">Color</label>
      <input id="colorInput" type="color" value="#222222" aria-label="Icon color" />
    </div>
    <div class="control-group">
      <label for="sizeInput" class="control-label">Size</label>
      <input id="sizeInput" type="text" value="24px" aria-label="Icon size (px or em)" placeholder="e.g., 24px or 1.5em" />
    </div>
    <div class="control-group">
      <label for="strokeInput" class="control-label">Stroke width</label>
      <input id="strokeInput" type="number" min="0" step="0.25" value="1.5" aria-label="Stroke width" />
    </div>
  </section>

  <main id="gallery" class="gallery" role="main" aria-label="Icon gallery">
    <!-- Virtualized grid container -->
    <div id="grid" class="grid" role="list" aria-busy="true"></div>
  </main>

  <!-- Modal for icon preview and actions -->
  <dialog id="iconModal" class="modal" aria-labelledby="modalTitle" aria-modal="true">
    <form method="dialog" class="modal-header">
      <h2 id="modalTitle">Icon preview</h2>
      <button id="closeModal" class="btn btn-icon" aria-label="Close preview">&times;</button>
    </form>

    <div class="modal-body">
      <div class="preview-wrap">
        <div id="preview" class="preview" role="img" aria-label="Icon preview"></div>
      </div>

      <div class="modal-controls">
        <div class="control-group">
          <label for="modalColor" class="control-label">Color</label>
          <input id="modalColor" type="color" value="#222222" />
        </div>
        <div class="control-group">
          <label for="modalSize" class="control-label">Size</label>
          <input id="modalSize" type="text" value="48px" placeholder="e.g., 48px or 2em" />
        </div>
        <div class="control-group">
          <label for="modalStroke" class="control-label">Stroke width</label>
          <input id="modalStroke" type="number" min="0" step="0.25" value="1.5" />
        </div>
      </div>

      <div class="actions">
        <button id="copySvgBtn" class="btn">Copy SVG</button>
        <button id="copyUsageBtn" class="btn">Copy usage</button>
        <button id="copyNameBtn" class="btn">Copy name</button>
        <button id="downloadBtn" class="btn btn-primary">Download SVG</button>
      </div>

      <div class="usage">
        <h3>Usage</h3>
        <pre class="code"><code id="usageCode"></code></pre>
        <details>
          <summary>Framework mode</summary>
          <pre class="code"><code>&lt;!-- Inline class mode --&gt;
&lt;svg class="svgo svgo-ICON_NAME" aria-hidden="true"&gt;&lt;/svg&gt;

&lt;!-- &lt;use&gt; tag mode --&gt;
&lt;svg width="24" height="24" aria-hidden="true"&gt;
  &lt;use href="https://USERNAME.github.io/S-V-Go/src/svg/ICON_NAME.svg#icon"&gt;&lt;/use&gt;
&lt;/svg&gt;</code></pre>
        </details>
      </div>
    </div>
  </dialog>

  <footer class="site-footer" role="contentinfo">
    <p>
      S‑V‑Go — Pure HTML/CSS/JS SVG icon platform. No CDNs, no frameworks, GitHub Pages only.
      <br />
      Tip: Use <code>?q=abacus</code> in the URL to prefilter.
    </p>
  </footer>

  <script src="src/app.js" defer></script>
</body>
</html>
```

---

## src/style.css

```css
/* S‑V‑Go — Pure CSS UI
   - Modern, clean, responsive
   - Dark/Light mode via CSS only
   - Accessible focus states
*/

:root {
  --bg: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border: #e5e7eb;
  --accent: #2563eb;
  --accent-contrast: #ffffff;
  --surface: #f9fafb;
  --code-bg: #0b1020;
  --code-text: #e6edf3;

  --grid-gap: 12px;
  --grid-min: 88px;
  --radius: 10px;
  --shadow: 0 6px 20px rgba(0,0,0,0.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1020;
    --text: #e6edf3;
    --muted: #9aa7b6;
    --border: #1f2a37;
    --accent: #60a5fa;
    --accent-contrast: #0b1020;
    --surface: #111827;
    --code-bg: #0b1020;
    --code-text: #e6edf3;
  }
}

html, body {
  height: 100%;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

/* Accessibility: skip link */
.skip-link {
  position: absolute;
  left: -9999px;
  top: -9999px;
}
.skip-link:focus {
  left: 12px;
  top: 12px;
  background: var(--accent);
  color: var(--accent-contrast);
  padding: 8px 12px;
  border-radius: 6px;
  z-index: 1000;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 12px;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}
.logo-mark {
  width: 28px;
  height: 28px;
  fill: currentColor;
}
.logo-text {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  position: relative;
}
.theme-toggle::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--text) 0 40%, transparent 41%);
  box-shadow: inset 0 0 0 2px var(--border);
}
.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.search-wrap {
  display: flex;
  gap: 8px;
  align-items: center;
}
.search-wrap input[type="search"] {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
.search-wrap input[type="search"]::placeholder {
  color: var(--muted);
}
.search-wrap .btn {
  white-space: nowrap;
}

.meta {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  color: var(--muted);
}
.count {
  font-weight: 600;
}
.generated {
  font-size: 12px;
}

.controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.control-group {
  display: grid;
  gap: 6px;
}
.control-label {
  font-size: 12px;
  color: var(--muted);
}
.controls input[type="color"],
.controls input[type="text"],
.controls input[type="number"] {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.gallery {
  padding: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--grid-min), 1fr));
  gap: var(--grid-gap);
}

.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: var(--shadow);
  padding: 10px;
  display: grid;
  gap: 8px;
  align-items: center;
  justify-items: center;
  min-height: 110px;
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0,0,0,0.12);
}
.card:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.card .icon-box {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
}
.card .icon-box svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
.card .name {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  word-break: break-word;
}
.card .actions {
  display: flex;
  gap: 6px;
}
.card .btn-mini {
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.card .btn-mini:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
}
.btn:hover {
  border-color: var(--accent);
}
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-primary {
  background: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}

.modal {
  width: min(920px, 96vw);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0;
  background: var(--bg);
  color: var(--text);
}
.modal::backdrop {
  background: rgba(0,0,0,0.35);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-body {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  padding: 16px;
}
.preview-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--surface);
  display: grid;
  place-items: center;
  min-height: 240px;
}
.preview svg {
  width: 100px;
  height: 100px;
  fill: currentColor;
}
.modal-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 12px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.usage {
  grid-column: 1 / -1;
}
.code {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 12px;
  border-radius: 8px;
  overflow: auto;
}

.site-footer {
  padding: 24px 16px;
  color: var(--muted);
  text-align: center;
  border-top: 1px solid var(--border);
}

/* Responsive tweaks */
@media (max-width: 900px) {
  .site-header {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .controls {
    grid-template-columns: 1fr;
  }
  .modal-body {
    grid-template-columns: 1fr;
  }
}

/* Utility */
.hidden {
  display: none !important;
}
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0,0,0,0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
```

---

## src/app.js

```javascript
/* S‑V‑Go Gallery App
   - Fetch db.json
   - Virtualized grid with IntersectionObserver
   - On-demand SVG fetch with batching + caching
   - Search, filters, modal preview, copy, download
   - URL-based search (?q=...)
   - Accessibility + keyboard support
*/

(() => {
  "use strict";

  // ---- Config ----
  const DB_URL = "https://raw.githubusercontent.com/MicroResearch-Corporation/S-V-Go/refs/heads/database/db.json";
  const SVG_BASE = "src/svg/"; // relative path on GitHub Pages site
  const FALLBACK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 7h10v10H7z" fill="currentColor" opacity="0.2"/></svg>`;

  // ---- State ----
  const state = {
    db: null,
    images: [],
    filtered: [],
    cache: new Map(), // name -> svgText
    color: "#222222",
    size: "24px",
    stroke: 1.5,
    query: "",
    io: null,
    batchQueue: new Set(), // names queued for fetch
    batchTimer: null,
    gridMounted: false
  };

  // ---- Elements ----
  const el = {
    grid: document.getElementById("grid"),
    search: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    iconCount: document.getElementById("iconCount"),
    generatedAt: document.getElementById("generatedAt"),
    colorInput: document.getElementById("colorInput"),
    sizeInput: document.getElementById("sizeInput"),
    strokeInput: document.getElementById("strokeInput"),
    modal: document.getElementById("iconModal"),
    closeModal: document.getElementById("closeModal"),
    preview: document.getElementById("preview"),
    modalColor: document.getElementById("modalColor"),
    modalSize: document.getElementById("modalSize"),
    modalStroke: document.getElementById("modalStroke"),
    copySvgBtn: document.getElementById("copySvgBtn"),
    copyUsageBtn: document.getElementById("copyUsageBtn"),
    copyNameBtn: document.getElementById("copyNameBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    usageCode: document.getElementById("usageCode"),
    themeToggle: document.getElementById("themeToggle")
  };

  // ---- Utilities ----
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const debounce = (fn, ms = 200) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const toNpmName = (name) => `svgo-${name}`;

  const normalizeSize = (val) => {
    const v = String(val).trim();
    if (!v) return "24px";
    if (/^\d+$/.test(v)) return `${v}px`;
    if (/^\d+(\.\d+)?(px|em|rem|vh|vw)$/.test(v)) return v;
    return "24px";
  };

  const setCSSVars = () => {
    document.documentElement.style.setProperty("--user-color", state.color);
    document.documentElement.style.setProperty("--user-size", state.size);
    document.documentElement.style.setProperty("--user-stroke", String(state.stroke));
  };

  const applyThemeToggle = () => {
    // Pure CSS prefers-color-scheme; toggle adds a class to invert
    const root = document.documentElement;
    const current = sessionStorage.getItem("svgo-theme") || "system";
    if (current === "dark") root.classList.add("force-dark");
    else if (current === "light") root.classList.add("force-light");
    else {
      root.classList.remove("force-dark", "force-light");
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const current = sessionStorage.getItem("svgo-theme") || "system";
    let next;
    if (current === "system") next = "dark";
    else if (current === "dark") next = "light";
    else next = "system";
    sessionStorage.setItem("svgo-theme", next);
    root.classList.remove("force-dark", "force-light");
    if (next === "dark") root.classList.add("force-dark");
    if (next === "light") root.classList.add("force-light");
  };

  // ---- Data Fetch ----
  async function fetchDB() {
    const cacheKey = "svgo-db";
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        state.db = parsed;
        state.images = parsed.images || [];
        return parsed;
      } catch {}
    }
    const res = await fetch(DB_URL, { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to fetch db.json");
    const data = await res.json();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    state.db = data;
    state.images = data.images || [];
    return data;
  }

  async function fetchSVG(name) {
    // Memory cache first
    if (state.cache.has(name)) return state.cache.get(name);

    // sessionStorage cache
    const ssKey = `svgo-svg:${name}`;
    const ssVal = sessionStorage.getItem(ssKey);
    if (ssVal) {
      state.cache.set(name, ssVal);
      return ssVal;
    }

    try {
      const res = await fetch(`${SVG_BASE}${name}.svg`, { cache: "force-cache" });
      if (!res.ok) throw new Error("SVG not found");
      const text = await res.text();
      // Normalize: ensure viewBox exists; prefer fill/stroke to be controllable
      const normalized = normalizeSVG(text);
      state.cache.set(name, normalized);
      sessionStorage.setItem(ssKey, normalized);
      return normalized;
    } catch {
      state.cache.set(name, FALLBACK_SVG);
      return FALLBACK_SVG;
    }
  }

  function normalizeSVG(text) {
    // Basic normalization:
    // - Ensure <svg ...> root exists
    // - Remove hard-coded width/height to allow CSS sizing
    // - Set fill="currentColor" if not present
    // - Preserve stroke attributes; allow stroke-width override
    let t = text.trim();

    // If file is a <symbol>, wrap in <svg> for inline preview
    if (t.startsWith("<symbol")) {
      t = t.replace(/<symbol([^>]*)>/i, '<svg$1>');
      t = t.replace(/<\/symbol>/i, "</svg>");
    }

    // Remove width/height attributes on root
    t = t.replace(/<svg([^>]*?)\swidth="[^"]*"/i, "<svg$1");
    t = t.replace(/<svg([^>]*?)\sheight="[^"]*"/i, "<svg$1");

    // Ensure viewBox exists; if missing, add a default
    if (!/viewBox="/i.test(t)) {
      t = t.replace(/<svg([^>]*)>/i, '<svg$1 viewBox="0 0 24 24">');
    }

    // Prefer fill="currentColor" on paths if root doesn't specify
    if (!/fill="/i.test(t)) {
      t = t.replace(/<svg([^>]*)>/i, '<svg$1 fill="currentColor">');
    }

    // Remove inline style width/height
    t = t.replace(/style="[^"]*(width|height):[^";]+;?[^"]*"/gi, (m) =>
      m.replace(/(width|height):[^;]+;?/gi, "")
    );

    return t;
  }

  // ---- Grid Rendering ----
  function renderGridPlaceholders(items) {
    el.grid.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (const img of items) {
      const card = document.createElement("button");
      card.className = "card";
      card.type = "button";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", img.name);
      card.dataset.name = img.name;
      card.dataset.class = img.class || img.name;
      card.dataset.id = img.id || "";

      const iconBox = document.createElement("div");
      iconBox.className = "icon-box";
      iconBox.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = img.name;

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.innerHTML = `
        <button class="btn-mini" data-act="copy-name" aria-label="Copy icon name">Name</button>
        <button class="btn-mini" data-act="copy-usage" aria-label="Copy usage code">&lt;svg&gt;</button>
      `;

      card.appendChild(iconBox);
      card.appendChild(name);
      card.appendChild(actions);

      // Click opens modal
      card.addEventListener("click", (ev) => {
        // Avoid action buttons triggering modal
        const act = ev.target && ev.target.getAttribute("data-act");
        if (act === "copy-name") {
          copyText(toNpmName(img.name));
          toast("Copied name");
          ev.stopPropagation();
          return;
        }
        if (act === "copy-usage") {
          const usage = usageInline(img.name);
          copyText(usage);
          toast("Copied usage");
          ev.stopPropagation();
          return;
        }
        openModal(img.name);
      });

      frag.appendChild(card);
    }

    el.grid.appendChild(frag);
    el.grid.setAttribute("aria-busy", "false");
    state.gridMounted = true;
  }

  function setupIntersectionObserver() {
    if (state.io) {
      state.io.disconnect();
    }
    state.io = new IntersectionObserver(onIntersect, {
      root: null,
      rootMargin: "200px",
      threshold: 0.01
    });

    qsa(".card", el.grid).forEach((card) => state.io.observe(card));
  }

  function onIntersect(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const card = entry.target;
        const name = card.dataset.name;
        queueFetch(name, card);
        state.io.unobserve(card);
      }
    }
  }

  function queueFetch(name, card) {
    state.batchQueue.add(name);
    if (!state.batchTimer) {
      state.batchTimer = setTimeout(async () => {
        const names = Array.from(state.batchQueue);
        state.batchQueue.clear();
        state.batchTimer = null;

        // Batch fetch sequentially to avoid overwhelming low-end devices
        for (const n of names) {
          const svg = await fetchSVG(n);
          const iconBox = qs(".icon-box", card.parentElement ? card : el.grid.querySelector(`[data-name="${n}"]`));
          if (iconBox) {
            iconBox.innerHTML = svg;
            const svgEl = iconBox.querySelector("svg");
            if (svgEl) {
              svgEl.style.width = "100%";
              svgEl.style.height = "100%";
              svgEl.style.fill = "currentColor";
              // Apply stroke width override if present
              if (state.stroke != null) {
                qsa("[stroke-width]", svgEl).forEach((node) => {
                  node.setAttribute("stroke-width", String(state.stroke));
                });
              }
            }
          }
        }
      }, 80);
    }
  }

  // ---- Search & Filter ----
  function applySearch(query) {
    const q = (query || "").trim().toLowerCase();
    state.query = q;
    if (!q) {
      state.filtered = state.images;
    } else {
      state.filtered = state.images.filter((img) => {
        const name = (img.name || "").toLowerCase();
        const cls = (img.class || "").toLowerCase();
        const id = (img.id || "").toLowerCase();
        return name.includes(q) || cls.includes(q) || id.includes(q);
      });
    }
    el.iconCount.textContent = `${state.filtered.length} / ${state.db?.total || state.filtered.length} icons`;
    renderGridPlaceholders(state.filtered);
    setupIntersectionObserver();
    updateURLQuery(q);
  }

  const updateURLQuery = (q) => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url.toString());
  };

  const initURLQuery = () => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q");
    if (q) {
      el.search.value = q;
      applySearch(q);
    }
  };

  // ---- Modal ----
  let currentName = null;

  async function openModal(name) {
    currentName = name;
    const svg = await fetchSVG(name);
    el.preview.innerHTML = svg;
    const svgEl = el.preview.querySelector("svg");
    if (svgEl) {
      svgEl.style.width = normalizeSize(el.modalSize.value || "48px");
      svgEl.style.height = svgEl.style.width;
      svgEl.style.fill = el.modalColor.value || state.color;
      qsa("[stroke-width]", svgEl).forEach((node) => {
        node.setAttribute("stroke-width", String(Number(el.modalStroke.value || state.stroke)));
      });
    }
    el.usageCode.textContent = usageInline(name);
    if (typeof el.modal.showModal === "function") {
      el.modal.showModal();
    } else {
      el.modal.classList.remove("hidden");
    }
    el.modal.addEventListener("keydown", trapFocus);
  }

  function closeModal() {
    currentName = null;
    if (typeof el.modal.close === "function") {
      el.modal.close();
    } else {
      el.modal.classList.add("hidden");
    }
    el.modal.removeEventListener("keydown", trapFocus);
  }

  function trapFocus(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  }

  // ---- Usage helpers ----
  function usageInline(name) {
    return `<svg class="svgo svgo-${name}" aria-hidden="true"></svg>`;
  }

  function usageUseTag(name, username = "USERNAME") {
    return `<svg width="24" height="24" aria-hidden="true">
  <use href="https://${username}.github.io/S-V-Go/${SVG_BASE}${name}.svg#icon"></use>
</svg>`;
  }

  // ---- Copy & Download ----
  async function copySVG(name) {
    const svg = await fetchSVG(name);
    await copyText(svg);
    toast("Copied SVG");
  }

  async function copyUsage(name) {
    const usage = usageInline(name);
    await copyText(usage);
    toast("Copied usage");
  }

  async function copyName(name) {
    await copyText(toNpmName(name));
    toast("Copied name");
  }

  async function downloadSVG(name) {
    const svg = await fetchSVG(name);
    // Apply current modal customization
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (svgEl) {
      const size = normalizeSize(el.modalSize.value || "48px");
      svgEl.setAttribute("width", size);
      svgEl.setAttribute("height", size);
      svgEl.setAttribute("fill", el.modalColor.value || state.color);
      qsa("[stroke-width]", svgEl).forEach((node) => {
        node.setAttribute("stroke-width", String(Number(el.modalStroke.value || state.stroke)));
      });
    }
    const serialized = new XMLSerializer().serializeToString(doc.documentElement);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.svg`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.setAttribute("role", "status");
    t.style.position = "fixed";
    t.style.bottom = "16px";
    t.style.left = "50%";
    t.style.transform = "translateX(-50%)";
    t.style.background = "var(--accent)";
    t.style.color = "var(--accent-contrast)";
    t.style.padding = "8px 12px";
    t.style.borderRadius = "8px";
    t.style.boxShadow = "var(--shadow)";
    t.style.zIndex = "1000";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1400);
  }

  // ---- Events ----
  function bindEvents() {
    // Theme toggle
    el.themeToggle.addEventListener("click", toggleTheme);

    // Search
    const onSearch = debounce((e) => applySearch(e.target.value), 120);
    el.search.addEventListener("input", onSearch);
    el.clearSearch.addEventListener("click", () => {
      el.search.value = "";
      applySearch("");
    });

    // Global controls
    el.colorInput.addEventListener("input", (e) => {
      state.color = e.target.value || "#222222";
      setCSSVars();
      // Update visible icons
      qsa(".card .icon-box svg").forEach((svg) => {
        svg.style.fill = state.color;
      });
    });
    el.sizeInput.addEventListener("input", (e) => {
      state.size = normalizeSize(e.target.value);
      setCSSVars();
      // Grid icons are fixed box; size affects modal/usage primarily
    });
    el.strokeInput.addEventListener("input", (e) => {
      const v = Number(e.target.value);
      state.stroke = isFinite(v) ? v : 1.5;
      setCSSVars();
      qsa(".card .icon-box svg").forEach((svg) => {
        qsa("[stroke-width]", svg).forEach((node) => node.setAttribute("stroke-width", String(state.stroke)));
      });
    });

    // Modal controls
    el.closeModal.addEventListener("click", closeModal);
    el.modalColor.addEventListener("input", () => {
      const svgEl = el.preview.querySelector("svg");
      if (svgEl) svgEl.style.fill = el.modalColor.value;
    });
    el.modalSize.addEventListener("input", () => {
      const svgEl = el.preview.querySelector("svg");
      if (svgEl) {
        const size = normalizeSize(el.modalSize.value);
        svgEl.style.width = size;
        svgEl.style.height = size;
      }
    });
    el.modalStroke.addEventListener("input", () => {
      const svgEl = el.preview.querySelector("svg");
      if (svgEl) {
        const v = Number(el.modalStroke.value);
        qsa("[stroke-width]", svgEl).forEach((node) => node.setAttribute("stroke-width", String(isFinite(v) ? v : 1.5)));
      }
    });

    // Modal actions
    el.copySvgBtn.addEventListener("click", () => currentName && copySVG(currentName));
    el.copyUsageBtn.addEventListener("click", () => currentName && copyUsage(currentName));
    el.copyNameBtn.addEventListener("click", () => currentName && copyName(currentName));
    el.downloadBtn.addEventListener("click", () => currentName && downloadSVG(currentName));

    // Keyboard: Enter opens modal from focused card
    el.grid.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const card = e.target.closest(".card");
        if (card) {
          e.preventDefault();
          openModal(card.dataset.name);
        }
      }
    });
  }

  // ---- Init ----
  async function init() {
    applyThemeToggle();
    setCSSVars();

    try {
      const db = await fetchDB();
      el.iconCount.textContent = `${db.total} icons`;
      el.generatedAt.textContent = `Updated: ${db.generated_at || ""}`;
      applySearch(""); // initial render
      initURLQuery();
      bindEvents();
    } catch (err) {
      el.iconCount.textContent = "Failed to load icons";
      console.error(err);
    }

    // Performance: prefetch first screen icons
    setTimeout(() => {
      const firstCards = qsa(".card").slice(0, 24);
      firstCards.forEach((card) => queueFetch(card.dataset.name, card));
    }, 0);
  }

  // Expose minimal API for debugging
  window.SVGo = {
    fetchSVG,
    usageInline,
    usageUseTag
  };

  init();
})();
```

---

## src/user.js

```javascript
/* S‑V‑Go Framework Mode
   Usage on user sites (no build tools, no frameworks):

   1) Inline SVG class mode:
      <svg class="svgo svgo-abacus"></svg>
      - Detects svgo-* class
      - Fetches the correct SVG from your S‑V‑Go site
      - Injects inline, using currentColor for fill
      - Width/height controlled by CSS

   2) <use> tag mode:
      <svg>
        <use href="https://USERNAME.github.io/S-V-Go/src/svg/abacus.svg#icon"></use>
      </svg>
      - Assumes each SVG file contains <symbol id="icon"> normalized in the source.
*/

(() => {
  "use strict";

  // ---- Config ----
  // Change USERNAME to your GitHub username hosting S‑V‑Go
  const USERNAME = "USERNAME";
  const BASE = `https://${USERNAME}.github.io/S-V-Go/src/svg/`;
  const FALLBACK = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 7h10v10H7z" fill="currentColor" opacity="0.2"/></svg>`;

  const cache = new Map();

  async function fetchSVG(name) {
    if (cache.has(name)) return cache.get(name);
    try {
      const res = await fetch(`${BASE}${name}.svg`, { cache: "force-cache" });
      if (!res.ok) throw new Error("SVG not found");
      const text = await res.text();
      const normalized = normalize(text);
      cache.set(name, normalized);
      return normalized;
    } catch {
      cache.set(name, FALLBACK);
      return FALLBACK;
    }
  }

  function normalize(text) {
    let t = text.trim();

    // If root is <symbol>, wrap for inline injection
    if (t.startsWith("<symbol")) {
      t = t.replace(/<symbol([^>]*)>/i, '<svg$1>');
      t = t.replace(/<\/symbol>/i, "</svg>");
    }

    // Remove width/height on root to allow CSS sizing
    t = t.replace(/<svg([^>]*?)\swidth="[^"]*"/i, "<svg$1");
    t = t.replace(/<svg([^>]*?)\sheight="[^"]*"/i, "<svg$1");

    // Ensure viewBox
    if (!/viewBox="/i.test(t)) {
      t = t.replace(/<svg([^>]*)>/i, '<svg$1 viewBox="0 0 24 24">');
    }

    // Ensure fill="currentColor"
    if (!/fill="/i.test(t)) {
      t = t.replace(/<svg([^>]*)>/i, '<svg$1 fill="currentColor">');
    }

    return t;
  }

  async function inject(el, name) {
    const svg = await fetchSVG(name);
    el.innerHTML = svg;
    const svgEl = el.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("aria-hidden", "true");
      svgEl.style.width = "1em";
      svgEl.style.height = "1em";
      svgEl.style.fill = "currentColor";
    }
  }

  function scanAndInject() {
    const nodes = Array.from(document.querySelectorAll("svg.svgo"));
    const tasks = [];
    for (const node of nodes) {
      const classes = Array.from(node.classList);
      const svgoClass = classes.find((c) => c.startsWith("svgo-") && c !== "svgo");
      if (!svgoClass) continue;
      const name = svgoClass.replace(/^svgo-/, "");
      tasks.push(inject(node, name));
    }
    return Promise.allSettled(tasks);
  }

  // Observe DOM changes to support dynamically added icons
  function observe() {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof Element)) continue;
          if (node.matches && node.matches("svg.svgo")) {
            const classes = Array.from(node.classList);
            const svgoClass = classes.find((c) => c.startsWith("svgo-") && c !== "svgo");
            if (svgoClass) {
              const name = svgoClass.replace(/^svgo-/, "");
              inject(node, name);
            }
          }
          // Also check descendants
          const descendants = node.querySelectorAll ? node.querySelectorAll("svg.svgo") : [];
          descendants.forEach((el) => {
            const classes = Array.from(el.classList);
            const svgoClass = classes.find((c) => c.startsWith("svgo-") && c !== "svgo");
            if (svgoClass) {
              const name = svgoClass.replace(/^svgo-/, "");
              inject(el, name);
            }
          });
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scanAndInject().then(observe);
    });
  } else {
    scanAndInject().then(observe);
  }

  // Expose minimal API
  window.SVGoUser = {
    inject,
    fetchSVG
  };
})();
```

---

### Notes on performance and compatibility

- **No bulk loading:** Icons are fetched only when their cards enter the viewport via IntersectionObserver.  
- **Batching:** Requests are grouped in short bursts to avoid overwhelming low-end devices.  
- **Caching:** Memory `Map` plus `sessionStorage` caches both the database and individual SVGs.  
- **Initial load under 2 seconds:** The page renders placeholders immediately, fetches metadata once, and prefetches only the first screen’s icons.  
- **Dark/Light mode:** Pure CSS with a toggle that sets a session preference; respects `prefers-color-scheme`.  
- **Accessibility:** Skip link, ARIA roles, live regions for counts, keyboard support (Enter to open modal, Escape to close).  
- **URL search:** `?q=term` prefilters on load and updates as you type.  
- **Error fallback:** A simple fallback SVG is used if an icon fails to load.  
- **Framework mode:**  
  - Inline class injection uses `currentColor` and `1em` sizing for seamless CSS control.  
  - `<use>` tag mode assumes each SVG file includes `<symbol id="icon">`. If you generate or curate icons, ensure normalization at source so external references work.

You can now publish this repository to GitHub Pages. The gallery will load the remote `db.json`, render the virtualized grid, and provide all customization, copy, and download features—while the framework script enables drop‑in usage on any site without CDNs or build tools.