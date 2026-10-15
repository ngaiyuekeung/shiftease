import { textOn } from '../lib/logic'

type Props = {
  label: string
  color?: string
  selected?: boolean
  onClick: () => void
}

export function Chip({ label, color, selected = false, onClick }: Props) {
  const style = selected && color ? { background: color, color: textOn(color) } : undefined
  return (
    <button type="button" className="chip" aria-pressed={selected} style={style} onClick={onClick}>
      {!selected && color ? <i className="dot" style={{ background: color }} /> : null}
      {label}
    </button>
  )
}
