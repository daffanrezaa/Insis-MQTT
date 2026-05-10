// src/components/charts/ChartRow.jsx
import DoTrendChart from './DoTrendChart'
import FeedBarChart from './FeedBarChart'
import { useFarmStore } from '../../store/useFarmStore'

export default function ChartRow() {
  const selectedPondId = useFarmStore(s => s.selectedPondId)
  return (
    <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
      <DoTrendChart pondId={selectedPondId} />
      <FeedBarChart />
    </div>
  )
}
