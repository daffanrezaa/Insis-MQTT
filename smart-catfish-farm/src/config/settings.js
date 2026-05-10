// src/config/settings.js

export const POND_IDS = Array.from({ length: 10 }, (_, i) =>
  `P${String(i + 1).padStart(2, '0')}`
)

export const MQTT_TOPICS = {
  ALL: 'farm/#',
  WATER: (id) => `farm/pond/${id}/water`,
  AERATOR: (id) => `farm/pond/${id}/aerator`,
  FEEDER: (id) => `farm/pond/${id}/feeder`,
  DISPENSED: (id) => `farm/pond/${id}/feeder/dispensed`,
  CYCLE: (id) => `farm/pond/${id}/cycle`,
  MORTALITY: (id) => `farm/pond/${id}/health/mortality`,
  ALERTS: (severity) => `farm/alerts/${severity}`,
  FEED_STOCK: 'farm/storage/feed_stock',
}

export const THRESHOLDS = {
  DO_WARN: 5,
  DO_CRIT: 4,
  TEMP_WARN: 31,
  TEMP_CRIT: 33,
  NH3_WARN: 0.03,
  NH3_CRIT: 0.05,
  FEED_LOW_KG: 2,
  FEED_CRIT_KG: 0.5,
}
