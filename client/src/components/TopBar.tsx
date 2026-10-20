import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Menu, CheckCircle2, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface TopBarProps {
  onToggleMobileMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  unreadCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileMenu,
  searchQuery = '',
  onSearchChange,
  unreadCount = 2,
}) => {
  const { session, isAdmin, loginAsAdmin, switchToGuest } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white/80 backdrop-blur-md border-b border-[#e5edf8] px-4 sm:px-8 flex items-center justify-between gap-4 transition-all">
      
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Pill Input matching reference image */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search orders, customers, or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-[#f8fafc] border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-[#e5edf8] shadow-xl p-3 z-50 animate-fade-in-up">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[11px] font-medium text-blue-600 cursor-pointer hover:underline">
                  Mark all read
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-900">High-risk checkout intercepted</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">Order with Tor/proxy network was held pre-capture.</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900">PayPal Sandbox Connected</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Orders v2 API gateway operational.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill with Active Role */}
        <div className="relative">
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer select-none border border-transparent hover:border-slate-200"
          >
            {/* Avatar Badge */}
            <div className={`w-8 h-8 rounded-full ${isAdmin ? 'bg-emerald-600' : 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shadow-xs transition-colors`}>
              {session.avatarInitials}
            </div>
            
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {session.name}
              </span>
              <span className={`text-[10px] font-medium leading-tight ${isAdmin ? 'text-emerald-600' : 'text-blue-600'}`}>
                {session.badge}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#e5edf8] shadow-2xl p-3 z-50 animate-fade-in-up text-xs">
              
              {/* Active User Header */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-3">
                <div className={`w-9 h-9 rounded-full ${isAdmin ? 'bg-emerald-600' : 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}>
                  {session.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{session.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{session.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                    {isAdmin ? '🛡️ Merchant Administrator' : '🔍 Guest Evaluator (Demo)'}
                  </span>
                </div>
              </div>

              {/* 1-Click Role Switcher */}
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                  Hackathon Role Switcher
                </p>

                {isAdmin ? (
                  <button
                    onClick={() => {
                      switchToGuest();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center justify-between transition-colors border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-slate-500" />
                      <span>Switch to Demo Evaluator</span>
                    </div>
                    <span className="text-[10px] bg-slate-600 text-white px-2 py-0.5 rounded-md font-bold">
                      Demo Mode
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      loginAsAdmin();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold flex items-center justify-between transition-colors border border-blue-200"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Switch to Merchant Admin</span>
                    </div>
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                      1-Click
                    </span>
                  </button>
                )}
              </div>

              {/* Info Note for Judges */}
              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
                💡 <strong>Evaluation Note:</strong> Evaluators can switch roles in 1 click to test read-only triage vs. administrative decision override capabilities.
              </div>

            </div>
          )}
        </div>

      </div>

    </header>
  );
};
