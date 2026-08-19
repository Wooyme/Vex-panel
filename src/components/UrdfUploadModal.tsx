import React, { useState, useRef } from 'react';
import { SAMPLE_URDFS, SampleUrdf } from '../data/sampleUrdfs';
import { playArcadeClick, playModeSwitchTone } from '../utils/audio';
import { Upload, FileCode, Check, X, FileText, Sparkles, AlertCircle } from 'lucide-react';

interface UrdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadUrdf: (urdfContent: string, fileName?: string) => void;
  currentUrdfName: string;
}

export const UrdfUploadModal: React.FC<UrdfUploadModalProps> = ({
  isOpen,
  onClose,
  onLoadUrdf,
  currentUrdfName,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'paste'>('samples');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('quadruped_robot');
  const [pastedUrdf, setPastedUrdf] = useState<string>('');
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileContent(content);
      setUploadedFileName(file.name);
      setParseError(null);
      playArcadeClick(640);
    };
    reader.onerror = () => {
      setParseError('Failed to read selected URDF file');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileContent(content);
      setUploadedFileName(file.name);
      setParseError(null);
      playArcadeClick(640);
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    let contentToLoad = '';
    let nameToLoad = '';

    if (activeTab === 'samples') {
      const sample = SAMPLE_URDFS.find((s) => s.id === selectedSampleId);
      if (sample) {
        contentToLoad = sample.content;
        nameToLoad = sample.name;
      }
    } else if (activeTab === 'upload') {
      if (!uploadedFileContent) {
        setParseError('请先选择或拖拽上传一个 URDF / XML 文件');
        return;
      }
      contentToLoad = uploadedFileContent;
      nameToLoad = uploadedFileName || 'Custom URDF';
    } else if (activeTab === 'paste') {
      if (!pastedUrdf.trim()) {
        setParseError('请粘贴 URDF XML 内容');
        return;
      }
      contentToLoad = pastedUrdf;
      nameToLoad = 'Pasted URDF';
    }

    try {
      playModeSwitchTone();
      onLoadUrdf(contentToLoad, nameToLoad);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'URDF 解析失败');
    }
  };

  return (
    <div
      id="urdf-upload-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 select-none"
    >
      <div
        id="urdf-upload-modal-dialog"
        className="w-full max-w-2xl max-h-[85vh] bg-[#0f140f] border-2 border-[#f59e0b] shadow-[0_0_30px_rgba(245,158,11,0.4)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-[#172016] border-b-2 border-[#f59e0b]/40">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#f59e0b]" />
            <div>
              <h2 className="font-mono text-sm sm:text-base font-black tracking-wider text-[#fbbf24] flex items-center gap-2">
                <span>URDF MODEL LOADER</span>
                <span className="text-xs text-[#fef08a] bg-[#f59e0b]/20 px-1.5 py-0.5 border border-[#f59e0b]/50">
                  3D VISUALIZER
                </span>
              </h2>
              <p className="font-mono text-[10px] text-[#86efac]">
                当前模型: <span className="text-[#fbbf24] font-bold">{currentUrdfName}</span>
              </p>
            </div>
          </div>

          <button
            id="close-urdf-modal-btn"
            onClick={onClose}
            className="p-1.5 text-[#fbbf24] hover:text-white bg-[#1c241a] hover:bg-[#991b1b] border border-[#f59e0b]/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#263024] bg-[#121812]">
          <button
            id="tab-samples-btn"
            onClick={() => {
              playArcadeClick(480);
              setActiveTab('samples');
            }}
            className={`flex-1 py-2 px-3 text-xs font-mono font-bold border-r border-[#263024] flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'samples'
                ? 'bg-[#1c281c] text-[#fef08a] border-b-2 border-b-[#f59e0b]'
                : 'text-[#fbbf24]/70 hover:bg-[#182018] hover:text-[#fbbf24]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>预设模型 (SAMPLES)</span>
          </button>

          <button
            id="tab-upload-btn"
            onClick={() => {
              playArcadeClick(480);
              setActiveTab('upload');
            }}
            className={`flex-1 py-2 px-3 text-xs font-mono font-bold border-r border-[#263024] flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'bg-[#1c281c] text-[#fef08a] border-b-2 border-b-[#f59e0b]'
                : 'text-[#fbbf24]/70 hover:bg-[#182018] hover:text-[#fbbf24]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>上传文件 (UPLOAD .URDF)</span>
          </button>

          <button
            id="tab-paste-btn"
            onClick={() => {
              playArcadeClick(480);
              setActiveTab('paste');
            }}
            className={`flex-1 py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'paste'
                ? 'bg-[#1c281c] text-[#fef08a] border-b-2 border-b-[#f59e0b]'
                : 'text-[#fbbf24]/70 hover:bg-[#182018] hover:text-[#fbbf24]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>代码粘贴 (PASTE XML)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0c100c]">
          {/* Error Prompt */}
          {parseError && (
            <div className="mb-3 p-2.5 bg-[#991b1b]/20 border border-[#ef4444] text-[#ef4444] text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* TAB 1: Sample URDF Models */}
          {activeTab === 'samples' && (
            <div className="space-y-2.5">
              <p className="text-xs font-mono text-[#86efac]">
                选择系统内置的标准 URDF 机器人模型快速预览：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SAMPLE_URDFS.map((sample) => {
                  const isSelected = selectedSampleId === sample.id;
                  return (
                    <div
                      key={sample.id}
                      id={`sample-card-${sample.id}`}
                      onClick={() => {
                        playArcadeClick(560);
                        setSelectedSampleId(sample.id);
                        setParseError(null);
                      }}
                      className={`p-3 border-2 cursor-pointer transition-all duration-75 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#1b2b1b] border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                          : 'bg-[#141a13] border-[#263024] hover:border-[#f59e0b]/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-[#fef08a]">
                            {sample.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#4ade80]" />}
                        </div>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-[#0d120d] border border-[#263024] text-[#86efac]">
                          {sample.category}
                        </span>
                        <p className="text-[10px] font-mono text-[#fbbf24]/70 mt-2 leading-relaxed">
                          {sample.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="flex flex-col items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".urdf,.xml,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="urdf-file-input"
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#f59e0b]/50 hover:border-[#f59e0b] bg-[#141a13] hover:bg-[#182018] p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 bg-[#1f291c] border border-[#22c55e]/50 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[#4ade80]" />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-[#fbbf24]">
                    点击选择文件 或 将 .urdf / .xml 拖拽至此处
                  </p>
                  <p className="text-[10px] font-mono text-[#86efac] mt-1">
                    支持标准 ROS URDF 格式 (Links, Joints, Box/Cylinder/Sphere Visuals, Materials)
                  </p>
                </div>
              </div>

              {uploadedFileContent && (
                <div className="w-full mt-3 p-2.5 bg-[#172417] border border-[#22c55e] flex items-center justify-between text-xs font-mono text-[#86efac]">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#22c55e]" />
                    <span>已加载文件: <strong className="text-[#fef08a]">{uploadedFileName}</strong></span>
                  </span>
                  <span>{(uploadedFileContent.length / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Paste XML */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#86efac] block">
                直接粘贴 URDF / Xacro XML 文本：
              </label>
              <textarea
                value={pastedUrdf}
                onChange={(e) => {
                  setPastedUrdf(e.target.value);
                  setParseError(null);
                }}
                placeholder="<robot name=&quot;my_robot&quot;>&#10;  <link name=&quot;base_link&quot;>...&#10;</robot>"
                rows={10}
                className="w-full bg-[#080c08] border-2 border-[#263024] focus:border-[#f59e0b] text-[#86efac] font-mono text-xs p-2.5 outline-none resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 bg-[#141a13] border-t-2 border-[#f59e0b]/40">
          <div className="text-[10px] font-mono text-[#86efac]">
            支持 URDF 关节层级结构、几何形状与多材质着色
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono bg-[#1c241a] hover:bg-[#263024] text-[#fbbf24] border border-[#263024]"
            >
              CANCEL 取消
            </button>
            <button
              id="confirm-load-urdf-btn"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-mono font-bold bg-[#f59e0b] hover:bg-[#fbbf24] text-[#141a13] border-2 border-[#fef08a] shadow-[0_0_12px_rgba(245,158,11,0.6)] active:scale-95 transition-all"
            >
              LOAD MODEL 载入展示
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
