import { useEffect, useState, type TransitionEvent } from 'react'
import type { Tool } from '../types'
import { Chip } from './Chip'
import { BrushIcon, CycleIcon, ListIcon } from './Icons'
import { addDaysKey, countDays, findShift, formatPretty, monthEndKey } from '../lib/logic'
import { useApp } from '../state'

type Props = {
  todayKey: string
  selected: string | null
  tool: Tool
  brushId: string | null
  eraser: boolean
  onTool: (tool: Tool) => void
  onBrushId: (id: string | null) => void
  onEraser: (value: boolean) => void
  onOpenShifts: () => void
}

export function Dock({
  todayKey,
  selected,
  tool,
  brushId,
  eraser,
  onTool,
  onBrushId,
  onEraser,
  onOpenShifts,
}: Props) {
  const { shifts, undoCount, undo, cycle } = useApp()
  const [shown, setShown] = useState<Tool>(tool)
  const [pattern, setPattern] = useState<string[]>([])
  const [done, setDone] = useState<string | null>(null)
  const open = tool !== 'none'
  const active: Tool = tool === 'none' ? shown : tool
  const start = selected ?? todayKey
  const monthEnd = monthEndKey(start)
  const monthCount = countDays(start, monthEnd)
  const brush = findShift(shifts, brushId)

  useEffect(() => {
    if (tool !== 'none') {
      setShown(tool)
      return
    }
    const timer = window.setTimeout(() => setShown('none'), 700)
    return () => window.clearTimeout(timer)
  }, [tool])

  useEffect(() => {
    setPattern((current) => {
      const next = current.filter((id) => shifts.some((shift) => shift.id === id))
      return next.length === current.length ? current : next
    })
  }, [shifts])

  function finishTransition(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'grid-template-rows') return
    if (tool === 'none') setShown('none')
  }

  function apply(span: 'month' | 'weeks') {
    if (!pattern.length) return
    const end = span === 'month' ? monthEnd : addDaysKey(start, 27)
    cycle(start, end, pattern)
    setDone(`已排上 ${countDays(start, end)} 天`)
  }

  const startLabel = formatPretty(start).md
  const hint = active === 'brush'
    ? eraser
      ? '划过的日子会清掉班次，备注还留着。'
      : brush
        ? `正在排「${brush.name}」。按住日期划过去。`
        : '先点一个班，再在日期上划。'
    : pattern.length
      ? `从 ${startLabel} 排到 ${formatPretty(monthEnd).md}，共 ${monthCount} 天。点一轮里的班可以拿掉。`
      : `按顺序点班次，组成一轮。没选日期的话，从 ${startLabel} 开始。`

  return (
    <div className="dock" data-keep>
      <div className={open ? 'panel-wrap open' : 'panel-wrap'} onTransitionEnd={finishTransition}>
        <div className="panel-inner">
          {active !== 'none' ? (
            <div className="panel">
              <div className="panel-top">
                <p className="hint">{hint}</p>
                {undoCount > 0 ? (
                  <button type="button" className="undo" onClick={undo}>撤销</button>
                ) : null}
              </div>
              {active === 'brush' ? (
                <div className="chips">
                  {shifts.map((shift) => (
                    <Chip
                      key={shift.id}
                      label={shift.name}
                      color={shift.color}
                      selected={!eraser && brushId === shift.id}
                      onClick={() => {
                        onEraser(false)
                        onBrushId(shift.id)
                      }}
                    />
                  ))}
                  <Chip
                    label="清除"
                    selected={eraser}
                    onClick={() => {
                      onEraser(true)
                      onBrushId(null)
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="pattern" aria-label="这一轮">
                    {pattern.length === 0 ? <span className="pattern-empty">这一轮还是空的</span> : null}
                    {pattern.map((id, index) => {
                      const shift = findShift(shifts, id)
                      if (!shift) return null
                      return (
                        <button
                          key={`${id}-${index}`}
                          type="button"
                          className="token"
                          onClick={() => {
                            setPattern((current) => current.filter((_, item) => item !== index))
                            setDone(null)
                          }}
                        >
                          <i style={{ background: shift.color }} />
                          {shift.name}
                          <span className="x">×</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="chips">
                    {shifts.map((shift) => (
                      <Chip
                        key={shift.id}
                        label={shift.name}
                        color={shift.color}
                        onClick={() => {
                          setPattern((current) => (current.length >= 21 ? current : [...current, shift.id]))
                          setDone(null)
                        }}
                      />
                    ))}
                  </div>
                  <button type="button" className="go" disabled={!pattern.length} onClick={() => apply('month')}>
                    排到月底
                  </button>
                  <button type="button" className="textbtn" disabled={!pattern.length} onClick={() => apply('weeks')}>
                    排满 4 周
                  </button>
                  {done ? <p className="done">{done}</p> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {undoCount > 0 && tool === 'none' ? (
        <div className="undo-row">
          <button type="button" className="undo" onClick={undo}>撤销</button>
        </div>
      ) : null}
      <div className="tools">
        <button type="button" className="tool" data-testid="tool-brush" aria-pressed={tool === 'brush'} onClick={() => onTool('brush')}>
          <BrushIcon />
          刷班
        </button>
        <button type="button" className="tool" data-testid="tool-cycle" aria-pressed={tool === 'cycle'} onClick={() => onTool('cycle')}>
          <CycleIcon />
          循环
        </button>
        <button type="button" className="tool" data-testid="tool-shifts" onClick={onOpenShifts}>
          <ListIcon />
          班次
        </button>
      </div>
    </div>
  )
}
