export type MeProfile = {
  name: string;
  city: string;
  bio: string;
  avatarUrl: string;
};

export const DEFAULT_PROFILE: MeProfile = {
  name: '沪上钓友',
  city: '上海',
  bio: '天气好就出门',
  avatarUrl: '',
};

export const MAX_AVATAR_EDGE = 256;

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
  const avatarUrl = clipAvatarUrl(input?.avatarUrl);
  return { name, city, bio, avatarUrl };
}

function clipAvatarUrl(raw: string | undefined): string {
  const url = raw?.trim() ?? '';
  if (url.startsWith('data:image/')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return '';
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

export function fileToAvatarUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('请选一张图片。'));
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const side = Math.min(img.width, img.height) || 1;
      const canvas = document.createElement('canvas');
      canvas.width = MAX_AVATAR_EDGE;
      canvas.height = MAX_AVATAR_EDGE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法处理头像'));
        return;
      }
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, MAX_AVATAR_EDGE, MAX_AVATAR_EDGE);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('图片读不出来。'));
    };
    img.src = blobUrl;
  });
}
