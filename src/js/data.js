// Single source of truth for site content + the terminal's virtual filesystem.
// Profile/projects pulled from github.com/yvzfth (public API data).

export const profile = {
  name: "Fatih Yavuz",
  role: "React Developer",
  location: "Istanbul, Türkiye",
  github: "yvzfth",
  stack: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js"],
};

export const skills = [
  { name: "JavaScript", level: "expert" },
  { name: "TypeScript", level: "expert" },
  { name: "React", level: "expert" },
  { name: "Next.js", level: "advanced" },
  { name: "Node.js", level: "advanced" },
  { name: "Three.js / WebGL", level: "advanced" },
  { name: "Swift", level: "intermediate" },
  { name: "Rust", level: "intermediate" },
  { name: "Python", level: "intermediate" },
  { name: "PHP / Laravel", level: "intermediate" },
];

// Real repos from github.com/yvzfth
export const projects = [
  {
    id: "digitalavm",
    name: "digitalAVM",
    desc: "Digital mall platform built with TypeScript — live on Vercel.",
    tags: ["TypeScript", "Next.js", "Vercel"],
    url: "https://github.com/yvzfth/digitalAVM",
    live: "https://digitalavm.vercel.app",
  },
  {
    id: "amadeus",
    name: "amadeus",
    desc: "TypeScript web app deployed on Vercel.",
    tags: ["TypeScript", "React"],
    url: "https://github.com/yvzfth/amadeus",
    live: "https://amadeus-three.vercel.app",
  },
  {
    id: "figner",
    name: "figner",
    desc: "TypeScript app with a live Vercel deployment.",
    tags: ["TypeScript", "Next.js"],
    url: "https://github.com/yvzfth/figner",
    live: "https://figner.vercel.app",
  },
  {
    id: "printer-usage",
    name: "printer_usage",
    desc: "Printer usage reporting dashboard — live on Vercel.",
    tags: ["TypeScript", "Dashboard"],
    url: "https://github.com/yvzfth/printer_usage",
    live: "https://printer-report.vercel.app",
  },
  {
    id: "timeagoplus",
    name: "timeagoplus",
    desc: "Time-ago formatting library written in Rust.",
    tags: ["Rust", "Library"],
    url: "https://github.com/yvzfth/timeagoplus",
  },
  {
    id: "gridworld",
    name: "gridworld",
    desc: "Grid-world environment experiment in Rust.",
    tags: ["Rust"],
    url: "https://github.com/yvzfth/gridworld",
  },
];

export const experience = [
  {
    period: "2023 — now",
    role: "React Developer",
    org: "Freelance / Remote",
    desc: "Building web apps with React, Next.js, and TypeScript — several live on Vercel.",
    tags: ["React", "Next.js", "TypeScript"],
  },
  {
    period: "2021 — 2023",
    role: "Full-Stack Developer",
    org: "Projects",
    desc: "Shipped full-stack apps across TypeScript, PHP/Laravel, and Python; explored iOS with Swift.",
    tags: ["TypeScript", "Laravel", "Swift"],
  },
  {
    period: "2020 — 2021",
    role: "Getting started",
    org: "GitHub since Sep 2020",
    desc: "First public repos: JavaScript, CSS challenges, and machine-learning notebooks.",
    tags: ["JavaScript", "Jupyter"],
  },
];

// Real numbers from the GitHub profile
export const stats = [
  { label: "years on GitHub", value: 6 },
  { label: "public repos", value: 45 },
  { label: "languages used", value: 10 },
  { label: "deployed apps", value: 4 },
];

export const contacts = [
  { label: "GitHub", value: "github.com/yvzfth", href: "https://github.com/yvzfth" },
  { label: "LinkedIn", value: "linkedin.com/in/yvzfth", href: "https://www.linkedin.com/in/yvzfth" },
  { label: "Email", value: "fatihyavuz.js@gmail.com", href: "mailto:fatihyavuz.js@gmail.com" },
];

// Virtual filesystem: dirs map to page sections, files are `cat`-able.
export const fs = {
  dirs: ["about", "skills", "experience", "projects", "contact"],
  files: {
    "README.md": `# ${profile.name} — ${profile.role}\n\nWelcome to my interactive portfolio.\nGitHub: https://github.com/yvzfth · 45 public repos\nType 'ls' to look around, 'open projects' to jump to a section,\nor 'help' for every command.`,
    "about.txt": `React developer from Istanbul. I build web apps with React,\nNext.js, and TypeScript — with side quests into Rust, Swift, and Python.\n45 public repos and counting.`,
    "resume.txt": `${profile.name}\n${profile.role} · ${profile.location}\nGitHub:   github.com/yvzfth\nLinkedIn: linkedin.com/in/yvzfth\nStack:    ${profile.stack.join(", ")}\n\nTip: run 'open contact' to get in touch.`,
    ".zshrc": `# fatih's shell config\nalias dev="npm run dev"\nalias build="npm run build"\nexport EDITOR=nvim`,
  },
};
