# seerr-helper

A Chrome extension that enhances Letterboxd movie pages by displaying Overseerr/Jellyseerr request status and availability, with a one-click request button injected directly into the page.

## Project Overview

- **Extension type**: Chrome Extension (Manifest V3)
- **Target site**: `letterboxd.com/film/*`
- **Integration**: Overseerr / Jellyseerr REST API (OpenAPI spec in `external-references/seerr-api.yml`)
- **Language**: TypeScript
- **Build tool**: Vite

## How It Works

1. Content script runs on Letterboxd film pages
2. Scrapes the movie title / TMDB ID from the page
3. Queries the user-configured Overseerr/Jellyseerr instance via the background service worker
4. Injects a status badge and request button into the Letterboxd UI using Shadow DOM

## Key Integration Points

- **Seerr API base URL** and **API key** are stored in `chrome.storage.local` (configured via options page)
- API calls are made from the **background service worker** to avoid CORS issues
- Content script communicates with the background via `chrome.runtime.sendMessage`

## Project Structure

```
seerr-helper/
├── manifest.json
├── src/
│   ├── content/          # Injected into letterboxd.com/film/* pages
│   ├── background/       # Service worker — API calls, storage
│   ├── options/          # Settings page (API URL, API key)
│   └── utils/            # Shared types and helpers
├── icons/
├── external-references/
│   └── seerr-api.yml     # Overseerr OpenAPI spec
└── vite.config.ts
```

## Available Skills

### Chrome Extension

| Skill | Source | Purpose |
|---|---|---|
| `chrome-extension-development` | mindrally/skills | MV3 architecture, Chrome APIs, service workers, security |
| `browser-extension-builder` | sickn33/antigravity-awesome-skills | Project structure, manifest template, content script patterns |
| `chrome-extension-ui` | pproenca/dot-skills | Shadow DOM injection, popup/content script UI rules, accessibility |

### TypeScript & Code Quality

| Skill | Source | Purpose |
|---|---|---|
| `typescript-advanced-types` | wshobson/agents | Type-safe API client, discriminated unions, generics, utility types |

### Testing

| Skill | Source | Purpose |
|---|---|---|
| `javascript-typescript-jest` | github/awesome-copilot | Unit and integration testing with Jest |
| `webapp-testing` | anthropics/skills | E2E and UI testing patterns |

### Agent Workflow

| Skill | Source | Purpose |
|---|---|---|
| `brainstorming` | obra/superpowers | Explore intent and requirements before implementation |
| `writing-plans` | obra/superpowers | Write structured implementation plans before touching code |
| `executing-plans` | obra/superpowers | Execute written plans with review checkpoints |
| `subagent-driven-development` | obra/superpowers | Run independent tasks in parallel via subagents |
| `dispatching-parallel-agents` | obra/superpowers | Coordinate 2+ independent tasks without shared state |
| `requesting-code-review` | obra/superpowers | Verify work meets requirements before merging |
| `receiving-code-review` | obra/superpowers | Evaluate and respond to code review feedback rigorously |
| `verification-before-completion` | obra/superpowers | Run verification commands before claiming work is done |
| `using-superpowers` | obra/superpowers | Establish how to find and invoke skills at session start |
| `find-skills` | vercel-labs/skills | Discover and install new skills via `npx skills find` |
