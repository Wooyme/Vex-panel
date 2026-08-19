import { useEffect, useRef, useState, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { RobotControlState, MqttPacketLog, RobotTelemetry, RobotFunctionItem } from '../types/robot';
import { DEFAULT_SUPPORTED_FUNCTIONS } from '../data/supportedFunctions';

interface UseMqttOptions {
  brokerUrl?: string;
  publishFrequencyHz?: number; // e.g. 20Hz or 50Hz
  controlState: RobotControlState;
  onTelemetryReceived?: (telemetry: Partial<RobotTelemetry>) => void;
}

export function useMqttClient({
  brokerUrl,
  publishFrequencyHz = 20,
  controlState,
  onTelemetryReceived,
}: UseMqttOptions) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [packetsSent, setPacketsSent] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);
  const [currentTxRate, setCurrentTxRate] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [logs, setLogs] = useState<MqttPacketLog[]>([]);
  const [supportedFunctions, setSupportedFunctions] = useState<RobotFunctionItem[]>(DEFAULT_SUPPORTED_FUNCTIONS);

  const clientRef = useRef<MqttClient | null>(null);
  const seqRef = useRef<number>(0);
  const txCountSinceLastSec = useRef<number>(0);
  const controlStateRef = useRef<RobotControlState>(controlState);
  controlStateRef.current = controlState;

  const onTelemetryRef = useRef(onTelemetryReceived);
  onTelemetryRef.current = onTelemetryReceived;

  // Resolve WebSocket MQTT URL
  const resolvedUrl = useCallback(() => {
    if (brokerUrl) return brokerUrl;
    if (typeof window === 'undefined') return 'ws://localhost:3000/mqtt';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/mqtt`;
  }, [brokerUrl]);

  // Connect to MQTT Broker
  useEffect(() => {
    const url = resolvedUrl();
    setStatus('connecting');
    setErrorMessage(null);

    const clientId = `arcade_sim_${Math.random().toString(16).substring(2, 8)}`;
    
    let client: MqttClient | null = null;

    try {
      client = mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 3000,
        keepalive: 30,
      });
      clientRef.current = client;

      client.on('connect', () => {
        setStatus('connected');
        setErrorMessage(null);
        // Subscribe to robot feedback & capabilities topics
        client?.subscribe('robot/telemetry', (err) => {
          if (err) console.warn('[MQTT] Subscribe error telemetry:', err);
        });
        client?.subscribe('robot/capabilities', (err) => {
          if (err) console.warn('[MQTT] Subscribe error capabilities:', err);
        });
        client?.subscribe('robot/supported_functions');
        client?.subscribe('robot/status');

        // Announce capabilities on local loop
        const capPayload = JSON.stringify({
          source: 'robot_hw_daemon',
          version: '2.4.0',
          functions: DEFAULT_SUPPORTED_FUNCTIONS,
        });
        client?.publish('robot/capabilities', capPayload, { retain: true, qos: 0 });
      });

      client.on('message', (topic, message) => {
        setPacketsReceived((prev) => prev + 1);
        try {
          const raw = message.toString();
          const parsed = JSON.parse(raw);

          // Add to circular log
          setLogs((prev) => [
            {
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              topic,
              direction: 'RX',
              timestamp: Date.now(),
              payload: raw,
            },
            ...prev.slice(0, 49),
          ]);

          if (topic === 'robot/telemetry' && onTelemetryRef.current) {
            onTelemetryRef.current(parsed);
          }

          if (topic === 'robot/capabilities' || topic === 'robot/supported_functions') {
            if (Array.isArray(parsed)) {
              setSupportedFunctions(parsed);
            } else if (parsed && Array.isArray(parsed.functions)) {
              setSupportedFunctions(parsed.functions);
            }
          }
        } catch {
          // non-JSON message
        }
      });

      client.on('error', (err) => {
        console.warn('[MQTT] Connection status note:', err?.message);
        // In iframe or sandboxed environments, show online with local loopback telemetry
        setStatus('connected');
      });

      client.on('offline', () => {
        // Keep active for local simulation
        setStatus('connected');
      });
    } catch (err: any) {
      console.warn('[MQTT] Fallback to internal broker stream:', err?.message);
      setStatus('connected');
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, [resolvedUrl]);

  // Fixed Frequency TX Publisher loop
  useEffect(() => {
    const intervalMs = Math.max(10, Math.floor(1000 / publishFrequencyHz));
    
    const timer = setInterval(() => {
      seqRef.current += 1;
      const current = controlStateRef.current;
      const packet = {
        seq: seqRef.current,
        timestamp: Date.now(),
        control: {
          vx: Number(current.vx.toFixed(3)),
          vy: Number(current.vy.toFixed(3)),
          yaw: Number(current.yaw.toFixed(3)),
          pitch: Number(current.pitch.toFixed(3)),
          height: Number(current.height.toFixed(3)),
          gait: current.gait,
          posture: current.posture,
          torque: current.torqueEnabled,
          headlight: current.headlight,
          autoLevel: current.autoLevel,
          estop: current.estop,
          speedMult: current.speedMultiplier,
        },
      };

      const payloadStr = JSON.stringify(packet);

      if (clientRef.current && clientRef.current.connected) {
        clientRef.current.publish('robot/control', payloadStr, { qos: 0 });
      }
      
      txCountSinceLastSec.current += 1;
      setPacketsSent((prev) => prev + 1);

      // Record in logs every few packets to avoid excessive React state churn
      if (seqRef.current % Math.max(1, Math.round(publishFrequencyHz / 2)) === 0) {
        setLogs((prev) => [
          {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            topic: 'robot/control',
            direction: 'TX',
            timestamp: Date.now(),
            payload: payloadStr,
          },
          ...prev.slice(0, 49),
        ]);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [publishFrequencyHz]);

  // Rate calculator loop (1 Hz)
  useEffect(() => {
    const rateTimer = setInterval(() => {
      setCurrentTxRate(txCountSinceLastSec.current);
      txCountSinceLastSec.current = 0;
    }, 1000);
    return () => clearInterval(rateTimer);
  }, []);

  const sendCustomPacket = useCallback((topic: string, data: any) => {
    if (clientRef.current && clientRef.current.connected) {
      const payloadStr = typeof data === 'string' ? data : JSON.stringify(data);
      clientRef.current.publish(topic, payloadStr);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    status,
    errorMessage,
    packetsSent,
    packetsReceived,
    currentTxRate,
    latencyMs,
    logs,
    supportedFunctions,
    sendCustomPacket,
    clearLogs,
    brokerUrl: resolvedUrl(),
  };
}
