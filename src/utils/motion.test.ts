import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFallbackBasePose,
  applyRobotMotionFrame,
  parseRobotMotionMessage,
} from './motion';

test('parses the g1_mujoco_sim MQTT state payload', () => {
  const motion = parseRobotMotionMessage(JSON.stringify({
    timestamp: 1750000000.123,
    simulation_time: 1.25,
    joint_names: ['knee', 'hip'],
    joint_values: [0.2, -0.4],
    base_xyz: [1, 2, 3],
    base_quat_wxyz: [1, 0, 0, 0],
  }));

  assert.equal(motion.timestamp, 1750000000.123);
  assert.equal(motion.simulation_time, 1.25);
  assert.deepEqual(motion.base_xyz, [1, 2, 3]);
  assert.deepEqual(motion.base_quat_wxyz, [1, 0, 0, 0]);
  assert.deepEqual(motion.joint_names, ['knee', 'hip']);
  assert.deepEqual(motion.joint_values, [0.2, -0.4]);
});

test('rejects malformed tuples, mismatched joints, non-finite values, and zero quaternion', () => {
  const base = {
    timestamp: 123.5,
    simulation_time: 1.25,
    base_xyz: [0, 0, 0],
    base_quat_wxyz: [1, 0, 0, 0],
    joint_names: ['hip'],
    joint_values: [0],
  };

  assert.throws(() => parseRobotMotionMessage({ ...base, base_xyz: [0, 0] }), /base_xyz/);
  assert.throws(() => parseRobotMotionMessage({ ...base, joint_values: [] }), /same length/);
  assert.throws(() => parseRobotMotionMessage({ ...base, joint_values: [Number.NaN] }), /finite/);
  assert.throws(() => parseRobotMotionMessage({ ...base, base_quat_wxyz: [0, 0, 0, 0] }), /zero quaternion/);
  assert.throws(
    () => parseRobotMotionMessage({ ...base, joint_values: undefined, joint_angles: [0] }),
    /joint_values/,
  );
});

test('applies wxyz base pose and named partial joint updates', () => {
  const jointValues: Record<string, number> = {};
  const position = { value: [] as number[], set: (...values: number[]) => { position.value = values; } };
  const quaternion = {
    value: [] as number[],
    set(x: number, y: number, z: number, w: number) {
      this.value = [x, y, z, w];
      return this;
    },
    normalize() {
      const length = Math.hypot(...this.value);
      this.value = this.value.map((value) => value / length);
      return this;
    },
  };
  const robot = {
    position,
    quaternion,
    joints: {
      hip: { jointType: 'revolute', setJointValue: (value: number) => { jointValues.hip = value; } },
      knee: { jointType: 'revolute', setJointValue: (value: number) => { jointValues.knee = value; } },
      base_fixed: { jointType: 'fixed', setJointValue: (value: number) => { jointValues.base_fixed = value; } },
    },
  };

  const warnings = applyRobotMotionFrame(robot, {
    timestamp: 123.5,
    simulation_time: 1.25,
    joint_names: ['knee', 'missing', 'base_fixed'],
    joint_values: [-0.5, 1.2, 2.4],
    base_xyz: [3, 2, 1],
    base_quat_wxyz: [2, 0, 0, 0],
  });

  assert.deepEqual(position.value, [3, 2, 1]);
  assert.deepEqual(quaternion.value, [0, 0, 0, 1]);
  assert.deepEqual(jointValues, { knee: -0.5 });
  assert.deepEqual(warnings, ['Unknown joint: missing', 'Fixed joint ignored: base_fixed']);
});

test('uses fallback xyz only when every primary coordinate is zero', () => {
  const primary = parseRobotMotionMessage({
    timestamp: 1,
    simulation_time: 2,
    joint_names: ['hip'],
    joint_values: [0.5],
    base_xyz: [0, 0, 0],
    base_quat_wxyz: [1, 0, 0, 0],
  });
  const fallback = {
    ...primary,
    base_xyz: [3, 4, 5] as [number, number, number],
    base_quat_wxyz: [0, 1, 0, 0] as [number, number, number, number],
  };

  assert.deepEqual(applyFallbackBasePose(primary, fallback, false), {
    ...primary,
    base_xyz: [3, 4, 5],
  });
  assert.equal(applyFallbackBasePose(primary, null, false), primary);

  const primaryWithPosition = { ...primary, base_xyz: [0, 0, 0.01] as [number, number, number] };
  assert.equal(
    applyFallbackBasePose(primaryWithPosition, fallback, false),
    primaryWithPosition,
  );
});

test('force override replaces fallback xyz and quaternion regardless of primary xyz', () => {
  const primary = parseRobotMotionMessage({
    timestamp: 1,
    simulation_time: 2,
    joint_names: ['hip'],
    joint_values: [0.5],
    base_xyz: [1, 2, 3],
    base_quat_wxyz: [1, 0, 0, 0],
  });
  const fallback = parseRobotMotionMessage({
    timestamp: 10,
    simulation_time: 20,
    joint_names: ['ignored'],
    joint_values: [9],
    base_xyz: [4, 5, 6],
    base_quat_wxyz: [0, 0, 0, 1],
  });

  assert.deepEqual(applyFallbackBasePose(primary, fallback, true), {
    ...primary,
    base_xyz: [4, 5, 6],
    base_quat_wxyz: [0, 0, 0, 1],
  });
});
