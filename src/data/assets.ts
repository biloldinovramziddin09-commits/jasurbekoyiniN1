import heroArenaImg from '@/src/assets/images/hero_uzgame_arena_1795256051033.jpg';
import ageKidsImg from '@/src/assets/images/age_kids_wonderworld_1795256050545.jpg';
import ageJuniorImg from '@/src/assets/images/age_junior_explorer_1795256050789.jpg';
import ageTeenImg from '@/src/assets/images/age_teen_competition_1795256051207.jpg';
import ageProImg from '@/src/assets/images/age_pro_simulator_1795256051427.jpg';
import { AgeGroup } from '@/src/types/platform';

export const HERO_BANNER_IMAGE = heroArenaImg;

export const AGE_GROUP_META: Record<
  AgeGroup,
  {
    id: AgeGroup;
    label: string;
    subtitle: string;
    badge: string;
    description: string;
    image: string;
    accentClass: string;
    borderClass: string;
    glowHex: string;
    parentNote?: string;
  }
> = {
  '3-5': {
    id: '3-5',
    label: '3–5 yosh',
    subtitle: 'Kichkintoylar dunyosi',
    badge: 'Xavfsiz va quvnoq',
    description:
      "Ranglar, shakllar, quvnoq hayvonlar, mevalar va kichik poyga mashinalari bilan o'rganish va o'ynash.",
    image: ageKidsImg,
    accentClass: 'from-amber-500 to-orange-500',
    borderClass: 'hover:border-amber-400/70',
    glowHex: '#F59E0B',
    parentNote: "Ota-onalar uchun qulay: hech qanday zo'ravonliksiz, katta tugmalar va o'zbekcha ko'rsatmalar.",
  },
  '6-9': {
    id: '6-9',
    label: '6–9 yosh',
    subtitle: 'Yosh kashfiyotchilar',
    badge: 'Sarguzasht va ijod',
    description:
      "Bloklar qurish, dinozavrlar oroli, kosmosga parvoz, super poyga va futbol chempionati.",
    image: ageJuniorImg,
    accentClass: 'from-blue-500 to-cyan-500',
    borderClass: 'hover:border-blue-400/70',
    glowHex: '#3B82F6',
    parentNote: "Do'stona raqobat va ijodiy topshiriqlar bilan boyitilgan 3D olam.",
  },
  '10-15': {
    id: '10-15',
    label: '10–15 yosh',
    subtitle: 'O‘smir chempionlar',
    badge: 'Dinamik 3D bellashuv',
    description:
      "Shahar poygalari, lazer-teg jamoaviy arenasi, tog' yo'ltanlamasi, professional futbol va omon qolish.",
    image: ageTeenImg,
    accentClass: 'from-purple-500 to-blue-600',
    borderClass: 'hover:border-purple-400/70',
    glowHex: '#8B5CF6',
  },
  '16-20': {
    id: '16-20',
    label: '16–20 yosh',
    subtitle: 'Pro simulyatorlar',
    badge: 'Yuqori aniqlikdagi 3D',
    description:
      "Realistik GT poyga simulyatori, taktik lazer arena, ochiq dunyo shahri, futbol menejeri va ekstremal offroad.",
    image: ageProImg,
    accentClass: 'from-orange-500 to-purple-600',
    borderClass: 'hover:border-orange-400/70',
    glowHex: '#F97316',
  },
};
