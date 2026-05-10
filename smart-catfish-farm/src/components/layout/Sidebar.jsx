// src/components/layout/Sidebar.jsx
import { motion } from 'motion/react'
import ConnectionStatus from '../widgets/ConnectionStatus'
import FeedStockGauge   from '../widgets/FeedStockGauge'
import AlertFeed        from '../widgets/AlertFeed'

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
      style={{
        width: 240,
        background: 'var(--bg-paper)',
        borderRight: '2px solid var(--bg-border)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        padding: '16px 14px',
        boxShadow: '4px 0 0 var(--bg-border)',
      }}
    >
      <SidebarPanel title="Jaringan" delay={0.15}>
        <ConnectionStatus detailed />
      </SidebarPanel>

      <hr className="section-divider" />

      <SidebarPanel title="Silo Pakan" delay={0.25}>
        <FeedStockGauge />
      </SidebarPanel>

      <hr className="section-divider" />

      <SidebarPanel title="Log Peringatan (Alerts)" delay={0.35}>
        <AlertFeed />
      </SidebarPanel>
    </motion.aside>
  )
}

function SidebarPanel({ title, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 280, damping: 22 }}
      style={{ paddingBottom: 12 }}
    >
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
    </motion.div>
  )
}
