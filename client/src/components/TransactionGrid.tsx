import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ModuleRegistry, 
  AllCommunityModule, 
  themeQuartz
} from 'ag-grid-community';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { RiskBadge } from './RiskBadge.js';
import type { TransactionData } from '../types/index.js';
import { Search, Filter, ArrowUpRight } from 'lucide-react';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface TransactionGridProps {
  transactions: TransactionData[];
  onSelectTransaction: (orderId: string) => void;
  selectedOrderId?: string;
  loading?: boolean;
}

export const TransactionGrid: React.FC<TransactionGridProps> = ({
  transactions,
  onSelectTransaction,
  selectedOrderId,
  loading = false,
}) => {
  const [quickFilterText, setQuickFilterText] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'BLOCK' | 'REVIEW' | 'ALLOW'>('ALL');

  // Custom AG Grid Theme matching PayShield dark-navy palette
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
      fontSize: 13,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });
  }, []);

  // Filter transactions by tier tab
  const filteredData = useMemo(() => {
    if (tierFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.riskTier === tierFilter);
  }, [transactions, tierFilter]);

  // Column Definitions
  const colDefs = useMemo<ColDef<TransactionData>[]>(() => {
    return [
      {
        field: 'orderId',
        headerName: 'Order Ref',
        width: 145,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const isSelected = params.value === selectedOrderId;
          return (
            <div className="flex items-center gap-1.5 h-full font-mono text-xs">
              <span className={`font-semibold ${isSelected ? 'text-cyan-400 underline' : 'text-slate-200 hover:text-cyan-400'}`}>
                {params.value}
              </span>
            </div>
          );
        },
      },
      {
        field: 'createdAt',
        headerName: 'Timestamp',
        width: 130,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const d = new Date(params.value);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        },
      },
      {
        headerName: 'Customer',
        flex: 1.2,
        minWidth: 170,
        valueGetter: (params: any) => params.data?.customer?.name || params.data?.customerName || 'Anonymous',
        cellRenderer: (params: any) => {
          const email = params.data?.customer?.email || params.data?.customerEmail || '';
          return (
            <div className="flex flex-col justify-center h-full leading-tight py-1">
              <span className="font-medium text-slate-100 text-xs truncate">{params.value || 'Anonymous'}</span>
              <span className="text-[11px] text-slate-400 font-mono truncate">{email}</span>
            </div>
          );
        },
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 110,
        cellRenderer: (params: any) => {
          const curr = params.data?.currency || 'USD';
          return (
            <div className="flex items-center h-full font-mono font-semibold text-xs text-slate-100">
              ${Number(params.value || 0).toFixed(2)} <span className="text-[10px] text-slate-400 ml-1">{curr}</span>
            </div>
          );
        },
      },
      {
        field: 'riskTier',
        headerName: 'PayShield Risk Assessment',
        width: 195,
        cellRenderer: (params: any) => {
          return (
            <div className="flex items-center h-full">
              <RiskBadge tier={params.value} score={params.data?.riskScore} size="sm" />
            </div>
          );
        },
      },
      {
        field: 'paymentStatus',
        headerName: 'Payment Gate Status',
        width: 145,
        cellRenderer: (params: any) => {
          const status = params.value || 'PENDING';
          const getStatusBadge = () => {
            switch (status) {
              case 'CAPTURED':
                return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
              case 'BLOCKED':
                return 'bg-rose-950/60 text-rose-400 border-rose-500/40';
              case 'PENDING':
                return 'bg-amber-950/60 text-amber-400 border-amber-500/40';
              default:
                return 'bg-slate-800 text-slate-300 border-slate-700';
            }
          };

          return (
            <div className="flex items-center h-full">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getStatusBadge()}`}>
                {status}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Action',
        width: 110,
        pinned: 'right',
        cellRenderer: (params: any) => {
          return (
            <div className="flex items-center h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTransaction(params.data.orderId);
                }}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition-colors"
              >
                <span>Inspect</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          );
        },
      },
    ];
  }, [selectedOrderId, onSelectTransaction]);

  const onRowClicked = (event: RowClickedEvent<TransactionData>) => {
    if (event.data?.orderId) {
      onSelectTransaction(event.data.orderId);
    }
  };

  return (
    <div className="flex flex-col bg-[#0b0f1d] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      
      {/* Grid Header Controls */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#080d19]/80">
        
        {/* Tier Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              tierFilter === 'ALL' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Orders ({transactions.length})
          </button>
          <button
            onClick={() => setTierFilter('BLOCK')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              tierFilter === 'BLOCK' ? 'bg-rose-950 text-rose-300 border border-rose-800/60 shadow-sm' : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Critical Blocked ({transactions.filter((t) => t.riskTier === 'BLOCK').length})
          </button>
          <button
            onClick={() => setTierFilter('REVIEW')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              tierFilter === 'REVIEW' ? 'bg-amber-950 text-amber-300 border border-amber-800/60 shadow-sm' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Needs Review ({transactions.filter((t) => t.riskTier === 'REVIEW').length})
          </button>
          <button
            onClick={() => setTierFilter('ALLOW')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              tierFilter === 'ALLOW' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-sm' : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Allowed ({transactions.filter((t) => t.riskTier === 'ALLOW').length})
          </button>
        </div>

        {/* Quick Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders, customers, IPs..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-64"
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>AG Grid Community</span>
          </div>
        </div>

      </div>

      {/* The AG Grid Instance */}
      <div className="h-[430px] w-full">
        <AgGridReact<TransactionData>
          theme={darkNavyTheme}
          rowData={filteredData}
          columnDefs={colDefs}
          quickFilterText={quickFilterText}
          rowSelection={{ mode: 'singleRow' }}
          onRowClicked={onRowClicked}
          loading={loading}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          rowHeight={46}
          headerHeight={38}
          suppressCellFocus={true}
        />
      </div>

      {/* Grid Footer Hint */}
      <div className="px-4 py-2 bg-[#070b14] border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Click any row to open the deep-dive evidence and counterfactual investigation.</span>
        <span className="font-mono text-cyan-400">Real-Time Risk Telemetry Active</span>
      </div>

    </div>
  );
};
