import { BUTTON_ICON } from './icons'

const ALL_BUTTON_STATES = [
  'requestable', 'requesting', 'success',
  'pending-approval', 'approved', 'declined',
  'failed', 'processing', 'partial',
  'available', 'blocklisted', 'not-configured', 'error',
] as const

it('BUTTON_ICON has a ri- entry for every non-loading ExtendedUiState', () => {
  for (const state of ALL_BUTTON_STATES) {
    expect(BUTTON_ICON[state]).toMatch(/^ri-/)
  }
})
