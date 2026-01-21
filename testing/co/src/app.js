/* S‑V‑Go Gallery App
   Pure JS, GitHub Pages compatible, no frameworks/build tools/CDNs.
   Features: metadata fetch, virtualized grid, lazy SVG loading, search, modal customization,
   copy/download, caching, URL-based search, accessibility.
*/

(() => {
  const DB_URL = 'https://raw.githubusercontent.com/MicroResearch-Corporation/S-V-Go/refs/heads/database/db.json';
  const SVG_BASE = 'src/svg/'; // relative path within this repo (GitHub Pages will serve it)

  // Caches
  const metaCache = { total: 0, images: [] };
  const svgCache = new Map(); // name -> svgText
  const sessionKey = 'svgo-svg-cache-v1';

  // Restore session cache
  try {
    const saved = sessionStorage.getItem(sessionKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      for (const [k, v] of Object.entries(parsed)) svgCache.set(k, v);
    }
  } catch {}

  // DOM
  const grid = document.getElementById('grid');
  const sentinel = document.getElementById('sentinel');
  const countEl = document.getElementById('count');
  const themeToggle = document.getElementById('themeToggle');

  const searchForm = document.getElementById('searchForm');
  const qInput = document.getElementById('q');
  const clearSearchBtn = document.getElementById('clearSearch');

  const colorInput = document.getElementById('color');
  const sizeInput = document.getElementById('size');
  const strokeInput = document.getElementById('stroke');

  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const preview = document.getElementById('preview');
  const mColor = document.getElementById('mColor');
  const mSize = document.getElementById('mSize');
  const mStroke = document.getElementById('mStroke');
  const mName = document.getElementById('mName');
  const mClass = document.getElementById('mClass');
  const mId = document.getElementById('mId');
  const copyClassBtn = document.getElementById('copyClass');
  const copySvgBtn = document.getElementById('copySvg');
  const copyUsageBtn = document.getElementById('copyUsage');
  const codeSvg = document.getElementById('codeSvg');
  const codeUsage = document.getElementById('codeUsage');
  const downloadSvgBtn = document.getElementById('downloadSvg');

  // State
  let filtered = []; // filtered meta
  let page = 0;
  const PAGE_SIZE = 100; // render 100 cards per batch
  const observer = new IntersectionObserver(onIntersect, { rootMargin: '1000px' }); // generous prefetch
  const cardObserver = new IntersectionObserver(onCardVisible, { rootMargin: '200px' });

  // Fallback SVG (simple square with X)
  const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;

  // Init
  (async function init() {
    bindEvents();
    applyThemeFromStorage();
    await loadMeta();
    hydrateSearchFromURL();
    filterAndRender();
    observer.observe(sentinel);
  })();

  function bindEvents() {
    // Theme toggle (CSS only via data-theme)
    themeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const isDark = root.getAttribute('data-theme') === 'dark';
      root.setAttribute('data-theme', isDark ? 'light' : 'dark');
      themeToggle.textContent = isDark ? 'Dark' : 'Light';
      themeToggle.setAttribute('aria-pressed', (!isDark).toString());
      localStorage.setItem('svgo-theme', isDark ? 'light' : 'dark');
    });

    // Search
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      updateURLQuery(qInput.value.trim());
      filterAndRender(true);
    });
    clearSearchBtn.addEventListener('click', () => {
      qInput.value = '';
      updateURLQuery('');
      filterAndRender(true);
    });

    // Global filters affect preview defaults
    [colorInput, sizeInput, strokeInput].forEach((el) => {
      el.addEventListener('input', () => {
        // No immediate grid re-render; customization is per-icon in modal
      });
    });

    // Modal controls
    modalClose.addEventListener('click', () => modal.close());
    modalCancel.addEventListener('click', () => modal.close());
    mColor.addEventListener('input', updatePreview);
    mSize.addEventListener('input', updatePreview);
    mStroke.addEventListener('input', updatePreview);

    copyClassBtn.addEventListener('click', () => {
      const text = mClass.textContent.trim();
      copyText(text);
    });
    copySvgBtn.addEventListener('click', () => {
      copyText(codeSvg.textContent);
    });
    copyUsageBtn.addEventListener('click', () => {
      copyText(codeUsage.textContent);
    });
    downloadSvgBtn.addEventListener('click', downloadCustomizedSvg);

    // Keyboard accessibility: close modal with Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.open) modal.close();
    });
  }

  function applyThemeFromStorage() {
    const saved = localStorage.getItem('svgo-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      themeToggle.textContent = saved === 'dark' ? 'Light' : 'Dark';
      themeToggle.setAttribute('aria-pressed', (saved === 'dark').toString());
    }
  }

  async function loadMeta() {
    const res = await fetch(DB_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch metadata');
    const data = await res.json();
    metaCache.total = data.total || data.images.length;
    metaCache.images = data.images || [];
    countEl.textContent = `${metaCache.total} icons`;
  }

  function hydrateSearchFromURL() {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    qInput.value = q;
  }

  function updateURLQuery(q) {
    const params = new URLSearchParams(location.search);
    if (q) params.set('q', q);
    else params.delete('q');
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  }

  function filterAndRender(reset = false) {
    const q = qInput.value.trim().toLowerCase();
    if (!q) {
      filtered = metaCache.images;
    } else {
      filtered = metaCache.images.filter((img) => {
        return (
          (img.name && img.name.toLowerCase().includes(q)) ||
          (img.class && img.class.toLowerCase().includes(q)) ||
          (img.id && img.id.toLowerCase().includes(q))
        );
      });
    }
    countEl.textContent = `${filtered.length} icons`;
    if (reset) {
      page = 0;
      grid.innerHTML = '';
    }
    renderNextPage();
  }

  function renderNextPage() {
    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, filtered.length);
    const slice = filtered.slice(start, end);

    const frag = document.createDocumentFragment();
    for (const img of slice) {
      const card = document.createElement('button');
      card.className = 'card';
      card.type = 'button';
      card.setAttribute('aria-label', `Preview ${img.name}`);
      card.dataset.name = img.name;
      card.dataset.class = img.class;
      card.dataset.id = img.id;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'icon-wrap';
      iconWrap.innerHTML = `<div class="skeleton" aria-hidden="true"></div>`;
      card.appendChild(iconWrap);

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = img.name;
      card.appendChild(nameEl);

      card.addEventListener('click', () => openModal(img.name, img.class, img.id));
      cardObserver.observe(card);
      frag.appendChild(card);
    }
    grid.appendChild(frag);
    page++;
  }

  function onIntersect(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        renderNextPage();
      }
    }
  }

  async function onCardVisible(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      const name = card.dataset.name;
      const iconWrap = card.querySelector('.icon-wrap');
      const svg = await getSvg(name);
      const normalized = normalizeSvg(svg);
      iconWrap.innerHTML = normalized;
      cardObserver.unobserve(card);
    }
  }

  async function getSvg(name) {
    if (svgCache.has(name)) return svgCache.get(name);
    try {
      const url = `${SVG_BASE}${encodeURIComponent(name)}.svg`;
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error('SVG not found');
      const text = await res.text();
      svgCache.set(name, text);
      persistSessionCache();
      return text;
    } catch {
      return FALLBACK_SVG;
    }
  }

  function persistSessionCache() {
    try {
      const obj = Object.fromEntries(svgCache.entries());
      sessionStorage.setItem(sessionKey, JSON.stringify(obj));
    } catch {}
  }

  // Normalize SVG: ensure viewBox, remove width/height, set fill to currentColor, preserve strokes
  function normalizeSvg(svgText) {
    // Basic sanitation: ensure xmlns and viewBox exist; strip width/height to allow CSS sizing
    let text = svgText.trim();

    // If missing xmlns, add it
    if (!/xmlns=/.test(text)) {
      text = text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Remove inline width/height to allow CSS control
    text = text.replace(/\s(width|height)="[^"]*"/g, '');
    // Ensure fill defaults to currentColor on root if not specified
    if (!/fill=/.test(text)) {
      text = text.replace('<svg', '<svg fill="currentColor"');
    }
    // Prefer viewBox; if missing, attempt to add a default
    if (!/viewBox=/.test(text)) {
      text = text.replace('<svg', '<svg viewBox="0 0 24 24"');
    }
    return text;
  }

  async function openModal(name, cls, id) {
    const svgText = await getSvg(name);
    const normalized = normalizeSvg(svgText);

    mName.textContent = name;
    mClass.textContent = `svgo-${name}`;
    mId.textContent = id;

    // Set defaults from global filters
    mColor.value = colorInput.value;
    mSize.value = Math.max(12, Number(sizeInput.value) || 24);
    mStroke.value = Math.max(0, Number(strokeInput.value) || 0);

    // Render preview
    preview.innerHTML = normalized;
    updatePreview();

    // Code blocks
    const customized = buildCustomizedSvg(normalized, {
      color: mColor.value,
      size: Number(mSize.value),
      stroke: Number(mStroke.value),
    });
    codeSvg.textContent = customized;

    const usage = `<svg class="svgo svgo-${name}" style="width:24px;height:24px;"></svg>`;
    codeUsage.textContent = usage;

    modal.showModal();
    // Focus the modal for keyboard users
    modal.querySelector('.modal-title').focus();
  }

  function updatePreview() {
    const svg = preview.querySelector('svg');
    if (!svg) return;
    const color = mColor.value;
    const size = Number(mSize.value);
    const stroke = Number(mStroke.value);

    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
    svg.setAttribute('fill', color);
    // Update stroke width on all stroke elements
    svg.querySelectorAll('[stroke]').forEach((el) => {
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-width', String(stroke));
    });

    // Update code block to reflect current customization
    const normalized = preview.innerHTML;
    const customized = buildCustomizedSvg(normalized, { color, size, stroke });
    codeSvg.textContent = customized;
  }

  function buildCustomizedSvg(svgText, { color, size, stroke }) {
    // Inject width/height, fill, and stroke width
    let out = svgText;

    // Ensure root has width/height
    out = out.replace('<svg', `<svg width="${size}" height="${size}"`);
    // Set fill on root
    if (/fill="/.test(out)) {
      out = out.replace(/fill="[^"]*"/, `fill="${color}"`);
    } else {
      out = out.replace('<svg', `<svg fill="${color}"`);
    }
    // Update stroke width on any element with stroke
    out = out.replace(/stroke-width="[^"]*"/g, `stroke-width="${stroke}"`);
    // If no stroke-width present but stroke exists, add to root paths
    if (/stroke="/.test(out) && !/stroke-width="/.test(out)) {
      out = out.replace(/<path/g, `<path stroke-width="${stroke}"`);
      out = out.replace(/<circle/g, `<circle stroke-width="${stroke}"`);
      out = out.replace(/<rect/g, `<rect stroke-width="${stroke}"`);
      out = out.replace(/<line/g, `<line stroke-width="${stroke}"`);
      out = out.replace(/<polyline/g, `<polyline stroke-width="${stroke}"`);
      out = out.replace(/<polygon/g, `<polygon stroke-width="${stroke}"`);
    }
    return out;
  }

  async function downloadCustomizedSvg() {
    const svgCode = codeSvg.textContent;
    const name = mName.textContent || 'icon';
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied!');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('Copied!');
    }
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.setAttribute('role', 'status');
    el.style.position = 'fixed';
    el.style.bottom = '1rem';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'var(--accent)';
    el.style.color = 'var(--accent-contrast)';
    el.style.padding = '0.5rem 0.75rem';
    el.style.borderRadius = '0.375rem';
    el.style.zIndex = '1000';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
})();
