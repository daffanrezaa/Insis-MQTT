// src/components/widgets/LiveStatsBar.jsx
import { useMemo } from 'react'
import { motion } from 'motion/react'
import CountUpModule from 'react-countup'
const CountUp = CountUpModule.default ?? CountUpModule
import { useFarmStore } from '../../store/useFarmStore'
import { Droplet, Thermometer, Box, Activity } from 'lucide-react'

function StatCard({ label, value, unit, color, icon, sublabel, delay }) {
  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        padding: '16px 20px',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: '2px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        background: color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-badge)', fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.2rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {typeof value === 'number'
              ? <CountUp end={value} decimals={value % 1 !== 0 ? 1 : 0} duration={0.5} preserveValue />
              : (value ?? '—')}
          </span>
          {unit && <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ok)' }}>{unit}</span>}
        </div>
        {sublabel && <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: -2 }}>{sublabel}</p>}
      </div>
    </motion.div>
  )
}

export default function LiveStatsBar() {
  const ponds = useFarmStore(s => s.ponds)
  const feedStock = useFarmStore(s => s.feedStock)

  const agg = useMemo(() => {
    const pondList  = Object.values(ponds)
    const withWater = pondList.filter(p => p.water)
    const avgDo     = withWater.length
      ? (withWater.reduce((s, p) => s + (p.water?.do ?? 0), 0) / withWater.length).toFixed(1)
      : null
    const avgTemp   = withWater.length
      ? (withWater.reduce((s, p) => s + (p.water?.temperature ?? 0), 0) / withWater.length).toFixed(1)
      : null
    
    let activeAerators = 0
    let totalAerators = 0
    pondList.forEach(p => {
      if (p.aerator) {
        totalAerators++
        if (p.aerator.status === 'active' || p.aerator.status === 'normal') {
          activeAerators++
        }
      }
    })

    return { avgDo, avgTemp, activeAerators, totalAerators }
  }, [ponds])

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <StatCard
        label="AVG DO"
        value={agg.avgDo !== null ? parseFloat(agg.avgDo) : null}
        unit="mg/L"
        icon={<Droplet size={20} color="var(--bg-panel)" />}
        color="var(--accent-dim)"
        delay={0.1}
      />
      <StatCard
        label="AVG TEMP"
        value={agg.avgTemp !== null ? parseFloat(agg.avgTemp) : null}
        unit="°C"
        icon={<Thermometer size={20} color="var(--bg-panel)" />}
        color="var(--warn)"
        delay={0.15}
      />
      <StatCard
        label="TOTAL FEED"
        value={1.2}
        unit="T"
        icon={<Box size={20} color="var(--text-secondary)" />}
        color="#E5E7EB"
        delay={0.2}
      />
      <StatCard
        label="AERATORS"
        value={`${agg.activeAerators}/${Math.max(26, agg.totalAerators)}`}
        icon={<Activity size={20} color="var(--text-primary)" />}
        color="var(--bg-paper)"
        sublabel="Active"
        delay={0.25}
      />
    </div>
  )
}
