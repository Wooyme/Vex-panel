import React, { useRef, useState, useEffect, useCallback } from 'react';
import { playJoystickTick, playArcadeClick } from '../utils/audio';

interface VirtualJoystickProps {
  id: string;
  title: string;
  subtitle?: string;
  xValue: number;
  yValue: number;
  onChange: (x: number, y: number) => void;
  colorTheme?: 'amber' | 'green' | 'orange';
  keyHints?: { up: string; down: string; left: string; right: string };
  size?: number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  id,
  title,
  subtitle,
  xValue,
  yValue,
  onChange,
  colorTheme = 'amber',
  keyHints,
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
        x: xValue * maxTravel,
        y: -yValue * maxTravel,
      });
    }
  }, [xValue, yValue, isInteracting, maxTravel]);

  const updateCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

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
    [maxTravel, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
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
      border: 'border-[#f59e0b]/50',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      puckBg: 'bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#b45309]',
      puckBorder: 'border-[#fef08a]',
      puckGlow: 'shadow-[0_0_10px_rgba(245,158,11,0.8),inset_0_1px_2px_rgba(255,255,255,0.6)]',
      badge: 'text-[#fbbf24] bg-[#f59e0b]/20 border-[#f59e0b]/40',
    },
    green: {
      border: 'border-[#22c55e]/50',
      glow: 'shadow-[0_0_10px_rgba(34,197,94,0.2)]',
      puckBg: 'bg-gradient-to-br from-[#86efac] via-[#22c55e] to-[#15803d]',
      puckBorder: 'border-[#bbf7d0]',
      puckGlow: 'shadow-[0_0_10px_rgba(34,197,94,0.8),inset_0_1px_2px_rgba(255,255,255,0.6)]',
      badge: 'text-[#4ade80] bg-[#22c55e]/20 border-[#22c55e]/40',
    },
    orange: {
      border: 'border-[#f97316]/50',
      glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]',
      puckBg: 'bg-gradient-to-br from-[#fdba74] via-[#f97316] to-[#c2410c]',
      puckBorder: 'border-[#ffedd5]',
      puckGlow: 'shadow-[0_0_10px_rgba(249,115,22,0.8),inset_0_1px_2px_rgba(255,255,255,0.6)]',
      badge: 'text-[#fb923c] bg-[#f97316]/20 border-[#f97316]/40',
    },
  }[colorTheme];

  return (
    <div
      id={`joystick-card-${id}`}
      className={`flex flex-col items-center justify-between p-2 bg-[#141a13] border-2 ${themeClasses.border} ${themeClasses.glow} select-none h-full`}
    >
      {/* Joystick Header */}
      <div className="w-full flex items-center justify-between border-b border-[#263024] pb-1 mb-1">
        <div>
          <h3 className="font-mono text-[11px] font-bold tracking-wider text-[#fef08a]">{title}</h3>
          {subtitle && <p className="font-mono text-[9px] text-[#fbbf24]/70">{subtitle}</p>}
        </div>
        <div className={`font-mono text-[10px] px-1 py-0.2 border ${themeClasses.badge}`}>
          {xValue > 0 ? `+${xValue.toFixed(1)}` : xValue.toFixed(1)}, {yValue > 0 ? `+${yValue.toFixed(1)}` : yValue.toFixed(1)}
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
        className="relative bg-[#0a0e0a] border-2 border-[#263024] shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)] flex items-center justify-center cursor-pointer touch-none active:border-[#f59e0b]/80 my-auto"
      >
        {/* Crosshair Guideline Grid */}
        <div className="absolute inset-1.5 border border-dashed border-[#263024]/60 pointer-events-none" />
        <div className="absolute w-full h-[1px] bg-[#263024]/50 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-[#263024]/50 pointer-events-none" />

        {/* Direction Indicators */}
        <span className="absolute top-0.5 text-[8px] font-mono text-[#fbbf24]/50">▲</span>
        <span className="absolute bottom-0.5 text-[8px] font-mono text-[#fbbf24]/50">▼</span>
        <span className="absolute left-1 text-[8px] font-mono text-[#fbbf24]/50">◀</span>
        <span className="absolute right-1 text-[8px] font-mono text-[#fbbf24]/50">▶</span>

        {/* Tactical Puck Cursor (No Stem) */}
        <div
          id={`joystick-knob-${id}`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: isInteracting ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          className="relative pointer-events-none z-10 flex items-center justify-center"
        >
          <div
            className={`w-8 h-8 border-2 ${themeClasses.puckBorder} ${themeClasses.puckBg} ${themeClasses.puckGlow} flex items-center justify-center`}
          >
            <div className="w-2 h-2 bg-[#141a13] border border-[#fef08a] flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-[#fef08a]" />
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Controls Hint */}
      {keyHints && (
        <div className="mt-1 flex items-center justify-center gap-1 font-mono text-[8px] text-[#fbbf24]/60">
          <span className="px-1 py-0.2 bg-[#0a0e0a] border border-[#263024] text-[#fef08a]">{keyHints.up}</span>
          <span className="px-1 py-0.2 bg-[#0a0e0a] border border-[#263024] text-[#fef08a]">{keyHints.left}</span>
          <span className="px-1 py-0.2 bg-[#0a0e0a] border border-[#263024] text-[#fef08a]">{keyHints.down}</span>
          <span className="px-1 py-0.2 bg-[#0a0e0a] border border-[#263024] text-[#fef08a]">{keyHints.right}</span>
        </div>
      )}
    </div>
  );
};
