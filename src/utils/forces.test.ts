import test from 'node:test';
import assert from 'node:assert/strict';
import { ForceBatch, ForceCommand, ForceDirection, normalizeForceDirection, validateForceBatch, validateForceTopic } from './forces';
import { FORCE_MQTT_OPTIONS, publishForceCommand } from './forcePublisher';
import type { MqttClient } from 'mqtt';

const force = (changes: Partial<ForceCommand> = {}): ForceCommand => ({
  body_name: 'torso_link', direction: [3, 4, 0], magnitude: 50, duration: 0.5, ...changes,
});
const batch = (...forces: ForceCommand[]): ForceBatch => ({ forces });

test('serializes a whole batch without normalizing the wire direction or leaking editor fields', () => {
  const input = batch({ ...force(), id: 3 } as ForceCommand, force({ body_name: 'pelvis', magnitude: 0 }));
  const output = validateForceBatch(input);
  assert.deepEqual(output, batch(force(), force({ body_name: 'pelvis', magnitude: 0 })));
  output.forces[0].direction[0] = 99;
  assert.equal(input.forces[0].direction[0], 3);
});

test('normalizes all six axis directions and extreme finite vectors without overflow or underflow', () => {
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [-1, 1]) {
      const direction: ForceDirection = [0, 0, 0];
      direction[axis] = sign;
      assert.deepEqual(normalizeForceDirection(direction), direction);
    }
  }
  assert.deepEqual(normalizeForceDirection([3, 4, 0]), [0.6, 0.8, 0]);
  for (const size of [Number.MAX_VALUE, Number.MIN_VALUE]) {
    const normalized = normalizeForceDirection([size, -size, 0]);
    assert.ok(Math.abs(normalized[0] - Math.SQRT1_2) < 1e-15);
    assert.ok(Math.abs(normalized[1] + Math.SQRT1_2) < 1e-15);
  }
});

test('rejects the entire batch when any entry has invalid parameters', () => {
  const invalid: Partial<ForceCommand>[] = [
    { body_name: '' }, { body_name: 'world' }, { body_name: 'pelvis\0x' },
    { direction: [0, 0, 0] }, { direction: [NaN, 0, 1] },
    { direction: [Infinity, 0, 1] }, { direction: [1, 2] as unknown as ForceDirection },
    { magnitude: -1 }, { magnitude: NaN }, { magnitude: Infinity },
    { duration: 0 }, { duration: -1 }, { duration: Infinity }, { duration: NaN },
  ];
  for (const changes of invalid) assert.throws(() => validateForceBatch(batch(force(), force(changes))), /第 2 条力/);
  assert.throws(() => validateForceBatch(batch()), /至少/);
  for (const topic of ['', '  ', 'robot/+', 'robot/#', 'robot/\0', 'x'.repeat(65536)]) {
    assert.throws(() => validateForceTopic(topic));
  }
  assert.equal(validateForceTopic(' robot/force '), 'robot/force');
});

test('publishes one non-retained QoS 0 packet with the exact batch', async () => {
  const calls: unknown[][] = [];
  const client = {
    connected: true,
    publish(topic, payload, options, callback) {
      calls.push([topic, payload, options]);
      callback(null);
    },
  } as unknown as MqttClient;
  const input = batch(force(), force({ body_name: 'pelvis' }));
  const result = await publishForceCommand(client, 'robot/test/force', input);
  assert.deepEqual(calls, [['robot/test/force', JSON.stringify(input), { qos: 0, retain: false }]]);
  assert.deepEqual(JSON.parse(result.payload), input);
});

test('offline or invalid commands never publish; errors propagate and reconnect does not retry', async () => {
  let calls = 0;
  const client = {
    connected: false,
    publish(_topic, _payload, _options, callback) {
      calls++;
      callback(new Error('connection lost'));
    },
  } as unknown as MqttClient;
  assert.equal(FORCE_MQTT_OPTIONS.queueQoSZero, false);
  await assert.rejects(publishForceCommand(null, 'force', batch(force())), /未连接/);
  await assert.rejects(publishForceCommand(client, 'force', batch(force())), /未连接/);
  client.connected = true;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 0);
  await assert.rejects(publishForceCommand(client, 'force', batch(force(), force({ duration: 0 }))));
  assert.equal(calls, 0);
  await assert.rejects(publishForceCommand(client, 'force', batch(force())), /connection lost/);
  assert.equal(calls, 1);
});
