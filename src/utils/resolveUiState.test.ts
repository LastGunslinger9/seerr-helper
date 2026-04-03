import { resolveUiState } from './resolveUiState'
import { MediaRequest } from './types'

const req = (status: number, is4k: boolean, createdAt = '2026-01-01T00:00:00.000Z'): MediaRequest =>
  ({ status, is4k, createdAt } as MediaRequest)

describe('resolveUiState', () => {
  describe('media status absent or UNKNOWN (1) or DELETED (7)', () => {
    it('returns requestable when status is undefined', () => {
      expect(resolveUiState(undefined, [])).toBe('requestable')
    })
    it('returns requestable when status is 1', () => {
      expect(resolveUiState(1, [])).toBe('requestable')
    })
    it('returns requestable when status is 7', () => {
      expect(resolveUiState(7, [])).toBe('requestable')
    })
  })

  describe('media status PROCESSING (3)', () => {
    it('returns processing', () => {
      expect(resolveUiState(3, [])).toBe('processing')
    })
  })

  describe('media status PARTIALLY_AVAILABLE (4)', () => {
    it('returns partial', () => {
      expect(resolveUiState(4, [])).toBe('partial')
    })
  })

  describe('media status AVAILABLE (5)', () => {
    it('returns available', () => {
      expect(resolveUiState(5, [])).toBe('available')
    })
  })

  describe('media status BLOCKLISTED (6)', () => {
    it('returns blocklisted', () => {
      expect(resolveUiState(6, [])).toBe('blocklisted')
    })
  })

  describe('media status PENDING (2) — drills into request status', () => {
    it('returns requestable when no matching requests', () => {
      expect(resolveUiState(2, [])).toBe('requestable')
    })
    it('returns pending-approval when most recent request status is 1', () => {
      expect(resolveUiState(2, [req(1, false)])).toBe('pending-approval')
    })
    it('returns approved when most recent request status is 2', () => {
      expect(resolveUiState(2, [req(2, false)])).toBe('approved')
    })
    it('returns declined when most recent request status is 3', () => {
      expect(resolveUiState(2, [req(3, false)])).toBe('declined')
    })
    it('returns failed when most recent request status is 4', () => {
      expect(resolveUiState(2, [req(4, false)])).toBe('failed')
    })
    it('returns processing when most recent request status is 5', () => {
      expect(resolveUiState(2, [req(5, false)])).toBe('processing')
    })
    it('uses the most recent request when multiple requests exist', () => {
      const older = req(3, false, '2026-01-01T00:00:00.000Z') // declined
      const newer = req(1, false, '2026-06-01T00:00:00.000Z') // pending-approval
      expect(resolveUiState(2, [older, newer])).toBe('pending-approval')
    })
    it('filters out requests of opposite is4k value', () => {
      const hdReq = req(2, false) // approved
      const fourKReq = req(3, true) // declined — should be ignored
      expect(resolveUiState(2, [hdReq, fourKReq])).toBe('approved')
    })
  })
})
