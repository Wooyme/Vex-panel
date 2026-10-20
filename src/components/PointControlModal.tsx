import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal, Plus, Send, Trash2, X } from 'lucide-react';
import { DEFAULT_FORCE_TOPIC, FORCE_COLORS, validateForceTopic } from '../utils/forces';
import { PointBatch, PointVelocity, validatePointBatch } from '../utils/points';

interface PointDraft {
  id: number;
  body: string;
  height: string;
  velocity: [string, string];
  duration: string;
}

const newDraft = (id: number): PointDraft => ({
  id, body: 'pelvis', height: '0.8', velocity: ['0', '0'], duration: '2',
});
const number = (value: string) => value.trim() === '' ? NaN : Number(value);
const color = (id: number) => FORCE_COLORS[(id - 1) % FORCE_COLORS.length];
const inputClass = 'mt-1 w-full min-w-0 border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600';

export function PointControlModal({ isOpen, onClose, connected, estop, brokerUrl, publishPointBatch }: {
  isOpen: boolean;
  onClose: () => void;
  connected: boolean;
  estop: boolean;
  brokerUrl: string;
  publishPointBatch: (topic: string, batch: PointBatch) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<PointDraft[]>(() => [newDraft(1)]);
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

  const rawBatch = useMemo<PointBatch>(() => ({
    points: drafts.map((draft) => ({
      body_name: draft.body,
      height: number(draft.height),
      velocity: draft.velocity.map(number) as PointVelocity,
      duration: number(draft.duration),
    })),
  }), [drafts]);
  const validation = useMemo(() => {
    try {
      return { topic: validateForceTopic(topic), batch: validatePointBatch(rawBatch), error: '' };
    } catch (error) {
      return { topic: '', batch: null, error: (error as Error).message };
    }
  }, [topic, rawBatch]);

  const update = (id: number, changes: Partial<PointDraft>) => {
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
      await publishPointBatch(destination, batch);
      setResult({ error: false, text: `已发送 ${batch.points.length} 个控制点至 ${destination}，未确认执行。` });
    } catch (error) {
      setResult({ error: true, text: `发送失败：${(error as Error).message}` });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside ref={panelRef} aria-labelledby="point-panel-title"
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
      className="fixed bottom-10 left-3 z-40 flex max-h-[min(640px,calc(100dvh-112px))] w-[360px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-lg border border-red-300 bg-white text-slate-800 shadow-xl select-text">
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
          <h2 id="point-panel-title" className="text-sm font-bold text-red-800">点控制</h2>
          <span className={`text-xs ${connected ? 'text-slate-500' : 'text-red-600'}`}>{connected ? '已连接' : '未连接'}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label={collapsed ? '展开点控制' : '收起点控制'} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} className="rounded p-1 text-red-700 hover:bg-red-100">
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button type="button" aria-label="关闭点控制" onClick={() => { dragRef.current = null; onClose(); }} className="rounded p-1 text-red-700 hover:bg-red-100"><X size={18} /></button>
        </div>
      </header>

      {!collapsed && <>
      <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain p-3">
        <section aria-label="控制点列表" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">待发送 ({drafts.length})</h3>
            <button type="button" onClick={() => {
              const draft = newDraft(nextId.current++);
              setDrafts((current) => [...current, draft]);
              setSelectedId(draft.id);
              setResult(null);
            }} className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50"><Plus size={14} />添加</button>
          </div>
          <div className="mb-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto" aria-label="选择要编辑的控制点">
            {drafts.map((draft) => <button key={draft.id} type="button" aria-pressed={selectedId === draft.id} onClick={() => setSelectedId(draft.id)}
              className={`max-w-full truncate rounded border px-2 py-1 text-sm ${selectedId === draft.id ? 'border-current bg-slate-50 font-bold' : 'border-slate-200'}`} style={{ color: color(draft.id) }}>
              #{draft.id} {draft.body || '未命名'}
            </button>)}
          </div>
          <div>
            {drafts.filter((draft) => draft.id === selectedId).map((draft) => (
              <fieldset key={draft.id} className="min-w-0 border border-red-500 bg-rose-50/40 p-2">
                <legend className="px-1 text-sm font-bold" style={{ color: color(draft.id) }}>控制点 #{draft.id}</legend>
                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1 text-sm">Body 名称
                    <input aria-label={`控制点 ${draft.id} Body 名称`} list="point-body-suggestions" value={draft.body} onChange={(event) => update(draft.id, { body: event.target.value })} className={inputClass} />
                  </label>
                  <button type="button" aria-label={`删除控制点 ${draft.id}`} onClick={() => {
                    const remaining = drafts.filter((item) => item.id !== draft.id);
                    setDrafts(remaining);
                    setSelectedId(remaining[0]?.id ?? null);
                    setResult(null);
                  }} className="mb-0.5 p-2 text-slate-500 hover:bg-red-100 hover:text-red-700"><Trash2 size={18} /></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="min-w-0 text-sm">目标高度 (m)
                    <input type="number" step="any" aria-label={`控制点 ${draft.id} 目标高度`} value={draft.height} onChange={(event) => update(draft.id, { height: event.target.value })} className={inputClass} />
                  </label>
                  <label className="min-w-0 text-sm">时长 (仿真秒)
                    <input type="number" step="any" min="0" aria-label={`控制点 ${draft.id} 时长`} value={draft.duration} onChange={(event) => update(draft.id, { duration: event.target.value })} className={inputClass} />
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {['X', 'Y'].map((axis, index) => (
                    <label key={axis} className="min-w-0 text-sm">速度 V{axis.toLowerCase()} (m/s)
                      <input type="number" step="any" aria-label={`控制点 ${draft.id} 速度 ${axis}`} value={draft.velocity[index]} onChange={(event) => {
                        const velocity = [...draft.velocity] as PointDraft['velocity'];
                        velocity[index] = event.target.value;
                        update(draft.id, { velocity });
                      }} className={inputClass} />
                    </label>
                  ))}
                </div>
                <button type="button" aria-label={`控制点 ${draft.id} 水平速度归零`} onClick={() => update(draft.id, { velocity: ['0', '0'] })}
                  className="mt-2 w-full border border-slate-300 bg-white py-1 text-sm hover:border-red-500 hover:text-red-700">水平速度归零</button>
              </fieldset>
            ))}
            {drafts.length === 0 && <p className="border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">添加一个控制点开始编辑</p>}
          </div>
          <datalist id="point-body-suggestions"><option value="pelvis" /><option value="torso_link" /></datalist>
        </section>

        <details className="border-t border-slate-200 pt-2 text-sm">
          <summary className="cursor-pointer text-slate-600">发送设置与 JSON</summary>
          <p className="my-2 break-all text-xs text-slate-500">Broker: {brokerUrl}</p>
          <label className="block text-sm">目标 Topic
            <input value={topic} onChange={(event) => { setTopic(event.target.value); setResult(null); }} className={inputClass} />
          </label>
          <pre className="my-2 max-h-32 overflow-auto text-xs">{validation.batch ? JSON.stringify(validation.batch, null, 2) : '输入有效参数后显示待发送 JSON'}</pre>
          <p className="text-sm leading-relaxed text-slate-600">控制器以世界坐标驱动 body 质心趋近目标高度和水平速度，参考值限速变化（高度 0.2 m/s，速度 2 m/s²），不做重力补偿。对已在控制中的 body 再次发送只更新目标和到期时间；删除、关闭或面板急停不会撤销已发送的控制点。</p>
        </details>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <button type="button" disabled={!connected || estop || sending || !!validation.error} onClick={() => void send()}
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"><Send size={16} />{sending ? '发送中…' : `整批发送 (${drafts.length})`}</button>
        <div aria-live="polite" className="max-h-24 overflow-y-auto break-words text-sm empty:hidden">
          {validation.error && <p className="text-red-700">{validation.error}</p>}
          {estop && <p className="text-red-700">面板急停已启用，禁止发送新的控制点。</p>}
          {!connected && <p className="text-red-700">MQTT 未连接，连接恢复后需手动发送。</p>}
          {result && <p className={result.error ? 'text-red-700' : 'text-slate-700'}>{result.text}</p>}
        </div>
      </footer>
      </>}
    </aside>
  );
}
