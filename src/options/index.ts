const baseUrlInput = document.getElementById('base-url') as HTMLInputElement
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement
const hideSharingInput = document.getElementById('hide-sharing') as HTMLInputElement
const btnSave = document.getElementById('btn-save') as HTMLButtonElement
const btnTest = document.getElementById('btn-test') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement

function setStatus(msg: string, type: 'ok' | 'err' | 'info' | ''): void {
  statusEl.textContent = msg
  statusEl.className = type
}

// Load saved values on open
;(async () => {
  const stored = await chrome.storage.sync.get(['seerr_base_url', 'seerr_api_key', 'hide_sharing_panel'])
  if (stored['seerr_base_url']) baseUrlInput.value = stored['seerr_base_url'] as string
  if (stored['seerr_api_key']) apiKeyInput.value = stored['seerr_api_key'] as string
  if (stored['hide_sharing_panel']) hideSharingInput.checked = stored['hide_sharing_panel'] as boolean
})()

btnSave.addEventListener('click', async () => {
  const baseUrl = baseUrlInput.value.trim().replace(/\/$/, '')
  const apiKey = apiKeyInput.value.trim()
  if (!baseUrl || !apiKey) {
    setStatus('Both fields are required.', 'err')
    return
  }
  await chrome.storage.sync.set({
    seerr_base_url: baseUrl,
    seerr_api_key: apiKey,
    hide_sharing_panel: hideSharingInput.checked,
  })
  setStatus('Settings saved.', 'ok')
})

btnTest.addEventListener('click', async () => {
  const baseUrl = baseUrlInput.value.trim().replace(/\/$/, '')
  const apiKey = apiKeyInput.value.trim()
  if (!baseUrl || !apiKey) {
    setTestState('err', 'Enter both fields first')
    return
  }

  setTestState('testing', 'Testing…')
  try {
    // Step 1: confirm it's a Seerr instance by checking the public settings endpoint
    // and validating the response contains Seerr-specific fields
    const publicRes = await fetch(`${baseUrl}/api/v1/settings/public`)
    if (!publicRes.ok) throw new Error(`Cannot reach server (${publicRes.status})`)
    const publicData = await publicRes.json() as Record<string, unknown>
    if (!('applicationTitle' in publicData) && !('hideAvailable' in publicData)) {
      throw new Error('Not a Seerr instance')
    }

    // Step 2: validate API key via /auth/me
    const authRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { 'X-Api-Key': apiKey },
    })
    if (authRes.status === 403 || authRes.status === 401) throw new Error('Invalid API key')
    if (!authRes.ok) throw new Error(`Auth check failed (${authRes.status})`)
    const authData = await authRes.json() as Record<string, unknown>
    if (!('id' in authData) || !('email' in authData)) throw new Error('Invalid API key')

    setTestState('ok', `Connected — ${String(publicData['applicationTitle'] ?? 'Seerr')}`)
  } catch (err) {
    setTestState('err', err instanceof Error ? err.message : 'Connection failed')
  }
})

function setTestState(state: 'testing' | 'ok' | 'err', label: string): void {
  btnTest.textContent = label
  btnTest.className = `btn btn-test ${state}`
  btnTest.disabled = state === 'testing'
}
