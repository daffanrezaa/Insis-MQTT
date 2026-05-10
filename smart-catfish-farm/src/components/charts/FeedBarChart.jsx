import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { useFarmStore } from '../../store/useFarmStore'

export default function FeedBarChart() {
  const stock = useFarmStore(s => s.feedStock)
  const history = stock?.history

  const data = useMemo(() => {
    if (!history || history.length < 2) {
      // Mock some data if no history yet
      const mock = []
      const now = Date.now()
      for(let i=6; i>=0; i--) {
        mock.push({
          date: format(new Date(now - i*86400000), 'dd MMM'),
          dispensed: parseFloat((Math.random() * 5 + 10).toFixed(1))
        })
      }
      return mock
    }
    return history.slice(-7).map(d => ({
      date: format(new Date(d.date), 'dd MMM'),
      dispensed: parseFloat(d.dispensed_kg),
    }))
  }, [history])

  return (
    <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          Feed Dispensed (7 Days)
        </h3>
      </div>
      <div style={{ width: '100%', height: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-badge)' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-badge)' }} 
            />
            <Tooltip 
              cursor={{ fill: 'var(--bg-surface)' }}
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
            <Bar 
              dataKey="dispensed" 
              fill="var(--warn)" 
              radius={[4, 4, 0, 0]} 
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
