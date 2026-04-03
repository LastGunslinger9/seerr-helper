# Local Icon System Design for Letterboxd Widget

## Goal
Add icons to both release status rows and HD/4K action buttons in the injected Letterboxd sidebar UI using a bundled local asset strategy (no CDN), similar to the external Overseerr-Assistant reference.

## Scope
In scope:
- Add icons to release rows: Theatrical, Digital, Physical, and fallback empty state.
- Add icons to request action buttons and state labels in HD and 4K columns.
- Bundle icon assets inside the extension package and load from local extension URLs.
- Keep Shadow DOM isolation and current Letterboxd visual alignment.

Out of scope:
- Rebranding toolbar icons in public/icons.
- Adding remote icon providers.
- Reworking overall widget layout or state logic.

## Current State
- Widget and releases panel are rendered from src/content/index.ts inside separate Shadow DOM roots.
- UI text is plain (no icons).
- Styling is defined as CSS strings returned by widgetCSS() and releasesPanelCSS().
- No content-script icon font assets are currently bundled.

## Requirements
1. No CDN dependency for icon rendering.
2. Icons must render inside Shadow DOM for both panels.
3. Icons must be accessible: decorative icons hidden from assistive tech, semantic labels preserved.
4. Icon display must not break existing button states, text, spacing, or line wrapping.
5. Feature should fail gracefully: if icon font fails to load, text remains readable and functional.

## Design Decision
Use local bundled Font Awesome assets in extension package and reference them from Shadow DOM CSS via chrome.runtime.getURL() at runtime.

Why this approach:
- Mirrors the external Overseerr-Assistant pattern (local CSS + local font files).
- Compatible with MV3 and extension CSP.
- Avoids dependency on external network availability.

## Icon Mapping
### Releases panel
- Theatrical: fa-film
- Digital: fa-cloud-download-alt
- Physical: fa-compact-disc
- No release dates: fa-calendar-times

### Buttons and states
- Requestable: fa-plus
- Requesting: fa-spinner (animated spin)
- Success or Approved or Available: fa-check
- Pending approval or Processing: fa-clock
- Declined or Failed or Blocklisted or Error: fa-times
- Not configured: fa-cog

Note: state icon mapping must be deterministic from existing ExtendedUiState.

## Architecture Changes
### New local assets
- Add local Font Awesome CSS and webfont files under src/content/assets/icons/fontawesome/.
- Keep only required styles or minimum bundle needed for selected icons (preferred subset).

### Content script changes
1. Add utility to build icon CSS string with runtime URL resolution:
   - buildIconFontCSS(): string
   - Inject @font-face rules using chrome.runtime.getURL for bundled font files.
2. Add icon helper function to return markup for UI labels:
   - iconHtml(name: IconName): string
3. Extend button state rendering so text becomes icon + label.
4. Extend releases panel item rendering so each row prepends icon span.
5. Keep aria-label on buttons based on text labels; icon spans marked aria-hidden=true.

### Styling changes
- Add icon utility classes in both widget and releases panel CSS:
  - .seerr-icon
  - .seerr-icon--spin (for requesting)
- Use inline-flex alignment and fixed icon width to prevent text jitter across state transitions.
- Preserve current panel typography and spacing; add small gap between icon and text.

## File-Level Plan for Implementation
- Modify src/content/index.ts:
  - Add icon font CSS builder and icon class mapping.
  - Update widgetCSS() and releasesPanelCSS() to include icon classes.
  - Update applyButtonState() to render icon + label safely.
  - Update populateReleasesPanel() to render iconized rows.
- Add files under src/content/assets/icons/fontawesome/:
  - all.min.css (or reduced equivalent)
  - webfonts files needed by selected icons (woff2 minimum target)
- Optional update in build config only if asset resolution needs explicit handling.

## Security and CSP Considerations
- No remote stylesheet or font fetches.
- All assets loaded from extension package URLs.
- No eval or inline script changes.
- Existing permissions remain unchanged.

## Accessibility
- Icons are decorative: aria-hidden=true on icon spans.
- Text labels remain visible and unchanged for screen readers.
- Maintain contrast and button disabled semantics.

## Testing Strategy
### Automated
1. Update or add unit tests for state-to-icon mapping function.
2. Update content rendering tests (if present) to assert icon markup for:
   - at least one release row
   - requestable, requesting, approved, failed button states

### Manual smoke tests on letterboxd film page
1. Icons appear in releases panel with one icon per row.
2. HD and 4K buttons show proper icon for each state transition.
3. Spinner icon animates only in requesting state.
4. Text remains readable if icon font class fails (simulate by removing font CSS).
5. Layout remains aligned with native panel styling on desktop and narrow viewport.

## Rollout and Fallback
- Default on for all users once merged.
- If regressions are found, fallback is simple: remove icon markup while keeping text logic unchanged.

## Open Questions Resolved
- CDN vs local: local bundled chosen.
- Scope: both status rows and action buttons.

## Acceptance Criteria
1. No external icon network requests are made.
2. Releases panel rows show expected icons and line breaks.
3. HD and 4K button labels show state-appropriate icons.
4. Existing request workflow and API interactions remain unchanged.
5. Build and tests pass.