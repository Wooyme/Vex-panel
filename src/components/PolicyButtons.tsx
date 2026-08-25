import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { RobotPolicy } from '../types/robot';
import { policyInputNames } from '../utils/policy';
import { playArcadeClick, playModeSwitchTone } from '../utils/audio';

interface PolicyButtonsProps {
  policies: RobotPolicy[];
  visiblePolicyNames: string[];
  activePolicyNames: string[];
  onTogglePolicy: (name: string) => void;
  onOpenConfigModal: () => void;
}

export const PolicyButtons: React.FC<PolicyButtonsProps> = ({
  policies,
  visiblePolicyNames,
  activePolicyNames,
  onTogglePolicy,
  onOpenConfigModal,
}) => {
  const visible = new Set(visiblePolicyNames);
  const visiblePolicies = policies.filter((policy) => visible.has(policy.name));

  return (
    <div className="flex h-full w-full select-none flex-col border-2 border-[#dc2626]/50 bg-white p-1.5">
      <div className="mb-1 flex w-full shrink-0 items-center justify-between border-b border-[#d1d5db] pb-1">
        <div className="flex min-w-0 items-center gap-2 font-mono">
          <h3 className="shrink-0 text-[10px] font-bold tracking-wider text-[#b91c1c]">POLICY MATRIX · 策略切换</h3>
          <span className="border border-[#ef4444]/30 bg-[#f3f4f6] px-1 py-0.5 text-[8px] text-[#4b5563]">
            {activePolicyNames.length} ACTIVE
          </span>
          <span className="hidden truncate text-[8px] text-[#6b7280] sm:inline">
            {activePolicyNames.join(' + ') || 'NO POLICY SELECTED'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            playArcadeClick(620);
            onOpenConfigModal();
          }}
          className="flex shrink-0 items-center gap-1 border border-[#dc2626]/50 bg-[#fff1f2] px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-[#b91c1c] hover:bg-[#fee2e2]"
          title="Configure policies received from MQTT"
        >
          <SlidersHorizontal className="h-2.5 w-2.5 text-[#dc2626]" />
          CONFIG
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        {visiblePolicies.length === 0 ? (
          <button
            type="button"
            onClick={onOpenConfigModal}
            className="flex h-full w-full items-center justify-center border border-dashed border-[#d1d5db] px-3 text-center font-mono text-[9px] text-[#b91c1c]/65"
          >
            {policies.length === 0 ? '等待 MQTT POLICY 列表' : '未选择 POLICY 按钮 · OPEN CONFIG'}
          </button>
        ) : (
          <div className="grid h-full min-w-max grid-flow-col grid-rows-2 auto-cols-[minmax(118px,168px)] gap-1">
            {visiblePolicies.map((policy) => {
              const active = activePolicyNames.includes(policy.name);
              const inputNames = policyInputNames(policy);
              return (
                <button
                  key={policy.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    playModeSwitchTone();
                    onTogglePolicy(policy.name);
                  }}
                  className={`flex min-w-0 cursor-pointer items-center justify-between gap-1 border px-1.5 py-0.5 text-left active:translate-y-px ${
                    active
                      ? 'border-[#991b1b] bg-[#b91c1c] font-bold text-white'
                      : 'border-[#d1d5db] bg-[#f3f4f6] text-[#b91c1c] hover:border-[#dc2626]/60 hover:bg-[#e5e7eb]'
                  }`}
                  title={`${policy.type}: ${inputNames.join(', ') || 'no inputs'}`}
                >
                  <span className="min-w-0 truncate font-mono text-[9px] font-bold leading-none tracking-wide">
                    {policy.name}
                  </span>
                  <span className={`shrink-0 font-mono text-[7px] leading-none ${active ? 'text-white/80' : 'text-[#6b7280]'}`}>
                    {policy.type.replace('_body', '').toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
