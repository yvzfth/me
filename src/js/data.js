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
    id: "isoai",
    name: "isoai",
    desc: "InsightFace-based face recognition repo built for the Istanbul Chamber of Industry.",
    tags: ["InsightFace", "Face Recognition", "Python"],
    url: "https://github.com/ISOBTAI/isoai",
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
    period: "Oct 2025 — now",
    role: "ICT Assistant",
    org: "United Nations Development Programme",
    desc: "Daily ICT support for 200+ users; administers Microsoft 365 (Azure AD, Intune, SharePoint) across 250+ devices, automated a printer usage reporting system with a monitoring dashboard, supports ICT procurement (~$50K/yr) and digitalization with SharePoint and Power Automate.",
    tags: ["Microsoft 365", "Azure AD", "Intune", "SharePoint"],
  },
  {
    period: "Apr 2025 — Sep 2025",
    role: "ICT Intern",
    org: "United Nations Development Programme",
    desc: "Built a SharePoint-based inventory tracking system with reminder workflows for 100+ ICT assets and improved Newcomer/Separation automation workflows.",
    tags: ["SharePoint", "Automation"],
  },
  {
    period: "Oct 2024 — Mar 2025",
    role: "Software Developer",
    org: "Supradent",
    desc: "Refactored a monolithic clinic app into a service-oriented architecture with Next.js API routes and Node.js, integrated AWS SNS/SES reminders (15% fewer no-shows), cut heavy MongoDB aggregations to under 200ms, shipped a TypeScript/Chart.js analytics dashboard, and added JWT + RBAC and GitHub Actions CI/CD.",
    tags: ["Next.js", "TypeScript", "Node.js", "MongoDB", "AWS"],
  },
  {
    period: "Jul 2024 — Sep 2024",
    role: "AI Engineer",
    org: "Istanbul Chamber of Industry",
    desc: "Built a real-time (~60 FPS) InsightFace-based face recognition system from IP cameras for a 200-person assembly — multi-angle identification (yaw ±60°, pitch ±30°) with emotion, age, and gender classification, plus speaker-labelled meeting transcripts via diarization; models trained on Python/CUDA/ONNX/CoreML and deployed with Docker on a Linux GPU server.",
    tags: ["Python", "InsightFace", "CUDA", "ONNX", "CoreML", "Docker"],
  },
  {
    period: "Mar 2024 — Jun 2024",
    role: "AI Engineer Intern",
    org: "Istanbul Chamber of Industry",
    desc: "Supported AI systems for industrial applications on 10K+ image and audio samples — preprocessing, labeling, and model training with Python on GPU (CUDA), plus deployment to Linux environments.",
    tags: ["Python", "CUDA", "ML"],
  },
  {
    period: "Feb 2022 — Feb 2024",
    role: "Software Developer",
    org: "Supradent",
    desc: "Full-stack web app used by 20+ staff managing all clinic/lab operations for ~2,000 patients/month — Next.js, React, TypeScript, MongoDB — with Google OAuth, real-time updates, and modules for patient management, pricing, and reporting.",
    tags: ["Next.js", "React", "TypeScript", "MongoDB"],
  },
  {
    period: "Jun 2020 — Jan 2022",
    role: "Software Developer",
    org: "Singularity Software Technologies",
    desc: "Built and maintained client web applications with scalable back-end services and REST APIs, e-commerce scraping pipelines processing 10,000+ products, and agile delivery.",
    tags: ["JavaScript", "REST APIs", "Web Scraping"],
  },
  {
    period: "Jul 2018 — May 2020",
    role: "IT Support Technician",
    org: "Retro Bilisim Hizmetleri",
    desc: "First-line support for 20+ on-site clients (15-20 tickets/week via Jira), OS imaging and hardware deployment, Active Directory user administration, Office 365/mail support, network peripherals, and nightly NAS backups.",
    tags: ["Active Directory", "Office 365", "Networking"],
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
