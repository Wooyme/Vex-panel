export type PolicyType = 'full_body' | 'lower_body' | 'upper_body';

export interface PolicyInputParameter {
  name: string;
  min: number;
  max: number;
  default: number;
}

export interface JoystickPolicyInput {
  type: 'joystick';
  x: PolicyInputParameter;
  y: PolicyInputParameter;
}

export interface SliderPolicyInput {
  type: 'slider';
  parameter: PolicyInputParameter;
}

export type PolicyInput = JoystickPolicyInput | SliderPolicyInput;
export type PolicyInputValues = Record<string, Record<string, number>>;

export interface RobotPolicy {
  name: string;
  type: PolicyType;
  inputs: PolicyInput[];
}

export interface RobotControlState {
  policy: string[];
  inputs: PolicyInputValues;
  estop: boolean;
}

export interface RobotTelemetry {
  posX: number;
  posY: number;
  posZ: number;
  roll: number;
  pitch: number;
  yaw: number;
  linearVelocity: number;
  angularVelocity: number;
  batteryPercent: number;
  batteryVoltage: number;
  motorTemps: number[]; // 4 legs, 3 joints each = 12 motors or 4 limb temps
  jointAngles: number[]; // 12 DOF
  groundClearance: number;
  fps: number;
  simTime: number;
  statusText: string;
}

export interface MqttControlPacket {
  timestamp: number;
  seq: number;
  control: RobotControlState;
}

export interface MqttPacketLog {
  id: string;
  topic: string;
  direction: 'TX' | 'RX';
  timestamp: number;
  payload: string;
}

export type RobotAppearancePreset =
  | 'original'
  | 'red_translucent'
  | 'green_translucent'
  | 'blue_translucent'
  | 'purple_translucent';

export interface RobotInstanceConfig {
  id: string;
  name: string;
  urdfPath: string;
  motionTopic: string;
  fallbackMotionTopic?: string;
  forceFallbackBasePose?: boolean;
  appearancePreset: RobotAppearancePreset;
}

export type RobotMotionStatus = 'waiting' | 'live' | 'error';

export interface RobotInstanceRuntimeState {
  status: RobotMotionStatus;
  message?: string;
}

export interface RobotMotionMessage {
  timestamp: number;
  simulation_time: number;
  joint_names: string[];
  joint_values: number[];
  base_xyz: [number, number, number];
  base_quat_wxyz: [number, number, number, number];
}

export type MqttTopicHandler = (topic: string, payload: string) => void;

export type SubscribeMqttTopic = (
  topic: string,
  handler: MqttTopicHandler,
) => () => void;
