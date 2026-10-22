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
import { Search, ArrowUpRight, Inbox } from 'lucide-react';

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
      fontSize: 13,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    });
  }, []);

  const filteredData = useMemo(() => {
    if (tierFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.riskTier === tierFilter);
  }, [transactions, tierFilter]);

  const colDefs = useMemo<ColDef<TransactionData>[]>(() => {
    return [
      {
        field: 'orderId',
        headerName: 'Order ID',
        width: 195,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const isSelected = params.value === selectedOrderId;
          const createdAt = params.data?.createdAt ? new Date(params.data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <div className="flex flex-col justify-center h-full py-1 leading-normal">
              <div className="flex items-center gap-1.5">
                <span className={`font-mono text-xs font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-100 hover:text-cyan-400'}`}>
                  {params.value}
                </span>
                {params.data?.paymentSource === 'PAYPAL_SANDBOX' ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-700/80 font-bold tracking-tight" title="Verified PayPal Sandbox Gateway">
                    PayPal Sandbox
                  </span>
                ) : params.data?.paymentSource === 'MOCK_SIMULATOR' ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold" title="Offline Mock Simulator">
                    Mock Demo
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold" title="Simulated Benchmark Dataset">
                    Benchmark
                  </span>
                )}
              </div>
              {createdAt && (
                <span className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">{createdAt}</span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Customer',
        flex: 1.2,
        minWidth: 155,
        valueGetter: (params: any) => params.data?.customer?.name || params.data?.customerName || 'Anonymous',
        cellRenderer: (params: any) => {
          const email = params.data?.customer?.email || params.data?.customerEmail || '';
          return (
            <div className="flex flex-col justify-center h-full leading-snug py-1">
              <span className="text-xs text-slate-200 font-medium truncate">{params.value}</span>
              {email && <span className="text-[11px] text-slate-400 truncate leading-none mt-0.5">{email}</span>}
            </div>
          );
        },
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
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
        headerName: 'Risk Status',
        width: 160,
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
        width: 130,
        cellRenderer: (params: any) => {
          const raw = params.value || 'PENDING';
          const label =
            raw === 'CAPTURED'
              ? 'Paid'
              : raw === 'BLOCKED'
              ? 'Blocked'
              : raw === 'CANCELLED'
              ? 'Cancelled'
              : raw === 'DECLINED'
              ? 'Declined'
              : raw === 'PENDING_RISK_REVIEW'
              ? 'Review Required'
              : 'Pending';

          const badgeClass =
            raw === 'CAPTURED'
              ? 'bg-[#06281e] text-[#34d399] border-[#065f46]'
              : raw === 'BLOCKED'
              ? 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
              : raw === 'CANCELLED'
              ? 'bg-[#1e293b] text-slate-400 border-slate-700'
              : raw === 'DECLINED'
              ? 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
              : 'bg-[#2e1c07] text-[#fbbf24] border-[#78350f]';

          return (
            <div className="flex items-center h-full">
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badgeClass}`}>
                {label}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Action',
        width: 125,
        pinned: 'right',
        cellRenderer: (params: any) => {
          return (
            <div className="flex items-center h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTransaction(params.data.orderId);
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#10172a] hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300 border border-[#1e293b] hover:border-cyan-800 transition-colors"
              >
                <span>View Details</span>
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
    <div className="flex flex-col bg-[#0a0f1d] border border-[#1e293b] rounded-xl overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-3 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 bg-[#070b16]">
        
        {/* Simple Filter Tabs */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tierFilter === 'ALL' 
                ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setTierFilter('REVIEW')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tierFilter === 'REVIEW' 
                ? 'bg-[#2e1c07] text-[#fbbf24] border border-[#78350f]' 
                : 'text-slate-400 hover:text-[#fbbf24]'
            }`}
          >
            Needs Review ({transactions.filter((t) => t.riskTier === 'REVIEW').length})
          </button>
          <button
            onClick={() => setTierFilter('BLOCK')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tierFilter === 'BLOCK' 
                ? 'bg-[#2d0b12] text-[#f87171] border border-[#7f1d1d]' 
                : 'text-slate-400 hover:text-[#f87171]'
            }`}
          >
            High Risk ({transactions.filter((t) => t.riskTier === 'BLOCK').length})
          </button>
          <button
            onClick={() => setTierFilter('ALLOW')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              tierFilter === 'ALLOW' 
                ? 'bg-[#06281e] text-[#34d399] border border-[#065f46]' 
                : 'text-slate-400 hover:text-[#34d399]'
            }`}
          >
            Low Risk ({transactions.filter((t) => t.riskTier === 'ALLOW').length})
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search orders..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-lg bg-[#060911] border border-[#1e293b] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 w-52 sm:w-60"
          />
        </div>

      </div>

      {/* The AG Grid Instance */}
      <div className="h-[400px] w-full relative">
        {filteredData.length === 0 && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0f1d] text-slate-400 space-y-2">
            <Inbox className="w-7 h-7 text-slate-500" />
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
          rowHeight={52}
          headerHeight={40}
          suppressCellFocus={true}
        />
      </div>

    </div>
  );
};

