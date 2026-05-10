// src/components/pond/PondCard.jsx
import { motion } from 'motion/react'
import CountUpModule from 'react-countup'
const CountUp = CountUpModule.default ?? CountUpModule
import { useFarmStore } from '../../store/useFarmStore'
import StatusDot from '../atoms/StatusDot'

const AeratorIcon = ({ status }) => {
  const color = status === 'active'  ? 'var(--ok)'
              : status === 'offline' ? 'var(--crit)'
              : 'var(--warn)'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label={`Aerator ${status}`}>
      <ellipse cx="9" cy="9" rx="7" ry="7.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="5" x2="9" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="9" x2="13" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function PondCard({ pondId }) {
  const pond     = useFarmStore(s => s.ponds[pondId])
  const selected = useFarmStore(s => s.selectedPondId === pondId)
  const select   = useFarmStore(s => s.selectPond)

  const status   = pond?.water?.status ?? 'offline'
  const hasData  = !!pond?.water
  
  // Custom styling for selected state
  const selectedStyle = selected ? {
    borderColor: 'var(--accent)',
    background: 'var(--accent-glow)',
  } : {}

  const cardClass = `panel pond-card-${hasData ? status : 'offline'}`

  return (
    <motion.div
      className={cardClass}
      onClick={() => select(pondId)}
      whileHover={{
        rotate: -1.5,
        scale: 1.03,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        padding: '14px 18px',
        cursor: 'pointer',
        position: 'relative',
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...selectedStyle,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.5rem',
          fontWeight: 700,
          color: selected ? 'var(--accent)' : 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {pondId}
        </div>
        <StatusDot status={hasData ? status : 'offline'} />
      </div>

      {hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
          <MiniMetric label="DO" value={pond.water.do}
            warn={pond.water.do < 5} crit={pond.water.do < 4} />
          <MiniMetric label="Temp" value={pond.water.temperature} unit="°"
            warn={pond.water.temperature > 31} crit={pond.water.temperature > 33} />
        </div>
      ) : (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--offline)', textAlign: 'center' }}>
          Fallow
        </div>
      )}
    </motion.div>
  )
}

function MiniMetric({ label, value, unit, warn, crit }) {
  const color = crit ? 'var(--crit)' : warn ? 'var(--warn)' : 'var(--text-primary)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--bg-border)', paddingBottom: 2 }}>
      <span style={{ fontFamily: 'var(--font-badge)', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-badge)', fontSize: '0.75rem', fontWeight: 700, color }}>
        {value != null
          ? <CountUp end={value} decimals={1} duration={0.5} preserveValue />
          : '—'}
        {unit && <span style={{ marginLeft: 1 }}>{unit}</span>}
      </span>
    </div>
  )
}
