// src/components/widgets/FeedStockGauge.jsx
import { useFarmStore } from '../../store/useFarmStore'
import CountUpModule from 'react-countup'
const CountUp = CountUpModule.default ?? CountUpModule
export default function FeedStockGauge() {
  const stock  = useFarmStore(s => s.feedStock)
  const days   = stock?.estimated_days_remaining ?? 0
  const status = stock?.status ?? 'sufficient'
  const maxDays = 30
  const pct    = Math.min(100, (days / maxDays) * 100)

  const color = status === 'critical' ? 'var(--crit)'
              : status === 'low'      ? 'var(--warn)'
              : 'var(--ok)'

  const r             = 40
  const circumference = 2 * Math.PI * r
  const dashOffset    = circumference * (1 - pct / 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="var(--bg-surface)"
            strokeWidth="12"
          />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            <CountUp end={pct} decimals={0} duration={0.7} preserveValue />%
          </div>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        {days} Days Remaining
      </p>
    </div>
  )
}
