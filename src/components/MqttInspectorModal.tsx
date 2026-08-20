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
      <div className="w-full max-w-3xl bg-[#ffffff] border-2 border-[#dc2626] flex flex-col max-h-[88vh] overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-3 bg-[#fff1f2] border-b border-[#dc2626]/50">
          <div className="flex items-center gap-2 text-[#b91c1c]">
            <Terminal className="w-5 h-5 text-[#dc2626]" />
            <span className="font-mono font-bold text-sm tracking-wider">MQTT-WEBSOCKET TELEMETRY STREAM</span>
          </div>
          <button
            onClick={() => {
              playArcadeClick(400);
              onClose();
            }}
            className="p-1 text-[#b91c1c] hover:bg-[#fee2e2]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#f9fafb] border-b border-[#d1d5db] text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[#4b5563]/70 text-[10px]">BROKER ENDPOINT</span>
            <span className="text-[#4b5563] truncate font-bold">{brokerUrl}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#b91c1c]/70 text-[10px]">CONNECTION</span>
            <span className={`font-bold ${mqttStatus === 'connected' ? 'text-[#dc2626]' : 'text-[#ef4444]'}`}>
              {mqttStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#b91c1c]/70 text-[10px]">TX RATE / TOTAL</span>
            <span className="text-[#dc2626] font-bold">{currentTxRate} Hz ({packetsSent} pkts)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#111827]/70 text-[10px]">RX TOTAL</span>
            <span className="text-[#111827] font-bold">{packetsReceived} pkts</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between p-2 bg-[#ffffff] border-b border-[#d1d5db] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#b91c1c]/80 text-[11px]">FILTER:</span>
            {['ALL', 'TX', 'RX', 'control', 'telemetry'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  playArcadeClick(500);
                  setFilterTopic(f);
                }}
                className={`px-2 py-0.5 text-[10px] font-bold ${
                  filterTopic === f
                    ? 'bg-[#dc2626] text-[#ffffff]'
                    : 'bg-[#f3f4f6] text-[#b91c1c] hover:bg-[#d1d5db]'
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
            className="flex items-center gap-1 px-2 py-0.5 bg-[#f3f4f6] hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 text-[10px] font-bold"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR
          </button>
        </div>

        {/* Packet Stream Console */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#f8fafc]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-[#dc2626]/40 italic">
              NO MQTT PACKETS BUFFERED YET. TRANSMITTING AT FIXED FREQUENCY...
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 bg-[#f9fafb] border border-[#ef4444]/20 hover:border-[#ef4444]/60 flex flex-col gap-1 group"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.2 font-bold ${
                        log.direction === 'TX'
                          ? 'bg-[#dc2626]/20 text-[#b91c1c] border border-[#dc2626]/40'
                          : 'bg-[#ef4444]/20 text-[#dc2626] border border-[#ef4444]/40'
                      }`}
                    >
                      {log.direction}
                    </span>
                    <span className="text-[#4b5563] font-bold">{log.topic}</span>
                    <span className="text-[#b91c1c]/50">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(log.payload, null, 2), log.id)}
                    className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[9px] bg-[#f3f4f6] text-[#b91c1c] border border-[#d1d5db] hover:border-[#dc2626]"
                  >
                    {copiedId === log.id ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <pre className="text-[11px] text-[#111827] bg-[#f9fafb] p-1.5 border border-[#d1d5db] overflow-x-auto">
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
