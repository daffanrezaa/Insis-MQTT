// src/components/atoms/StatusDot.jsx

const DOT_COLOR = {
  normal:   'var(--ok)',
  warning:  'var(--warn)',
  critical: 'var(--crit)',
  offline:  'var(--offline)',
}

export default function StatusDot({ status, size = 10 }) {
  const color = DOT_COLOR[status] ?? 'var(--offline)'
  const isPulsing = status === 'critical' || status === 'warning'

  return (
    <div
      className={isPulsing ? 'dot-pulse' : ''}
      style={{
        width: size,
        height: size,
        borderRadius: '60% 40% 55% 45% / 50% 60% 40% 55%',
        background: color,
        border: `1.5px solid ${color}`,
        boxShadow: '1px 1px 0 rgba(30,30,30,0.2)',
        flexShrink: 0,
      }}
      aria-label={`Status: ${status}`}
    />
  )
}
