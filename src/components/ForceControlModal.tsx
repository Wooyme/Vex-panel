import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal, Plus, Send, Trash2, X } from 'lucide-react';
import {
  DEFAULT_FORCE_TOPIC, FORCE_COLORS, ForceBatch, ForceDirection,
  validateForceBatch, validateForceTopic,
} from '../utils/forces';
import { ForceDirectionPreview } from './ForceDirectionPreview';

interface ForceDraft {
  id: number;
  body: string;
  direction: [string, string, string];
  magnitude: string;
  duration: string;
}

const newDraft = (id: number): ForceDraft => ({
  id, body: 'torso_link', direction: ['1', '0', '0'], magnitude: '50', duration: '0.5',
});
const number = (value: string) => value.trim() === '' ? NaN : Number(value);
const color = (id: number) => FORCE_COLORS[(id - 1) % FORCE_COLORS.length];
const inputClass = 'mt-1 w-full min-w-0 border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600';

export function ForceControlModal({ isOpen, onClose, connected, estop, brokerUrl, publishForceBatch }: {
  isOpen: boolean;
  onClose: () => void;
  connected: boolean;
  estop: boolean;
  brokerUrl: string;
  publishForceBatch: (topic: string, batch: ForceBatch) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<ForceDraft[]>(() => [newDraft(1)]);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [topic, setTopic] = useState(DEFAULT_FORCE_TOPIC);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ error: boolean; text: string } | null>(null);
  const nextId = useRef(2);
  const sendingRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const clampPosition = (x: number, y: number) => {
    const bounds = panelRef.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - (bounds?.width ?? 360) - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - (bounds?.height ?? 48) - 8)),
    };
  };

  useEffect(() => {
    if (!isOpen) return;
    const keepVisible = () => setPosition((current) => current
      ? clampPosition(current.x, current.y) : null);
    keepVisible();
    window.addEventListener('resize', keepVisible);
    return () => window.removeEventListener('resize', keepVisible);
  }, [isOpen, collapsed]);

  const rawBatch = useMemo<ForceBatch>(() => ({
    forces: drafts.map((draft) => ({
      body_name: draft.body,
      direction: draft.direction.map(number) as ForceDirection,
      magnitude: number(draft.magnitude),
      duration: number(draft.duration),
    })),
  }), [drafts]);
  const validation = useMemo(() => {
    try {
      return { topic: validateForceTopic(topic), batch: validateForceBatch(rawBatch), error: '' };
    } catch (error) {
      return { topic: '', batch: null, error: (error as Error).message };
    }
  }, [topic, rawBatch]);
  const previewForces = useMemo(() => drafts.map((draft, index) => ({
    id: draft.id, color: color(draft.id), direction: rawBatch.forces[index].direction,
  })), [drafts, rawBatch]);

  const update = (id: number, changes: Partial<ForceDraft>) => {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...changes } : draft));
    setResult(null);
  };
  const send = async () => {
    if (sendingRef.current || !connected || estop || !validation.batch) return;
    sendingRef.current = true;
    setSending(true);
    setResult(null);
    const batch = validation.batch;
    const destination = validation.topic;
    try {
      await publishForceBatch(destination, batch);
      setResult({ error: false, text: `已发送 ${batch.forces.length} 条力至 ${destination}，未确认执行。` });
    } catch (error) {
      setResult({ error: true, text: `发送失败：${(error as Error).message}` });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside ref={panelRef} aria-labelledby="force-panel-title"
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
      className="fixed bottom-10 right-3 z-40 flex max-h-[min(640px,calc(100dvh-112px))] w-[360px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-lg border border-red-300 bg-white text-slate-800 shadow-xl select-text">
      <header className="flex shrink-0 touch-none items-center justify-between gap-2 border-b border-red-200 bg-rose-50 px-3 py-2 cursor-move select-none"
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
          const bounds = panelRef.current!.getBoundingClientRect();
          dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || event.pointerId !== drag.pointerId) return;
          setPosition(clampPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY));
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onLostPointerCapture={() => { dragRef.current = null; }}>
        <div className="flex min-w-0 items-center gap-2" title="拖动标题栏移动面板">
          <GripHorizontal size={16} className="shrink-0 text-red-400" />
          <h2 id="force-panel-title" className="text-sm font-bold text-red-800">外力控制</h2>
          <span className={`text-xs ${connected ? 'text-slate-500' : 'text-red-600'}`}>{connected ? '已连接' : '未连接'}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label={collapsed ? '展开外力控制' : '收起外力控制'} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} className="rounded p-1 text-red-700 hover:bg-red-100">
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button type="button" aria-label="关闭外力控制" onClick={() => { dragRef.current = null; onClose(); }} className="rounded p-1 text-red-700 hover:bg-red-100"><X size={18} /></button>
        </div>
      </header>

      {!collapsed && <>
      <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain p-3">
        <ForceDirectionPreview forces={previewForces} selectedId={selectedId} />
        <section aria-label="外力列表" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">待发送 ({drafts.length})</h3>
            <button type="button" onClick={() => {
              const draft = newDraft(nextId.current++);
              setDrafts((current) => [...current, draft]);
              setSelectedId(draft.id);
              setResult(null);
            }} className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50"><Plus size={14} />添加</button>
          </div>
          <div className="mb-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto" aria-label="选择要编辑的力">
            {drafts.map((draft) => <button key={draft.id} type="button" aria-pressed={selectedId === draft.id} onClick={() => setSelectedId(draft.id)}
              className={`max-w-full truncate rounded border px-2 py-1 text-sm ${selectedId === draft.id ? 'border-current bg-slate-50 font-bold' : 'border-slate-200'}`} style={{ color: color(draft.id) }}>
              #{draft.id} {draft.body || '未命名'}
            </button>)}
          </div>
          <div>
            {drafts.filter((draft) => draft.id === selectedId).map((draft) => (
              <fieldset key={draft.id} onFocus={() => setSelectedId(draft.id)} onClick={() => setSelectedId(draft.id)}
                className={`min-w-0 border p-2 ${selectedId === draft.id ? 'border-red-500 bg-rose-50/40' : 'border-slate-200'}`}>
                <legend className="px-1 text-sm font-bold" style={{ color: color(draft.id) }}>力 #{draft.id}</legend>
                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1 text-sm">Body 名称
                    <input aria-label={`力 ${draft.id} Body 名称`} list="force-body-suggestions" value={draft.body} onChange={(event) => update(draft.id, { body: event.target.value })} className={inputClass} />
                  </label>
                  <button type="button" aria-label={`删除力 ${draft.id}`} onClick={(event) => {
                    event.stopPropagation();
                    const remaining = drafts.filter((item) => item.id !== draft.id);
                    setDrafts(remaining);
                    setSelectedId(remaining[0]?.id ?? null);
                    setResult(null);
                  }} className="mb-0.5 p-2 text-slate-500 hover:bg-red-100 hover:text-red-700"><Trash2 size={18} /></button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['X', 'Y', 'Z'].map((axis, index) => (
                    <label key={axis} className="min-w-0 text-sm">方向 {axis}
                      <input type="number" step="any" aria-label={`力 ${draft.id} 方向 ${axis}`} value={draft.direction[index]} onChange={(event) => {
                        const direction = [...draft.direction] as ForceDraft['direction'];
                        direction[index] = event.target.value;
                        update(draft.id, { direction });
                      }} className={inputClass} />
                    </label>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-6 gap-1">
                  {['+X', '-X', '+Y', '-Y', '+Z', '-Z'].map((axis, index) => (
                    <button key={axis} type="button" aria-label={`力 ${draft.id} 设为 ${axis}`} onClick={() => {
                      const direction: ForceDraft['direction'] = ['0', '0', '0'];
                      direction[Math.floor(index / 2)] = index % 2 === 0 ? '1' : '-1';
                      update(draft.id, { direction });
                    }} className="border border-slate-300 bg-white py-1 text-sm hover:border-red-500 hover:text-red-700">{axis}</button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="min-w-0 text-sm">大小 (N)
                    <input type="number" step="any" min="0" aria-label={`力 ${draft.id} 大小`} value={draft.magnitude} onChange={(event) => update(draft.id, { magnitude: event.target.value })} className={inputClass} />
                  </label>
                  <label className="min-w-0 text-sm">时长 (仿真秒)
                    <input type="number" step="any" min="0" aria-label={`力 ${draft.id} 时长`} value={draft.duration} onChange={(event) => update(draft.id, { duration: event.target.value })} className={inputClass} />
                  </label>
                </div>
              </fieldset>
            ))}
            {drafts.length === 0 && <p className="border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">添加一条力开始编辑</p>}
          </div>
          <datalist id="force-body-suggestions"><option value="torso_link" /><option value="pelvis" /></datalist>
        </section>

        <details className="border-t border-slate-200 pt-2 text-sm">
          <summary className="cursor-pointer text-slate-600">发送设置与 JSON</summary>
          <p className="my-2 break-all text-xs text-slate-500">Broker: {brokerUrl}</p>
          <label className="block text-sm">目标 Topic
            <input value={topic} onChange={(event) => { setTopic(event.target.value); setResult(null); }} className={inputClass} />
          </label>
          <pre className="my-2 max-h-32 overflow-auto text-xs">{validation.batch ? JSON.stringify(validation.batch, null, 2) : '输入有效参数后显示待发送 JSON'}</pre>
          <p className="text-sm leading-relaxed text-slate-600">同批力同时开始，作用于各 body 质心。重复发送会叠加；删除、关闭或面板急停不会撤销已发送的力。</p>
        </details>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <button type="button" disabled={!connected || estop || sending || !!validation.error} onClick={() => void send()}
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"><Send size={16} />{sending ? '发送中…' : `整批发送 (${drafts.length})`}</button>
        <div aria-live="polite" className="max-h-24 overflow-y-auto break-words text-sm empty:hidden">
          {validation.error && <p className="text-red-700">{validation.error}</p>}
          {estop && <p className="text-red-700">面板急停已启用，禁止发送新的外力。</p>}
          {!connected && <p className="text-red-700">MQTT 未连接，连接恢复后需手动发送。</p>}
          {result && <p className={result.error ? 'text-red-700' : 'text-slate-700'}>{result.text}</p>}
        </div>
      </footer>
      </>}
    </aside>
  );
}
