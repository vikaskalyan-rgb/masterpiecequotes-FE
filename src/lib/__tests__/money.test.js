import { describe, expect, it } from 'vitest'
import { amountInWords, formatRupees, itemAmount, itemQuantity, quoteRef, roomTotal, subtotalOf, suggestedTotal } from '../money'

// These mirror the backend's TotalsTest so the live preview and the saved quote always agree.
describe('quote arithmetic', () => {
  it('computes sqft from length x width, ignoring any typed quantity', () => {
    expect(itemQuantity({ unit: 'SQFT', length: '7', width: '4', quantity: '999' })).toBe(28)
    expect(itemQuantity({ unit: 'SQFT', length: '7.25', width: '3.33' })).toBe(24.14)
    expect(itemQuantity({ unit: 'SQFT', length: '7', width: '' })).toBe(0)
  })

  it('uses the typed count for Nos items', () => {
    expect(itemQuantity({ unit: 'NOS', quantity: '3', length: '7', width: '4' })).toBe(3)
  })

  it('rounds amounts half-up to the paisa without float drift', () => {
    expect(itemAmount({ unit: 'SQFT', length: '7.25', width: '3.33', rate: '1234.55' })).toBe(29802.04)
    expect(itemAmount({ unit: 'NOS', quantity: '3', rate: '0.1' })).toBe(0.3)
  })

  it('adds rooms and fittings into the subtotal', () => {
    const rooms = [
      { items: [{ unit: 'SQFT', length: '7', width: '4', rate: '1500' }, { unit: 'NOS', quantity: '2', rate: '850' }] },
    ]
    expect(roomTotal(rooms[0])).toBe(43700)
    expect(subtotalOf(rooms, '2500')).toBe(46200)
  })

  it('applies the rounding rule like the server', () => {
    expect(suggestedTotal(124499, 'NEAREST', 1000)).toBe(124000)
    expect(suggestedTotal(124500, 'NEAREST', 1000)).toBe(125000)
    expect(suggestedTotal(124001, 'UP', 1000)).toBe(125000)
    expect(suggestedTotal(124000, 'UP', 1000)).toBe(124000)
    expect(suggestedTotal(46200, 'UP', 100)).toBe(46200)
    expect(suggestedTotal(124499.5, 'NONE', 1000)).toBe(124499.5)
  })
})

describe('formatting', () => {
  it('formats rupees in the Indian system and shows paise only when present', () => {
    expect(formatRupees(355000)).toBe('₹3,55,000')
    expect(formatRupees(12345.6)).toBe('₹12,345.60')
  })

  it('writes amounts in words with lakh and crore', () => {
    expect(amountInWords(475000)).toBe('Four Lakh Seventy Five Thousand Rupees Only')
    expect(amountInWords(12500000)).toBe('One Crore Twenty Five Lakh Rupees Only')
    expect(amountInWords(1001)).toBe('One Thousand One Rupees Only')
    expect(amountInWords(0)).toBe('Zero Rupees Only')
  })

  it('formats quote references', () => {
    expect(quoteRef(42)).toBe('MP-0042')
    expect(quoteRef(null)).toBe('New quote')
  })
})
