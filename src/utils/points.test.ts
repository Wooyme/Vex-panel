import test from 'node:test';
import assert from 'node:assert/strict';
import { PointBatch, PointCommand, PointVelocity, validatePointBatch } from './points';
import { publishPointCommand } from './forcePublisher';
import type { MqttClient } from 'mqtt';

const point = (changes: Partial<PointCommand> = {}): PointCommand => ({
  body_name: 'pelvis', height: 0.8, velocity: [0.3, 0], duration: 2, ...changes,
});
const batch = (...points: PointCommand[]): PointBatch => ({ points });

test('serializes a point batch without leaking editor fields or sharing arrays', () => {
  const input = batch({ ...point(), id: 3 } as PointCommand, point({ body_name: ' torso_link ', height: -0.1 }));
  const output = validatePointBatch(input);
  assert.deepEqual(output, batch(point(), point({ body_name: 'torso_link', height: -0.1 })));
  output.points[0].velocity[0] = 99;
  assert.equal(input.points[0].velocity[0], 0.3);
});

test('rejects the entire point batch when any entry has invalid parameters', () => {
  const invalid: Partial<PointCommand>[] = [
    { body_name: '' }, { body_name: 'world' }, { body_name: 'pelvis\0x' },
    { height: NaN }, { height: Infinity },
    { velocity: [NaN, 0] }, { velocity: [0, Infinity] }, { velocity: [1, 2, 3] as unknown as PointVelocity },
    { duration: 0 }, { duration: -1 }, { duration: Infinity }, { duration: NaN },
  ];
  for (const changes of invalid) assert.throws(() => validatePointBatch(batch(point(), point(changes))), /第 2 个控制点/);
  assert.throws(() => validatePointBatch(batch()), /至少/);
});

test('publishes points as one non-retained QoS 0 packet', async () => {
  const calls: unknown[][] = [];
  const client = {
    connected: true,
    publish(topic, payload, options, callback) {
      calls.push([topic, payload, options]);
      callback(null);
    },
  } as unknown as MqttClient;
  const input = batch(point());
  const result = await publishPointCommand(client, 'robot/test/force', input);
  assert.deepEqual(calls, [['robot/test/force', JSON.stringify(input), { qos: 0, retain: false }]]);
  assert.deepEqual(JSON.parse(result.payload), input);
  await assert.rejects(publishPointCommand(null, 'robot/test/force', input), /未连接/);
});
