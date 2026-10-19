import React from 'react';
import { 
  Home, 
  Search, 
  ShoppingCart, 
  Clock, 
  Settings as SettingsIcon,
  Shield,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus?: {
    mode?: string;
    environment?: string;
    policyVersion?: string;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'investigation', label: 'Investigations', icon: Search },
    { id: 'checkout', label: 'Sandbox Store', icon: ShoppingCart },
    { id: 'audit', label: 'Activity', icon: Clock },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#e5edf8] flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Nav items */}
        <div className="flex flex-col gap-6">
          
          {/* Brand Logo matching the reference image */}
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group px-2 py-1"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 fill-white/20 stroke-[2.2]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-lg tracking-tight text-[#0f172a]">
                PayShield
              </span>
              <span className="font-bold text-lg tracking-tight text-blue-600">
                AI
              </span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#eff6ff] text-[#2563eb] font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Bottom: Environment Card & Tagline */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          
          {/* Sandbox Environment Status Card */}
          <div
            onClick={() => handleNavClick('settings')}
            className="flex items-center justify-between p-3 rounded-xl border border-[#e5edf8] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-blue-200 transition-all cursor-pointer group shadow-xs"
            title="Open PayPal Settings"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">
                  {systemStatus?.environment === 'production' ? 'Live Environment' : 'Sandbox Environment'}
                </span>
                <span className="text-[11px] font-medium text-emerald-600">
                  {systemStatus?.mode === 'offline' ? 'Offline' : 'Connected'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Secure Payments Footer Tagline */}
          <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Secure Payments. Smarter Decisions.</span>
          </div>

        </div>

      </aside>
    </>
  );
};
