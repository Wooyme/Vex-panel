import React from 'react';
import { CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { RobotPolicy } from '../types/robot';
import { activePolicyInputs } from '../utils/policy';
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
  const inputs = [...activePolicyInputs(activePolicyNames, policies)];

  return (
    <div className="flex h-full select-none flex-col justify-between border-2 border-[#dc2626]/50 bg-white p-2">
      <div className="mb-1 flex w-full shrink-0 items-center justify-between border-b border-[#d1d5db] pb-1.5">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs font-bold tracking-wider text-[#b91c1c]">POLICY MATRIX</h3>
          <span className="font-mono text-[10px] text-[#b91c1c]">策 略 切 换</span>
          <span className="border border-[#ef4444]/30 bg-[#f3f4f6] px-1.5 py-0.5 font-mono text-[9px] text-[#4b5563]">
            {activePolicyNames.length} ACTIVE
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            playArcadeClick(620);
            onOpenConfigModal();
          }}
          className="flex items-center gap-1.5 border border-[#dc2626]/50 bg-[#fff1f2] px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#b91c1c] hover:bg-[#fee2e2]"
          title="Configure policies received from MQTT"
        >
          <SlidersHorizontal className="h-3 w-3 text-[#dc2626]" />
          <span>配置策略 CONFIG</span>
        </button>
      </div>

      <div className="my-auto min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {visiblePolicies.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center border border-dashed border-[#d1d5db] p-3 text-center">
            <p className="mb-2 font-mono text-xs text-[#b91c1c]/60">
              {policies.length === 0 ? '等待 MQTT POLICY 列表' : '未选择任何 POLICY 按钮'}
            </p>
            <button type="button" onClick={onOpenConfigModal} className="border border-[#111827] bg-[#dc2626] px-3 py-1 font-mono text-xs font-bold text-white">
              打开 POLICY 配置
            </button>
          </div>
        ) : (
          <div className="grid h-full grid-cols-4 content-center items-stretch gap-1.5 sm:grid-cols-5 md:grid-cols-6">
            {visiblePolicies.map((policy) => {
              const active = activePolicyNames.includes(policy.name);
              return (
                <button
                  key={policy.name}
                  type="button"
                  onClick={() => {
                    playModeSwitchTone();
                    onTogglePolicy(policy.name);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center border px-1 py-2 text-center active:translate-y-px ${
                    active
                      ? 'border-[#991b1b] bg-[#b91c1c] font-bold text-white'
                      : 'border-[#d1d5db] bg-[#f3f4f6] text-[#b91c1c] hover:border-[#dc2626]/60 hover:bg-[#d1d5db]'
                  }`}
                  title={`${policy.type}: ${policy.inputs.join(', ') || 'no inputs'}`}
                >
                  <span className="max-w-full truncate font-mono text-[11px] font-bold leading-tight tracking-wider">
                    {policy.name}
                  </span>
                  <span className={`mt-0.5 text-[8px] leading-tight ${active ? 'text-white/90' : 'text-[#b91c1c]/70'}`}>
                    {policy.type.replace('_body', '').toUpperCase()} · {policy.inputs.join('/') || 'NONE'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex w-full shrink-0 items-center justify-between border-t border-[#d1d5db] pt-1 font-mono text-[9px] text-[#4b5563]/80">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-[#ef4444]" />
          INPUTS: {inputs.join(' / ') || 'NONE'}
        </span>
        <span className="max-w-[55%] truncate text-[#111827]">
          POLICY: {activePolicyNames.join(' + ') || 'NONE'}
        </span>
      </div>
    </div>
  );
};
