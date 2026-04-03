import { MessageRequest, MessageResponse, UiState, ExtendedUiState } from '../utils/types'
import { BUTTON_ICON, RELEASE_ICON, QUALITY_ICON } from './icons'

// ── Icon font CSS ────────────────────────────────────────────────────────────

// Inject @font-face into the main document once so it loads reliably.
// @font-face inside shadow roots is unreliable in Chrome.
function injectFontFaceToDocument(): void {
  const id = 'seerr-remixicon-fontface'
  if (document.getElementById(id)) return
  const woff2 = chrome.runtime.getURL('icons/remixicon/remixicon.woff2')
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    @font-face {
      font-family: 'remixicon';
      src: url('${woff2}') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
  `
  document.head.appendChild(style)
}

// Glyph classes and utilities injected into each shadow root.
function buildIconFontCSS(): string {
  return `
    :is([class^="ri-"], [class*=" ri-"]) {
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
      line-height: 1;
      vertical-align: middle;
    }
    .seerr-icon--spin {
      animation: seerr-spin 1s linear infinite;
    }
    @keyframes seerr-spin {
      to { transform: rotate(360deg); }
    }
  `
}

// ── TMDB ID resolution ───────────────────────────────────────────────────────

function waitForElm(selector: string): Promise<Element> {
  return new Promise(resolve => {
    const existing = document.querySelector(selector)
    if (existing) { resolve(existing); return }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

function resolveTmdbId(): { tmdbId: number; mediaType: 'movie' | 'tv' } | null {
  // Primary: body data attributes
  const id = document.body.dataset['tmdbId']
  const type = document.body.dataset['tmdbType']
  if (id && (type === 'movie' || type === 'tv')) {
    return { tmdbId: parseInt(id, 10), mediaType: type }
  }

  // Fallback: TMDB outbound link
  const href = document.querySelector('a[data-track-action="TMDB"]')?.getAttribute('href') ?? ''
  const match = href.match(/\/(movie|tv)\/(\d+)/)
  if (match && match[1] && match[2]) {
    return { tmdbId: parseInt(match[2], 10), mediaType: match[1] as 'movie' | 'tv' }
  }

  return null
}

// ── Messaging ────────────────────────────────────────────────────────────────

function sendMessage(msg: MessageRequest): Promise<MessageResponse | null> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, (response: MessageResponse | undefined) => {
      if (chrome.runtime.lastError) {
        console.error('[seerr-helper]', chrome.runtime.lastError.message)
        resolve(null)
        return
      }
      resolve(response ?? null)
    })
  })
}

// ── Widget HTML / Shadow DOM ─────────────────────────────────────────────────

const WIDGET_HOST_ID = 'seerr-helper-root'

function createWidgetHost(): { host: HTMLLIElement; shadow: ShadowRoot } {
  const host = document.createElement('li')
  host.id = WIDGET_HOST_ID
  const shadowContainer = document.createElement('div')
  host.appendChild(shadowContainer)
  const shadow = shadowContainer.attachShadow({ mode: 'open' })
  return { host, shadow }
}

function createReleasesPanelHost(): { host: HTMLLIElement; shadow: ShadowRoot } {
  const host = document.createElement('li')
  host.id = 'seerr-releases-panel'
  const shadowContainer = document.createElement('div')
  host.appendChild(shadowContainer)
  const shadow = shadowContainer.attachShadow({ mode: 'open' })
  return { host, shadow }
}

function widgetCSS(): string {
  return `
    :host {
      display: block;
      --seerr-text: #bbccdd;
      --seerr-surface: #445566;
    }
    .seerr-widget {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-family: GraphikWeb, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", Meiryo, sans-serif;
      font-size: 13px;
      padding-inline: 12px;
    }
    .seerr-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .seerr-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .seerr-col-label {
      display: flex;
      color: var(--seerr-text);
      font-size: 42px;
      line-height: 1;
      opacity: 0.7;
    }
    .seerr-col-sub {
      font-size: 11px;
      color: var(--seerr-text);
      opacity: 0.55;
      &:empty { display: none; }
    }
    .seerr-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 3px 7px;
      border-radius: 3px;
      border: none;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.6;
      cursor: pointer;
      background: var(--seerr-surface);
      color: #fff;
      transition: filter 0.15s;
      &:hover:not(:disabled)  { filter: brightness(1.2); }
      &:active:not(:disabled) { filter: brightness(0.9); }
      &:disabled { opacity: 0.5; cursor: default; }
    }
    /* action states */
    .seerr-btn--requestable { background: #2c7be5; color: #fff; }
    .seerr-btn--requesting  { background: #2c7be5; color: #fff; opacity: 0.6; }
    .seerr-btn--success     { background: #22c55e; color: #dcfce7; }
    /* status states — canonical badge colors from status-codes-reference.md */
    .seerr-btn--pending-approval { background: #eab308; color: #fef9c3; }
    .seerr-btn--approved         { background: #22c55e; color: #dcfce7; }
    .seerr-btn--declined         { background: #dc2626; color: #fee2e2; }
    .seerr-btn--failed           { background: #dc2626; color: #fee2e2; }
    .seerr-btn--processing       { background: #6366f1; color: #e0e7ff; }
    .seerr-btn--partial          { background: #22c55e; color: #dcfce7; }
    .seerr-btn--available        { background: #22c55e; color: #dcfce7; }
    .seerr-btn--blocklisted      { background: #dc2626; color: #fee2e2; }
    /* utility states */
    .seerr-btn--not-configured { background: var(--seerr-surface); color: var(--seerr-text); }
    .seerr-btn--error          { background: #dc2626; color: #fee2e2; }
    .seerr-btn--loading        { background: transparent; color: var(--seerr-text); padding: 0; }
  `
}

function releasesPanelCSS(): string {
  return `
    :host {
      display: grid;
      padding-block: 10px;
      background: #445566;
      border-bottom: 1px solid #2c3440;
      --seerr-text: #bbccdd;
    }
    .seerr-releases-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-inline: 12px;
      font-family: GraphikWeb, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", Meiryo, sans-serif;
      font-size: 13px;
      color: var(--seerr-text);
      line-height: 18px;
    }
    .seerr-releases-grid {
      display: grid;
      grid-template-columns: auto auto;
      column-gap: 4px;
      row-gap: 2px;
      align-items: center;
      justify-content: center;
    }
    .seerr-release-item {
      display: contents;
      font-size: 13px;
      color: var(--seerr-text);
      line-height: 18px;
      & > i    { justify-self: end; }
      & > span { justify-self: start; }
    }
  `
}

const STATE_LABELS: Record<ExtendedUiState, string> = {
  'loading':          '…',
  'not-configured':   'Setup Seerr',
  'requestable':      'Request',
  'requesting':       'Requesting…',
  'success':          '✓ Requested',
  'pending-approval': 'Pending',
  'approved':         'Approved',
  'declined':         'Declined',
  'failed':           'Failed',
  'processing':       'Requested',
  'partial':          'Partially Available',
  'available':        'Available',
  'blocklisted':      'Blocklisted',
  'error':            'Error',
}

// ── Widget state management ──────────────────────────────────────────────────

function applyButtonState(btn: HTMLButtonElement, state: ExtendedUiState): void {
  const prefix = 'seerr-btn--'
  Array.from(btn.classList)
    .filter(c => c.startsWith(prefix))
    .forEach(c => btn.classList.remove(c))
  btn.classList.add(`${prefix}${state}`)
  const icon: string | undefined = (state as string) in BUTTON_ICON
    ? BUTTON_ICON[state as Exclude<ExtendedUiState, 'loading'>]
    : undefined
  const label = STATE_LABELS[state]
  if (icon) {
    const spinClass = state === 'requesting' ? ' seerr-icon--spin' : ''
    btn.innerHTML = `<i class="${icon} seerr-icon${spinClass}" aria-hidden="true"></i> ${label}`
  } else {
    btn.textContent = label
  }
  btn.setAttribute('aria-label', `Seerr: ${STATE_LABELS[state]}`)
  btn.disabled = state === 'loading' || state === 'requesting' || state === 'blocklisted'
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Avoid double-injection
  if (document.getElementById(WIDGET_HOST_ID)) return

  // Inject @font-face into the main document (shadow DOM @font-face is unreliable in Chrome)
  injectFontFaceToDocument()

  // Wait for the React-rendered actions panel to appear in the DOM
  const panel = await waitForElm('ul.js-actions-panel')

  // Check if user wants to hide the sharing panel
  const stored = await chrome.storage.sync.get(['hide_sharing_panel'])
  if (stored['hide_sharing_panel']) {
    const sharingPanel = panel.querySelector('li.panel-sharing')
    if (sharingPanel) {
      sharingPanel.remove()
    }
  }

  const resolved = resolveTmdbId()
  if (!resolved) return

  const { tmdbId, mediaType } = resolved

  // Create and inject the widget
  const { host, shadow } = createWidgetHost()

  // Create releases panel
  const { host: releasesHost, shadow: releasesShadow } = createReleasesPanelHost()
  const releasesStyle = document.createElement('style')
  releasesStyle.textContent = releasesPanelCSS() + buildIconFontCSS()
  const releasesContainer = document.createElement('div')
  releasesContainer.className = 'seerr-releases-container'
  const releasesGrid = document.createElement('div')
  releasesGrid.className = 'seerr-releases-grid'
  releasesContainer.append(releasesGrid)
  releasesShadow.append(releasesStyle, releasesContainer)

  const style = document.createElement('style')
  style.textContent = widgetCSS() + buildIconFontCSS()

  const widget = document.createElement('div')
  widget.className = 'seerr-widget'

  const hdBtn = document.createElement('button')
  hdBtn.className = 'seerr-btn'
  const fourKBtn = document.createElement('button')
  fourKBtn.className = 'seerr-btn'

  const grid = document.createElement('div')
  grid.className = 'seerr-grid'

  const hdCol = document.createElement('div')
  hdCol.className = 'seerr-col'
  const hdLabel = document.createElement('span')
  hdLabel.className = 'seerr-col-label'
  hdLabel.innerHTML = `<i class="${QUALITY_ICON['hd']} seerr-icon" aria-hidden="true"></i>`
  const hdSub = document.createElement('span')
  hdSub.className = 'seerr-col-sub'
  hdCol.append(hdLabel, hdBtn, hdSub)

  const fourKCol = document.createElement('div')
  fourKCol.className = 'seerr-col'
  const fourKLabel = document.createElement('span')
  fourKLabel.className = 'seerr-col-label'
  fourKLabel.innerHTML = `<i class="${QUALITY_ICON['4k']} seerr-icon" aria-hidden="true"></i>`
  const fourKSub = document.createElement('span')
  fourKSub.className = 'seerr-col-sub'
  fourKCol.append(fourKLabel, fourKBtn, fourKSub)

  grid.append(hdCol, fourKCol)

  widget.append(grid)
  shadow.append(style, widget)
  panel.appendChild(releasesHost)
  panel.appendChild(host)

  // Show loading state
  applyButtonState(hdBtn, 'loading')
  applyButtonState(fourKBtn, 'loading')

  // Get config to know the Overseerr base URL for link-out
  const configResp = await sendMessage({ type: 'GET_CONFIG' })
  if (!configResp) {
    applyButtonState(hdBtn, 'error')
    applyButtonState(fourKBtn, 'error')
    return
  }
  const baseUrl = configResp.ok && 'baseUrl' in configResp ? configResp.baseUrl : null

  if (!baseUrl) {
    applyButtonState(hdBtn, 'not-configured')
    applyButtonState(fourKBtn, 'not-configured')
    hdBtn.addEventListener('click', () => chrome.runtime.openOptionsPage())
    fourKBtn.addEventListener('click', () => chrome.runtime.openOptionsPage())
    return
  }

  // Fetch initial status
  await refreshStatus(tmdbId, mediaType, baseUrl, hdBtn, hdSub, fourKBtn, fourKSub, releasesGrid)
}

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
      const iconEl = document.createElement('i')
      iconEl.className = `${RELEASE_ICON[key]} seerr-icon`
      iconEl.setAttribute('aria-hidden', 'true')
      const spanEl = document.createElement('span')
      spanEl.textContent = date
      item.append(iconEl, spanEl)
      container.appendChild(item)
    }
  } else {
    const item = document.createElement('span')
    item.className = 'seerr-release-item'
    const iconEl = document.createElement('i')
    iconEl.className = `${RELEASE_ICON.none} seerr-icon`
    iconEl.setAttribute('aria-hidden', 'true')
    const spanEl = document.createElement('span')
    spanEl.textContent = 'No release dates'
    item.append(iconEl, spanEl)
    container.appendChild(item)
  }
}

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
  const resp = await sendMessage({ type: 'GET_MEDIA_STATUS', tmdbId, mediaType })

  if (!resp || !resp.ok) {
    applyButtonState(hdBtn, 'error')
    applyButtonState(fourKBtn, 'error')
    return
  }

  if (!('hd' in resp)) return

  applyButtonState(hdBtn, resp.hd)
  applyButtonState(fourKBtn, resp.fourK)
  hdSub.textContent = resp.hdInfo ? `by ${resp.hdInfo}` : ''
  fourKSub.textContent = resp.fourKInfo ? `by ${resp.fourKInfo}` : ''
  populateReleasesPanel(releasesGrid, resp.theatricalRelease, resp.digitalRelease, resp.physicalRelease)
  const mediaId = resp.mediaId

  attachClickHandler(hdBtn, hdSub, resp.hd, false, tmdbId, mediaType, mediaId, baseUrl, fourKBtn, fourKSub)
  attachClickHandler(fourKBtn, fourKSub, resp.fourK, true, tmdbId, mediaType, mediaId, baseUrl, hdBtn, hdSub)
}

function attachClickHandler(
  btn: HTMLButtonElement,
  sub: HTMLSpanElement,
  state: UiState,
  is4k: boolean,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  mediaId: number,
  baseUrl: string,
  otherBtn: HTMLButtonElement,
  otherSub: HTMLSpanElement
): void {
  // Stateless actions: open Overseerr
  const linkOutStates: UiState[] = ['pending-approval', 'approved', 'processing', 'partial', 'available', 'blocklisted']
  if (linkOutStates.includes(state)) {
    btn.addEventListener('mouseenter', () => {
      btn.textContent = 'Open'
    })
    btn.addEventListener('mouseleave', () => {
      applyButtonState(btn, state)
    })
    btn.addEventListener('click', () => {
      window.open(`${baseUrl}/movie/${tmdbId}`, '_blank', 'noopener')
    }, { once: true })
    return
  }

  // Request actions
  if (state === 'requestable' || state === 'declined' || state === 'failed') {
    btn.addEventListener('click', async () => {
      applyButtonState(btn, 'requesting')
      const resp = await sendMessage({ type: 'REQUEST_MEDIA', tmdbId, mediaType, is4k })

      if (!resp || !resp.ok) {
        applyButtonState(btn, 'error')
        return
      }

      // Success flash
      applyButtonState(btn, 'success')
      await new Promise<void>(r => setTimeout(r, 1500))

      // Update both buttons from fresh response
      if ('hd' in resp) {
        applyButtonState(btn, is4k ? resp.fourK : resp.hd)
        applyButtonState(otherBtn, is4k ? resp.hd : resp.fourK)
        const info = is4k ? resp.fourKInfo : resp.hdInfo
        const otherInfo = is4k ? resp.hdInfo : resp.fourKInfo
        sub.textContent = info ? `by ${info}` : ''
        otherSub.textContent = otherInfo ? `by ${otherInfo}` : ''
        attachClickHandler(btn, sub, is4k ? resp.fourK : resp.hd, is4k, tmdbId, mediaType, resp.mediaId, baseUrl, otherBtn, otherSub)
        attachClickHandler(otherBtn, otherSub, is4k ? resp.hd : resp.fourK, !is4k, tmdbId, mediaType, resp.mediaId, baseUrl, btn, sub)
      }
    }, { once: true })
  }
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  void init()
}
