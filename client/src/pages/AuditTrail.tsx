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

  const lightFintechTheme = useMemo(() => {
    return themeQuartz.withParams({
      backgroundColor: '#ffffff',
      foregroundColor: '#0f172a',
      headerBackgroundColor: '#f8fafc',
      headerTextColor: '#475569',
      oddRowBackgroundColor: '#ffffff',
      borderColor: '#e5edf8',
      rowHoverColor: '#f1f5f9',
      selectedRowBackgroundColor: '#eff6ff',
      fontSize: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    });
  }, []);

  const colDefs = useMemo<ColDef<AuditRecord>[]>(() => {
    return [
      {
        field: 'timestamp',
        headerName: 'Event Time',
        width: 155,
        valueFormatter: (p) => {
          if (!p.value) return '—';
          const d = new Date(p.value);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        },
      },
      {
        field: 'transactionId',
        headerName: 'Order Ref',
        width: 140,
        cellRenderer: (p: any) => {
          return (
            <div className="flex items-center gap-1 font-mono text-blue-600 font-bold h-full">
              <span>{p.value}</span>
            </div>
          );
        },
      },
      {
        field: 'action',
        headerName: 'Event Type',
        flex: 1.2,
        minWidth: 165,
        cellRenderer: (p: any) => {
          const action = p.value;
          const getBadge = () => {
            switch (action) {
              case 'PAYMENT_CAPTURED':
                return { label: 'Payment Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
              case 'PAYMENT_BLOCKED':
                return { label: 'Payment Blocked', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
              case 'MERCHANT_OVERRIDE':
                return { label: 'Manual Override', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
              case 'RISK_ASSESSED':
                return { label: 'Risk Evaluated', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
              default:
                return { label: action, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
            }
          };

          const badge = getBadge();
          return (
            <div className="flex items-center h-full">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          );
        },
      },
      {
        field: 'actor',
        headerName: 'Actor Identity',
        width: 175,
        cellRenderer: (p: any) => {
          return (
            <div className="flex items-center h-full font-mono text-[11px] text-slate-600">
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
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 rounded-2xl bg-white border border-[#e5edf8] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Activity & Audit Log
            </h1>
            <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Database className="w-3 h-3 text-blue-600" />
              <span>Immutable Ledger</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Persisted history of risk evaluations, PayPal authorizations, captures, and merchant overrides.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Activity</span>
        </button>
      </div>

      {/* Grid and Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: AG Grid Audit Table (8 of 12 Cols) */}
        <div className="lg:col-span-8 bg-white border border-[#e5edf8] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-[#f8fafc] flex items-center justify-between text-xs text-slate-700">
            <span className="font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Audit Event Records ({logs.length})</span>
            </span>
            <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-semibold">
              AG Grid Community
            </span>
          </div>

          <div className="h-[480px] w-full">
            <AgGridReact<AuditRecord>
              theme={lightFintechTheme}
              rowData={logs}
              columnDefs={colDefs}
              rowSelection={{ mode: 'singleRow' }}
              onRowClicked={onRowClicked}
              loading={loading}
              pagination={true}
              paginationPageSize={10}
              rowHeight={46}
              headerHeight={38}
              suppressCellFocus={true}
            />
          </div>
        </div>

        {/* Right: Selected Event JSON Inspector (4 of 12 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#e5edf8] min-h-[538px] flex flex-col shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Audit Payload Inspector
                </h3>
              </div>
              {selectedRecord && (
                <button
                  onClick={() => onInspectOrder(selectedRecord.transactionId)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors cursor-pointer"
                >
                  <span>Investigate</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedRecord ? (
              <div className="flex-1 overflow-auto mt-3.5 space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1.5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">Event Identifier</div>
                  <div className="text-slate-800 text-xs truncate font-mono">{selectedRecord.id}</div>
                  
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold pt-1">Target Order</div>
                  <div className="text-blue-600 font-bold text-xs">{selectedRecord.transactionId}</div>
                  
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold pt-1">Actor Identity</div>
                  <div className="text-purple-700 text-xs font-semibold">{selectedRecord.actor}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-500 font-sans font-medium">Raw Event Details:</span>
                    <span className="text-[10px] text-slate-400 font-mono">application/json</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 text-[11px] text-slate-800 overflow-x-auto leading-relaxed max-h-[290px] font-mono shadow-inner">
                    {JSON.stringify(selectedRecord.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 font-mono space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-300" />
                <span>Select an audit record to view JSON payload.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
