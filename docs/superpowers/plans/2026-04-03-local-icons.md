# Local Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Remix Icon glyphs to button states, quality tier labels, and release date rows — using a locally bundled font, no CDN.

**Architecture:** Download `remixicon.woff2` and extract needed icon CSS into a `buildIconFontCSS()` helper that injects a dynamic `@font-face` (via `chrome.runtime.getURL()`) plus hardcoded glyph classes into both shadow DOMs. A new `src/content/icons.ts` file holds all icon constants and is covered by a unit test.

**Tech Stack:** TypeScript, Remix Icon (local woff2), Shadow DOM, Chrome MV3, Vite, Jest

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `public/icons/remixicon/remixicon.woff2` | Create (download) | Font binary |
| `public/manifest.json` | Modify | Add `web_accessible_resources` for the font |
| `src/content/icons.ts` | Create | Icon constants: `BUTTON_ICON`, `RELEASE_ICON`, `QUALITY_ICON` |
| `src/content/icons.test.ts` | Create | Unit test: all button states have icon entries |
| `src/content/index.ts` | Modify | `buildIconFontCSS()`, CSS classes, update `applyButtonState()`, `populateReleasesPanel()`, `attachClickHandler()`, quality labels in `init()` |

---

## Task 1: Download font + update manifest

**Skills:** `chrome-extension-development`

**Files:**
- Create: `public/icons/remixicon/remixicon.woff2`
- Modify: `public/manifest.json`

- [ ] **Step 1: Install remixicon as a dev dependency to access the font**

  ```
  npm install --save-dev remixicon
  ```

- [ ] **Step 2: Copy the woff2 font file into the extension's public folder**

  ```
  mkdir public\icons\remixicon
  copy node_modules\remixicon\fonts\remixicon.woff2 public\icons\remixicon\remixicon.woff2
  ```

- [ ] **Step 3: Add `web_accessible_resources` to `public/manifest.json`**

  Add after the `"action"` block:

  ```json
  "web_accessible_resources": [
    {
      "resources": ["icons/remixicon/remixicon.woff2"],
      "matches": ["*://letterboxd.com/*"]
    }
  ]
  ```

- [ ] **Step 4: Verify the build still passes**

  ```
  npm run build
  ```

  Expected: no errors; `dist/icons/remixicon/remixicon.woff2` present in output.

- [ ] **Step 5: Commit**

  ```
  git add public/icons/remixicon/remixicon.woff2 public/manifest.json
  git commit -m "feat: bundle remixicon woff2 font, add web_accessible_resources"
  ```

---

## Task 2: Icon constants + unit test

**Skills:** `javascript-typescript-jest`, `typescript-advanced-types`

**Files:**
- Create: `src/content/icons.ts`
- Create: `src/content/icons.test.ts`

- [ ] **Step 1: Write the failing test first**

  Create `src/content/icons.test.ts`:

  ```typescript
  import { BUTTON_ICON } from './icons'

  const ALL_BUTTON_STATES = [
    'requestable', 'requesting', 'success',
    'pending-approval', 'approved', 'declined',
    'failed', 'processing', 'partial',
    'available', 'blocklisted', 'not-configured', 'error',
  ] as const

  it('BUTTON_ICON has a ri- entry for every non-loading ExtendedUiState', () => {
    for (const state of ALL_BUTTON_STATES) {
      expect(BUTTON_ICON[state]).toMatch(/^ri-/)
    }
  })
  ```

  Note: `loading` is intentionally excluded — it renders no icon per spec.

- [ ] **Step 2: Run the test to confirm it fails**

  ```
  npm test -- --testPathPattern=icons
  ```

  Expected: FAIL — "Cannot find module './icons'"

- [ ] **Step 3: Create `src/content/icons.ts` with all icon constants**

  ```typescript
  export const QUALITY_ICON = {
    'hd': 'ri-hd-line',
    '4k': 'ri-4k-line',
  } as const

  export const RELEASE_ICON = {
    theatrical: 'ri-ticket-line',
    digital:    'ri-cloud-line',
    physical:   'ri-dvd-line',
    none:       'ri-calendar-event-line',
  } as const

  export const BUTTON_ICON: Record<string, string> = {
    'requestable':      'ri-add-circle-line',
    'requesting':       'ri-loader-line',
    'success':          'ri-checkbox-line',
    'pending-approval': 'ri-time-line',
    'approved':         'ri-checkbox-line',
    'declined':         'ri-close-circle-line',
    'failed':           'ri-close-circle-line',
    'processing':       'ri-time-line',
    'partial':          'ri-checkbox-line',
    'available':        'ri-checkbox-line',
    'blocklisted':      'ri-close-circle-line',
    'not-configured':   'ri-settings-line',
    'error':            'ri-close-circle-line',
    // 'loading': no icon - text only
  }
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```
  npm test -- --testPathPattern=icons
  ```

  Expected: PASS

- [ ] **Step 5: Run full test suite to confirm nothing regressed**

  ```
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```
  git add src/content/icons.ts src/content/icons.test.ts
  git commit -m "feat: add icon map constants with unit test coverage"
  ```

---

## Task 3: Shadow DOM CSS — font, icon classes, grid layout

**Skills:** `chrome-extension-ui`, `chrome-extension-development`

**Files:**
- Modify: `src/content/index.ts` — add `buildIconFontCSS()`, update `widgetCSS()`, `releasesPanelCSS()`, `init()`

The approach: `buildIconFontCSS()` returns a self-contained CSS string with:
1. `@font-face` using the dynamic URL from `chrome.runtime.getURL()`
2. The base `[class^="ri-"]` font-family rule
3. The 12 specific icon glyph classes (codepoints recorded in Task 1, Step 3)
4. `.seerr-icon` and `.seerr-icon--spin` utility classes

This string is appended to both `widgetCSS()` and `releasesPanelCSS()` shadow DOM style elements.

- [ ] **Step 1: Add `buildIconFontCSS()` to `src/content/index.ts`**

  Add after the imports:

  ```typescript
  function buildIconFontCSS(): string {
    const woff2 = chrome.runtime.getURL('icons/remixicon/remixicon.woff2')
    return `
      @font-face {
        font-family: 'remixicon';
        src: url('${woff2}') format('woff2');
        font-weight: normal;
        font-style: normal;
      }
      [class^="ri-"], [class*=" ri-"] {
        font-family: 'remixicon' !important;
        font-style: normal;
        -webkit-font-smoothing: antialiased;
      }
      /* --- glyph classes --- */
      .ri-hd-line:before             { content: "\\ee02"; }
      .ri-4k-line:before             { content: "\\ea04"; }
      .ri-ticket-line:before         { content: "\\f20d"; }
      .ri-cloud-line:before          { content: "\\eb9d"; }
      .ri-dvd-line:before            { content: "\\ec74"; }
      .ri-calendar-event-line:before { content: "\\eb25"; }
      .ri-add-circle-line:before     { content: "\\ea11"; }
      .ri-loader-line:before         { content: "\\eeca"; }
      .ri-checkbox-line:before       { content: "\\eb85"; }
      .ri-time-line:before           { content: "\\f20f"; }
      .ri-close-circle-line:before   { content: "\\eb97"; }
      .ri-settings-line:before       { content: "\\f0ee"; }
      /* --- icon utilities --- */
      .seerr-icon {
        display: inline-flex;
        align-items: center;
        font-size: 1em;
        line-height: 1;
        vertical-align: middle;
      }
      .seerr-icon--spin {
        animation: seerr-spin 1s linear infinite;
      }
      @keyframes seerr-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `
  }
  ```

- [ ] **Step 2: Inject `buildIconFontCSS()` into both shadow DOM style elements**

  In `init()`, where `style.textContent = widgetCSS()` is set, append the icon CSS:

  ```typescript
  style.textContent = widgetCSS() + buildIconFontCSS()
  ```

  Do the same for the releases panel style:

  ```typescript
  releasesStyle.textContent = releasesPanelCSS() + buildIconFontCSS()
  ```

- [ ] **Step 3: Update `.seerr-release-item` CSS in `releasesPanelCSS()` for grid alignment**

  Replace the existing `.seerr-release-item` rule with:

  ```css
  .seerr-release-item {
    display: grid;
    grid-template-columns: 1.25em 1fr;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #bbccdd;
    line-height: 18px;
  }
  ```

  Also remove the now-unused `.seerr-release-label` rule from `releasesPanelCSS()`. Delete this entire block:

  ```css
  .seerr-release-label {
    color: #bbccdd;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
    margin-bottom: 2px;
  }
  ```

- [ ] **Step 4: Run tests**

  ```
  npm test
  ```

  Expected: all pass.

- [ ] **Step 5: Build to check for TypeScript errors**

  ```
  npm run build
  ```

  Expected: no errors.

- [ ] **Step 6: Commit**

  ```
  git add src/content/index.ts
  git commit -m "feat: inject remixicon font + icon utility CSS into shadow DOMs"
  ```

---

## Task 4: Quality tier labels → icons

**Skills:** `chrome-extension-ui`

**Files:**
- Modify: `src/content/index.ts` — `init()`, import from `icons.ts`

- [ ] **Step 1: Import icon constants at the top of `index.ts`**

  ```typescript
  import { BUTTON_ICON, RELEASE_ICON, QUALITY_ICON } from './icons'
  ```

- [ ] **Step 2: Replace quality label text with icon `<i>` elements in `init()`**

  Find where `hdLabel` and `fourKLabel` are created:

  ```typescript
  hdLabel.textContent = 'HD'
  // ...
  fourKLabel.textContent = '4K'
  ```

  Replace with:

  ```typescript
  hdLabel.innerHTML = `<i class="${QUALITY_ICON['hd']} seerr-icon" aria-hidden="true"></i>`
  // ...
  fourKLabel.innerHTML = `<i class="${QUALITY_ICON['4k']} seerr-icon" aria-hidden="true"></i>`
  ```

  > The `aria-label` on the button column is unchanged; the icon is decorative only.

- [ ] **Step 3: Run tests**

  ```
  npm test
  ```

  Expected: all pass.

- [ ] **Step 4: Build to check for TypeScript errors**

  ```
  npm run build
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```
  git add src/content/index.ts
  git commit -m "feat: replace HD/4K text labels with icons"
  ```

---

## Task 5: Button state icons + hover fix

**Skills:** `chrome-extension-ui`

**Files:**
- Modify: `src/content/index.ts` — `applyButtonState()`, `attachClickHandler()`

- [ ] **Step 1: Update `applyButtonState()` to render icon + label**

  Current:
  ```typescript
  btn.textContent = STATE_LABELS[state]
  ```

  Replace with:
  ```typescript
  const icon = BUTTON_ICON[state]
  const label = STATE_LABELS[state]
  if (icon) {
    const spinClass = state === 'requesting' ? ' seerr-icon--spin' : ''
    btn.innerHTML = `<i class="${icon} seerr-icon${spinClass}" aria-hidden="true"></i> ${label}`
  } else {
    btn.textContent = label
  }
  ```

  > `innerHTML` is safe here — `icon` comes from the hardcoded `BUTTON_ICON` constant, and `label` comes from the hardcoded `STATE_LABELS` constant. Neither is user input.

- [ ] **Step 2: Fix the hover restore in `attachClickHandler()`**

  `mouseenter` sets `btn.textContent = 'Open'` which clobbers any icon — that's intentional (show plain "Open" on hover). But `mouseleave` currently sets `btn.textContent = STATE_LABELS[state]` which misses the icon.

  Find the mouseleave handler in `attachClickHandler()`:
  ```typescript
  btn.addEventListener('mouseleave', () => {
    btn.textContent = STATE_LABELS[state]
  })
  ```

  Replace with:
  ```typescript
  btn.addEventListener('mouseleave', () => {
    applyButtonState(btn, state)
  })
  ```

- [ ] **Step 3: Run tests**

  ```
  npm test
  ```

  Expected: all pass.

- [ ] **Step 4: Build**

  ```
  npm run build
  ```

- [ ] **Step 5: Commit**

  ```
  git add src/content/index.ts
  git commit -m "feat: add state icons to request buttons, fix hover restore"
  ```

---

## Task 6: Release row icons + grid layout

**Skills:** `chrome-extension-ui`

**Files:**
- Modify: `src/content/index.ts` — `populateReleasesPanel()`

- [ ] **Step 1: Update `populateReleasesPanel()` to use icons and grid layout**

  Replace the function body. Each row becomes a two-column grid item: icon | date text.

  ```typescript
  function populateReleasesPanel(
    container: HTMLDivElement,
    theatrical: string | null,
    digital: string | null,
    physical: string | null
  ): void {
    container.textContent = ''

    if (theatrical || digital || physical) {
      const rows: Array<{ key: keyof typeof RELEASE_ICON; date: string | null }> = [
        { key: 'theatrical', date: theatrical },
        { key: 'digital',    date: digital },
        { key: 'physical',   date: physical },
      ]
      for (const { key, date } of rows) {
        if (!date) continue
        const item = document.createElement('span')
        item.className = 'seerr-release-item'
        item.innerHTML = `<i class="${RELEASE_ICON[key]} seerr-icon" aria-hidden="true"></i><span>${date}</span>`
        container.appendChild(item)
      }
    } else {
      const item = document.createElement('span')
      item.className = 'seerr-release-item'
      item.innerHTML = `<i class="${RELEASE_ICON.none} seerr-icon" aria-hidden="true"></i><span>No release dates</span>`
      container.appendChild(item)
    }
  }
  ```

  > `innerHTML` is safe here — `RELEASE_ICON[key]` is a hardcoded class name from `icons.ts`, and `date` is a pre-formatted date string produced by the background service worker's `toLocaleDateString()` call — it contains only alphanumeric characters, commas, and spaces; no HTML injection risk.

- [ ] **Step 2: Run tests**

  ```
  npm test
  ```

  Expected: all pass.

- [ ] **Step 3: Build**

  ```
  npm run build
  ```

- [ ] **Step 4: Commit**

  ```
  git add src/content/index.ts
  git commit -m "feat: replace release row text labels with icons, align with grid"
  ```

---

## Task 7: Manual smoke test

**Skills:** `verification-before-completion`, `webapp-testing`

Load the built extension in Chrome (`chrome://extensions` → "Load unpacked" → `dist/`), open any Letterboxd film page, and verify:

- [ ] 4K and HD columns show their icons instead of text
- [ ] Each request button shows the correct icon for its state
- [ ] The `requesting` state shows a spinning icon
- [ ] Release date rows show icons (ticket/cloud/dvd) instead of text labels, dates aligned
- [ ] "No release dates" row shows the calendar icon
- [ ] Hovering a link-out button shows "Open" text, mouse-leave restores icon correctly
- [ ] With DevTools → Network throttling set to "Offline", text labels remain readable (graceful degradation)
