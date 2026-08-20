export type PolicyType = 'full_body' | 'lower_body' | 'upper_body';

export type PolicyInput = 'vx' | 'vy' | 'yaw' | 'pitch' | 'height';

export interface RobotPolicy {
  name: string;
  type: PolicyType;
  inputs: PolicyInput[];
}


export interface RobotControlState {
  vx: number;          // Forward / Backward velocity (-1.0 to 1.0)
  vy: number;          // Left / Right strafe velocity (-1.0 to 1.0)
  yaw: number;         // Turning angular velocity (-1.0 to 1.0)
  pitch: number;       // Camera / Body Pitch trim (-1.0 to 1.0)
  height: number;      // Body height from ground (0.20 to 0.75 meters)
  policy: string[];
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
  topic: string;
  timestamp: number;
  seq: number;
  control: {
    vx: number;
    vy: number;
    yaw: number;
    pitch: number;
    height: number;
    policy: string[];
    estop: boolean;
  };
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
