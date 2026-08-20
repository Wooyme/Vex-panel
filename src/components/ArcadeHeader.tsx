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
    <header className="w-full bg-[#ffffff] border-b-2 border-[#dc2626]/50 px-3 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
      {/* Brand Title with Pixel Glow */}
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[#dc2626] text-[#ffffff] border border-[#991b1b]">
          <Bot className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm sm:text-base font-black tracking-wider text-[#b91c1c] uppercase">
              Vex Panel
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#ef4444]/20 text-[#dc2626] border border-[#ef4444]/50">
              URDF LIVE
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#4b5563]/80 hidden md:block">
            MULTI-ROBOT URDF SCENE & MQTT-WS MOTION STREAMING
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
          className={`flex items-center gap-1.5 px-2 py-1 border ${
            mqttStatus === 'connected'
              ? 'bg-[#ef4444]/15 text-[#dc2626] border-[#ef4444]/60 hover:bg-[#ef4444]/25'
              : mqttStatus === 'connecting'
              ? 'bg-[#dc2626]/15 text-[#b91c1c] border-[#dc2626]/60 animate-pulse'
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
        <div className="hidden lg:flex items-center gap-1 bg-[#f3f4f6] px-2 py-0.5 border border-[#d1d5db]">
          <span className="text-[10px] text-[#b91c1c]/70">FREQ:</span>
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
                  ? 'bg-[#dc2626] text-[#ffffff]'
                  : 'text-[#b91c1c]/70 hover:text-[#b91c1c]'
              }`}
            >
              {freq}Hz
            </button>
          ))}
        </div>

        {/* Battery Indicator */}
        <div className="flex items-center gap-1 px-2 py-1 bg-[#f3f4f6] text-[#4b5563] border border-[#ef4444]/30 text-[11px]">
          <Zap className="w-3 h-3 text-[#dc2626]" />
          <span>{batteryPercent.toFixed(0)}%</span>
        </div>

        {/* FPS Counter */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#f3f4f6] text-[#b91c1c] border border-[#dc2626]/30 text-[11px]">
          <Activity className="w-3 h-3 text-[#ef4444]" />
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
          className={`p-1.5 border ${
            soundEnabled
              ? 'bg-[#dc2626]/20 text-[#b91c1c] border-[#dc2626]/60'
              : 'bg-[#f3f4f6] text-[#b91c1c]/40 border-[#d1d5db]'
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
          className="flex items-center gap-1 px-2 py-1.5 bg-[#f3f4f6] hover:bg-[#d1d5db] text-[#b91c1c] border border-[#dc2626]/40 text-xs font-mono"
          title="Open MQTT Telemetry Inspector"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>INSPECTOR</span>
        </button>
      </div>
    </header>
  );
};
