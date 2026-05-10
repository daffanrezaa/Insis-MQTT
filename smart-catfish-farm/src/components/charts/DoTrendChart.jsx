import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { useFarmStore } from '../../store/useFarmStore'

export default function DoTrendChart({ pondId }) {
  const pond = useFarmStore(s => s.ponds[pondId])
  const doHistory = pond?.doHistory

  const data = useMemo(() => {
    if (!doHistory || doHistory.length < 2) {
      // Mock some data if no history yet so the chart isn't empty in demo
      const mock = []
      const now = Date.now()
      for(let i=19; i>=0; i--) {
        mock.push({
          time: format(new Date(now - i*60000), 'HH:mm'),
          do: parseFloat((Math.random() * 2 + 4).toFixed(1)),
          temp: parseFloat((Math.random() * 2 + 28).toFixed(1))
        })
      }
      return mock
    }
    return doHistory.slice(-20).map(d => ({
      time: format(new Date(d.time), 'HH:mm'),
      do: d.value,
      temp: 28.5, // Dummy temp since we don't store it in doHistory yet
    }))
  }, [doHistory])

  return (
    <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          DO & Temp Trend {pondId ? `(${pondId})` : ''}
        </h3>
      </div>
      <div style={{ width: '100%', height: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-badge)' }} 
              dy={10}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-badge)' }} 
            />
            <Tooltip 
              contentStyle={{ 
                background: 'var(--bg-panel)', 
                border: '2px solid var(--bg-border)', 
                borderRadius: 6,
                boxShadow: '2px 2px 0 var(--bg-border)',
                fontFamily: 'var(--font-body)'
              }} 
              itemStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
            />
            <Area 
              type="monotone" 
              dataKey="do" 
              stroke="var(--accent)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorDo)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
