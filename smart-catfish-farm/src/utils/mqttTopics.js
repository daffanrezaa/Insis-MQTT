// src/utils/mqttTopics.js

/**
 * Parse an MQTT topic string into its component parts.
 * Schema: farm/<section>/<pond_id?>/<type?>/<sub?>
 */
export function parseTopic(topic) {
  const parts = topic.split('/')
  return {
    root:    parts[0],  // 'farm'
    section: parts[1],  // 'pond' | 'alerts' | 'storage'
    id:      parts[2],  // pond_id or severity or 'feed_stock'
    type:    parts[3],  // 'water' | 'aerator' | 'feeder' | 'cycle' | 'health'
    sub:     parts[4],  // 'dispensed' | 'mortality'
  }
}
