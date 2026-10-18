import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { Dashboard } from './pages/Dashboard.js';
import { Investigation } from './pages/Investigation.js';
import { SandboxCheckout } from './pages/SandboxCheckout.js';
import { AuditTrail } from './pages/AuditTrail.js';
import { Settings } from './pages/Settings.js';
import type { TransactionData } from './types/index.js';
import { api } from './services/api.js';
import { Shield } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
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
      if (txList.length > 0 && !selectedOrderId) {
        setSelectedOrderId(txList[0].orderId);
      }
    } catch (err) {
      console.error('Initialization error', err);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-['Inter',sans-serif]">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            onSelectTransaction={handleSelectTransaction}
            onRefresh={loadInitialData}
            loading={loading}
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

      {/* Footer with Hackathon & Sponsor Attribution */}
      <footer className="border-t border-slate-800/80 bg-[#05080f] py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-400">PayShield AI</span>
            <span>— PayPal AI Hackathon Submission ($0 Budget Architecture)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>PayPal Sandbox v2</span>
            <span>•</span>
            <span className="text-cyan-400">AG Grid Community</span>
            <span>•</span>
            <span className="text-purple-400">APIMatic Spec</span>
            <span>•</span>
            <span className="text-blue-400">Render Blueprint</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
