import { handleMessage } from './index'

const mockStorage = { seerr_base_url: 'http://localhost:5055', seerr_api_key: 'test-key' }

describe('handleMessage', () => {
  beforeEach(() => {
    // Mock chrome.storage.sync — re-created each test so resetAllMocks won't kill the impl
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue(mockStorage),
        },
      },
    } as unknown as typeof chrome
  })
  afterEach(() => jest.resetAllMocks())

  describe('GET_CONFIG', () => {
    it('returns baseUrl from storage', async () => {
      const result = await handleMessage({ type: 'GET_CONFIG' })
      expect(result).toEqual({ ok: true, baseUrl: 'http://localhost:5055' })
    })

    it('returns NOT_CONFIGURED error when base URL is missing', async () => {
      ;(chrome.storage.sync.get as jest.Mock).mockResolvedValueOnce({})
      const result = await handleMessage({ type: 'GET_CONFIG' })
      expect(result).toEqual({
        ok: false,
        error: 'NOT_CONFIGURED',
        message: 'Seerr base URL not configured',
      })
    })
  })

  describe('GET_MEDIA_STATUS', () => {
    it('returns resolved hd and fourK states for a known movie', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mediaInfo: {
            id: 42,
            tmdbId: 123,
            status: 5,    // AVAILABLE
            status4k: 1,  // UNKNOWN → requestable
            requests: [],
          },
        }),
      }) as unknown as typeof fetch

      const result = await handleMessage({ type: 'GET_MEDIA_STATUS', tmdbId: 123, mediaType: 'movie' })
      expect(result).toEqual({ ok: true, hd: 'available', fourK: 'requestable', mediaId: 42, hdInfo: null, fourKInfo: null, theatricalRelease: null, digitalRelease: null, physicalRelease: null })
    })

    it('returns requestable for both when mediaInfo is absent', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: null }),
      }) as unknown as typeof fetch

      const result = await handleMessage({ type: 'GET_MEDIA_STATUS', tmdbId: 999, mediaType: 'movie' })
      expect(result).toEqual({ ok: true, hd: 'requestable', fourK: 'requestable', mediaId: 0, hdInfo: null, fourKInfo: null, theatricalRelease: null, digitalRelease: null, physicalRelease: null })
    })

    it('returns API_ERROR on fetch failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch

      const result = await handleMessage({ type: 'GET_MEDIA_STATUS', tmdbId: 123, mediaType: 'movie' })
      expect(result).toMatchObject({ ok: false, error: 'API_ERROR' })
    })
  })

  describe('REQUEST_MEDIA', () => {
    it('posts a request and returns refreshed status', async () => {
      let callCount = 0
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          // POST /request
          return { ok: true, json: async () => ({}) }
        }
        // GET /movie/{tmdbId} re-fetch
        return {
          ok: true,
          json: async () => ({
            mediaInfo: {
              id: 42,
              tmdbId: 123,
              status: 2,
              status4k: 1,
              requests: [
                { status: 1, is4k: false, createdAt: '2026-01-01T00:00:00.000Z' },
              ],
            },
          }),
        }
      }) as unknown as typeof fetch

      const result = await handleMessage({ type: 'REQUEST_MEDIA', tmdbId: 123, mediaType: 'movie', is4k: false })
      expect(result).toEqual({ ok: true, hd: 'pending-approval', fourK: 'requestable', mediaId: 42, hdInfo: null, fourKInfo: null, theatricalRelease: null, digitalRelease: null, physicalRelease: null })
    })
  })
})
