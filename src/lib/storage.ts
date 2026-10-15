import type { Data, DayEntry, Days, Shift } from '../types'
import { PALETTE, defaultData } from './defaults'
import { normalizeTime } from './logic'

const KEY = 'shiftease.v1'
const HEX = /^#[0-9a-fA-F]{6}$/

export function load(): Data {
  if (typeof localStorage === 'undefined') return defaultData()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData()
    return sanitize(JSON.parse(raw))
  } catch {
    return defaultData()
  }
}

export function save(data: Data): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // The calendar still works for this session if storage is full.
  }
}

function sanitize(value: unknown): Data {
  if (!value || typeof value !== 'object') return defaultData()
  const record = value as Partial<Data>
  const shifts = Array.isArray(record.shifts) ? record.shifts.map(sanitizeShift).filter((shift): shift is Shift => shift !== null) : []
  return {
    name: typeof record.name === 'string' ? record.name.trim().slice(0, 24) : '',
    shifts: shifts.length ? shifts : defaultData().shifts,
    days: sanitizeDays(record.days, new Set((shifts.length ? shifts : defaultData().shifts).map((shift) => shift.id))),
  }
}

function sanitizeShift(value: unknown): Shift | null {
  if (!value || typeof value !== 'object') return null
  const shift = value as Partial<Shift>
  if (typeof shift.id !== 'string' || !shift.id) return null
  if (typeof shift.name !== 'string' || !shift.name.trim()) return null
  const start = typeof shift.start === 'string' ? normalizeTime(shift.start) : null
  const end = typeof shift.end === 'string' ? normalizeTime(shift.end) : null
  const timed = Boolean(start && end)
  return {
    id: shift.id,
    name: shift.name.trim().slice(0, 16),
    start: timed ? start : null,
    end: timed ? end : null,
    color: typeof shift.color === 'string' && HEX.test(shift.color) ? shift.color : PALETTE[0],
  }
}

function sanitizeDays(value: unknown, ids: Set<string>): Days {
  if (!value || typeof value !== 'object') return {}
  const days: Days = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !entry || typeof entry !== 'object') continue
    const day = entry as Partial<DayEntry>
    const note = typeof day.note === 'string' ? day.note.replace(/\s+/g, ' ').trim().slice(0, 40) : ''
    const shiftId = typeof day.shiftId === 'string' && ids.has(day.shiftId) ? day.shiftId : null
    if (!shiftId && !note) continue
    days[key] = { shiftId, note }
  }
  return days
}
