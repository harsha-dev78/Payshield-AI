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
import { Search, Filter, ArrowUpRight, Inbox } from 'lucide-react';

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

  // Custom AG Grid Theme matching PayShield enterprise dark-navy palette
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
        headerName: 'Order ID',
        width: 140,
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
        width: 135,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const d = new Date(params.value);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        },
      },
      {
        headerName: 'Customer',
        flex: 1.2,
        minWidth: 160,
        valueGetter: (params: any) => params.data?.customer?.name || params.data?.customerName || 'Anonymous',
        cellRenderer: (params: any) => {
          const email = params.data?.customer?.email || params.data?.customerEmail || '';
          return (
            <div className="flex flex-col justify-center h-full leading-tight py-1">
              <span className="font-medium text-slate-200 text-xs truncate">{params.value || 'Anonymous'}</span>
              <span className="text-[10px] text-slate-400 font-mono truncate">{email}</span>
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
              ${Number(params.value || 0).toFixed(2)} <span className="text-[10px] text-slate-400 ml-1 font-normal">{curr}</span>
            </div>
          );
        },
      },
      {
        field: 'riskTier',
        headerName: 'Risk Category',
        width: 175,
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
        headerName: 'Payment Status',
        width: 135,
        cellRenderer: (params: any) => {
          const status = params.value || 'PENDING';
          const getStatusBadge = () => {
            switch (status) {
              case 'CAPTURED':
                return 'bg-[#06281e] text-[#34d399] border-[#065f46]';
              case 'BLOCKED':
                return 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]';
              case 'PENDING':
                return 'bg-[#2e1c07] text-[#fbbf24] border-[#78350f]';
              default:
                return 'bg-slate-900 text-slate-300 border-slate-700';
            }
          };

          return (
            <div className="flex items-center h-full">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getStatusBadge()}`}>
                {status}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Action',
        width: 105,
        pinned: 'right',
        cellRenderer: (params: any) => {
          return (
            <div className="flex items-center h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTransaction(params.data.orderId);
                }}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-[#10172a] hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-[#1e293b] hover:border-cyan-800 transition-colors"
              >
                <span>Inspect</span>
                <ArrowUpRight className="w-3 h-3 text-cyan-400" />
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
    <div className="flex flex-col bg-[#0a0f1d] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
      
      {/* Table Header Controls & Filter Tabs */}
      <div className="p-3.5 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 bg-[#070b16]">
        
        {/* Risk Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#060911] border border-[#1e293b] text-xs">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
              tierFilter === 'ALL' 
                ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setTierFilter('BLOCK')}
            className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
              tierFilter === 'BLOCK' 
                ? 'bg-[#2d0b12] text-[#f87171] border border-[#7f1d1d]' 
                : 'text-slate-400 hover:text-[#f87171] border border-transparent'
            }`}
          >
            High Risk ({transactions.filter((t) => t.riskTier === 'BLOCK').length})
          </button>
          <button
            onClick={() => setTierFilter('REVIEW')}
            className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
              tierFilter === 'REVIEW' 
                ? 'bg-[#2e1c07] text-[#fbbf24] border border-[#78350f]' 
                : 'text-slate-400 hover:text-[#fbbf24] border border-transparent'
            }`}
          >
            Review ({transactions.filter((t) => t.riskTier === 'REVIEW').length})
          </button>
          <button
            onClick={() => setTierFilter('ALLOW')}
            className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
              tierFilter === 'ALLOW' 
                ? 'bg-[#06281e] text-[#34d399] border border-[#065f46]' 
                : 'text-slate-400 hover:text-[#34d399] border border-transparent'
            }`}
          >
            Low Risk ({transactions.filter((t) => t.riskTier === 'ALLOW').length})
          </button>
        </div>

        {/* Search Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, email, country..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#060911] border border-[#1e293b] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 w-52 sm:w-60"
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-[#060911] px-2.5 py-1.5 rounded-lg border border-[#1e293b]">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>AG Grid</span>
          </div>
        </div>

      </div>

      {/* The AG Grid Instance */}
      <div className="h-[410px] w-full relative">
        {filteredData.length === 0 && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0f1d] text-slate-400 space-y-2">
            <Inbox className="w-8 h-8 text-slate-500" />
            <p className="text-xs">No transactions match the selected filter.</p>
          </div>
        )}

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
          rowHeight={44}
          headerHeight={36}
          suppressCellFocus={true}
        />
      </div>

      {/* Grid Footer Hint */}
      <div className="px-4 py-2 bg-[#070b16] border-t border-[#1e293b] flex items-center justify-between text-[11px] text-slate-400">
        <span>Click any row to open the complete 4-section investigation report.</span>
        <span className="font-mono text-cyan-400 text-[10px]">Active Rule Policy v1.2.0</span>
      </div>

    </div>
  );
};
