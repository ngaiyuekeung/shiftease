import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Shift } from './types'
import { reducer, makeState, type State } from './lib/reducer'
import { load, save } from './lib/storage'

type Api = {
  setName: (name: string) => void
  assign: (stroke: number, date: string, shiftId: string | null) => void
  note: (date: string, note: string, checkpoint: boolean) => void
  cycle: (start: string, end: string, pattern: string[]) => void
  undo: () => void
  saveShift: (shift: Shift) => void
  deleteShift: (id: string) => void
}

type AppState = State & Api & { undoCount: number }

const Context = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => makeState(load()))

  useEffect(() => {
    const timer = window.setTimeout(() => {
      save({ name: state.name, shifts: state.shifts, days: state.days })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [state.name, state.shifts, state.days])

  const api = useMemo<Api>(
    () => ({
      setName: (name) => dispatch({ type: 'setName', name }),
      assign: (stroke, date, shiftId) => dispatch({ type: 'assign', stroke, date, shiftId }),
      note: (date, note, checkpoint) => dispatch({ type: 'note', date, note, checkpoint }),
      cycle: (start, end, pattern) => dispatch({ type: 'cycle', start, end, pattern }),
      undo: () => dispatch({ type: 'undo' }),
      saveShift: (shift) => dispatch({ type: 'upsertShift', shift }),
      deleteShift: (id) => dispatch({ type: 'deleteShift', id }),
    }),
    [],
  )

  const value = useMemo<AppState>(
    () => ({ ...state, ...api, undoCount: state.past.length }),
    [state, api],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useApp(): AppState {
  const value = useContext(Context)
  if (!value) throw new Error('useApp must be used inside AppStateProvider')
  return value
}
