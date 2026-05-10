// src/hooks/useAlerts.js
import { useFarmStore } from '../store/useFarmStore'

/**
 * Hook to access alert data with computed properties.
 * Provides filtered alerts by severity and count helpers.
 */
export function useAlerts() {
  const alerts = useFarmStore(s => s.alerts)

  return {
    alerts,
    criticalAlerts: alerts.filter(a => a.severity === 'critical'),
    warningAlerts:  alerts.filter(a => a.severity === 'warning'),
    infoAlerts:     alerts.filter(a => a.severity === 'info'),
    totalCount:     alerts.length,
    hasCritical:    alerts.some(a => a.severity === 'critical'),
  }
}
