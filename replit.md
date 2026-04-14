# Portfolio Site - Cid Kageno

## Overview
A personal developer portfolio for Cid Kageno, a Full Stack Developer and AI Systems Builder. The site showcases projects, engineering focus, and includes an integrated "Ani Chat" AI assistant.

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Styling**: Tailwind CSS via CDN + custom `style.css`
- **Components**: Native Web Components (Custom Elements API)
- **AI Chat**: Iframe-embedded chat interface that calls an external API at `https://hybrid-ani.onrender.com/chat`
- **Data**: GitHub API for dynamic repository fetching

## Project Structure
```
.
├── assets/           # Static assets (profile.png, etc.)
├── chat/             # AI Chat sub-application
│   ├── components/   # Chat-specific navbar and footer
│   ├── index.html    # Chat entry point (loaded in iframe)
│   ├── main.js       # Chat logic and API calls
│   └── style.css     # Chat-specific styles
├── components/       # Shared Web Components
│   ├── navbar.js     # <custom-navbar> element
│   └── footer.js     # <custom-footer> element
├── index.html        # Main portfolio landing page
├── style.css         # Global styles
└── README.md         # Project bio/documentation
```

## Running the Project
The site is a pure static site with no build step. It is served via Python's built-in HTTP server:

```
python3 -m http.server 5000 --bind 0.0.0.0
```

## Deployment
Configured as a **static** deployment with `publicDir: "."`.
