// Ajustes persistentes. Todo acceso a localStorage va en try/catch (puede fallar o estar vacío).
const KEY = 'kiwarriors.settings.v1';
const defaults = () => ({
  volume: { master: 0.8, music: 0.6, sfx: 0.9 },
  reduceShake: false,
  reduceFlash: false,
  bindings: {},
});

let data = null;
export function settings() {
  if (data) return data;
  data = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      data = { ...data, ...j, volume: { ...data.volume, ...(j.volume || {}) } };
    }
  } catch (e) { /* sin persistencia */ }
  return data;
}
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings())); } catch (e) { /* ignorar */ }
}
