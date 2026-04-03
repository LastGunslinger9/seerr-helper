import { resolveUiState } from '../utils/resolveUiState'
import { MediaInfo, MediaRequest, MessageRequest, MessageResponse, UiState } from '../utils/types'

async function getConfig(): Promise<{ baseUrl: string; apiKey: string } | null> {
  const stored = await chrome.storage.sync.get(['seerr_base_url', 'seerr_api_key'])
  if (!stored['seerr_base_url'] || !stored['seerr_api_key']) return null
  return { baseUrl: stored['seerr_base_url'] as string, apiKey: stored['seerr_api_key'] as string }
}

interface ReleaseDateEntry { release_date: string; type: number }
interface ReleaseResult { iso_3166_1: string; release_dates: ReleaseDateEntry[] }

async function fetchMediaInfo(
  baseUrl: string,
  apiKey: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<{ mediaInfo: MediaInfo | null; releases: ReleaseResult[] }> {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
  const res = await fetch(`${baseUrl}/api/v1/${endpoint}/${tmdbId}`, {
    headers: { 'X-Api-Key': apiKey },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json() as { mediaInfo?: MediaInfo | null; releases?: { results: ReleaseResult[] } | null }
  return { mediaInfo: data.mediaInfo ?? null, releases: data.releases?.results ?? [] }
}

function formatRequesterName(requests: MediaRequest[]): string | null {
  if (!requests.length) return null
  const [latest] = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  if (!latest) return null
  return latest.requestedBy?.displayName ?? latest.requestedBy?.username ?? null
}

const TMDB_RELEASE_DIGITAL = 4
const TMDB_RELEASE_PHYSICAL = 5

function extractReleaseDate(results: ReleaseResult[], type: number): string | null {
  const us = results.find(r => r.iso_3166_1 === 'US')
  if (!us) return null
  const entry = us.release_dates.find(d => d.type === type)
  if (!entry?.release_date) return null
  return new Date(entry.release_date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function resolveFromMediaInfo(
  mediaInfo: MediaInfo | null,
  releases: ReleaseResult[]
): { hd: UiState; fourK: UiState; mediaId: number; hdInfo: string | null; fourKInfo: string | null; digitalRelease: string | null; physicalRelease: string | null } {
  const digitalRelease = extractReleaseDate(releases, TMDB_RELEASE_DIGITAL)
  const physicalRelease = extractReleaseDate(releases, TMDB_RELEASE_PHYSICAL)
  if (!mediaInfo) {
    return { hd: resolveUiState(undefined, []), fourK: resolveUiState(undefined, []), mediaId: 0, hdInfo: null, fourKInfo: null, digitalRelease, physicalRelease }
  }
  const hdRequests = (mediaInfo.requests ?? []).filter(r => !r.is4k)
  const fourKRequests = (mediaInfo.requests ?? []).filter(r => r.is4k)
  return {
    hd: resolveUiState(mediaInfo.status, hdRequests),
    fourK: resolveUiState(mediaInfo.status4k, fourKRequests),
    mediaId: mediaInfo.id,
    hdInfo: formatRequesterName(hdRequests),
    fourKInfo: formatRequesterName(fourKRequests),
    digitalRelease,
    physicalRelease,
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
      const { mediaInfo, releases } = await fetchMediaInfo(config.baseUrl, config.apiKey, message.tmdbId, message.mediaType)
      return { ok: true, ...resolveFromMediaInfo(mediaInfo, releases) }
    }

    if (message.type === 'REQUEST_MEDIA') {
      const res = await fetch(`${config.baseUrl}/api/v1/request`, {
        method: 'POST',
        headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType: message.mediaType, mediaId: message.tmdbId, is4k: message.is4k }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      // Re-fetch to get the actual updated status
      const { mediaInfo, releases } = await fetchMediaInfo(config.baseUrl, config.apiKey, message.tmdbId, message.mediaType)
      return { ok: true, ...resolveFromMediaInfo(mediaInfo, releases) }
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
