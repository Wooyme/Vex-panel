import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  LoaderCircle,
  Mountain,
  Search,
  Tags,
  X,
} from 'lucide-react';
import { listTerrains, TerrainInfo } from '../api/manager';
import { playArcadeClick, playModeSwitchTone } from '../utils/audio';

interface TerrainSelectorModalProps {
  isOpen: boolean;
  hasActiveTerrain: boolean;
  onClose: () => void;
  onClear: () => void;
  onConfirm: (terrain: TerrainInfo) => void;
}

export const TerrainSelectorModal: React.FC<TerrainSelectorModalProps> = ({
  isOpen,
  hasActiveTerrain,
  onClose,
  onClear,
  onConfirm,
}) => {
  const [terrains, setTerrains] = useState<TerrainInfo[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setTerrains([]);
    setNameQuery('');
    setSelectedTag('');
    setSelectedTerrain(null);
    setErrorMessage(null);
    setLoading(true);

    listTerrains()
      .then(({ data }) => {
        if (active) setTerrains(data);
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
    () => [...new Set(terrains.flatMap((terrain) => terrain.tag))].sort(),
    [terrains],
  );

  const filteredTerrains = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return terrains.filter(
      (terrain) =>
        (!selectedTag || terrain.tag.includes(selectedTag)) &&
        terrain.filename.toLowerCase().includes(query),
    );
  }, [nameQuery, selectedTag, terrains]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedTerrain) return;
    playModeSwitchTone();
    onConfirm(selectedTerrain);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6 select-none">
      <div className="flex h-[480px] max-h-[90vh] w-full max-w-xl flex-col overflow-hidden border-2 border-[#dc2626] bg-white">
        <div className="flex items-center justify-between border-b-2 border-[#dc2626]/40 bg-[#fff1f2] p-3">
          <div className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-[#dc2626]" />
            <div>
              <h2 className="font-mono text-sm font-black tracking-wider text-[#b91c1c] sm:text-base">
                LOAD TERRAIN
              </h2>
              <p className="font-mono text-[10px] text-[#4b5563]">
                从本地地形库选择一个 OBJ
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close terrain selector"
            onClick={onClose}
            className="border border-[#dc2626]/40 p-1.5 text-[#b91c1c] hover:bg-[#991b1b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-[#d1d5db] bg-[#f9fafb] p-3 sm:grid-cols-[1fr_160px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              placeholder="Search terrain..."
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
          {filteredTerrains.length} OBJ TERRAIN{filteredTerrains.length === 1 ? '' : 'S'}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] p-3">
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-[#b91c1c]">
              <LoaderCircle className="h-5 w-5 animate-spin" /> LOADING TERRAIN LIST...
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex items-center gap-2 border border-[#ef4444] bg-[#fff1f2] p-3 font-mono text-xs text-[#b91c1c]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>无法读取地形列表：{errorMessage}</span>
            </div>
          )}

          {!loading && !errorMessage && (
            <div className="space-y-1.5">
              {filteredTerrains.map((terrain) => {
                const selected = selectedTerrain?.path === terrain.path;
                return (
                  <button
                    key={terrain.path}
                    type="button"
                    onClick={() => {
                      setSelectedTerrain(terrain);
                      playArcadeClick(540);
                    }}
                    className={`flex w-full items-center gap-3 border p-3 text-left ${
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
                        {terrain.filename}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[9px] text-[#6b7280]">
                        {terrain.path}
                      </span>
                    </span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {terrain.tag.map((tag) => (
                        <span key={tag} className="border border-[#dc2626]/30 bg-[#fee2e2] px-1.5 py-0.5 font-mono text-[8px] text-[#b91c1c]">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}

              {filteredTerrains.length === 0 && (
                <div className="border border-dashed border-[#d1d5db] bg-white p-10 text-center font-mono text-xs text-[#6b7280]">
                  NO TERRAIN FILES
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t-2 border-[#dc2626]/40 bg-white p-3">
          <span className="font-mono text-[9px] text-[#4b5563]">LOCAL TERRAIN • OBJ-LOADER</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="border border-[#d1d5db] bg-[#f3f4f6] px-3 py-1.5 font-mono text-xs text-[#b91c1c] hover:bg-[#d1d5db]">
              CANCEL
            </button>
            <button
              type="button"
              disabled={!hasActiveTerrain}
              onClick={() => {
                playModeSwitchTone();
                onClear();
                onClose();
              }}
              className="border border-[#dc2626] bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#b91c1c] hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:border-[#d1d5db] disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
            >
              CLEAR TERRAIN
            </button>
            <button
              type="button"
              disabled={!selectedTerrain}
              onClick={handleConfirm}
              className="border-2 border-[#111827] bg-[#dc2626] px-4 py-1.5 font-mono text-xs font-bold text-white hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:border-[#9ca3af] disabled:bg-[#d1d5db]"
            >
              LOAD TERRAIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
