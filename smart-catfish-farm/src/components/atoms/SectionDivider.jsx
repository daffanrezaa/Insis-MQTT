// src/components/atoms/SectionDivider.jsx
export default function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <hr className="section-divider" style={{ flex: 1 }} />
      {label && (
        <span className="badge" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <hr className="section-divider" style={{ flex: 1 }} />
    </div>
  )
}
