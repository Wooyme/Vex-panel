import React from 'react';
import { 
  Bot, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Terminal, 
  Activity,
  Zap,
  Radio
} from 'lucide-react';
import { playArcadeClick } from '../utils/audio';

interface ArcadeHeaderProps {
  mqttStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  txRate: number;
  packetsSent: number;
  publishFrequencyHz: number;
  onChangeFrequency: (freq: number) => void;
  batteryPercent: number;
  fps: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenMqttLogs: () => void;
}

export const ArcadeHeader: React.FC<ArcadeHeaderProps> = ({
  mqttStatus,
  txRate,
  packetsSent,
  publishFrequencyHz,
  onChangeFrequency,
  batteryPercent,
  fps,
  soundEnabled,
  onToggleSound,
  onOpenMqttLogs,
}) => {
  const frequencies = [10, 20, 50, 100];

  return (
    <header className="w-full bg-[#121611] border-b-2 border-[#f59e0b]/50 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.8)] select-none">
      {/* Brand Title with Pixel Glow */}
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[#f59e0b] text-[#121611] border border-[#fef08a] shadow-[0_0_10px_rgba(245,158,11,0.5)]">
          <Bot className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm sm:text-base font-black tracking-wider text-[#fbbf24] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              MUJOCO ROBOTICS // ARCADE SIM
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/50">
              WASM-v3
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#86efac]/80 hidden md:block">
            REAL-TIME QUADRUPED ROBOT SIMULATION & MQTT-WS TELEMETRY
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="flex items-center gap-2 text-xs font-mono">
        {/* MQTT Connection Status Lamp */}
        <button
          id="mqtt-status-badge"
          onClick={() => {
            playArcadeClick(600);
            onOpenMqttLogs();
          }}
          className={`flex items-center gap-1.5 px-2 py-1 border transition-all ${
            mqttStatus === 'connected'
              ? 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/60 shadow-[0_0_8px_rgba(34,197,94,0.3)] hover:bg-[#22c55e]/25'
              : mqttStatus === 'connecting'
              ? 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/60 animate-pulse'
              : 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/60'
          }`}
          title="Click to view MQTT Stream"
        >
          {mqttStatus === 'connected' ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span className="font-bold text-[10px]">
            {mqttStatus === 'connected'
              ? `MQTT: ${txRate} Hz`
              : mqttStatus === 'connecting'
              ? 'MQTT: SYNC...'
              : 'MQTT: OFFLINE'}
          </span>
          <Terminal className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        {/* TX Frequency Selector */}
        <div className="hidden lg:flex items-center gap-1 bg-[#1c241a] px-2 py-0.5 border border-[#263024]">
          <span className="text-[10px] text-[#fbbf24]/70">FREQ:</span>
          {frequencies.map((freq) => (
            <button
              key={freq}
              id={`freq-btn-${freq}hz`}
              onClick={() => {
                playArcadeClick(500 + freq * 2);
                onChangeFrequency(freq);
              }}
              className={`px-1.5 py-0.5 text-[9px] font-bold ${
                publishFrequencyHz === freq
                  ? 'bg-[#f59e0b] text-[#121611]'
                  : 'text-[#fbbf24]/70 hover:text-[#fbbf24]'
              }`}
            >
              {freq}Hz
            </button>
          ))}
        </div>

        {/* Battery Indicator */}
        <div className="flex items-center gap-1 px-2 py-1 bg-[#1c241a] text-[#86efac] border border-[#22c55e]/30 text-[11px]">
          <Zap className="w-3 h-3 text-[#f59e0b]" />
          <span>{batteryPercent.toFixed(0)}%</span>
        </div>

        {/* FPS Counter */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#1c241a] text-[#fbbf24] border border-[#f59e0b]/30 text-[11px]">
          <Activity className="w-3 h-3 text-[#22c55e]" />
          <span>{fps} FPS</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        {/* Audio FX Toggle */}
        <button
          id="toggle-sound-btn"
          onClick={() => {
            playArcadeClick(600);
            onToggleSound();
          }}
          className={`p-1.5 border transition-colors ${
            soundEnabled
              ? 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/60'
              : 'bg-[#1c241a] text-[#fbbf24]/40 border-[#263024]'
          }`}
          title={soundEnabled ? 'Mute 8-bit Audio' : 'Enable 8-bit Audio'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Terminal Logs Toggle */}
        <button
          id="open-terminal-btn"
          onClick={() => {
            playArcadeClick(500);
            onOpenMqttLogs();
          }}
          className="flex items-center gap-1 px-2 py-1.5 bg-[#1c241a] hover:bg-[#263024] text-[#fbbf24] border border-[#f59e0b]/40 text-xs font-mono"
          title="Open MQTT Telemetry Inspector"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>INSPECTOR</span>
        </button>
      </div>
    </header>
  );
};
