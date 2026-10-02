export interface Profile {
  name: string;
  color: string;
}

export const AVATAR_COLORS = [
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#00acc1",
  "#1e88e5",
  "#8e24aa",
  "#ec407a",
];

export const MAX_NAME_LENGTH = 20;

const STORAGE_KEY = "pixeles:perfil";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    if (typeof p.name !== "string" || typeof p.color !== "string") return null;
    return { name: p.name, color: AVATAR_COLORS.includes(p.color) ? p.color : AVATAR_COLORS[0] };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Sin almacenamiento disponible: no pasa nada, solo no se recuerda.
  }
}

/** IDs de oficina válidos: letras minúsculas, números y guiones. */
export function normalizeOfficeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
