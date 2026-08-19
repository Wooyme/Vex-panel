import React, { useState, useCallback, useEffect } from 'react';
import { RobotControlState, RobotTelemetry } from './types/robot';
import { useMqttClient } from './hooks/useMqttClient';
import { ArcadeHeader } from './components/ArcadeHeader';
import { MujocoViewport } from './components/MujocoViewport';
import { VirtualJoystick } from './components/VirtualJoystick';
import { FunctionButtons } from './components/FunctionButtons';
import { HeightSlider } from './components/HeightSlider';
import { MqttInspectorModal } from './components/MqttInspectorModal';
import { FunctionConfigModal } from './components/FunctionConfigModal';
import { UrdfUploadModal } from './components/UrdfUploadModal';
import { SAMPLE_URDFS } from './data/sampleUrdfs';
import { setSoundEnabled, isSoundEnabled, playArcadeClick, playEstopAlarm } from './utils/audio';

export default function App() {
  // Master Robot Control State
  const [controlState, setControlState] = useState<RobotControlState>({
    vx: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    height: 0.45,
    gait: 'WALK',
    posture: 'STAND',
    activeAction: null,
    torqueEnabled: true,
    headlight: true,
    autoLevel: true,
    estop: false,
    speedMultiplier: 1.0,
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
  const [isFunctionConfigModalOpen, setIsFunctionConfigModalOpen] = useState<boolean>(false);
  const [isUrdfModalOpen, setIsUrdfModalOpen] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);

  // URDF Display Model State
  const [urdfContent, setUrdfContent] = useState<string>(SAMPLE_URDFS[0].content);
  const [urdfName, setUrdfName] = useState<string>(SAMPLE_URDFS[0].name);

  // Selected Function Buttons on the Control Panel
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([
    'WALK',
    'TROT',
    'CRAWL',
    'RUN',
    'JUMP',
    'DANCE',
    'STAND',
    'CROUCH',
    'REST',
    'BALANCE',
    'GREET',
    'BOW',
  ]);

  // Hook up MQTT-over-WebSocket telemetry transmission & capabilities subscription
  const {
    status: mqttStatus,
    packetsSent,
    packetsReceived,
    currentTxRate,
    logs: mqttLogs,
    supportedFunctions,
    clearLogs: clearMqttLogs,
    sendCustomPacket,
    brokerUrl,
  } = useMqttClient({
    publishFrequencyHz,
    controlState,
  });

  // Partial update helper for control state
  const handleUpdateControl = useCallback((partial: Partial<RobotControlState>) => {
    setControlState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Toggle Emergency Stop
  const handleToggleEstop = useCallback(() => {
    playEstopAlarm();
    setControlState((prev) => ({ ...prev, estop: !prev.estop }));
  }, []);

  // Reset Simulation Position
  const handleResetSim = useCallback(() => {
    setControlState((prev) => ({
      ...prev,
      vx: 0,
      vy: 0,
      yaw: 0,
      pitch: 0,
      activeAction: null,
      estop: false,
    }));
  }, []);

  // Audio Toggle
  const handleToggleSound = useCallback(() => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  }, [soundActive]);

  // Keyboard Shortcuts for arcade gaming feel
  useEffect(() => {
    const keysPressed = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      keysPressed.add(e.key.toLowerCase());

      let newVx = 0;
      let newVy = 0;
      let newYaw = 0;

      // Locomotion (WASD)
      if (keysPressed.has('w')) newVy += 1.0;
      if (keysPressed.has('s')) newVy -= 1.0;
      if (keysPressed.has('a')) newVx -= 1.0;
      if (keysPressed.has('d')) newVx += 1.0;

      // Turning / Yaw (Q/E or Arrow Keys)
      if (keysPressed.has('q') || keysPressed.has('arrowleft')) newYaw -= 1.0;
      if (keysPressed.has('e') || keysPressed.has('arrowright')) newYaw += 1.0;

      // Quick Gait shortcuts (1-6)
      if (e.key === '1') handleUpdateControl({ gait: 'WALK', activeAction: null });
      if (e.key === '2') handleUpdateControl({ gait: 'TROT', activeAction: null });
      if (e.key === '3') handleUpdateControl({ gait: 'CRAWL', activeAction: null });
      if (e.key === '4') handleUpdateControl({ gait: 'RUN', activeAction: null });
      if (e.key === '5') handleUpdateControl({ gait: 'JUMP', activeAction: null });
      if (e.key === '6') handleUpdateControl({ gait: 'DANCE', activeAction: null });

      // ESTOP on Spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        playEstopAlarm();
        setControlState((prev) => ({ ...prev, estop: !prev.estop }));
      }

      // Height Adjust on Arrow Up/Down
      if (e.key === 'ArrowUp') {
        setControlState((prev) => ({ ...prev, height: Math.min(0.75, prev.height + 0.05) }));
      }
      if (e.key === 'ArrowDown') {
        setControlState((prev) => ({ ...prev, height: Math.max(0.20, prev.height - 0.05) }));
      }

      // Update velocities if changed
      setControlState((prev) => {
        if (prev.vx !== newVx || prev.vy !== newVy || prev.yaw !== newYaw) {
          return { ...prev, vx: newVx, vy: newVy, yaw: newYaw };
        }
        return prev;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.key.toLowerCase());

      let newVx = 0;
      let newVy = 0;
      let newYaw = 0;

      if (keysPressed.has('w')) newVy += 1.0;
      if (keysPressed.has('s')) newVy -= 1.0;
      if (keysPressed.has('a')) newVx -= 1.0;
      if (keysPressed.has('d')) newVx += 1.0;

      if (keysPressed.has('q') || keysPressed.has('arrowleft')) newYaw -= 1.0;
      if (keysPressed.has('e') || keysPressed.has('arrowright')) newYaw += 1.0;

      setControlState((prev) => ({ ...prev, vx: newVx, vy: newVy, yaw: newYaw }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUpdateControl]);

  return (
    <div id="arcade-cabinet-app" className="h-screen bg-[#0a0d0a] text-[#fbbf24] flex flex-col font-tech select-none overflow-hidden">
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
        {/* UPPER VIEWPORT: URDF 3D Viewport (Takes all remaining screen height) */}
        <section id="simulation-screen-section" className="flex-1 w-full min-h-0">
          <MujocoViewport
            controlState={controlState}
            onUpdateTelemetry={setTelemetry}
            onResetRobot={handleResetSim}
            onToggleEstop={handleToggleEstop}
            urdfContent={urdfContent}
            urdfName={urdfName}
            onOpenUrdfModal={() => setIsUrdfModalOpen(true)}
          />
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
              onChange={(x, y) => handleUpdateControl({ vx: x, vy: y })}
              colorTheme="amber"
              keyHints={{ up: 'W', left: 'A', down: 'S', right: 'D' }}
              size={120}
            />
          </div>

          {/* BLOCK 2 (MIDDLE / 中间): 功能切换按钮 (Function Matrix Buttons - All Same Hierarchy) */}
          <div id="middle-block-functions" className="lg:col-span-6 h-full">
            <FunctionButtons
              controlState={controlState}
              onUpdateControl={handleUpdateControl}
              onResetSim={handleResetSim}
              allSupportedFunctions={supportedFunctions}
              selectedFunctionIds={selectedFunctionIds}
              onOpenConfigModal={() => setIsFunctionConfigModalOpen(true)}
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
              onChange={(yaw, pitch) => handleUpdateControl({ yaw, pitch })}
              colorTheme="orange"
              keyHints={{ up: '▲', left: 'Q/◀', down: '▼', right: 'E/▶' }}
              size={120}
            />

            {/* Height Control Slider */}
            <HeightSlider
              heightValue={controlState.height}
              onChange={(height) => handleUpdateControl({ height })}
              disabled={controlState.estop}
            />
          </div>
        </section>
      </main>

      {/* Retro Footer Telemetry & Hotkey Bar */}
      <footer className="w-full bg-[#121611] border-t border-[#f59e0b]/30 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#86efac]">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-[#fbbf24] font-bold">STATUS:</span>
          <span className={controlState.estop ? 'text-[#ef4444] font-bold animate-pulse' : 'text-[#4ade80]'}>
            {telemetry.statusText}
          </span>
          <span className="hidden md:inline text-[#263024]">|</span>
          <span className="hidden md:inline">
            YAW: {controlState.yaw.toFixed(2)} | VX: {controlState.vx.toFixed(2)} | VY: {controlState.vy.toFixed(2)} | HEIGHT: {controlState.height.toFixed(2)}m
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-[#fbbf24]/70">
          <span className="hidden lg:inline">[WASD: WALK]</span>
          <span className="hidden lg:inline">[Q/E: TURN]</span>
          <span className="hidden lg:inline">[1-6: GAIT]</span>
          <span className="hidden sm:inline">[SPACE: ESTOP]</span>
          <button
            onClick={() => setIsMqttModalOpen(true)}
            className="text-[#f59e0b] hover:underline font-bold"
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

      {/* Function Configuration & MQTT Capabilities Selection Modal */}
      <FunctionConfigModal
        isOpen={isFunctionConfigModalOpen}
        onClose={() => setIsFunctionConfigModalOpen(false)}
        allSupportedFunctions={supportedFunctions}
        selectedFunctionIds={selectedFunctionIds}
        onSaveSelection={setSelectedFunctionIds}
        mqttConnected={mqttStatus === 'connected'}
      />

      {/* URDF Upload & Model Selector Modal */}
      <UrdfUploadModal
        isOpen={isUrdfModalOpen}
        onClose={() => setIsUrdfModalOpen(false)}
        onLoadUrdf={(content, name) => {
          setUrdfContent(content);
          if (name) setUrdfName(name);
        }}
        currentUrdfName={urdfName}
      />
    </div>
  );
}

