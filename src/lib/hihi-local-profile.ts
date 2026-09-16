/** Guest browser profile. Registered members persist via game-api DB. */

export type HihiLocalProfile = {
  nickname: string;
  genderCode: 'M' | 'F';
  jobCode: string;
  heightCm: number;
  drinkCode: string;
  smokeCode: string;
  mbti: string;
  bloodType: string;
  birthYear: number;
  personalityText: string;
  introText: string;
  avatarName: string;
  avatarTitle: string;
};

const KEY = 'hihi_local_profile_v1';

export function emptyHihiLocalProfile(): HihiLocalProfile {
  return {
    nickname: '',
    genderCode: 'F',
    jobCode: '직장인',
    heightCm: 170,
    drinkCode: 'sometimes',
    smokeCode: 'never',
    mbti: 'ENFP',
    bloodType: 'A',
    birthYear: 1995,
    personalityText: '',
    introText: '',
    avatarName: '',
    avatarTitle: '',
  };
}

export function loadHihiLocalProfile(): HihiLocalProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<HihiLocalProfile>;
    if (!p || typeof p.nickname !== 'string' || p.nickname.trim().length < 2) return null;
    const base = emptyHihiLocalProfile();
    return {
      ...base,
      ...p,
      nickname: String(p.nickname).trim().slice(0, 12),
      genderCode: p.genderCode === 'M' ? 'M' : 'F',
      heightCm: Number(p.heightCm) || base.heightCm,
      birthYear: Number(p.birthYear) || base.birthYear,
      avatarName: String(p.avatarName || ''),
      avatarTitle: String(p.avatarTitle || ''),
    };
  } catch {
    return null;
  }
}

export function saveHihiLocalProfile(profile: HihiLocalProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearHihiLocalProfile() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
