import React, { useState } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Search, 
  ShoppingBag, 
  History, 
  Sliders, 
  ExternalLink,
  Menu,
  X
} from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Triage Dashboard', icon: LayoutDashboard },
    { id: 'investigation', label: 'Investigation', icon: Search },
    { id: 'checkout', label: 'Sandbox Store', icon: ShoppingBag, badge: 'Demo' },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Settings & Architecture', icon: Sliders },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#060911]/95 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group" 
            onClick={() => handleTabClick('dashboard')}
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#0a0f1d] border border-[#1e293b] text-cyan-400 group-hover:border-cyan-500/50 transition-colors">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-100">
                  PayShield <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/40 font-semibold tracking-wider">
                  Payment Security
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Pre-Capture Gateway Interceptor
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#10172a] text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d] border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: PayPal Sandbox Status Capsule & External Docs */}
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0a0f1d] border border-[#1e293b] text-[11px] font-mono text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Sandbox:</span>
              <strong className="text-slate-200 font-semibold">{systemStatus?.mode || 'Active'}</strong>
            </div>

            <a
              href="https://developer.paypal.com/docs/api/orders/v2/"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-[#0a0f1d] border border-transparent hover:border-[#1e293b] transition-all"
              title="Official PayPal Orders v2 API Docs"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0a0f1d] border border-[#1e293b] text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Sandbox</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#0a0f1d] border border-[#1e293b] text-slate-300 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1e293b] bg-[#060911]/98 px-4 pt-2 pb-4 space-y-1 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#10172a] text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
