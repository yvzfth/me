import { skills, projects, contacts, experience, stats, profile, fs } from "./data.js";

// Lightweight chat interface: runs commands from the input bar and renders
// the output as chat messages. Shares data.js with the terminal.

const CMD = {
  help: () =>
    `Commands:\nabout · skills · experience · projects · contact\nls · cat <file> · whoami · neofetch\ncd <section> · open <section>\njoke · weather <city> · cowsay <msg>\ncalc <expr> · base64 · rot13 · clear`,

  about: () =>
    `I'm a software developer from Istanbul working across the web,\nAI, and Apple platforms — React/Next.js/TypeScript web apps,\nPython + InsightFace machine-learning services, and Swift apps\nfor iOS & macOS.\n\nNow: ICT Assistant at the UN Development Programme.\nBefore: AI Engineer at the Istanbul Chamber of Industry, full-stack\n       developer at Supradent.\n\n45+ public repos on github.com/yvzfth.`,

  skills: () =>
    skills.map((s) => `${s.name.padEnd(18)}${s.level}`).join("\n"),

  projects: () =>
    projects
      .map(
        (p, i) =>
          `${i + 1}. ${p.name}\n   ${p.desc}\n   ${p.url}${p.live ? `\n   live: ${p.live}` : ""}`,
      )
      .join("\n\n"),

  experience: () =>
    experience
      .map(
        (e) =>
          `${e.period}  ${e.role} @ ${e.org}\n${" ".repeat(16)}${e.desc}`,
      )
      .join("\n\n"),

  contact: () =>
    contacts.map((c) => `${c.label.padEnd(10)}${c.value}`).join("\n"),

  ls: () => {
    const dirs = fs.dirs.join("/  ");
    const files = Object.keys(fs.files).join("  ");
    return `${dirs}\n${files}`;
  },

  cat: (args) => {
    if (!args[0]) return "usage: cat <file>";
    if (fs.files[args[0]]) return fs.files[args[0]];
    return `cat: ${args[0]}: No such file or directory`;
  },

  whoami: () =>
    `${profile.name} — ${profile.role}\n${profile.location}\nstack: ${profile.stack.join(", ")}`,

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
      `${profile.name.split(" ")[0].toLowerCase()}@portfolio`,
      "OS:     macOS (web build)",
      `Role:   ${profile.role}`,
      `Stack:  ${profile.stack.slice(0, 3).join(", ")}`,
    ];
    const rows = Math.max(art.length, info.length);
    let out = "";
    for (let i = 0; i < rows; i++)
      out += `${(art[i] || "").padEnd(18)}  ${info[i] || ""}\n`;
    return out.trimEnd();
  },

  cd: (args) => {
    const t = (args[0] || "~").replace(/\/$/, "");
    const sections = fs.dirs;
    if (["~", "", ".."].includes(t)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return "";
    }
    if (sections.includes(t)) {
      document.getElementById(t)?.scrollIntoView({ behavior: "smooth" });
      return "";
    }
    return `cd: no such file or directory: ${t}`;
  },

  open: (args) => {
    const sections = fs.dirs;
    if (sections.includes(args[0])) {
      document.getElementById(args[0])?.scrollIntoView({ behavior: "smooth" });
      return `Opening ${args[0]}...`;
    }
    return `open: unknown section: ${args[0] || ""}`;
  },

  echo: (args) => args.join(" "),
  date: () => new Date().toString(),
  time: () => new Date().toLocaleTimeString(),
  epoch: () => String(Date.now()),
  uuid: () => (crypto.randomUUID ? crypto.randomUUID() : "unavailable"),

  calc: (args) => {
    try {
      const v = Function(
        `"use strict";return(${args.join(" ").replace(/[^-()\d/*+.\s%]/g, "")})`,
      )();
      return String(v);
    } catch {
      return "calc: syntax error";
    }
  },

  base64: (args) => {
    if (args[0] === "-d") {
      try {
        return decodeURIComponent(escape(atob(args.slice(1).join(" "))));
      } catch {
        return "base64: invalid input";
      }
    }
    const s = args.join(" ");
    return s
      ? btoa(unescape(encodeURIComponent(s)))
      : "usage: base64 <text> | base64 -d <b64>";
  },

  rot13: (args) =>
    args
      .join(" ")
      .replace(/[a-z]/gi, (c) =>
        String.fromCharCode(
          (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26,
        ),
      ) || "usage: rot13 <text>",

  cowsay: (args) => {
    const msg = args.join(" ") || "moo";
    const bar = " " + "-".repeat(msg.length + 2);
    return `${bar}\n< ${msg} >\n${bar}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`;
  },

  fortune: () =>
    [
      "Ship early. Ship often.",
      "The best code is no code.",
      "It works on my machine ¯\\_(ツ)_/¯",
      "Premature optimization is the root of all evil.",
      "Weeks of coding save hours of planning.",
    ][Math.floor(Math.random() * 5)],

  quote: () =>
    [
      '"Talk is cheap. Show me the code." — Linus Torvalds',
      '"First, solve the problem. Then, write the code." — John Johnson',
      '"Simplicity is the soul of efficiency." — Austin Freeman',
      '"Make it work, make it right, make it fast." — Kent Beck',
    ][Math.floor(Math.random() * 4)],

  async joke() {
    try {
      const r = await fetch(
        "https://official-joke-api.appspot.com/random_joke",
      );
      const j = await r.json();
      return `${j.setup}\n${j.punchline}`;
    } catch {
      return "Why do programmers prefer dark mode? Because light attracts bugs.";
    }
  },

  async weather(args) {
    const city = args.join(" ") || "Istanbul";
    try {
      const r = await fetch(
        `https://wttr.in/${encodeURIComponent(city)}?format=%l:+%c+%t,+wind+%w,+humidity+%h`,
      );
      let out = (await r.text()).trim();
      if (out.startsWith("<")) {
        const doc = new DOMParser().parseFromString(out, "text/html");
        out = (doc.querySelector(".term-container")?.textContent || "").trim();
      }
      if (!out) throw new Error("empty");
      return out;
    } catch {
      return `${city}: unavailable offline`;
    }
  },

  flip: () => (Math.random() < 0.5 ? "Heads" : "Tails"),
  roll: (args) => `🎲 ${Math.ceil(Math.random() * (parseInt(args[0]) || 6))}`,

  terminal: () => {
    const dock = document.getElementById("term-dock");
    const termEl = document.getElementById("terminal");
    const mount = document.getElementById("term-mount");
    if (dock && termEl) {
      dock.appendChild(termEl);
      dock.classList.add("open");
      dock.setAttribute("aria-hidden", "false");
      // trigger xterm fit
      setTimeout(() => {
        try { window.dispatchEvent(new Event("resize")); } catch {}
      }, 150);
    }
    return "Opening terminal...";
  },
};

const ALIASES = { "?": "help", h: "help", cls: "clear", quit: "exit" };

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_MODEL = "openai/gpt-oss-120b";

async function askGroq(prompt) {
  if (!GROQ_KEY)
    return "AI chat is off — add VITE_GROQ_API_KEY to your .env file to enable it.";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are the AI assistant of Fatih Yavuz's portfolio. Fatih is a software developer from Istanbul working across the web, AI, and Apple platforms — React/Next.js/TypeScript, Python + InsightFace machine learning, and Swift for iOS & macOS. He is currently an ICT Assistant at the UN Development Programme, formerly AI Engineer at the Istanbul Chamber of Industry and full-stack developer at Supradent. Answer briefly and helpfully.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return `Groq error (${res.status}): ${detail.slice(0, 200)}`;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content || "No response.";
  } catch (e) {
    return `Groq request failed: ${e.message}`;
  }
}

async function run(raw) {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  let name = parts[0].toLowerCase();
  name = ALIASES[name] || name;

  if (name === "clear") return "__CLEAR__";

  const fn = CMD[name];
  if (!fn) return await askGroq(raw);
  try {
    return await fn(parts.slice(1));
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function initChat(scene) {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const box = document.getElementById("chat-messages");
  const canvas = document.getElementById("chat-canvas");
  const placeholder = document.getElementById("chat-placeholder");

  if (!form || !input || !box || !canvas || !placeholder) return;

  const ctx = canvas.getContext("2d");
  const snapshot = document.createElement("canvas");
  const sctx = snapshot.getContext("2d");
  let animating = false;
  let pixels = [];

  const placeholders = [
    "Ask me anything...",
    "Try 'help' to see my commands",
    "Try 'projects'",
    "Try 'skills'",
    "Try 'about'",
  ];
  let phIndex = 0;

  const swapPlaceholder = () => {
    placeholder.classList.add("anim");
    setTimeout(() => {
      placeholder.textContent = placeholders[phIndex];
      placeholder.classList.remove("anim");
    }, 300);
  };

  setTimeout(() => {
    setInterval(() => {
      if (document.hidden || input.value) return;
      phIndex = (phIndex + 1) % placeholders.length;
      swapPlaceholder();
    }, 3000);
  }, 3000);

  input.addEventListener("input", () => {
    if (animating) return;
    autoGrow();
    historyCursor = history.length;
    placeholder.classList.toggle("hidden", input.value.length > 0);
  });

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    form.classList.toggle("multiline", input.scrollHeight > 60);
  }

  const history = [];
  let historyCursor = 0;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!animating) form.requestSubmit();
      return;
    }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    if (animating || !history.length) return;
    e.preventDefault();
    if (e.key === "ArrowUp" && historyCursor > 0) {
      historyCursor--;
    } else if (e.key === "ArrowDown" && historyCursor < history.length) {
      historyCursor++;
    } else {
      return;
    }
    const val = historyCursor < history.length ? history[historyCursor] : "";
    input.value = val;
    placeholder.classList.toggle("hidden", val.length > 0);
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });

  autoGrow();

  function draw(text) {
    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);

    snapshot.width = 800;
    snapshot.height = 800;
    sctx.clearRect(0, 0, 800, 800);

    const computed = getComputedStyle(input);
    const fontSize = parseFloat(computed.getPropertyValue("font-size"));
    const font = `${fontSize * 2}px ${computed.fontFamily}`;
    ctx.font = font;
    sctx.font = font;
    ctx.fillStyle = "#FFF";
    sctx.fillStyle = "#FFF";
    const lines = String(text).split("\n");
    const lineHeight = fontSize * 2 * 1.5;
    lines.forEach((line, i) => {
      ctx.fillText(line, 16, 40 + i * lineHeight);
      sctx.fillText(line, 16, 40 + i * lineHeight);
    });

    const imageData = ctx.getImageData(0, 0, 800, 800).data;
    const newData = [];
    for (let t = 0; t < 800; t += 3) {
      const rowOffset = 4 * t * 800;
      for (let n = 0; n < 800; n += 3) {
        const idx = rowOffset + 4 * n;
        if (
          imageData[idx] !== 0 &&
          imageData[idx + 1] !== 0 &&
          imageData[idx + 2] !== 0
        ) {
          newData.push({
            x: n,
            y: t,
            r: 1.5,
            swept: false,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 1,
            color: `rgba(${imageData[idx]}, ${imageData[idx + 1]}, ${imageData[idx + 2]}, ${imageData[idx + 3]})`,
          });
        }
      }
    }
    pixels = newData;
  }

  function animate(start, callback) {
    (function frame(pos) {
      requestAnimationFrame(() => {
        ctx.clearRect(0, 0, 800, 800);
        ctx.drawImage(snapshot, 0, 0);
        ctx.clearRect(pos, 0, 800, 800);

        const alive = [];
        for (let i = 0; i < pixels.length; i++) {
          const current = pixels[i];
          if (current.x > pos || current.swept) {
            current.swept = true;
            current.x += current.vx;
            current.y += current.vy;
            current.r -= 0.12;
          }
          if (current.r > 0) alive.push(current);
        }
        pixels = alive;

        for (const p of pixels) {
          if (p.swept) {
            const s = Math.max(0.5, p.r);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, s, s);
          }
        }

        if (pos < -20 || pixels.length === 0) {
          ctx.clearRect(0, 0, 800, 800);
          canvas.classList.remove("active");
          input.classList.remove("vanishing");
          animating = false;
          callback?.();
        } else {
          frame(pos - 18);
        }
      });
    })(start);
  }

  function vanishAndSubmit(text, callback) {
    if (!text || animating) { callback?.(); return; }
    animating = true;
    canvas.classList.add("active");
    input.classList.add("vanishing");

    draw(text);
    const maxX = pixels.reduce((prev, current) => (current.x > prev ? current.x : prev), 0);
    animate(maxX + 16, callback);
  }

  function addMsg(text, role) {
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function enterSession() {
    document.body.classList.add("chat-session");
    scene?.collapse?.();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!raw || animating) return;
    history.push(raw);
    historyCursor = history.length;
    input.value = "";
    autoGrow();
    placeholder.classList.add("hidden");

    enterSession();
    addMsg(raw, "user");
    vanishAndSubmit(raw, () => {});

    run(raw).then((out) => {
      if (out === "__CLEAR__") { box.innerHTML = ""; return; }
      if (out) addMsg(out, "assistant");
    });
  });
}
