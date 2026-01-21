/**
 * S-V-Go Framework
 * Automatically injects SVGs based on class names or <use> tags.
 */
(function() {
  const BASE_URL = document.currentScript.src.replace('user.js', 'svg/');
  const cache = new Map();

  async function inject() {
    // 1. Handle Inline Class Mode: <svg class="svgo svgo-name"></svg>
    const icons = document.querySelectorAll('svg.svgo:not([data-svgo-ready])');
    
    for (const el of icons) {
      const nameMatch = Array.from(el.classList).find(c => c.startsWith('svgo-') && c !== 'svgo');
      if (!nameMatch) continue;
      
      const name = nameMatch.replace('svgo-', '');
      const svgText = await getSvg(name);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const incomingSvg = doc.querySelector('svg');
      
      // Preserve original classes and set viewBox
      el.setAttribute('viewBox', incomingSvg.getAttribute('viewBox') || '0 0 24 24');
      el.innerHTML = incomingSvg.innerHTML;
      el.setAttribute('data-svgo-ready', 'true');
      if (!el.getAttribute('fill')) el.setAttribute('fill', 'currentColor');
    }

    // 2. Handle <use> tag mode cross-origin polyfill
    const uses = document.querySelectorAll('use[href*=".svg#icon"]');
    for (const use of uses) {
      const href = use.getAttribute('href');
      const name = href.split('/').pop().replace('.svg#icon', '');
      const svgText = await getSvg(name);
      
      // Create a local symbol to bypass CORS restrictions for <use>
      let sprite = document.getElementById('svgo-sprite-cache');
      if (!sprite) {
        sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        sprite.id = 'svgo-sprite-cache';
        sprite.style.display = 'none';
        document.body.appendChild(sprite);
      }

      if (!sprite.querySelector(`#svgo-sym-${name}`)) {
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        symbol.id = `svgo-sym-${name}`;
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const inner = doc.querySelector('svg');
        symbol.setAttribute('viewBox', inner.getAttribute('viewBox'));
        symbol.innerHTML = inner.innerHTML;
        sprite.appendChild(symbol);
      }

      use.setAttribute('href', `#svgo-sym-${name}`);
    }
  }

  async function getSvg(name) {
    if (cache.has(name)) return cache.get(name);
    try {
      const res = await fetch(`${BASE_URL}${name}.svg`);
      const text = await res.text();
      cache.set(name, text);
      return text;
    } catch (e) {
      return '';
    }
  }

  // Observe DOM changes to handle AJAX-loaded content
  const observer = new MutationObserver(inject);
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Initial run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();