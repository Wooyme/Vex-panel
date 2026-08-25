import {
  PolicyInput,
  PolicyInputParameter,
  PolicyInputValues,
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

const policyTypeSet = new Set<string>(POLICY_TYPES);
const policyKeys = new Set(['name', 'type', 'inputs']);
const parameterKeys = new Set(['name', 'min', 'max', 'default']);
const componentKeys: Record<PolicyInput['type'], Set<string>> = {
  joystick: new Set(['type', 'x', 'y']),
  slider: new Set(['type', 'parameter']),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(candidate: Record<string, unknown>, keys: Set<string>): boolean {
  const candidateKeys = Object.keys(candidate);
  return candidateKeys.length === keys.size && candidateKeys.every((key) => keys.has(key));
}

function parseInputParameter(value: unknown, path: string): PolicyInputParameter {
  if (!isRecord(value) || !hasExactKeys(value, parameterKeys)) {
    throw new Error(`${path} must contain exactly name, min, max, and default`);
  }
  if (
    typeof value.name !== 'string' ||
    !value.name ||
    value.name.trim() !== value.name
  ) {
    throw new Error(`${path} has an invalid name`);
  }
  if (
    typeof value.min !== 'number' ||
    typeof value.max !== 'number' ||
    typeof value.default !== 'number' ||
    !Number.isFinite(value.min) ||
    !Number.isFinite(value.max) ||
    !Number.isFinite(value.default)
  ) {
    throw new Error(`${path} bounds and default must be finite numbers`);
  }
  if (value.min >= value.max) {
    throw new Error(`${path} min must be less than max`);
  }
  if (value.default < value.min || value.default > value.max) {
    throw new Error(`${path} default must be inside [min, max]`);
  }
  return {
    name: value.name,
    min: value.min,
    max: value.max,
    default: value.default,
  };
}

function parsePolicyInput(value: unknown, path: string): PolicyInput {
  if (!isRecord(value) || (value.type !== 'joystick' && value.type !== 'slider')) {
    throw new Error(`${path} has an unsupported component type`);
  }
  if (!hasExactKeys(value, componentKeys[value.type])) {
    throw new Error(`${path} contains unsupported or missing fields`);
  }
  if (value.type === 'joystick') {
    const x = parseInputParameter(value.x, `${path}.x`);
    const y = parseInputParameter(value.y, `${path}.y`);
    if (x.name === y.name) {
      throw new Error(`${path} joystick axes must control different parameters`);
    }
    return { type: 'joystick', x, y };
  }
  return {
    type: 'slider',
    parameter: parseInputParameter(value.parameter, `${path}.parameter`),
  };
}

export function policyInputParameters(
  policyOrInputs: RobotPolicy | PolicyInput[],
): PolicyInputParameter[] {
  const inputs = Array.isArray(policyOrInputs) ? policyOrInputs : policyOrInputs.inputs;
  return inputs.flatMap((input) =>
    input.type === 'joystick' ? [input.x, input.y] : [input.parameter],
  );
}

export function policyInputNames(policy: RobotPolicy): string[] {
  return policyInputParameters(policy).map((parameter) => parameter.name);
}

export function parameterValueToAxis(
  value: number,
  parameter: PolicyInputParameter,
): number {
  const axis = ((value - parameter.min) / (parameter.max - parameter.min)) * 2 - 1;
  const boundedAxis = Math.max(-1, Math.min(1, axis));
  return Math.abs(boundedAxis) < 1e-12 ? 0 : boundedAxis;
}

export function axisToParameterValue(
  axis: number,
  parameter: PolicyInputParameter,
): number {
  const boundedAxis = Math.max(-1, Math.min(1, axis));
  const value = parameter.min + ((boundedAxis + 1) / 2) * (parameter.max - parameter.min);
  return Math.max(parameter.min, Math.min(parameter.max, Number(value.toPrecision(12))));
}

export function parsePolicyList(payload: string | unknown): RobotPolicy[] {
  const value = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!Array.isArray(value)) {
    throw new Error('policy list must be a JSON array');
  }

  const names = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`policy at index ${index} must be an object`);
    }
    if (!hasExactKeys(item, policyKeys)) {
      throw new Error(`policy at index ${index} contains unsupported or missing fields`);
    }
    if (
      typeof item.name !== 'string' ||
      !item.name ||
      item.name.trim() !== item.name
    ) {
      throw new Error(`policy at index ${index} has an invalid name`);
    }
    if (names.has(item.name)) {
      throw new Error(`duplicate policy name: ${item.name}`);
    }
    if (typeof item.type !== 'string' || !policyTypeSet.has(item.type)) {
      throw new Error(`policy ${item.name} has an invalid type`);
    }
    if (!Array.isArray(item.inputs)) {
      throw new Error(`policy ${item.name} inputs must be an array`);
    }

    const inputs = item.inputs.map((input, inputIndex) =>
      parsePolicyInput(input, `policy ${item.name}.inputs[${inputIndex}]`),
    );
    const parameterNames = policyInputParameters(inputs).map((parameter) => parameter.name);
    if (new Set(parameterNames).size !== parameterNames.length) {
      throw new Error(`policy ${item.name} input parameter names must not contain duplicates`);
    }

    names.add(item.name);
    return {
      name: item.name,
      type: item.type as PolicyType,
      inputs,
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

export function defaultPolicyInputs(policy: RobotPolicy): Record<string, number> {
  return Object.fromEntries(
    policyInputParameters(policy).map((parameter) => [parameter.name, parameter.default]),
  );
}

function inputsMatchPolicy(
  values: Record<string, number> | undefined,
  policy: RobotPolicy,
): values is Record<string, number> {
  if (!values) return false;
  const parameters = policyInputParameters(policy);
  const keys = Object.keys(values);
  if (keys.length !== parameters.length) return false;
  return parameters.every((parameter) => {
    const value = values[parameter.name];
    return Number.isFinite(value) && value >= parameter.min && value <= parameter.max;
  });
}

export function controlStateForPolicies(
  control: RobotControlState,
  activeNames: string[],
  policies: RobotPolicy[],
): RobotControlState {
  const policy = reconcileActivePolicies(activeNames, policies);
  const byName = policiesByName(policies);
  const previouslyActive = new Set(control.policy);
  const inputs: PolicyInputValues = {};

  policy.forEach((name) => {
    const spec = byName.get(name);
    if (!spec) return;
    inputs[name] = previouslyActive.has(name) && inputsMatchPolicy(control.inputs[name], spec)
      ? { ...control.inputs[name] }
      : defaultPolicyInputs(spec);
  });

  return { ...control, policy, inputs };
}

export function resetActivePolicyInputs(
  control: RobotControlState,
  policies: RobotPolicy[],
): RobotControlState {
  const byName = policiesByName(policies);
  const policy = reconcileActivePolicies(control.policy, policies);
  return {
    ...control,
    policy,
    inputs: Object.fromEntries(
      policy.flatMap((name) => {
        const spec = byName.get(name);
        return spec ? [[name, defaultPolicyInputs(spec)]] : [];
      }),
    ),
  };
}

function sameInputSchema(left: RobotPolicy | undefined, right: RobotPolicy): boolean {
  return Boolean(left) && JSON.stringify(left?.inputs) === JSON.stringify(right.inputs);
}

export function reconcileControlState(
  control: RobotControlState,
  previousPolicies: RobotPolicy[],
  policies: RobotPolicy[],
): RobotControlState {
  const active = reconcileActivePolicies(control.policy, policies);
  const previousByName = policiesByName(previousPolicies);
  const nextByName = policiesByName(policies);
  const inputs: PolicyInputValues = {};

  active.forEach((name) => {
    const spec = nextByName.get(name);
    if (!spec) return;
    inputs[name] = sameInputSchema(previousByName.get(name), spec) && inputsMatchPolicy(control.inputs[name], spec)
      ? { ...control.inputs[name] }
      : defaultPolicyInputs(spec);
  });
  return { ...control, policy: active, inputs };
}

export function effectiveControlState(
  control: RobotControlState,
  policies: RobotPolicy[],
): RobotControlState {
  return controlStateForPolicies(control, control.policy, policies);
}
