import { useEffect, useRef, useState, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import {
  RobotControlState,
  MqttPacketLog,
  RobotTelemetry,
  RobotPolicy,
  MqttTopicHandler,
} from '../types/robot';
import { TopicSubscriptionRegistry } from '../utils/topicSubscriptionRegistry';
import {
  effectiveControlState,
  parsePolicyList,
  POLICY_LIST_TOPIC,
} from '../utils/policy';

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
  const [policies, setPolicies] = useState<RobotPolicy[]>([]);
  const [hasReceivedPolicyList, setHasReceivedPolicyList] = useState(false);

  const clientRef = useRef<MqttClient | null>(null);
  const seqRef = useRef<number>(0);
  const txCountSinceLastSec = useRef<number>(0);
  const packetsReceivedRef = useRef<number>(0);
  const topicRegistryRef = useRef(new TopicSubscriptionRegistry());
  const pendingUnsubscribeRef = useRef(new Map<string, number>());
  const lastDynamicLogAtRef = useRef(new Map<string, number>());
  const controlStateRef = useRef<RobotControlState>(controlState);
  const policiesRef = useRef<RobotPolicy[]>(policies);
  controlStateRef.current = controlState;
  policiesRef.current = policies;

  const onTelemetryRef = useRef(onTelemetryReceived);
  onTelemetryRef.current = onTelemetryReceived;

  const resolvedUrl = useCallback(
    () => brokerUrl?.trim() || import.meta.env.VITE_MQTT_BROKER_URL?.trim() || 'ws://localhost:9001',
    [brokerUrl],
  );

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
        // Subscribe to robot feedback and the authoritative policy list.
        client?.subscribe('robot/telemetry', (err) => {
          if (err) console.warn('[MQTT] Subscribe error telemetry:', err);
        });
        client?.subscribe(POLICY_LIST_TOPIC, (err) => {
          if (err) console.warn('[MQTT] Subscribe error policies:', err);
        });
        client?.subscribe('robot/status');
        topicRegistryRef.current.topics().forEach((topic) => {
          client?.subscribe(topic, { qos: 0 });
        });
      });

      client.on('message', (topic, message) => {
        packetsReceivedRef.current += 1;
        const raw = message.toString();
        const isDynamicTopic = topicRegistryRef.current.has(topic);
        topicRegistryRef.current.dispatch(topic, raw);

        const now = Date.now();
        const lastDynamicLogAt = lastDynamicLogAtRef.current.get(topic) ?? 0;
        if (!isDynamicTopic || now - lastDynamicLogAt >= 500) {
          if (isDynamicTopic) lastDynamicLogAtRef.current.set(topic, now);
          setLogs((prev) => [
            {
              id: `${now}_${Math.random().toString(36).substring(2, 6)}`,
              topic,
              direction: 'RX',
              timestamp: now,
              payload: raw,
            },
            ...prev.slice(0, 49),
          ]);
        }

        if (topic === POLICY_LIST_TOPIC) {
          try {
            const nextPolicies = parsePolicyList(raw);
            policiesRef.current = nextPolicies;
            setPolicies(nextPolicies);
            setHasReceivedPolicyList(true);
          } catch (error) {
            console.warn(
              '[MQTT] Invalid policy list:',
              error instanceof Error ? error.message : String(error),
            );
          }
        } else if (topic === 'robot/telemetry' && onTelemetryRef.current) {
          try {
            onTelemetryRef.current(JSON.parse(raw));
          } catch {
            console.warn('[MQTT] Invalid telemetry JSON');
          }
        }
      });

      client.on('error', (err) => {
        console.warn('[MQTT] Connection status note:', err?.message);
        setErrorMessage(err?.message || 'Unable to connect to MQTT broker');
        setStatus('error');
      });

      client.on('offline', () => {
        setStatus('disconnected');
      });
    } catch (err: any) {
      console.warn('[MQTT] Connection failed:', err?.message);
      setErrorMessage(err?.message || 'Unable to connect to MQTT broker');
      setStatus('error');
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
      const current = effectiveControlState(
        controlStateRef.current,
        policiesRef.current,
      );
      const packet = {
        seq: seqRef.current,
        timestamp: Date.now(),
        control: {
          policy: current.policy,
          inputs: current.inputs,
          estop: current.estop,
        },
      };

      const payloadStr = JSON.stringify(packet);

      if (clientRef.current && clientRef.current.connected) {
        clientRef.current.publish('robot/commands', payloadStr, { qos: 0 });
      }

      txCountSinceLastSec.current += 1;
      setPacketsSent((prev) => prev + 1);

      // Record in logs every few packets to avoid excessive React state churn
      if (seqRef.current % Math.max(1, Math.round(publishFrequencyHz / 2)) === 0) {
        setLogs((prev) => [
          {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            topic: 'robot/commands',
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
      setPacketsReceived(packetsReceivedRef.current);
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

  const subscribeTopic = useCallback((topic: string, handler: MqttTopicHandler) => {
    const normalizedTopic = topic.trim();
    if (!normalizedTopic) throw new Error('MQTT topic must not be empty');

    const pendingUnsubscribe = pendingUnsubscribeRef.current.get(normalizedTopic);
    if (pendingUnsubscribe !== undefined) {
      window.clearTimeout(pendingUnsubscribe);
      pendingUnsubscribeRef.current.delete(normalizedTopic);
    }
    const firstHandler = topicRegistryRef.current.add(normalizedTopic, handler);
    if (firstHandler && pendingUnsubscribe === undefined && clientRef.current?.connected) {
      clientRef.current.subscribe(normalizedTopic, { qos: 0 });
    }

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const lastHandler = topicRegistryRef.current.remove(normalizedTopic, handler);
      if (!lastHandler) return;

      const timer = window.setTimeout(() => {
        pendingUnsubscribeRef.current.delete(normalizedTopic);
        if (!topicRegistryRef.current.has(normalizedTopic) && clientRef.current?.connected) {
          clientRef.current.unsubscribe(normalizedTopic);
        }
      }, 0);
      pendingUnsubscribeRef.current.set(normalizedTopic, timer);
    };
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
    policies,
    hasReceivedPolicyList,
    policyListTopic: POLICY_LIST_TOPIC,
    subscribeTopic,
    sendCustomPacket,
    clearLogs,
    brokerUrl: resolvedUrl(),
  };
}
