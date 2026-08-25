import test from 'node:test';
import assert from 'node:assert/strict';
import {
  axisToParameterValue,
  controlStateForPolicies,
  defaultPolicyInputs,
  effectiveControlState,
  parsePolicyList,
  parameterValueToAxis,
  policyInputNames,
  reconcileActivePolicies,
  reconcileControlState,
  reconcileVisiblePolicies,
  resetActivePolicyInputs,
  toggleActivePolicy,
} from './policy';
import { RobotControlState, RobotPolicy } from '../types/robot';

const parameter = (name: string, defaultValue = 0, min = -1, max = 1) => ({
  name,
  min,
  max,
  default: defaultValue,
});

const policies: RobotPolicy[] = [
  {
    name: 'whole',
    type: 'full_body',
    inputs: [{ type: 'joystick', x: parameter('vx'), y: parameter('yaw') }],
  },
  {
    name: 'walk',
    type: 'lower_body',
    inputs: [
      { type: 'joystick', x: parameter('vx'), y: parameter('vy') },
      { type: 'slider', parameter: parameter('height', 0.45, 0.2, 0.75) },
    ],
  },
  {
    name: 'run',
    type: 'lower_body',
    inputs: [{ type: 'slider', parameter: parameter('speed', 0.25, 0, 2) }],
  },
  {
    name: 'arms',
    type: 'upper_body',
    inputs: [{ type: 'slider', parameter: parameter('pitch', 0.1) }],
  },
];

test('parses and preserves strict enhanced input components', () => {
  assert.deepEqual(parsePolicyList(JSON.stringify(policies)), policies);
  assert.deepEqual(parsePolicyList([]), []);
  assert.deepEqual(policyInputNames(policies[1]), ['vx', 'vy', 'height']);
  assert.throws(() => parsePolicyList({ policies }), /JSON array/);
  assert.throws(
    () => parsePolicyList([{ name: 'walk', category: 'lower_body', inputs: [] }]),
    /unsupported or missing fields/,
  );
  assert.throws(
    () => parsePolicyList([{ name: 'walk', type: 'lower_body', inputs: ['vx'] }]),
    /unsupported component type/,
  );
  assert.throws(() => parsePolicyList([policies[1], policies[1]]), /duplicate policy/);
});

test('rejects malformed component metadata like the backend schema', () => {
  const policy = (inputs: unknown[]) => [{ name: 'invalid', type: 'full_body', inputs }];
  assert.throws(
    () => parsePolicyList(policy([{ type: 'dial', parameter: parameter('speed') }])),
    /unsupported component type/,
  );
  assert.throws(
    () => parsePolicyList(policy([{ type: 'slider', parameter: { ...parameter('speed'), extra: 1 } }])),
    /exactly name, min, max, and default/,
  );
  assert.throws(
    () => parsePolicyList(policy([{ type: 'slider', parameter: parameter('speed', 0, 1, 1) }])),
    /min must be less/,
  );
  assert.throws(
    () => parsePolicyList(policy([{ type: 'slider', parameter: parameter('speed', 2) }])),
    /default must be inside/,
  );
  assert.throws(
    () => parsePolicyList(policy([{
      type: 'joystick',
      x: parameter('speed'),
      y: parameter('speed'),
    }])),
    /different parameters/,
  );
  assert.throws(
    () => parsePolicyList(policy([
      { type: 'slider', parameter: parameter('speed') },
      { type: 'slider', parameter: parameter('speed') },
    ])),
    /must not contain duplicates/,
  );
  assert.throws(
    () => parsePolicyList(policy([{
      type: 'slider',
      parameter: { name: 'speed', min: 0, max: 1, default: Number.NaN },
    }])),
    /finite numbers/,
  );
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
});

test('newly activated policies start at defaults while unchanged paired policies retain values', () => {
  const control: RobotControlState = {
    policy: ['walk', 'arms'],
    inputs: {
      walk: { vx: 0.8, vy: -0.2, height: 0.6 },
      arms: { pitch: -0.4 },
    },
    estop: false,
  };
  const switched = controlStateForPolicies(control, ['run', 'arms'], policies);
  assert.deepEqual(switched.policy, ['run', 'arms']);
  assert.deepEqual(switched.inputs, {
    run: { speed: 0.25 },
    arms: { pitch: -0.4 },
  });

  const disabled = controlStateForPolicies(switched, ['run'], policies);
  const reenabled = controlStateForPolicies(disabled, ['run', 'arms'], policies);
  assert.deepEqual(reenabled.inputs.arms, { pitch: 0.1 });
});

test('schema changes and emergency reset restore complete valid defaults', () => {
  const control: RobotControlState = {
    policy: ['walk'],
    inputs: { walk: { vx: 0.8, vy: -0.2, height: 0.6 } },
    estop: false,
  };
  const changed = policies.map((policy) => policy.name === 'walk'
    ? {
        ...policy,
        inputs: [{ type: 'slider' as const, parameter: parameter('amplitude', 0.125, 0.05, 0.2) }],
      }
    : policy);
  assert.deepEqual(reconcileControlState(control, policies, changed).inputs, {
    walk: { amplitude: 0.125 },
  });
  assert.deepEqual(resetActivePolicyInputs(control, policies).inputs, {
    walk: { vx: 0, vy: 0, height: 0.45 },
  });
});

test('maps joystick axes across each declared parameter range', () => {
  const amplitude = parameter('amplitude', 0.125, 0.05, 0.2);
  assert.equal(axisToParameterValue(-1, amplitude), 0.05);
  assert.equal(axisToParameterValue(1, amplitude), 0.2);
  assert.equal(axisToParameterValue(0, amplitude), 0.125);
  assert.equal(parameterValueToAxis(0.125, amplitude), 0);
  assert.equal(parameterValueToAxis(2, amplitude), 1);
});

test('effective state emits only selected policy groups with every declared parameter', () => {
  const invalid: RobotControlState = {
    policy: ['walk'],
    inputs: {
      walk: { vx: 2, extra: 1 },
      arms: { pitch: -0.5 },
    },
    estop: true,
  };
  assert.deepEqual(effectiveControlState(invalid, policies), {
    policy: ['walk'],
    inputs: { walk: defaultPolicyInputs(policies[1]) },
    estop: true,
  });
});
