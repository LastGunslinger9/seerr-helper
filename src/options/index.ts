const baseUrlInput = document.getElementById('base-url') as HTMLInputElement
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement
const hideSharingInput = document.getElementById('hide-sharing') as HTMLInputElement
const btnSave = document.getElementById('btn-save') as HTMLButtonElement
const btnTest = document.getElementById('btn-test') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement

function setStatus(msg: string, type: 'ok' | 'err' | ''): void {
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
    setStatus('Enter both fields before testing.', 'err')
    return
  }

  setStatus('Testing…', '')
  try {
    // Step 1: check URL is reachable (no auth needed)
    const publicRes = await fetch(`${baseUrl}/api/v1/settings/public`)
    if (!publicRes.ok) throw new Error(`URL unreachable (${publicRes.status})`)

    // Step 2: validate API key
    const authRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { 'X-Api-Key': apiKey },
    })
    if (!authRes.ok) throw new Error(`Invalid API key (${authRes.status})`)

    setStatus('Connection successful!', 'ok')
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Connection failed', 'err')
  }
})
