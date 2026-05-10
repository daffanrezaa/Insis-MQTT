# run_all.ps1 — Start all components in PowerShell

if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" }

Write-Host "Starting Smart Catfish Farm system..." -ForegroundColor Cyan

# Start all services in the background (using separate windows for easier monitoring)
Start-Process python -ArgumentList "-m subscribers.alert_system 1"
Start-Sleep -Seconds 0.5
Start-Process python -ArgumentList "-m subscribers.alert_system 2"
Start-Sleep -Seconds 0.5
Start-Process python -ArgumentList "-m subscribers.farm_log"
Start-Sleep -Seconds 0.5
Start-Process python -ArgumentList "-m request_response.pond_status_responder"
Start-Sleep -Seconds 0.5
Start-Process python -ArgumentList "-m publishers.feed_stock_monitor"
Start-Sleep -Seconds 1
Start-Process python -ArgumentList "-m publishers.water_quality_sensor"
Start-Process python -ArgumentList "-m publishers.aerator_monitor"
Start-Process python -ArgumentList "-m publishers.auto_feeder"

Write-Host ""
Write-Host "All services started in separate windows." -ForegroundColor Green
Write-Host "Run farm operator manually: python -m publishers.farm_operator"
Write-Host "Run pond status query:      python -m request_response.pond_status_requester P03"
