import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Tool } from './types'
import { CalendarCard } from './components/CalendarCard'
import { Dock } from './components/Dock'
import { Header } from './components/Header'
import { ShiftSheet } from './components/ShiftSheet'
import { TodayCard } from './components/TodayCard'
import { TomorrowCard } from './components/TomorrowCard'
import { dateKey, monthOf } from './lib/logic'
import { useApp } from './state'

function useTodayKey(): string {
  const [key, setKey] = useState(() => dateKey(new Date()))
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = dateKey(new Date())
      setKey((current) => (current === next ? current : next))
    }, 30000)
    return () => window.clearInterval(timer)
  }, [])
  return key
}

export function App() {
  const { assign } = useApp()
  const todayKey = useTodayKey()
  const [tool, setTool] = useState<Tool>('none')
  const [selected, setSelected] = useState<string | null>(null)
  const [brushId, setBrushId] = useState<string | null>(null)
  const [eraser, setEraser] = useState(false)
  const [visible, setVisible] = useState(() => monthOf(dateKey(new Date())))
  const [dir, setDir] = useState(1)
  const [sheet, setSheet] = useState(false)
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  function changeMonth(delta: number) {
    setDir(delta > 0 ? 1 : -1)
    setVisible((current) => {
      const next = new Date(current.y, current.m + delta, 1)
      return { y: next.getFullYear(), m: next.getMonth() }
    })
  }

  function showMonth(next: { y: number; m: number }) {
    const current = visibleRef.current
    if (current.y === next.y && current.m === next.m) return
    const from = current.y * 12 + current.m
    const to = next.y * 12 + next.m
    setDir(to < from ? -1 : 1)
    setVisible(next)
  }

  function calm() {
    setSelected(null)
    setTool('none')
    setSheet(false)
    showMonth(monthOf(todayKey))
  }

  function onTool(next: Tool) {
    setSheet(false)
    if (tool === next) {
      setTool('none')
      return
    }
    if (next === 'brush') setSelected(null)
    setTool(next)
  }

  function onTapDay(date: string) {
    if (tool === 'brush') return
    if (tool === 'cycle') {
      setSelected(date)
      return
    }
    setSelected((current) => (current === date ? null : date))
  }

  const calmRef = useRef(calm)
  const monthRef = useRef(changeMonth)
  calmRef.current = calm
  monthRef.current = changeMonth

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (event.key === 'Escape') target.blur()
        return
      }
      if (event.key === 'Escape') calmRef.current()
      if (event.key === 'ArrowLeft') monthRef.current(-1)
      if (event.key === 'ArrowRight') monthRef.current(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onBlank(event: PointerEvent<HTMLDivElement>) {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-keep]')) return
    calm()
  }

  return (
    <div className="shell" onPointerDown={onBlank}>
      <div className="phone">
        <Header />
        <TodayCard todayKey={todayKey} />
        <TomorrowCard todayKey={todayKey} />
        <CalendarCard
          todayKey={todayKey}
          visible={visible}
          dir={dir}
          selected={selected}
          tool={tool}
          canPaint={eraser || Boolean(brushId)}
          brushShiftId={brushId}
          eraser={eraser}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          onToday={() => showMonth(monthOf(todayKey))}
          onTapDay={onTapDay}
          onTapBlank={() => {
            if (tool === 'none') setSelected(null)
          }}
          onAssign={assign}
        />
        <Dock
          todayKey={todayKey}
          selected={selected}
          tool={tool}
          brushId={brushId}
          eraser={eraser}
          onTool={onTool}
          onBrushId={setBrushId}
          onEraser={setEraser}
          onOpenShifts={() => {
            setTool('none')
            setSheet(true)
          }}
        />
      </div>
      {sheet ? <ShiftSheet onClose={() => setSheet(false)} /> : null}
    </div>
  )
}
