# Fatih Yavuz — Portfolio

Professional developer portfolio with a **Three.js** animated background and a
**working macOS-style terminal** you can use to navigate the whole site.

Type commands like `help`, `ls`, `open projects`, `cd about`, or `cat resume.txt`.
`cd`/`open` scroll the real page sections into view — the terminal *is* the navigation.

## Tech

- [Vite](https://vitejs.dev/) — dev server + bundler
- [Three.js](https://threejs.org/) — 3D particle field + wireframe scene
- [xterm.js](https://xtermjs.org/) — the real terminal emulator (same lib VS Code / Hyper use), with a hand-rolled zsh-style line editor + 130+ commands
- Vanilla JS modules — no framework, no bloat

> Note: the terminal is a **client-side** emulator. It renders like a real
> shell (ANSI colors, cursor, history, tab-complete) but runs a sandboxed
> command engine — the browser can't execute real OS commands without a
> backend. Everything ships as a static site.

## Run the app

Requires **Node.js 18+**.

```bash
# 1. install dependencies (first time only)
npm install

# 2. start the dev server (opens http://localhost:5173)
npm run dev
```

### Production build

```bash
npm run build      # outputs static site to dist/
npm run preview    # serve the built site locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, …).

## Terminal commands

| Command | What it does |
| --- | --- |
| `help` | list every command |
| `about` / `skills` / `projects` / `contact` | jump to + print that section |
| `ls` | list sections and files |
| `cd <dir>` | change directory + scroll to section |
| `open <dir>` | scroll to a section |
| `cat <file>` | print a file (`README.md`, `resume.txt`, …) |
| `neofetch` | profile + system card |
| `whoami`, `pwd`, `echo`, `date`, `history`, `clear` | classic shell commands |

Shortcuts: <kbd>Tab</kbd> autocomplete · <kbd>↑</kbd>/<kbd>↓</kbd> history ·
<kbd>Ctrl</kbd>+<kbd>L</kbd> clear. The traffic-light buttons minimize/zoom the window.

## Structure

```
index.html            markup + section shells
src/css/style.css     all styling (macOS terminal chrome, panels, responsive)
src/js/
  main.js             bootstraps scene, terminal, renders content from data
  data.js             content (profile, skills, projects, contacts, virtual FS)
  three-scene.js      Three.js background
  terminal.js         terminal engine + navigation commands
```

Edit **`src/js/data.js`** to make it yours — projects, skills, and contacts all
come from there and feed both the visual sections and the terminal.
