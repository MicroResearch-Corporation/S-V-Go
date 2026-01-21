/* S‑V‑Go Framework Mode
   Usage on any site (no build tools, no CDN):
   1) Inline class mode:
      <svg class="svgo svgo-abacus"></svg>
   2) Symbol shim mode (local):
      <svg><use href="#svgo-abacus"></use></svg>
   Notes:
   - Source SVGs are path-only (no <symbol>). This script creates a local sprite by converting
     fetched SVGs into <symbol id="svgo-..."> at runtime. No external <use href="...file.svg#icon"> needed.
   - Fill defaults to currentColor; size controlled via CSS (width/height).
*/

(function () {
  const SVG_BASE = (function () {
    // Auto-detect base path relative to where user.js is hosted.
    // If hosted at https://username.github.io/S-V-Go/, icons are at /S-V-Go/src/svg/
    // We derive repo root from current script src if available.
    const scripts = document.getElementsByTagName('script');
    const self = scripts[scripts.length - 1];
    try {
      const url = new URL(self.src, location.href);
      // Assume /S-V-Go/src/user.js → /S-V-Go/src/svg/
      const base = url.pathname.replace(/\/src\/user\.js$/, '/src/svg/');
      return base;
    } catch {
      return 'src/svg/';
    }
  })();

  const cache = new Map(); // name -> svgText
  const spriteId = 'svgo-sprite';
  let spriteEl = document.getElementById(spriteId);
  if (!spriteEl) {
    spriteEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spriteEl.setAttribute('id', spriteId);
    spriteEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    spriteEl.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;');
    spriteEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spriteEl);
  }

  // Observe DOM for <svg class="svgo svgo-*> and <use href="#svgo-*">
  const mo = new MutationObserver((muts) => {
    for (const mut of muts) {
      mut.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        scan(node);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Initial scan
  document.addEventListener('DOMContentLoaded', () => {
    scan(document.documentElement);
  });

  function scan(root) {
    // Inline class mode
    const inlineSvgs = root.querySelectorAll('svg.svgo');
    inlineSvgs.forEach(async (el) => {
      const name = getNameFromClasses(el.classList);
      if (!name) return;
      const svgText = await fetchSvg(name);
      const normalized = normalizeSvg(svgText);
      injectInline(el, normalized);
    });

    // Symbol shim mode: ensure requested symbols exist
    const uses = root.querySelectorAll('use[href^="#svgo-"], use[xlink\\:href^="#svgo-"]');
    uses.forEach(async (useEl) => {
      const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
      const name = href.replace(/^#svgo-/, '');
      if (!name) return;
      await ensureSymbol(name);
      // Nothing else needed; <use> will render once symbol exists
    });
  }

  function getNameFromClasses(classList) {
    for (const cls of classList) {
      if (cls.startsWith('svgo-') && cls !== 'svgo') {
        return cls.replace(/^svgo-/, '');
      }
    }
    return null;
  }

  async function fetchSvg(name) {
    if (cache.has(name)) return cache.get(name);
    const url = `${SVG_BASE}${encodeURIComponent(name)}.svg`;
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error('SVG not found');
      const text = await res.text();
      cache.set(name, text);
      return text;
    } catch {
      // Fallback
      const fb = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
      cache.set(name, fb);
      return fb;
    }
  }

  function normalizeSvg(svgText) {
    let text = svgText.trim();
    if (!/xmlns=/.test(text)) {
      text = text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Remove width/height to allow CSS control
    text = text.replace(/\s(width|height)="[^"]*"/g, '');
    // Ensure viewBox
    if (!/viewBox=/.test(text)) {
      text = text.replace('<svg', '<svg viewBox="0 0 24 24"');
    }
    // Default fill to currentColor
    if (!/fill=/.test(text)) {
      text = text.replace('<svg', '<svg fill="currentColor"');
    }
    return text;
  }

  function injectInline(el, svgText) {
    // Replace the <svg> element's contents with normalized SVG paths
    // We keep the outer <svg> to preserve user sizing via CSS
    const temp = document.createElement('div');
    temp.innerHTML = svgText;
    const innerSvg = temp.querySelector('svg');
    if (!innerSvg) return;

    // Copy attributes that matter: viewBox, fill
    const viewBox = innerSvg.getAttribute('viewBox') || '0 0 24 24';
    el.setAttribute('viewBox', viewBox);

    // Remove existing children
    while (el.firstChild) el.removeChild(el.firstChild);
    // Move all child nodes from innerSvg into el
    Array.from(innerSvg.childNodes).forEach((n) => el.appendChild(n));

    // Ensure fill defaults to currentColor unless user overrides via CSS
    if (!el.getAttribute('fill')) el.setAttribute('fill', 'currentColor');
    // Allow stroke to inherit currentColor
    el.querySelectorAll('[stroke]').forEach((node) => {
      if (!node.getAttribute('stroke')) node.setAttribute('stroke', 'currentColor');
    });
  }

  async function ensureSymbol(name) {
    // If symbol already exists, skip
    if (spriteEl.querySelector(`#svgo-${CSS.escape(name)}`)) return;

    const svgText = await fetchSvg(name);
    const normalized = normalizeSvg(svgText);

    // Convert to <symbol id="svgo-name"> by moving child nodes
    const temp = document.createElement('div');
    temp.innerHTML = normalized;
    const innerSvg = temp.querySelector('svg');
    const viewBox = innerSvg.getAttribute('viewBox') || '0 0 24 24';

    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbol.setAttribute('id', `svgo-${name}`);
    symbol.setAttribute('viewBox', viewBox);

    Array.from(innerSvg.childNodes).forEach((n) => {
      symbol.appendChild(n);
    });

    spriteEl.appendChild(symbol);
  }
})();
