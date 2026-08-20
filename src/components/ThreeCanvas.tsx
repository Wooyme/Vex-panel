import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Mountain,
  Plus,
  Trash2,
} from 'lucide-react';
import { SceneManager } from '../core/SceneManager';
import {
  RobotInstanceConfig,
  RobotInstanceRuntimeState,
  RobotAppearancePreset,
  RobotMotionStatus,
  SubscribeMqttTopic,
} from '../types/robot';
import { playArcadeClick } from '../utils/audio';
import { MotionLoader } from './MotionLoader';

interface ThreeCanvasProps {
  instances: RobotInstanceConfig[];
  selectedInstanceId: string | null;
  runtimeStates: Record<string, RobotInstanceRuntimeState>;
  subscribeTopic: SubscribeMqttTopic;
  terrainPath: string | null;
  onSelectInstance: (instanceId: string) => void;
  onRemoveInstance: (instanceId: string) => void;
  onChangeTopic: (instanceId: string, topic: string) => void;
  onOpenUrdfModal: () => void;
  onOpenTerrainModal: () => void;
  onFpsChange: (fps: number) => void;
  onStatusChange: (
    instanceId: string,
    status: RobotMotionStatus,
    message?: string,
  ) => void;
}

interface RobotRowProps {
  instance: RobotInstanceConfig;
  selected: boolean;
  runtime: RobotInstanceRuntimeState;
  onSelect: () => void;
  onRemove: () => void;
  onChangeTopic: (topic: string) => void;
}

const statusClasses: Record<RobotMotionStatus, string> = {
  waiting: 'text-[#b91c1c] border-[#dc2626]/50 bg-[#dc2626]/10',
  live: 'text-[#dc2626] border-[#ef4444]/50 bg-[#ef4444]/10',
  error: 'text-[#b91c1c] border-[#ef4444]/60 bg-[#ef4444]/10',
};

const transformationGifPaths: Partial<Record<RobotAppearancePreset, string>> = {
  red_translucent: '/assets/static/gifs/red.gif',
  green_translucent: '/assets/static/gifs/green.gif',
  blue_translucent: '/assets/static/gifs/blue.gif',
  purple_translucent: '/assets/static/gifs/purple.gif',
};

interface TransformationEffect {
  instanceId: string;
  preset: RobotAppearancePreset;
}

const RobotRow: React.FC<RobotRowProps> = ({
  instance,
  selected,
  runtime,
  onSelect,
  onRemove,
  onChangeTopic,
}) => {
  const [topicDraft, setTopicDraft] = useState(instance.motionTopic);

  useEffect(() => setTopicDraft(instance.motionTopic), [instance.motionTopic]);

  const commitTopic = () => {
    const topic = topicDraft.trim();
    if (!topic) {
      setTopicDraft(instance.motionTopic);
      return;
    }
    if (topic !== instance.motionTopic) onChangeTopic(topic);
  };

  return (
    <div
      onClick={onSelect}
      className={`border p-2 cursor-pointer ${
        selected
          ? 'border-[#dc2626] bg-[#fff1f2]'
          : 'border-[#d1d5db] bg-[#ffffff]/95 hover:border-[#dc2626]/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <Box className="w-3.5 h-3.5 shrink-0 text-[#dc2626]" />
        <span className="min-w-0 flex-1 truncate font-bold text-[#111827]">
          {instance.name}
        </span>
        <span className={`px-1 py-0.5 text-[8px] border font-bold ${statusClasses[runtime.status]}`}>
          {runtime.status.toUpperCase()}
        </span>
        <button
          type="button"
          title="Remove robot"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="p-0.5 text-[#b91c1c] hover:bg-[#991b1b]/50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        aria-label={`${instance.name} motion topic`}
        value={topicDraft}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => setTopicDraft(event.target.value)}
        onBlur={commitTopic}
        className="mt-1.5 w-full bg-[#ffffff] border border-[#d1d5db] px-1.5 py-1 text-[9px] text-[#4b5563] outline-none focus:border-[#ef4444]"
      />
      {runtime.message && (
        <div title={runtime.message} className="mt-1 truncate text-[8px] text-[#b91c1c]">
          {runtime.message}
        </div>
      )}
    </div>
  );
};

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  instances,
  selectedInstanceId,
  runtimeStates,
  subscribeTopic,
  terrainPath,
  onSelectInstance,
  onRemoveInstance,
  onChangeTopic,
  onOpenUrdfModal,
  onOpenTerrainModal,
  onFpsChange,
  onStatusChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const loadedConfigsRef = useRef(new Map<string, RobotInstanceConfig>());
  const fpsCallbackRef = useRef(onFpsChange);
  const statusCallbackRef = useRef(onStatusChange);
  const selectedInstanceIdRef = useRef(selectedInstanceId);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);
  const [terrainError, setTerrainError] = useState<string | null>(null);
  const [transformationEffect, setTransformationEffect] =
    useState<TransformationEffect | null>(null);

  fpsCallbackRef.current = onFpsChange;
  statusCallbackRef.current = onStatusChange;
  selectedInstanceIdRef.current = selectedInstanceId;

  useEffect(() => {
    const mount = mountRef.current!;
    const manager = new SceneManager(mount, {
      onFps: (fps) => fpsCallbackRef.current(fps),
      onRobotError: (instanceId, message) =>
        statusCallbackRef.current(instanceId, 'error', message),
      onRobotTransformationStart: (instanceId, preset) => {
        setTransformationEffect({instanceId, preset});
      },
      onRobotTransformationEnd: (instanceId) => {
        setTransformationEffect((current) =>
          current?.instanceId === instanceId ? null : current,
        );
      },
    });
    const resizeObserver = new ResizeObserver(([entry]) => {
      manager.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(mount);
    setSceneManager(manager);

    return () => {
      resizeObserver.disconnect();
      manager.dispose();
      loadedConfigsRef.current.clear();
      setSceneManager(null);
    };
  }, []);

  useEffect(() => {
    if (!sceneManager) return;
    const nextIds = new Set(instances.map((instance) => instance.id));

    [...loadedConfigsRef.current.keys()].forEach((instanceId) => {
      if (!nextIds.has(instanceId)) {
        sceneManager.removeRobot(instanceId);
        loadedConfigsRef.current.delete(instanceId);
      }
    });

    instances.forEach((instance) => {
      const loaded = loadedConfigsRef.current.get(instance.id);
      const needsReload =
        !loaded ||
        loaded.name !== instance.name ||
        loaded.urdfPath !== instance.urdfPath;
      if (!needsReload) return;

      loadedConfigsRef.current.set(instance.id, instance);
      onStatusChange(instance.id, 'waiting');

      void sceneManager.addRobot(instance)
        .then(() => {
          if (loadedConfigsRef.current.get(instance.id) !== instance) {
            sceneManager.removeRobot(instance.id);
            return;
          }
          if (selectedInstanceIdRef.current === instance.id) {
            sceneManager.focusRobot(instance.id);
          }
        })
        .catch((error) => {
          if (loadedConfigsRef.current.get(instance.id) !== instance) return;
          const message = error instanceof Error ? error.message : String(error);
          onStatusChange(instance.id, 'error', message);
        });
    });
  }, [instances, onStatusChange, sceneManager]);

  useEffect(() => {
    if (sceneManager && selectedInstanceId) sceneManager.focusRobot(selectedInstanceId);
  }, [sceneManager, selectedInstanceId]);

  useEffect(() => {
    if (!sceneManager) return;
    if (!terrainPath) {
      sceneManager.clearTerrain();
      setTerrainLoading(false);
      setTerrainError(null);
      return;
    }
    let active = true;
    setTerrainLoading(true);
    setTerrainError(null);
    void sceneManager.loadTerrain(terrainPath)
      .then(() => {
        if (active) setTerrainLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setTerrainLoading(false);
        setTerrainError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
    };
  }, [sceneManager, terrainPath]);

  return (
    <div
      id="three-viewport-container"
      className="relative w-full h-full bg-[#f8fafc] border-2 border-[#dc2626] overflow-hidden select-none"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={mountRef} id="three-canvas-mount" className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-2 left-2 z-10 w-[290px] max-w-[calc(100%-1rem)] font-mono text-[10px]">
        <div className="flex items-center justify-between border border-[#ef4444]/60 bg-[#ffffff]/95 px-2 py-1.5 text-[#4b5563]">
          <span className="font-bold tracking-wider">SCENE ROBOTS ({instances.length})</span>
          <button
            type="button"
            onClick={() => {
              playArcadeClick(600);
              onOpenUrdfModal();
            }}
            className="flex items-center gap-1 bg-[#dc2626] px-1.5 py-1 font-bold text-[#ffffff] hover:bg-[#b91c1c]"
          >
            <Plus className="w-3 h-3" /> ADD URDF
          </button>
        </div>
        <div className="mt-1 max-h-[240px] space-y-1 overflow-y-auto">
          {instances.map((instance) => (
            <RobotRow
              key={instance.id}
              instance={instance}
              selected={selectedInstanceId === instance.id}
              runtime={runtimeStates[instance.id] ?? { status: 'waiting' }}
              onSelect={() => onSelectInstance(instance.id)}
              onRemove={() => onRemoveInstance(instance.id)}
              onChangeTopic={(topic) => onChangeTopic(instance.id, topic)}
            />
          ))}
          {instances.length === 0 && (
            <div className="border border-dashed border-[#d1d5db] bg-[#ffffff]/90 p-3 text-center text-[#4b5563]/70">
              EMPTY SCENE — ADD A URDF ROBOT
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          title={terrainError ?? 'Load or replace scene terrain'}
          onClick={() => {
            playArcadeClick(520);
            onOpenTerrainModal();
          }}
          className={`flex min-h-9 items-center gap-1.5 border-2 px-3 py-1.5 font-mono text-[10px] font-black tracking-wide shadow-sm ${
            terrainError
              ? 'border-[#991b1b] bg-[#450a0a] text-white'
              : 'border-[#7f1d1d] bg-[#dc2626] text-white hover:bg-[#b91c1c]'
          }`}
        >
          <Mountain className={`h-4 w-4 ${terrainLoading ? 'animate-pulse' : ''}`} />
          {terrainLoading ? 'LOADING...' : 'LOAD TERRAIN'}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 border border-[#d1d5db] bg-[#ffffff]/80 px-3 py-1 text-[9px] font-mono text-[#4b5563]/80">
        Z-UP • DRAG ROTATE • PINCH ZOOM
      </div>

      {transformationEffect && transformationGifPaths[transformationEffect.preset] && (
        <img
          key={transformationEffect.instanceId}
          src={transformationGifPaths[transformationEffect.preset]}
          alt="机器人变身动画"
          className="pointer-events-none absolute bottom-2 left-2 z-20 h-[120px] w-auto max-w-[40%] object-contain [image-rendering:pixelated]"
        />
      )}

      {sceneManager && (
        <MotionLoader
          sceneManager={sceneManager}
          instances={instances}
          subscribeTopic={subscribeTopic}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
};
