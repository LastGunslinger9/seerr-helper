# seerr-helper

A Chrome extension that enhances Letterboxd movie pages by displaying Seerr request status and availability, with per-quality (HD/4K) request buttons injected directly into the Letterboxd sidebar panel.

## Project Overview

- **Extension type**: Chrome Extension (Manifest V3)
- **Target site**: `letterboxd.com/film/*`
- **Integration**: Seerr REST API (OpenAPI spec in `external-references/seerr-api.yml`)
- **Language**: TypeScript
- **Build tool**: Vite
- **Tests**: Jest + ts-jest

## Commands

```
npm run build   # compile to dist/
npm test        # run Jest test suite
```

> **Always run `npm run build` after every code change.** The extension loads from `dist/` — source changes have no effect until built.

> Load the extension by pointing Chrome's "Load unpacked" at `dist/`.

## How It Works

1. Content script runs on Letterboxd film pages at `document_idle`
2. Uses a MutationObserver to wait for the React-rendered sidebar (`ul.js-actions-panel`)
3. Resolves the TMDB ID from page data attributes or a fallback outbound link
4. Sends messages to the background service worker, which queries the Seerr API
5. Injects a widget into the sidebar using Shadow DOM

## Architecture

```
content script  ──sendMessage──▶  background service worker  ──fetch──▶  Seerr API
      ▲                                      │
      └─────────────── response ─────────────┘
```

- **CORS**: All `fetch` calls happen in the background service worker, never the content script
- **Storage**: `chrome.storage.sync` holds `seerr_base_url` and `seerr_api_key`
- **Shadow DOM**: Widget is scoped inside a shadow root to prevent style leakage

## Project Structure

```
seerr-helper/
├── public/
│   └── manifest.json
├── src/
│   ├── content/          # Widget UI, Shadow DOM injection
│   ├── background/       # Service worker — API calls, message handling
│   ├── options/          # Settings page (base URL + API key)
│   └── utils/
│       ├── types.ts          # Shared types: UiState, media/request shapes, messages
│       └── resolveUiState.ts # Pure fn: (mediaStatus, requests[]) → UiState
├── external-references/
│   ├── seerr-api.yml              # Seerr OpenAPI spec
│   └── status-codes-reference.md  # Canonical badge colors
└── vite.config.ts
```

## Terminology

- Use **"Seerr"** throughout — not "Overseerr", "Jellyseerr", or "Overseerr / Jellyseerr"
- The product supports both Overseerr and Jellyseerr under the hood, but the UI and all user-facing text uses "Seerr" as the unified term

## Key Concepts

### UiState
A single resolved display state per quality tier, derived by `resolveUiState()` from the raw Seerr API response. Current values: `requestable | pending-approval | approved | declined | failed | processing | partial | available | blocklisted`.

### Message passing
Content script ↔ background communicate via typed `MessageRequest` / `MessageResponse` discriminated unions defined in `src/utils/types.ts`. To add new data to a response, update the relevant union variant **and** the background handler.

### Widget states
Content script adds its own transient states on top of `UiState`: `loading | not-configured | requesting | success | error`. These never leave the content script.

## Seerr API Notes

- `GET /api/v1/movie/{tmdbId}` — returns `mediaInfo` (status, status4k, requests[]) and `releases`
- `POST /api/v1/request` — body: `{ mediaType, mediaId: tmdbId, is4k }`
- Auth via `X-Api-Key` header
- Release date types in `releases.results[].release_dates[].type`: `4` = Digital, `5` = Physical

## Available Skills

### Chrome Extension

| Skill | Purpose |
|---|---|
| `chrome-extension-development` | MV3 architecture, Chrome APIs, service workers, security |
| `browser-extension-builder` | Project structure, manifest, content script patterns |
| `chrome-extension-ui` | Shadow DOM injection, popup/content script UI, accessibility |

### UI & Styling

| Skill | Purpose |
|---|---|
| `frontend-design` | Production-grade UI components, polished styling |
| `modern-css` | CSS nesting, custom props, logical properties, modern features |

### TypeScript & Testing

| Skill | Purpose |
|---|---|
| `typescript-advanced-types` | Type-safe API client, discriminated unions, utility types |
| `javascript-typescript-jest` | Jest unit and integration testing |
| `webapp-testing` | E2E and UI testing patterns |

### Agent Workflow

| Skill | Purpose |
|---|---|
| `brainstorming` | Explore intent and requirements before implementation |
| `writing-plans` | Write structured plans before touching code |
| `executing-plans` | Execute plans with review checkpoints |
| `subagent-driven-development` | Run independent tasks in parallel |
| `dispatching-parallel-agents` | Coordinate 2+ independent tasks without shared state |
| `requesting-code-review` | Verify work meets requirements before merging |
| `receiving-code-review` | Evaluate and respond to code review feedback |
| `verification-before-completion` | Run verification commands before claiming work is done |
| `using-superpowers` | Establish how to find and invoke skills at session start |
| `find-skills` | Discover and install new skills via `npx skills find` |
