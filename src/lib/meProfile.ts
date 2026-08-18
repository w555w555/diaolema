export type MeProfile = {
  name: string;
  city: string;
  bio: string;
};

export const DEFAULT_PROFILE: MeProfile = {
  name: '沪上钓友',
  city: '上海',
  bio: '天气好就出门',
};

const PROFILE_KEY = 'diaolema.me.profile.v1';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function normalizeProfile(input: Partial<MeProfile> | null | undefined): MeProfile {
  const name = input?.name?.trim() || DEFAULT_PROFILE.name;
  const city = input?.city?.trim() || DEFAULT_PROFILE.city;
  const bio = input?.bio?.trim() || DEFAULT_PROFILE.bio;
  return { name, city, bio };
}

export function loadProfile(): MeProfile {
  const store = storage();
  if (!store) return DEFAULT_PROFILE;
  try {
    const raw = store.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return normalizeProfile(JSON.parse(raw) as Partial<MeProfile>);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(input: Partial<MeProfile>): MeProfile {
  const next = normalizeProfile({ ...loadProfile(), ...input });
  storage()?.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}

export type MeFan = {
  id: string;
  name: string;
  city: string;
  note: string;
};

export const DEMO_FANS: MeFan[] = [
  { id: 'fan-zhou', name: '路亚阿周', city: '浦东', note: '公园湖常出没' },
  { id: 'fan-zhang', name: '沪上老张', city: '青浦', note: '滴水湖岸抛' },
  { id: 'fan-chen', name: '塘钓阿陈', city: '松江', note: '周末坑冠' },
  { id: 'fan-wu', name: '装备控小吴', city: '闵行', note: '爱问竿轮' },
  { id: 'fan-lin', name: '崇明小林', city: '崇明', note: '河口海钓' },
  { id: 'fan-li', name: '杨浦老李', city: '杨浦', note: '滨江夜钓' },
];

export function fanCount(fans = DEMO_FANS): number {
  return fans.length;
}
