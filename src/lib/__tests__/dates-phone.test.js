import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, todayIso } from '../dates'
import { formatPhone, normalizePhone } from '../phone'

describe('dates', () => {
  it("uses the local calendar day, not UTC (no 'yesterday' before 5:30 AM IST)", () => {
    const earlyMorning = new Date(2026, 9, 25, 1, 30) // 25 Oct, 1:30 AM local
    expect(todayIso(earlyMorning)).toBe('2026-10-25')
  })

  it('adds days across month ends', () => {
    expect(addDays('2026-10-20', 30)).toBe('2026-11-19')
    expect(daysBetween('2026-10-20', '2026-11-19')).toBe(30)
  })
})

describe('phone numbers', () => {
  it('normalizes like the server', () => {
    expect(normalizePhone('99944 45388')).toBe('919994445388')
    expect(normalizePhone('+91 99944 45388')).toBe('919994445388')
    expect(normalizePhone('09994445388')).toBe('919994445388')
    expect(normalizePhone('+971 50 123 4567')).toBe('971501234567')
    expect(normalizePhone('12345')).toBeNull()
  })

  it('displays Indian numbers readably', () => {
    expect(formatPhone('919994445388')).toBe('+91 99944 45388')
  })
})
