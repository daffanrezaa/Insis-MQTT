// src/components/widgets/ConnectionStatus.jsx
import { motion } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'

const STATUS_MAP = {
  connected:    { label: 'MQTT Connected', color: 'var(--ok)',      pulse: true  },
  reconnecting: { label: 'Reconnecting…',  color: 'var(--warn)',    pulse: true  },
  disconnected: { label: 'Disconnected',   color: 'var(--offline)', pulse: false },
  offline:      { label: 'Broker Offline', color: 'var(--crit)',    pulse: false },
  error:        { label: 'Error',          color: 'var(--crit)',    pulse: false },
}

export default function ConnectionStatus({ detailed = false }) {
  const status = useFarmStore(s => s.connectionStatus)
  const { label, color, pulse } = STATUS_MAP[status] ?? STATUS_MAP.disconnected

  if (detailed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          className={pulse ? 'dot-pulse' : ''}
          style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p className="badge" style={{ color: 'var(--text-dim)' }}>
            {status.toUpperCase()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: status === 'connected' ? 'var(--warn-fill)' : 'var(--bg-surface)',
        border: `3px solid var(--bg-border)`,
        borderRadius: '20px 18px 22px 19px',
        boxShadow: `3px 3px 0 var(--bg-border)`,
        padding: '3px 10px',
      }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    >
      <div
        className={pulse ? 'dot-pulse' : ''}
        style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      <span className="badge" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
        {status === 'connected' ? 'LIVE SYNC' : label}
      </span>
    </motion.div>
  )
}
