## Implementation Plan: Smart Catfish Farm Monitoring System

---

### 📁 Struktur Project

```
smart-catfish-farm/
├── broker/
│   └── emqx.conf
├── publishers/
│   ├── water_quality_sensor.py
│   ├── aerator_monitor.py
│   ├── auto_feeder.py
│   ├── feed_stock_monitor.py
│   └── farm_operator.py
├── subscribers/
│   ├── alert_system.py
│   ├── alert_system_2.py        # shared subscription instance
│   └── farm_log.py
├── dashboard/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── config/
│   └── settings.py              # broker host, port, topic constants, pond list
└── README.md
```

---

### 🔧 Tech Stack Detail

| Komponen | Tools | Keterangan |
|---|---|---|
| **Broker** | EMQX (lokal) | Support MQTT v5 penuh |
| **Publishers & Subscribers** | Python 3.x + `paho-mqtt` | `pip install paho-mqtt` |
| **Dashboard** | HTML + CSS + JS | Tidak perlu framework |
| **Charting** | Chart.js via CDN | Line & bar chart |
| **MQTT di browser** | mqtt.js via CDN | Koneksi via WebSocket |
| **Simulasi data** | Python `random`, `time` | Generate data realistis per kolam |

> ⚠️ Harus pakai **MQTT v5** — Topic Alias, User Properties, Expiry, Request-Response, Shared Subscription, Flow Control hanya ada di v5.

---

### ⚙️ Konfigurasi Broker (EMQX)

Yang perlu diaktifkan:
- WebSocket listener → port `8083` (untuk dashboard browser)
- MQTT listener → port `1883` (untuk Python publishers/subscribers)
- MQTT v5 support → enable
- Shared subscription → enable (`$share/` prefix)
- Flow control → configurable per client

---

### 🏊 Konfigurasi Kolam (settings.py)

```python
BROKER_HOST = "localhost"
BROKER_PORT = 1883
WS_PORT = 8083

# Simulasi 10 kolam (representasi puluhan kolam)
POND_IDS = [f"P{str(i).zfill(2)}" for i in range(1, 11)]

# Parameter normal lele
WATER_PARAMS = {
    "do_min": 4.0, "do_max": 8.0,        # mg/L
    "temp_min": 26.0, "temp_max": 30.0,   # °C
    "ph_min": 7.0, "ph_max": 8.0,
    "ammonia_max": 0.05,                   # mg/L
}

FEED_SCHEDULE = ["06:00", "12:00", "18:00"]  # 3x sehari
```

---

### 👤 Detail Setiap Publisher

---

#### Publisher 1 — Water Quality Sensor

```
Simulasi  : Update tiap 5 detik per kolam (semua kolam bergantian)
Topic     : farm/pond/{pond_id}/water/do
            farm/pond/{pond_id}/water/temperature
            farm/pond/{pond_id}/water/ph
            farm/pond/{pond_id}/water/ammonia
            farm/pond/{pond_id}/water/turbidity
QoS       : 1
Retain    : True (kondisi terkini selalu tersedia)
Expiry    : 30 detik (data stale kalau sensor mati)
Payload   : {
              pond_id,
              do, temperature, ph, ammonia, turbidity,
              status: [normal|warning|critical],
              timestamp
            }
User Props: pond_id, operator_id, cycle_day
Fitur     : QoS 1, Retain, Expiry, User Properties, Topic Alias
Topic Alias: Karena publish sangat sering untuk banyak kolam,
             topic panjang dialiaskan di awal koneksi
LWT       : farm/alerts/critical
LWT Msg   : { "device": "water-sensor-{pond_id}", "status": "OFFLINE" }
```

**Skenario anomali yang disimulasikan:**
- DO drop mendadak (aerator mati)
- Amonia naik perlahan (overfeeding)
- Suhu keluar range normal (cuaca ekstrem)

---

#### Publisher 2 — Aerator Monitor

```
Simulasi  : Update status tiap 5 detik per kolam
Topic     : farm/pond/{pond_id}/aerator/status
            farm/pond/{pond_id}/aerator/power
QoS       : 1
Retain    : True (status aerator harus selalu diketahui)
Expiry    : 60 detik
Payload   : {
              pond_id,
              status: [active|idle|offline|error],
              power_consumption,
              uptime_minutes,
              timestamp
            }
User Props: pond_id, device_id
Fitur     : QoS 1, Retain, Expiry, LWT
LWT Topic : farm/alerts/critical
LWT Msg   : { "device": "aerator-{pond_id}", "status": "OFFLINE" }
```

**Ini publisher paling kritis** — aerator mati malam hari adalah skenario paling berbahaya di ternak lele. LWT sangat relevan di sini.

---

#### Publisher 3 — Auto Feeder

```
Simulasi  : Publish saat jadwal pakan tiba (3x sehari)
            + update status tiap 10 detik
Topic     : farm/pond/{pond_id}/feeder/schedule
            farm/pond/{pond_id}/feeder/dispensed
            farm/pond/{pond_id}/feeder/status
            farm/pond/{pond_id}/feeder/remaining
QoS       : schedule → QoS 2 (jadwal harus sampai)
            status   → QoS 1
            dispensed→ QoS 1
Retain    : True (remaining feed di-retain)
Payload   : {
              pond_id,
              schedule: ["06:00", "12:00", "18:00"],
              dispensed_kg,
              status: [standby|dispensing|jammed|offline],
              remaining_kg,
              last_fed,
              timestamp
            }
User Props: pond_id, cycle_day, device_id
Fitur     : QoS 1 & 2, Retain, User Properties, LWT
LWT Topic : farm/alerts/warning
LWT Msg   : { "device": "feeder-{pond_id}", "status": "OFFLINE" }
```

---

#### Publisher 4 — Feed Stock Monitor

```
Simulasi  : Update tiap kali ada feeding event + tiap 1 menit
Topic     : farm/storage/feed_stock
            farm/storage/feed_estimated_days
QoS       : 1
Retain    : True (stok selalu harus diketahui)
Payload   : {
              stock_kg,
              daily_consumption_kg,
              estimated_days_remaining,
              status: [sufficient|low|critical],
              last_restock_date,
              timestamp
            }
Fitur     : QoS 1, Retain
```

**Logic simulasi:**
- Setiap kali auto feeder publish `dispensed`, feed stock berkurang
- Kalau `estimated_days_remaining < 3` → publish ke `farm/alerts/warning`

---

#### Publisher 5 — Farm Operator

```
Simulasi  : Input manual, publish saat ada event (tidak periodik)
Topic     : farm/pond/{pond_id}/health/mortality
            farm/pond/{pond_id}/health/behavior
            farm/pond/{pond_id}/health/treatment
            farm/pond/{pond_id}/cycle/status
            farm/pond/{pond_id}/cycle/weight_sample
QoS       : 2 (data penting, harus sampai)
Payload mortality : {
              pond_id, dead_count, cause, timestamp
            }
Payload cycle     : {
              pond_id,
              status: [empty|stocking|growing|harvest-ready],
              stock_date, fish_count,
              cycle_day, estimated_harvest_date
            }
Payload weight    : {
              pond_id, sample_count,
              avg_weight_gram, estimated_total_biomass_kg
            }
User Props: operator_id, pond_id, cycle_day
Fitur     : QoS 2, User Properties
```

---

### 👁️ Detail Setiap Subscriber

---

#### Subscriber 1 — Owner Dashboard (Browser)

```
Koneksi   : mqtt.js via WebSocket (port 8083)
Subscribe : farm/#   (wildcard — semua data semua kolam)
Fitur     : Wildcard, Retain (langsung dapat kondisi terkini saat buka)
Fungsi    : Update UI real-time — pond grid, stats, chart, alerts
```

---

#### Subscriber 2 & 3 — Alert System (2 Instance)

```
Koneksi   : paho-mqtt Python (port 1883)
Subscribe : $share/alert-group/farm/alerts/#
            $share/alert-group/farm/pond/+/water/do
            $share/alert-group/farm/pond/+/aerator/status
QoS       : 1
Fitur     : Shared Subscription, Wildcard
Fungsi    : Monitor parameter kritis, print/log alert
```

**Logic alert:**
- DO < 4.0 mg/L → critical alert
- Aerator status = offline → critical alert
- Suhu > 32°C atau < 24°C → warning alert
- Feed stock < 3 hari → warning alert
- Amonia > 0.05 mg/L → warning alert

> Dua instance dijalankan bersamaan → EMQX distribusi pesan round-robin antar keduanya.

---

#### Subscriber 4 — Farm Log System

```
Koneksi   : paho-mqtt Python (port 1883)
Subscribe : farm/pond/+/water/#
            farm/pond/+/health/#
            farm/pond/+/cycle/#
            farm/storage/#
QoS       : 1
Fitur     : Wildcard
Fungsi    : Catat semua data ke log file / console per kolam,
            untuk analisis historis & evaluasi siklus
```

---

### 🔁 Flow Implementasi Fitur MQTT

| Fitur | Dimana | Cara |
|---|---|---|
| **QoS 0** | Suhu, turbidity | `publish(..., qos=0)` |
| **QoS 1** | DO, aerator, feeder status | `publish(..., qos=1)` |
| **QoS 2** | Feeding schedule, mortalitas, cycle update | `publish(..., qos=2)` |
| **Wildcard `#`** | Dashboard `farm/#`, log `farm/pond/+/water/#` | `subscribe("farm/#")` |
| **Wildcard `+`** | Alert DO per kolam `farm/pond/+/water/do` | `subscribe("farm/pond/+/water/do")` |
| **Topic Alias** | Water quality sensor (publish sangat sering, banyak kolam) | Set alias di CONNECT, pakai alias di loop |
| **User Properties** | Water sensor, feeder, operator | `properties.UserProperty` di MQTT v5 |
| **Retain** | Aerator status, kondisi air, feed stock | `publish(..., retain=True)` |
| **Expiry** | Water quality data (30 detik), aerator (60 detik) | `MessageExpiryInterval` di properties |
| **LWT** | Water sensor, aerator monitor, auto feeder | Set di `connect()` via `will_set()` |
| **Request-Response** | Owner request status kolam tertentu on-demand | `ResponseTopic` property di MQTT v5 |
| **Shared Subscription** | Alert system x2 | Subscribe `$share/alert-group/farm/alerts/#` |
| **Flow Control** | Puluhan sensor publish bersamaan | Set `ReceiveMaximum` di CONNECT |

---

### 🖥️ Dashboard — Komponen UI

| Panel | Data Source | Implementasi |
|---|---|---|
| **Pond Grid** | Semua publisher | Grid div per kolam, warna berubah sesuai status |
| **Live Stats** | Semua publisher | Counter & angka update real-time |
| **Pond Detail** | Klik salah satu kolam | Panel detail — semua parameter kolam terpilih |
| **DO Trend Chart** | Water quality sensor | Chart.js line chart, rolling 1 jam |
| **Feed Dispensed Chart** | Auto feeder | Chart.js bar chart per kolam hari ini |
| **Active Alerts** | `farm/alerts/#` | List alert terbaru, max 5 |
| **Feed Stock** | Feed stock monitor | Progress bar sisa stok + estimasi hari |

---

### 🗓️ Urutan Development

```
Phase 1 — Setup
  ├── Install & konfigurasi EMQX
  ├── Test koneksi MQTT v5 basic
  └── Setup struktur folder & settings.py

Phase 2 — Publishers
  ├── Water Quality Sensor (+ QoS, Retain, Expiry, Topic Alias, LWT)
  ├── Aerator Monitor (+ Retain, Expiry, LWT)
  ├── Auto Feeder (+ QoS 2, Retain, LWT)
  ├── Feed Stock Monitor (+ Retain, logic pengurangan stok)
  └── Farm Operator (+ QoS 2, User Properties)

Phase 3 — Subscribers
  ├── Alert System instance 1 (+ Shared Subscription, alert logic)
  ├── Alert System instance 2 (+ Shared Subscription)
  └── Farm Log System (+ Wildcard)

Phase 4 — Request-Response & Flow Control
  ├── Implementasi owner request status kolam on-demand
  └── Set ReceiveMaximum di semua publisher

Phase 5 — Dashboard
  ├── HTML/CSS layout & pond grid
  ├── Koneksi mqtt.js WebSocket
  ├── Update pond grid & live stats real-time
  ├── Pond detail panel (klik kolam)
  └── Integrasi Chart.js

Phase 6 — Testing & Demo
  ├── Jalankan semua publisher & subscriber serentak
  ├── Simulasi skenario kritis (aerator mati, DO drop)
  ├── Verifikasi semua 10 fitur MQTT berjalan
  └── Polish dashboard
```

---

### 🎭 Skenario Demo yang Bisa Ditampilkan

| Skenario | Fitur yang Ter-highlight |
|---|---|
| Semua sensor kolam aktif publish | Pub/Sub, QoS, Topic Alias, Flow Control |
| Matikan aerator monitor tiba-tiba | LWT, Alert System, DO mulai drop |
| Buka dashboard baru saat sistem berjalan | Retain (langsung dapat kondisi terkini) |
| Jalankan 2 alert system bersamaan | Shared Subscription |
| Owner ping status kolam tertentu | Request-Response |
| Auto feeder dispense pakan | QoS 2, User Properties, stok berkurang |
| Stok pakan hampir habis | Feed Stock Monitor → alert warning |
| Operator input mortalitas & sampling | QoS 2, User Properties |

---