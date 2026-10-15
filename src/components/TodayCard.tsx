import { useEffect, useState } from 'react'
import { addDaysKey, describeShift, findShift, formatPretty, lingerCopy, lingering, parseKey, phase, tagText } from '../lib/logic'
import { useApp } from '../state'

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export function TodayCard({ todayKey }: { todayKey: string }) {
  const { days, shifts } = useApp()
  const now = useNow()
  const entry = days[todayKey]
  const shift = findShift(shifts, entry?.shiftId)
  const today = parseKey(todayKey)
  const copy = describeShift(shift, today, now)
  const pretty = formatPretty(todayKey)
  const tag = tagText(entry?.note ?? '')
  const yesterdayKey = addDaysKey(todayKey, -1)
  const yesterdayShift = findShift(shifts, days[yesterdayKey]?.shiftId)
  const linger = lingering(parseKey(yesterdayKey), yesterdayShift, now)
  const todayPhase = shift ? phase(today, shift, now) : null
  const lingerText = linger && todayPhase?.kind !== 'working' && yesterdayShift ? lingerCopy(yesterdayShift, linger.end) : null

  return (
    <article className="card today" data-keep data-testid="today-card">
      <p className="eyebrow">今天 · {pretty.md} {pretty.week}</p>
      <div key={shift?.id ?? 'empty'} className="shift-block">
        <h2 className="hero" data-testid="today-title">{copy.title}</h2>
        {copy.range ? <p className="range">{copy.range}</p> : null}
      </div>
      {copy.meta ? <p className="meta" data-testid="today-meta">{copy.meta}</p> : null}
      {lingerText ? <p className="aside">{lingerText}</p> : null}
      {tag ? <p className="tag-chip">{tag}</p> : null}
      {copy.aside ? <p className="aside">{copy.aside}</p> : null}
    </article>
  )
}
