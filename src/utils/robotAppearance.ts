import * as THREE from 'three';
import { RobotAppearancePreset } from '../types/robot';

interface RobotAppearancePresetDefinition {
  label: string;
  color: string | null;
  opacity: number | null;
  tintStrength: number;
}

interface ApplyRobotAppearanceOptions {
  initialDelayMs?: number;
  materialDelayMs?: number;
  signal?: AbortSignal;
}

export const ROBOT_APPEARANCE_MATERIAL_DELAY_MS = 40;

export const ROBOT_APPEARANCE_PRESETS: Record<
  RobotAppearancePreset,
  RobotAppearancePresetDefinition
> = {
  original: {
    label: '原始',
    color: null,
    opacity: null,
    tintStrength: 0,
  },
  red_translucent: {
    label: '红色',
    color: '#ef4444',
    opacity: 0.45,
    tintStrength: 0.72,
  },
  green_translucent: {
    label: '绿色',
    color: '#22c55e',
    opacity: 0.45,
    tintStrength: 0.72,
  },
  blue_translucent: {
    label: '蓝色',
    color: '#3b82f6',
    opacity: 0.45,
    tintStrength: 0.72,
  },
  purple_translucent: {
    label: '紫色',
    color: '#a855f7',
    opacity: 0.45,
    tintStrength: 0.72,
  },
};

export const ROBOT_APPEARANCE_PRESET_NAMES = Object.keys(
  ROBOT_APPEARANCE_PRESETS,
) as RobotAppearancePreset[];

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timeoutId = globalThis.setTimeout(finish, ms);
    signal?.addEventListener('abort', finish, {once: true});
  });
}

export async function applyRobotAppearance(
  root: THREE.Object3D,
  presetName: RobotAppearancePreset,
  options: ApplyRobotAppearanceOptions = {},
): Promise<void> {
  const preset = ROBOT_APPEARANCE_PRESETS[presetName];
  if (preset.color === null || preset.opacity === null) return;

  const {
    initialDelayMs = 0,
    materialDelayMs = ROBOT_APPEARANCE_MATERIAL_DELAY_MS,
    signal,
  } = options;

  const tint = new THREE.Color(preset.color);
  if (initialDelayMs > 0) await delay(initialDelayMs, signal);
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => materials.add(material));
    } else if (mesh.material) {
      materials.add(mesh.material);
    }
  });
  const materialList = [...materials];
  for (const [index, material] of materialList.entries()) {
    if (signal?.aborted) return;
    const materialColor = (material as THREE.MeshBasicMaterial).color;
    if (materialColor?.isColor) {
      materialColor.lerp(tint, preset.tintStrength);
    }
    material.opacity = preset.opacity;
    material.transparent = true;
    material.depthWrite = false;
    material.needsUpdate = true;

    if (index < materialList.length - 1 && materialDelayMs > 0) {
      await delay(materialDelayMs, signal);
    }
  }
}
