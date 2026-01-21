const DB_URL = 'https://raw.githubusercontent.com/MicroResearch-Corporation/S-V-Go/refs/heads/database/db.json';
const SVG_PATH = 'src/svg/';

let iconDatabase = [];
let activeIcon = { name: '', raw: '' };
const cache = new Map();

// Elements
const grid = document.getElementById('icon-grid');
const modal = document.getElementById('editor-modal');
const svgDisplay = document.getElementById('svg-display');
const codeArea = document.getElementById('svg-code');

// Initialize
async function init() {
    try {
        const res = await fetch(DB_URL);
        const data = await res.json();
        iconDatabase = data.images;
        document.getElementById('icon-count').textContent = `${data.total} icons`;
        document.getElementById('loader').style.display = 'none';
        renderIcons(iconDatabase);
    } catch (e) { console.error("Database failed to load"); }
}

// Render with IntersectionObserver
function renderIcons(icons) {
    grid.innerHTML = icons.map(icon => `
        <div class="icon-card" data-name="${icon.name}">
            <div class="svg-shell" data-src="${icon.name}"></div>
            <p>${icon.name}</p>
        </div>
    `).join('');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadSvgIntoCard(entry.target);
                observer.unobserve(entry.target);
            }
        });
    });
    document.querySelectorAll('.svg-shell').forEach(el => observer.observe(el));
    document.querySelectorAll('.icon-card').forEach(card => {
        card.onclick = () => openEditor(card.dataset.name);
    });
}

async function loadSvgIntoCard(el) {
    const name = el.dataset.src;
    const svg = await fetchSvg(name);
    el.innerHTML = svg;
}

async function fetchSvg(name) {
    if (cache.has(name)) return cache.get(name);
    const res = await fetch(`${SVG_PATH}${name}.svg`);
    const text = await res.text();
    cache.set(name, text);
    return text;
}

// EDITOR LOGIC (EXTRACTED & ENHANCED)
async function openEditor(name) {
    activeIcon.name = name;
    activeIcon.raw = await fetchSvg(name);
    document.getElementById('selected-name').textContent = name;
    
    // Reset inputs
    document.getElementById('input-stroke-w').value = 0;
    document.getElementById('check-currentcolor').checked = false;
    
    updateEditor();
    modal.classList.add('active');
}

function updateEditor() {
    const size = document.getElementById('input-size').value;
    const fill = document.getElementById('input-fill').value;
    const stroke = document.getElementById('input-stroke').value;
    const strokeW = document.getElementById('input-stroke-w').value;
    const useCurrentColor = document.getElementById('check-currentcolor').checked;

    // Update labels
    document.getElementById('val-size').textContent = size;
    document.getElementById('val-stroke').textContent = strokeW;

    // Logic: Parse the string into a real DOM tree to manipulate
    const parser = new DOMParser();
    const doc = parser.parseFromString(activeIcon.raw, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    // Apply global attributes
    svgEl.setAttribute('width', size);
    svgEl.setAttribute('height', size);

    // Apply to all internal paths/shapes
    const shapes = svgEl.querySelectorAll('path, circle, rect, polygon, polyline, ellipse');
    shapes.forEach(shape => {
        // Handle Fill
        if (useCurrentColor) {
            shape.setAttribute('fill', 'currentColor');
        } else if (shape.getAttribute('fill') !== 'none') {
            shape.setAttribute('fill', fill);
        }

        // Handle Stroke
        if (parseFloat(strokeW) > 0) {
            shape.setAttribute('stroke', stroke);
            shape.setAttribute('stroke-width', strokeW);
        } else {
            shape.removeAttribute('stroke');
            shape.removeAttribute('stroke-width');
        }
    });

    // Serialize back to string
    const finalCode = new XMLSerializer().serializeToString(svgEl);
    
    // Update Preview and Codebox
    svgDisplay.innerHTML = finalCode;
    codeArea.value = finalCode;
}

// Listeners
document.querySelectorAll('input').forEach(input => {
    input.oninput = updateEditor;
});

document.getElementById('btn-copy').onclick = () => {
    codeArea.select();
    document.execCommand('copy');
    const toast = document.getElementById('copy-toast');
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
};

document.getElementById('btn-download').onclick = () => {
    const blob = new Blob([codeArea.value], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeIcon.name}-svgo.svg`;
    a.click();
};

document.getElementById('search-input').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = iconDatabase.filter(i => i.name.includes(term));
    renderIcons(filtered);
};

document.querySelector('.close-modal').onclick = () => modal.classList.remove('active');
document.getElementById('theme-toggle').onclick = () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
};

init();