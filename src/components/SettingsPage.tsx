import React from 'react';
import {
  Globe,
  Monitor,
  Moon,
  Music,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlatform } from '@/src/context/PlatformContext';
import { GraphicsQuality } from '@/src/types/platform';

export const SettingsPage: React.FC = () => {
  const { state, updateSettings, showToast } = usePlatform();
  const s = state.settings;

  const qualityOptions: { id: GraphicsQuality; label: string; desc: string }[] = [
    { id: 'low', label: 'Past', desc: 'Oddiy qurilmalar uchun yuqori tezlik' },
    { id: 'medium', label: 'O‘rta', desc: 'Muvozanatli 3D sifat va tezlik' },
    { id: 'high', label: 'Yuqori', desc: 'Yumshoq soyalar va maksimal aniqlik' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          Sozlamalar
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ovoz, 3D grafika sifati va interfeys ko‘rinishini o‘zingizga moslang
        </p>
      </div>

      {/* Audio Settings */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 space-y-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Ovoz va musiqa
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {s.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-blue-500" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                O‘yin ovoz effektlari
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Yig‘ish, sakrash, zarba va g‘alaba tovushlari
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ soundEnabled: !s.soundEnabled })}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              s.soundEnabled
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {s.soundEnabled ? 'Yoqilgan' : 'O‘chirilgan'}
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Fon musiqasi
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O‘yin davomidagi sintezator musiqasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ musicEnabled: !s.musicEnabled })}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              s.musicEnabled
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {s.musicEnabled ? 'Yoqilgan' : 'O‘chirilgan'}
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900 dark:text-white">
              Ovoz balandligi
            </span>
            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 tabular-nums">
              {Math.round(s.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.volume * 100)}
            onChange={(e) =>
              updateSettings({ volume: Number(e.target.value) / 100 })
            }
            aria-label="Ovoz balandligi"
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>
      </section>

      {/* Graphics Quality */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-orange-500" />
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            3D Grafika sifati
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {qualityOptions.map((opt) => {
            const active = s.graphicsQuality === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  updateSettings({ graphicsQuality: opt.id });
                  showToast(`Grafika sifati "${opt.label}" rejimiga o‘zgartirildi.`);
                }}
                className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Theme & Language */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {s.theme === 'dark' ? (
              <Moon className="h-5 w-5 text-blue-400" />
            ) : (
              <Sun className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Ko‘rinish mavzusi
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Qorong‘i yoki yorug‘ interfeysni tanlang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#070B14] p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                s.theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Qorong‘i
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                s.theme === 'light'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Yorug‘
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Platforma tili
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Barcha menyu va o‘yin ko‘rsatmalari tili
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            O‘zbek tili (Lotin)
          </span>
        </div>
      </section>
    </div>
  );
};
