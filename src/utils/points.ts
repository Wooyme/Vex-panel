export type PointVelocity = [number, number];

export interface PointCommand {
  body_name: string;
  height: number;
  velocity: PointVelocity;
  duration: number;
}

export interface PointBatch {
  points: PointCommand[];
}

export function validatePointBatch(batch: PointBatch): PointBatch {
  if (!Array.isArray(batch?.points) || batch.points.length === 0) {
    throw new Error('请至少添加一个控制点');
  }
  return {
    points: batch.points.map((point, index) => {
      try {
        if (typeof point?.body_name !== 'string' || !point.body_name.trim() ||
            point.body_name.includes('\0') || point.body_name.trim() === 'world') {
          throw new Error('请输入有效的非 world body 名称');
        }
        if (!Number.isFinite(point.height)) throw new Error('目标高度必须是有限数值');
        if (!Array.isArray(point.velocity) || point.velocity.length !== 2 ||
            !point.velocity.every((value) => typeof value === 'number' && Number.isFinite(value))) {
          throw new Error('水平速度必须是两个有限数值');
        }
        if (!Number.isFinite(point.duration) || point.duration <= 0) {
          throw new Error('时长必须是正的有限数值');
        }
        return {
          body_name: point.body_name.trim(),
          height: point.height,
          velocity: [...point.velocity] as PointVelocity,
          duration: point.duration,
        };
      } catch (error) {
        throw new Error(`第 ${index + 1} 个控制点：${(error as Error).message}`);
      }
    }),
  };
}
