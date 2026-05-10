# config/settings.py

BROKER_HOST = "localhost"
BROKER_PORT = 1883
WS_PORT     = 8083

# ── Pond list ──────────────────────────────────────────────
POND_IDS = [f"P{str(i).zfill(2)}" for i in range(1, 11)]  # P01 … P10

# ── Normal operating parameters for catfish ───────────────
WATER_PARAMS = {
    "do_min"      : 4.0,   # mg/L  — below triggers critical alert
    "do_max"      : 8.0,
    "do_warn_low" : 5.0,   # early warning threshold
    "temp_min"    : 26.0,  # °C
    "temp_max"    : 30.0,
    "temp_warn_hi": 31.5,
    "temp_warn_lo": 25.0,
    "ph_min"      : 7.0,
    "ph_max"      : 8.0,
    "ammonia_max" : 0.05,  # mg/L
    "turbidity_max": 30.0, # NTU
}

FEED_SCHEDULE = ["06:00", "12:00", "18:00"]
FEED_PER_MEAL_KG = 0.5    # per pond per meal
FEED_STOCK_INITIAL_KG = 100.0
FEED_WARN_DAYS = 3

# ── Topic templates ────────────────────────────────────────
class Topics:
    # Water quality
    WATER_DO          = "farm/pond/{pond_id}/water/do"
    WATER_TEMP        = "farm/pond/{pond_id}/water/temperature"
    WATER_PH          = "farm/pond/{pond_id}/water/ph"
    WATER_AMMONIA     = "farm/pond/{pond_id}/water/ammonia"
    WATER_TURBIDITY   = "farm/pond/{pond_id}/water/turbidity"
    WATER_ALL         = "farm/pond/{pond_id}/water/all"  # bundled publish

    # Aerator
    AERATOR_STATUS    = "farm/pond/{pond_id}/aerator/status"
    AERATOR_POWER     = "farm/pond/{pond_id}/aerator/power"

    # Feeder
    FEEDER_SCHEDULE   = "farm/pond/{pond_id}/feeder/schedule"
    FEEDER_DISPENSED  = "farm/pond/{pond_id}/feeder/dispensed"
    FEEDER_STATUS     = "farm/pond/{pond_id}/feeder/status"
    FEEDER_REMAINING  = "farm/pond/{pond_id}/feeder/remaining"

    # Storage
    FEED_STOCK        = "farm/storage/feed_stock"
    FEED_EST_DAYS     = "farm/storage/feed_estimated_days"

    # Health / cycle (Farm Operator)
    HEALTH_MORTALITY  = "farm/pond/{pond_id}/health/mortality"
    HEALTH_BEHAVIOR   = "farm/pond/{pond_id}/health/behavior"
    HEALTH_TREATMENT  = "farm/pond/{pond_id}/health/treatment"
    CYCLE_STATUS      = "farm/pond/{pond_id}/cycle/status"
    CYCLE_WEIGHT      = "farm/pond/{pond_id}/cycle/weight_sample"

    # Alerts
    ALERT_CRITICAL    = "farm/alerts/critical"
    ALERT_WARNING     = "farm/alerts/warning"
    ALERT_ALL         = "farm/alerts/#"

    # Request-Response
    REQ_POND_STATUS   = "farm/request/pond_status/{pond_id}"
    RESP_POND_STATUS  = "farm/response/pond_status/{pond_id}/{correlation_id}"

    @staticmethod
    def fmt(template: str, **kwargs) -> str:
        return template.format(**kwargs)
