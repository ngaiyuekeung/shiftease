import { useEffect, useRef, useState } from 'react'
import { greeting } from '../lib/logic'
import { useApp } from '../state'

function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const timer = window.setInterval(() => setHour(new Date().getHours()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  return hour
}

export function Header() {
  const { name, setName } = useApp()
  const hour = useHour()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const cancel = useRef(false)

  function commit() {
    if (cancel.current) {
      cancel.current = false
      return
    }
    setName(draft.trim().slice(0, 24))
    setEditing(false)
  }

  return (
    <header className="header" data-keep>
      {editing ? (
        <input
          className="name-input"
          aria-label="你的名字"
          placeholder="你的名字"
          autoFocus
          maxLength={24}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              cancel.current = true
              setDraft(name)
              setEditing(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={name ? 'name' : 'name placeholder'}
          onClick={() => {
            setDraft(name)
            setEditing(true)
          }}
        >
          {name || '你的名字'}
        </button>
      )}
      <p className="greet">{greeting(hour)}</p>
    </header>
  )
}
