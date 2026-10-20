import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'GUEST_JUDGE' | 'MERCHANT_ADMIN';

export interface UserSession {
  role: UserRole;
  name: string;
  email: string;
  badge: string;
  avatarInitials: string;
}

interface AuthContextType {
  session: UserSession;
  isAdmin: boolean;
  loginAsAdmin: () => void;
  switchToGuest: () => void;
  toggleRole: () => void;
}

const GUEST_SESSION: UserSession = {
  role: 'GUEST_JUDGE',
  name: 'Demo Evaluator',
  email: 'judge@paypal-hackathon.demo',
  badge: 'Demo Mode',
  avatarInitials: 'DE',
};

const ADMIN_SESSION: UserSession = {
  role: 'MERCHANT_ADMIN',
  name: 'Merchant Admin',
  email: 'admin@payshield.ai',
  badge: 'Admin Verified',
  avatarInitials: 'MA',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const stored = localStorage.getItem('payshield_auth_role');
      if (stored === 'MERCHANT_ADMIN') return ADMIN_SESSION;
    } catch {
      // Fallback cleanly
    }
    return GUEST_SESSION;
  });

  const loginAsAdmin = () => {
    setSession(ADMIN_SESSION);
    try {
      localStorage.setItem('payshield_auth_role', 'MERCHANT_ADMIN');
    } catch {
      // ignore storage errors
    }
  };

  const switchToGuest = () => {
    setSession(GUEST_SESSION);
    try {
      localStorage.setItem('payshield_auth_role', 'GUEST_JUDGE');
    } catch {
      // ignore storage errors
    }
  };

  const toggleRole = () => {
    if (session.role === 'GUEST_JUDGE') {
      loginAsAdmin();
    } else {
      switchToGuest();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAdmin: session.role === 'MERCHANT_ADMIN',
        loginAsAdmin,
        switchToGuest,
        toggleRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
