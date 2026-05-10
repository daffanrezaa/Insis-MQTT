// src/App.jsx
import { AnimatePresence } from 'motion/react'
import { useMqtt } from './hooks/useMqtt'
import { useFarmStore } from './store/useFarmStore'
import { useBreakpoint } from './hooks/useBreakpoint'

import TopBar       from './components/layout/TopBar'
import Sidebar      from './components/layout/Sidebar'
import LiveStatsBar from './components/widgets/LiveStatsBar'
import PondGrid     from './components/pond/PondGrid'
import ChartRow     from './components/charts/ChartRow'
import DetailPanel  from './components/layout/DetailPanel'

export default function App() {
  useMqtt()

  const selectedPondId   = useFarmStore(s => s.selectedPondId)
  const connectionStatus = useFarmStore(s => s.connectionStatus)
  const { isDesktop }    = useBreakpoint()

  const isConnected = connectionStatus === 'connected'

  const gridTemplateColumns = isDesktop 
    ? `240px 1fr ${selectedPondId ? '320px' : '0px'}`
    : '1fr'

  return (
    <div
      className={isConnected ? 'connection-restored' : 'connection-lost'}
      style={{
        display: 'grid',
        gridTemplateRows: '56px 1fr',
        gridTemplateColumns,
        transition: 'grid-template-columns 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        height: '100vh',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden'
      }}
    >
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar />
      </div>

      {isDesktop && <Sidebar />}

      <main style={{
        overflowX: 'hidden',
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <LiveStatsBar />
        <PondGrid />
        <ChartRow />
      </main>

      <div style={{ overflow: 'hidden', height: '100%' }}>
        <AnimatePresence>
          {selectedPondId && (
            <DetailPanel key={selectedPondId} pondId={selectedPondId} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
