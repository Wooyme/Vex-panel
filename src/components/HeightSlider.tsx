import React, { useRef, useCallback } from 'react';
import { playSliderTick, playArcadeClick } from '../utils/audio';

interface HeightSliderProps {
  heightValue: number; // 0.20 to 0.75 meters
  onChange: (newHeight: number) => void;
  disabled?: boolean;
}

export const HeightSlider: React.FC<HeightSliderProps> = ({
  heightValue,
  onChange,
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const minHeight = 0.20;
  const maxHeight = 0.75;

  const normalized = Math.max(0, Math.min(1, (heightValue - minHeight) / (maxHeight - minHeight)));

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, clickY / rect.height));
      const targetHeight = Number((minHeight + ratio * (maxHeight - minHeight)).toFixed(2));
      onChange(targetHeight);
      playSliderTick(400 + Math.floor(ratio * 300));
    },
    [disabled, minHeight, maxHeight, onChange]
  );

  const handlePreset = (val: number) => {
    if (disabled) return;
    playArcadeClick(600);
    onChange(val);
  };

  return (
    <div
      id="height-slider-card"
      aria-disabled={disabled}
      className={`flex flex-col items-center justify-between p-2 bg-[#ffffff] border-2 border-[#ef4444]/50 select-none h-full ${disabled ? 'opacity-55' : ''}`}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-[#d1d5db] pb-1 mb-1">
        <div>
          <h3 className="font-mono text-[11px] font-bold tracking-wider text-[#4b5563]">CHASSIS HEIGHT</h3>
          <p className="font-mono text-[9px] text-[#dc2626]/70">身 高 控 制</p>
        </div>
        <div className="font-mono text-[10px] font-bold text-[#4b5563] bg-[#ef4444]/20 border border-[#ef4444]/50 px-1.5 py-0.2">
          {heightValue.toFixed(2)}m
        </div>
      </div>

      {/* Vertical Slider Track Area */}
      <div className="flex items-center gap-2 w-full justify-center my-auto">
        {/* Presets Sidebar */}
        <div className="flex flex-col gap-1 justify-between">
          {[
            { label: 'MAX', val: 0.75 },
            { label: 'HIGH', val: 0.6 },
            { label: 'NORM', val: 0.45 },
            { label: 'LOW', val: 0.25 },
          ].map((p) => (
            <button
              key={p.label}
              id={`preset-${p.label.toLowerCase()}-btn`}
              disabled={disabled}
              onClick={() => handlePreset(p.val)}
              className="px-1.5 py-1 text-[9px] font-mono font-bold bg-[#f3f4f6] hover:bg-[#d1d5db] text-[#4b5563] border border-[#ef4444]/40 active:bg-[#ef4444] active:text-[#ffffff] disabled:cursor-not-allowed disabled:hover:bg-[#f3f4f6]"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Fader Track */}
        <div
          ref={trackRef}
          id="height-fader-track"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handlePointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) handlePointer(e);
          }}
          className={`relative w-10 h-28 bg-[#f9fafb] border-2 border-[#d1d5db] flex justify-center touch-none py-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {/* Center Slot Channel */}
          <div className="w-1.5 h-full bg-[#ffffff] border border-[#ef4444]/20" />

          {/* Notch Gauge Marks */}
          {[0.25, 0.5, 0.75].map((lvl) => (
            <div
              key={lvl}
              style={{ bottom: `${lvl * 100}%` }}
              className="absolute left-1 right-1 h-[1px] bg-[#ef4444]/30 pointer-events-none"
            />
          ))}

          {/* Active Level Glow Bar */}
          <div
            style={{ height: `${normalized * 100}%` }}
            className="absolute bottom-1 w-1.5 bg-[#dc2626] pointer-events-none"
          />

          {/* Slider Knob */}
          <div
            id="height-slider-knob"
            style={{
              bottom: `calc(${normalized * 100}% - 8px)`,
            }}
            className="absolute w-9 h-4 bg-[#dc2626] border-2 border-[#991b1b] flex items-center justify-center pointer-events-none"
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-2 bg-[#f3f4f6]/60" />
              <div className="w-0.5 h-2 bg-[#f3f4f6]/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono text-[#4b5563]/80 pt-0.5 border-t border-[#d1d5db]">
        <span>CLEARANCE:</span>
        <span className="font-bold text-[#111827]">
          {heightValue < 0.3 ? 'LOW' : heightValue > 0.6 ? 'HIGH' : 'NORM'}
        </span>
      </div>
    </div>
  );
};
