# Release Dates Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move release dates (theatrical, digital, physical) from inside the HD/4K widget to a separate, always-visible `<li>` panel positioned above the request status widget in the Letterboxd sidebar.

**Architecture:** Extract theatrical release (TMDB type 3 wide, fallback to type 2 limited), digital (type 4), and physical (type 5) from the Seerr API response in the background service worker. Inject a new `<li id="seerr-releases-panel">` into the sidebar before the existing seerr-helper widget, with its own Shadow DOM wrapper and styling. Remove the release dates from inside the current widget div.

**Tech Stack:** TypeScript, Vite, Shadow DOM, Jest

---

## File Structure

**Modified:**
- `src/utils/types.ts` — add `theatricalRelease` to `MessageResponse` success variant
- `src/background/index.ts` — add `extractTheatricalRelease()`, update `resolveFromMediaInfo()`, update handlers
- `src/content/index.ts` — create `createReleasesPanelHost()`, `releasesPanelCSS()`, `populateReleasesPanel()`, inject panel before widget, remove old `releasesEl`
- `src/background/index.test.ts` — update test mocks to include `theatricalRelease`

---

## Task 1: Update MessageResponse Type

**Files:**
- Modify: `src/utils/types.ts` (lines 60-62)

- [ ] **Step 1: Add theatricalRelease field to MessageResponse success variant**

Open `src/utils/types.ts` and locate the `MessageResponse` type around line 60. Update the success variant:

```typescript
  | { ok: true; hd: UiState; fourK: UiState; mediaId: number; hdInfo: string | null; fourKInfo: string | null; theatricalRelease: string | null; digitalRelease: string | null; physicalRelease: string | null }
```

The change is adding `theatricalRelease: string | null;` before `digitalRelease`.

- [ ] **Step 2: Commit the type change**

```bash
cd d:\Projects\Code\seerr-helper
git add src/utils/types.ts
git commit -m "types: add theatricalRelease to MessageResponse success variant"
```

---

## Task 2: Extract Theatrical Release in Background

**Files:**
- Modify: `src/background/index.ts` (lines 38-50)

- [ ] **Step 1: Add theatrical release type constant**

Open `src/background/index.ts` and locate the line with `const TMDB_RELEASE_DIGITAL = 4`. Add a new constant above it:

```typescript
const TMDB_RELEASE_THEATRICAL_WIDE = 3
const TMDB_RELEASE_THEATRICAL_LIMITED = 2
const TMDB_RELEASE_DIGITAL = 4
const TMDB_RELEASE_PHYSICAL = 5
```

- [ ] **Step 2: Add extractTheatricalRelease function**

After the `extractReleaseDate()` function (around line 45), add a new function:

```typescript
function extractTheatricalRelease(results: ReleaseResult[]): string | null {
  const us = results.find(r => r.iso_3166_1 === 'US')
  if (!us) return null
  // Try wide theatrical first
  let entry = us.release_dates.find(d => d.type === TMDB_RELEASE_THEATRICAL_WIDE)
  // Fallback to limited theatrical
  if (!entry) entry = us.release_dates.find(d => d.type === TMDB_RELEASE_THEATRICAL_LIMITED)
  if (!entry?.release_date) return null
  return new Date(entry.release_date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}
```

- [ ] **Step 3: Update resolveFromMediaInfo to include theatrical**

Find the `resolveFromMediaInfo` function signature (around line 50). Change it from:

```typescript
function resolveFromMediaInfo(
  mediaInfo: MediaInfo | null,
  releases: ReleaseResult[]
): { hd: UiState; fourK: UiState; mediaId: number; hdInfo: string | null; fourKInfo: string | null; digitalRelease: string | null; physicalRelease: string | null } {
  const digitalRelease = extractReleaseDate(releases, TMDB_RELEASE_DIGITAL)
  const physicalRelease = extractReleaseDate(releases, TMDB_RELEASE_PHYSICAL)
```

to:

```typescript
function resolveFromMediaInfo(
  mediaInfo: MediaInfo | null,
  releases: ReleaseResult[]
): { hd: UiState; fourK: UiState; mediaId: number; hdInfo: string | null; fourKInfo: string | null; theatricalRelease: string | null; digitalRelease: string | null; physicalRelease: string | null } {
  const theatricalRelease = extractTheatricalRelease(releases)
  const digitalRelease = extractReleaseDate(releases, TMDB_RELEASE_DIGITAL)
  const physicalRelease = extractReleaseDate(releases, TMDB_RELEASE_PHYSICAL)
```

- [ ] **Step 4: Add theatricalRelease to return statement**

In the first return (when `!mediaInfo`), change from:

```typescript
    return { hd: resolveUiState(undefined, []), fourK: resolveUiState(undefined, []), mediaId: 0, hdInfo: null, fourKInfo: null, digitalRelease, physicalRelease }
```

to:

```typescript
    return { hd: resolveUiState(undefined, []), fourK: resolveUiState(undefined, []), mediaId: 0, hdInfo: null, fourKInfo: null, theatricalRelease, digitalRelease, physicalRelease }
```

- [ ] **Step 5: Add theatricalRelease to main return statement**

In the main return statement, add `theatricalRelease,` before `digitalRelease,`:

```typescript
  return {
    hd: resolveUiState(mediaInfo.status, hdRequests),
    fourK: resolveUiState(mediaInfo.status4k, fourKRequests),
    mediaId: mediaInfo.id,
    hdInfo: formatRequesterName(hdRequests),
    fourKInfo: formatRequesterName(fourKRequests),
    theatricalRelease,
    digitalRelease,
    physicalRelease,
  }
```

- [ ] **Step 6: Commit the background changes**

```bash
git add src/background/index.ts
git commit -m "feat: extract theatrical release date (wide with fallback to limited)"
```

---

## Task 3: Update Tests to Include Theatrical Release

**Files:**
- Modify: `src/background/index.test.ts` (lines 42-70)

- [ ] **Step 1: Update GET_MEDIA_STATUS test (known movie)**

Find the test "returns resolved hd and fourK states for a known movie" (around line 42) and update the expected result from:

```typescript
      expect(result).toEqual({ ok: true, hd: 'available', fourK: 'requestable', mediaId: 42, hdInfo: null, fourKInfo: null, digitalRelease: null, physicalRelease: null })
```

to:

```typescript
      expect(result).toEqual({ ok: true, hd: 'available', fourK: 'requestable', mediaId: 42, hdInfo: null, fourKInfo: null, theatricalRelease: null, digitalRelease: null, physicalRelease: null })
```

- [ ] **Step 2: Update GET_MEDIA_STATUS test (absent mediaInfo)**

Find the test "returns requestable for both when mediaInfo is absent" and update from:

```typescript
      expect(result).toEqual({ ok: true, hd: 'requestable', fourK: 'requestable', mediaId: 0, hdInfo: null, fourKInfo: null, digitalRelease: null, physicalRelease: null })
```

to:

```typescript
      expect(result).toEqual({ ok: true, hd: 'requestable', fourK: 'requestable', mediaId: 0, hdInfo: null, fourKInfo: null, theatricalRelease: null, digitalRelease: null, physicalRelease: null })
```

- [ ] **Step 3: Update REQUEST_MEDIA test**

Find the test "posts a request and returns refreshed status" and update the mock re-fetch response from:

```typescript
      expect(result).toEqual({ ok: true, hd: 'pending-approval', fourK: 'requestable', mediaId: 42, hdInfo: null, fourKInfo: null, digitalRelease: null, physicalRelease: null })
```

to:

```typescript
      expect(result).toEqual({ ok: true, hd: 'pending-approval', fourK: 'requestable', mediaId: 42, hdInfo: null, fourKInfo: null, theatricalRelease: null, digitalRelease: null, physicalRelease: null })
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --passWithNoTests 2>&1
```

Expected output: `Tests: 21 passed, 21 total`

- [ ] **Step 5: Commit test updates**

```bash
git add src/background/index.test.ts
git commit -m "test: update background tests to include theatricalRelease"
```

---

## Task 4: Create Release Dates Panel in Content Script

**Files:**
- Modify: `src/content/index.ts` (multiple sections)

- [ ] **Step 1: Update widgetCSS to add releases panel styles**

Find the `widgetCSS()` function (around line 67) and add styles for the releases panel. Before the closing backtick, add:

```typescript
    .seerr-releases-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 12px;
    }
    .seerr-releases-grid:empty { display: none; }
    .seerr-release-item {
      font-size: 11px;
      color: #bbccdd;
      opacity: 0.5;
      line-height: 1.4;
    }
    .seerr-release-label {
      color: #bbccdd;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.7;
      margin-bottom: 3px;
    }
```

- [ ] **Step 2: Remove release styles from widget CSS**

Find and **delete** these lines from the `widgetCSS()` function:

```typescript
    .seerr-releases {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .seerr-releases:empty { display: none; }
    .seerr-release {
      font-size: 11px;
      color: #bbccdd;
      opacity: 0.5;
    }
```

- [ ] **Step 3: Add releasesPanelCSS function**

Add this function after `widgetCSS()` (around line 160):

```typescript
function releasesPanelCSS(): string {
  return `
    :host { display: block; }
    .seerr-releases-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: GraphikWeb, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", Meiryo, sans-serif;
      font-size: 13px;
    }
    .seerr-release-label {
      color: #bbccdd;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.7;
    }
    .seerr-release-item {
      font-size: 11px;
      color: #bbccdd;
      opacity: 0.55;
      line-height: 1.4;
    }
  `
}
```

- [ ] **Step 4: Add createReleasesPanelHost function**

Add this function after `createWidgetHost()` (around line 200):

```typescript
function createReleasesPanelHost(): { host: HTMLLIElement; shadow: ShadowRoot } {
  const host = document.createElement('li')
  host.id = 'seerr-releases-panel'
  const shadowContainer = document.createElement('div')
  host.appendChild(shadowContainer)
  const shadow = shadowContainer.attachShadow({ mode: 'open' })
  return { host, shadow }
}
```

- [ ] **Step 5: Add populateReleasesPanel function**

Add this function before `refreshStatus()` (around line 265):

```typescript
function populateReleasesPanel(
  container: HTMLDivElement,
  theatrical: string | null,
  digital: string | null,
  physical: string | null
): void {
  container.textContent = ''
  
  if (theatrical || digital || physical) {
    if (theatrical) {
      const span = document.createElement('span')
      span.className = 'seerr-release-item'
      span.textContent = `Theatrical · ${theatrical}`
      container.appendChild(span)
    }
    if (digital) {
      const span = document.createElement('span')
      span.className = 'seerr-release-item'
      span.textContent = `Digital · ${digital}`
      container.appendChild(span)
    }
    if (physical) {
      const span = document.createElement('span')
      span.className = 'seerr-release-item'
      span.textContent = `Physical · ${physical}`
      container.appendChild(span)
    }
  } else {
    const noData = document.createElement('span')
    noData.className = 'seerr-release-item'
    noData.textContent = 'No release dates'
    container.appendChild(noData)
  }
}
```

- [ ] **Step 6: Commit the panel CSS and functions**

```bash
git add src/content/index.ts
git commit -m "feat: add releasesPanelCSS and helper functions for releases panel"
```

---

## Task 5: Inject Releases Panel and Update Widget Init

**Files:**
- Modify: `src/content/index.ts` (init function and related)

- [ ] **Step 1: Update init to create and inject releases panel**

Find the `init()` function. After the line `const { host, shadow } = createWidgetHost()`, add:

```typescript
  // Create releases panel
  const { host: releasesHost, shadow: releasesShadow } = createReleasesPanelHost()
  const releasesStyle = document.createElement('style')
  releasesStyle.textContent = releasesPanelCSS()
  const releasesContainer = document.createElement('div')
  releasesContainer.className = 'seerr-releases-container'
  const releasesLabel = document.createElement('span')
  releasesLabel.className = 'seerr-release-label'
  releasesLabel.textContent = 'Release Dates'
  const releasesGrid = document.createElement('div')
  releasesGrid.className = 'seerr-releases-grid'
  releasesContainer.append(releasesLabel, releasesGrid)
  releasesShadow.append(releasesStyle, releasesContainer)
```

- [ ] **Step 2: Inject releases panel before the widget**

In the same `init()` function, after creating both panels, inject them into the sidebar. Find where you have:

```typescript
  widget.append(grid, releasesEl)
  shadow.append(style, widget)
  panel.appendChild(host)
```

Replace it with:

```typescript
  widget.append(grid)
  shadow.append(style, widget)
  panel.appendChild(releasesHost)
  panel.appendChild(host)
```

- [ ] **Step 3: Remove releasesEl from widget initialization**

Find the line `const releasesEl = document.createElement('div')` and the related `releasesEl.className = 'seerr-releases'` initialization. **Delete these lines entirely**. Also remove `releasesEl` from the append statement (it was `widget.append(grid, releasesEl)` — now just `widget.append(grid)`).

- [ ] **Step 4: Update refreshStatus call signature**

Find the `await refreshStatus(...)` call and update it to pass the grid instead of old releasesEl:

```typescript
  await refreshStatus(tmdbId, mediaType, baseUrl, hdBtn, hdSub, fourKBtn, fourKSub, releasesGrid)
```

- [ ] **Step 5: Commit the init changes**

```bash
git add src/content/index.ts
git commit -m "feat: inject releases panel above widget, remove old releases from widget"
```

---

## Task 6: Update refreshStatus to Use New Release Panel

**Files:**
- Modify: `src/content/index.ts` (refreshStatus function)

- [ ] **Step 1: Update refreshStatus signature**

Find the `refreshStatus()` function signature and update the last parameter from `releasesEl: HTMLDivElement` to `releasesGrid: HTMLDivElement`:

```typescript
async function refreshStatus(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  baseUrl: string,
  hdBtn: HTMLButtonElement,
  hdSub: HTMLSpanElement,
  fourKBtn: HTMLButtonElement,
  fourKSub: HTMLSpanElement,
  releasesGrid: HTMLDivElement
): Promise<void> {
```

- [ ] **Step 2: Update populateReleases call**

Find the line `populateReleases(releasesEl, resp.digitalRelease, resp.physicalRelease)` and replace it with:

```typescript
  populateReleasesPanel(releasesGrid, resp.theatricalRelease, resp.digitalRelease, resp.physicalRelease)
```

- [ ] **Step 3: Verify refreshStatus compiles**

```bash
npm run build 2>&1
```

Expected: Clean build with no TS errors.

- [ ] **Step 4: Commit refreshStatus changes**

```bash
git add src/content/index.ts
git commit -m "feat: update refreshStatus to populate releases panel with theatrical date"
```

---

## Task 7: Remove Old populateReleases Function

**Files:**
- Modify: `src/content/index.ts` (cleanup)

- [ ] **Step 1: Delete old populateReleases function**

Find and **delete** the old `populateReleases()` function (it should still exist around line 265 if you haven't already removed it). This function was:

```typescript
function populateReleases(el: HTMLDivElement, digital: string | null, physical: string | null): void {
  el.textContent = ''
  if (digital) {
    const span = document.createElement('span')
    span.className = 'seerr-release'
    span.textContent = `Digital \u00b7 ${digital}`
    el.appendChild(span)
  }
  if (physical) {
    const span = document.createElement('span')
    span.className = 'seerr-release'
    span.textContent = `Physical \u00b7 ${physical}`
    el.appendChild(span)
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --passWithNoTests 2>&1
```

Expected: `Tests: 21 passed, 21 total`

- [ ] **Step 3: Build**

```bash
npm run build 2>&1
```

Expected: Clean build.

- [ ] **Step 4: Commit cleanup**

```bash
git add src/content/index.ts
git commit -m "cleanup: remove old populateReleases function"
```

---

## Task 8: Final Integration Test and Build

**Files:**
- No new file changes

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --passWithNoTests 2>&1
```

Expected output: All tests pass, no TS errors.

- [ ] **Step 2: Run full build**

```bash
npm run build 2>&1
```

Expected output: Clean build, all files present in `dist/`.

- [ ] **Step 3: Verify build sizes reasonable**

The final build output should show sizes similar to or slightly larger than before (content script may grow by ~0.5 kB due to releases panel logic).

- [ ] **Step 4: Final commit**

```bash
git log --oneline -8
```

Verify the last 8 commits include all your work with clear messages.

---

## Self-Review Checklist

✅ **Spec coverage:**
- Theatrical release extraction (wide with fallback to limited) → Task 2
- Separate `<li>` panel → Task 4-5
- Always visible (shows "No release dates" when none found) → Task 5-6
- Positioned above the seerr-helper widget → Task 5
- Shows theatrical, digital, physical in order → Task 5-6

✅ **Placeholder scan:**
- All code blocks complete, no "add error handling" pseudo-code
- All file paths exact
- All commands with expected output
- No TODOs or TBDs

✅ **Type consistency:**
- `theatricalRelease` field added to `MessageResponse` (Task 1)
- `extractTheatricalRelease()` function returns `string | null` (Task 2)
- `resolveFromMediaInfo()` returns object with `theatricalRelease` field (Task 2)
- Tests mock all four release dates (Task 3)
- Content script `populateReleasesPanel()` accepts all four dates (Task 5-6)
- `releasesGrid` parameter name consistent throughout (Tasks 5-6)

✅ **No breaking changes:**
- All existing endpoints unchanged
- All existing widget behavior preserved
- Only additions: new response field, new panel injection

---

## Plan complete. How would you like to execute?

**Option 1: Subagent-Driven (recommended)**
- I dispatch a fresh subagent for each task, review output between tasks, catch issues early
- Faster iteration, higher quality

**Option 2: Inline Execution**
- Execute tasks sequentially in this session using executing-plans skill
- Single review checkpoint at end

Which approach?