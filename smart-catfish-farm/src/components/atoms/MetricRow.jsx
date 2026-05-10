// src/components/atoms/MetricRow.jsx
import CountUpModule from 'react-countup'
const CountUp = CountUpModule.default ?? CountUpModule
export default function MetricRow({ label, value, unit, warn, crit }) {
  const color = crit ? 'var(--crit)' : warn ? 'var(--warn)' : 'var(--text-primary)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px dashed rgba(30,30,30,0.12)',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color }}>
        {typeof value === 'number'
          ? <CountUp end={value} decimals={value % 1 !== 0 ? 2 : 0} duration={0.5} preserveValue />
          : (value ?? <span style={{ color: 'var(--text-dim)' }}>—</span>)}
        {unit && <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}
