// src/components/atoms/Badge.jsx
export default function Badge({ label, color = 'var(--accent)', size = 'sm' }) {
  const fontSize = size === 'sm' ? '0.6875rem' : '0.8rem'
  return (
    <span
      className="badge"
      style={{
        color,
        background: `${color}18`,
        border: `1.5px solid ${color}`,
        borderRadius: '4px 5px 4px 5px',
        boxShadow: `1.5px 1.5px 0 ${color}`,
        padding: '1px 8px',
        fontSize,
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}
