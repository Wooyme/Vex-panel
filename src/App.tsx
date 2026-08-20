import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { OctagonX } from 'lucide-react';
import {
  RobotControlState,
  RobotAppearancePreset,
  RobotInstanceConfig,
  RobotInstanceRuntimeState,
  RobotMotionStatus,
  RobotTelemetry,
} from './types/robot';
import { useMqttClient } from './hooks/useMqttClient';
import { ArcadeHeader } from './components/ArcadeHeader';
import { ThreeCanvas } from './components/ThreeCanvas';
import { VirtualJoystick } from './components/VirtualJoystick';
import { PolicyButtons } from './components/PolicyButtons';
import { HeightSlider } from './components/HeightSlider';
import { MqttInspectorModal } from './components/MqttInspectorModal';
import { PolicyConfigModal } from './components/PolicyConfigModal';
import { UrdfSelectorModal } from './components/UrdfSelectorModal';
import { TerrainSelectorModal } from './components/TerrainSelectorModal';
import { ModelInfo, TerrainInfo } from './api/manager';
import { setSoundEnabled, playEstopAlarm } from './utils/audio';
import {
  activePolicyInputs,
  reconcileActivePolicies,
  reconcileVisiblePolicies,
  toggleActivePolicy,
} from './utils/policy';

function modelStem(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

export default function App() {
  // Master Robot Control State
  const [controlState, setControlState] = useState<RobotControlState>({
    vx: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    height: 0.45,
    policy: [],
    estop: false,
  });

  // Telemetry Feedback
  const [telemetry, setTelemetry] = useState<RobotTelemetry>({
    posX: 0,
    posY: 0.45,
    posZ: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    linearVelocity: 0,
    angularVelocity: 0,
    batteryPercent: 98.4,
    batteryVoltage: 28.6,
    motorTemps: [38, 39, 41, 40, 39, 42, 40, 38, 39, 41, 40, 42],
    jointAngles: [0, 0.45, -0.9],
    groundClearance: 0.45,
    fps: 60,
    simTime: 0,
    statusText: 'SYSTEM NOMINAL',
  });

  // Fixed Frequency Transmission Config (Default 20Hz)
  const [publishFrequencyHz, setPublishFrequencyHz] = useState<number>(20);
  const [isMqttModalOpen, setIsMqttModalOpen] = useState<boolean>(false);
  const [isPolicyConfigModalOpen, setIsPolicyConfigModalOpen] = useState<boolean>(false);
  const [isUrdfModalOpen, setIsUrdfModalOpen] = useState<boolean>(false);
  const [isTerrainModalOpen, setIsTerrainModalOpen] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);

  // Multi-robot URDF scene state. The scene intentionally starts empty.
  const [robotInstances, setRobotInstances] = useState<RobotInstanceConfig[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [robotRuntimeStates, setRobotRuntimeStates] = useState<Record<string, RobotInstanceRuntimeState>>({});
  const [terrainPath, setTerrainPath] = useState<string | null>(null);

  const [visiblePolicyNames, setVisiblePolicyNames] = useState<string[]>([]);
  const initializedPolicyVisibilityRef = useRef(false);

  // Hook up MQTT-over-WebSocket control, telemetry, and policy-list streams.
  const {
    status: mqttStatus,
    packetsSent,
    packetsReceived,
    currentTxRate,
    logs: mqttLogs,
    policies,
    hasReceivedPolicyList,
    policyListTopic,
    subscribeTopic,
    clearLogs: clearMqttLogs,
    sendCustomPacket,
    brokerUrl,
  } = useMqttClient({
    publishFrequencyHz,
    controlState,
  });

  useEffect(() => {
    if (!hasReceivedPolicyList) return;

    setVisiblePolicyNames((current) => {
      const previous = initializedPolicyVisibilityRef.current ? current : null;
      initializedPolicyVisibilityRef.current = true;
      return reconcileVisiblePolicies(previous, policies);
    });
    setControlState((current) => ({
      ...current,
      policy: reconcileActivePolicies(current.policy, policies),
    }));
  }, [hasReceivedPolicyList, policies]);

  const activePolicyNames = useMemo(
    () => reconcileActivePolicies(controlState.policy, policies),
    [controlState.policy, policies],
  );
  const acceptedInputs = useMemo(
    () => activePolicyInputs(activePolicyNames, policies),
    [activePolicyNames, policies],
  );

  useEffect(() => {
    setControlState((current) => ({
      ...current,
      vx: acceptedInputs.has('vx') ? current.vx : 0,
      vy: acceptedInputs.has('vy') ? current.vy : 0,
      yaw: acceptedInputs.has('yaw') ? current.yaw : 0,
      pitch: acceptedInputs.has('pitch') ? current.pitch : 0,
    }));
  }, [acceptedInputs]);

  const handleTogglePolicy = useCallback((name: string) => {
    setControlState((current) => ({
      ...current,
      policy: toggleActivePolicy(current.policy, name, policies),
    }));
  }, [policies]);

  const handleSaveVisiblePolicies = useCallback((names: string[]) => {
    setVisiblePolicyNames(names);
    const visible = new Set(names);
    setControlState((current) => ({
      ...current,
      policy: reconcileActivePolicies(
        current.policy.filter((name) => visible.has(name)),
        policies,
      ),
    }));
  }, [policies]);

  const handleAddRobot = useCallback((
    model: ModelInfo,
    motionTopic: string,
    fallbackMotionTopic: string | undefined,
    forceFallbackBasePose: boolean,
    appearancePreset: RobotAppearancePreset,
  ) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `robot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const instance: RobotInstanceConfig = {
      id,
      name: modelStem(model.filename),
      urdfPath: model.path.startsWith('/') ? model.path : `/${model.path}`,
      motionTopic,
      ...(fallbackMotionTopic ? { fallbackMotionTopic } : {}),
      ...(forceFallbackBasePose ? { forceFallbackBasePose: true } : {}),
      appearancePreset,
    };
    setRobotInstances((current) => [...current, instance]);
    setRobotRuntimeStates((current) => ({ ...current, [id]: { status: 'waiting' } }));
    setSelectedInstanceId(id);
  }, []);

  const handleRemoveRobot = useCallback((instanceId: string) => {
    setRobotInstances((current) => current.filter((instance) => instance.id !== instanceId));
    setRobotRuntimeStates((current) => {
      const next = { ...current };
      delete next[instanceId];
      return next;
    });
    setSelectedInstanceId((current) => current === instanceId ? null : current);
  }, []);

  const handleLoadTerrain = useCallback((terrain: TerrainInfo) => {
    setTerrainPath(terrain.path.startsWith('/') ? terrain.path : `/${terrain.path}`);
  }, []);

  const handleChangeRobotTopic = useCallback((instanceId: string, motionTopic: string) => {
    setRobotInstances((current) => current.map((instance) =>
      instance.id === instanceId ? { ...instance, motionTopic } : instance,
    ));
    setRobotRuntimeStates((current) => ({
      ...current,
      [instanceId]: { status: 'waiting' },
    }));
  }, []);

  const handleRobotStatusChange = useCallback((
    instanceId: string,
    status: RobotMotionStatus,
    message?: string,
  ) => {
    setRobotRuntimeStates((current) => {
      const previous = current[instanceId];
      if (previous?.status === status && previous.message === message) return current;
      return { ...current, [instanceId]: { status, ...(message ? { message } : {}) } };
    });
  }, []);

  const handleFpsChange = useCallback((fps: number) => {
    setTelemetry((current) => current.fps === fps ? current : { ...current, fps });
  }, []);

  const liveRobotCount = robotInstances.filter(
    (instance) => robotRuntimeStates[instance.id]?.status === 'live',
  ).length;
  const sceneStatusText = controlState.estop
    ? 'EMERGENCY STOP ENGAGED'
    : robotInstances.length === 0
      ? 'SCENE EMPTY'
      : `${liveRobotCount}/${robotInstances.length} ROBOTS LIVE`;

  // Partial update helper for control state
  const handleUpdateControl = useCallback((partial: Partial<RobotControlState>) => {
    setControlState((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleToggleEstop = useCallback(() => {
    if (!controlState.estop) playEstopAlarm();
    setControlState((current) => current.estop
      ? { ...current, estop: false }
      : {
          ...current,
          vx: 0,
          vy: 0,
          yaw: 0,
          pitch: 0,
          estop: true,
        });
  }, [controlState.estop]);

  // Audio Toggle
  const handleToggleSound = useCallback(() => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  }, [soundActive]);

  return (
    <div id="arcade-cabinet-app" className="h-screen bg-[#f7f7f8] text-[#b91c1c] flex flex-col font-tech select-none overflow-hidden">
      {/* Top Arcade Marquee & Status Bar */}
      <ArcadeHeader
        mqttStatus={mqttStatus}
        txRate={currentTxRate}
        packetsSent={packetsSent}
        publishFrequencyHz={publishFrequencyHz}
        onChangeFrequency={setPublishFrequencyHz}
        batteryPercent={telemetry.batteryPercent}
        fps={telemetry.fps}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        onOpenMqttLogs={() => setIsMqttModalOpen(true)}
      />

      {/* Main Content Layout */}
      <main className="flex-1 p-2 flex flex-col gap-1.5 max-w-[1700px] w-full mx-auto min-h-0 overflow-hidden">
        {/* UPPER VIEWPORT: Multi-robot Three.js / URDF scene */}
        <section id="simulation-screen-section" className="relative flex-1 w-full min-h-0">
          <ThreeCanvas
            instances={robotInstances}
            selectedInstanceId={selectedInstanceId}
            runtimeStates={robotRuntimeStates}
            subscribeTopic={subscribeTopic}
            terrainPath={terrainPath}
            onSelectInstance={setSelectedInstanceId}
            onRemoveInstance={handleRemoveRobot}
            onChangeTopic={handleChangeRobotTopic}
            onOpenUrdfModal={() => setIsUrdfModalOpen(true)}
            onOpenTerrainModal={() => setIsTerrainModalOpen(true)}
            onFpsChange={handleFpsChange}
            onStatusChange={handleRobotStatusChange}
          />
          <button
            type="button"
            aria-label={controlState.estop ? '解除急停' : '触发急停'}
            aria-pressed={controlState.estop}
            onClick={handleToggleEstop}
            className={`absolute right-3 bottom-3 z-30 min-h-14 min-w-36 px-4 py-2 border-4 shadow-[0_5px_0_rgba(69,10,10,0.7)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 font-mono font-black tracking-wide touch-manipulation ${
              controlState.estop
                ? 'bg-[#450a0a] border-[#fca5a5] text-white animate-pulse'
                : 'bg-[#dc2626] border-[#7f1d1d] text-white'
            }`}
          >
            <OctagonX className="h-7 w-7 shrink-0" strokeWidth={3} />
            <span className="flex flex-col items-start leading-none">
              <span className="text-sm">{controlState.estop ? 'STOP ACTIVE' : 'EMERGENCY STOP'}</span>
              <span className="mt-1 text-[10px]">{controlState.estop ? '点击解除急停' : '急停'}</span>
            </span>
          </button>
        </section>

        {/* BOTTOM SECTION: DIVIDED INTO 3 BLOCKS */}
        <section id="bottom-control-deck" className="h-[210px] grid grid-cols-1 lg:grid-cols-12 gap-1.5 shrink-0">
          {/* BLOCK 1 (LEFT / 左侧): 控制行走的虚拟摇杆 (Walking / Locomotion Joystick) */}
          <div id="left-block-walking" className="lg:col-span-3 h-full">
            <VirtualJoystick
              id="walking-stick"
              title="LOCOMOTION 行走控制"
              subtitle="FORWARD / BACKWARD / STRAFE"
              xValue={controlState.vx}
              yValue={controlState.vy}
              xEnabled={!controlState.estop && acceptedInputs.has('vx')}
              yEnabled={!controlState.estop && acceptedInputs.has('vy')}
              onChange={(x, y) => handleUpdateControl({ vx: x, vy: y })}
              colorTheme="amber"
              size={120}
            />
          </div>

          {/* BLOCK 2 (MIDDLE / 中间): Policy activation matrix */}
          <div id="middle-block-policies" className="lg:col-span-6 h-full">
            <PolicyButtons
              policies={policies}
              visiblePolicyNames={visiblePolicyNames}
              activePolicyNames={activePolicyNames}
              onTogglePolicy={handleTogglePolicy}
              onOpenConfigModal={() => setIsPolicyConfigModalOpen(true)}
            />
          </div>

          {/* BLOCK 3 (RIGHT / 右侧): 控制转向的虚拟摇杆 + 控制身高的滑块 */}
          <div id="right-block-steering-height" className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 h-full">
            {/* Steering Joystick */}
            <VirtualJoystick
              id="steering-stick"
              title="STEERING 转向控制"
              subtitle="YAW / HEADING TRIM"
              xValue={controlState.yaw}
              yValue={controlState.pitch}
              xEnabled={!controlState.estop && acceptedInputs.has('yaw')}
              yEnabled={!controlState.estop && acceptedInputs.has('pitch')}
              onChange={(yaw, pitch) => handleUpdateControl({ yaw, pitch })}
              colorTheme="orange"
              size={120}
            />

            {/* Height Control Slider */}
            <HeightSlider
              heightValue={acceptedInputs.has('height') ? controlState.height : 0}
              onChange={(height) => handleUpdateControl({ height })}
              disabled={controlState.estop || !acceptedInputs.has('height')}
            />
          </div>
        </section>
      </main>

      {/* Retro Footer Telemetry Bar */}
      <footer className="w-full bg-[#ffffff] border-t border-[#dc2626]/30 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#4b5563]">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-[#b91c1c] font-bold">STATUS:</span>
          <span className={controlState.estop ? 'text-[#ef4444] font-bold animate-pulse' : 'text-[#dc2626]'}>
            {sceneStatusText}
          </span>
          <span className="hidden md:inline text-[#d1d5db]">|</span>
          <span className="hidden md:inline">
            YAW: {(acceptedInputs.has('yaw') ? controlState.yaw : 0).toFixed(2)} | VX: {(acceptedInputs.has('vx') ? controlState.vx : 0).toFixed(2)} | VY: {(acceptedInputs.has('vy') ? controlState.vy : 0).toFixed(2)} | HEIGHT: {(acceptedInputs.has('height') ? controlState.height : 0).toFixed(2)}m
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-[#b91c1c]/70">
          <button
            onClick={() => setIsMqttModalOpen(true)}
            className="text-[#dc2626] hover:underline font-bold"
          >
            TX: {publishFrequencyHz}Hz MQTT-WS
          </button>
        </div>
      </footer>

      {/* MQTT Telemetry Stream Inspector Modal */}
      <MqttInspectorModal
        isOpen={isMqttModalOpen}
        onClose={() => setIsMqttModalOpen(false)}
        logs={mqttLogs}
        onClearLogs={clearMqttLogs}
        brokerUrl={brokerUrl}
        mqttStatus={mqttStatus}
        packetsSent={packetsSent}
        packetsReceived={packetsReceived}
        currentTxRate={currentTxRate}
        onSendCustomPacket={sendCustomPacket}
      />

      {/* Policy visibility configuration for the MQTT policy list */}
      <PolicyConfigModal
        isOpen={isPolicyConfigModalOpen}
        onClose={() => setIsPolicyConfigModalOpen(false)}
        policies={policies}
        visiblePolicyNames={visiblePolicyNames}
        onSaveSelection={handleSaveVisiblePolicies}
        mqttTopic={policyListTopic}
        mqttConnected={mqttStatus === 'connected'}
      />

      {/* Backend URDF Model Selector Modal */}
      <UrdfSelectorModal
        isOpen={isUrdfModalOpen}
        onClose={() => setIsUrdfModalOpen(false)}
        onConfirm={handleAddRobot}
      />

      {/* Backend OBJ Terrain Selector Modal */}
      <TerrainSelectorModal
        isOpen={isTerrainModalOpen}
        hasActiveTerrain={terrainPath !== null}
        onClose={() => setIsTerrainModalOpen(false)}
        onClear={() => setTerrainPath(null)}
        onConfirm={handleLoadTerrain}
      />
    </div>
  );
}
