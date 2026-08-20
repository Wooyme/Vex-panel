import {
  PolicyInput,
  PolicyType,
  RobotControlState,
  RobotPolicy,
} from '../types/robot';

export const POLICY_LIST_TOPIC = 'robot/policies';

export const POLICY_TYPES: readonly PolicyType[] = [
  'full_body',
  'lower_body',
  'upper_body',
];

export const POLICY_INPUTS: readonly PolicyInput[] = [
  'vx',
  'vy',
  'yaw',
  'pitch',
  'height',
];

const policyTypeSet = new Set<string>(POLICY_TYPES);
const policyInputSet = new Set<string>(POLICY_INPUTS);
const policyKeys = new Set(['name', 'type', 'inputs']);

export function parsePolicyList(payload: string | unknown): RobotPolicy[] {
  const value = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!Array.isArray(value)) {
    throw new Error('policy list must be a JSON array');
  }

  const names = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`policy at index ${index} must be an object`);
    }
    const candidate = item as Record<string, unknown>;
    if (Object.keys(candidate).some((key) => !policyKeys.has(key))) {
      throw new Error(`policy at index ${index} contains unsupported fields`);
    }
    if (
      typeof candidate.name !== 'string' ||
      !candidate.name ||
      candidate.name.trim() !== candidate.name
    ) {
      throw new Error(`policy at index ${index} has an invalid name`);
    }
    if (names.has(candidate.name)) {
      throw new Error(`duplicate policy name: ${candidate.name}`);
    }
    if (typeof candidate.type !== 'string' || !policyTypeSet.has(candidate.type)) {
      throw new Error(`policy ${candidate.name} has an invalid type`);
    }
    if (
      !Array.isArray(candidate.inputs) ||
      !candidate.inputs.every(
        (input) => typeof input === 'string' && policyInputSet.has(input),
      ) ||
      new Set(candidate.inputs).size !== candidate.inputs.length
    ) {
      throw new Error(`policy ${candidate.name} has invalid inputs`);
    }

    names.add(candidate.name);
    return {
      name: candidate.name,
      type: candidate.type as PolicyType,
      inputs: [...candidate.inputs] as PolicyInput[],
    };
  });
}

function policiesByName(policies: RobotPolicy[]): Map<string, RobotPolicy> {
  return new Map(policies.map((policy) => [policy.name, policy]));
}

export function reconcileActivePolicies(
  activeNames: string[],
  policies: RobotPolicy[],
): string[] {
  const byName = policiesByName(policies);
  const active = activeNames
    .filter((name, index) => activeNames.indexOf(name) === index)
    .map((name) => byName.get(name))
    .filter((policy): policy is RobotPolicy => policy !== undefined);

  const fullBody = active.find((policy) => policy.type === 'full_body');
  if (fullBody) return [fullBody.name];

  const lowerBody = active.find((policy) => policy.type === 'lower_body');
  const upperBody = active.find((policy) => policy.type === 'upper_body');
  return [lowerBody?.name, upperBody?.name].filter(
    (name): name is string => name !== undefined,
  );
}

export function toggleActivePolicy(
  activeNames: string[],
  targetName: string,
  policies: RobotPolicy[],
): string[] {
  const active = reconcileActivePolicies(activeNames, policies);
  if (active.includes(targetName)) {
    return active.filter((name) => name !== targetName);
  }

  const target = policies.find((policy) => policy.name === targetName);
  if (!target) return active;
  if (target.type === 'full_body') return [target.name];

  const byName = policiesByName(policies);
  const remaining = active.filter((name) => {
    const type = byName.get(name)?.type;
    return type !== 'full_body' && type !== target.type;
  });
  return reconcileActivePolicies([...remaining, target.name], policies);
}

export function reconcileVisiblePolicies(
  visibleNames: string[] | null,
  policies: RobotPolicy[],
): string[] {
  if (visibleNames === null) return policies.map((policy) => policy.name);
  const available = new Set(policies.map((policy) => policy.name));
  return visibleNames.filter((name) => available.has(name));
}

export function activePolicyInputs(
  activeNames: string[],
  policies: RobotPolicy[],
): Set<PolicyInput> {
  const byName = policiesByName(policies);
  return new Set(
    reconcileActivePolicies(activeNames, policies).flatMap(
      (name) => byName.get(name)?.inputs ?? [],
    ),
  );
}

export function effectiveControlState(
  control: RobotControlState,
  policies: RobotPolicy[],
): RobotControlState {
  const policy = reconcileActivePolicies(control.policy, policies);
  const inputs = activePolicyInputs(policy, policies);
  const motionEnabled = !control.estop;
  return {
    ...control,
    vx: motionEnabled && inputs.has('vx') ? control.vx : 0,
    vy: motionEnabled && inputs.has('vy') ? control.vy : 0,
    yaw: motionEnabled && inputs.has('yaw') ? control.yaw : 0,
    pitch: motionEnabled && inputs.has('pitch') ? control.pitch : 0,
    height: motionEnabled && inputs.has('height') ? control.height : 0,
    policy,
  };
}
