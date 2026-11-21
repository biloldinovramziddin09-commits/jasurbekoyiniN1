import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  Compass,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { AgeGroup } from '@/src/types/platform';
import { AGE_GROUP_META } from '@/src/data/assets';
import { UzgameLogo } from '@/src/components/UzgameLogo';
import { usePlatform } from '@/src/context/PlatformContext';

const AGE_ORDER: AgeGroup[] = ['3-5', '6-9', '10-15', '16-20'];

const AGE_ICONS: Record<AgeGroup, React.ReactNode> = {
  '3-5': <Sparkles className="h-5 w-5 text-amber-400" />,
  '6-9': <Compass className="h-5 w-5 text-blue-400" />,
  '10-15': <Gamepad2 className="h-5 w-5 text-purple-400" />,
  '16-20': <Trophy className="h-5 w-5 text-orange-400" />,
};

export const Onboarding: React.FC = () => {
  const { completeOnboarding } = usePlatform();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectAge = (age: AgeGroup) => {
    setSelectedAge(age);
    setErrorMsg('');
    setStep(2);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setErrorMsg("Iltimos, kamida 2 ta harfdan iborat ismingizni kiriting.");
      return;
    }
    if (trimmed.length > 24) {
      setErrorMsg("Ism 24 ta belgidan oshmasligi kerak.");
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  const handleEnterPlatform = () => {
    if (!selectedAge) return;
    completeOnboarding(nameInput.trim(), selectedAge);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-white flex flex-col justify-between px-4 py-8 md:px-10">
      {/* Top Bar */}
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between">
        <UzgameLogo size="lg" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Bosqich {step === 3 ? 2 : step} / 2
        </span>
      </div>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-6xl my-auto py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="step1"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              <div className="max-w-3xl space-y-3">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                  Salom! UZGAME platformasiga xush kelibsiz! Yoshingiz nechida?
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400">
                  Sizning yoshingizga mos eng xavfsiz, qiziqarli va zamonaviy 3D o‘yinlarni tanlab beramiz.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {AGE_ORDER.map((ageKey) => {
                  const meta = AGE_GROUP_META[ageKey];
                  return (
                    <motion.button
                      key={ageKey}
                      type="button"
                      whileHover={{ y: -6 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectAge(ageKey)}
                      className={`group text-left overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] transition-all cursor-pointer ${meta.borderClass} hover:shadow-2xl`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                        <img
                          src={meta.image}
                          alt={meta.label}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="font-display text-2xl font-bold text-white">
                            {meta.label}
                          </span>
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/80 border border-white/15">
                            {AGE_ICONS[ageKey]}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {meta.subtitle}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{meta.badge}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {meta.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>
                  Maxfiylik himoyalangan: tug‘ilgan sana, telefon raqami yoki manzil so‘ralmaydi. Ma’lumotlar faqat qurilmangizda saqlanadi.
                </span>
              </div>
            </motion.section>
          )}

          {step === 2 && selectedAge && (
            <motion.section
              key="step2"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 sm:p-8 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Yosh guruhini o‘zgartirish ({AGE_GROUP_META[selectedAge].label})
              </button>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                Ajoyib! Ismingiz nima?
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                O‘yinlardagi rekordlaringiz va yutuqlaringiz shu ism bilan saqlanadi.
              </p>

              {AGE_GROUP_META[selectedAge].parentNote && (
                <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{AGE_GROUP_META[selectedAge].parentNote}</span>
                </div>
              )}

              <form onSubmit={handleNameSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="uzgame-username"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    O‘yinchi ismi
                  </label>
                  <input
                    id="uzgame-username"
                    type="text"
                    autoFocus
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Masalan: Aziz"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#070B14] px-4 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {errorMsg && (
                    <p className="mt-2 text-xs font-medium text-red-500">{errorMsg}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors cursor-pointer"
                >
                  Davom etish
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </motion.section>
          )}

          {step === 3 && selectedAge && (
            <motion.section
              key="step3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="mx-auto max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-8 text-center shadow-2xl space-y-6"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                <UserCheck className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white text-balance">
                  Xush kelibsiz, {nameInput.trim()}! O‘yinlar olamiga tayyormisiz?
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tanlangan yosh guruhi: <strong className="text-slate-900 dark:text-white">{AGE_GROUP_META[selectedAge].label}</strong> · 5 ta maxsus 3D o‘yin va barcha katalog siz uchun tayyor!
                </p>
              </div>

              <button
                type="button"
                onClick={handleEnterPlatform}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 px-8 py-3.5 text-sm font-semibold text-white transition-all cursor-pointer"
              >
                O‘yinlar olamiga kirish
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <div className="mx-auto w-full max-w-6xl text-center text-xs text-slate-500 dark:text-slate-500">
        UZGAME · O‘zbek tilidagi 3D onlayn o‘yinlar platformasi
      </div>
    </div>
  );
};
