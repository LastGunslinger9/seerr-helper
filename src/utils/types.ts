// Media status values from mediaInfo.status / mediaInfo.status4k
export const MediaStatus = {
  UNKNOWN: 1,
  PENDING: 2,
  PROCESSING: 3,
  PARTIALLY_AVAILABLE: 4,
  AVAILABLE: 5,
  BLOCKLISTED: 6,
  DELETED: 7,
} as const
export type MediaStatus = typeof MediaStatus[keyof typeof MediaStatus]

// Request workflow status values from mediaInfo.requests[].status
export const RequestStatus = {
  PENDING: 1,
  APPROVED: 2,
  DECLINED: 3,
  FAILED: 4,
  COMPLETED: 5,
} as const
export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus]

// Resolved UI state sent from background to content script
export type UiState =
  | 'requestable'
  | 'pending-approval'
  | 'approved'
  | 'declined'
  | 'failed'
  | 'processing'
  | 'partial'
  | 'available'
  | 'blocklisted'

// Shape of a single request in mediaInfo.requests[]
export interface MediaRequest {
  status: RequestStatus
  is4k: boolean
  createdAt: string
  requestedBy?: { displayName?: string; username: string }
}

// Shape of the mediaInfo object from GET /movie/{tmdbId}
export interface MediaInfo {
  id: number
  tmdbId: number
  status: MediaStatus
  status4k: MediaStatus
  requests: MediaRequest[]
}

// Messages from content script → background service worker
export type MessageRequest =
  | { type: 'GET_MEDIA_STATUS'; tmdbId: number; mediaType: 'movie' | 'tv' }
  | { type: 'REQUEST_MEDIA'; tmdbId: number; mediaType: 'movie' | 'tv'; is4k: boolean }
  | { type: 'GET_CONFIG' }

// Responses from background → content script
export type MessageResponse =
  | { ok: true; hd: UiState; fourK: UiState; mediaId: number; hdInfo: string | null; fourKInfo: string | null; theatricalRelease: string | null; digitalRelease: string | null; physicalRelease: string | null }
  | { ok: true; baseUrl: string }
  | { ok: false; error: 'NOT_CONFIGURED' | 'NOT_FOUND' | 'API_ERROR'; message: string }
