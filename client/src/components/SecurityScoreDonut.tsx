import React from 'react';

interface SecurityScoreDonutProps {
  score: number;
  max?: number;
  label?: string;
  size?: number;
}

export const SecurityScoreDonut: React.FC<SecurityScoreDonutProps> = ({
  score,
  max = 100,
  label = 'Security Health',
  size = 130,
}) => {
  const clampedScore = Math.min(Math.max(score, 0), max);
  const percentage = Math.round((clampedScore / max) * 100);

  // SVG Geometry
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Determine dynamic status and color based on score
  const getColor = () => {
    if (percentage >= 80) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.25)', text: 'text-emerald-400' };
    if (percentage >= 50) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)', text: 'text-amber-400' };
    return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.25)', text: 'text-rose-400' };
  };

  const { stroke, glow, text } = getColor();

  return (
    <div 
      className="relative flex items-center justify-center shrink-0" 
      style={{ width: size, height: size }}
      aria-label={`${label}: ${percentage} of ${max}`}
      title={`${label}: ${percentage}/${max}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Outer subtle glow/track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 3}
          fill="none"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="1.5"
        />

        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#131c31"
          strokeWidth={strokeWidth}
        />

        {/* Active progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${glow})`,
            transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease',
          }}
        />
      </svg>

      {/* Center score readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className={`text-2xl font-bold font-mono tracking-tight leading-none ${text}`}>
          {percentage}
        </span>
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mt-1">
          / 100
        </span>
      </div>
    </div>
  );
};
