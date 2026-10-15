import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Tool } from '../types'
import { Chip } from './Chip'
import {
  cn,
  findShift,
  formatPretty,
  monthCells,
  monthOf,
  monthRemainCopy,
  tagText,
  textOn,
} from '../lib/logic'
import { useApp } from '../state'

type Props = {
  todayKey: string
  visible: { y: number; m: number }
  dir: number
  selected: string | null
  tool: Tool
  canPaint: boolean
  brushShiftId: string | null
  eraser: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onTapDay: (date: string) => void
  onTapBlank: () => void
  onAssign: (stroke: number, date: string, shiftId: string | null) => void
}

function readDate(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest('[data-date]')?.getAttribute('data-date') ?? null
}

export function CalendarCard({
  todayKey,
  visible,
  dir,
  selected,
  tool,
  canPaint,
  brushShiftId,
  eraser,
  onPrev,
  onNext,
  onToday,
  onTapDay,
  onTapBlank,
  onAssign,
}: Props) {
  const { days, shifts, note } = useApp()
  const painting = useRef(false)
  const stroke = useRef(0)
  const origin = useRef<{ x: number; y: number; date: string | null; pointerId: number } | null>(null)
  const noteSession = useRef(false)
  const prevDays = useRef(days)
  const [pulsed, setPulsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    noteSession.current = false
  }, [selected])

  useEffect(() => {
    if (tool !== 'none' || !selected) return
    document.querySelector('.editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected, tool])
  const cells = monthCells(visible.y, visible.m)
  const viewingNow = visible.y === monthOf(todayKey).y && visible.m === monthOf(todayKey).m
  const selectedEntry = selected ? days[selected] : undefined
  const showEditor = tool === 'none' && selected !== null

  useEffect(() => {
    const before = prevDays.current
    if (before === days) return
    const changed: string[] = []
    const keys = new Set([...Object.keys(before), ...Object.keys(days)])
    for (const key of keys) {
      if ((before[key]?.shiftId ?? null) !== (days[key]?.shiftId ?? null)) changed.push(key)
    }
    prevDays.current = days
    if (!changed.length) return
    setPulsed((current) => {
      const next = new Set(current)
      for (const key of changed) next.add(key)
      return next
    })
    const timer = window.setTimeout(() => setPulsed(new Set()), 420)
    return () => window.clearTimeout(timer)
  }, [days])

  function paintAt(date: string) {
    if (!canPaint) return
    onAssign(stroke.current, date, eraser ? null : brushShiftId)
  }

  function assignDay(shiftId: string | null) {
    if (!selected) return
    stroke.current += 1
    onAssign(stroke.current, selected, shiftId)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target
    if (!(target instanceof Element)) return
    const onControl = Boolean(target.closest('button, a, input'))
    const date = readDate(target)
    if (onControl && !date) return
    if (tool === 'brush') {
      if (!date || !canPaint) return
      event.preventDefault()
      if (!painting.current) {
        painting.current = true
        stroke.current += 1
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      paintAt(date)
      return
    }
    origin.current = { x: event.clientX, y: event.clientY, date, pointerId: event.pointerId }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!painting.current) return
    if (event.buttons === 0) {
      painting.current = false
      return
    }
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const date = readDate(hit)
    if (date) paintAt(date)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (painting.current) {
      painting.current = false
      return
    }
    const start = origin.current
    origin.current = null
    if (!start || start.pointerId !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) onNext()
      else onPrev()
      return
    }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      if (start.date) onTapDay(start.date)
      else onTapBlank()
    }
  }

  function onPointerCancel() {
    painting.current = false
    origin.current = null
  }

  const pretty = selected ? formatPretty(selected) : null

  return (
    <section className="card calendar" data-keep data-testid="calendar">
      <div
        key={`${visible.y}-${visible.m}`}
        className={cn('cal-body', tool === 'brush' && canPaint && 'brushing')}
        style={{ '--dir': String(dir) } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="cal-head">
          <div>
            <h2 className="cal-title" data-testid="month-label">{visible.m + 1}月</h2>
            <p className="cal-sub" data-testid="days-left">
              {viewingNow ? (
                monthRemainCopy(todayKey)
              ) : (
                <>
                  <span>{visible.y}</span>
                  <button type="button" className="back-today" onClick={onToday}>回到今天</button>
                </>
              )}
            </p>
          </div>
          <div className="nav">
            <button type="button" className="navbtn" onClick={onPrev} aria-label="上个月">‹</button>
            <button type="button" className="navbtn" onClick={onNext} aria-label="下个月">›</button>
          </div>
        </div>
        <div className="week" aria-hidden="true">
          {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="grid" role="grid">
          {cells.map((key) => {
            const entry = days[key]
            const shift = findShift(shifts, entry?.shiftId)
            const tag = tagText(entry?.note ?? '')
            const outside = monthOf(key).y !== visible.y || monthOf(key).m !== visible.m
            const past = key < todayKey
            const today = key === todayKey
            const dayNumber = Number(key.slice(-2))
            const label = [
              formatPretty(key).md,
              formatPretty(key).week,
              shift?.name,
              tag,
            ].filter(Boolean).join(' ')
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  'day',
                  outside && 'outside',
                  past && 'past',
                  today && 'today',
                  selected === key && 'selected',
                  pulsed.has(key) && 'pulse',
                )}
                data-date={key}
                data-testid={`day-${key}`}
                aria-selected={selected === key}
                aria-current={today ? 'date' : undefined}
                aria-label={label}
              >
                <span className="day-body">
                  <span className="num">{dayNumber}</span>
                  {shift ? (
                    <span className="pill" style={{ background: shift.color, color: textOn(shift.color) }}>
                      {shift.name}
                    </span>
                  ) : null}
                  {tag ? <span className="note-bit">{tag}</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {showEditor && pretty ? (
        <div className="editor">
          <p className="editor-kicker">{pretty.md} {pretty.week}</p>
          <div className="chips">
            {shifts.map((shift) => (
              <Chip
                key={shift.id}
                label={shift.name}
                color={shift.color}
                selected={selectedEntry?.shiftId === shift.id}
                onClick={() => assignDay(shift.id)}
              />
            ))}
            <Chip label="清除" onClick={() => assignDay(null)} />
          </div>
          <label className="note-field">
            <span aria-hidden="true">#</span>
            <input
              aria-label="备注"
              placeholder="备注，例如 交接"
              maxLength={40}
              value={selectedEntry?.note ?? ''}
              onFocus={() => {
                noteSession.current = false
              }}
              onChange={(event) => {
                const checkpoint = !noteSession.current
                noteSession.current = true
                note(selected, event.target.value, checkpoint)
              }}
            />
          </label>
        </div>
      ) : null}
    </section>
  )
}
