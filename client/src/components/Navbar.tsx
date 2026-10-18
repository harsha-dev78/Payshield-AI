import React, { useState } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Search, 
  ShoppingBag, 
  History, 
  Settings as SettingsIcon,
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

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'investigation', label: 'Investigations', icon: Search },
    { id: 'checkout', label: 'Sandbox Store', icon: ShoppingBag },
    { id: 'audit', label: 'Activity', icon: History },
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
            className="flex items-center gap-2.5 cursor-pointer select-none group" 
            onClick={() => handleTabClick('dashboard')}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0a0f1d] border border-[#1e293b] text-cyan-400 group-hover:border-cyan-500/50 transition-colors">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-100">
                PayShield <span className="text-cyan-400">AI</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                Payment Security
              </span>
            </div>
          </div>

          {/* Desktop Primary Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d] border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Sandbox Status & Secondary Settings Button */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0a0f1d] border border-[#1e293b] text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400">Sandbox Mode</span>
            </div>

            <button
              onClick={() => handleTabClick('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeTab === 'settings'
                  ? 'bg-[#10172a] text-cyan-400 border-cyan-800/60'
                  : 'bg-[#0a0f1d] text-slate-400 hover:text-slate-200 border-[#1e293b] hover:bg-[#10172a]'
              }`}
              title="Open Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0a0f1d] border border-[#1e293b] text-[11px] font-mono text-emerald-400">
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
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          <div className="pt-2 border-t border-[#1e293b]">
            <button
              onClick={() => handleTabClick('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0f1d]'
              }`}
            >
              <SettingsIcon className="w-4 h-4 text-cyan-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

