import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ModuleRegistry, 
  AllCommunityModule, 
  themeQuartz
} from 'ag-grid-community';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { History, RefreshCw, FileCode, ArrowUpRight, ShieldCheck, Database } from 'lucide-react';
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
      foregroundColor: '#f1f5f9',
      headerBackgroundColor: '#070b16',
      headerTextColor: '#94a3b8',
      oddRowBackgroundColor: '#090e1c',
      borderColor: '#1e293b',
      rowHoverColor: 'rgba(6, 182, 212, 0.06)',
      selectedRowBackgroundColor: 'rgba(6, 182, 212, 0.12)',
      fontSize: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    });
  }, []);

  const colDefs = useMemo<ColDef<AuditRecord>[]>(() => {
    return [
      {
        field: 'timestamp',
        headerName: 'Event Time',
        width: 145,
        valueFormatter: (p) => {
          if (!p.value) return '—';
          const d = new Date(p.value);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        },
      },
      {
        field: 'transactionId',
        headerName: 'Order Ref',
        width: 135,
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
        minWidth: 165,
        cellRenderer: (p: any) => {
          const action = p.value;
          const getBadge = () => {
            switch (action) {
              case 'PAYMENT_CAPTURED':
                return 'bg-[#06281e] text-[#34d399] border-[#065f46]';
              case 'PAYMENT_BLOCKED':
                return 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]';
              case 'MERCHANT_OVERRIDE':
                return 'bg-[#1e1338] text-[#c084fc] border-[#581c87]';
              case 'RISK_ASSESSED':
                return 'bg-[#08222b] text-[#22d3ee] border-[#0e7490]';
              default:
                return 'bg-[#10172a] text-slate-300 border-[#1e293b]';
            }
          };

          return (
            <div className="flex items-center h-full">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getBadge()}`}>
                {action}
              </span>
            </div>
          );
        },
      },
      {
        field: 'actor',
        headerName: 'Actor',
        width: 170,
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
        width: 140,
        cellRenderer: (p: any) => (
          <div className="flex items-center h-full font-mono text-[11px] text-slate-400">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Tamper-Evident Security Audit Trail
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#060911] text-cyan-400 border border-[#1e293b] font-semibold flex items-center gap-1">
              <Database className="w-2.5 h-2.5 text-cyan-400" />
              <span>SQLite Immutable Log</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted history of risk evaluations, PayPal order creations, captures, and merchant overrides.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10172a] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] text-xs font-mono self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Grid and Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: AG Grid Audit Table (2 Cols) */}
        <div className="lg:col-span-2 bg-[#0a0f1d] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-[#1e293b] bg-[#070b16] flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Audit Event Records ({logs.length})</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 bg-[#060911] px-2 py-0.5 rounded border border-[#1e293b]">
              AG Grid Community
            </span>
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
              rowHeight={42}
              headerHeight={36}
              suppressCellFocus={true}
            />
          </div>
        </div>

        {/* Right: Selected Event JSON Inspector (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] h-[518px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Audit Payload Inspector
                </h3>
              </div>
              {selectedRecord && (
                <button
                  onClick={() => onInspectOrder(selectedRecord.transactionId)}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#10172a] hover:bg-cyan-950/60 text-cyan-400 hover:text-cyan-300 font-mono border border-[#1e293b] hover:border-cyan-800 transition-colors"
                >
                  <span>Investigate</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedRecord ? (
              <div className="flex-1 overflow-auto mt-3 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] space-y-1.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Event Identifier</div>
                  <div className="text-slate-200 text-xs truncate">{selectedRecord.id}</div>
                  
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider pt-1">Target Order</div>
                  <div className="text-cyan-400 font-bold text-xs">{selectedRecord.transactionId}</div>
                  
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider pt-1">Actor Identity</div>
                  <div className="text-purple-300 text-xs">{selectedRecord.actor}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 font-sans font-medium">Raw Telemetry & Decision Payload:</span>
                    <span className="text-[10px] text-slate-500 font-mono">application/json</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-[265px] font-mono">
                    {JSON.stringify(selectedRecord.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 font-mono space-y-1">
                <ShieldCheck className="w-6 h-6 text-slate-600 mb-1" />
                <span>Select an audit record to view JSON payload.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

