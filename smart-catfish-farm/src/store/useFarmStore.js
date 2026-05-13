// src/store/useFarmStore.js
import { create } from 'zustand'

const POND_IDS = Array.from({ length: 10 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)
const MAX_ALERTS     = 50
const MAX_DO_HISTORY = 60

function emptyPond(id) {
  return {
    id,
    water:     null,
    aerator:   null,
    feeder:    null,
    cycle:     null,
    mortality: null,
    doHistory: [],
    lastUpdated: null,
  }
}

export const useFarmStore = create((set, get) => ({

  // ── Connection ──────────────────────────────────────────────────────
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  mqttPublish: null,
  setMqttPublish: (fn) => set({ mqttPublish: fn }),

  // ── Ponds ───────────────────────────────────────────────────────────
  ponds: Object.fromEntries(POND_IDS.map(id => [id, emptyPond(id)])),

  // ── Selected Pond (Detail Panel) ────────────────────────────────────
  selectedPondId: null,
  selectPond: (id) => set({ selectedPondId: id }),
  closePond:  ()   => set({ selectedPondId: null }),

  // ── Alerts ─────────────────────────────────────────────────────────
  alerts: [],

  // ── Feed Stock ─────────────────────────────────────────────────────
  feedStock: null,

  // ── Feed Dispensed Today (bar chart data) ───────────────────────────
  feedDispensed: Object.fromEntries(POND_IDS.map(id => [id, 0])),

  // ── MQTT Message Router ─────────────────────────────────────────────
  handleMessage: (topic, payload, _userProps) => {
    const parts = topic.split('/')

    // farm/alerts/<severity>
    if (parts[1] === 'alerts') {
      get()._addAlert(topic, payload, parts[2])
      return
    }

    // farm/storage/feed_stock
    if (parts[1] === 'storage') {
      if (parts[2] === 'feed_stock') set({ feedStock: payload })
      return
    }

    // farm/pond/<pond_id>/<section>/...
    if (parts[1] === 'pond') {
      const pondId  = parts[2]
      const section = parts[3]
      const sub     = parts[4]

      if (!pondId) return

      set(state => {
        const pond = { ...state.ponds[pondId] }

        if (section === 'water') {
          pond.water       = payload
          pond.lastUpdated = payload.timestamp ?? new Date().toISOString()

          if (payload.do !== undefined) {
            const point = { time: pond.lastUpdated, value: payload.do }
            pond.doHistory = [...pond.doHistory.slice(-(MAX_DO_HISTORY - 1)), point]
          }

          // Auto-generate critical alert from water payload
          if (payload.status === 'critical') {
            get()._addAlert(topic, {
              message: `${pondId}: CRITICAL — DO ${payload.do} mg/L, NH₃ ${payload.ammonia} mg/L`,
            }, 'critical')
          }
        }

        if (section === 'aerator' && sub !== 'control') {
          pond.aerator = { ...(pond.aerator ?? {}), ...payload }
        }

        if (section === 'feeder' && sub !== 'control') {
          pond.feeder = { ...(pond.feeder ?? {}), ...payload }
          if (sub === 'dispensed' && payload.dispensed_kg) {
            return {
              ponds: { ...state.ponds, [pondId]: pond },
              feedDispensed: {
                ...state.feedDispensed,
                [pondId]: (state.feedDispensed[pondId] ?? 0) + payload.dispensed_kg,
              },
            }
          }
        }

        if (section === 'cycle') {
          pond.cycle = { ...(pond.cycle ?? {}), ...payload }
        }

        if (section === 'health' && sub === 'mortality') {
          pond.mortality = payload
        }

        return { ponds: { ...state.ponds, [pondId]: pond } }
      })
    }
  },

  // ── Internal: Add Alert ─────────────────────────────────────────────
  _addAlert: (topic, payload, severity = 'warning') => {
    const alert = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      topic,
      severity:  severity ?? payload.severity ?? 'warning',
      message:   payload.message ?? JSON.stringify(payload),
      timestamp: payload.timestamp ?? new Date().toISOString(),
    }
    set(state => ({
      alerts: [alert, ...state.alerts].slice(0, MAX_ALERTS),
    }))
  },

  // ── Computed Aggregates (call inline, not reactive) ─────────────────
  getAggregates: () => {
    const ponds     = Object.values(get().ponds)
    const withWater = ponds.filter(p => p.water)
    const avgDo     = withWater.length
      ? (withWater.reduce((s, p) => s + (p.water?.do ?? 0), 0) / withWater.length).toFixed(1)
      : null
    return {
      totalPonds:      ponds.length,
      activePonds:     withWater.filter(p => p.water?.status === 'normal').length,
      warningPonds:    withWater.filter(p => p.water?.status === 'warning').length,
      criticalPonds:   withWater.filter(p => p.water?.status === 'critical').length,
      offlinePonds:    ponds.filter(p => !p.water).length,
      avgDo,
      offlineAerators: ponds.filter(p => p.aerator?.status === 'offline').length,
    }
  },
}))
