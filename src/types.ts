export type Shift = {
  id: string
  name: string
  start: string | null
  end: string | null
  color: string
}

export type DayEntry = {
  shiftId: string | null
  note: string
}

export type Days = Record<string, DayEntry>

export type Data = {
  name: string
  shifts: Shift[]
  days: Days
}

export type Tool = 'none' | 'brush' | 'cycle'
