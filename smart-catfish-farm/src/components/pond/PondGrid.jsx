// src/components/pond/PondGrid.jsx
import { motion } from 'motion/react'
import PondCard from './PondCard'

const POND_IDS = Array.from({ length: 10 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)

export default function PondGrid() {
  return (
    <section>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 12,
        transform: 'rotate(-0.5deg)',
      }}>
        Active Ponds
      </p>
      <div className="pond-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {POND_IDS.map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: i * 0.06,
              type: 'spring',
              stiffness: 320,
              damping: 20,
            }}
          >
            <PondCard pondId={id} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
