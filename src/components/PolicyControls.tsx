import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { RobotPolicy } from '../types/robot';
import { VirtualJoystick } from './VirtualJoystick';
import { PolicySlider } from './PolicySlider';

interface PolicyControlsProps {
  policies: RobotPolicy[];
  activePolicyNames: string[];
  values: Record<string, Record<string, number>>;
  disabled?: boolean;
  onChange: (policyName: string, parameterName: string, value: number) => void;
}

function domId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export const PolicyControls: React.FC<PolicyControlsProps> = ({
  policies,
  activePolicyNames,
  values,
  disabled = false,
  onChange,
}) => {
  const byName = new Map(policies.map((policy) => [policy.name, policy]));
  const activePolicies = activePolicyNames.flatMap((name) => {
    const policy = byName.get(name);
    return policy ? [policy] : [];
  });

  if (activePolicies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center border-2 border-dashed border-[#d1d5db] bg-white px-4 text-center font-mono text-[11px] text-[#6b7280]">
        SELECT A POLICY TO LOAD ITS CONTROL COMPONENTS · 请选择策略以加载交互组件
      </div>
    );
  }

  return (
    <div className="flex h-full gap-1.5 overflow-x-auto custom-scrollbar">
      {activePolicies.map((policy) => (
        <section
          key={policy.name}
          className="flex h-full min-w-[360px] flex-1 flex-col border-2 border-[#dc2626]/45 bg-[#f9fafb] p-1.5"
        >
          <header className="mb-1 flex shrink-0 items-center justify-between border-b border-[#d1d5db] pb-1 font-mono">
            <span className="flex min-w-0 items-center gap-1.5">
              <Gamepad2 className="h-3.5 w-3.5 shrink-0 text-[#dc2626]" />
              <span className="truncate text-[10px] font-bold tracking-wider text-[#111827]">{policy.name}</span>
            </span>
            <span className="shrink-0 border border-[#d1d5db] bg-white px-1 py-0.5 text-[8px] text-[#6b7280]">
              {policy.type.replace('_body', '').toUpperCase()} · {policy.inputs.length} COMPONENTS
            </span>
          </header>

          {policy.inputs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-[#d1d5db] bg-white font-mono text-[10px] text-[#6b7280]">
              THIS POLICY HAS NO MANUAL INPUTS
            </div>
          ) : (
            <div className="flex min-w-max flex-1 gap-1.5">
              {policy.inputs.map((input, index) => {
                const id = `${domId(policy.name)}-${index}`;
                if (input.type === 'joystick') {
                  return (
                    <VirtualJoystick
                      key={id}
                      id={id}
                      title="JOYSTICK"
                      subtitle={`${input.x.name.toUpperCase()} / ${input.y.name.toUpperCase()}`}
                      xParameter={input.x}
                      yParameter={input.y}
                      xValue={values[policy.name]?.[input.x.name] ?? input.x.default}
                      yValue={values[policy.name]?.[input.y.name] ?? input.y.default}
                      disabled={disabled}
                      onChange={(x, y) => {
                        onChange(policy.name, input.x.name, x);
                        onChange(policy.name, input.y.name, y);
                      }}
                    />
                  );
                }
                return (
                  <PolicySlider
                    key={id}
                    id={id}
                    parameter={input.parameter}
                    value={values[policy.name]?.[input.parameter.name] ?? input.parameter.default}
                    disabled={disabled}
                    onChange={(value) => onChange(policy.name, input.parameter.name, value)}
                  />
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};
