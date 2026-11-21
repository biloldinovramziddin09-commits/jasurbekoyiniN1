import React from 'react';
import { GameMetadata } from '@/src/types/platform';

interface GameThumbnailProps {
  game: GameMetadata;
  className?: string;
}

export const GameThumbnail: React.FC<GameThumbnailProps> = ({ game, className = '' }) => {
  const { variantKey, accentHex, secondaryHex } = game;

  const renderIllustration = () => {
    switch (variantKey) {
      case 'colors':
        return (
          <g>
            <circle cx="95" cy="95" r="34" fill="#EF4444" />
            <circle cx="165" cy="75" r="30" fill="#3B82F6" />
            <circle cx="225" cy="110" r="28" fill="#FACC15" />
            <circle cx="150" cy="135" r="24" fill="#22C55E" />
            <circle cx="95" cy="83" r="10" fill="white" fillOpacity="0.35" />
            <circle cx="165" cy="65" r="9" fill="white" fillOpacity="0.35" />
          </g>
        );
      case 'animals':
        return (
          <g>
            <rect x="40" y="130" width="240" height="50" fill="#22C55E" fillOpacity="0.35" />
            <circle cx="160" cy="105" r="36" fill="#F59E0B" />
            <circle cx="132" cy="74" r="12" fill="#B45309" />
            <circle cx="188" cy="74" r="12" fill="#B45309" />
            <circle cx="147" cy="98" r="5" fill="#0F172A" />
            <circle cx="173" cy="98" r="5" fill="#0F172A" />
            <ellipse cx="160" cy="116" rx="14" ry="10" fill="#FDE68A" />
            <circle cx="160" cy="113" r="4" fill="#451A03" />
          </g>
        );
      case 'shapes':
        return (
          <g>
            <rect x="65" y="75" width="48" height="48" rx="6" fill="#3B82F6" transform="rotate(-10 89 99)" />
            <circle cx="160" cy="95" r="28" fill="#EF4444" />
            <polygon points="235,62 205,124 265,124" fill="#F59E0B" />
          </g>
        );
      case 'fruits':
        return (
          <g>
            <circle cx="110" cy="105" r="30" fill="#EF4444" />
            <path d="M110 75 Q118 62 128 66" stroke="#22C55E" strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="178" cy="110" r="26" fill="#F97316" />
            <path d="M215 115 Q245 125 255 82 Q242 108 215 115Z" fill="#FACC15" />
          </g>
        );
      case 'cute-car':
      case 'super-car':
      case 'ultimate-gt':
        return (
          <g>
            <path d="M0 145 Q160 100 320 145 L320 180 L0 180 Z" fill="#0F172A" fillOpacity="0.65" />
            <path d="M35 140 L285 140" stroke={secondaryHex} strokeWidth="3" strokeDasharray="16 12" />
            <g transform="translate(86, 82)">
              <rect x="10" y="24" width="128" height="32" rx="10" fill={accentHex} />
              <path d="M36 24 L54 4 L104 4 L120 24 Z" fill={accentHex} />
              <path d="M44 22 L58 8 L98 8 L112 22 Z" fill="#0F172A" />
              <circle cx="38" cy="56" r="14" fill="#1E293B" stroke="#E2E8F0" strokeWidth="4" />
              <circle cx="112" cy="56" r="14" fill="#1E293B" stroke="#E2E8F0" strokeWidth="4" />
              <rect x="128" y="32" width="12" height="7" rx="2" fill="#FEF08A" />
            </g>
          </g>
        );
      case 'voxel':
        return (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <g key={i} transform={`translate(${64 + i * 48}, ${86 - (i % 2) * 26})`}>
                <rect x="0" y="0" width="44" height="44" fill={i === 2 ? '#FACC15' : '#4ADE80'} stroke="#065F46" strokeWidth="2" />
                <rect x="0" y="22" width="44" height="22" fill={i === 2 ? '#CA8A04' : '#78350F'} />
              </g>
            ))}
            <polygon points="160,34 176,54 160,74 144,54" fill="#38BDF8" />
          </g>
        );
      case 'dino':
        return (
          <g>
            <polygon points="220,145 260,55 300,145" fill="#57534E" />
            <polygon points="252,72 260,55 268,72" fill="#F97316" />
            <rect x="75" y="90" width="84" height="44" rx="10" fill="#16A34A" />
            <rect x="140" y="56" width="38" height="36" rx="8" fill="#16A34A" />
            <polygon points="88,90 98,74 108,90" fill="#F59E0B" />
            <polygon points="112,90 122,74 132,90" fill="#F59E0B" />
            <circle cx="164" cy="70" r="4" fill="#0F172A" />
          </g>
        );
      case 'space':
        return (
          <g>
            <circle cx="220" cy="68" r="32" fill="#F59E0B" />
            <ellipse cx="220" cy="68" rx="56" ry="14" fill="none" stroke="#FDE68A" strokeWidth="4" transform="rotate(-18 220 68)" />
            <g transform="translate(82, 82) rotate(-25)">
              <rect x="0" y="0" width="52" height="24" rx="12" fill="#E2E8F0" />
              <polygon points="52,0 74,12 52,24" fill="#F97316" />
              <circle cx="30" cy="12" r="6" fill="#38BDF8" />
            </g>
            <circle cx="54" cy="40" r="2.5" fill="white" />
            <circle cx="120" cy="36" r="2" fill="white" />
            <circle cx="275" cy="130" r="3" fill="#38BDF8" />
          </g>
        );
      case 'soccer-kids':
      case 'football-pro':
      case 'football-manager':
        return (
          <g>
            <rect x="24" y="34" width="272" height="114" rx="8" fill="#15803D" stroke="white" strokeOpacity="0.6" strokeWidth="2.5" />
            <line x1="160" y1="34" x2="160" y2="148" stroke="white" strokeOpacity="0.6" strokeWidth="2.5" />
            <circle cx="160" cy="91" r="26" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2.5" />
            <circle cx="160" cy="91" r="14" fill="white" />
            <polygon points="160,81 167,88 164,97 156,97 153,88" fill="#0F172A" />
          </g>
        );
      case 'city-driver':
      case 'open-world':
        return (
          <g>
            <rect x="34" y="42" width="44" height="106" fill="#1E293B" />
            <rect x="90" y="26" width="52" height="122" fill="#334155" />
            <rect x="190" y="36" width="48" height="112" fill="#1E293B" />
            <rect x="248" y="54" width="40" height="94" fill="#334155" />
            <rect x="98" y="40" width="36" height="6" fill="#38BDF8" />
            <rect x="98" y="58" width="36" height="6" fill="#38BDF8" />
            <rect x="108" y="122" width="96" height="24" rx="7" fill={accentHex} />
          </g>
        );
      case 'battle-arena':
      case 'tactical-arena':
        return (
          <g>
            <rect x="40" y="102" width="60" height="36" fill="#1E3A8A" stroke="#38BDF8" strokeWidth="2" />
            <rect x="215" y="92" width="60" height="46" fill="#7F1D1D" stroke="#F97316" strokeWidth="2" />
            <line x1="95" y1="90" x2="225" y2="74" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="228" cy="74" r="10" fill="#EF4444" />
            <circle cx="88" cy="90" r="10" fill="#3B82F6" />
          </g>
        );
      case 'zombie-cartoon':
        return (
          <g>
            <rect x="128" y="56" width="64" height="64" rx="10" fill="#65A30D" />
            <rect x="128" y="114" width="64" height="34" fill="#6D28D9" />
            <circle cx="146" cy="84" r="8" fill="#FEF08A" />
            <circle cx="174" cy="84" r="8" fill="#FEF08A" />
            <circle cx="242" cy="82" r="20" fill="#38BDF8" fillOpacity="0.35" stroke="#38BDF8" strokeWidth="2" />
          </g>
        );
      case 'offroad-mid':
      case 'extreme-offroad':
      default:
        return (
          <g>
            <polygon points="0,150 90,72 175,124 250,64 320,136 320,180 0,180" fill="#475569" />
            <g transform="translate(105, 86) rotate(-8)">
              <rect x="6" y="14" width="96" height="30" rx="6" fill={accentHex} />
              <rect x="24" y="0" width="54" height="18" rx="4" fill={accentHex} />
              <circle cx="26" cy="46" r="15" fill="#0F172A" stroke="#CBD5E1" strokeWidth="4" />
              <circle cx="82" cy="46" r="15" fill="#0F172A" stroke="#CBD5E1" strokeWidth="4" />
            </g>
          </g>
        );
    }
  };

  return (
    <div
      className={`relative w-full aspect-[16/10] overflow-hidden bg-slate-900 ${className}`}
    >
      <svg
        viewBox="0 0 320 180"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`bg-${game.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#090F1E" />
            <stop offset="60%" stopColor={accentHex} stopOpacity="0.35" />
            <stop offset="100%" stopColor={secondaryHex} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill={`url(#bg-${game.id})`} />
        <circle cx="270" cy="30" r="64" fill={accentHex} fillOpacity="0.14" />
        <circle cx="50" cy="150" r="56" fill={secondaryHex} fillOpacity="0.12" />
        {renderIllustration()}
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
    </div>
  );
};
