import type { Data, DayEntry, Days, Shift } from '../types'
import { eachDate } from './logic'

export type State = Data & {
  past: Days[]
  openStroke: number | null
}

export type Action =
  | { type: 'setName'; name: string }
  | { type: 'assign'; stroke: number; date: string; shiftId: string | null }
  | { type: 'note'; date: string; note: string; checkpoint: boolean }
  | { type: 'cycle'; start: string; end: string; pattern: string[] }
  | { type: 'undo' }
  | { type: 'upsertShift'; shift: Shift }
  | { type: 'deleteShift'; id: string }

export function makeState(data: Data): State {
  return { ...data, past: [], openStroke: null }
}

function pushPast(state: State): Days[] {
  return [...state.past, state.days].slice(-30)
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setName':
      return { ...state, name: action.name.slice(0, 24) }
    case 'assign':
      return assign(state, action)
    case 'note':
      return note(state, action)
    case 'cycle':
      return cycle(state, action)
    case 'undo': {
      if (!state.past.length) return state
      const days = state.past[state.past.length - 1] ?? {}
      return { ...state, days, past: state.past.slice(0, -1), openStroke: null }
    }
    case 'upsertShift': {
      const exists = state.shifts.some((shift) => shift.id === action.shift.id)
      const shifts = exists
        ? state.shifts.map((shift) => (shift.id === action.shift.id ? action.shift : shift))
        : [...state.shifts, action.shift]
      return { ...state, shifts }
    }
    case 'deleteShift':
      return deleteShift(state, action.id)
    default:
      return state
  }
}

function assign(state: State, action: Extract<Action, { type: 'assign' }>): State {
  const { date, shiftId, stroke } = action
  if (shiftId && !state.shifts.some((shift) => shift.id === shiftId)) return state
  const current = state.days[date]
  let days: Days
  if (shiftId === null) {
    if (!current?.shiftId) return state
    days = { ...state.days }
    if (current.note) days[date] = { shiftId: null, note: current.note }
    else delete days[date]
  } else if (current?.shiftId === shiftId) {
    return state
  } else {
    days = { ...state.days, [date]: { shiftId, note: current?.note ?? '' } }
  }
  const past = state.openStroke === stroke ? state.past : pushPast(state)
  return { ...state, days, past, openStroke: stroke }
}

function note(state: State, action: Extract<Action, { type: 'note' }>): State {
  const text = action.note.replace(/\s+/g, ' ').trim().slice(0, 40)
  const current = state.days[action.date]
  if ((current?.note ?? '') === text) return state
  const days: Days = { ...state.days }
  const shiftId = current?.shiftId ?? null
  if (!shiftId && !text) delete days[action.date]
  else days[action.date] = { shiftId, note: text }
  return {
    ...state,
    days,
    past: action.checkpoint ? pushPast(state) : state.past,
    openStroke: action.checkpoint ? null : state.openStroke,
  }
}

function cycle(state: State, action: Extract<Action, { type: 'cycle' }>): State {
  if (!action.pattern.length) return state
  if (action.pattern.some((id) => !state.shifts.some((shift) => shift.id === id))) return state
  const keys = eachDate(action.start, action.end)
  if (!keys.length) return state
  const days: Days = { ...state.days }
  keys.forEach((key, index) => {
    const shiftId = action.pattern[index % action.pattern.length] ?? ''
    const prev: DayEntry | undefined = days[key]
    days[key] = { shiftId, note: prev?.note ?? '' }
  })
  return { ...state, days, past: pushPast(state), openStroke: null }
}

function deleteShift(state: State, id: string): State {
  const shifts = state.shifts.filter((shift) => shift.id !== id)
  const days: Days = {}
  for (const [key, entry] of Object.entries(state.days)) {
    if (entry.shiftId === id) {
      if (entry.note) days[key] = { shiftId: null, note: entry.note }
    } else {
      days[key] = entry
    }
  }
  return { ...state, shifts, days, past: [], openStroke: null }
}
