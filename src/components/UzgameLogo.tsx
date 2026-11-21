import React from 'react';

interface UzgameLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const UzgameLogo: React.FC<UzgameLogoProps> = ({ size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={iconSize}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="uzgameGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#uzgameGrad)" />
        <path
          d="M11 14V21.5C11 24.5376 13.4624 27 16.5 27C19.5376 27 22 24.5376 22 21.5V14"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M25.5 14L30.5 14L25.5 26H31"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-display font-bold tracking-tight text-slate-900 dark:text-white ${textSize}`}>
        UZ<span className="text-blue-600 dark:text-blue-400">GAME</span>
      </span>
    </span>
  );
};
