import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { TopBar } from './components/TopBar.js';
import { Dashboard } from './pages/Dashboard.js';
import { Investigation } from './pages/Investigation.js';
import { SandboxCheckout } from './pages/SandboxCheckout.js';
import { AuditTrail } from './pages/AuditTrail.js';
import { Settings } from './pages/Settings.js';
import type { TransactionData } from './types/index.js';
import { api } from './services/api.js';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [txList, health] = await Promise.all([
        api.getTransactions(),
        api.getHealth().catch(() => null),
      ]);
      setTransactions(txList);
      if (health) {
        setSystemStatus({
          mode: 'Active',
          environment: health.environment,
          policyVersion: health.policyVersion,
        });
      }
      setSelectedOrderId((prev) => (!prev && txList.length > 0 ? txList[0].orderId : prev));
    } catch (err) {
      console.error('Initialization error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('paypal_action')) {
      setActiveTab('checkout');
    }
  }, [loadInitialData]);

  const handleSelectTransaction = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveTab('investigation');
  };

  const handleOrderCompleted = async (orderId: string) => {
    await loadInitialData();
    setSelectedOrderId(orderId);
    setActiveTab('investigation');
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-800 flex font-['Inter',sans-serif]">
      
      {/* 1. Left Sidebar Navigation matching reference image */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
        
        {/* Top Header Bar matching reference image */}
        <TopBar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          searchQuery={searchFilter}
          onSearchChange={setSearchFilter}
          unreadCount={2}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 w-full px-4 sm:px-8 py-6 max-w-7xl">
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              onSelectTransaction={handleSelectTransaction}
              onRefresh={loadInitialData}
              onNavigateToTab={setActiveTab}
              loading={loading}
              searchFilter={searchFilter}
            />
          )}

          {activeTab === 'investigation' && (
            <Investigation
              orderId={selectedOrderId || (transactions[0]?.orderId || 'ORD-3199')}
              onBack={() => setActiveTab('dashboard')}
              onRefreshList={loadInitialData}
            />
          )}

          {activeTab === 'checkout' && (
            <SandboxCheckout
              onOrderCompleted={handleOrderCompleted}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrail
              onInspectOrder={handleSelectTransaction}
            />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </main>

      </div>

    </div>
  );
}

export default App;
