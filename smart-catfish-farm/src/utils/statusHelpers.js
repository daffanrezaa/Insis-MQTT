// src/utils/statusHelpers.js

/**
 * Determine overall pond status from water quality data
 */
export function getPondStatus(water) {
  if (!water) return 'offline'
  return water.status ?? 'offline'
}

/**
 * Get CSS color variable for a given status string
 */
export function getStatusColor(status) {
  switch (status) {
    case 'normal':   return 'var(--ok)'
    case 'warning':  return 'var(--warn)'
    case 'critical': return 'var(--crit)'
    default:         return 'var(--offline)'
  }
}

/**
 * Format pond ID from "P01" to "Kolam 1"
 */
export function formatPondName(pondId) {
  if (!pondId) return ''
  if (pondId.startsWith('P')) {
    const num = parseInt(pondId.substring(1), 10)
    if (!isNaN(num)) return `Kolam ${num}`
  }
  return pondId
}
