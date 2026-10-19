import React from 'react';

export const SandboxStoreIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className} select-none pointer-events-none`}>
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="bagGrad" x1="20" y1="25" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          <linearGradient id="bagBack" x1="50" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Ambient sparkle dots */}
        <circle cx="15" cy="40" r="1.5" fill="#93c5fd" opacity="0.8" />
        <circle cx="28" cy="18" r="2" fill="#bfdbfe" />
        <circle cx="82" cy="30" r="1.5" fill="#60a5fa" />
        <circle cx="75" cy="15" r="2" fill="#ffffff" opacity="0.9" />
        <circle cx="88" cy="65" r="1.5" fill="#93c5fd" />

        {/* Shopping bag handles */}
        <path
          d="M38 35 C38 23 62 23 62 35"
          stroke="#93c5fd"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Bag Body */}
        <path
          d="M26 35 L32 80 C32.5 83 35 85 38 85 L62 85 C65 85 67.5 83 68 80 L74 35 C74.5 32 72 30 69 30 L31 30 C28 30 25.5 32 26 35 Z"
          fill="url(#bagGrad)"
        />

        {/* Bag Fold / Highlight */}
        <path
          d="M32 30 L36 82"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />

        {/* Shield icon on Bag */}
        <path
          d="M50 48 C55 48 60 50 60 56 C60 63 54 68 50 71 C46 68 40 63 40 56 C40 50 45 48 50 48 Z"
          fill="#ffffff"
          fillOpacity="0.9"
        />
        <path
          d="M47 56 L49 58 L54 53"
          stroke="#2563eb"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Mouse cursor pointer clicking */}
        <g transform="translate(62, 58)">
          <path
            d="M0 0 L12 12 L7 13 L11 21 L8 22 L4 14 L0 18 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="1.2"
          />
        </g>
      </svg>
    </div>
  );
};
