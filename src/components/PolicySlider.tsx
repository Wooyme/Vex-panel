import React from 'react';
import { RotateCcw } from 'lucide-react';
import { PolicyInputParameter } from '../types/robot';
import { playArcadeClick, playSliderTick } from '../utils/audio';

interface PolicySliderProps {
  id: string;
  parameter: PolicyInputParameter;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function displayValue(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export const PolicySlider: React.FC<PolicySliderProps> = ({
  id,
  parameter,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div
      id={`policy-slider-${id}`}
      aria-disabled={disabled}
      className={`flex h-full min-w-[150px] flex-1 flex-col justify-between border border-[#ef4444]/45 bg-white p-2 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-[#111827]">
            {parameter.name}
          </h4>
          <p className="font-mono text-[8px] text-[#6b7280]">PARAMETER SLIDER</p>
        </div>
        <span className="border border-[#ef4444]/40 bg-[#fff1f2] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#b91c1c]">
          {displayValue(value)}
        </span>
      </div>

      <div className="my-2">
        <input
          aria-label={`${parameter.name} input`}
          type="range"
          min={parameter.min}
          max={parameter.max}
          step="any"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = Math.max(parameter.min, Math.min(parameter.max, Number(event.target.value)));
            onChange(next);
            const nextNormalized = (next - parameter.min) / (parameter.max - parameter.min);
            playSliderTick(400 + Math.floor(nextNormalized * 300));
          }}
          className="policy-range-slider w-full cursor-pointer accent-[#dc2626] disabled:cursor-not-allowed"
        />
        <div className="mt-0.5 flex justify-between font-mono text-[8px] text-[#6b7280]">
          <span>{displayValue(parameter.min)}</span>
          <span>{displayValue(parameter.max)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#d1d5db] pt-1 font-mono text-[8px] text-[#6b7280]">
        <span>DEFAULT {displayValue(parameter.default)}</span>
        <button
          type="button"
          aria-label={`Reset ${parameter.name} to default`}
          disabled={disabled || value === parameter.default}
          onClick={() => {
            playArcadeClick(560);
            onChange(parameter.default);
          }}
          className="flex items-center gap-1 border border-[#d1d5db] px-1 py-0.5 text-[#b91c1c] hover:border-[#dc2626] disabled:cursor-default disabled:opacity-35"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          RESET
        </button>
      </div>
    </div>
  );
};
