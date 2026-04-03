import { MediaRequest, UiState } from './types'

/**
 * Resolves a single quality tier's UI state from its media status and
 * the filtered (same-quality) request list.
 *
 * @param status - mediaInfo.status or mediaInfo.status4k (undefined if absent)
 * @param requests - mediaInfo.requests pre-filtered to the correct is4k value
 */
export function resolveUiState(
  status: number | undefined,
  requests: MediaRequest[]
): UiState {
  // UNKNOWN (1), DELETED (7), or absent → allow requesting
  if (status === undefined || status === 1 || status === 7) return 'requestable'

  if (status === 2) {
    // PENDING — derive state from the most recent matching request
    if (requests.length === 0) return 'requestable'

    const sorted = [...requests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const [latest] = sorted
    if (!latest) return 'requestable'

    switch (latest.status) {
      case 1: return 'pending-approval'
      case 2: return 'approved'
      case 3: return 'declined'
      case 4: return 'failed'
      case 5: return 'processing'
      default: return 'requestable'
    }
  }

  if (status === 3) return 'processing'
  if (status === 4) return 'partial'
  if (status === 5) return 'available'
  if (status === 6) return 'blocklisted'

  return 'requestable'
}
