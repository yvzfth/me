import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { profile, projects, skills, contacts, experience, fs } from "./data.js";

// Real terminal emulator (xterm.js) with a hand-rolled zsh-style line editor.
// Runs a client-side command engine (130+ commands) and drives page navigation.
// Lives in a floating dock opened from the bottom-right bubble.

const SECTIONS = fs.dirs; // about, skills, projects, contact

// ANSI helpers
const A = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[38;2;0;255;204m",
  magenta: "\x1b[38;2;188;19;254m",
  green: "\x1b[38;2;152;195;121m",
  blue: "\x1b[38;2;97;175;239m",
  red: "\x1b[38;2;255;95;86m",
  gray: "\x1b[38;2;138;143;160m",
  yellow: "\x1b[38;2;255;189;46m",
};
const paint = (c, s) => `${A[c]}${s}${A.reset}`;

export function initTerminal() {
  const dock = document.getElementById("term-dock");
  const bubble = document.getElementById("term-bubble");
  const heroSlot = document.getElementById("term-hero-slot");
  const terminalEl = document.getElementById("terminal");
  const mount = document.getElementById("term-mount");
  const bar = document.getElementById("term-bar");

  const short = profile.name.split(" ")[0].toLowerCase();
  let cwd = "~";
  const promptStr = () => `${paint("cyan", `${short}@portfolio`)} ${paint("magenta", cwd)} ${paint("gray", "%")} `;

  // ---------- xterm setup ----------
  const term = new Terminal({
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 13,
    cursorBlink: true,
    cursorStyle: "bar",
    allowProposedApi: true,
    theme: {
      // transparent: the wrapper (.term-mount / .terminal) paints the surface,
      // so fullscreen mode can let the Three.js scene show through
      background: "rgba(0,0,0,0)",
      foreground: "#e6e6e6",
      cursor: "#00ffcc",
      selectionBackground: "rgba(0,255,204,0.25)",
      black: "#0b0e14",
      brightBlack: "#8a8fa0",
    },
    scrollback: 1000,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(mount);

  // ---------- output helpers ----------
  const write = (s) => term.write(s.replace(/\n/g, "\r\n"));
  const writeln = (s = "") => term.write(s.replace(/\n/g, "\r\n") + "\r\n");

  // ---------- line editor state ----------
  let line = "";
  let cursor = 0;
  const history = [];
  let histIdx = 0;
  let busy = false;

  function renderLine() {
    // rewrite the current input line in place
    term.write("\r\x1b[K" + promptStr() + line);
    const back = line.length - cursor;
    if (back > 0) term.write(`\x1b[${back}D`);
    term.scrollToBottom();
  }
  function newPrompt() {
    line = "";
    cursor = 0;
    term.write("\r\n" + promptStr());
    term.scrollToBottom();
  }
  function prompt() {
    term.write(promptStr());
    term.scrollToBottom();
  }

  // ---------- placement: hero (inline) <-> floating dock/bubble ----------
  // mode: "hero" = shown on the hero; "collapsed" = >_ button; "float" = floating window
  let mode = "hero";
  const refit = () =>
    setTimeout(() => {
      try {
        fit.fit();
        term.scrollToBottom();
      } catch {}
    }, 130);

  function toHero() {
    mode = "hero";
    if (terminalEl.parentElement !== heroSlot) heroSlot.appendChild(terminalEl);
    dock.classList.remove("open", "zoomed");
    dock.setAttribute("aria-hidden", "true");
    bubble.classList.add("hidden");
    refit();
  }
  function toCollapsed() {
    mode = "collapsed";
    dock.classList.remove("open");
    dock.setAttribute("aria-hidden", "true");
    bubble.classList.remove("hidden");
  }
  function toFloat() {
    mode = "float";
    if (terminalEl.parentElement !== dock) dock.appendChild(terminalEl);
    dock.classList.add("open");
    dock.setAttribute("aria-hidden", "false");
    bubble.classList.add("hidden");
    refit();
    term.focus();
  }

  // fullscreen: the terminal fills the viewport but stays translucent so the
  // Three.js starfield keeps animating behind it
  function toggleFullscreen(force) {
    const on = force ?? !dock.classList.contains("fullscreen");
    if (on) {
      if (terminalEl.parentElement !== dock) dock.appendChild(terminalEl);
      mode = "float";
      dock.classList.remove("zoomed");
      dock.classList.add("open", "fullscreen");
      dock.setAttribute("aria-hidden", "false");
      bubble.classList.add("hidden");
      document.body.classList.add("term-fullscreen");
    } else {
      dock.classList.remove("fullscreen");
      document.body.classList.remove("term-fullscreen");
    }
    refit();
    term.focus();
  }

  bubble.addEventListener("click", toFloat);

  // scroll: on the hero -> inline; scrolled away -> collapse to button (unless floating)
  const heroZone = () => window.scrollY < window.innerHeight * 0.55;
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (dock.classList.contains("fullscreen")) return; // fullscreen ignores scroll
        if (heroZone()) {
          if (mode !== "hero") toHero();
        } else if (mode === "hero") {
          toCollapsed();
        }
      });
    },
    { passive: true },
  );

  window.addEventListener("keydown", (e) => {
    const focused = mount.contains(document.activeElement);
    if (e.key === "Escape") {
      if (dock.classList.contains("fullscreen")) return toggleFullscreen(false);
      if (mode === "float") toCollapsed();
    }
    if (e.key === "`" && !focused && mode !== "hero") {
      e.preventDefault();
      mode === "float" ? toCollapsed() : toFloat();
    }
  });
  window.addEventListener("resize", () => {
    if (mode !== "collapsed") refit();
  });

  // wipe the whole conversation and reprint the banner
  function wipe() {
    term.reset();
    line = "";
    cursor = 0;
    boot();
  }

  // ---------- navigation ----------
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => Math.random() * (b - a) + a;
  // live-data helpers (with graceful fallback handled by callers)
  const getJSON = async (url, opts) => {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const getText = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  };

  // ---------- rich / interactive commands ----------
  // Each returns a string (or a Promise) or writes directly and returns "".
  const rich = {
    help: () =>
      `${paint("cyan", "Fatih's shell — quick reference")}

${paint("magenta", "site")}     about · skills · experience · projects · contact · resume · hire
${paint("magenta", "nav")}      ls · cd <dir> · open <dir> · cat <file> · pwd · tree
${paint("magenta", "dev")}      git · npm · node · python · docker · make · vite · tsc …
${paint("magenta", "system")}   neofetch · uname · uptime · top · df · free · ps · env
${paint("magenta", "net")}      ping · curl · ssh · nmap · dig · ifconfig · traceroute
${paint("magenta", "live")}     ${paint("green", "joke")} · ${paint("green", "advice")} · ${paint("green", "catfact")} · ${paint("green", "weather <city>")} · ${paint("green", "myip")}  ${paint("gray", "(real APIs)")}
${paint("magenta", "utils")}    calc · base64 · rot13 · uuid · reverse · flip · roll · 8ball · color · sysinfo
${paint("magenta", "fun")}      cowsay · figlet · fortune · quote · matrix · theme · hack · coffee
${paint("magenta", "shell")}    echo · date · time · cal · history · whoami · clear · man <cmd>
${paint("magenta", "window")}   ${paint("green", "fullscreen")} (transparent, the 3D scene shows through)

${paint("gray", "Run 'commands' for the full list. Tab autocompletes. Scroll up top to dock it on the hero.")}`,
    commands: () => {
      const keys = Object.keys(commands).sort();
      return (
        paint("gray", `${keys.length} commands available:`) +
        "\n" +
        keys.map((k) => paint("magenta", k)).join("  ")
      );
    },
    about: () => (scrollTo("about"), fs.files["about.txt"]),
    skills: () => {
      scrollTo("skills");
      return skills
        .map((s) => `  ${paint("green", s.name.padEnd(18))}${paint("gray", s.level)}`)
        .join("\n");
    },
    projects: () => {
      scrollTo("projects");
      return projects
        .map(
          (p, i) =>
            `  ${paint("cyan", `${i + 1}. ${p.name}`)}  ${paint("gray", `[${p.tags.join(", ")}]`)}\n     ${p.desc}\n     ${paint("cyan", p.url)}${p.live ? `\n     ${paint("green", "live: " + p.live)}` : ""}`,
        )
        .join("\n\n");
    },
    contact: () => {
      scrollTo("contact");
      return contacts
        .map((c) => `  ${paint("green", c.label.padEnd(10))}${paint("cyan", c.value)}`)
        .join("\n");
    },
    social: () => rich.contact(),
    fullscreen: () => {
      toggleFullscreen();
      return paint(
        "gray",
        dock.classList.contains("fullscreen")
          ? "Fullscreen on — background stays transparent. Esc or the green light exits."
          : "Fullscreen off.",
      );
    },
    experience: () => {
      scrollTo("experience");
      return experience
        .map(
          (e) =>
            `  ${paint("gray", e.period.padEnd(14))}${paint("cyan", e.role)} ${paint("gray", "@ " + e.org)}\n${" ".repeat(16)}${e.desc}`,
        )
        .join("\n\n");
    },
    resume: () => fs.files["resume.txt"],
    hire: () => {
      scrollTo("contact");
      return `${paint("cyan", "Available for work.")}\nEmail: ${paint("cyan", contacts[2].value)}\nRun 'open contact' for all channels.`;
    },
    ls: () =>
      [
        ...SECTIONS.map((d) => paint("blue", d + "/")),
        ...Object.keys(fs.files).map((f) => paint("green", f)),
      ].join("   "),
    cd: (a) => {
      let t = (a[0] || "~").replace(/\/$/, "");
      if (t === "~" || t === "" || t === "..") {
        cwd = "~";
        scrollTo("home");
      } else if (SECTIONS.includes(t)) {
        cwd = `~/${t}`;
        scrollTo(t);
      } else return paint("red", `cd: no such file or directory: ${t}`);
      return "";
    },
    open: (a) =>
      SECTIONS.includes(a[0])
        ? (scrollTo(a[0]), paint("gray", `Opening ${a[0]}…`))
        : paint("red", `open: unknown section: ${a[0] || ""}`),
    cat: (a) => {
      if (!a[0]) return paint("gray", "usage: cat <file>");
      if (fs.files[a[0]]) return fs.files[a[0]];
      return paint("red", `cat: ${a[0]}: No such file or directory`);
    },
    tree: () =>
      `.
├── ${paint("blue", "about/")}
├── ${paint("blue", "skills/")}
├── ${paint("blue", "projects/")}
├── ${paint("blue", "contact/")}
${Object.keys(fs.files)
  .map((f) => `└── ${paint("green", f)}`)
  .join("\n")}`,
    pwd: () => `/Users/${short}/portfolio${cwd.replace("~", "")}`,
    whoami: () =>
      `${paint("cyan", profile.name)} — ${profile.role}\n${profile.location}\nstack: ${profile.stack.join(", ")}`,
    neofetch: () => {
      const art = [
        "      .:'",
        "   __ :'__",
        ".'`__`-'__``.",
        ":____________.-'",
        ":___________:",
        " `._________.'",
      ];
      const info = [
        `${paint("cyan", short)}@${paint("cyan", "portfolio")}`,
        "OS:     macOS (web build)",
        "Shell:  zsh 5.9",
        `Role:   ${profile.role}`,
        "Editor: Neovim",
        `Stack:  ${profile.stack.slice(0, 3).join(", ")}`,
        "Uptime: always shipping",
      ];
      const rows = Math.max(art.length, info.length);
      let out = "";
      for (let i = 0; i < rows; i++)
        out += `${paint("cyan", (art[i] || "").padEnd(18))}  ${info[i] || ""}\n`;
      return out.trimEnd();
    },
    echo: (a) => a.join(" "),
    date: () => new Date().toString(),
    history: () =>
      history.length
        ? history.map((h, i) => `  ${i + 1}  ${h}`).join("\n")
        : paint("gray", "No history yet."),
    clear: () => {
      term.clear();
      return "";
    },
    man: (a) => {
      const c = a[0];
      if (!c) return paint("gray", "What manual page do you want? (man <cmd>)");
      if (commands[c])
        return `${paint("cyan", c.toUpperCase() + "(1)")}\n\nNAME\n    ${c} — portfolio shell builtin\n\nDESCRIPTION\n    Run '${c}' to try it. Most commands are interactive demos.\n    See 'help' for the grouped overview.`;
      return paint("red", `No manual entry for ${c}`);
    },
    theme: () => {
      const themes = [
        [[0, 255, 204], [188, 19, 254]],
        [[255, 126, 219], [54, 249, 246]],
        [[255, 217, 61], [255, 107, 107]],
        [[124, 246, 124], [0, 180, 255]],
      ];
      themeIdx = (themeIdx + 1) % themes.length;
      const [c1, c2] = themes[themeIdx];
      const hex = (c) => "#" + c.map((n) => n.toString(16).padStart(2, "0")).join("");
      document.documentElement.style.setProperty("--accent", hex(c1));
      document.documentElement.style.setProperty("--accent2", hex(c2));
      A.cyan = `\x1b[38;2;${c1.join(";")}m`;
      A.magenta = `\x1b[38;2;${c2.join(";")}m`;
      term.options.theme = { ...term.options.theme, cursor: hex(c1) };
      return paint("cyan", `theme → ${hex(c1)} / ${hex(c2)}`);
    },
    cowsay: (a) => {
      const msg = a.join(" ") || "moo";
      const bar = " " + "-".repeat(msg.length + 2);
      return `${bar}\n< ${msg} >\n${bar}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`;
    },
    figlet: (a) =>
      paint("cyan", (a.join(" ") || short).toUpperCase().slice(0, 12).split("").map((c) => `[${c}]`).join(" ")),
    fortune: () => paint("cyan", pick(FORTUNES)),
    async joke() {
      write(paint("gray", "reticulating punchline…") + "\r\n");
      try {
        const j = await getJSON("https://official-joke-api.appspot.com/random_joke");
        return `${j.setup}\n${paint("cyan", j.punchline)}`;
      } catch {
        return pick(JOKES) + paint("gray", "\n(offline — served a local joke)");
      }
    },
    quote: () => paint("gray", pick(QUOTES)),
    async weather(a) {
      const city = a.join(" ") || "Istanbul";
      write(paint("gray", `Fetching weather for ${city}…`) + "\r\n");
      try {
        const raw = await getText(
          `https://wttr.in/${encodeURIComponent(city)}?format=%l:+%c+%t,+wind+%w,+humidity+%h`,
        );
        let out = raw.trim();
        // Browsers get wttr.in's HTML page (format only applies to curl UAs);
        // the one-line result lives inside .term-container — pull it out.
        if (out.startsWith("<")) {
          const doc = new DOMParser().parseFromString(raw, "text/html");
          out = (doc.querySelector(".term-container")?.textContent || "").trim();
        }
        if (!out) throw new Error("empty");
        return paint("cyan", out.replace(/\s+/g, " "));
      } catch {
        return `${paint("cyan", city)}: ${pick(["☀ Sunny", "⛅ Partly cloudy", "🌧 Rain", "❄ Snow"])} ${Math.round(rnd(2, 30))}°C ${paint("gray", "(offline estimate)")}`;
      }
    },
    async matrix() {
      for (let i = 0; i < 8; i++) {
        let s = "";
        for (let j = 0; j < 44; j++) s += Math.random() > 0.5 ? "1" : "0";
        writeln(paint("green", s));
        await sleep(90);
      }
      return paint("red", "Wake up, Neo…");
    },
    async ping(a) {
      const host = a[0] || "github.com";
      writeln(`PING ${host}: 56 data bytes`);
      for (let i = 0; i < 4; i++) {
        await sleep(350);
        writeln(`64 bytes from ${host}: icmp_seq=${i} ttl=117 time=${rnd(8, 40).toFixed(1)} ms`);
      }
      return paint("gray", `--- ${host} ping statistics ---\n4 transmitted, 4 received, 0.0% loss`);
    },
    async curl(a) {
      const url = a.find((x) => !x.startsWith("-")) || "https://api.github.com";
      await sleep(350);
      return `${paint("green", `{\n  "status": "ok",\n  "user": "${short}",\n  "role": "${profile.role}"\n}`)}\n${paint("gray", `# fetched ${url}`)}`;
    },
    wget: (a) =>
      paint(
        "gray",
        `--  ${a[0] || "https://example.com/file.zip"}\nResolving host… connected.\nHTTP request sent… 200 OK\n'file' saved [1048576/1048576]`,
      ),
    async ssh(a) {
      const host = a[0] || "user@server";
      writeln(`The authenticity of host '${host}' can't be established.`);
      await sleep(350);
      return paint("red", `${host}: Permission denied (publickey).`);
    },
    git: (a) => {
      const s = a[0];
      if (s === "status") return `On branch ${paint("cyan", "main")}\nnothing to commit, working tree clean`;
      if (s === "log")
        return `${paint("green", "a1b2c3d")} feat: real xterm.js terminal\n${paint("green", "e4f5g6h")} feat: 130 commands + floating dock\n${paint("green", "9i0j1k2")} feat: three.js scene`;
      if (s === "push") return "Everything up-to-date";
      return paint("red", `git: '${s || ""}' is not a git command`);
    },
    async npm(a) {
      const s = a[0];
      if (s === "install" || s === "i") {
        write(paint("gray", "adding packages…") + "\r\n");
        await sleep(600);
        return paint("cyan", "added 312 packages, 0 vulnerabilities");
      }
      if (s === "run" && a[1] === "dev") return `  ${paint("cyan", "VITE")} ready\n  ➜ Local: http://localhost:5173/`;
      return paint("red", `npm: unknown command '${s || ""}'`);
    },
    node: (a) => (a[0]?.match(/-v|--version/) ? "v22.23.1" : paint("gray", "Welcome to Node.js v22.23.1.\nType .exit to leave.")),
    python: (a) => (a[0]?.match(/-v|--version/i) ? "Python 3.12.1" : paint("gray", 'Python 3.12.1 — type "exit()" to leave')),
    docker: (a) =>
      a[0] === "ps"
        ? "CONTAINER   IMAGE   STATUS         NAMES\na1b2c3d4    node    Up 2 minutes   portfolio-web"
        : paint("red", `docker: '${a[0] || ""}' is not a docker command`),
    sudo: (a) =>
      a.join(" ").includes("rm -rf")
        ? paint("red", "Nope. Not today. 🙅")
        : paint("red", `${short} is not in the sudoers file. This incident will be reported.`),
    rm: (a) =>
      a.includes("-rf") && (a.includes("/") || a.includes("/*"))
        ? paint("red", "💥 just kidding — nothing was deleted.")
        : paint("red", `rm: ${a[a.length - 1] || "file"}: permission denied (read-only demo)`),
    async coffee() {
      write(paint("gray", "brewing…") + "\r\n");
      await sleep(500);
      return paint("cyan", "☕ Here's your coffee. Now go build something.");
    },
    async hack() {
      for (const s of ["accessing mainframe", "bypassing firewall", "decrypting", "downloading files", "covering tracks"]) {
        writeln(paint("green", `[+] ${s}…`));
        await sleep(300);
      }
      return paint("cyan", "ACCESS GRANTED (this is a joke, relax 😄)");
    },
  };

  // ---------- bulk canned commands (string | (args)=>string) ----------
  const canned = {
    cal: () =>
      `    ${new Date().toLocaleString("en", { month: "long", year: "numeric" })}\nSu Mo Tu We Th Fr Sa\n       1  2  3  4  5\n 6  7  8  9 10 11 12\n13 14 15 16 17 18 19\n20 21 22 23 24 25 26\n27 28 29 30 31`,
    uptime: "up 13 days, 4:20, 2 users, load average: 0.42, 0.37, 0.31",
    uname: (a) => (a.includes("-a") ? "Darwin portfolio 25.5.0 arm64 (macOS web build)" : "Darwin"),
    hostname: "portfolio.local",
    arch: "arm64",
    env: "SHELL=/bin/zsh\nHOME=/Users/fatih\nEDITOR=nvim\nLANG=en_US.UTF-8\nTERM=xterm-256color",
    printenv: "SHELL=/bin/zsh\nUSER=fatih\nPWD=/Users/fatih/portfolio\nLANG=en_US.UTF-8",
    alias: 'dev="npm run dev"\nbuild="npm run build"\ngs="git status"\n..="cd .."',
    which: (a) => (a[0] ? `/usr/local/bin/${a[0]}` : "usage: which <cmd>"),
    whereis: (a) => (a[0] ? `${a[0]}: /usr/local/bin/${a[0]}` : "usage: whereis <cmd>"),
    top: "PID   COMMAND      %CPU  MEM\n1001  node          5.2  150M\n1002  vite          2.1   90M\n1003  Terminal      0.4   20M",
    htop: "  CPU[||||      35%]  MEM[|||||   52%]\n  1001 node   5.2%  150M\n  1002 vite   2.1%   90M",
    ps: (a) =>
      a.includes("aux") || a.includes("-ef")
        ? "USER   PID  %CPU %MEM COMMAND\nfatih 1001  5.2  2.1 node\nfatih 1002  2.1  1.0 vite"
        : "  PID TTY      TIME CMD\n 1001 ttys000  0:01 node",
    df: (a) =>
      a.includes("-h")
        ? "Filesystem  Size  Used Avail Use%\n/dev/disk1  500G  250G  250G  50%"
        : "Filesystem 1K-blocks Used Available Use%\n/dev/disk1 524288000 262144000 262144000 50%",
    free: "         total    used    free\nMem:     32768   8192   24576\nSwap:     2048      0    2048",
    du: "4.0K  ./about\n8.0K  ./projects\n2.0K  ./contact\n14K   total",
    lsblk: "NAME    SIZE TYPE MOUNTPOINT\ndisk1   500G disk /\ndisk1s1 250G part /System",
    lscpu: "Architecture: arm64\nCPU(s): 10\nModel name: Apple M-series\nMHz: 3200",
    lsusb: "Bus 001 Device 002: Apple Internal Keyboard\nBus 001 Device 003: USB-C Hub",
    mount: "/dev/disk1 on / (apfs, local, journaled)",
    ifconfig: "en0: flags=8863 mtu 1500\n    inet 192.168.1.42 netmask 0xffffff00\n    ether a4:83:e7:xx:xx:xx",
    ip: (a) => (a[0] === "addr" || a[0] === "a" ? "2: en0: inet 192.168.1.42/24 scope global" : "usage: ip addr"),
    netstat: "Proto Local Address    State\ntcp4  *.5173          LISTEN\ntcp4  *.3000          LISTEN",
    nslookup: (a) => `Server: 1.1.1.1\nName: ${a[0] || "github.com"}\nAddress: 140.82.121.4`,
    dig: (a) => `;; ANSWER SECTION:\n${a[0] || "github.com"}. 300 IN A 140.82.121.4`,
    traceroute: (a) => `traceroute to ${a[0] || "github.com"}\n 1  router  1.2ms\n 2  isp-gw  8.4ms\n 3  github  22.1ms`,
    whois: (a) => `Domain: ${a[0] || "example.com"}\nRegistrar: DemoRegistrar\nStatus: active`,
    nmap: (a) => `Nmap scan report for ${a[0] || "192.168.1.1"}\nPORT     STATE  SERVICE\n22/tcp   open   ssh\n80/tcp   open   http\n443/tcp  open   https`,
    telnet: (a) => `Trying ${a[0] || "localhost"}…\nConnection refused (demo).`,
    scp: "scp: uploading… done (demo, nothing sent).",
    rsync: "sending incremental file list\n\nsent 1.2K bytes  received 35 bytes",
    ftp: "Connected. 220 Demo FTP ready. (read-only)",
    kill: (a) => `kill: (${a[0] || "PID"}) — no such process (demo)`,
    jobs: "[1]+  Running   npm run dev",
    bg: "[1]+ npm run dev &",
    fg: "npm run dev",
    nohup: "nohup: ignoring input and appending output to 'nohup.out'",
    crontab: (a) => (a.includes("-l") ? "0 * * * * /usr/bin/ship-it" : "usage: crontab -l"),
    systemctl: "● portfolio.service - loaded active running",
    service: "portfolio is running.",
    journalctl: "-- Logs begin --\nportfolio[1001]: serving on :5173",
    dmesg: "[    0.000000] Booting portfolio kernel…\n[    0.420000] all systems nominal",
    lsof: "COMMAND  PID  USER  NAME\nnode    1001 fatih *:5173 (LISTEN)",
    chmod: (a) => `chmod: applied ${a[0] || "755"} (demo)`,
    chown: "chown: operation not permitted (read-only demo)",
    touch: (a) => `touch: created ${a[0] || "file"} (in-memory only)`,
    mkdir: (a) => `mkdir: created directory '${a[0] || "dir"}' (in-memory only)`,
    rmdir: (a) => `rmdir: removed '${a[0] || "dir"}' (demo)`,
    cp: "cp: copied (demo).",
    mv: "mv: moved (demo).",
    ln: "ln: link created (demo).",
    find: (a) => `./${a.includes("-name") ? a[a.indexOf("-name") + 1] : "README.md"}`,
    grep: (a) => `grep: pattern '${a[0] || ""}' — try 'cat README.md' instead`,
    sed: "sed: stream edited (demo).",
    awk: "awk: 1 record processed (demo).",
    sort: (a) => a.slice(1).sort().join("\n") || "usage: sort a b c",
    uniq: (a) => [...new Set(a.slice(1))].join("\n") || "usage: uniq a a b",
    wc: (a) => `  1  ${Math.max(a.length - 1, 0)}  ${a.slice(1).join(" ").length}`,
    head: () => Object.keys(fs.files).slice(0, 3).join("\n"),
    tail: () => "…end of file.",
    less: "(less) press q to quit — try 'cat README.md'.",
    more: "--More--(100%)  try 'cat README.md'",
    diff: "diff: files are identical (demo).",
    tar: "tar: archive created (demo).",
    zip: "  adding: files (deflated 62%)",
    unzip: "Archive: files.zip\n  inflating: done",
    gzip: "gzip: compressed (demo).",
    vim: (a) => `~ ${a[0] || "untitled"}\n~\n"${a[0] || "untitled"}" [demo] — :q to quit`,
    nano: (a) => `GNU nano — ${a[0] || "untitled"}\n^X Exit  ^O Save   (demo)`,
    emacs: "GNU Emacs — the extensible editor (demo). C-x C-c to quit.",
    code: (a) => `Opening ${a[0] || "."} in VS Code… (demo)`,
    make: "make: 'all' is up to date.",
    gcc: (a) => `gcc: compiled ${a[0] || "main.c"} -> a.out (demo)`,
    "g++": "g++: compiled -> a.out (demo)",
    rustc: "rustc: compiled -> ./main (demo)",
    cargo: (a) => (a[0] === "build" ? "   Compiling portfolio v1.0\n    Finished dev" : "cargo <build|run|test>"),
    go: (a) => (a[0] === "run" ? "hello from go (demo)" : "go <build|run|test>"),
    java: "java: ran Main (demo).",
    javac: "javac: compiled Main.class (demo).",
    php: "PHP 8.3 (cli) — demo REPL",
    ruby: "ruby 3.3 — demo",
    gem: "gem: 142 gems installed (demo)",
    pip: (a) => (a[0] === "install" ? `Successfully installed ${a[1] || "package"}` : "pip <install|list>"),
    pip3: "pip3 24.0",
    python3: "Python 3.12.1 — demo",
    deno: "deno 1.45 — demo",
    bun: "bun 1.1 — the fast runtime (demo)",
    yarn: "yarn install v1.22 — done in 0.4s",
    pnpm: (a) => (a[0] === "install" ? "Packages: +312\nDone in 3.2s" : "pnpm <install|add>"),
    npx: (a) => `npx: running ${a[0] || "<pkg>"}… done`,
    tsc: "tsc: 0 errors. ✨",
    vite: "  VITE ready in 120ms\n  ➜ http://localhost:5173/",
    kubectl: (a) => (a[0] === "get" ? "NAME          READY  STATUS\nportfolio-0   1/1    Running" : "kubectl <get|apply>"),
    terraform: "terraform: Apply complete! 3 added, 0 changed.",
    ansible: "PLAY RECAP — ok=4 changed=1 failed=0",
    vagrant: "vagrant: machine booted (demo).",
    brew: (a) => (a[0] === "install" ? `Installing ${a[1] || "pkg"}… 🍺 done` : "brew <install|list>"),
    apt: "Reading package lists… Done (demo).",
    yum: "yum: nothing to do (demo).",
    pacman: "pacman: -Syu — system up to date",
    snap: "snap: installed (demo).",
    yes: (a) => Array(5).fill(a.join(" ") || "y").join("\n"),
    seq: (a) => {
      const n = parseInt(a[0]) || 5;
      return Array.from({ length: Math.min(n, 20) }, (_, i) => i + 1).join("\n");
    },
    factor: (a) => `${a[0] || 12}: 2 2 3`,
    bc: "bc 1.07 — type an expression (demo).",
    expr: (a) => {
      try {
        const v = Function(`"use strict";return(${a.join(" ").replace(/[^-()\d/*+.\s]/g, "")})`)();
        return String(v);
      } catch {
        return "expr: syntax error";
      }
    },
    sleep: (a) => `slept ${a[0] || 1}s (not really).`,
    passwd: "Changing password… (nice try, no root here 🙂)",
    useradd: "useradd: permission denied (demo).",
    groups: "fatih staff admin developers",
    id: "uid=501(fatih) gid=20(staff) groups=20(staff),12(everyone)",
    w: "USER   TTY   IDLE  WHAT\nfatih  s000    0s  zsh",
    who: () => "fatih  console  " + new Date().toLocaleTimeString(),
    finger: "Login: fatih   Name: Fatih Yavuz\nShell: /bin/zsh",
    last: "fatih  console  still logged in",
    su: "su: authentication is not available (demo).",
    exit: "logout — refresh the page to reconnect. (Or press Esc.)",
    logout: "logout — see you around. 👋",
    lolcat: (a) => a.join(" ") || "🌈 pipe some text through me",
    toilet: (a) => (a.join(" ") || "hi").toUpperCase().split("").join(" "),
    sl: "🚂💨  choo choo — (you meant 'ls'?)",
    star: "⭐ Thanks for the star! (open projects to see the repos)",
    moon: () => pick(["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]),
    "42": "The answer to life, the universe, and everything.",
    credits: "Built by Fatih Yavuz. xterm.js + Three.js + Vite. No frameworks harmed.",
    banner: (a) => (a.join(" ") || "FATIH").toUpperCase().split("").map((c) => `#${c}#`).join(""),
    screenfetch: "macOS — zsh — xterm.js — portfolio build",

    // ----- live data (real network calls, with fallbacks) -----
    async advice() {
      write(paint("gray", "consulting the oracle…") + "\r\n");
      try {
        const j = await getJSON("https://api.adviceslip.com/advice", { cache: "no-store" });
        return paint("cyan", `"${j.slip.advice}"`);
      } catch {
        return paint("cyan", '"Ship it, then iterate."');
      }
    },
    async catfact() {
      try {
        const j = await getJSON("https://catfact.ninja/fact");
        return `🐱 ${j.fact}`;
      } catch {
        return "🐱 Cats sleep 12–16 hours a day. (offline)";
      }
    },
    async myip() {
      try {
        const j = await getJSON("https://api.ipify.org?format=json");
        return `Your public IP: ${paint("cyan", j.ip)}`;
      } catch {
        return paint("red", "myip: network unavailable");
      }
    },

    // ----- offline utilities (actually compute) -----
    sysinfo: () => {
      const n = navigator;
      return [
        `Platform:  ${n.platform || "—"}`,
        `Cores:     ${n.hardwareConcurrency || "—"}`,
        `Memory:    ${n.deviceMemory ? n.deviceMemory + " GB" : "—"}`,
        `Language:  ${n.language}`,
        `Online:    ${n.onLine}`,
        `Screen:    ${screen.width}×${screen.height}`,
        `Viewport:  ${innerWidth}×${innerHeight}`,
        `Renderer:  xterm.js + Three.js`,
      ].join("\n");
    },
    battery: () => "🔋 100% — plugged in (or your browser won't tell me, and that's fine)",
    time: () => new Date().toLocaleTimeString(),
    epoch: () => String(Date.now()),
    uuid: () => (crypto.randomUUID ? crypto.randomUUID() : "crypto.randomUUID() unavailable"),
    base64: (a) => {
      if (a[0] === "-d") {
        try {
          return decodeURIComponent(escape(atob(a.slice(1).join(" "))));
        } catch {
          return "base64: invalid input";
        }
      }
      const s = a.join(" ");
      return s ? btoa(unescape(encodeURIComponent(s))) : "usage: base64 <text> | base64 -d <b64>";
    },
    rot13: (a) =>
      a.join(" ").replace(/[a-z]/gi, (c) =>
        String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26),
      ) || "usage: rot13 <text>",
    reverse: (a) => a.join(" ").split("").reverse().join("") || "usage: reverse <text>",
    upper: (a) => a.join(" ").toUpperCase() || "usage: upper <text>",
    lower: (a) => a.join(" ").toLowerCase() || "usage: lower <text>",
    calc: (a) => {
      try {
        const v = Function(`"use strict";return(${a.join(" ").replace(/[^-()\d/*+.\s%]/g, "")})`)();
        return String(v);
      } catch {
        return "calc: syntax error";
      }
    },
    flip: () => (Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails"),
    roll: (a) => {
      const sides = parseInt(a[0]) || 6;
      return `🎲 ${Math.ceil(Math.random() * sides)} (d${sides})`;
    },
    color: () => {
      const hex = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
      return `${hex}  ${paint("cyan", "██████")}`;
    },
    "8ball": (a) => (a.length ? `🎱 ${pick(EIGHTBALL)}` : "usage: 8ball <your question>"),
    ascii: () =>
      "  ___      _   _ _      \n | __|__ _| |_(_) |_    \n | _/ _` |  _| |  _|   \n |_|\\__,_|\\__|_|\\__|  ",
    motd: () => paint("cyan", pick(FORTUNES)),
    cls: () => (term.reset(), ""),
  };

  // ---------- assemble command table ----------
  const commands = { ...rich };
  for (const [name, val] of Object.entries(canned)) {
    commands[name] = typeof val === "function" ? val : () => val;
  }
  const aliases = { "?": "help", cls: "clear", quit: "exit", h: "help" };
  let themeIdx = 0;

  async function run(raw) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return;
    let name = parts[0].toLowerCase();
    name = aliases[name] || name;
    const fn = commands[name];
    if (!fn) {
      writeln(paint("red", `zsh: command not found: ${name}. `) + paint("gray", "Type 'help' or 'commands'."));
      return;
    }
    try {
      const out = await fn.call(commands, parts.slice(1));
      if (out) writeln(out);
    } catch (e) {
      writeln(paint("red", `error: ${e.message}`));
    }
  }

  // ---------- tab completion ----------
  const pool = () => [...Object.keys(commands), ...SECTIONS, ...Object.keys(fs.files)];
  function complete() {
    const parts = line.split(/\s+/);
    const frag = parts[parts.length - 1];
    if (!frag) return;
    const m = [...new Set(pool())].filter((c) => c.startsWith(frag));
    if (m.length === 1) {
      parts[parts.length - 1] = m[0];
      line = parts.join(" ");
      cursor = line.length;
      renderLine();
    } else if (m.length > 1) {
      write("\r\n" + paint("gray", m.join("   ")) + "\r\n");
      renderLine();
    }
  }

  // ---------- key handling ----------
  term.onData(async (data) => {
    if (busy) return;

    // multi-byte escape sequences (arrows)
    if (data === "\x1b[A") {
      // up
      if (histIdx > 0) {
        line = history[--histIdx] ?? "";
        cursor = line.length;
        renderLine();
      }
      return;
    }
    if (data === "\x1b[B") {
      // down
      if (histIdx < history.length - 1) line = history[++histIdx] ?? "";
      else {
        histIdx = history.length;
        line = "";
      }
      cursor = line.length;
      renderLine();
      return;
    }
    if (data === "\x1b[C") {
      if (cursor < line.length) {
        cursor++;
        term.write("\x1b[C");
      }
      return;
    }
    if (data === "\x1b[D") {
      if (cursor > 0) {
        cursor--;
        term.write("\x1b[D");
      }
      return;
    }

    for (const ch of data) {
      const code = ch.charCodeAt(0);
      if (ch === "\r") {
        // Enter
        term.write("\r\n");
        const raw = line;
        if (raw.trim()) {
          history.push(raw);
          histIdx = history.length;
          busy = true;
          await run(raw);
          busy = false;
        }
        newPrompt();
      } else if (ch === "\x7f") {
        // Backspace
        if (cursor > 0) {
          line = line.slice(0, cursor - 1) + line.slice(cursor);
          cursor--;
          renderLine();
        }
      } else if (ch === "\t") {
        complete();
      } else if (ch === "\x0c") {
        // Ctrl+L
        term.clear();
        renderLine();
      } else if (ch === "\x03") {
        // Ctrl+C
        term.write("^C");
        newPrompt();
      } else if (code >= 0x20 && code !== 0x7f) {
        // printable
        line = line.slice(0, cursor) + ch + line.slice(cursor);
        cursor++;
        renderLine();
      }
    }
  });

  // click terminal focuses it
  terminalEl.addEventListener("mousedown", () => setTimeout(() => term.focus(), 0));

  // ---------- traffic lights ----------
  bar.addEventListener("click", (e) => {
    const action = e.target.dataset.win;
    if (!action) return;
    if (action === "close") {
      // red = wipe the whole conversation
      wipe();
      if (mode === "float") toCollapsed();
    } else if (action === "min") {
      if (mode === "float") toCollapsed();
      else document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    } else if (action === "zoom") {
      toggleFullscreen();
    }
  });

  // ---------- boot banner ----------
  function boot() {
    try {
      fit.fit();
    } catch {}
    writeln(
      paint("cyan", profile.name) +
        " — interactive portfolio shell " +
        paint("gray", "(real xterm.js · 160+ commands)"),
    );
    writeln(paint("gray", "Type 'help' for the map, 'commands' for everything, or try 'joke'."));
    write("\r\n");
    prompt();
  }

  // ---------- init: show on the hero, boot once ----------
  toHero();
  boot();
  setTimeout(() => term.focus(), 200);
}

// ---------- data for fun commands ----------
const FORTUNES = [
  "Ship early. Ship often.",
  "The best code is no code.",
  "It works on my machine ¯\\_(ツ)_/¯",
  "Premature optimization is the root of all evil.",
  "Weeks of coding save hours of planning.",
];
const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "There are 10 kinds of people: those who read binary and those who don't.",
  "A SQL query walks into a bar, sees two tables and asks: 'Can I JOIN you?'",
  "I would tell you a UDP joke, but you might not get it.",
];
const QUOTES = [
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Simplicity is the soul of efficiency." — Austin Freeman',
  '"Make it work, make it right, make it fast." — Kent Beck',
];
const EIGHTBALL = [
  "It is certain.",
  "Without a doubt.",
  "Yes — definitely.",
  "Ask again later.",
  "Cannot predict now.",
  "Don't count on it.",
  "My reply is no.",
  "Very doubtful.",
  "Signs point to yes.",
];
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
