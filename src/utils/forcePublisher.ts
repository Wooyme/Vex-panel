import type { MqttClient } from 'mqtt';
import { ForceBatch, validateForceBatch, validateForceTopic } from './forces';

// Shared client policy: never replay stale QoS 0 controls after reconnecting.
export const FORCE_MQTT_OPTIONS = { queueQoSZero: false } as const;

export async function publishForceCommand(
  client: Pick<MqttClient, 'connected' | 'publish'> | null,
  topic: string,
  batch: ForceBatch,
): Promise<{ topic: string; payload: string }> {
  const destination = validateForceTopic(topic);
  const payload = JSON.stringify(validateForceBatch(batch));
  if (!client?.connected) throw new Error('MQTT 未连接，指令未发送');
  await new Promise<void>((resolve, reject) => {
    client.publish(destination, payload, { qos: 0, retain: false }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  return { topic: destination, payload };
}
