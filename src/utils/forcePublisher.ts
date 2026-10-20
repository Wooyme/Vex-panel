import type { MqttClient } from 'mqtt';
import { ForceBatch, validateForceBatch, validateForceTopic } from './forces';
import { PointBatch, validatePointBatch } from './points';

// Shared client policy: never replay stale QoS 0 controls after reconnecting.
export const FORCE_MQTT_OPTIONS = { queueQoSZero: false } as const;

type PublishClient = Pick<MqttClient, 'connected' | 'publish'> | null;

export function publishForceCommand(client: PublishClient, topic: string, batch: ForceBatch) {
  return publishValidated(client, topic, () => validateForceBatch(batch));
}

// Point commands share the force topic; the simulator decodes both arrays.
export function publishPointCommand(client: PublishClient, topic: string, batch: PointBatch) {
  return publishValidated(client, topic, () => validatePointBatch(batch));
}

async function publishValidated(
  client: PublishClient,
  topic: string,
  validate: () => ForceBatch | PointBatch,
): Promise<{ topic: string; payload: string }> {
  const destination = validateForceTopic(topic);
  const payload = JSON.stringify(validate());
  if (!client?.connected) throw new Error('MQTT 未连接，指令未发送');
  await new Promise<void>((resolve, reject) => {
    client.publish(destination, payload, { qos: 0, retain: false }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  return { topic: destination, payload };
}
