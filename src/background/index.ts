import { resolveUiState } from '../utils/resolveUiState'
import { MediaInfo, MessageRequest, MessageResponse, UiState } from '../utils/types'

async function getConfig(): Promise<{ baseUrl: string; apiKey: string } | null> {
  const stored = await chrome.storage.sync.get(['seerr_base_url', 'seerr_api_key'])
  if (!stored['seerr_base_url'] || !stored['seerr_api_key']) return null
  return { baseUrl: stored['seerr_base_url'] as string, apiKey: stored['seerr_api_key'] as string }
}

async function fetchMediaInfo(
  baseUrl: string,
  apiKey: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaInfo | null> {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
  const res = await fetch(`${baseUrl}/api/v1/${endpoint}/${tmdbId}`, {
    headers: { 'X-Api-Key': apiKey },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json() as { mediaInfo?: MediaInfo | null }
  return data.mediaInfo ?? null
}

function resolveFromMediaInfo(mediaInfo: MediaInfo | null): { hd: UiState; fourK: UiState; mediaId: number } {
  if (!mediaInfo) {
    return { hd: resolveUiState(undefined, []), fourK: resolveUiState(undefined, []), mediaId: 0 }
  }
  const hdRequests = (mediaInfo.requests ?? []).filter(r => !r.is4k)
  const fourKRequests = (mediaInfo.requests ?? []).filter(r => r.is4k)
  return {
    hd: resolveUiState(mediaInfo.status, hdRequests),
    fourK: resolveUiState(mediaInfo.status4k, fourKRequests),
    mediaId: mediaInfo.id,
  }
}

export async function handleMessage(message: MessageRequest): Promise<MessageResponse> {
  try {
    if (message.type === 'GET_CONFIG') {
      const config = await getConfig()
      if (!config) return { ok: false, error: 'NOT_CONFIGURED', message: 'Seerr base URL not configured' }
      return { ok: true, baseUrl: config.baseUrl }
    }

    const config = await getConfig()
    if (!config) return { ok: false, error: 'NOT_CONFIGURED', message: 'Seerr base URL not configured' }

    if (message.type === 'GET_MEDIA_STATUS') {
      const mediaInfo = await fetchMediaInfo(config.baseUrl, config.apiKey, message.tmdbId, message.mediaType)
      return { ok: true, ...resolveFromMediaInfo(mediaInfo) }
    }

    if (message.type === 'REQUEST_MEDIA') {
      const res = await fetch(`${config.baseUrl}/api/v1/request`, {
        method: 'POST',
        headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType: message.mediaType, mediaId: message.tmdbId, is4k: message.is4k }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      // Re-fetch to get the actual updated status
      const mediaInfo = await fetchMediaInfo(config.baseUrl, config.apiKey, message.tmdbId, message.mediaType)
      return { ok: true, ...resolveFromMediaInfo(mediaInfo) }
    }

    return { ok: false, error: 'API_ERROR', message: 'Unknown message type' }
  } catch (err) {
    return { ok: false, error: 'API_ERROR', message: err instanceof Error ? err.message : String(err) }
  }
}

// Register the message listener — only runs in the actual service worker context
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: MessageRequest, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse)
    return true // keep channel open for async response
  })
}
