# 🎨 S-V-Go Icon Gallery

> A high-performance, framework-free SVG Icon Gallery built with Vanilla JS and Material Design 3.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Tech Stack](https://img.shields.io/badge/Tech-Vanilla%20JS%20|%20HTML5%20|%20CSS3-blue)
![License](https://img.shields.io/badge/License-MIT-purple)

**S-V-Go** is a lightning-fast web application designed to browse, search, preview, and customize over **7,500+ SVG icons**. It features a Material Design 3 interface, deep linking, smart tagging, and a robust on-the-fly SVG customization engine—all without a single external framework or dependency.

---

## 🚀 Key Features

### ⚡ Performance First
*   **Virtual Scroll / Hybrid Pagination:** Handles thousands of DOM elements smoothly.
*   **Lazy Loading:** SVGs are fetched only when they enter the viewport using `IntersectionObserver`.
*   **Memory Caching:** Fetched SVGs are cached in a JavaScript Map to prevent redundant network requests.

### 🎨 Customization Engine
*   **Real-time Editor:** Modify size, stroke width, rotation, fill color, and stroke color.
*   **Smart Colors:** Support for Hex codes and `currentColor`.
*   **Animation:** One-click option to inject a CSS `fadeIn` intro animation into the SVG.
*   **Background Toggles:** Preview icons on Transparent, White, or Black backgrounds.

### 🧠 Smart & Persistent
*   **Auto-Generated Tags:** Automatically groups icons based on naming conventions.
*   **Deep Linking:** URL state management (`history.pushState`) allows sharing links to specific searches, colors, or opened icons.
*   **Local Storage:** Remembers your Theme (Light/Dark) and Accent Color preferences.

### 🛠 Technical Highlights
*   **Zero Frameworks:** Pure Vanilla JavaScript.
*   **Clean Output:** Uses a **Detached DOM Parser** to generate SVG code, ensuring downloaded files are clean and free from injected scripts (e.g., Live Server code).
*   **Formatted Code:** Offers "Pretty" printed code for display and "Minified" code for download.


## 🛠️ Installation & Setup

Because this project uses the `Fetch API` to load local JSON and SVG files, **it must be run on a local server** to avoid CORS policy errors.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/S-V-Go.git
cd S-V-Go
```

### 2. Prepare Data
Ensure your SVG files are located in `src/svg/` and that filenames match the `name` field in your database (e.g., `icon-name.svg`).

### 3. Run the Server

**Option A: VS Code (Recommended)**
1.  Install the **Live Server** extension.
2.  Right-click `index.html` and select **"Open with Live Server"**.

**Option B: Python**
```bash
# Python 3.x
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

**Option C: Node.js (http-server)**
```bash
npx http-server .
```

---

## 🎮 How to Use

1.  **Search:** Type in the top bar to filter icons instantly.
2.  **Smart Tags:** Click "Smart Tags" to expand auto-generated categories.
3.  **Customize:** Click any icon to open the full-page editor.
    *   Adjust sliders for Size, Stroke, and Rotation.
    *   Pick colors or use the **CC** button for `currentColor`.
    *   Toggle the **Animation** checkbox to add a fade-in effect.
4.  **Download:**
    *   **Copy:** Copies pretty-printed code to clipboard.
    *   **Download:** Saves a minified `.svg` file to your device.
5.  **Theme:** Click the 🌗 toggle or the Color Picker in the header to change the global look.

---

## 📝 Configuration

The app points to a remote JSON database by default. To change this, modify the `API_URL` constant at the top of `app.js`:

```javascript
// app.js
const API_URL = './database/db.json'; // Change to local or remote URL
const SVG_BASE_PATH = './src/svg/';   // Change if SVGs are hosted elsewhere
```

---

## 🤝 Contributing

Contributions are welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**MicroResearch Corporation** © 2026