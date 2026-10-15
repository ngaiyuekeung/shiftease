import { describe, expect, it } from 'vitest'
import { defaultData } from './defaults'
import {
  addDaysKey,
  countDays,
  daysUntilMonthEnd,
  describeShift,
  formatHours,
  greeting,
  hoursOf,
  lingerCopy,
  lingering,
  monthCells,
  monthEndKey,
  monthRemainCopy,
  phase,
  tagText,
} from './logic'
import { makeState, reducer } from './reducer'

const morning = { id: 'morning', name: '早班', start: '07:00', end: '15:00', color: '#D0893A' }
const night = { id: 'night', name: '夜班', start: '23:00', end: '07:00', color: '#655892' }
const rdo = { id: 'rdo', name: 'RDO', start: null, end: null, color: '#5E7A4F' }
const al = { id: 'al', name: 'AL', start: null, end: null, color: '#C46A58' }

describe('calendar dates', () => {
  it('builds a Monday-first October 2026 grid', () => {
    const cells = monthCells(2026, 9)
    expect(cells).toHaveLength(42)
    expect(cells[0]).toBe('2026-09-28')
    expect(cells[3]).toBe('2026-10-01')
    expect(cells[41]).toBe('2026-11-08')
  })

  it('counts days left in the month, not including today', () => {
    expect(daysUntilMonthEnd(new Date(2026, 9, 15))).toBe(16)
    expect(daysUntilMonthEnd(new Date(2026, 9, 31))).toBe(0)
    expect(monthRemainCopy('2026-10-15')).toBe('距月底 16 天')
    expect(monthRemainCopy('2026-10-31')).toBe('今天是月底')
  })

  it('counts inclusive spans', () => {
    expect(monthEndKey('2026-10-15')).toBe('2026-10-31')
    expect(countDays('2026-10-15', '2026-10-31')).toBe(17)
    expect(countDays('2026-10-15', addDaysKey('2026-10-15', 27))).toBe(28)
  })
})

describe('shifts', () => {
  it('counts overnight hours as a full block', () => {
    expect(hoursOf(morning)).toBe(8)
    expect(hoursOf(night)).toBe(8)
    expect(hoursOf(rdo)).toBeNull()
    expect(formatHours(8)).toBe('8 小时')
    expect(formatHours(7.5)).toBe('7.5 小时')
  })

  it('describes today while a morning shift is underway', () => {
    const copy = describeShift(morning, new Date(2026, 9, 15), new Date(2026, 9, 15, 10, 30))
    expect(copy.title).toBe('早班')
    expect(copy.range).toBe('07:00 – 15:00')
    expect(copy.meta).toBe('8 小时 · 还有 4 小时 30 分离下班')
    expect(copy.aside).toBe('今日🐮🐴 8 小时')
  })

  it('describes a shift that has not started, and one that is over', () => {
    const upcoming = describeShift(morning, new Date(2026, 9, 15), new Date(2026, 9, 15, 5, 0))
    expect(upcoming.meta).toBe('8 小时 · 还有 2 小时开始')
    const done = describeShift(morning, new Date(2026, 9, 15), new Date(2026, 9, 15, 16, 0))
    expect(done.meta).toBe('8 小时 · 已经下班')
    expect(done.aside).toBe('收工，今日🐮🐴')
  })

  it('keeps a night shift active after midnight and says so', () => {
    const now = new Date(2026, 9, 16, 1, 0)
    expect(phase(new Date(2026, 9, 15), night, now).kind).toBe('working')
    const linger = lingering(new Date(2026, 9, 15), night, now)
    expect(linger).not.toBeNull()
    expect(lingerCopy(night, linger!.end)).toBe('昨晚的夜班还要到 07:00')
    expect(lingering(new Date(2026, 9, 15), morning, now)).toBeNull()
  })

  it('uses plain names for RDO and AL', () => {
    expect(describeShift(rdo, new Date(2026, 9, 15), new Date(2026, 9, 15, 12)).aside).toBe('今天不用看表')
    expect(describeShift(al, new Date(2026, 9, 15), new Date(2026, 9, 15, 12)).aside).toBe('年假，慢慢过')
    expect(describeShift(rdo, new Date(2026, 9, 15), new Date(2026, 9, 15, 12)).meta).toBe('全天')
    const blob = JSON.stringify([
      describeShift(rdo, new Date(2026, 9, 15), new Date()),
      describeShift(al, new Date(2026, 9, 15), new Date()),
      describeShift(null, new Date(2026, 9, 15), new Date()),
    ])
    expect(blob).not.toContain('休息班')
  })

  it('hides an empty note and prefixes a tag', () => {
    expect(tagText('')).toBeNull()
    expect(tagText('   ')).toBeNull()
    expect(tagText('交接')).toBe('#交接')
    expect(tagText('#交接')).toBe('#交接')
  })

  it('greets by the hour', () => {
    expect(greeting(4)).toBe('Good night')
    expect(greeting(5)).toBe('Good morning')
    expect(greeting(12)).toBe('Good afternoon')
    expect(greeting(18)).toBe('Good evening')
  })
})

describe('scheduling', () => {
  const base = makeState(defaultData())

  it('groups one brush stroke into a single undo', () => {
    let state = reducer(base, { type: 'assign', stroke: 1, date: '2026-10-15', shiftId: 'morning' })
    state = reducer(state, { type: 'assign', stroke: 1, date: '2026-10-16', shiftId: 'morning' })
    expect(state.past).toHaveLength(1)
    expect(state.days['2026-10-15']?.shiftId).toBe('morning')
    expect(state.days['2026-10-16']?.shiftId).toBe('morning')
    state = reducer(state, { type: 'undo' })
    expect(state.days['2026-10-15']).toBeUndefined()
    expect(state.days['2026-10-16']).toBeUndefined()
  })

  it('keeps a separate undo step for the next stroke', () => {
    let state = reducer(base, { type: 'assign', stroke: 1, date: '2026-10-15', shiftId: 'morning' })
    state = reducer(state, { type: 'assign', stroke: 2, date: '2026-10-16', shiftId: 'mid' })
    state = reducer(state, { type: 'undo' })
    expect(state.days['2026-10-15']?.shiftId).toBe('morning')
    expect(state.days['2026-10-16']).toBeUndefined()
  })

  it('clears the shift and keeps the note', () => {
    let state = reducer(base, { type: 'assign', stroke: 1, date: '2026-10-15', shiftId: 'morning' })
    state = reducer(state, { type: 'note', date: '2026-10-15', note: '交接', checkpoint: true })
    state = reducer(state, { type: 'assign', stroke: 2, date: '2026-10-15', shiftId: null })
    expect(state.days['2026-10-15']).toEqual({ shiftId: null, note: '交接' })
  })

  it('repeats a cycle and keeps notes', () => {
    let state = reducer(base, { type: 'note', date: '2026-10-16', note: '培训', checkpoint: true })
    state = reducer(state, {
      type: 'cycle',
      start: '2026-10-15',
      end: '2026-10-18',
      pattern: ['morning', 'morning', 'rdo'],
    })
    expect(state.days['2026-10-15']?.shiftId).toBe('morning')
    expect(state.days['2026-10-16']).toEqual({ shiftId: 'morning', note: '培训' })
    expect(state.days['2026-10-17']?.shiftId).toBe('rdo')
    expect(state.days['2026-10-18']?.shiftId).toBe('morning')
    state = reducer(state, { type: 'undo' })
    expect(state.days['2026-10-15']).toBeUndefined()
    expect(state.days['2026-10-16']?.note).toBe('培训')
  })

  it('checkpoints a note once per editing session', () => {
    let state = reducer(base, { type: 'note', date: '2026-10-15', note: '交', checkpoint: true })
    state = reducer(state, { type: 'note', date: '2026-10-15', note: '交接', checkpoint: false })
    expect(state.past).toHaveLength(1)
    state = reducer(state, { type: 'undo' })
    expect(state.days['2026-10-15']).toBeUndefined()
  })
})
