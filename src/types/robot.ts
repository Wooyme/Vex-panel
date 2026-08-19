export type GaitMode = 'WALK' | 'TROT' | 'CRAWL' | 'RUN' | 'JUMP' | 'DANCE';

export type PostureState = 'STAND' | 'CROUCH' | 'REST' | 'BALANCE';

export type ActionFunctionId = 
  | 'WALK' 
  | 'TROT' 
  | 'CRAWL' 
  | 'RUN' 
  | 'JUMP' 
  | 'DANCE' 
  | 'STAND' 
  | 'CROUCH' 
  | 'REST' 
  | 'BALANCE'
  | 'GREET'
  | 'BOW'
  | 'LOOK_AROUND'
  | 'BACKFLIP'
  | 'PATROL'
  | 'AUTO_NAV'
  | 'STAIRS_MODE'
  | 'SELF_CHECK';

export interface RobotFunctionItem {
  id: ActionFunctionId | string;
  name: string;
  labelZh: string;
  category: 'LOCOMOTION 行走' | 'POSTURE 姿态' | 'ACTION 特技动作' | 'AUTONOMOUS 智能导航';
  type: 'gait' | 'posture' | 'action' | 'mode';
  description: string;
  defaultActive?: boolean;
}

export type CameraMode = 'CHASE' | 'ORBIT' | 'TOP_DOWN' | 'FIRST_PERSON';

export interface RobotControlState {
  vx: number;          // Forward / Backward velocity (-1.0 to 1.0)
  vy: number;          // Left / Right strafe velocity (-1.0 to 1.0)
  yaw: number;         // Turning angular velocity (-1.0 to 1.0)
  pitch: number;       // Camera / Body Pitch trim (-1.0 to 1.0)
  height: number;      // Body height from ground (0.20 to 0.75 meters)
  gait: GaitMode;
  posture: PostureState;
  activeAction?: string | null;
  torqueEnabled: boolean;
  headlight: boolean;
  autoLevel: boolean;
  estop: boolean;
  speedMultiplier: number; // 0.5x, 1.0x, 1.5x, 2.0x
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
    gait: GaitMode;
    posture: PostureState;
    torque: boolean;
    headlight: boolean;
    autoLevel: boolean;
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
