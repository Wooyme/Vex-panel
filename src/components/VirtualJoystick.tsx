import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PolicyInputParameter } from '../types/robot';
import { axisToParameterValue, parameterValueToAxis } from '../utils/policy';
import { playArcadeClick, playJoystickTick } from '../utils/audio';

interface VirtualJoystickProps {
  id: string;
  title: string;
  subtitle?: string;
  xParameter: PolicyInputParameter;
  yParameter: PolicyInputParameter;
  xValue: number;
  yValue: number;
  onChange: (x: number, y: number) => void;
  disabled?: boolean;
  size?: number;
}

function displayValue(value: number): string {
  return Number(value.toFixed(3)).toString();
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  id,
  title,
  subtitle,
  xParameter,
  yParameter,
  xValue,
  yValue,
  onChange,
  disabled = false,
  size = 96,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const maxTravel = (size / 2) * 0.7;

  useEffect(() => {
    if (isInteracting) return;
    setKnobPos({
      x: parameterValueToAxis(xValue, xParameter) * maxTravel,
      y: -parameterValueToAxis(yValue, yParameter) * maxTravel,
    });
  }, [isInteracting, maxTravel, xParameter, xValue, yParameter, yValue]);

  useEffect(() => {
    if (!disabled) return;
    setIsInteracting(false);
    activePointerId.current = null;
  }, [disabled]);

  const updateCoordinates = useCallback((clientX: number, clientY: number) => {
    if (disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > maxTravel) {
      dx = (dx / distance) * maxTravel;
      dy = (dy / distance) * maxTravel;
    }

    setKnobPos({ x: dx, y: dy });
    const axisX = Math.max(-1, Math.min(1, dx / maxTravel));
    const axisY = Math.max(-1, Math.min(1, -dy / maxTravel));
    onChange(
      axisToParameterValue(axisX, xParameter),
      axisToParameterValue(axisY, yParameter),
    );
    if (Math.abs(axisX) > 0.6 || Math.abs(axisY) > 0.6) playJoystickTick();
  }, [disabled, maxTravel, onChange, xParameter, yParameter]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    setIsInteracting(true);
    playArcadeClick(480);
    updateCoordinates(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteracting || event.pointerId !== activePointerId.current) return;
    updateCoordinates(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointerId.current) return;
    setIsInteracting(false);
    activePointerId.current = null;
    onChange(xParameter.default, yParameter.default);
    playArcadeClick(320);
  };

  return (
    <div
      id={`joystick-card-${id}`}
      aria-disabled={disabled}
      className={`flex h-full min-w-[190px] items-center gap-2 border border-[#dc2626]/45 bg-white p-1.5 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="min-w-0 flex-1 self-stretch">
        <h4 className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-[#111827]">
          {title}
        </h4>
        {subtitle && <p className="truncate font-mono text-[8px] text-[#b91c1c]/65">{subtitle}</p>}
        <dl className="mt-2 space-y-1 font-mono text-[9px]">
          <div className="border-l-2 border-[#dc2626] pl-1">
            <dt className="truncate text-[#6b7280]">X · {xParameter.name}</dt>
            <dd className="font-bold text-[#111827]">{displayValue(xValue)}</dd>
          </div>
          <div className="border-l-2 border-[#ef4444] pl-1">
            <dt className="truncate text-[#6b7280]">Y · {yParameter.name}</dt>
            <dd className="font-bold text-[#111827]">{displayValue(yValue)}</dd>
          </div>
        </dl>
      </div>

      <div
        ref={containerRef}
        id={`joystick-pad-${id}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: size, height: size }}
        className={`relative flex shrink-0 touch-none items-center justify-center border-2 border-[#d1d5db] bg-[#f9fafb] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer active:border-[#dc2626]'}`}
      >
        <div className="pointer-events-none absolute inset-1.5 border border-dashed border-[#d1d5db]/70" />
        <div className="pointer-events-none absolute h-px w-full bg-[#d1d5db]/60" />
        <div className="pointer-events-none absolute h-full w-px bg-[#d1d5db]/60" />
        <span className="absolute top-0 text-[7px] text-[#b91c1c]/50">▲</span>
        <span className="absolute bottom-0 text-[7px] text-[#b91c1c]/50">▼</span>
        <span className="absolute left-0.5 text-[7px] text-[#b91c1c]/50">◀</span>
        <span className="absolute right-0.5 text-[7px] text-[#b91c1c]/50">▶</span>
        <div
          id={`joystick-knob-${id}`}
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
          className="pointer-events-none relative z-10 flex h-7 w-7 items-center justify-center border-2 border-[#991b1b] bg-[#dc2626]"
        >
          <div className="h-2 w-2 border border-[#111827] bg-white" />
        </div>
      </div>
    </div>
  );
};
