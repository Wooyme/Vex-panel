import React, { useRef, useState, useEffect, useCallback } from 'react';
import { playJoystickTick, playArcadeClick } from '../utils/audio';

interface VirtualJoystickProps {
  id: string;
  title: string;
  subtitle?: string;
  xValue: number;
  yValue: number;
  xEnabled?: boolean;
  yEnabled?: boolean;
  onChange: (x: number, y: number) => void;
  colorTheme?: 'amber' | 'green' | 'orange';
  size?: number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  id,
  title,
  subtitle,
  xValue,
  yValue,
  xEnabled = true,
  yEnabled = true,
  onChange,
  colorTheme = 'amber',
  size = 110,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const radius = size / 2;
  const maxTravel = radius * 0.72;

  // Sync external values when not actively dragging
  useEffect(() => {
    if (!isInteracting) {
      setKnobPos({
        x: (xEnabled ? xValue : 0) * maxTravel,
        y: -(yEnabled ? yValue : 0) * maxTravel,
      });
    }
  }, [xEnabled, xValue, yEnabled, yValue, isInteracting, maxTravel]);

  useEffect(() => {
    setKnobPos((current) => ({
      x: xEnabled ? current.x : 0,
      y: yEnabled ? current.y : 0,
    }));
    if (!xEnabled && !yEnabled) {
      setIsInteracting(false);
      activePointerId.current = null;
    }
  }, [xEnabled, yEnabled]);

  const updateCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      if (!xEnabled) dx = 0;
      if (!yEnabled) dy = 0;

      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > maxTravel) {
        dx = (dx / distance) * maxTravel;
        dy = (dy / distance) * maxTravel;
      }

      setKnobPos({ x: dx, y: dy });

      const normX = Number((dx / maxTravel).toFixed(2));
      const normY = Number((-dy / maxTravel).toFixed(2));

      onChange(normX, normY);

      if (Math.abs(normX) > 0.6 || Math.abs(normY) > 0.6) {
        playJoystickTick();
      }
    },
    [maxTravel, onChange, xEnabled, yEnabled]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!xEnabled && !yEnabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    setIsInteracting(true);
    playArcadeClick(480);
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isInteracting || e.pointerId !== activePointerId.current) return;
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId === activePointerId.current) {
      setIsInteracting(false);
      activePointerId.current = null;
      setKnobPos({ x: 0, y: 0 });
      onChange(0, 0);
      playArcadeClick(320);
    }
  };

  const themeClasses = {
    amber: {
      border: 'border-[#dc2626]/50',
      puckBg: 'bg-[#dc2626]',
      puckBorder: 'border-[#991b1b]',
      badge: 'text-[#b91c1c] bg-[#dc2626]/20 border-[#dc2626]/40',
    },
    green: {
      border: 'border-[#ef4444]/50',
      puckBg: 'bg-[#ef4444]',
      puckBorder: 'border-[#fecaca]',
      badge: 'text-[#dc2626] bg-[#ef4444]/20 border-[#ef4444]/40',
    },
    orange: {
      border: 'border-[#b91c1c]/50',
      puckBg: 'bg-[#b91c1c]',
      puckBorder: 'border-[#fee2e2]',
      badge: 'text-[#dc2626] bg-[#b91c1c]/20 border-[#b91c1c]/40',
    },
  }[colorTheme];

  return (
    <div
      id={`joystick-card-${id}`}
      aria-disabled={!xEnabled && !yEnabled}
      className={`flex flex-col items-center justify-between p-2 bg-[#ffffff] border-2 ${themeClasses.border} select-none h-full ${!xEnabled && !yEnabled ? 'opacity-55' : ''}`}
    >
      {/* Joystick Header */}
      <div className="w-full flex items-center justify-between border-b border-[#d1d5db] pb-1 mb-1">
        <div>
          <h3 className="font-mono text-[11px] font-bold tracking-wider text-[#111827]">{title}</h3>
          {subtitle && <p className="font-mono text-[9px] text-[#b91c1c]/70">{subtitle}</p>}
        </div>
        <div className={`font-mono text-[10px] px-1 py-0.2 border ${themeClasses.badge}`}>
          {xEnabled && xValue > 0 ? '+' : ''}{xEnabled ? xValue.toFixed(1) : '0.0'}, {yEnabled && yValue > 0 ? '+' : ''}{yEnabled ? yValue.toFixed(1) : '0.0'}
        </div>
      </div>

      {/* Joystick Base Pad */}
      <div
        ref={containerRef}
        id={`joystick-pad-${id}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`relative bg-[#f9fafb] border-2 border-[#d1d5db] flex items-center justify-center touch-none active:border-[#dc2626]/80 my-auto ${!xEnabled && !yEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* Crosshair Guideline Grid */}
        <div className="absolute inset-1.5 border border-dashed border-[#d1d5db]/60 pointer-events-none" />
        <div className="absolute w-full h-[1px] bg-[#d1d5db]/50 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-[#d1d5db]/50 pointer-events-none" />

        {/* Direction Indicators */}
        <span className="absolute top-0.5 text-[8px] font-mono text-[#b91c1c]/50">▲</span>
        <span className="absolute bottom-0.5 text-[8px] font-mono text-[#b91c1c]/50">▼</span>
        <span className="absolute left-1 text-[8px] font-mono text-[#b91c1c]/50">◀</span>
        <span className="absolute right-1 text-[8px] font-mono text-[#b91c1c]/50">▶</span>

        {/* Tactical Puck Cursor (No Stem) */}
        <div
          id={`joystick-knob-${id}`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className="relative pointer-events-none z-10 flex items-center justify-center"
        >
          <div
            className={`w-8 h-8 border-2 ${themeClasses.puckBorder} ${themeClasses.puckBg} flex items-center justify-center`}
          >
            <div className="w-2 h-2 bg-[#ffffff] border border-[#111827] flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-[#111827]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
