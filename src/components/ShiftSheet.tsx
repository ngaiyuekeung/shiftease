import { useEffect, useState } from 'react'
import type { Shift } from '../types'
import { PALETTE } from '../lib/defaults'
import { formatRange, normalizeTime } from '../lib/logic'
import { useApp } from '../state'

export function ShiftSheet({ onClose }: { onClose: () => void }) {
  const { shifts, saveShift, deleteShift } = useApp()
  const [edit, setEdit] = useState<Shift | null>(null)
  const [timed, setTimed] = useState(true)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function open(shift: Shift) {
    setEdit(shift)
    setTimed(Boolean(shift.start && shift.end))
    setConfirm(false)
  }

  function create() {
    open({
      id: crypto.randomUUID(),
      name: '',
      start: '09:00',
      end: '18:00',
      color: PALETTE[shifts.length % PALETTE.length] ?? PALETTE[0],
    })
  }

  const isNew = edit ? !shifts.some((shift) => shift.id === edit.id) : false
  const nameOk = Boolean(edit?.name.trim())
  const timeOk = !timed || Boolean(edit && normalizeTime(edit.start ?? '') && normalizeTime(edit.end ?? ''))
  const canSave = Boolean(edit) && nameOk && timeOk
  const colors = edit && !PALETTE.includes(edit.color) ? [edit.color, ...PALETTE] : PALETTE

  function save() {
    if (!edit || !canSave) return
    const start = timed ? normalizeTime(edit.start ?? '') : null
    const end = timed ? normalizeTime(edit.end ?? '') : null
    saveShift({ ...edit, name: edit.name.trim().slice(0, 16), start, end })
    setEdit(null)
  }

  function remove() {
    if (!edit) return
    if (!confirm) {
      setConfirm(true)
      return
    }
    deleteShift(edit.id)
    setEdit(null)
  }

  return (
    <div className="backdrop">
      <div className="sheet" data-keep role="dialog" aria-modal="true" aria-labelledby="shift-sheet-title">
        <div className="sheet-head">
          {edit ? (
            <button type="button" className="text-light" onClick={() => setEdit(null)}>返回</button>
          ) : (
            <span />
          )}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <h2 id="shift-sheet-title" className="sheet-title">{edit ? (isNew ? '新班次' : '编辑班次') : '班次'}</h2>
        {!edit ? <p className="sheet-note">名称、时间、颜色都由你定。</p> : null}
        {edit ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            <label className="field">
              <span>名称</span>
              <input
                value={edit.name}
                maxLength={16}
                placeholder="例如 早班、RDO、AL"
                autoComplete="off"
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
              />
            </label>
            <div className="switch-row">
              <span>有上下班时间</span>
              <button
                type="button"
                className={timed ? 'switch on' : 'switch'}
                role="switch"
                aria-checked={timed}
                onClick={() => setTimed((value) => !value)}
              >
                <span />
              </button>
            </div>
            {timed ? (
              <div className="times">
                <label className="field">
                  <span>开始</span>
                  <input
                    type="time"
                    value={edit.start ?? '09:00'}
                    onChange={(event) => setEdit({ ...edit, start: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>结束</span>
                  <input
                    type="time"
                    value={edit.end ?? '18:00'}
                    onChange={(event) => setEdit({ ...edit, end: event.target.value })}
                  />
                </label>
              </div>
            ) : null}
            <div className="field">
              <span>颜色</span>
              <div className="swatches">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="swatch"
                    style={{ background: color }}
                    aria-label={color}
                    aria-pressed={edit.color === color}
                    onClick={() => setEdit({ ...edit, color })}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="save" disabled={!canSave}>保存</button>
            {!isNew ? (
              <button type="button" className="danger" onClick={remove}>
                {confirm ? '确认删除' : '删除这个班'}
              </button>
            ) : null}
          </form>
        ) : (
          <div className="stack">
            {shifts.length === 0 ? <p className="sheet-note">还没有班次。</p> : null}
            <div>
              {shifts.map((shift) => (
                <button key={shift.id} type="button" className="shift-row" onClick={() => open(shift)}>
                  <i className="dot" style={{ background: shift.color }} />
                  <span>
                    <b>{shift.name}</b>
                    <small>{formatRange(shift) ?? '全天'}</small>
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="save" onClick={create}>新班次</button>
          </div>
        )}
      </div>
    </div>
  )
}
