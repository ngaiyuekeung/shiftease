import { addDaysKey, findShift, formatPretty, formatRange, tagText } from '../lib/logic'
import { useApp } from '../state'

export function TomorrowCard({ todayKey }: { todayKey: string }) {
  const { days, shifts } = useApp()
  const key = addDaysKey(todayKey, 1)
  const entry = days[key]
  const shift = findShift(shifts, entry?.shiftId)
  const tag = tagText(entry?.note ?? '')
  const pretty = formatPretty(key)
  const title = shift?.name ?? (tag ? tag : '空着')
  const range = shift ? formatRange(shift) : null

  return (
    <article className="card tomorrow" data-keep data-testid="tomorrow-card">
      <p className="eyebrow">明天 · {pretty.md} {pretty.week}</p>
      <h2 className="next" data-testid="tomorrow-title">{title}</h2>
      {range ? <p className="range">{range}</p> : null}
      {shift && !range ? <p className="range">全天</p> : null}
      {shift && tag ? <p className="tag-chip light">{tag}</p> : null}
    </article>
  )
}
