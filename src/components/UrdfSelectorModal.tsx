import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileCode,
  LoaderCircle,
  RadioTower,
  Search,
  Tags,
  X,
} from 'lucide-react';
import {
  defaultMotionTopicForModel,
  listModels,
  ModelInfo,
} from '../api/manager';
import { RobotAppearancePreset } from '../types/robot';
import { playArcadeClick, playModeSwitchTone } from '../utils/audio';
import {
  ROBOT_APPEARANCE_PRESET_NAMES,
  ROBOT_APPEARANCE_PRESETS,
} from '../utils/robotAppearance';

interface UrdfSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    model: ModelInfo,
    motionTopic: string,
    fallbackMotionTopic: string | undefined,
    forceFallbackBasePose: boolean,
    appearancePreset: RobotAppearancePreset,
  ) => void;
}

const appearanceButtonClasses: Record<RobotAppearancePreset, string> = {
  original: 'bg-white text-[#374151]',
  red_translucent: 'bg-[#ef4444]/70 text-white',
  green_translucent: 'bg-[#22c55e]/70 text-white',
  blue_translucent: 'bg-[#3b82f6]/70 text-white',
  purple_translucent: 'bg-[#a855f7]/70 text-white',
};

export const UrdfSelectorModal: React.FC<UrdfSelectorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [motionTopic, setMotionTopic] = useState('');
  const [fallbackMotionTopic, setFallbackMotionTopic] = useState('');
  const [forceFallbackBasePose, setForceFallbackBasePose] = useState(false);
  const [appearancePreset, setAppearancePreset] = useState<RobotAppearancePreset>('original');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setModels([]);
    setNameQuery('');
    setSelectedTag('');
    setSelectedModel(null);
    setMotionTopic('');
    setFallbackMotionTopic('');
    setForceFallbackBasePose(false);
    setAppearancePreset('original');
    setErrorMessage(null);
    setLoading(true);

    listModels()
      .then(({ data }) => {
        if (active) setModels(data);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const tags = useMemo(
    () => [...new Set(models.flatMap((model) => model.tag))].sort(),
    [models],
  );

  const filteredModels = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return models.filter(
      (model) =>
        (!selectedTag || model.tag.includes(selectedTag)) &&
        model.filename.toLowerCase().includes(query),
    );
  }, [models, nameQuery, selectedTag]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedModel) return;
    const topic = motionTopic.trim();
    if (!topic) return;
    playModeSwitchTone();
    onConfirm(
      selectedModel,
      topic,
      fallbackMotionTopic.trim() || undefined,
      Boolean(fallbackMotionTopic.trim()) && forceFallbackBasePose,
      appearancePreset,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6 select-none">
      <div className="flex h-[560px] max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border-2 border-[#dc2626] bg-white">
        <div className="flex items-center justify-between border-b-2 border-[#dc2626]/40 bg-[#fff1f2] p-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-[#dc2626]" />
            <div>
              <h2 className="font-mono text-sm font-black tracking-wider text-[#b91c1c] sm:text-base">
                ADD URDF TO SCENE
              </h2>
              <p className="font-mono text-[10px] text-[#4b5563]">
                从本地模型库选择一个 URDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#dc2626]/40 p-1.5 text-[#b91c1c] hover:bg-[#991b1b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-[#d1d5db] bg-[#f9fafb] p-3 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              placeholder="Search by filename..."
              className="w-full border border-[#d1d5db] bg-white py-2 pl-8 pr-2 font-mono text-xs text-[#111827] outline-none focus:border-[#dc2626]"
            />
          </label>
          <label className="relative">
            <Tags className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              className="w-full appearance-none border border-[#d1d5db] bg-white py-2 pl-8 pr-2 font-mono text-xs text-[#111827] outline-none focus:border-[#dc2626]"
            >
              <option value="">ALL TAGS</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="border-b border-[#d1d5db] bg-white px-3 py-1.5 font-mono text-[10px] text-[#4b5563]">
          {filteredModels.length} URDF FILE{filteredModels.length === 1 ? '' : 'S'}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] p-3">
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-[#b91c1c]">
              <LoaderCircle className="h-5 w-5 animate-spin" /> LOADING MODEL LIST...
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex items-center gap-2 border border-[#ef4444] bg-[#fff1f2] p-3 font-mono text-xs text-[#b91c1c]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>无法读取 URDF 列表：{errorMessage}</span>
            </div>
          )}

          {!loading && !errorMessage && (
            <div className="space-y-1.5">
              {filteredModels.map((model) => {
                const selected = selectedModel?.path === model.path;
                return (
                  <button
                    key={model.path}
                    type="button"
                    onClick={() => {
                      if (selectedModel?.path !== model.path) {
                        setMotionTopic(defaultMotionTopicForModel(model));
                        setFallbackMotionTopic('');
                        setForceFallbackBasePose(false);
                      }
                      setSelectedModel(model);
                      playArcadeClick(620);
                    }}
                    className={`flex w-full items-center gap-3 border p-2.5 text-left ${
                      selected
                        ? 'border-[#dc2626] bg-[#fff1f2]'
                        : 'border-[#d1d5db] bg-white hover:border-[#dc2626]/60'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#dc2626] bg-[#dc2626]' : 'border-[#9ca3af]'}`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold text-[#111827]">
                        {model.filename}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[9px] text-[#6b7280]">
                        {model.path}
                      </span>
                    </span>
                    <span className="flex max-w-[45%] flex-wrap justify-end gap-1">
                      {model.tag.map((tag) => (
                        <span key={tag} className="border border-[#dc2626]/30 bg-[#fee2e2] px-1.5 py-0.5 font-mono text-[8px] text-[#b91c1c]">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}

              {filteredModels.length === 0 && (
                <div className="border border-dashed border-[#d1d5db] bg-white p-10 text-center font-mono text-xs text-[#6b7280]">
                  NO MATCHING URDF FILES
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-[#d1d5db] bg-[#f9fafb] px-3 py-2.5 sm:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <label className="block font-mono text-[10px] text-[#4b5563]">
              <span className="mb-1 flex items-center gap-1">
                <RadioTower className="h-3 w-3" /> MQTT MOTION TOPIC
              </span>
              <input
                value={motionTopic}
                disabled={!selectedModel}
                onChange={(event) => setMotionTopic(event.target.value)}
                placeholder="Select a URDF to generate its default topic"
                className="w-full border border-[#d1d5db] bg-white px-2 py-1.5 font-mono text-xs text-[#111827] outline-none focus:border-[#dc2626] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
              />
            </label>
            <div className="block font-mono text-[10px] text-[#4b5563]">
              <span className="mb-1 flex items-center gap-1">
                <RadioTower className="h-3 w-3" /> BASE XYZ FALLBACK TOPIC (OPTIONAL)
              </span>
              <div className="flex items-stretch gap-1">
                <input
                  aria-label="Base XYZ fallback topic"
                  value={fallbackMotionTopic}
                  disabled={!selectedModel}
                  onChange={(event) => {
                    const topic = event.target.value;
                    setFallbackMotionTopic(topic);
                    if (!topic.trim()) setForceFallbackBasePose(false);
                  }}
                  placeholder="Used when primary base_xyz is [0, 0, 0]"
                  className="min-w-0 flex-1 border border-[#d1d5db] bg-white px-2 py-1.5 font-mono text-xs text-[#111827] outline-none focus:border-[#dc2626] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
                />
                <label
                  title="无条件使用回退主题的 XYZ 和四元数"
                  className={`flex min-h-8 shrink-0 items-center gap-1.5 border px-2 py-1.5 font-mono text-[9px] ${
                    fallbackMotionTopic.trim()
                      ? 'border-[#dc2626]/40 bg-white text-[#4b5563]'
                      : 'border-[#d1d5db] bg-[#f3f4f6] text-[#9ca3af]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={forceFallbackBasePose}
                    disabled={!selectedModel || !fallbackMotionTopic.trim()}
                    onChange={(event) => setForceFallbackBasePose(event.target.checked)}
                    className="h-4 w-4 accent-[#dc2626]"
                  />
                  <span>强制覆盖</span>
                </label>
              </div>
            </div>
          </div>
          <fieldset className="font-mono text-[10px] text-[#4b5563]">
            <legend className="mb-1">URDF 外观预设</legend>
            <div className="grid grid-cols-5 gap-1">
              {ROBOT_APPEARANCE_PRESET_NAMES.map((presetName) => {
                const preset = ROBOT_APPEARANCE_PRESETS[presetName];
                const active = appearancePreset === presetName;
                return (
                  <button
                    key={presetName}
                    type="button"
                    aria-pressed={active}
                    title={`${preset.label}${preset.opacity === null ? '' : '半透明'}`}
                    onClick={() => setAppearancePreset(presetName)}
                    className={`min-h-8 border px-1 py-1 text-[9px] font-bold ${appearanceButtonClasses[presetName]} ${
                      active
                        ? 'border-[#111827] ring-1 ring-[#111827] ring-inset'
                        : 'border-[#d1d5db] opacity-75'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex items-center justify-between border-t-2 border-[#dc2626]/40 bg-white p-3">
          <span className="text-[9px] font-mono text-[#4b5563]">LOCAL MODELS • URDF-LOADER • MQTT MOTION</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="border border-[#d1d5db] bg-[#f3f4f6] px-3 py-1.5 font-mono text-xs text-[#b91c1c] hover:bg-[#d1d5db]">
              CANCEL
            </button>
            <button
              type="button"
              disabled={!selectedModel || !motionTopic.trim()}
              onClick={handleConfirm}
              className="border-2 border-[#111827] bg-[#dc2626] px-4 py-1.5 font-mono text-xs font-bold text-white hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:border-[#9ca3af] disabled:bg-[#d1d5db]"
            >
              ADD TO SCENE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
