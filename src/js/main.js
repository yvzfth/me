import "@xterm/xterm/css/xterm.css";
import { initScene } from "./three-scene.js";
import { initTerminal } from "./terminal.js";
import { initChat } from "./chat.js";
import { skills, projects, contacts, experience, stats } from "./data.js";

// --- 3D background ---
const scene = initScene(document.getElementById("bg"));

// --- terminal (accessible via 'terminal' command) ---
initTerminal();

// --- chat interface ---
initChat(scene);

// --- render content sections from data ---
function render() {
  const skillsGrid = document.getElementById("skills-grid");
  skillsGrid.innerHTML = skills
    .map(
      (s) => `<div class="chip">
        <span class="chip-name">${s.name}</span>
        <span class="chip-level chip-${s.level}">${s.level}</span>
      </div>`,
    )
    .join("");

  const projectsGrid = document.getElementById("projects-grid");
  projectsGrid.innerHTML = projects
    .map(
      (p) => `<article class="card">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        <div class="card-links">
          <a href="${p.url}" target="_blank" rel="noopener">source →</a>
          ${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">live ↗</a>` : ""}
        </div>
      </article>`,
    )
    .join("");

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = experience
    .map(
      (e) => `<div class="tl-item">
        <div class="tl-period">${e.period}</div>
        <div class="tl-body">
          <h3>${e.role} <span class="tl-org">@ ${e.org}</span></h3>
          <p>${e.desc}</p>
          <div class="tags">${e.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        </div>
      </div>`,
    )
    .join("");

  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = stats
    .map(
      (s) => `<div class="stat">
        <span class="stat-num" data-target="${s.value}">0</span>
        <span class="stat-label">${s.label}</span>
      </div>`,
    )
    .join("");

  const contactList = document.getElementById("contact-list");
  contactList.innerHTML = contacts
    .map(
      (c) =>
        `<li><span class="contact-label">${c.label}</span>
         <a href="${c.href}" target="_blank" rel="noopener">${c.value}</a></li>`,
    )
    .join("");

  document.getElementById("year").textContent = new Date().getFullYear();
}
render();

// --- section reveal (Apple-style) ---
// Sections snap to the viewport as you scroll. The moment one lands, its whole
// content block animates in AT ONCE — one motion for the section, no per-item
// stagger and nothing tied to scroll offset.
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      // fires when the section is centred enough to be "the" section on screen
      if (e.intersectionRatio >= 0.45) e.target.classList.add("in");
    }
  },
  { threshold: [0, 0.45, 0.8] },
);
document.querySelectorAll(".panel").forEach((el) => sectionObserver.observe(el));

// --- smooth-scroll nav links ---
document.querySelectorAll("[data-nav]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.remove("nav-open");
    const id = a.getAttribute("href").slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  });
});

// --- hamburger toggle (mobile) ---
const burger = document.getElementById("nav-burger");
if (burger) {
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = document.body.classList.toggle("nav-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("nav-open") && !e.target.closest(".nav")) {
      document.body.classList.remove("nav-open");
      burger.setAttribute("aria-expanded", "false");
    }
  });
}

// --- brand: back home (exits chat session, clears chat, restores the hole) ---
function goHome() {
  document.body.classList.remove("chat-session");
  scene.reset?.();
  const feed = document.getElementById("chat-messages");
  if (feed) feed.innerHTML = "";
  const ph = document.getElementById("chat-placeholder");
  if (ph) ph.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.getElementById("brand").addEventListener("click", goHome);

// --- scroll progress bar ---
const progress = document.getElementById("progress");
window.addEventListener(
  "scroll",
  () => {
    const max = document.body.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  },
  { passive: true },
);

// --- count-up stats when the strip scrolls into view ---
const statsObserver = new IntersectionObserver(
  (entries) => {
    if (!entries[0].isIntersecting) return;
    statsObserver.disconnect();
    document.querySelectorAll(".stat-num").forEach((el) => {
      const target = +el.dataset.target;
      const t0 = performance.now();
      const dur = 1400;
      (function tick(t) {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  },
  { threshold: 0.4 },
);
statsObserver.observe(document.getElementById("stats"));

// --- theme cycle button (shares CSS vars with the terminal's `theme` cmd) ---
const THEMES = [
  ["#00ffcc", "#bc13fe"],
  ["#ff7edb", "#36f9f6"],
  ["#ffd93d", "#ff6b6b"],
  ["#7cf67c", "#00b4ff"],
];
let themeIdx = 0;
document.getElementById("nav-theme").addEventListener("click", () => {
  themeIdx = (themeIdx + 1) % THEMES.length;
  const [a, b] = THEMES[themeIdx];
  document.documentElement.style.setProperty("--accent", a);
  document.documentElement.style.setProperty("--accent2", b);
});

// --- live clock in the footer ---
const clock = document.getElementById("clock");
(function tickClock() {
  clock.textContent = new Date().toLocaleTimeString();
  setTimeout(tickClock, 1000);
})();

// --- konami code easter egg: rainbow mode ---
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let kIdx = 0;
window.addEventListener("keydown", (e) => {
  kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (kIdx === KONAMI.length) {
    kIdx = 0;
    document.body.classList.toggle("rainbow");
  }
});
