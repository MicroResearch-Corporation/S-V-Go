(function() {
    const CDN_ROOT = 'https://MicroResearch-Corporation.github.io/S-V-Go/src/svg/';
    const localCache = new Map();

    async function hydrate() {
        const icons = document.querySelectorAll('svg.svgo:not([data-ready])');
        for (const el of icons) {
            const iconClass = Array.from(el.classList).find(c => c.startsWith('svgo-'));
            if (!iconClass) continue;

            const name = iconClass.split('svgo-')[1];
            el.setAttribute('data-ready', 'true');

            try {
                let raw;
                if (localCache.has(name)) {
                    raw = localCache.get(name);
                } else {
                    const r = await fetch(`${CDN_ROOT}${name}.svg`);
                    raw = await r.text();
                    // Strip the <svg> wrapper for injection
                    raw = raw.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
                    localCache.set(name, raw);
                }
                el.innerHTML = raw;
                if (!el.getAttribute('viewBox')) el.setAttribute('viewBox', '0 0 24 24');
            } catch (err) { console.error('S-V-Go failed:', name); }
        }
    }

    const observer = new MutationObserver(hydrate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('DOMContentLoaded', hydrate);
    hydrate();
})();