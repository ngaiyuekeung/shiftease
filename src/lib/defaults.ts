import type { Data, Shift } from '../types'

export const PALETTE = [
  '#D0893A',
  '#3E7EA8',
  '#655892',
  '#C46A58',
  '#3F8F78',
  '#C45C78',
  '#8A734B',
  '#5E7A4F',
  '#4E6E8A',
  '#A65448',
]

export const DEFAULT_SHIFTS: Shift[] = [
  { id: 'morning', name: '早班', start: '07:00', end: '15:00', color: '#D0893A' },
  { id: 'mid', name: '中班', start: '15:00', end: '23:00', color: '#3E7EA8' },
  { id: 'night', name: '夜班', start: '23:00', end: '07:00', color: '#655892' },
  { id: 'rdo', name: 'RDO', start: null, end: null, color: '#5E7A4F' },
  { id: 'al', name: 'AL', start: null, end: null, color: '#C46A58' },
]

export function defaultData(): Data {
  return {
    name: '',
    shifts: DEFAULT_SHIFTS.map((shift) => ({ ...shift })),
    days: {},
  }
}
