import React from 'react';
import { Shield, LayoutDashboard, Search, ShoppingBag, History, Settings, ExternalLink } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus?: {
    mode?: string;
    environment?: string;
    policyVersion?: string;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, systemStatus }) => {
  const navItems = [
    { id: 'dashboard', label: 'Triage Dashboard', icon: LayoutDashboard },
    { id: 'investigation', label: 'Investigation', icon: Search },
    { id: 'checkout', label: 'Sandbox Store', icon: ShoppingBag, badge: 'Live Demo' },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Config & APIMatic', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-950/50">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white font-['Inter',sans-serif]">
                  PayShield <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                  PayPal Agent
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
                Evidence-Based Payment Security & Gateway Interceptor
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold hidden md:inline">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sponsor & Environment Status Badges */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sandbox: <strong className="text-slate-100">{systemStatus?.mode || 'Active'}</strong></span>
            </div>
            <a
              href="https://developer.paypal.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-cyan-400 p-1.5 transition-colors"
              title="PayPal Developer Docs"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
