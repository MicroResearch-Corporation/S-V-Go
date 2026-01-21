'use strict';

const CONFIG = {
  DB_URL: 'https://raw.githubusercontent.com/MicroResearch-Corporation/S-V-Go/refs/heads/database/db.json',
  SVG_PATH: 'src/svg/'
};

let state = {
  allIcons: [],
  filteredIcons: [],
  selectedIcon: null
};

// Caching
const svgCache = new Map();

// Elements
const grid = document.getElementById('iconGrid');
const searchInput = document.getElementById('searchInput');
const countIndicator = document.getElementById('countIndicator');
const headerCount = document.getElementById('headerCount');

async function init() {
  try {
    const res = await fetch(CONFIG.DB_URL);
    const data = await res.json();
    state.allIcons = data.images;
    state.filteredIcons = state.allIcons;
    headerCount.textContent = `${data.total.toLocaleString()} icons available`;
    
    setupListeners();
    renderGrid();
    checkURLParams();
  } catch (err) {
    console.error("Failed to load icon database", err);
  }
}

function setupListeners() {
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    state.filteredIcons = state.allIcons.filter(i => 
      i.name.toLowerCase().includes(term) || i.id.includes(term)
    );
    updateURL(term);
    renderGrid();
  });

  document.getElementById('themeToggle').addEventListener('change', e => {
    document.documentElement.classList.toggle('dark', e.target.checked);
  });
}

function renderGrid() {
  grid.innerHTML = '';
  countIndicator.textContent = `${state.filteredIcons.length} icons found`;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        loadSvgIntoCard(card);
        observer.unobserve(card);
      }
    });
  }, { rootMargin: '200px' });

  state.filteredIcons.forEach(icon => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.name = icon.name;
    card.innerHTML = `<div class="icon-placeholder"></div><div class="label">${icon.name}</div>`;
    card.onclick = () => openModal(icon);
    grid.appendChild(card);
    observer.observe(card);
  });
}

async function loadSvgIntoCard(card) {
  const name = card.dataset.name;
  const svgText = await fetchSvg(name);
  const container = card.querySelector('.icon-placeholder');
  
  const size = document.getElementById('sizeInput').value;
  const color = document.getElementById('colorInput').value;
  const stroke = document.getElementById('strokeInput').value;

  container.innerHTML = prepareSvg(svgText, size, color, stroke);
}

async function fetchSvg(name) {
  if (svgCache.has(name)) return svgCache.get(name);
  try {
    const res = await fetch(`${CONFIG.SVG_PATH}${name}.svg`);
    const text = await res.text();
    svgCache.set(name, text);
    return text;
  } catch {
    return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none"/></svg>`;
  }
}

function prepareSvg(raw, size, color, stroke) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'currentColor');
  svg.style.color = color;
  
  svg.querySelectorAll('[stroke]').forEach(el => {
    el.setAttribute('stroke-width', stroke);
  });

  return svg.outerHTML;
}

// Modal Logic
window.openModal = async function(icon) {
  state.selectedIcon = icon;
  document.getElementById('modal').hidden = false;
  document.getElementById('modalName').textContent = `svgo-${icon.name}`;
  updateModalPreview();
};

window.closeModal = () => document.getElementById('modal').hidden = true;

async function updateModalPreview() {
  const raw = await fetchSvg(state.selectedIcon.name);
  const color = document.getElementById('colorInput').value;
  const stroke = document.getElementById('strokeInput').value;
  document.getElementById('previewCanvas').innerHTML = prepareSvg(raw, 128, color, stroke);
}

window.copySvg = () => {
  const svg = document.getElementById('previewCanvas').innerHTML;
  navigator.clipboard.writeText(svg);
  alert('SVG code copied!');
};

window.downloadSvg = () => {
  const svg = document.getElementById('previewCanvas').innerHTML;
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.selectedIcon.name}.svg`;
  a.click();
};

function updateURL(q) {
  const url = new URL(window.location);
  q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
  window.history.replaceState({}, '', url);
}

function checkURLParams() {
  const q = new URLSearchParams(window.location.search).get('q');
  if (q) {
    searchInput.value = q;
    searchInput.dispatchEvent(new Event('input'));
  }
}

init();