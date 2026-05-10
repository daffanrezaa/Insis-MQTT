// src/components/widgets/AlertFeed.jsx
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'
import { format } from 'date-fns'

const SEV_COLOR = {
  critical: 'var(--crit)',
  warning:  'var(--warn)',
  info:     'var(--ok)',
}

export default function AlertFeed() {
  const allAlerts = useFarmStore(s => s.alerts)
  const alerts = useMemo(() => allAlerts.slice(0, 10), [allAlerts])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
      <AnimatePresence initial={false}>
        {alerts.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-dim)',
            fontSize: '1rem',
            padding: '12px 0',
          }}>
            Semua Aman
          </p>
        ) : alerts.map(alert => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -12, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            style={{
              background: alert.severity === 'critical'
                ? 'rgba(230, 106, 106, 0.08)'
                : alert.severity === 'warning'
                ? 'rgba(255, 249, 204, 1)'
                : 'var(--bg-surface)',
              border: `2px solid ${SEV_COLOR[alert.severity] ?? 'var(--bg-border)'}`,
              borderRadius: '8px 10px 9px 8px',
              boxShadow: `3px 3px 0 ${SEV_COLOR[alert.severity] ?? 'var(--bg-border)'}`,
              padding: '8px 10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="badge" style={{ color: SEV_COLOR[alert.severity] }}>
                  {alert.severity}
                </span>
              </span>
              <span style={{
                fontFamily: 'var(--font-badge)',
                fontSize: '0.6rem',
                color: 'var(--text-dim)',
              }}>
                {format(new Date(alert.timestamp), 'HH:mm:ss')}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}>
              {alert.message}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
