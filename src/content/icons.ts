import type { ExtendedUiState } from '../utils/types'

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

type ButtonIconState = Exclude<ExtendedUiState, 'loading'>

export const BUTTON_ICON: Record<ButtonIconState, string> = {
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
}
