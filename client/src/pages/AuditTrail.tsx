import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ModuleRegistry, 
  AllCommunityModule, 
  themeQuartz
} from 'ag-grid-community';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { History, RefreshCw, FileCode, ArrowUpRight } from 'lucide-react';
import type { AuditRecord } from '../types/index.js';
import { api } from '../services/api.js';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AuditTrailProps {
  onInspectOrder: (orderId: string) => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ onInspectOrder }) => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
      if (data.length > 0 && !selectedRecord) {
        setSelectedRecord(data[0]);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const darkNavyTheme = useMemo(() => {
    return themeQuartz.withParams({
      backgroundColor: '#0a0f1d',
      foregroundColor: '#f8fafc',
      headerBackgroundColor: '#070b16',
      headerTextColor: '#94a3b8',
      oddRowBackgroundColor: '#0c1222',
      borderColor: '#1e293b',
      rowHoverColor: 'rgba(6, 182, 212, 0.08)',
      selectedRowBackgroundColor: 'rgba(6, 182, 212, 0.15)',
      fontSize: 12,
    });
  }, []);

  const colDefs = useMemo<ColDef<AuditRecord>[]>(() => {
    return [
      {
        field: 'timestamp',
        headerName: 'Event Time',
        width: 140,
        valueFormatter: (p) => {
          if (!p.value) return '—';
          const d = new Date(p.value);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        },
      },
      {
        field: 'transactionId',
        headerName: 'Order Ref',
        width: 130,
        cellRenderer: (p: any) => {
          return (
            <div className="flex items-center gap-1 font-mono text-cyan-400 font-semibold h-full">
              <span>{p.value}</span>
            </div>
          );
        },
      },
      {
        field: 'action',
        headerName: 'Security Action',
        flex: 1.2,
        minWidth: 160,
        cellRenderer: (p: any) => {
          const action = p.value;
          const getBadge = () => {
            switch (action) {
              case 'PAYMENT_CAPTURED':
                return 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50';
              case 'PAYMENT_BLOCKED':
                return 'bg-rose-950/60 text-rose-300 border-rose-600/50';
              case 'MERCHANT_OVERRIDE':
                return 'bg-purple-950/60 text-purple-300 border-purple-600/50';
              case 'RISK_ASSESSED':
                return 'bg-cyan-950/60 text-cyan-300 border-cyan-600/50';
              default:
                return 'bg-slate-800 text-slate-300 border-slate-700';
            }
          };

          return (
            <div className="flex items-center h-full">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getBadge()}`}>
                {action}
              </span>
            </div>
          );
        },
      },
      {
        field: 'actor',
        headerName: 'Actor',
        width: 165,
        cellRenderer: (p: any) => {
          return (
            <div className="flex items-center h-full font-mono text-[11px] text-slate-300">
              {p.value}
            </div>
          );
        },
      },
      {
        field: 'policyVersion',
        headerName: 'Policy Version',
        width: 155,
        cellRenderer: (p: any) => (
          <div className="flex items-center h-full font-mono text-[10px] text-slate-400">
            {p.value}
          </div>
        ),
      },
    ];
  }, []);

  const onRowClicked = (event: RowClickedEvent<AuditRecord>) => {
    if (event.data) {
      setSelectedRecord(event.data);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-[#0b101e] border border-cyan-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Tamper-Evident Security Audit Trail
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
              SQLite Immutable Log
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted history of risk evaluations, PayPal order creations, captures, and merchant overrides.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Grid and Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: AG Grid Audit Table (2 Cols) */}
        <div className="lg:col-span-2 bg-[#0b0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3 border-b border-slate-800 bg-[#080d19] flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Event Records ({logs.length})</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">Powered by AG Grid</span>
          </div>

          <div className="h-[460px] w-full">
            <AgGridReact<AuditRecord>
              theme={darkNavyTheme}
              rowData={logs}
              columnDefs={colDefs}
              rowSelection={{ mode: 'singleRow' }}
              onRowClicked={onRowClicked}
              loading={loading}
              pagination={true}
              paginationPageSize={10}
              rowHeight={40}
              headerHeight={36}
              suppressCellFocus={true}
            />
          </div>
        </div>

        {/* Right: Selected Event JSON Inspector (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800 h-[505px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Audit Payload Inspector
                </h3>
              </div>
              {selectedRecord && (
                <button
                  onClick={() => onInspectOrder(selectedRecord.transactionId)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                >
                  <span>Investigate</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedRecord ? (
              <div className="flex-1 overflow-auto mt-3 space-y-3 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] text-slate-400">Event Identifier</div>
                  <div className="text-slate-200">{selectedRecord.id}</div>
                  <div className="text-[10px] text-slate-400 pt-1">Target Order</div>
                  <div className="text-cyan-400 font-bold">{selectedRecord.transactionId}</div>
                  <div className="text-[10px] text-slate-400 pt-1">Actor Identity</div>
                  <div className="text-purple-300">{selectedRecord.actor}</div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Raw Telemetry & Decision Payload:</span>
                  <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-[260px]">
                    {JSON.stringify(selectedRecord.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono">
                Select an audit record to view JSON payload.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
