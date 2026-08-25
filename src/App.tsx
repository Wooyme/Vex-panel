import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { OctagonX } from 'lucide-react';
import {
  RobotControlState,
  RobotAppearancePreset,
  RobotInstanceConfig,
  RobotInstanceRuntimeState,
  RobotMotionStatus,
  RobotPolicy,
  RobotTelemetry,
} from './types/robot';
import { useMqttClient } from './hooks/useMqttClient';
import { ArcadeHeader } from './components/ArcadeHeader';
import { ThreeCanvas } from './components/ThreeCanvas';
import { PolicyButtons } from './components/PolicyButtons';
import { PolicyControls } from './components/PolicyControls';
import { MqttInspectorModal } from './components/MqttInspectorModal';
import { PolicyConfigModal } from './components/PolicyConfigModal';
import { UrdfSelectorModal } from './components/UrdfSelectorModal';
import { TerrainSelectorModal } from './components/TerrainSelectorModal';
import { ModelInfo, TerrainInfo } from './api/manager';
import { setSoundEnabled, playEstopAlarm } from './utils/audio';
import {
  controlStateForPolicies,
  policyInputParameters,
  reconcileActivePolicies,
  reconcileControlState,
  reconcileVisiblePolicies,
  resetActivePolicyInputs,
  toggleActivePolicy,
} from './utils/policy';

function modelStem(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

export default function App() {
  // Master Robot Control State
  const [controlState, setControlState] = useState<RobotControlState>({
    policy: [],
    inputs: {},
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
  const previousPoliciesRef = useRef<RobotPolicy[]>([]);

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
    const previousPolicies = previousPoliciesRef.current;
    previousPoliciesRef.current = policies;
    setControlState((current) => reconcileControlState(current, previousPolicies, policies));
  }, [hasReceivedPolicyList, policies]);

  const activePolicyNames = useMemo(
    () => reconcileActivePolicies(controlState.policy, policies),
    [controlState.policy, policies],
  );
  const activeControlSummary = useMemo(() => {
    const byName = new Map<string, RobotPolicy>(
      policies.map((policy) => [policy.name, policy]),
    );
    return activePolicyNames.flatMap((name) => {
      const policy = byName.get(name);
      if (!policy) return [];
      return policyInputParameters(policy).map((parameter) => {
        const label = activePolicyNames.length > 1
          ? `${name}.${parameter.name}`
          : parameter.name;
        const value = controlState.inputs[name]?.[parameter.name] ?? parameter.default;
        return `${label.toUpperCase()}: ${Number(value.toFixed(3))}`;
      });
    }).join(' | ');
  }, [activePolicyNames, controlState.inputs, policies]);

  const handleTogglePolicy = useCallback((name: string) => {
    setControlState((current) => controlStateForPolicies(
      current,
      toggleActivePolicy(current.policy, name, policies),
      policies,
    ));
  }, [policies]);

  const handleSaveVisiblePolicies = useCallback((names: string[]) => {
    setVisiblePolicyNames(names);
    const visible = new Set(names);
    setControlState((current) => controlStateForPolicies(
      current,
      reconcileActivePolicies(
        current.policy.filter((name) => visible.has(name)),
        policies,
      ),
      policies,
    ));
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

  const handleUpdatePolicyInput = useCallback((
    policyName: string,
    parameterName: string,
    value: number,
  ) => {
    setControlState((current) => {
      if (!current.policy.includes(policyName) || !Number.isFinite(value)) return current;
      const policy = policies.find((candidate) => candidate.name === policyName);
      const parameter = policyInputParameters(policy?.inputs ?? [])
        .find((candidate) => candidate.name === parameterName);
      if (!parameter) return current;
      const nextValue = Math.max(parameter.min, Math.min(parameter.max, value));
      return {
        ...current,
        inputs: {
          ...current.inputs,
          [policyName]: {
            ...current.inputs[policyName],
            [parameterName]: nextValue,
          },
        },
      };
    });
  }, [policies]);

  const handleToggleEstop = useCallback(() => {
    if (!controlState.estop) playEstopAlarm();
    setControlState((current) => current.estop
      ? { ...current, estop: false }
      : { ...resetActivePolicyInputs(current, policies), estop: true });
  }, [controlState.estop, policies]);

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

        {/* BOTTOM CONTROL DECK: full-width policy strip, then policy-defined controls */}
        <section id="bottom-control-deck" className="flex h-[254px] shrink-0 flex-col gap-1.5">
          <div id="policy-switch-panel" className="h-[82px] w-full shrink-0">
            <PolicyButtons
              policies={policies}
              visiblePolicyNames={visiblePolicyNames}
              activePolicyNames={activePolicyNames}
              onTogglePolicy={handleTogglePolicy}
              onOpenConfigModal={() => setIsPolicyConfigModalOpen(true)}
            />
          </div>
          <div id="policy-interaction-panel" className="min-h-0 flex-1">
            <PolicyControls
              policies={policies}
              activePolicyNames={activePolicyNames}
              values={controlState.inputs}
              disabled={controlState.estop}
              onChange={handleUpdatePolicyInput}
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
          <span className="hidden max-w-[70vw] truncate md:inline" title={activeControlSummary}>
            {activeControlSummary || 'INPUTS: NONE'}
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
