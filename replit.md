# Portfolio Site — Cid Kageno

## Overview
A modern, animated personal developer portfolio for Cid Kageno, a Full Stack Developer and AI Systems Builder. Features a dark aesthetic with ambient animated backgrounds, scroll-triggered reveals, a typewriter hero, and an integrated "Ani Chat" AI assistant.

## Design System
- **Theme**: Dark-first with purple/cyan gradient accents (`#7c6af7`, `#06b6d4`)
- **Typography**: Inter (UI) + JetBrains Mono (code/labels)
- **Animations**: Floating orb background, spinning avatar ring, typewriter effect, scroll reveal, glow effects
- **Components**: Glassmorphism navbar, gradient cards, animated stats, pill-style tech stack badges

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no build step
- **Fonts**: Google Fonts (Inter + JetBrains Mono) via CDN
- **Components**: Native Web Components (Custom Elements API)
- **AI Chat**: Iframe-embedded chat calling `https://hybrid-ani.onrender.com/chat`
- **Data**: GitHub API for dynamic repository fetching

## Project Structure
```
.
├── assets/           # Static assets (profile.png)
├── chat/             # Ani Chat sub-application (iframe)
│   ├── components/   # Chat-specific navbar/footer
│   ├── index.html
│   ├── main.js
│   └── style.css
├── components/       # Shared Web Components
│   ├── navbar.js     # <custom-navbar> — floating pill nav with scroll effect
│   └── footer.js     # <custom-footer>
├── index.html        # Main portfolio (hero, projects, tools, contact)
├── style.css         # All styles (animations, layout, components)
└── README.md
```

## Running the Project
Pure static site, served with Python's built-in HTTP server:
```
python3 -m http.server 5000 --bind 0.0.0.0
```

## Deployment
Configured as a **static** deployment with `publicDir: "."`.
