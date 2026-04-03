# Icon System Design

## Goal
Add icons to release date rows and HD/4K request buttons in the Letterboxd sidebar widget, using bundled local Remix Icon assets (no CDN).

## Scope
- Release rows: Theatrical, Digital, Physical, empty fallback
- Request buttons: all `ExtendedUiState` states
- Local asset bundle inside extension package, loaded via `chrome.runtime.getURL()`

Not in scope: toolbar icons in `public/icons`, layout changes, state logic changes.

## Requirements
1. No external network requests for icons.
2. Icons render inside Shadow DOM (both widget and releases panel).
3. Decorative icons: `aria-hidden="true"` on icon spans; `aria-label` on buttons unchanged.
4. Graceful degradation: if font fails to load, text labels remain readable.
5. Release rows: icon and date columns are grid-aligned — icons share a fixed-width column, dates start at the same horizontal position.

## Icon Mapping

### Quality tier labels
Icons replace the "HD" / "4K" text labels on buttons.
| Quality | Icon |
|---------|------|
| HD | `ri-hd-line` |
| 4K | `ri-4k-line` |

### Releases panel
Icons replace the "Theatrical" / "Digital" / "Physical" text labels.
| Row | Icon |
|-----|------|
| Theatrical | `ri-ticket-line` |
| Digital | `ri-cloud-line` |
| Physical | `ri-dvd-line` |
| No release dates | `ri-calendar-event-line` |

### Button states
| State(s) | Icon |
|----------|------|
| requestable | `ri-add-circle-line` |
| requesting | `ri-loader-line` (CSS spin animation) |
| success, approved, available, partial | `ri-checkbox-line` |
| pending-approval, processing | `ri-time-line` |
| declined, failed, blocklisted, error | `ri-close-circle-line` |
| not-configured | `ri-settings-line` |
| loading | _(no icon, text only)_ |

## Implementation

### New assets
Bundle under `public/icons/remixicon/`:
- `remixicon.css` — scoped to only the icons listed above (woff2 only)
- `remixicon.woff2` — the font file

### Content script changes (`src/content/index.ts`)
1. Add `buildIconFontCSS(): string` — builds `@font-face` CSS with URLs resolved via `chrome.runtime.getURL()`
2. Add `ICON_MAP: Record<ExtendedUiState | ReleaseType | Quality, string>` — maps states/types/quality to icon class names
3. Add `.seerr-icon` and `.seerr-icon--spin` CSS classes to both `widgetCSS()` and `releasesPanelCSS()`; release rows use `display: grid; grid-template-columns: 1.25em 1fr` so icons and dates align across all rows
4. Update `applyButtonState()` — render `<i class="ri ... seerr-icon" aria-hidden="true"></i> label` instead of text-only; quality tier label ("HD"/"4K") replaced by `<i class="ri-hd-line">` / `<i class="ri-4k-line">`
5. Update `populateReleasesPanel()` — replace release type text label with icon `<i>`

### Vite config
Add `public/icons/remixicon/` to `web_accessible_resources` in `manifest.json` so `chrome.runtime.getURL()` can resolve the font.

## Testing

### Unit
- Test `ICON_MAP` covers all `ExtendedUiState` values (no missing keys).

### Manual smoke test
1. Each release row shows the correct icon before the text.
2. Each button state shows the correct icon.
3. Requesting state spinner animates.
4. With font CSS removed, text remains readable.

## Acceptance Criteria
1. No external icon network requests.
2. All release rows and button states show correct icons.
3. Existing request workflow unchanged.
4. Build passes, unit tests pass.