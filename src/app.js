
const API_URL =
    "https://raw.githubusercontent.com/MicroResearch-Corporation/S-V-Go/refs/heads/database/db.json";
const SVG_BASE_PATH = "./src/svg/";
const ICONS_PER_BATCH = 60;

const DEFAULT_VIEWER_CONFIG = {
    size: 100,
    stroke: 0,
    rotate: 0,
    fillColor: "#6750a4",
    strokeColor: "#6750a4",
    animate: false,
    iconName: "",
};

const state = {
    allIcons: [],
    filteredIcons: [],
    tags: new Map(),
    visibleCount: 0,
    searchQuery: "",
    activeTag: null,
    svgCache: new Map(),
    viewerConfig: { ...DEFAULT_VIEWER_CONFIG },
    currentView: "gallery",
};

const el = {
    views: {
        gallery: document.getElementById("viewGallery"),
        detail: document.getElementById("viewDetail"),
    },
    grid: document.getElementById("iconGrid"),
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    resultCount: document.getElementById("resultCount"),
    tagsContainer: document.getElementById("tagsContainer"),
    scrollSentinel: document.getElementById("scrollSentinel"),
    accentPicker: document.getElementById("accentPicker"),
    themeToggle: document.getElementById("themeToggle"),
    backBtn: document.getElementById("backBtn"),
    homeBtn: document.getElementById("homeBtn"),
    viewer: {
        canvas: document.getElementById("previewCanvas"),
        title: document.getElementById("viewerTitle"),
        id: document.getElementById("viewerId"),
        code: document.getElementById("svgCodeDisplay"),
        resetBtn: document.getElementById("resetBtn"),
        downloadBtn: document.getElementById("downloadBtn"),
        copyCodeBtn: document.getElementById("copyCodeBtn"),
        bgButtons: document.querySelectorAll(".bg-opt"),
        inputs: {
            size: document.getElementById("sizeInput"),
            stroke: document.getElementById("strokeInput"),
            rotate: document.getElementById("rotateInput"),
            fillColor: document.getElementById("fillColorInput"),
            strokeColor: document.getElementById("strokeColorInput"),
            fillCurrentBtn: document.getElementById("fillCurrentBtn"),
            strokeCurrentBtn: document.getElementById("strokeCurrentBtn"),
            anim: document.getElementById("animCheckbox"),
        },
        labels: {
            size: document.getElementById("sizeVal"),
            stroke: document.getElementById("strokeVal"),
            rotate: document.getElementById("rotateVal"),
            fillHex: document.getElementById("fillColorHex"),
            strokeHex: document.getElementById("strokeColorHex"),
        },
    },
};

async function init() {
    loadSettings();
    setupEventListeners();

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        state.allIcons = data.images || [];

        generateSmartTags();

        const params = new URLSearchParams(window.location.search);
        const iconParam = params.get("icon");
        const searchParam = params.get("search");

        if (searchParam) {
            state.searchQuery = searchParam;
            el.searchInput.value = searchParam;
        }

        applyFilters();

        if (iconParam) {
            const iconObj = state.allIcons.find((i) => i.name === iconParam) || {
                name: iconParam,
                id: "?",
            };
            openViewer(iconObj, false);
        }
    } catch (error) {
        console.error("Failed to load DB:", error);
        el.resultCount.textContent = "Error loading database.";
    }
}

function loadSettings() {
    const storedTheme = localStorage.getItem("svgo_theme");
    const storedColor = localStorage.getItem("svgo_accent");

    if (storedTheme === "dark") {
        document.body.dataset.theme = "dark";
    }

    if (storedColor) {
        document.documentElement.style.setProperty("--primary", storedColor);
        el.accentPicker.value = storedColor;
    }
}

function saveSettings(key, value) {
    localStorage.setItem(key, value);
}

function switchView(viewName) {
    state.currentView = viewName;
    if (viewName === "gallery") {
        el.views.gallery.classList.add("active");
        el.views.gallery.classList.remove("hidden");
        el.views.detail.classList.remove("active");
        el.views.detail.classList.add("hidden");
        el.searchInput.parentElement.style.visibility = "visible";
    } else {
        el.views.gallery.classList.remove("active");
        el.views.gallery.classList.add("hidden");
        el.views.detail.classList.add("active");
        el.views.detail.classList.remove("hidden");
        el.searchInput.parentElement.style.visibility = "hidden";
    }
}

function applyFilters() {
    let results = state.allIcons;

    if (state.activeTag)
        results = results.filter((icon) => icon.name.includes(state.activeTag));
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        results = results.filter((icon) => icon.name.toLowerCase().includes(q));
    }

    state.filteredIcons = results;
    state.visibleCount = 0;
    el.resultCount.textContent = `${results.length} icons`;
    el.clearSearch.classList.toggle("hidden", !state.searchQuery);
    el.grid.innerHTML = "";

    loadMoreIcons();
    updateURL();
}

function loadMoreIcons() {
    const nextBatch = state.filteredIcons.slice(
        state.visibleCount,
        state.visibleCount + ICONS_PER_BATCH,
    );
    if (nextBatch.length === 0) return;

    const fragment = document.createDocumentFragment();

    nextBatch.forEach((icon) => {
        const card = document.createElement("div");
        card.className = "icon-card";
        card.dataset.name = icon.name;
        card.dataset.id = icon.id;
        card.tabIndex = 0;
        card.innerHTML = `<div class="skeleton"></div><div class="icon-name">${icon.name}</div>`;
        card.addEventListener("click", () => openViewer(icon));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter") openViewer(icon);
        });
        fragment.appendChild(card);
        lazyLoadSVG(card, icon.name);
    });

    el.grid.appendChild(fragment);
    state.visibleCount += nextBatch.length;
}

function updateURL() {
    const url = new URL(window.location);
    if (state.searchQuery) url.searchParams.set("search", state.searchQuery);
    else url.searchParams.delete("search");

    if (state.currentView === "detail" && state.viewerConfig.iconName) {
        url.searchParams.set("icon", state.viewerConfig.iconName);
    }

    window.history.replaceState({}, "", url);
}

const imgObserver = new IntersectionObserver(
    (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                fetchAndInjectSVG(card, card.dataset.name);
                observer.unobserve(card);
            }
        });
    },
    { rootMargin: "100px", threshold: 0.1 },
);

function lazyLoadSVG(card, name) {
    imgObserver.observe(card);
}

async function fetchAndInjectSVG(container, name) {
    const skeleton = container.querySelector(".skeleton");
    if (state.svgCache.has(name)) {
        if (skeleton) skeleton.remove();
        container.insertAdjacentHTML("afterbegin", state.svgCache.get(name));
        return;
    }
    try {
        const res = await fetch(`${SVG_BASE_PATH}${name}.svg`);
        if (!res.ok) throw new Error("404");
        const text = await res.text();
        state.svgCache.set(name, text);
        if (skeleton) skeleton.remove();
        container.insertAdjacentHTML("afterbegin", text);
    } catch (e) { }
}

const scrollObserver = new IntersectionObserver(
    (entries) => {
        if (entries[0].isIntersecting && state.currentView === "gallery") {
            loadMoreIcons();
        }
    },
    { rootMargin: "400px" },
);

scrollObserver.observe(el.scrollSentinel);

function generateSmartTags() {
    const tagCounts = new Map();
    const stopWords = ["icon", "outline", "filled", "solid", "sharp"];
    state.allIcons.forEach((icon) => {
        const parts = icon.name.split("-");
        parts.forEach((part) => {
            if (part.length > 2 && !stopWords.includes(part) && !/\d/.test(part)) {
                tagCounts.set(part, (tagCounts.get(part) || 0) + 1);
            }
        });
    });
    const sortedTags = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    el.tagsContainer.innerHTML = "";
    sortedTags.forEach(([tag, count]) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = `${tag}`;
        chip.addEventListener("click", () => toggleTag(tag, chip));
        el.tagsContainer.appendChild(chip);
    });
}

function toggleTag(tag, chip) {
    const isActive = state.activeTag === tag;
    document
        .querySelectorAll(".chip")
        .forEach((c) => c.classList.remove("active"));
    if (isActive) {
        state.activeTag = null;
    } else {
        state.activeTag = tag;
        chip.classList.add("active");
    }
    applyFilters();
}

function generateCleanSVG(
    iconName,
    config,
    format = "minified",
    includeComment = false,
) {
    const rawXML = state.svgCache.get(iconName);
    if (!rawXML) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawXML, "image/svg+xml");
    const svg = doc.documentElement;

    svg.setAttribute("width", config.size);
    svg.setAttribute("height", config.size);
    svg.style.transform = `rotate(${config.rotate}deg)`;
    svg.style.transition = `all 0.2s ease`;

    if (config.fillColor === "currentColor") {
        svg.setAttribute("fill", "currentColor");
        svg.style.fill = "currentColor";
    } else {
        svg.setAttribute("fill", config.fillColor);
        svg.style.fill = config.fillColor;
    }

    if (parseFloat(config.stroke) > 0) {
        svg.style.strokeWidth = config.stroke;
        if (config.strokeColor === "currentColor") {
            svg.style.stroke = "currentColor";
        } else {
            svg.style.stroke = config.strokeColor;
        }
    } else {
        svg.style.stroke = "none";
    }

    if (config.animate) {
        const oldStyle = svg.querySelector("style[data-anim]");
        if (oldStyle) oldStyle.remove();

        const styleTag = doc.createElementNS("http://www.w3.org/2000/svg", "style");
        styleTag.setAttribute("data-anim", "true");
        styleTag.textContent = `
            @keyframes fadeIn { 
                0% { opacity: 0; transform: scale(0.5) rotate(${config.rotate - 45}deg); } 
                100% { opacity: 1; transform: scale(1) rotate(${config.rotate}deg); } 
            }
        `;
        svg.prepend(styleTag);
        svg.style.animation = `fadeIn 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) forwards`;
    }

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svg);

    if (includeComment) {
        const comment = `<!-- S-V-Go Library: ${iconName} -->\n`;
        svgString = comment + svgString;
    }

    if (format === "pretty") {
        svgString = svgString
            .replace(/><(?!\/)/g, ">\n  <")
            .replace(/><\//g, ">\n</")
            .replace(
                /xmlns="http:\/\/www.w3.org\/2000\/svg"/,
                'xmlns="http://www.w3.org/2000/svg"\n ',
            )
            .trim();
    } else {
        svgString = svgString.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }

    return svgString;
}

function openViewer(icon, updateHistory = true) {
    switchView("detail");
    el.viewer.title.textContent = icon.name;
    el.viewer.id.textContent = `ID: ${icon.id}`;
    state.viewerConfig.iconName = icon.name;
    fetchAndInjectViewerSVG(icon.name);

    if (updateHistory) {
        const url = new URL(window.location);
        url.searchParams.set("icon", icon.name);
        window.history.pushState({ view: "detail", icon: icon.name }, "", url);
    }
}

async function fetchAndInjectViewerSVG(name) {
    let content = state.svgCache.get(name);
    if (!content) {
        try {
            const res = await fetch(`${SVG_BASE_PATH}${name}.svg`);
            content = await res.text();
            state.svgCache.set(name, content);
        } catch (e) {
            return;
        }
    }
    updateViewerStyle();
}

function updateViewerStyle() {
    if (!state.viewerConfig.iconName) return;

    const previewCode = generateCleanSVG(
        state.viewerConfig.iconName,
        state.viewerConfig,
        "minified",
        false,
    );
    el.viewer.canvas.innerHTML = previewCode;

    const prettyCode = generateCleanSVG(
        state.viewerConfig.iconName,
        state.viewerConfig,
        "pretty",
        false,
    );
    el.viewer.code.textContent = prettyCode;
}

function resetViewerSettings() {
    const savedIconName = state.viewerConfig.iconName;
    state.viewerConfig = { ...DEFAULT_VIEWER_CONFIG, iconName: savedIconName };

    const { inputs, labels } = el.viewer;

    inputs.size.value = 100;
    inputs.stroke.value = 0;
    inputs.rotate.value = 0;
    inputs.fillColor.value = "#6750a4";
    inputs.strokeColor.value = "#6750a4";
    inputs.anim.checked = false;

    labels.size.textContent = "100";
    labels.stroke.textContent = "0";
    labels.rotate.textContent = "0";
    labels.fillHex.textContent = "#6750a4";
    labels.strokeHex.textContent = "#6750a4";

    updateViewerStyle();
}

function closeViewer() {
    switchView("gallery");
    const url = new URL(window.location);
    url.searchParams.delete("icon");
    window.history.pushState({ view: "gallery" }, "", url);
}

function setupEventListeners() {
    el.searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        applyFilters();
    });
    el.clearSearch.addEventListener("click", () => {
        state.searchQuery = "";
        el.searchInput.value = "";
        applyFilters();
    });

    el.accentPicker.addEventListener("input", (e) => {
        const color = e.target.value;
        document.documentElement.style.setProperty("--primary", color);
        saveSettings("svgo_accent", color);
    });

    el.themeToggle.addEventListener("click", () => {
        const isDark = document.body.dataset.theme === "dark";
        document.body.dataset.theme = isDark ? "light" : "dark";
        saveSettings("svgo_theme", isDark ? "light" : "dark");
    });

    const { inputs, labels } = el.viewer;
    const updateState = (key, value) => {
        state.viewerConfig[key] = value;
        updateViewerStyle();
    };

    inputs.size.addEventListener("input", (e) => {
        updateState("size", e.target.value);
        labels.size.textContent = e.target.value;
    });
    inputs.stroke.addEventListener("input", (e) => {
        updateState("stroke", e.target.value);
        labels.stroke.textContent = e.target.value;
    });
    inputs.rotate.addEventListener("input", (e) => {
        updateState("rotate", e.target.value);
        labels.rotate.textContent = e.target.value;
    });

    inputs.fillColor.addEventListener("input", (e) => {
        updateState("fillColor", e.target.value);
        labels.fillHex.textContent = e.target.value;
    });
    inputs.strokeColor.addEventListener("input", (e) => {
        updateState("strokeColor", e.target.value);
        labels.strokeHex.textContent = e.target.value;
    });

    inputs.fillCurrentBtn.addEventListener("click", () => {
        updateState("fillColor", "currentColor");
        labels.fillHex.textContent = "CurrentColor";
    });
    inputs.strokeCurrentBtn.addEventListener("click", () => {
        updateState("strokeColor", "currentColor");
        labels.strokeHex.textContent = "CurrentColor";
    });

    inputs.anim.addEventListener("change", (e) => {
        updateState("animate", e.target.checked);
    });

    el.viewer.resetBtn.addEventListener("click", resetViewerSettings);

    el.viewer.bgButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            el.viewer.bgButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            el.viewer.canvas.classList.remove(
                "checkerboard",
                "canvas-bg-white",
                "canvas-bg-black",
            );

            const mode = btn.dataset.bg;
            if (mode === "checkerboard")
                el.viewer.canvas.classList.add("checkerboard");
            if (mode === "bg-white")
                el.viewer.canvas.classList.add("canvas-bg-white");
            if (mode === "bg-black")
                el.viewer.canvas.classList.add("canvas-bg-black");
        });
    });

    el.viewer.downloadBtn.addEventListener("click", () => {
        const finalSVG = generateCleanSVG(
            state.viewerConfig.iconName,
            state.viewerConfig,
            "minified",
            true,
        );
        const blob = new Blob([finalSVG], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${state.viewerConfig.iconName}-custom.svg`;
        link.click();
        URL.revokeObjectURL(url);
    });

    el.viewer.copyCodeBtn.addEventListener("click", () => {
        const copyText = generateCleanSVG(
            state.viewerConfig.iconName,
            state.viewerConfig,
            "pretty",
            true,
        );
        navigator.clipboard.writeText(copyText);
        const t = document.getElementById("toast");
        t.classList.remove("hidden");
        setTimeout(() => t.classList.add("hidden"), 2000);
    });

    el.backBtn.addEventListener("click", closeViewer);
    el.homeBtn.addEventListener("click", () => {
        if (state.currentView === "detail") closeViewer();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("popstate", (e) => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("icon")) {
            const iconName = params.get("icon");
            const iconObj = state.allIcons.find((i) => i.name === iconName) || {
                name: iconName,
                id: "?",
            };
            openViewer(iconObj, false);
        } else {
            switchView("gallery");
        }
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document
                .querySelectorAll(".tab-btn")
                .forEach((b) => b.classList.remove("active"));
            document
                .querySelectorAll(".tab-content")
                .forEach((c) => c.classList.remove("active"));
            btn.classList.add("active");
            document
                .getElementById(
                    `tab${btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)}`,
                )
                .classList.add("active");
        });
    });
}

init();
