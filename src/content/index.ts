import { MessageRequest, MessageResponse, UiState } from '../utils/types'

// ── TMDB ID resolution ───────────────────────────────────────────────────────

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
  const shadow = host.attachShadow({ mode: 'open' })
  return { host, shadow }
}

function widgetCSS(): string {
  return `
    .seerr-widget { display: flex; flex-direction: column; gap: 6px; padding: 4px 0; }
    .seerr-row { display: flex; align-items: center; gap: 8px; }
    .seerr-quality-label { font-size: 11px; color: #89a; min-width: 24px; text-transform: uppercase; letter-spacing: 0.05em; }
    .seerr-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 3px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer; color: #fff;
      background: #445566; transition: opacity 0.15s;
    }
    .seerr-btn:disabled { opacity: 0.5; cursor: default; }
    .seerr-btn--requestable      { background: #2c7be5; }
    .seerr-btn--requesting       { background: #2c7be5; opacity: 0.6; }
    .seerr-btn--success          { background: #28a745; }
    .seerr-btn--pending-approval { background: #b8860b; }
    .seerr-btn--approved         { background: #2c7be5; }
    .seerr-btn--declined         { background: #c0392b; }
    .seerr-btn--failed           { background: #c0392b; }
    .seerr-btn--processing       { background: #b8860b; }
    .seerr-btn--partial          { background: #e67e22; }
    .seerr-btn--available        { background: #28a745; }
    .seerr-btn--blocklisted      { background: #556; }
    .seerr-btn--not-configured   { background: #556; }
    .seerr-btn--error            { background: #c0392b; }
    .seerr-btn--loading          { background: #445566; }
  `
}

type ExtendedUiState = UiState | 'loading' | 'not-configured' | 'requesting' | 'success' | 'error'

const STATE_LABELS: Record<ExtendedUiState, string> = {
  'loading':          '…',
  'not-configured':   'Setup Seerr',
  'requestable':      'Request',
  'requesting':       'Requesting…',
  'success':          '✓ Requested',
  'pending-approval': 'Pending Approval',
  'approved':         'Approved',
  'declined':         'Declined',
  'failed':           'Failed',
  'processing':       'Processing',
  'partial':          'Partial',
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
  btn.textContent = STATE_LABELS[state]
  btn.setAttribute('aria-label', `Seerr: ${STATE_LABELS[state]}`)
  btn.disabled = state === 'loading' || state === 'requesting' || state === 'blocklisted'
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Avoid double-injection
  if (document.getElementById(WIDGET_HOST_ID)) return

  const panel = document.querySelector('ul.js-actions-panel')
  if (!panel) return

  const resolved = resolveTmdbId()
  if (!resolved) return

  const { tmdbId, mediaType } = resolved

  // Create and inject the widget
  const { host, shadow } = createWidgetHost()

  const style = document.createElement('style')
  style.textContent = widgetCSS()

  const widget = document.createElement('div')
  widget.className = 'seerr-widget'

  const hdBtn = document.createElement('button')
  hdBtn.className = 'seerr-btn'
  const fourKBtn = document.createElement('button')
  fourKBtn.className = 'seerr-btn'

  const hdRow = document.createElement('div')
  hdRow.className = 'seerr-row'
  const hdLabel = document.createElement('span')
  hdLabel.className = 'seerr-quality-label'
  hdLabel.textContent = 'HD'
  hdRow.append(hdLabel, hdBtn)

  const fourKRow = document.createElement('div')
  fourKRow.className = 'seerr-row'
  const fourKLabel = document.createElement('span')
  fourKLabel.className = 'seerr-quality-label'
  fourKLabel.textContent = '4K'
  fourKRow.append(fourKLabel, fourKBtn)

  widget.append(hdRow, fourKRow)
  shadow.append(style, widget)
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
  await refreshStatus(tmdbId, mediaType, baseUrl, hdBtn, fourKBtn)

  // Clean up injected elements when extension is disabled or reloaded (inject-cleanup)
  chrome.runtime.connect({ name: 'seerr-helper' }).onDisconnect.addListener(() => {
    document.getElementById(WIDGET_HOST_ID)?.remove()
  })
}

async function refreshStatus(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  baseUrl: string,
  hdBtn: HTMLButtonElement,
  fourKBtn: HTMLButtonElement
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
  const mediaId = resp.mediaId

  attachClickHandler(hdBtn, resp.hd, false, tmdbId, mediaType, mediaId, baseUrl, fourKBtn)
  attachClickHandler(fourKBtn, resp.fourK, true, tmdbId, mediaType, mediaId, baseUrl, hdBtn)
}

function attachClickHandler(
  btn: HTMLButtonElement,
  state: UiState,
  is4k: boolean,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  mediaId: number,
  baseUrl: string,
  otherBtn: HTMLButtonElement
): void {
  // Stateless actions: open Overseerr
  const linkOutStates: UiState[] = ['pending-approval', 'approved', 'processing', 'partial', 'available', 'blocklisted']
  if (linkOutStates.includes(state)) {
    btn.addEventListener('click', () => {
      window.open(`${baseUrl}/movie/${mediaId}`, '_blank', 'noopener')
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
        attachClickHandler(btn, is4k ? resp.fourK : resp.hd, is4k, tmdbId, mediaType, resp.mediaId, baseUrl, otherBtn)
        attachClickHandler(otherBtn, is4k ? resp.hd : resp.fourK, !is4k, tmdbId, mediaType, resp.mediaId, baseUrl, btn)
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
