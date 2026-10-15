import type { Shift } from '../types'

export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function addDaysKey(key: string, days: number): string {
  return dateKey(addDays(parseKey(key), days))
}

export function monthOf(key: string): { y: number; m: number } {
  const date = parseKey(key)
  return { y: date.getFullYear(), m: date.getMonth() }
}

export function monthEndKey(key: string): string {
  const date = parseKey(key)
  return dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = []
  let cursor = parseKey(start)
  while (dateKey(cursor) <= end) {
    out.push(dateKey(cursor))
    cursor = addDays(cursor, 1)
    if (out.length > 400) break
  }
  return out
}

export function countDays(start: string, end: string): number {
  return eachDate(start, end).length
}

export function monthCells(year: number, month: number): string[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, index) => dateKey(addDays(start, index)))
}

export function daysUntilMonthEnd(date: Date): number {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return last - date.getDate()
}

export function monthRemainCopy(key: string): string {
  const left = daysUntilMonthEnd(parseKey(key))
  if (left <= 0) return '今天是月底'
  return `距月底 ${left} 天`
}

export function formatPretty(key: string): { md: string; week: string } {
  const date = parseKey(key)
  return {
    md: `${date.getMonth() + 1}月${date.getDate()}日`,
    week: `周${'日一二三四五六'[date.getDay()]}`,
  }
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function parseHM(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

export function normalizeTime(value: string): string | null {
  const parsed = parseHM(value)
  if (!parsed) return null
  return `${String(parsed.h).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')}`
}

export function shiftBounds(day: Date, shift: Shift): { start: Date; end: Date } | null {
  if (!shift.start || !shift.end) return null
  const startParts = parseHM(shift.start)
  const endParts = parseHM(shift.end)
  if (!startParts || !endParts) return null
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startParts.h, startParts.m, 0, 0)
  let end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endParts.h, endParts.m, 0, 0)
  if (end.getTime() <= start.getTime()) {
    end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, endParts.h, endParts.m, 0, 0)
  }
  return { start, end }
}

export function hoursOf(shift: Shift): number | null {
  const bounds = shiftBounds(new Date(2026, 0, 1), shift)
  if (!bounds) return null
  return (bounds.end.getTime() - bounds.start.getTime()) / 36e5
}

export function formatHours(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (m === 0) return `${h} 小时`
  if (m === 30) return `${h}.5 小时`
  if (h === 0) return `${m} 分钟`
  return `${h} 小时 ${m} 分`
}

export function formatRemain(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (total <= 0) return '不到 1 分钟'
  if (h && m) return `${h} 小时 ${m} 分`
  if (h) return `${h} 小时`
  return `${m} 分钟`
}

export function formatRange(shift: Shift): string | null {
  if (!shift.start || !shift.end) return null
  return `${shift.start} – ${shift.end}`
}

export function formatHM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export type Phase =
  | { kind: 'untimed' }
  | { kind: 'upcoming'; until: number }
  | { kind: 'working'; left: number }
  | { kind: 'done' }

export function phase(day: Date, shift: Shift, now: Date): Phase {
  const bounds = shiftBounds(day, shift)
  if (!bounds) return { kind: 'untimed' }
  if (now.getTime() < bounds.start.getTime()) {
    return { kind: 'upcoming', until: bounds.start.getTime() - now.getTime() }
  }
  if (now.getTime() < bounds.end.getTime()) {
    return { kind: 'working', left: bounds.end.getTime() - now.getTime() }
  }
  return { kind: 'done' }
}

export function lingering(day: Date, shift: Shift | null, now: Date): { end: Date; left: number } | null {
  if (!shift) return null
  const bounds = shiftBounds(day, shift)
  if (!bounds) return null
  const crosses =
    bounds.end.getFullYear() !== day.getFullYear() ||
    bounds.end.getMonth() !== day.getMonth() ||
    bounds.end.getDate() !== day.getDate()
  if (!crosses) return null
  if (now.getTime() >= bounds.start.getTime() && now.getTime() < bounds.end.getTime()) {
    return { end: bounds.end, left: bounds.end.getTime() - now.getTime() }
  }
  return null
}

export function lingerCopy(shift: Shift, end: Date): string {
  return `昨晚的${shift.name}还要到 ${formatHM(end)}`
}

function isNight(shift: Shift): boolean {
  if (!shift.start || !shift.end) return false
  const hour = Number(shift.start.slice(0, 2))
  if (hour >= 20 || hour < 5) return true
  return shift.end < shift.start
}

export function humor(shift: Shift | null, kind: Phase['kind'], hours: number | null): string | null {
  if (!shift) return null
  const name = shift.name.trim().toUpperCase()
  if (!shift.start || !shift.end) {
    if (name === 'RDO') return '今天不用看表'
    if (name === 'AL') return '年假，慢慢过'
    return null
  }
  if (hours == null) return null
  if (kind === 'done') return '收工，今日🐮🐴'
  if (isNight(shift)) return `夜班 ${formatHours(hours)}，撑住`
  return `今日🐮🐴 ${formatHours(hours)}`
}

function remainPhrase(ms: number, tail: '离下班' | '开始'): string {
  const label = formatRemain(ms)
  if (label === '不到 1 分钟') return `还有不到 1 分钟${tail}`
  return `还有 ${label}${tail}`
}

export type ShiftCopy = {
  title: string
  range: string | null
  meta: string | null
  aside: string | null
}

export function describeShift(shift: Shift | null, day: Date, now: Date): ShiftCopy {
  if (!shift) return { title: '还没排', range: null, meta: null, aside: null }
  const current = phase(day, shift, now)
  const hours = hoursOf(shift)
  let meta: string | null = null
  if (hours != null && current.kind === 'working') {
    meta = `${formatHours(hours)} · ${remainPhrase(current.left, '离下班')}`
  } else if (hours != null && current.kind === 'upcoming') {
    meta = `${formatHours(hours)} · ${remainPhrase(current.until, '开始')}`
  } else if (hours != null && current.kind === 'done') {
    meta = `${formatHours(hours)} · 已经下班`
  } else if (current.kind === 'untimed') {
    meta = '全天'
  }
  return {
    title: shift.name,
    range: formatRange(shift),
    meta,
    aside: humor(shift, current.kind, hours),
  }
}

export function tagText(note: string): string | null {
  const trimmed = note.trim()
  if (!trimmed) return null
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

export function textOn(hex: string): '#141414' | '#ffffff' {
  const value = Number.parseInt(hex.slice(1), 16)
  if (Number.isNaN(value)) return '#141414'
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = channel((value >> 16) & 255)
  const g = channel((value >> 8) & 255)
  const b = channel(value & 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.42 ? '#141414' : '#ffffff'
}

export function findShift(shifts: Shift[], id: string | null | undefined): Shift | null {
  if (!id) return null
  return shifts.find((shift) => shift.id === id) ?? null
}

export function hasAnyShift(days: Record<string, { shiftId: string | null }>): boolean {
  return Object.values(days).some((day) => day.shiftId)
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
