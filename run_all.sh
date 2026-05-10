#!/bin/bash
# run_all.sh — start all components

LOG_DIR="logs"
mkdir -p $LOG_DIR

echo "Starting Smart Catfish Farm system..."

# ── Subscribers (start first so nothing is missed) ───────────
python -m subscribers.alert_system 1 &
sleep 0.5
python -m subscribers.alert_system 2 &
sleep 0.5
python -m subscribers.farm_log &
sleep 0.5

# ── Request-Response Responder ────────────────────────────────
python -m request_response.pond_status_responder &
sleep 0.5

# ── Publishers ────────────────────────────────────────────────
python -m publishers.feed_stock_monitor &   # starts first to catch dispense events
sleep 1

python -m publishers.water_quality_sensor &
python -m publishers.aerator_monitor &
python -m publishers.auto_feeder &

echo ""
echo "All services started. Press Ctrl+C to stop."
echo "Run farm operator manually: python -m publishers.farm_operator"
echo "Run pond status query:      python -m request_response.pond_status_requester P03"

wait
