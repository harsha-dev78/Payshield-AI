import React from 'react';

export const ShieldIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className} select-none pointer-events-none`}>
      {/* Ambient soft glow background */}
      <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl transform scale-90" />
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
      >
        <defs>
          {/* Main Shield Radial/Linear Gradients */}
          <linearGradient id="shieldGrad" x1="40" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="shieldBackGlow" x1="100" y1="10" x2="100" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="innerGlass" x1="60" y1="40" x2="140" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>

          <filter id="shieldShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#1d4ed8" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Outer ambient decorative rings & nodes */}
        <circle cx="100" cy="100" r="82" stroke="#dbeafe" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.8" />
        <circle cx="34" cy="76" r="3" fill="#60a5fa" opacity="0.7" />
        <circle cx="166" cy="124" r="3.5" fill="#3b82f6" opacity="0.8" />
        <circle cx="152" cy="54" r="2.5" fill="#93c5fd" />
        <circle cx="48" cy="144" r="2.5" fill="#93c5fd" />

        {/* Floating tech cross accents */}
        <path d="M24 100 H32 M28 96 V104" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M168 84 H176 M172 80 V88" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* Outer Shield Shell */}
        <path
          d="M100 24 C132 24 162 38 162 76 C162 126 122 164 100 178 C78 164 38 126 38 76 C38 38 68 24 100 24 Z"
          fill="url(#shieldBackGlow)"
        />

        {/* Main 3D Glossy Shield Body */}
        <path
          d="M100 32 C126 32 150 44 150 78 C150 120 118 152 100 164 C82 152 50 120 50 78 C50 44 74 32 100 32 Z"
          fill="url(#shieldGrad)"
          filter="url(#shieldShadow)"
        />

        {/* Inner Glassmorphic Highlight Layer */}
        <path
          d="M100 40 C120 40 140 50 140 80 C140 114 114 142 100 152 C86 142 60 114 60 80 C60 50 80 40 100 40 Z"
          fill="url(#innerGlass)"
        />

        {/* Crisp White Checkmark */}
        <path
          d="M82 96 L94 108 L122 80"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Top Glint Sparkle */}
        <circle cx="78" cy="52" r="2" fill="#ffffff" opacity="0.9" />
        <circle cx="100" cy="42" r="1.5" fill="#ffffff" opacity="0.7" />
      </svg>
    </div>
  );
};
