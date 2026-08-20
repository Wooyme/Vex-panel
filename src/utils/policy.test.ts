import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activePolicyInputs,
  effectiveControlState,
  parsePolicyList,
  reconcileActivePolicies,
  reconcileVisiblePolicies,
  toggleActivePolicy,
} from './policy';
import { RobotPolicy } from '../types/robot';

const policies: RobotPolicy[] = [
  { name: 'whole', type: 'full_body', inputs: ['vx', 'yaw'] },
  { name: 'walk', type: 'lower_body', inputs: ['vx', 'vy', 'height'] },
  { name: 'run', type: 'lower_body', inputs: ['vx'] },
  { name: 'arms', type: 'upper_body', inputs: ['pitch'] },
];

test('parses a strict direct policy array', () => {
  assert.deepEqual(parsePolicyList(JSON.stringify(policies)), policies);
  assert.deepEqual(parsePolicyList([]), []);
  assert.throws(() => parsePolicyList({ policies }), /JSON array/);
  assert.throws(
    () => parsePolicyList([{ name: 'walk', category: 'lower_body', inputs: ['vx'] }]),
    /unsupported fields/,
  );
  assert.throws(
    () => parsePolicyList([{ name: 'walk', type: 'lower_body', inputs: ['speed'] }]),
    /invalid inputs/,
  );
  assert.throws(() => parsePolicyList([policies[1], policies[1]]), /duplicate/);
});

test('enforces full-body and same-type exclusivity', () => {
  assert.deepEqual(toggleActivePolicy([], 'walk', policies), ['walk']);
  assert.deepEqual(toggleActivePolicy(['walk'], 'arms', policies), ['walk', 'arms']);
  assert.deepEqual(toggleActivePolicy(['walk', 'arms'], 'run', policies), ['run', 'arms']);
  assert.deepEqual(toggleActivePolicy(['run', 'arms'], 'whole', policies), ['whole']);
  assert.deepEqual(toggleActivePolicy(['whole'], 'arms', policies), ['arms']);
  assert.deepEqual(toggleActivePolicy(['arms'], 'arms', policies), []);
});

test('reconciles visible and active names after a list replacement', () => {
  assert.deepEqual(reconcileVisiblePolicies(null, policies), ['whole', 'walk', 'run', 'arms']);
  assert.deepEqual(reconcileVisiblePolicies(['walk', 'removed'], policies), ['walk']);
  assert.deepEqual(reconcileActivePolicies(['removed', 'walk', 'arms'], policies), ['walk', 'arms']);
  const visible = new Set(['walk']);
  assert.deepEqual(
    reconcileActivePolicies(['walk', 'arms'].filter((name) => visible.has(name)), policies),
    ['walk'],
  );
});

test('unions active inputs and zeros unsupported command values', () => {
  assert.deepEqual([...activePolicyInputs(['walk', 'arms'], policies)], ['vx', 'vy', 'height', 'pitch']);
  assert.deepEqual(
    effectiveControlState({
      vx: 1,
      vy: 0.5,
      yaw: 0.7,
      pitch: -0.2,
      height: 0.45,
      policy: ['walk', 'arms'],
      estop: false,
    }, policies),
    {
      vx: 1,
      vy: 0.5,
      yaw: 0,
      pitch: -0.2,
      height: 0.45,
      policy: ['walk', 'arms'],
      estop: false,
    },
  );
  assert.deepEqual(
    effectiveControlState({
      vx: 1,
      vy: 0.5,
      yaw: 0.7,
      pitch: -0.2,
      height: 0.45,
      policy: ['walk', 'arms'],
      estop: true,
    }, policies),
    {
      vx: 0,
      vy: 0,
      yaw: 0,
      pitch: 0,
      height: 0,
      policy: ['walk', 'arms'],
      estop: true,
    },
  );
});
