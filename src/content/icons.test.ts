import { BUTTON_ICON } from './icons'

it('BUTTON_ICON has a ri- entry for every non-loading ExtendedUiState', () => {
  const states = Object.keys(BUTTON_ICON)
  expect(states.length).toBe(13)
  for (const state of states) {
    expect(BUTTON_ICON[state as keyof typeof BUTTON_ICON]).toMatch(/^ri-/)
  }
})
