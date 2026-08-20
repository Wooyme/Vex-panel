import { RobotMotionMessage } from '../types/robot';

interface MotionVectorTarget {
  set: (x: number, y: number, z: number) => unknown;
}

interface MotionQuaternionTarget {
  set: (x: number, y: number, z: number, w: number) => MotionQuaternionTarget;
  normalize: () => unknown;
}

interface MotionJointTarget {
  jointType: string;
  setJointValue: (value: number) => unknown;
}

export interface MotionRobotTarget {
  position: MotionVectorTarget;
  quaternion: MotionQuaternionTarget;
  joints: Record<string, MotionJointTarget>;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function readNumberTuple<const T extends number>(
  value: unknown,
  length: T,
  fieldName: string,
): number[] & { length: T } {
  if (!Array.isArray(value) || value.length !== length || !value.every(isFiniteNumber)) {
    throw new Error(`${fieldName} must contain exactly ${length} finite numbers`);
  }
  return value as number[] & { length: T };
}

export function parseRobotMotionMessage(payload: string | unknown): RobotMotionMessage {
  const value = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('motion payload must be a JSON object');
  }

  const candidate = value as Record<string, unknown>;
  const baseXyz = readNumberTuple(candidate.base_xyz, 3, 'base_xyz');
  const baseQuatWxyz = readNumberTuple(candidate.base_quat_wxyz, 4, 'base_quat_wxyz');
  const jointValues = candidate.joint_values;

  if (!isFiniteNumber(candidate.timestamp)) {
    throw new Error('timestamp must be a finite number');
  }
  if (!isFiniteNumber(candidate.simulation_time)) {
    throw new Error('simulation_time must be a finite number');
  }

  if (!Array.isArray(candidate.joint_names) || !candidate.joint_names.every((name) => typeof name === 'string')) {
    throw new Error('joint_names must be an array of strings');
  }
  if (!Array.isArray(jointValues) || !jointValues.every(isFiniteNumber)) {
    throw new Error('joint_values must be an array of finite numbers');
  }
  if (candidate.joint_names.length !== jointValues.length) {
    throw new Error('joint_names and joint_values must have the same length');
  }

  const quaternionNorm = Math.hypot(
    baseQuatWxyz[0],
    baseQuatWxyz[1],
    baseQuatWxyz[2],
    baseQuatWxyz[3],
  );
  if (quaternionNorm === 0) {
    throw new Error('base_quat_wxyz must not be a zero quaternion');
  }

  return {
    timestamp: candidate.timestamp,
    simulation_time: candidate.simulation_time,
    joint_names: [...candidate.joint_names],
    joint_values: [...jointValues],
    base_xyz: [baseXyz[0], baseXyz[1], baseXyz[2]],
    base_quat_wxyz: [
      baseQuatWxyz[0],
      baseQuatWxyz[1],
      baseQuatWxyz[2],
      baseQuatWxyz[3],
    ],
  };
}

export function applyFallbackBasePose(
  motion: RobotMotionMessage,
  fallbackMotion: RobotMotionMessage | null,
  forceOverride: boolean,
): RobotMotionMessage {
  if (
    fallbackMotion === null ||
    (!forceOverride && !motion.base_xyz.every((coordinate) => coordinate === 0))
  ) {
    return motion;
  }
  return {
    ...motion,
    base_xyz: [...fallbackMotion.base_xyz],
    base_quat_wxyz: forceOverride
      ? [...fallbackMotion.base_quat_wxyz]
      : motion.base_quat_wxyz,
  };
}

export function applyRobotMotionFrame(
  robot: MotionRobotTarget,
  motion: RobotMotionMessage,
): string[] {
  robot.position.set(motion.base_xyz[0], motion.base_xyz[1], motion.base_xyz[2]);
  robot.quaternion
    .set(
      motion.base_quat_wxyz[1],
      motion.base_quat_wxyz[2],
      motion.base_quat_wxyz[3],
      motion.base_quat_wxyz[0],
    )
    .normalize();

  const warnings: string[] = [];
  motion.joint_names.forEach((jointName, index) => {
    const joint = robot.joints[jointName];
    if (!joint) {
      warnings.push(`Unknown joint: ${jointName}`);
      return;
    }
    if (joint.jointType === 'fixed') {
      warnings.push(`Fixed joint ignored: ${jointName}`);
      return;
    }
    joint.setJointValue(motion.joint_values[index]);
  });
  return warnings;
}
