export type ForceDirection = [number, number, number];

export interface ForceCommand {
  body_name: string;
  direction: ForceDirection;
  magnitude: number;
  duration: number;
}

export interface ForceBatch {
  forces: ForceCommand[];
}

export const DEFAULT_FORCE_TOPIC = 'robot/g1/mujoco/force';
export const FORCE_COLORS = ['#dc2626', '#2563eb', '#059669', '#9333ea', '#d97706', '#0891b2'];

export function normalizeForceDirection(direction: ForceDirection): ForceDirection {
  if (!Array.isArray(direction) || direction.length !== 3 ||
      !direction.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw new Error('XYZ 方向必须是有限数值');
  }
  const scale = Math.max(...direction.map(Math.abs));
  if (scale === 0) throw new Error('方向不能为零向量');
  const scaled = direction.map((value) => value / scale);
  const length = Math.hypot(...scaled);
  return scaled.map((value) => value / length) as ForceDirection;
}

export function validateForceTopic(topic: string): string {
  const value = topic.trim();
  if (!value || /[+#\u0000]/.test(value) || new TextEncoder().encode(value).length > 65535) {
    throw new Error('请输入有效 topic，不能包含通配符或空字符');
  }
  return value;
}

export function validateForceBatch(batch: ForceBatch): ForceBatch {
  if (!Array.isArray(batch?.forces) || batch.forces.length === 0) {
    throw new Error('请至少添加一条力');
  }
  return {
    forces: batch.forces.map((force, index) => {
      try {
        if (typeof force?.body_name !== 'string' || !force.body_name.trim() ||
            force.body_name.includes('\0') || force.body_name.trim() === 'world') {
          throw new Error('请输入有效的非 world body 名称');
        }
        normalizeForceDirection(force.direction);
        if (!Number.isFinite(force.magnitude) || force.magnitude < 0) {
          throw new Error('大小必须是非负有限数值');
        }
        if (!Number.isFinite(force.duration) || force.duration <= 0) {
          throw new Error('时长必须是正的有限数值');
        }
        return {
          body_name: force.body_name.trim(),
          direction: [...force.direction] as ForceDirection,
          magnitude: force.magnitude,
          duration: force.duration,
        };
      } catch (error) {
        throw new Error(`第 ${index + 1} 条力：${(error as Error).message}`);
      }
    }),
  };
}
