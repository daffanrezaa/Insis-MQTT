// src/hooks/useMqtt.js
import { useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { useFarmStore } from '../store/useFarmStore'

const BROKER_URL = import.meta.env.VITE_MQTT_URL ?? 'ws://localhost:8083/mqtt'

const SUBSCRIPTIONS = [
  'farm/#',
]

export function useMqtt() {
  const clientRef = useRef(null)
  const { setConnectionStatus, handleMessage, setMqttPublish } = useFarmStore()

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
      clientId: `catfish-dash-${Math.random().toString(16).slice(2, 8)}`,
      protocolVersion: 5,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      properties: {
        receiveMaximum: 100,
        sessionExpiryInterval: 0,
      },
    })

    clientRef.current = client

    client.on('connect', () => {
      setConnectionStatus('connected')
      
      setMqttPublish((topic, message) => {
        if (client.connected) {
          client.publish(topic, JSON.stringify(message), { qos: 1 })
        }
      })

      SUBSCRIPTIONS.forEach(topic => {
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
      client.end(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return clientRef
}
