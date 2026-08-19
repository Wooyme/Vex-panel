import React, { useState } from 'react';
import { MqttPacketLog } from '../types/robot';
import { Terminal, X, Trash2 } from 'lucide-react';
import { playArcadeClick } from '../utils/audio';

interface MqttInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: MqttPacketLog[];
  onClearLogs: () => void;
  brokerUrl: string;
  mqttStatus: string;
  packetsSent: number;
  packetsReceived: number;
  currentTxRate: number;
  onSendCustomPacket: (topic: string, data: any) => void;
}

export const MqttInspectorModal: React.FC<MqttInspectorModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  brokerUrl,
  mqttStatus,
  packetsSent,
  packetsReceived,
  currentTxRate,
}) => {
  const [filterTopic, setFilterTopic] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterTopic === 'ALL') return true;
    if (filterTopic === 'TX') return log.direction === 'TX';
    if (filterTopic === 'RX') return log.direction === 'RX';
    return log.topic.includes(filterTopic);
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playArcadeClick(900);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-[#0f140f] border-2 border-[#f59e0b] shadow-[0_0_30px_rgba(245,158,11,0.35)] flex flex-col max-h-[88vh] overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-3 bg-[#172016] border-b border-[#f59e0b]/50">
          <div className="flex items-center gap-2 text-[#fbbf24]">
            <Terminal className="w-5 h-5 text-[#f59e0b]" />
            <span className="font-mono font-bold text-sm tracking-wider">MQTT-WEBSOCKET TELEMETRY STREAM</span>
          </div>
          <button
            onClick={() => {
              playArcadeClick(400);
              onClose();
            }}
            className="p-1 text-[#fbbf24] hover:bg-[#263524] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#111710] border-b border-[#263024] text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[#86efac]/70 text-[10px]">BROKER ENDPOINT</span>
            <span className="text-[#86efac] truncate font-bold">{brokerUrl}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#fbbf24]/70 text-[10px]">CONNECTION</span>
            <span className={`font-bold ${mqttStatus === 'connected' ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
              {mqttStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#f97316]/70 text-[10px]">TX RATE / TOTAL</span>
            <span className="text-[#fb923c] font-bold">{currentTxRate} Hz ({packetsSent} pkts)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#fef08a]/70 text-[10px]">RX TOTAL</span>
            <span className="text-[#fef08a] font-bold">{packetsReceived} pkts</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between p-2 bg-[#141a13] border-b border-[#263024] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#fbbf24]/80 text-[11px]">FILTER:</span>
            {['ALL', 'TX', 'RX', 'control', 'telemetry'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  playArcadeClick(500);
                  setFilterTopic(f);
                }}
                className={`px-2 py-0.5 text-[10px] font-bold ${
                  filterTopic === f
                    ? 'bg-[#f59e0b] text-[#141a13]'
                    : 'bg-[#1c241a] text-[#fbbf24] hover:bg-[#263024]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              playArcadeClick(350);
              onClearLogs();
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#1c241a] hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 text-[10px] font-bold transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR
          </button>
        </div>

        {/* Packet Stream Console */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#090d09]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-[#4ade80]/40 italic">
              NO MQTT PACKETS BUFFERED YET. TRANSMITTING AT FIXED FREQUENCY...
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 bg-[#111710] border border-[#22c55e]/20 hover:border-[#22c55e]/60 flex flex-col gap-1 group"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.2 font-bold ${
                        log.direction === 'TX'
                          ? 'bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/40'
                          : 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40'
                      }`}
                    >
                      {log.direction}
                    </span>
                    <span className="text-[#86efac] font-bold">{log.topic}</span>
                    <span className="text-[#fbbf24]/50">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(log.payload, null, 2), log.id)}
                    className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[9px] bg-[#1c241a] text-[#fbbf24] border border-[#263024] hover:border-[#f59e0b]"
                  >
                    {copiedId === log.id ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <pre className="text-[11px] text-[#fef08a] bg-[#0a0e0a] p-1.5 border border-[#263024] overflow-x-auto">
                  {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
