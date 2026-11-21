import React, { useState } from 'react';
import {
  Award,
  Clock,
  Compass,
  Edit3,
  Gamepad2,
  Heart,
  Play,
  RotateCcw,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { usePlatform } from '@/src/context/PlatformContext';
import { AGE_GROUP_META } from '@/src/data/assets';
import { ACHIEVEMENT_DEFINITIONS, getGameById } from '@/src/data/games';
import { AgeGroup } from '@/src/types/platform';

const AGE_KEYS: AgeGroup[] = ['3-5', '6-9', '10-15', '16-20'];

const ICON_MAP: Record<string, React.ReactNode> = {
  Play: <Play className="h-5 w-5" />,
  Gamepad2: <Gamepad2 className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Compass: <Compass className="h-5 w-5" />,
};

export const ProfilePage: React.FC = () => {
  const {
    state,
    updateProfile,
    resetProgress,
    resetFullAccount,
    launchGame,
  } = usePlatform();

  const profile = state.profile!;
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [ageDraft, setAgeDraft] = useState<AgeGroup>(profile.ageGroup);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');

  const historyList = Object.values(state.history).sort(
    (a, b) => b.lastPlayedAt - a.lastPlayedAt,
  );
  const totalPlays = historyList.reduce((acc, h) => acc + h.plays, 0);
  const totalSeconds = historyList.reduce((acc, h) => acc + h.totalSeconds, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      setError("Ism kamida 2 ta harfdan iborat bo‘lishi kerak.");
      return;
    }
    updateProfile({ name: trimmed, ageGroup: ageDraft });
    setEditing(false);
    setError('');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header / Profile Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {profile.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Yosh guruhi: {AGE_GROUP_META[profile.ageGroup].label} ·{' '}
                {AGE_GROUP_META[profile.ageGroup].subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setNameDraft(profile.name);
                setAgeDraft(profile.ageGroup);
                setEditing((v) => !v);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              Profilni tahrirlash
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Natijalarni tozalash
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <form
            onSubmit={handleSave}
            className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Yangi ism
              </label>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Yosh guruhi
              </label>
              <select
                value={ageDraft}
                onChange={(e) => setAgeDraft(e.target.value as AgeGroup)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                {AGE_KEYS.map((ak) => (
                  <option key={ak} value={ak}>
                    {AGE_GROUP_META[ak].label} — {AGE_GROUP_META[ak].subtitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
            {error && <p className="sm:col-span-3 text-xs text-red-500">{error}</p>}
          </form>
        )}
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>O‘ynalgan o‘yinlar</span>
            <Gamepad2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {totalPlays}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Sevimlilar</span>
            <Heart className="h-4 w-4 text-orange-500" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {state.favorites.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>O‘yin vaqti</span>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {totalMinutes > 0 ? `${totalMinutes} daq` : `${totalSeconds} son`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Yutuqlar</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {Object.keys(state.unlockedAchievements).length} / {ACHIEVEMENT_DEFINITIONS.length}
          </p>
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Yutuqlar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENT_DEFINITIONS.map((ach) => {
            const unlocked = Boolean(state.unlockedAchievements[ach.id]);
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 flex items-start gap-3.5 ${
                  unlocked
                    ? 'border-blue-500/40 bg-blue-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] opacity-65'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    unlocked
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {ICON_MAP[ach.iconName] ?? <Trophy className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      {ach.title}
                    </h3>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {unlocked ? 'Ochilgan' : 'Qulflangan'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {ach.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Scores Table */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          So‘nggi o‘yinlar va rekordlar
        </h2>
        {historyList.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629]">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {historyList.map((h) => {
                const game = getGameById(h.gameId);
                if (!game) return null;
                return (
                  <div
                    key={h.gameId}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div>
                      <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {game.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {game.category} · {h.plays} marta o‘ynalgan
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-semibold text-orange-500 tabular-nums">
                        Rekord: {h.bestScore}
                      </span>
                      <button
                        type="button"
                        onClick={() => launchGame(game.id)}
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        O‘ynash
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hali birorta o‘yin natijasi qayd etilmagan.
          </p>
        )}
      </section>

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 space-y-5 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Ma’lumotlarni tozalash
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Faqat o‘yin natijalari va yutuqlarni tozalaysizmi yoki hisobdan chiqib qaytadan ro‘yxatdan o‘tasizmi?
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  resetProgress();
                  setConfirmReset(false);
                }}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-400 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Faqat natijalarni tozalash
              </button>
              <button
                type="button"
                onClick={() => {
                  resetFullAccount();
                  setConfirmReset(false);
                }}
                className="w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Profilni o‘chirish va qaytadan kirish
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
