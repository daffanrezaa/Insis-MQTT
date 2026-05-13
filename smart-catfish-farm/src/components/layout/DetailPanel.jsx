// src/components/layout/DetailPanel.jsx
import { motion } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'
import { format } from 'date-fns'
import StatusDot from '../atoms/StatusDot'
import { Wind, Power, Utensils } from 'lucide-react'
import { formatPondName } from '../../utils/statusHelpers'

const slideIn = {
  initial: { x: 340, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
  exit: {
    x: 340,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

export default function DetailPanel({ pondId }) {
  const pond  = useFarmStore(s => s.ponds[pondId])
  const close = useFarmStore(s => s.closePond)

  return (
    <motion.aside
      {...slideIn}
      style={{
        width: 320,
        height: '100%',
        background: 'var(--bg-panel)',
        borderLeft: '2px solid var(--bg-border)',
        boxShadow: '-4px 0 0 var(--bg-border)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '2px solid var(--bg-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <p className="badge" style={{ color: 'var(--text-dim)', marginBottom: 4 }}>
            INSPECTING
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--accent)',
            transform: 'rotate(-1deg)',
            display: 'inline-block',
          }}>
            {formatPondName(pondId)}
          </h1>
          {pond?.cycle && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
              Cycle Day {pond.cycle.cycle_day} · {pond.cycle.fish_count?.toLocaleString()} fish
            </p>
          )}
        </div>
        <button
          onClick={close}
          style={{
            background: 'none',
            border: '2px solid var(--bg-border)',
            borderRadius: '50%',
            width: 30,
            height: 30,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 var(--bg-border)',
          }}
          aria-label="Close detail panel"
        >
          ✕
        </button>
      </div>

      {/* Sections */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <WaterSection      water={pond?.water} />
        <AeratorSection    pondId={pondId} aerator={pond?.aerator} />
        <FeederSection     pondId={pondId} feeder={pond?.feeder} />
        {pond?.cycle && <CycleSection cycle={pond.cycle} />}
        {pond?.mortality && <HealthSection mortality={pond.mortality} />}
      </div>
    </motion.aside>
  )
}

function DetailSection({ title, children }) {
  return (
    <div className="panel" style={{ padding: '12px 14px' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: 600,
        marginBottom: 10,
        color: 'var(--text-primary)',
      }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function DataRow({ label, value, unit, warn, crit }) {
  const color = crit ? 'var(--crit)' : warn ? 'var(--warn)' : 'var(--text-primary)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px dashed rgba(30,30,30,0.15)',
    }}>
      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color }}>
        {value != null
          ? value
          : <span style={{ color: 'var(--text-dim)' }}>—</span>}
        {unit && <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}

function IndicatorBar({ value, min, max, warnAt, critAt }) {
  const pct   = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const color = value <= critAt ? 'var(--crit)'
              : value <= warnAt ? 'var(--warn)'
              : 'var(--ok)'
  return (
    <div style={{
      height: 12,
      background: 'var(--bg-panel)',
      border: '2px solid var(--bg-border)',
      borderRadius: 6,
      overflow: 'hidden',
      marginTop: 3,
      marginBottom: 10,
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: color,
        borderRight: '2px solid var(--bg-border)',
        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
    </div>
  )
}

function WaterSection({ water }) {
  if (!water) {
    return (
      <DetailSection title="Water Quality">
        <div className="drawing-state">Drawing data...</div>
      </DetailSection>
    )
  }
  return (
    <DetailSection title="Water Quality">
      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
        <span>Dissolved Oxygen</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
          color: water.do < 4 ? 'var(--crit)' : water.do < 5 ? 'var(--warn)' : 'var(--text-primary)' }}>
          {water.do} mg/L
        </span>
      </div>
      <IndicatorBar value={water.do} min={0} max={10} warnAt={5} critAt={4} />

      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
        <span>Temperature</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
          color: water.temperature > 33 ? 'var(--crit)' : water.temperature > 31 ? 'var(--warn)' : 'var(--text-primary)' }}>
          {water.temperature}°C
        </span>
      </div>
      <IndicatorBar value={water.temperature} min={20} max={38} warnAt={31} critAt={33} />

      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
        <span>Ammonia (NH₃)</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
          color: water.ammonia > 0.05 ? 'var(--crit)' : water.ammonia > 0.03 ? 'var(--warn)' : 'var(--text-primary)' }}>
          {water.ammonia} ppm
        </span>
      </div>
      <IndicatorBar value={water.ammonia} min={0} max={0.1} warnAt={0.03} critAt={0.05} />
    </DetailSection>
  )
}

function ActionButton({ icon, label, onClick }) {
  return (
    <motion.button 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        flex: 1,
        background: 'var(--bg-panel)',
        border: '2px solid var(--bg-border)',
        borderRadius: 6,
        padding: '8px 4px',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        boxShadow: '2px 2px 0 var(--bg-border)',
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}

function AeratorSection({ pondId, aerator }) {
  const isBoost = aerator?.status === 'boost'
  const isActive = aerator?.status === 'active' || aerator?.status === 'normal' || isBoost
  const publish = useFarmStore(s => s.mqttPublish)

  const handleAction = (action) => {
    if (publish) publish(`farm/pond/${pondId}/aerator/control`, { action })
  }

  return (
    <DetailSection title="Aerators">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--bg-border)' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Status</span>
        <span className="badge" style={{ 
          background: isBoost ? 'var(--accent)' : isActive ? 'var(--ok)' : 'var(--warn-fill)',
          color: isBoost ? '#fff' : isActive ? 'var(--bg-panel)' : 'var(--warn)',
          border: `2px solid var(--bg-border)`,
          boxShadow: `2px 2px 0 var(--bg-border)`,
          padding: '4px 8px',
          fontWeight: 700,
        }}>
          {isBoost ? 'BOOST MODE' : isActive ? 'ALL ACTIVE' : 'ISSUES DETECTED'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <ActionButton icon={<Wind size={18} strokeWidth={2.5} />} label="Boost" onClick={() => handleAction('boost')} />
        <ActionButton icon={<Power size={18} strokeWidth={2.5} />} label="Shutdown" onClick={() => handleAction('shutdown')} />
      </div>
    </DetailSection>
  )
}

function FeederSection({ pondId, feeder }) {
  const isLow = feeder?.remaining_kg < 2
  const isSkipped = feeder?.status === 'skip_next' || feeder?.status === 'skipped'
  const publish = useFarmStore(s => s.mqttPublish)

  const handleSkip = () => {
    if (publish) publish(`farm/pond/${pondId}/feeder/control`, { action: 'skip_next' })
  }

  return (
    <DetailSection title="Auto-Feeder">
      <DataRow label="Next Feed" value={feeder?.next_feed_time ? format(new Date(feeder.next_feed_time), 'HH:mm') : '16:00'} unit="(15kg)" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>Hopper Level</span>
        <span style={{ fontFamily: 'var(--font-badge)', fontSize: '0.85rem', fontWeight: 700, color: isSkipped ? 'var(--accent)' : isLow ? 'var(--warn)' : 'var(--ok)' }}>
          {isSkipped ? 'SKIPPED' : isLow ? 'LOW' : 'OK'}
        </span>
      </div>
      <motion.button 
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSkip}
        style={{
          width: '100%',
          background: 'var(--bg-panel)',
          border: '2px solid var(--bg-border)',
          borderRadius: 6,
          padding: '8px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '2px 2px 0 var(--bg-border)',
        }}
      >
        <Utensils size={16} strokeWidth={2.5} /> Skip Next Feed
      </motion.button>
    </DetailSection>
  )
}

function CycleSection({ cycle }) {
  return (
    <DetailSection title="Biomass Health">
      <DataRow label="Est. Count" value={cycle.fish_count?.toLocaleString()} />
      {cycle.biomass_kg && <DataRow label="Est. Biomass" value={cycle.biomass_kg} unit="kg" />}
    </DetailSection>
  )
}
