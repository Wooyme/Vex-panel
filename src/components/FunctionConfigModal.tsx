import React, { useState, useEffect } from 'react';
import { RobotFunctionItem } from '../types/robot';
import { playArcadeClick, playModeSwitchTone } from '../utils/audio';
import { CheckSquare, Square, X, SlidersHorizontal, Radio, Layers, RefreshCw } from 'lucide-react';

interface FunctionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSupportedFunctions: RobotFunctionItem[];
  selectedFunctionIds: string[];
  onSaveSelection: (newSelectedIds: string[]) => void;
  mqttTopic?: string;
  mqttConnected?: boolean;
}

export const FunctionConfigModal: React.FC<FunctionConfigModalProps> = ({
  isOpen,
  onClose,
  allSupportedFunctions,
  selectedFunctionIds,
  onSaveSelection,
  mqttTopic = 'robot/capabilities',
  mqttConnected = true,
}) => {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedFunctionIds);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedFunctionIds);
    }
  }, [isOpen, selectedFunctionIds]);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(allSupportedFunctions.map((f) => f.category)))];

  const filteredFunctions = filterCategory === 'ALL'
    ? allSupportedFunctions
    : allSupportedFunctions.filter((f) => f.category === filterCategory);

  const toggleFunction = (id: string) => {
    playArcadeClick(540);
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    playArcadeClick(680);
    setTempSelected(allSupportedFunctions.map((f) => f.id));
  };

  const handleSelectDefaults = () => {
    playArcadeClick(600);
    setTempSelected(
      allSupportedFunctions.filter((f) => f.defaultActive).map((f) => f.id)
    );
  };

  const handleClearAll = () => {
    playArcadeClick(400);
    setTempSelected([]);
  };

  const handleSave = () => {
    playModeSwitchTone();
    onSaveSelection(tempSelected);
    onClose();
  };

  return (
    <div
      id="function-config-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 select-none"
    >
      <div
        id="function-config-modal-dialog"
        className="w-full max-w-3xl max-h-[90vh] bg-[#0f140f] border-2 border-[#f59e0b] shadow-[0_0_30px_rgba(245,158,11,0.4)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3 bg-[#172016] border-b-2 border-[#f59e0b]/40">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#f59e0b]" />
            <div>
              <h2 className="font-mono text-sm sm:text-base font-black tracking-wider text-[#fbbf24] flex items-center gap-2">
                <span>FUNCTION CONFIGURATION</span>
                <span className="text-xs text-[#fef08a] bg-[#f59e0b]/20 px-1.5 py-0.5 border border-[#f59e0b]/50">
                  MQTT SUBSCRIBED LIST
                </span>
              </h2>
              <p className="font-mono text-[10px] text-[#86efac] flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 ${mqttConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'}`} />
                <span>TOPIC: {mqttTopic}</span>
                <span className="text-[#fbbf24]/50">|</span>
                <span>已选 {tempSelected.length} / 共 {allSupportedFunctions.length} 项功能</span>
              </p>
            </div>
          </div>

          <button
            id="close-func-modal-btn"
            onClick={onClose}
            className="p-1.5 text-[#fbbf24] hover:text-white bg-[#1c241a] hover:bg-[#991b1b] border border-[#f59e0b]/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs & Quick Batch Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#121812] border-b border-[#263024]">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playArcadeClick(480);
                  setFilterCategory(cat);
                }}
                className={`px-2 py-1 text-[10px] font-mono font-bold border transition-colors ${
                  filterCategory === cat
                    ? 'bg-[#f59e0b] text-[#141a13] border-[#fef08a]'
                    : 'bg-[#1c241a] text-[#fbbf24]/80 border-[#263024] hover:border-[#f59e0b]/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSelectAll}
              className="px-2 py-1 text-[10px] font-mono bg-[#1c241a] hover:bg-[#263024] text-[#86efac] border border-[#22c55e]/40"
            >
              全选 (ALL)
            </button>
            <button
              onClick={handleSelectDefaults}
              className="px-2 py-1 text-[10px] font-mono bg-[#1c241a] hover:bg-[#263024] text-[#fbbf24] border border-[#f59e0b]/40"
            >
              默认推荐 (DEFAULT)
            </button>
            <button
              onClick={handleClearAll}
              className="px-2 py-1 text-[10px] font-mono bg-[#1c241a] hover:bg-[#991b1b]/50 text-[#ef4444] border border-[#ef4444]/40"
            >
              清空 (CLEAR)
            </button>
          </div>
        </div>

        {/* Functions List / Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-[#0c100c] custom-scrollbar">
          {filteredFunctions.map((func) => {
            const isChecked = tempSelected.includes(func.id);
            return (
              <div
                key={func.id}
                id={`func-item-${func.id.toLowerCase()}`}
                onClick={() => toggleFunction(func.id)}
                className={`flex items-start gap-2.5 p-2.5 border-2 cursor-pointer transition-all duration-75 ${
                  isChecked
                    ? 'bg-[#172417] border-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                    : 'bg-[#141a13] border-[#263024] opacity-70 hover:opacity-100 hover:border-[#f59e0b]/60'
                }`}
              >
                <div className="pt-0.5">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-[#4ade80] fill-[#22c55e]/20" />
                  ) : (
                    <Square className="w-4 h-4 text-[#fbbf24]/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-mono text-xs font-bold tracking-wider text-[#fef08a]">
                      {func.name} {func.labelZh}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-[#0d120d] border border-[#263024] text-[#86efac]">
                      {func.type.toUpperCase()}
                    </span>
                  </div>

                  <p className="font-mono text-[9px] text-[#fbbf24]/70 leading-relaxed line-clamp-2">
                    {func.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3 bg-[#141a13] border-t-2 border-[#f59e0b]/40">
          <div className="text-[10px] font-mono text-[#86efac] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>勾选的功能将以同级按钮展示在主控制面板</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono bg-[#1c241a] hover:bg-[#263024] text-[#fbbf24] border border-[#263024]"
            >
              CANCEL 取消
            </button>
            <button
              id="apply-func-config-btn"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-mono font-bold bg-[#f59e0b] hover:bg-[#fbbf24] text-[#141a13] border-2 border-[#fef08a] shadow-[0_0_12px_rgba(245,158,11,0.6)] active:scale-95 transition-all"
            >
              SAVE & APPLY 应用到面板 ({tempSelected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
