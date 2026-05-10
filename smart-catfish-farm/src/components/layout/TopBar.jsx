// src/components/layout/TopBar.jsx
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import ConnectionStatus from '../widgets/ConnectionStatus'
import { format } from 'date-fns'
import { Moon, Sun, Wifi, Clock } from 'lucide-react'

export default function TopBar() {
  const [time, setTime] = useState(new Date())
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        height: 56,
        background: 'transparent',
        borderBottom: '3px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
        <ConnectionStatus />
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.4rem',
          fontWeight: 800,
          color: 'var(--accent)',
          transform: 'rotate(-2deg)',
          whiteSpace: 'nowrap',
          textShadow: '1px 1px 0px var(--bg-border)'
        }}>
          Lele Ternak Pak Somat
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
        <motion.button 
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDark(!isDark)}
          style={{ 
            background: 'transparent', 
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.9rem',
            opacity: 0.8
          }}
        >
          {isDark ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
          {isDark ? 'LIGHT MODE' : 'DARK MODE'}
        </motion.button>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', opacity: 0.8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wifi size={20} strokeWidth={2.5} color="var(--text-primary)" />
          </div>
          <div style={{ 
            fontFamily: 'var(--font-badge)', 
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--text-primary)'
          }}>
            <Clock size={18} strokeWidth={2.5} />
            {format(time, 'HH:mm:ss')}
          </div>
        </div>
      </div>
    </motion.header>
  )
}
