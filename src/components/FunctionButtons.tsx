import React from 'react';
import { RobotControlState, RobotFunctionItem, GaitMode, PostureState } from '../types/robot';
import { playModeSwitchTone, playArcadeClick } from '../utils/audio';
import { SlidersHorizontal, Layers, CheckCircle2 } from 'lucide-react';

interface FunctionButtonsProps {
  controlState: RobotControlState;
  onUpdateControl: (update: Partial<RobotControlState>) => void;
  onResetSim: () => void;
  allSupportedFunctions: RobotFunctionItem[];
  selectedFunctionIds: string[];
  onOpenConfigModal: () => void;
}

export const FunctionButtons: React.FC<FunctionButtonsProps> = ({
  controlState,
  onUpdateControl,
  allSupportedFunctions,
  selectedFunctionIds,
  onOpenConfigModal,
}) => {
  // Filter active functions configured by user from the MQTT subscribed list
  const activeFunctionList = allSupportedFunctions.filter((f) =>
    selectedFunctionIds.includes(f.id)
  );

  const handleFunctionClick = (func: RobotFunctionItem) => {
    playModeSwitchTone();
    if (func.type === 'gait') {
      onUpdateControl({ gait: func.id as GaitMode, activeAction: null });
    } else if (func.type === 'posture') {
      onUpdateControl({ posture: func.id as PostureState, activeAction: null });
    } else {
      // Action or Mode trigger
      const nextAction = controlState.activeAction === func.id ? null : func.id;
      onUpdateControl({ activeAction: nextAction });
    }
  };

  const isFunctionActive = (func: RobotFunctionItem) => {
    if (func.type === 'gait') return controlState.gait === func.id;
    if (func.type === 'posture') return controlState.posture === func.id;
    return controlState.activeAction === func.id;
  };

  // Uniform standard button styling for all equal-level function buttons
  const getStandardBtnStyle = (isActive: boolean) => {
    return isActive
      ? 'bg-[#fbbf24] text-[#141a13] border-[#fef08a] shadow-[0_0_10px_rgba(245,158,11,0.6)] font-bold'
      : 'bg-[#1c241a] text-[#fbbf24] border-[#263024] hover:border-[#f59e0b]/60 hover:bg-[#263024]';
  };

  return (
    <div
      id="function-buttons-panel"
      className="flex flex-col justify-between p-2 bg-[#141a13] border-2 border-[#f59e0b]/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] select-none h-full"
    >
      {/* Panel Top Header: Matrix title & Config Modal trigger */}
      <div className="w-full flex items-center justify-between border-b border-[#263024] pb-1.5 mb-1 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs font-bold tracking-wider text-[#fbbf24]">
            FUNCTION MATRIX
          </h3>
          <span className="text-[10px] font-mono text-[#f97316]">功 能 切 换</span>
          <span className="text-[9px] font-mono text-[#86efac] bg-[#0d120d] px-1.5 py-0.2 border border-[#22c55e]/30">
            {activeFunctionList.length} ACTIVE
          </span>
        </div>

        {/* Modal Opener Button */}
        <button
          id="open-function-config-btn"
          onClick={() => {
            playArcadeClick(620);
            onOpenConfigModal();
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1f291c] hover:bg-[#2a3826] text-[#fbbf24] border border-[#f59e0b]/50 text-[10px] font-mono font-bold tracking-wider active:scale-95 transition-all shadow-sm"
          title="Configure functions subscribed from MQTT"
        >
          <SlidersHorizontal className="w-3 h-3 text-[#f59e0b]" />
          <span>配置功能 (CONFIG)</span>
        </button>
      </div>

      {/* Unified All-in-One Function Buttons Grid (Same Hierarchy, No Gait/Posture Separation) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar my-auto">
        {activeFunctionList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-3 text-center border border-dashed border-[#263024]">
            <p className="text-xs font-mono text-[#fbbf24]/60 mb-2">未勾选任何功能按钮</p>
            <button
              onClick={onOpenConfigModal}
              className="px-3 py-1 bg-[#f59e0b] text-[#141a13] text-xs font-mono font-bold border border-[#fef08a]"
            >
              点击打开配置面板 (SELECT FUNCTIONS)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 h-full items-stretch content-center">
            {activeFunctionList.map((func) => {
              const active = isFunctionActive(func);
              return (
                <button
                  key={func.id}
                  id={`func-btn-${func.id.toLowerCase()}`}
                  onClick={() => handleFunctionClick(func)}
                  className={`flex flex-col items-center justify-center py-2 px-1 border transition-all duration-75 text-center active:scale-95 cursor-pointer ${getStandardBtnStyle(
                    active
                  )}`}
                  title={`${func.name} - ${func.description}`}
                >
                  <span className="font-mono text-[11px] leading-tight font-bold tracking-wider">
                    {func.name}
                  </span>
                  <span
                    className={`text-[9px] leading-tight mt-0.5 ${
                      active ? 'text-[#141a13]/90 font-bold' : 'text-[#fbbf24]/70'
                    }`}
                  >
                    {func.labelZh}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel Bottom Footer Bar */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono text-[#86efac]/80 pt-1 border-t border-[#263024] shrink-0">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
          <span>MQTT SYNC: ALL CONTROLS SAME TIER (同级控制)</span>
        </span>
        <span className="text-[#fef08a]">
          GAIT: {controlState.gait} | POSTURE: {controlState.posture}
          {controlState.activeAction ? ` | ACT: ${controlState.activeAction}` : ''}
        </span>
      </div>
    </div>
  );
};
