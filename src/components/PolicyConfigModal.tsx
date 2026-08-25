import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Layers,
  SlidersHorizontal,
  Square,
  X,
} from 'lucide-react';
import { PolicyType, RobotPolicy } from '../types/robot';
import { policyInputNames } from '../utils/policy';
import { playArcadeClick, playModeSwitchTone } from '../utils/audio';

interface PolicyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  policies: RobotPolicy[];
  visiblePolicyNames: string[];
  onSaveSelection: (names: string[]) => void;
  mqttTopic: string;
  mqttConnected: boolean;
}

type PolicyFilter = 'all' | PolicyType;

const typeLabels: Record<PolicyType, string> = {
  full_body: '全身 FULL BODY',
  lower_body: '下肢 LOWER BODY',
  upper_body: '上肢 UPPER BODY',
};

export const PolicyConfigModal: React.FC<PolicyConfigModalProps> = ({
  isOpen,
  onClose,
  policies,
  visiblePolicyNames,
  onSaveSelection,
  mqttTopic,
  mqttConnected,
}) => {
  const [tempVisible, setTempVisible] = useState<string[]>(visiblePolicyNames);
  const [filter, setFilter] = useState<PolicyFilter>('all');

  useEffect(() => {
    if (!isOpen) return;
    setTempVisible(visiblePolicyNames);
    setFilter('all');
  }, [isOpen, visiblePolicyNames]);

  if (!isOpen) return null;

  const filteredPolicies = filter === 'all'
    ? policies
    : policies.filter((policy) => policy.type === filter);

  const toggleVisible = (name: string) => {
    playArcadeClick(540);
    setTempVisible((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const handleSave = () => {
    const available = new Set(policies.map((policy) => policy.name));
    playModeSwitchTone();
    onSaveSelection(tempVisible.filter((name) => available.has(name)));
    onClose();
  };

  const filters: Array<{ value: PolicyFilter; label: string }> = [
    { value: 'all', label: '全部 ALL' },
    { value: 'full_body', label: typeLabels.full_body },
    { value: 'lower_body', label: typeLabels.lower_body },
    { value: 'upper_body', label: typeLabels.upper_body },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6 select-none">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border-2 border-[#dc2626] bg-white">
        <div className="flex items-center justify-between border-b-2 border-[#dc2626]/40 bg-[#fff1f2] p-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[#dc2626]" />
            <div>
              <h2 className="flex items-center gap-2 font-mono text-sm font-black tracking-wider text-[#b91c1c] sm:text-base">
                <span>POLICY CONFIGURATION</span>
                <span className="border border-[#dc2626]/50 bg-[#dc2626]/20 px-1.5 py-0.5 text-xs text-[#111827]">
                  MQTT POLICY LIST
                </span>
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-[#4b5563]">
                <span className={`h-2 w-2 bg-[#ef4444] ${mqttConnected ? 'animate-pulse' : ''}`} />
                <span>TOPIC: {mqttTopic}</span>
                <span className="text-[#b91c1c]/50">|</span>
                <span>显示 {tempVisible.length} / 共 {policies.length} 个 policy</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#dc2626]/40 bg-[#f3f4f6] p-1.5 text-[#b91c1c] hover:bg-[#991b1b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d1d5db] bg-[#f9fafb] p-2.5">
          <div className="flex flex-wrap items-center gap-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  playArcadeClick(480);
                  setFilter(item.value);
                }}
                className={`border px-2 py-1 font-mono text-[10px] font-bold ${
                  filter === item.value
                    ? 'border-[#111827] bg-[#dc2626] text-white'
                    : 'border-[#d1d5db] bg-[#f3f4f6] text-[#b91c1c]/80 hover:border-[#dc2626]/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                playArcadeClick(680);
                setTempVisible(policies.map((policy) => policy.name));
              }}
              className="border border-[#ef4444]/40 bg-[#f3f4f6] px-2 py-1 font-mono text-[10px] text-[#4b5563] hover:bg-[#d1d5db]"
            >
              全选 ALL
            </button>
            <button
              type="button"
              onClick={() => {
                playArcadeClick(400);
                setTempVisible([]);
              }}
              className="border border-[#ef4444]/40 bg-[#f3f4f6] px-2 py-1 font-mono text-[10px] text-[#ef4444] hover:bg-[#991b1b]/50"
            >
              清空 CLEAR
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto bg-[#f9fafb] p-3 sm:grid-cols-2 lg:grid-cols-3 custom-scrollbar">
          {filteredPolicies.map((policy) => {
            const visible = tempVisible.includes(policy.name);
            const inputNames = policyInputNames(policy);
            return (
              <button
                key={policy.name}
                type="button"
                onClick={() => toggleVisible(policy.name)}
                className={`flex items-start gap-2.5 border-2 p-2.5 text-left ${
                  visible
                    ? 'border-[#ef4444] bg-[#fff1f2]'
                    : 'border-[#d1d5db] bg-white opacity-70 hover:border-[#dc2626]/60 hover:opacity-100'
                }`}
              >
                {visible ? (
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#b91c1c]/40" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate font-mono text-xs font-bold text-[#111827]">
                      {policy.name}
                    </span>
                    <span className="shrink-0 border border-[#d1d5db] bg-[#f3f4f6] px-1 py-0.5 font-mono text-[8px] text-[#4b5563]">
                      {policy.type.replace('_body', '').toUpperCase()}
                    </span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {inputNames.map((input) => (
                      <span key={input} className="border border-[#dc2626]/30 bg-white px-1 py-0.5 font-mono text-[8px] text-[#b91c1c]">
                        {input}
                      </span>
                    ))}
                    {inputNames.length === 0 && (
                      <span className="font-mono text-[8px] text-[#6b7280]">NO CONTROL INPUTS</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
          {filteredPolicies.length === 0 && (
            <div className="col-span-full flex min-h-40 items-center justify-center border border-dashed border-[#d1d5db] bg-white font-mono text-xs text-[#6b7280]">
              NO POLICIES RECEIVED
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t-2 border-[#dc2626]/40 bg-white p-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#4b5563]">
            <Layers className="h-3.5 w-3.5 text-[#dc2626]" />
            <span>勾选项将作为 policy 按钮显示在主控制面板</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="border border-[#d1d5db] bg-[#f3f4f6] px-3 py-1.5 font-mono text-xs text-[#b91c1c] hover:bg-[#d1d5db]">
              CANCEL 取消
            </button>
            <button type="button" onClick={handleSave} className="border-2 border-[#991b1b] bg-[#dc2626] px-4 py-1.5 font-mono text-xs font-bold text-white hover:bg-[#b91c1c]">
              SAVE & APPLY ({tempVisible.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
