# Smart Catfish Farm — Frontend Implementation Guide

> **Scope:** Design System · Dashboard Architecture · Full React + Vite Implementation
> **Stack:** React 19 · Vite 6 · Zustand 5 · Motion (Framer Motion 12) · Chart.js 4 · mqtt.js 5 · Tailwind CSS v4
> **Aesthetic:** Sketchbook / Hand-Drawn Doodle — playful, organic, light, cheerful

---

## Table of Contents

1. [Design Brief (for AI Design Tools)](#1-design-brief)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Design Tokens & Theme](#4-design-tokens--theme)
5. [MQTT Connection Layer](#5-mqtt-connection-layer)
6. [Global State (Zustand)](#6-global-state-zustand)
7. [Components](#7-components)
   - [App Shell & Layout](#71-app-shell--layout)
   - [TopBar](#72-topbar)
   - [Sidebar Left](#73-sidebar-left)
   - [Pond Grid & Cards](#74-pond-grid--cards)
   - [Pond Detail Panel (Right)](#75-pond-detail-panel-right)
   - [Live Stats Bar](#76-live-stats-bar)
   - [DO Trend Chart](#77-do-trend-chart)
   - [Feed Dispensed Chart](#78-feed-dispensed-chart)
   - [Alert Feed](#79-alert-feed)
   - [Feed Stock Gauge](#710-feed-stock-gauge)
   - [Connection Status Badge](#711-connection-status-badge)
   - [Shared Atoms](#712-shared-atoms)
8. [Animations Reference](#8-animations-reference)
9. [Responsive Breakpoints](#9-responsive-breakpoints)
10. [Build & Deployment](#10-build--deployment)

---

## 1. Design Brief

> **Copy this entire block into your AI design tool (v0, Locofy, Builder.io, Galileo AI, etc.).**

```
DESIGN BRIEF: Smart Catfish Farm Monitoring Dashboard

═══════════════════════════════════════════════════════
IDENTITY & MOOD
═══════════════════════════════════════════════════════
A real-time monitoring dashboard for a commercial
catfish farm. The aesthetic is: modern, playful, simple sketch draw.
Think digital whiteboard meets hand-drawn doodles.
Friendly, approachable, and fun. Functional, but lively.
The operator is checking on living creatures, and the interface
should feel like a beautifully illustrated, creative sketchbook—
light, organic, and relaxed.

═══════════════════════════════════════════════════════
COLOR SYSTEM
═══════════════════════════════════════════════════════
Background family (light/paper):
--bg-paper:     #FDFBF7   ← off-white sketchbook paper background (body)
--bg-panel:     #FFFFFF   ← clean white for cards
--bg-surface:   #FFF9CC   ← soft yellow highlighter for elevated elements
--bg-border:    #1E1E1E   ← dark ink/charcoal for sketchy dividers

Accent (playful marker colors):
--accent:       #5C88DA   ← primary interactive, blue marker
--accent-dim:   #A0BCEE   ← secondary accent, soft blue crayon
--accent-glow:  rgba(92, 136, 218, 0.15)

Status colors (cheerful but clear):
--status-ok:      #7BC07B  ← green marker (normal)
--status-warn:    #F2A65A  ← orange marker (warning)
--status-crit:    #E66A6A  ← red marker (soft red, critical)
--status-offline: #A3A3A3  ← pencil grey (offline/no data)

Text:
--text-primary:   #1E1E1E  ← dark charcoal/ink
--text-secondary: #5A5A5A  ← pencil graphite, labels, metadata
--text-dim:       #A3A3A3  ← light pencil, disabled states

═══════════════════════════════════════════════════════
TYPOGRAPHY
═══════════════════════════════════════════════════════
Display / headings: "Caveat" (Google Fonts)
— handwritten, playful, organic
— Used for: pond IDs, large numbers, metric values, section titles

Body / labels: "Balsamiq Sans" (Google Fonts)
— rounded, very readable, friendly
— Used for: labels, descriptions, navigation, body text

Accent / status tags: "Fira Code" (Google Fonts)
— monospaced with slight rotation to look like a stamped label

Type scale:
display:    2.5rem / 600 weight / Caveat
h1:         1.5rem / 600 / Caveat
h2:         1.125rem / 500 / Balsamiq Sans
body:       0.875rem / 400 / Balsamiq Sans
label:      0.75rem / 500 / Balsamiq Sans / letter-spacing: 0.05em
mono-data:  1rem–3rem / 600 / Caveat (for metric readouts)
badge:      0.6875rem / 500 / Fira Code / uppercase

═══════════════════════════════════════════════════════
LAYOUT & SPATIAL COMPOSITION
═══════════════════════════════════════════════════════
Overall: full-viewport dashboard, utilizing playful whitespace.
Three-column layout on desktop:
Left sidebar (280px):  connection status, feed stock, alert feed
Main content (flex-1): pond grid at top, charts below
Right panel (320px):   slides in when pond is selected (detail)

Grid of ponds: 5×2 grid of cards (10 ponds).
Each pond card: compact rectangle ~160×120px.
— pond ID in top-left (Caveat, large, slightly tilted)
— status indicator: hand-drawn colored dot + marker outline
— three mini-metrics: DO, Temp, NH₃ (one line each)
— aerator status icon bottom-right (doodle style)

Card states:
Normal:   sketchy border (irregular border-radius), border #1E1E1E 2px
Warning:  border orange marker, subtle orange crayon fill
Critical: border red marker, heavy scribble shading, playful wiggle animation
Offline:  border grey pencil, grayscale, sketchy crosshatch overlay

═══════════════════════════════════════════════════════
VISUAL DETAILS & ATMOSPHERE
═══════════════════════════════════════════════════════
Background texture: subtle paper grain texture via CSS SVG filter,
like a fresh sketchbook page.
Panel depth: hard, offset solid shadows (4px 4px 0px #1E1E1E)
for flat, comic/sketchbook pop — NOT blurred drop shadows.
Borders: rough, uneven stroke weights (border-radius hacks).
Charts: Chart.js with high spline tension (0.5+).
  Grid lines: dashed pencil lines, color --accent-dim.
  Area fill: rgba of --accent-glow.
Numbers (live metrics): playful bouncy updates via CountUp (react-countup).
Status dots: imperfect hand-drawn circles, colored with marker.
Scrollbars: thick 6px, rounded, like a sliding marker handle.
Scribble overlay: faint dot-grid pattern in empty spaces for doodle feel.

═══════════════════════════════════════════════════════
INTERACTION & ANIMATION
═══════════════════════════════════════════════════════
Page load: playful pop-in of each panel (bouncy easing, staggered).
Pond card hover: slight rotation rotate(-1.5deg) + offset shadow expands.
Pond card click: right detail panel slides in with elastic bounce.
New alert: alert item drops down like a sticky note being placed.
Critical alert: entire card shakes like a nervous doodle.
Metric value change: bouncy scale-up animation on the number.
Connection lost: elements slowly fade to grey pencil sketch (1s).
Connection restored: colors fill back in like a coloring book (1s).
NO stiff transitions. Smooth, bouncy, organic, cheerful.
Spring physics: stiffness 300, damping 20, mass 1.

═══════════════════════════════════════════════════════
COMPONENT INVENTORY
═══════════════════════════════════════════════════════
TopBar — logo/farm name, connection badge, live clock

Sidebar Left
a. ConnectionStatus — MQTT connection state with pulsing dot
b. FeedStockGauge — SVG half-circle radial gauge + days remaining
c. AlertFeed — scrollable sticky-note list of last 10 alerts

Main Content Area
a. LiveStatsBar — 4 aggregate metrics across all ponds
b. PondGrid — 10 pond cards (5×2)
c. ChartRow — DO trend (line) + Feed dispensed (bar)

Right Detail Panel (conditional, animated slide-in)
a. PondHeader — pond ID, cycle info, biomass
b. WaterQualityPanel — full params with colored indicator bars
c. AeratorPanel — status, uptime, power controls
d. FeederPanel — remaining, last fed, schedule
e. HealthPanel — mortality, behavior, last treatment

Shared Atoms: StatusDot, MetricRow, SectionDivider, Badge

═══════════════════════════════════════════════════════
DO NOT
═══════════════════════════════════════════════════════
Do NOT use dark, aggressive, or neon backgrounds.
Do NOT use perfectly straight, rigid lines or clinical shapes.
Do NOT use heavy blurred drop shadows — solid offset only.
Do NOT use corporate fonts (Arial, Inter, Roboto, Space Grotesk).
Do NOT use perfect grey boxes for empty states —
  use a hand-drawn dashed outline with "Drawing data..."
Do NOT make it feel stressful; keep the vibe relaxed and fun.
```

---

## 2. Tech Stack & Dependencies

### Verified Versions (May 2025)

```bash
# Create project with Vite 6 + React 19
npm create vite@latest smart-catfish-farm -- --template react
cd smart-catfish-farm
npm install
```

```bash
# Core runtime dependencies
npm install \
  zustand@5 \                        # Global state — v5 uses React 19 useSyncExternalStore
  mqtt@5 \                           # MQTT.js v5 — WebSocket browser client
  motion@12 \                        # Motion (formerly Framer Motion) — v12 API
  chart.js@4 react-chartjs-2@5 \     # Charts — Chart.js v4, adapter for React
  date-fns@4 \                       # Date formatting — v4 has tree-shakeable ESM
  react-countup@6 \                  # Animated number transitions
  clsx@2                             # Conditional classnames, lightweight
```

```bash
# Dev dependencies
npm install -D \
  tailwindcss@4 \                    # Tailwind v4 — CSS-first config, no tailwind.config.js
  @tailwindcss/vite@4 \             # Official Vite plugin for Tailwind v4
  @vitejs/plugin-react@4             # React Fast Refresh
```

> **Library version notes:**
> - **Tailwind CSS v4**: Config is now in CSS (`@import "tailwindcss"`, `@theme { ... }`), not `tailwind.config.js`. The Vite plugin handles everything.
> - **Motion v12** (formerly Framer Motion): Import from `"motion/react"` not `"framer-motion"`. All APIs are stable and backwards-compatible with the Framer Motion rename.
> - **Zustand v5**: Uses React 19's native `useSyncExternalStore`. API is fully stable; `create` import is unchanged.
> - **MQTT.js v5**: `mqtt.connect()` now returns a `MqttClient` instance with a Promise-based API option. WebSocket URL format: `ws://host:port/path`.
> - **Chart.js v4 + react-chartjs-2 v5**: Chart.js v4 requires explicit component registration. Use `chart.js/auto` for convenience or register manually.
> - **react-countup v6**: `CountUp` is the default export. `useCountUp` hook also available. `preserveValue` prop prevents reset on re-render — always use this for live data.
> - **date-fns v4**: All functions are pure ESM. `format`, `formatDistanceToNow` etc. work identically.

### `vite.config.js`

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // Tailwind v4: handles @tailwindcss imports automatically
  ],
  server: {
    port: 5173,
    // Proxy MQTT WebSocket to local EMQX broker (avoids CORS in dev)
    proxy: {
      '/mqtt': {
        target: 'ws://localhost:8083',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
```

---

## 3. Project Structure

```
smart-catfish-farm/
├── index.html
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css                    # Tailwind v4 @theme tokens + global styles
│   ├── config/
│   │   └── settings.js             # Pond IDs, MQTT topics, alert thresholds
│   ├── store/
│   │   └── useFarmStore.js         # Zustand 5 global state + message router
│   ├── hooks/
│   │   ├── useMqtt.js              # MQTT.js 5 connection + subscriptions
│   │   ├── useAlerts.js            # Alert processing logic
│   │   └── useBreakpoint.js        # Responsive breakpoints hook
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── DetailPanel.jsx
│   │   ├── pond/
│   │   │   ├── PondGrid.jsx
│   │   │   ├── PondCard.jsx
│   │   │   └── PondDetail.jsx
│   │   ├── charts/
│   │   │   ├── DoTrendChart.jsx
│   │   │   ├── FeedBarChart.jsx
│   │   │   └── ChartRow.jsx
│   │   ├── widgets/
│   │   │   ├── LiveStatsBar.jsx
│   │   │   ├── AlertFeed.jsx
│   │   │   ├── FeedStockGauge.jsx
│   │   │   └── ConnectionStatus.jsx
│   │   └── atoms/
│   │       ├── StatusDot.jsx
│   │       ├── MetricRow.jsx
│   │       ├── Badge.jsx
│   │       └── SectionDivider.jsx
│   └── utils/
│       ├── mqttTopics.js
│       └── statusHelpers.js
```

---

## 4. Design Tokens & Theme

```css
/* src/index.css */

/* Tailwind v4: import directive — no tailwind.config.js needed */
@import "tailwindcss";

/* Google Fonts — Caveat (display), Balsamiq Sans (body), Fira Code (badge) */
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Balsamiq+Sans:wght@400;700&family=Fira+Code:wght@400;500&display=swap');

/* ── Tailwind v4 theme tokens ─────────────────────────────────────────── */
@theme {
  --color-paper:        #FDFBF7;
  --color-panel:        #FFFFFF;
  --color-surface:      #FFF9CC;
  --color-border:       #1E1E1E;
  --color-accent:       #5C88DA;
  --color-accent-dim:   #A0BCEE;
  --color-ok:           #7BC07B;
  --color-warn:         #F2A65A;
  --color-crit:         #E66A6A;
  --color-offline:      #A3A3A3;
  --color-text:         #1E1E1E;
  --color-text-sec:     #5A5A5A;
  --color-text-dim:     #A3A3A3;

  --font-display: 'Caveat', cursive;
  --font-body:    'Balsamiq Sans', cursive;
  --font-badge:   'Fira Code', monospace;
}

/* ── CSS Custom Properties (runtime use in JS/inline styles) ───────────── */
:root {
  /* Backgrounds */
  --bg-paper:        #FDFBF7;
  --bg-panel:        #FFFFFF;
  --bg-surface:      #FFF9CC;
  --bg-border:       #1E1E1E;

  /* Accents */
  --accent:          #5C88DA;
  --accent-dim:      #A0BCEE;
  --accent-glow:     rgba(92, 136, 218, 0.15);

  /* Status */
  --ok:              #7BC07B;
  --warn:            #F2A65A;
  --crit:            #E66A6A;
  --offline:         #A3A3A3;

  /* Status glow — for card fills */
  --ok-fill:         rgba(123, 192, 123, 0.10);
  --warn-fill:       rgba(242, 166, 90, 0.12);
  --crit-fill:       rgba(230, 106, 106, 0.10);

  /* Text */
  --text-primary:    #1E1E1E;
  --text-secondary:  #5A5A5A;
  --text-dim:        #A3A3A3;

  /* Typography */
  --font-display:    'Caveat', cursive;
  --font-body:       'Balsamiq Sans', cursive;
  --font-badge:      'Fira Code', monospace;
}

/* ── Reset & Base ─────────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
}

html, body, #root {
  height: 100%;
  background: var(--bg-paper);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  overflow: hidden;
}

/* ── Paper Grain Texture (body background) ────────────────────────────── */
/* Subtle SVG noise filter simulates sketchbook paper grain */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  pointer-events: none;
  z-index: 0;
}

/* ── Dot Grid Scribble Overlay ─────────────────────────────────────────── */
/* Hand-drawn dot grid reinforces "doodle" sketchbook feel */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: radial-gradient(circle, rgba(30,30,30,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
}

/* ── Panel Base ───────────────────────────────────────────────────────── */
/* Sketchy offset shadow replaces blurred drop shadows */
.panel {
  background: var(--bg-panel);
  border: 2px solid var(--bg-border);
  border-radius: 12px 10px 14px 11px / 10px 13px 11px 14px; /* Irregular = sketchy */
  box-shadow: 4px 4px 0px var(--bg-border);
}

/* ── Pond Card Status Variants ────────────────────────────────────────── */
.pond-card-normal {
  border-color: var(--bg-border);
  box-shadow: 4px 4px 0px var(--bg-border);
  background: var(--bg-panel);
}

.pond-card-warning {
  border-color: var(--warn);
  box-shadow: 4px 4px 0px var(--warn);
  background: var(--warn-fill);
}

.pond-card-critical {
  border-color: var(--crit);
  box-shadow: 4px 4px 0px var(--crit);
  background: var(--crit-fill);
  animation: card-wiggle 0.8s ease-in-out infinite;
}

/* Offline: crosshatch via CSS repeating gradient */
.pond-card-offline {
  border-color: var(--offline);
  box-shadow: 4px 4px 0px var(--offline);
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(163,163,163,0.08) 6px,
    rgba(163,163,163,0.08) 12px
  );
  filter: grayscale(0.5);
  opacity: 0.75;
}

/* Critical wiggle — nervous doodle shake */
@keyframes card-wiggle {
  0%,  100% { transform: rotate(0deg); }
  15%        { transform: rotate(-1.5deg); }
  30%        { transform: rotate(1.2deg); }
  45%        { transform: rotate(-0.8deg); }
  60%        { transform: rotate(1deg); }
  75%        { transform: rotate(-0.5deg); }
}

/* ── Status Dot Pulse (animated) ──────────────────────────────────────── */
@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.75); }
}

.dot-pulse { animation: dot-pulse 1.4s ease-in-out infinite; }

/* ── Typography Utilities ─────────────────────────────────────────────── */
.display {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 600;
}

.h1 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
}

.h2 {
  font-family: var(--font-body);
  font-size: 1.125rem;
  font-weight: 500;
}

.body-text {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 400;
}

.label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
}

/* Caveat used for large metric readouts */
.mono-data {
  font-family: var(--font-display);
  font-weight: 600;
}

/* Fira Code for stamped badge labels */
.badge {
  font-family: var(--font-badge);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── Scrollbar — thick marker style ───────────────────────────────────── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--accent-dim);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

/* ── Sketchy Divider ──────────────────────────────────────────────────── */
.section-divider {
  border: none;
  border-top: 2px dashed var(--bg-border);
  opacity: 0.25;
  margin: 10px 0;
}

/* ── Empty / Drawing State ────────────────────────────────────────────── */
/* Hand-drawn dashed outline for loading state — NOT a grey box */
.drawing-state {
  border: 2px dashed var(--accent-dim);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-family: var(--font-display);
  font-size: 1rem;
  padding: 24px;
  background: transparent;
}

/* ── Connection Lost — pencil fade ───────────────────────────────────── */
.connection-lost {
  filter: grayscale(1);
  opacity: 0.6;
  transition: filter 1s ease, opacity 1s ease;
}

.connection-restored {
  filter: grayscale(0);
  opacity: 1;
  transition: filter 1s ease, opacity 1s ease;
}
```

---

## 5. MQTT Connection Layer

> **mqtt.js v5 note:** `mqtt.connect()` returns an `MqttClient` instance. The options object and event names are identical to v4. The main v5 addition is optional Promise-based `.subscribeAsync()` / `.publishAsync()`. We use event-based API here for compatibility.

```js
// src/hooks/useMqtt.js
import { useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { useFarmStore } from '../store/useFarmStore'

const BROKER_URL = import.meta.env.VITE_MQTT_URL ?? 'ws://localhost:8083/mqtt'

const SUBSCRIPTIONS = [
  'farm/#',  // Wildcard — all topics for all ponds
]

export function useMqtt() {
  const clientRef = useRef(null)
  const { setConnectionStatus, handleMessage } = useFarmStore()

  useEffect(() => {
    // mqtt.connect() — v5 API (identical to v4 for connect options)
    const client = mqtt.connect(BROKER_URL, {
      clientId: `catfish-dash-${Math.random().toString(16).slice(2, 8)}`,
      protocolVersion: 5,          // MQTT v5 for user properties + flow control
      clean: true,
      reconnectPeriod: 3000,       // ms between reconnect attempts
      connectTimeout: 10000,
      properties: {
        receiveMaximum: 100,
        sessionExpiryInterval: 0,
      },
    })

    clientRef.current = client

    client.on('connect', () => {
      setConnectionStatus('connected')
      SUBSCRIPTIONS.forEach(topic => {
        // v5: can also use client.subscribeAsync(topic, { qos: 1 })
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) console.error(`[MQTT] Subscribe error on ${topic}:`, err)
        })
      })
    })

    client.on('reconnect',  ()    => setConnectionStatus('reconnecting'))
    client.on('offline',    ()    => setConnectionStatus('offline'))
    client.on('close',      ()    => setConnectionStatus('disconnected'))
    client.on('error',      (err) => {
      console.error('[MQTT]', err)
      setConnectionStatus('error')
    })

    client.on('message', (topic, payloadBuf, packet) => {
      try {
        const payload   = JSON.parse(payloadBuf.toString())
        const userProps = packet.properties?.userProperties ?? {}
        handleMessage(topic, payload, userProps)
      } catch {
        // Non-JSON message — silently discard
      }
    })

    return () => {
      client.end(true)  // force=true closes immediately without DISCONNECT packet
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return clientRef
}
```

---

## 6. Global State (Zustand)

> **Zustand v5 note:** The `create` function API is unchanged. Zustand v5 drops support for React 17 and older, and internally uses React 19's `useSyncExternalStore`. No migration required from v4 if you already use `import { create } from 'zustand'`.

```js
// src/store/useFarmStore.js
import { create } from 'zustand'

const POND_IDS = Array.from({ length: 10 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)
const MAX_ALERTS    = 50
const MAX_DO_HISTORY = 60  // 5 minutes at ~5s intervals

function emptyPond(id) {
  return {
    id,
    water:    null,     // { do, temperature, ph, ammonia, turbidity, status }
    aerator:  null,     // { status, power_consumption, uptime_minutes }
    feeder:   null,     // { status, remaining_kg, last_fed, next_feed_time }
    cycle:    null,     // { status, fish_count, cycle_day, biomass_kg }
    mortality: null,    // { today, cumulative, last_recorded }
    doHistory: [],      // [{ time: ISO string, value: number }]
    lastUpdated: null,
  }
}

export const useFarmStore = create((set, get) => ({

  // ── Connection ──────────────────────────────────────────────────────
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // ── Ponds ───────────────────────────────────────────────────────────
  ponds: Object.fromEntries(POND_IDS.map(id => [id, emptyPond(id)])),

  // ── Selected Pond (Detail Panel) ────────────────────────────────────
  selectedPondId: null,
  selectPond: (id) => set({ selectedPondId: id }),
  closePond:  ()   => set({ selectedPondId: null }),

  // ── Alerts ─────────────────────────────────────────────────────────
  alerts: [],  // [{ id, topic, severity, message, timestamp }]

  // ── Feed Stock ─────────────────────────────────────────────────────
  feedStock: null,  // { stock_kg, estimated_days_remaining, status }

  // ── Feed Dispensed Today (bar chart data) ───────────────────────────
  feedDispensed: Object.fromEntries(POND_IDS.map(id => [id, 0])),

  // ── MQTT Message Router ─────────────────────────────────────────────
  // Topic schema: farm / <section> / <pond_id?> / <type?> / <sub?>
  // farm/alerts/<severity>
  // farm/storage/feed_stock
  // farm/pond/<pond_id>/water
  // farm/pond/<pond_id>/aerator
  // farm/pond/<pond_id>/feeder
  // farm/pond/<pond_id>/feeder/dispensed
  // farm/pond/<pond_id>/cycle
  // farm/pond/<pond_id>/health/mortality
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

        if (section === 'aerator') {
          pond.aerator = { ...(pond.aerator ?? {}), ...payload }
        }

        if (section === 'feeder') {
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
```

---

## 7. Components

### 7.1 App Shell & Layout

```jsx
// src/App.jsx
import { useEffect } from 'react'
import { AnimatePresence } from 'motion/react'   // Motion v12: import from 'motion/react'
import { useMqtt } from './hooks/useMqtt'
import { useFarmStore } from './store/useFarmStore'
import { useBreakpoint } from './hooks/useBreakpoint'

import TopBar       from './components/layout/TopBar'
import Sidebar      from './components/layout/Sidebar'
import LiveStatsBar from './components/widgets/LiveStatsBar'
import PondGrid     from './components/pond/PondGrid'
import ChartRow     from './components/charts/ChartRow'
import DetailPanel  from './components/layout/DetailPanel'

export default function App() {
  useMqtt()

  const selectedPondId  = useFarmStore(s => s.selectedPondId)
  const connectionStatus = useFarmStore(s => s.connectionStatus)
  const { isDesktop }    = useBreakpoint()

  const isConnected = connectionStatus === 'connected'

  return (
    <div
      className={isConnected ? 'connection-restored' : 'connection-lost'}
      style={{
        display: 'grid',
        gridTemplateRows: '56px 1fr',
        gridTemplateColumns: isDesktop ? '280px 1fr' : '1fr',
        height: '100vh',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* TopBar spans full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar />
      </div>

      {/* Left Sidebar (desktop only) */}
      {isDesktop && <Sidebar />}

      {/* Main Content */}
      <main style={{
        overflow: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <LiveStatsBar />
        <PondGrid />
        <ChartRow />
      </main>

      {/* Right Detail Panel — animated slide-in */}
      <AnimatePresence>
        {selectedPondId && (
          <DetailPanel key={selectedPondId} pondId={selectedPondId} />
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

### 7.2 TopBar

```jsx
// src/components/layout/TopBar.jsx
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'
import ConnectionStatus from '../widgets/ConnectionStatus'
import { format } from 'date-fns'

export default function TopBar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        height: 56,
        background: 'var(--bg-panel)',
        borderBottom: '2px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 4px 0 var(--bg-border)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Farm Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          🐟 Catfish Creek Farm
        </span>
        <ConnectionStatus />
      </div>

      {/* Live Clock */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        color: 'var(--text-secondary)',
        letterSpacing: '0.02em',
      }}>
        {format(time, 'HH:mm:ss')}
      </div>
    </motion.header>
  )
}
```

---

### 7.3 Sidebar Left

```jsx
// src/components/layout/Sidebar.jsx
import { motion } from 'motion/react'
import ConnectionStatus from '../widgets/ConnectionStatus'
import FeedStockGauge   from '../widgets/FeedStockGauge'
import AlertFeed        from '../widgets/AlertFeed'

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
      style={{
        width: 280,
        background: 'var(--bg-paper)',
        borderRight: '2px solid var(--bg-border)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        padding: '16px 14px',
        boxShadow: '4px 0 0 var(--bg-border)',
      }}
    >
      {/* Network Status Panel */}
      <SidebarPanel title="Network" delay={0.15}>
        <ConnectionStatus detailed />
      </SidebarPanel>

      <hr className="section-divider" />

      {/* Feed Silo Gauge */}
      <SidebarPanel title="Feed Silo" delay={0.25}>
        <FeedStockGauge />
      </SidebarPanel>

      <hr className="section-divider" />

      {/* Alert Feed */}
      <SidebarPanel title="Recent Alerts" delay={0.35}>
        <AlertFeed />
      </SidebarPanel>
    </motion.aside>
  )
}

function SidebarPanel({ title, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 280, damping: 22 }}
      style={{ paddingBottom: 12 }}
    >
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: 600,
        marginBottom: 10,
        color: 'var(--text-primary)',
      }}>
        {title}
      </p>
      {children}
    </motion.div>
  )
}
```

---

### 7.4 Pond Grid & Cards

```jsx
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
        transform: 'rotate(-0.5deg)', /* subtle tilt for hand-drawn feel */
      }}>
        Active Ponds
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
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
```

```jsx
// src/components/pond/PondCard.jsx
import { motion } from 'motion/react'
import CountUp from 'react-countup'
import { useFarmStore } from '../../store/useFarmStore'
import StatusDot from '../atoms/StatusDot'

// Doodle-style aerator icon (SVG)
const AeratorIcon = ({ status }) => {
  const color = status === 'active'  ? 'var(--ok)'
              : status === 'offline' ? 'var(--crit)'
              : 'var(--warn)'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label={`Aerator ${status}`}>
      {/* Imperfect hand-drawn circle */}
      <ellipse cx="9" cy="9" rx="7" ry="7.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Spinning arms suggesting a paddle aerator */}
      <line x1="9" y1="5" x2="9" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="9" x2="13" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function PondCard({ pondId }) {
  const pond     = useFarmStore(s => s.ponds[pondId])
  const selected = useFarmStore(s => s.selectedPondId === pondId)
  const select   = useFarmStore(s => s.selectPond)

  const status   = pond?.water?.status ?? 'offline'
  const hasData  = !!pond?.water
  const cardClass = `panel pond-card-${hasData ? status : 'offline'}`

  return (
    <motion.div
      className={cardClass}
      onClick={() => select(pondId)}
      whileHover={{
        rotate: -1.5,
        scale: 1.03,
        boxShadow: `6px 6px 0px ${hasData && status === 'critical' ? 'var(--crit)' : 'var(--bg-border)'}`,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        padding: '10px 12px',
        cursor: 'pointer',
        position: 'relative',
        minHeight: 120,
        outline: selected ? `3px solid var(--accent)` : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Pond ID — Caveat, tilted slightly */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: status === 'critical' ? 'var(--crit)'
             : status === 'warning'  ? 'var(--warn)'
             : 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        transform: 'rotate(-1deg)',
      }}>
        {pondId}
        <StatusDot status={hasData ? status : 'offline'} />
      </div>

      {hasData ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <MiniMetric
              label="DO"
              value={pond.water.do}
              unit="mg/L"
              warn={pond.water.do < 5}
              crit={pond.water.do < 4}
            />
            <MiniMetric
              label="Temp"
              value={pond.water.temperature}
              unit="°"
              warn={pond.water.temperature > 31}
              crit={pond.water.temperature > 33}
            />
            <MiniMetric
              label="NH₃"
              value={pond.water.ammonia}
              unit="ppm"
              warn={pond.water.ammonia > 0.03}
              crit={pond.water.ammonia > 0.05}
            />
          </div>

          <div style={{ position: 'absolute', bottom: 8, right: 10 }}>
            <AeratorIcon status={pond.aerator?.status ?? 'unknown'} />
          </div>
        </>
      ) : (
        /* Empty/offline state — hand-drawn dashed look, NOT a grey box */
        <div className="drawing-state" style={{ minHeight: 70, fontSize: '0.9rem' }}>
          Fallow
        </div>
      )}
    </motion.div>
  )
}

function MiniMetric({ label, value, unit, warn, crit }) {
  const color = crit ? 'var(--crit)' : warn ? 'var(--warn)' : 'var(--text-secondary)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    }}>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.7rem',
        color: 'var(--text-dim)',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-display)',  /* Caveat for numbers */
        fontSize: '0.95rem',
        fontWeight: 600,
        color,
      }}>
        {value != null
          ? <CountUp end={value} decimals={1} duration={0.5} preserveValue />
          : '—'}
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginLeft: 2 }}>{unit}</span>
      </span>
    </div>
  )
}
```

---

### 7.5 Pond Detail Panel (Right)

```jsx
// src/components/layout/DetailPanel.jsx
import { motion } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'
import { format } from 'date-fns'
import CountUp from 'react-countup'
import StatusDot from '../atoms/StatusDot'

// Spring-based elastic slide-in from right
const slideIn = {
  initial: { x: 340, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
  exit: {
    x: 340,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

export default function DetailPanel({ pondId }) {
  const pond  = useFarmStore(s => s.ponds[pondId])
  const close = useFarmStore(s => s.closePond)

  return (
    <motion.aside
      {...slideIn}
      style={{
        position: 'fixed',
        top: 56,                    /* below TopBar */
        right: 0,
        width: 320,
        height: 'calc(100vh - 56px)',
        background: 'var(--bg-panel)',
        borderLeft: '2px solid var(--bg-border)',
        boxShadow: '-4px 0 0 var(--bg-border)',
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '2px solid var(--bg-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <p className="badge" style={{ color: 'var(--text-dim)', marginBottom: 4 }}>
            INSPECTING
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--accent)',
            transform: 'rotate(-1deg)',
            display: 'inline-block',
          }}>
            {pondId}
          </h1>
          {pond?.cycle && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
              Cycle Day {pond.cycle.cycle_day} · {pond.cycle.fish_count?.toLocaleString()} fish
            </p>
          )}
        </div>
        <button
          onClick={close}
          style={{
            background: 'none',
            border: '2px solid var(--bg-border)',
            borderRadius: '50%',
            width: 30,
            height: 30,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 var(--bg-border)',
          }}
          aria-label="Close detail panel"
        >
          ✕
        </button>
      </div>

      {/* Sections */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <WaterSection      water={pond?.water} />
        <AeratorSection    aerator={pond?.aerator} />
        <FeederSection     feeder={pond?.feeder} />
        {pond?.cycle && <CycleSection cycle={pond.cycle} />}
        {pond?.mortality && <HealthSection mortality={pond.mortality} />}
      </div>
    </motion.aside>
  )
}

function DetailSection({ title, children }) {
  return (
    <div className="panel" style={{ padding: '12px 14px' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: 600,
        marginBottom: 10,
        color: 'var(--text-primary)',
      }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function DataRow({ label, value, unit, warn, crit }) {
  const color = crit ? 'var(--crit)' : warn ? 'var(--warn)' : 'var(--text-primary)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px dashed rgba(30,30,30,0.15)',
    }}>
      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color }}>
        {value != null
          ? value
          : <span style={{ color: 'var(--text-dim)' }}>—</span>}
        {unit && <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}

// Colored indicator bar for water quality params
function IndicatorBar({ value, min, max, warnAt, critAt }) {
  const pct   = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const color = value <= critAt ? 'var(--crit)'
              : value <= warnAt ? 'var(--warn)'
              : 'var(--ok)'
  return (
    <div style={{
      height: 5,
      background: 'rgba(30,30,30,0.08)',
      borderRadius: 10,
      overflow: 'hidden',
      marginTop: 3,
      marginBottom: 8,
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: color,
        borderRadius: 10,
        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
    </div>
  )
}

function WaterSection({ water }) {
  if (!water) {
    return (
      <DetailSection title="Water Quality">
        <div className="drawing-state">Drawing data...</div>
      </DetailSection>
    )
  }
  return (
    <DetailSection title="Water Quality">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <StatusDot status={water.status} />
        <span className="badge" style={{
          color: water.status === 'critical' ? 'var(--crit)'
               : water.status === 'warning'  ? 'var(--warn)'
               : 'var(--ok)',
        }}>
          {water.status.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
        Dissolved Oxygen
        <span style={{ float: 'right', fontFamily: 'var(--font-display)', fontWeight: 600,
          color: water.do < 4 ? 'var(--crit)' : water.do < 5 ? 'var(--warn)' : 'var(--text-primary)' }}>
          {water.do} mg/L
        </span>
      </div>
      <IndicatorBar value={water.do} min={0} max={10} warnAt={5} critAt={4} />

      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
        Temperature
        <span style={{ float: 'right', fontFamily: 'var(--font-display)', fontWeight: 600,
          color: water.temperature > 33 ? 'var(--crit)' : water.temperature > 31 ? 'var(--warn)' : 'var(--text-primary)' }}>
          {water.temperature}°C
        </span>
      </div>
      <IndicatorBar value={water.temperature} min={20} max={38} warnAt={31} critAt={33} />

      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
        Ammonia (NH₃)
        <span style={{ float: 'right', fontFamily: 'var(--font-display)', fontWeight: 600,
          color: water.ammonia > 0.05 ? 'var(--crit)' : water.ammonia > 0.03 ? 'var(--warn)' : 'var(--text-primary)' }}>
          {water.ammonia} ppm
        </span>
      </div>
      <IndicatorBar value={water.ammonia} min={0} max={0.1} warnAt={0.03} critAt={0.05} />

      <DataRow label="pH"         value={water.ph} />
      <DataRow label="Turbidity"  value={water.turbidity} unit="NTU" />
    </DetailSection>
  )
}

function AeratorSection({ aerator }) {
  return (
    <DetailSection title="Aerators">
      <DataRow label="Status"       value={aerator?.status ?? '—'}
        crit={aerator?.status === 'offline' || aerator?.status === 'error'} />
      <DataRow label="Power"        value={aerator?.power_consumption} unit="W" />
      <DataRow label="Uptime"       value={aerator?.uptime_minutes
        ? `${Math.floor(aerator.uptime_minutes / 60)}h ${Math.round(aerator.uptime_minutes % 60)}m`
        : '—'} />
    </DetailSection>
  )
}

function FeederSection({ feeder }) {
  return (
    <DetailSection title="Auto-Feeder">
      <DataRow label="Status"     value={feeder?.status ?? '—'}
        warn={feeder?.status === 'jammed'} />
      <DataRow label="Hopper Level" value={feeder?.remaining_kg} unit="kg"
        warn={feeder?.remaining_kg < 2} crit={feeder?.remaining_kg < 0.5} />
      <DataRow label="Last Fed"   value={feeder?.last_fed
        ? format(new Date(feeder.last_fed), 'HH:mm') : '—'} />
      <DataRow label="Next Feed"  value={feeder?.next_feed_time
        ? format(new Date(feeder.next_feed_time), 'HH:mm') : '—'} />
    </DetailSection>
  )
}

function CycleSection({ cycle }) {
  return (
    <DetailSection title="Cycle Info">
      <DataRow label="Status"     value={cycle.status} />
      <DataRow label="Cycle Day"  value={cycle.cycle_day} />
      <DataRow label="Fish Count" value={cycle.fish_count?.toLocaleString()} />
      {cycle.biomass_kg && <DataRow label="Est. Biomass" value={cycle.biomass_kg} unit="kg" />}
    </DetailSection>
  )
}

function HealthSection({ mortality }) {
  return (
    <DetailSection title="Biomass Health">
      <DataRow label="Today Mortality"      value={mortality.today} />
      <DataRow label="Cumulative Mortality" value={mortality.cumulative} />
      <DataRow label="Last Recorded"        value={mortality.last_recorded
        ? format(new Date(mortality.last_recorded), 'dd MMM HH:mm') : '—'} />
    </DetailSection>
  )
}
```

---

### 7.6 Live Stats Bar

```jsx
// src/components/widgets/LiveStatsBar.jsx
import { motion } from 'motion/react'
import CountUp from 'react-countup'
import { useFarmStore } from '../../store/useFarmStore'

function StatCard({ label, value, unit, color, emoji, delay }) {
  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        padding: '12px 16px',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {emoji && <span style={{ fontSize: '1.8rem' }}>{emoji}</span>}
      <div>
        <p className="badge" style={{ color: 'var(--text-dim)', marginBottom: 4 }}>{label}</p>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          fontWeight: 700,
          color: color ?? 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {typeof value === 'number'
            ? <CountUp end={value} decimals={value % 1 !== 0 ? 1 : 0} duration={0.5} preserveValue />
            : (value ?? '—')}
          {unit && <span style={{ fontSize: '0.9rem', marginLeft: 4, color: 'var(--text-dim)' }}>{unit}</span>}
        </div>
      </div>
    </motion.div>
  )
}

export default function LiveStatsBar() {
  const agg = useFarmStore(s => s.getAggregates())
  const feedStock = useFarmStore(s => s.feedStock)

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <StatCard
        label="Avg DO"
        value={agg.avgDo !== null ? parseFloat(agg.avgDo) : null}
        unit="mg/L"
        emoji="💧"
        color="var(--accent)"
        delay={0.1}
      />
      <StatCard
        label="Warning Ponds"
        value={agg.warningPonds}
        emoji="⚠️"
        color={agg.warningPonds > 0 ? 'var(--warn)' : 'var(--ok)'}
        delay={0.15}
      />
      <StatCard
        label="Critical"
        value={agg.criticalPonds}
        emoji="🚨"
        color={agg.criticalPonds > 0 ? 'var(--crit)' : 'var(--ok)'}
        delay={0.2}
      />
      <StatCard
        label="Feed Stock"
        value={feedStock?.estimated_days_remaining ?? null}
        unit="days"
        emoji="🌾"
        color={
          feedStock?.status === 'critical' ? 'var(--crit)'
        : feedStock?.status === 'low'      ? 'var(--warn)'
        : 'var(--ok)'}
        delay={0.25}
      />
    </div>
  )
}
```

---

### 7.7 DO Trend Chart

> **Chart.js v4 note:** Register only the modules you use, OR use `import 'chart.js/auto'` to auto-register all. Use `tension: 0.5` for smooth, organic curves. Grid lines styled with `borderDash` for pencil-line look.

```jsx
// src/components/charts/DoTrendChart.jsx
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { useFarmStore } from '../../store/useFarmStore'
import { format } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

export default function DoTrendChart({ pondId }) {
  const ponds = useFarmStore(s => s.ponds)

  const { labels, datasets } = useMemo(() => {
    if (pondId) {
      const pond    = ponds[pondId]
      const history = pond?.doHistory ?? []
      return {
        labels: history.map(p => format(new Date(p.time), 'HH:mm')),
        datasets: [{
          label: `${pondId} DO`,
          data: history.map(p => p.value),
          borderColor: '#5C88DA',
          backgroundColor: 'rgba(92, 136, 218, 0.12)',
          fill: true,
          tension: 0.5,       /* high tension = smooth organic curve */
          pointRadius: 0,
          borderWidth: 2.5,
        }],
      }
    }
    const pondList = Object.values(ponds)
    return {
      labels: pondList.map(p => p.id),
      datasets: [{
        label: 'Current DO',
        data: pondList.map(p => p.water?.do ?? 0),
        borderColor: '#5C88DA',
        backgroundColor: 'rgba(92, 136, 218, 0.10)',
        fill: true,
        tension: 0.5,
        pointRadius: 4,
        pointBackgroundColor: '#5C88DA',
        borderWidth: 2.5,
      }],
    }
  }, [ponds, pondId])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    scales: {
      x: {
        ticks: {
          color: '#A3A3A3',
          font: { family: 'Fira Code', size: 10 },
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(160, 188, 238, 0.3)',
          borderDash: [4, 4],   /* dashed pencil grid lines */
        },
      },
      y: {
        min: 0,
        max: 12,
        ticks: {
          color: '#5A5A5A',
          font: { family: 'Fira Code', size: 10 },
        },
        grid: {
          color: 'rgba(160, 188, 238, 0.3)',
          borderDash: [4, 4],
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#1E1E1E',
        borderWidth: 2,
        titleColor: '#5A5A5A',
        bodyColor: '#1E1E1E',
        bodyFont: { family: 'Fira Code' },
        padding: 10,
        boxShadow: '4px 4px 0 #1E1E1E',
      },
    },
  }

  return (
    <div className="panel" style={{ padding: '14px 16px', height: 220 }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 10,
      }}>
        Farm DO Trends {pondId ? `— ${pondId}` : '(Rolling 24h)'}
      </p>
      <div style={{ height: 160 }}>
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  )
}
```

---

### 7.8 Feed Dispensed Chart

```jsx
// src/components/charts/FeedBarChart.jsx
import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js'
import { useFarmStore } from '../../store/useFarmStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const POND_IDS = Array.from({ length: 10 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)

export default function FeedBarChart() {
  const feedDispensed = useFarmStore(s => s.feedDispensed)

  const data = useMemo(() => ({
    labels: POND_IDS,
    datasets: [{
      label: 'Feed Dispensed (kg)',
      data: POND_IDS.map(id => feedDispensed[id] ?? 0),
      // Bars: normal = yellow surface color, high = warn orange
      backgroundColor: POND_IDS.map(id =>
        (feedDispensed[id] ?? 0) > 1.2
          ? 'rgba(242, 166, 90, 0.75)'
          : 'rgba(255, 249, 204, 0.9)'
      ),
      borderColor: POND_IDS.map(id =>
        (feedDispensed[id] ?? 0) > 1.2
          ? '#F2A65A'
          : '#1E1E1E'
      ),
      borderWidth: 2,
      borderRadius: 4,
    }],
  }), [feedDispensed])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    scales: {
      x: {
        ticks: {
          color: '#A3A3A3',
          font: { family: 'Fira Code', size: 10 },
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#5A5A5A',
          font: { family: 'Fira Code', size: 10 },
        },
        grid: {
          color: 'rgba(160, 188, 238, 0.3)',
          borderDash: [4, 4],
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#1E1E1E',
        borderWidth: 2,
        bodyFont: { family: 'Fira Code' },
        bodyColor: '#1E1E1E',
        padding: 10,
      },
    },
  }

  return (
    <div className="panel" style={{ padding: '14px 16px', height: 220 }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 10,
      }}>
        Feed Dispensed (7d)
      </p>
      <div style={{ height: 160 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
```

```jsx
// src/components/charts/ChartRow.jsx
import DoTrendChart from './DoTrendChart'
import FeedBarChart from './FeedBarChart'
import { useFarmStore } from '../../store/useFarmStore'

export default function ChartRow() {
  const selectedPondId = useFarmStore(s => s.selectedPondId)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <DoTrendChart pondId={selectedPondId} />
      <FeedBarChart />
    </div>
  )
}
```

---

### 7.9 Alert Feed

```jsx
// src/components/widgets/AlertFeed.jsx
import { AnimatePresence, motion } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'
import { format } from 'date-fns'

const SEV_COLOR = {
  critical: 'var(--crit)',
  warning:  'var(--warn)',
  info:     'var(--ok)',
}

const SEV_EMOJI = {
  critical: '🚨',
  warning:  '⚠️',
  info:     'ℹ️',
}

export default function AlertFeed() {
  const alerts = useFarmStore(s => s.alerts.slice(0, 10))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
      <AnimatePresence initial={false}>
        {alerts.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-dim)',
            fontSize: '1rem',
            padding: '12px 0',
          }}>
            ✓ All quiet!
          </p>
        ) : alerts.map(alert => (
          <motion.div
            key={alert.id}
            /* Drop-in like a sticky note being placed */
            initial={{ opacity: 0, y: -12, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            style={{
              background: alert.severity === 'critical'
                ? 'rgba(230, 106, 106, 0.08)'
                : alert.severity === 'warning'
                ? 'rgba(255, 249, 204, 1)'   /* yellow sticky note */
                : 'var(--bg-surface)',
              border: `2px solid ${SEV_COLOR[alert.severity] ?? 'var(--bg-border)'}`,
              borderRadius: '8px 10px 9px 8px',   /* irregular sketchy */
              boxShadow: `3px 3px 0 ${SEV_COLOR[alert.severity] ?? 'var(--bg-border)'}`,
              padding: '8px 10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{SEV_EMOJI[alert.severity]}</span>
                <span className="badge" style={{ color: SEV_COLOR[alert.severity] }}>
                  {alert.severity}
                </span>
              </span>
              <span style={{
                fontFamily: 'var(--font-badge)',
                fontSize: '0.6rem',
                color: 'var(--text-dim)',
              }}>
                {format(new Date(alert.timestamp), 'HH:mm:ss')}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}>
              {alert.message}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

---

### 7.10 Feed Stock Gauge

```jsx
// src/components/widgets/FeedStockGauge.jsx
import { useFarmStore } from '../../store/useFarmStore'
import CountUp from 'react-countup'

export default function FeedStockGauge() {
  const stock  = useFarmStore(s => s.feedStock)
  const days   = stock?.estimated_days_remaining ?? 0
  const status = stock?.status ?? 'sufficient'
  const maxDays = 30
  const pct    = Math.min(100, (days / maxDays) * 100)

  const color = status === 'critical' ? 'var(--crit)'
              : status === 'low'      ? 'var(--warn)'
              : 'var(--ok)'

  // SVG half-circle arc gauge
  // Radius 40, center (56, 56), arc from left (16,56) to right (96,56)
  const r             = 40
  const circumference = Math.PI * r    // half-circle arc length ≈ 125.66
  const dashOffset    = circumference * (1 - pct / 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* SVG Gauge */}
      <svg width="112" height="68" viewBox="0 0 112 68" aria-label={`Feed stock ${days} days`}>
        {/* Background arc (grey pencil) */}
        <path
          d={`M 16 56 A ${r} ${r} 0 0 1 96 56`}
          fill="none"
          stroke="rgba(30,30,30,0.12)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* Value arc — animated via CSS transition */}
        <path
          d={`M 16 56 A ${r} ${r} 0 0 1 96 56`}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease' }}
        />
        {/* Center text — days remaining */}
        <text x="56" y="48" textAnchor="middle"
          style={{ fontFamily: 'Caveat, cursive', fontSize: 18, fontWeight: 700, fill: color }}>
          <CountUp end={days} decimals={0} duration={0.7} preserveValue />
        </text>
        <text x="56" y="62" textAnchor="middle"
          style={{ fontFamily: 'Fira Code, monospace', fontSize: 9, fill: '#A3A3A3', letterSpacing: 1 }}>
          DAYS
        </text>
      </svg>

      {/* Stock kg */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        {stock ? `${stock.stock_kg?.toFixed(0)} kg remaining` : 'Awaiting data...'}
      </p>

      {/* Status badge */}
      <span className="badge" style={{
        color,
        background: `${color}18`,
        padding: '2px 10px',
        borderRadius: 4,
        border: `1.5px solid ${color}`,
        boxShadow: `2px 2px 0 ${color}`,
      }}>
        {status.toUpperCase()}
      </span>
    </div>
  )
}
```

---

### 7.11 Connection Status Badge

```jsx
// src/components/widgets/ConnectionStatus.jsx
import { motion, AnimatePresence } from 'motion/react'
import { useFarmStore } from '../../store/useFarmStore'

const STATUS_MAP = {
  connected:    { label: 'MQTT Connected', color: 'var(--ok)',      pulse: true  },
  reconnecting: { label: 'Reconnecting…',  color: 'var(--warn)',    pulse: true  },
  disconnected: { label: 'Disconnected',   color: 'var(--offline)', pulse: false },
  offline:      { label: 'Broker Offline', color: 'var(--crit)',    pulse: false },
  error:        { label: 'Error',          color: 'var(--crit)',    pulse: false },
}

export default function ConnectionStatus({ detailed = false }) {
  const status = useFarmStore(s => s.connectionStatus)
  const { label, color, pulse } = STATUS_MAP[status] ?? STATUS_MAP.disconnected

  if (detailed) {
    // Sidebar expanded version
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          className={pulse ? 'dot-pulse' : ''}
          style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p className="badge" style={{ color: 'var(--text-dim)' }}>
            {status.toUpperCase()}
          </p>
        </div>
      </div>
    )
  }

  // TopBar compact badge version
  return (
    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: `${color}18`,
        border: `2px solid ${color}`,
        borderRadius: '20px 18px 22px 19px',  /* sketchy pill */
        boxShadow: `2px 2px 0 ${color}`,
        padding: '3px 10px',
      }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    >
      <div
        className={pulse ? 'dot-pulse' : ''}
        style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      <span className="badge" style={{ color }}>
        {status === 'connected' ? 'LIVE SYNC' : label}
      </span>
    </motion.div>
  )
}
```

---

### 7.12 Shared Atoms

```jsx
// src/components/atoms/StatusDot.jsx
// Hand-drawn imperfect circle — simulated via irregular border-radius + slight shadow

const DOT_COLOR = {
  normal:   'var(--ok)',
  warning:  'var(--warn)',
  critical: 'var(--crit)',
  offline:  'var(--offline)',
}

export default function StatusDot({ status, size = 10 }) {
  const color = DOT_COLOR[status] ?? 'var(--offline)'
  const isPulsing = status === 'critical' || status === 'warning'

  return (
    <div
      className={isPulsing ? 'dot-pulse' : ''}
      style={{
        width: size,
        height: size,
        borderRadius: '60% 40% 55% 45% / 50% 60% 40% 55%',  /* imperfect circle */
        background: color,
        border: `1.5px solid ${color}`,
        boxShadow: `1px 1px 0 rgba(30,30,30,0.2)`,
        flexShrink: 0,
      }}
      aria-label={`Status: ${status}`}
    />
  )
}
```

```jsx
// src/components/atoms/MetricRow.jsx
// Full-width labeled metric row with CountUp — used in detail sections

import CountUp from 'react-countup'

export default function MetricRow({ label, value, unit, warn, crit }) {
  const color = crit ? 'var(--crit)' : warn ? 'var(--warn)' : 'var(--text-primary)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px dashed rgba(30,30,30,0.12)',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color }}>
        {typeof value === 'number'
          ? <CountUp end={value} decimals={value % 1 !== 0 ? 2 : 0} duration={0.5} preserveValue />
          : (value ?? <span style={{ color: 'var(--text-dim)' }}>—</span>)}
        {unit && <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}
```

```jsx
// src/components/atoms/Badge.jsx
// Stamped status badge with Fira Code font + sketchy border

export default function Badge({ label, color = 'var(--accent)', size = 'sm' }) {
  const fontSize = size === 'sm' ? '0.6875rem' : '0.8rem'
  return (
    <span
      className="badge"
      style={{
        color,
        background: `${color}18`,
        border: `1.5px solid ${color}`,
        borderRadius: '4px 5px 4px 5px',  /* slightly irregular */
        boxShadow: `1.5px 1.5px 0 ${color}`,
        padding: '1px 8px',
        fontSize,
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}
```

```jsx
// src/components/atoms/SectionDivider.jsx
export default function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <hr className="section-divider" style={{ flex: 1 }} />
      {label && (
        <span className="badge" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <hr className="section-divider" style={{ flex: 1 }} />
    </div>
  )
}
```

---

## 8. Animations Reference

All animations use **Motion v12** (`import { motion, AnimatePresence } from 'motion/react'`). Use spring physics — avoid `duration`-only easing for UI interactions.

| Animation | Component | Implementation | Config |
|---|---|---|---|
| Page load stagger | All panels (Sidebar, TopBar) | `initial: {y/x, opacity:0}` → `animate` with `delay: i*0.06` | `spring stiffness:260 damping:22` |
| Pond card pop-in | PondGrid | `initial: {scale:0.85, y:12}` | `spring stiffness:320 damping:20` |
| Pond card hover | PondCard | `whileHover: {rotate:-1.5, scale:1.03}` | `spring stiffness:400 damping:20` |
| Pond card tap | PondCard | `whileTap: {scale:0.97}` | same spring |
| Detail panel slide | DetailPanel | `initial: {x:340}` + `AnimatePresence` | `spring stiffness:280 damping:22` |
| Critical card wiggle | CSS only | `@keyframes card-wiggle` — rotating ±1.5deg | `animation: 0.8s infinite` |
| Alert drop-in | AlertFeed | `initial: {y:-12, rotate:-1}` | `spring stiffness:350 damping:22` |
| Alert exit | AlertFeed | `exit: {opacity:0, height:0}` | `AnimatePresence` |
| Connection badge breathe | ConnectionStatus | `animate: {scale:[1,1.02,1]}` | `repeat:Infinity duration:2s` |
| Status dot pulse | StatusDot + CSS | `.dot-pulse` — scale + opacity | `1.4s ease-in-out infinite` |
| Metric number change | All `<CountUp>` | `preserveValue` + `duration:0.5` | react-countup v6 |
| Feed gauge arc | FeedStockGauge | SVG `stroke-dashoffset` CSS transition | `0.9s cubic-bezier(0.34,1.56,0.64,1)` |
| Connection lost → restore | App root | CSS `.connection-lost` / `.connection-restored` | `filter: grayscale transition 1s` |

**Spring presets reference:**

```js
const SPRING_BOUNCY  = { type: 'spring', stiffness: 380, damping: 18 }  // lively pop
const SPRING_SMOOTH  = { type: 'spring', stiffness: 260, damping: 22 }  // panels
const SPRING_SNAPPY  = { type: 'spring', stiffness: 420, damping: 26 }  // hover/tap
```

---

## 9. Responsive Breakpoints

```js
// src/hooks/useBreakpoint.js
import { useState, useEffect } from 'react'

export function useBreakpoint() {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])

  return {
    isMobile:  width < 768,
    isTablet:  width >= 768 && width < 1280,
    isDesktop: width >= 1280,
  }
}
```

```css
/* src/index.css — Responsive overrides */

/* Tablet (768–1279px): sidebar becomes icon rail, detail as bottom sheet */
@media (max-width: 1279px) {
  /* Pond grid: 4 columns */
  .pond-grid {
    grid-template-columns: repeat(4, 1fr) !important;
  }

  /* Detail panel: bottom sheet instead of right panel */
  .detail-panel-tablet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 60vh;
    border-left: none;
    border-top: 2px solid var(--bg-border);
    box-shadow: 0 -4px 0 var(--bg-border);
    border-radius: 16px 16px 0 0;
  }
}

/* Mobile (<768px): single column, fullscreen modal */
@media (max-width: 767px) {
  /* Pond grid: 2 columns */
  .pond-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* Charts: stacked vertically */
  .chart-row {
    grid-template-columns: 1fr !important;
  }

  /* Detail panel: fullscreen modal */
  .detail-panel-mobile {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
    border: none;
    border-radius: 0;
  }

  /* Sidebar: drawer from left, toggled by TopBar button */
  .sidebar-mobile {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 80;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .sidebar-mobile.open {
    transform: translateX(0);
  }
}
```

---

## 10. Build & Deployment

### Development

```bash
npm run dev
# Dashboard: http://localhost:5173
# MQTT WebSocket proxied: ws://localhost:5173/mqtt → ws://localhost:8083/mqtt
```

### Production Build

```bash
npm run build
# Output: dist/

# Test locally
npx serve dist
```

### Nginx — Serve SPA + Proxy MQTT WebSocket

```nginx
server {
    listen 80;
    server_name your-farm-domain.com;
    root /var/www/smart-catfish-farm;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # MQTT WebSocket proxy to local EMQX broker
    location /mqtt {
        proxy_pass         http://localhost:8083/mqtt;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "Upgrade";
        proxy_set_header   Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Environment Variables

```env
# .env.development (default — proxied via Vite)
VITE_MQTT_URL=ws://localhost:5173/mqtt
VITE_FARM_NAME=Catfish Creek Farm

# .env.production
VITE_MQTT_URL=ws://your-server-ip:8083/mqtt
VITE_FARM_NAME=Smart Catfish Farm
```

```js
// src/hooks/useMqtt.js — use env variable
const BROKER_URL = import.meta.env.VITE_MQTT_URL ?? 'ws://localhost:8083/mqtt'
```

### Recommended EMQX Broker Setup (Docker)

```bash
# Quick local EMQX with WebSocket on port 8083
docker run -d --name emqx \
  -p 1883:1883 \    # MQTT TCP
  -p 8083:8083 \    # MQTT WebSocket
  -p 18083:18083 \  # EMQX Dashboard
  emqx/emqx:5.8     # Use EMQX v5 — latest stable as of 2025
```

---

## Appendix: MQTT Topic Schema

```
farm/
├── pond/<pond_id>/
│   ├── water                  # { do, temperature, ph, ammonia, turbidity, status, timestamp }
│   ├── aerator                # { status, power_consumption, uptime_minutes }
│   ├── feeder                 # { status, remaining_kg, last_fed, next_feed_time }
│   ├── feeder/dispensed       # { dispensed_kg, timestamp }
│   ├── cycle                  # { status, fish_count, cycle_day, biomass_kg }
│   └── health/mortality       # { today, cumulative, last_recorded }
├── alerts/<severity>          # severity: critical | warning | info
│                              # payload: { message, timestamp, pond_id? }
└── storage/
    └── feed_stock             # { stock_kg, estimated_days_remaining, status }
```

**Status field values:**

| Field | Possible values |
|---|---|
| `water.status` | `normal` · `warning` · `critical` |
| `aerator.status` | `active` · `idle` · `offline` · `error` |
| `feeder.status` | `ok` · `jammed` · `empty` |
| `feedStock.status` | `sufficient` · `low` · `critical` |
| `cycle.status` | `active` · `fallow` · `harvesting` |

---

*End of Frontend Guide — Smart Catfish Farm Dashboard*
*Theme: Sketchbook / Hand-Drawn Doodle · Stack: React 19 + Vite 6 + Zustand 5 + Motion 12 + Chart.js 4 + mqtt.js 5 + Tailwind CSS v4*
