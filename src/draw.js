// Dibujo procedural de los luchadores (esqueleto + IK de dos segmentos).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function shade(c, f) {
  const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
}

function ik(a, b, l1, l2, pick) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  const dd = Math.min(d, l1 + l2 - 0.5);
  const ux = dx / d, uy = dy / d;
  const aa = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
  const c1 = [a[0] + ux * aa - uy * h, a[1] + uy * aa + ux * h];
  const c2 = [a[0] + ux * aa + uy * h, a[1] + uy * aa - ux * h];
  return { mid: pick(c1, c2) ? c1 : c2, end: [a[0] + ux * dd, a[1] + uy * dd] };
}

function tri(e) { return Math.sin(clamp(e, 0, 1) * Math.PI); }

const ATK_REACH = { p1: 64, p2: 66, p3: 76, kick: 84, air: 70 };

// Devuelve las posiciones (coordenadas locales, +x = hacia delante, y=0 = suelo).
function pose(o) {
  const T = o.time, s = o.state;
  const bob = Math.sin(T * 6) * 1.6;
  const P = { hip: [0, -52], sh: [2, -92 + bob], head: [5, -110 + bob], hf: [30, -96], hb: [17, -84], ff: [18, 0], fb: [-14, 0], rot: 0 };
  const p = o.dur ? clamp(o.stateT / o.dur, 0, 1) : 0;
  switch (s) {
    case 'walk': {
      const w = Math.sin(T * 13) * 17, w2 = Math.sin(T * 13 + Math.PI) * 17;
      P.ff = [12 + w, -Math.max(0, Math.cos(T * 13)) * 9];
      P.fb = [12 + w2, -Math.max(0, -Math.cos(T * 13)) * 9];
      P.hf[0] += Math.sin(T * 13) * 5; P.hb[0] -= Math.sin(T * 13) * 5;
      P.sh[0] += 3; P.head[0] += 4;
      break;
    }
    case 'jump':
      P.ff = [20, -26]; P.fb = [-8, -16];
      P.hf = [30, -112]; P.hb = [14, -104];
      P.hip = [0, -56];
      break;
    case 'attack': {
      const e = Math.pow(tri(p), 0.7), r = ATK_REACH[o.atk] || 64;
      if (o.atk === 'kick') {
        P.ff = [20 + e * (r - 14), -e * 62]; P.sh[0] -= e * 10; P.head[0] -= e * 8; P.hip[0] -= e * 4;
        P.hf = [22, -96]; P.hb = [10, -90];
      } else if (o.atk === 'air') {
        P.ff = [22 + e * (r - 20), -30 - e * 14]; P.fb = [-10, -16]; P.hf = [26 + e * 30, -90]; P.hb = [12, -96];
      } else if (o.atk === 'p2') {
        P.hb = [26 + e * r * 0.85, -90]; P.sh[0] += e * 6; P.head[0] += e * 5; P.ff[0] = 24;
      } else if (o.atk === 'p3') {
        P.hf = [26 + e * r * 0.9, -100]; P.hb = [14 + e * 16, -96]; P.sh[0] += e * 12; P.head[0] += e * 10;
        P.hip[0] += e * 6; P.ff = [34, 0]; P.fb = [-22, 0];
      } else {
        P.hf = [28 + e * r * 0.85, -98]; P.sh[0] += e * 6; P.head[0] += e * 5; P.ff[0] = 22;
      }
      break;
    }
    case 'block':
      P.hip = [-2, -46]; P.sh = [0, -84]; P.head = [0, -100];
      P.hf = [22, -92]; P.hb = [20, -102]; P.ff = [18, 0]; P.fb = [-10, 0];
      break;
    case 'hurt':
      P.sh = [-8, -90]; P.head = [-12, -106]; P.hf = [-4, -72 + Math.sin(T * 40) * 3]; P.hb = [-16, -78];
      P.ff = [16, 0]; P.fb = [-20, 0]; P.rot = -0.18;
      break;
    case 'launched':
      P.hf = [-10, -98]; P.hb = [-22, -86]; P.ff = [8, -24]; P.fb = [-18, -34]; P.rot = -0.9 - Math.min(0.5, T * 0);
      break;
    case 'down': case 'ko':
      P.hf = [-6, -80]; P.hb = [-18, -86]; P.ff = [14, -4]; P.fb = [-4, 0]; P.rot = -Math.PI / 2;
      break;
    case 'charge': {
      const j = Math.sin(T * 50) * 1.5;
      P.hip = [0, -46]; P.sh = [0 + j, -84]; P.head = [2 + j, -101];
      P.ff = [26, 0]; P.fb = [-26, 0]; P.hf = [20, -62]; P.hb = [-14, -62];
      break;
    }
    case 'cast': {
      const e = clamp(o.stateT / 0.14, 0, 1);
      P.hf = [20 + e * 28, -92]; P.hb = [16 + e * 26, -96]; P.sh[0] += 4; P.head[0] += 5; P.ff = [24, 0]; P.fb = [-20, 0];
      break;
    }
    case 'special': {
      if (o.stateT < 0.6) {
        const e = clamp(o.stateT / 0.5, 0, 1);
        P.hf = [-14 - e * 6, -84]; P.hb = [-22 - e * 6, -92]; P.ff = [26, 0]; P.fb = [-24, 0]; P.hip = [-2, -46];
        P.sh = [-4, -86]; P.head = [-2, -102];
      } else {
        P.hf = [52, -92]; P.hb = [46, -98]; P.sh[0] += 8; P.head[0] += 9; P.ff = [30, 0]; P.fb = [-26, 0];
      }
      break;
    }
    case 'transform': {
      const j = Math.sin(T * 60) * 2;
      P.hip = [0, -46]; P.sh = [j, -84]; P.head = [-2 + j, -104];
      P.ff = [24, 0]; P.fb = [-24, 0]; P.hf = [18, -66]; P.hb = [-8, -66];
      if (o.stateT > 0.5) { P.hf = [22, -70]; P.hb = [-14, -72]; }
      break;
    }
    case 'dash':
      P.sh = [14, -84]; P.head = [22, -98]; P.hip = [-2, -50];
      P.hf = [-10, -78]; P.hb = [-22, -84]; P.ff = [-14, -12]; P.fb = [-36, -4];
      break;
    case 'win':
      P.hf = [14, -126 - Math.sin(T * 8) * 4]; P.hb = [4, -120]; P.ff = [16, 0]; P.fb = [-14, 0];
      break;
    default: break;
  }
  return P;
}

function hairTris(style, sup) {
  const T = [];
  const add = (a, len, w) => T.push({ a: (a * Math.PI) / 180, len, w: (w * Math.PI) / 180 });
  if (style === 'spiky') {
    const L = sup ? [28, 36, 42, 36, 24, 30] : [20, 27, 31, 25, 18];
    const A = sup ? [-165, -135, -105, -75, -45, -190] : [-150, -120, -90, -60, -30];
    A.forEach((a, i) => add(a, L[i], 17));
  } else if (style === 'long') {
    const L = sup ? [26, 34, 42, 46, 40, 34] : [22, 28, 34, 38, 30];
    const A = sup ? [-80, -115, -150, -180, -205, -230] : [-85, -120, -155, -185, -215];
    A.forEach((a, i) => add(a, L[i], 18));
    add(-50, sup ? 20 : 16, 15);
  }
  return T;
}

// o: { x, y, facing, def, state, stateT, dur, atk, time, sup, flash, zoom }
export function drawFig(g, o) {
  const d = o.def, z = (d.scale || 1) * (o.zoom || 1);
  const P = pose(o);
  const F = o.facing;
  const lift = Math.abs(P.rot) > 1 ? -9 * z : 0;
  const cs = Math.cos(P.rot), sn = Math.sin(P.rot);
  const L = (pt) => {
    let x = pt[0] * z, y = pt[1] * z;
    if (P.rot) { const nx = x * cs - y * sn, ny = x * sn + y * cs; x = nx; y = ny; }
    return [o.x + x * F, o.y + y + lift];
  };
  const fl = o.flash > 0;
  const C = (c) => (fl ? 0xffffff : c);
  const hairCol = o.sup ? d.superHair : d.hair;
  const hip = L(P.hip), sh = L(P.sh), head = L(P.head);
  const hf = L(P.hf), hb = L(P.hb), ff = L(P.ff), fb = L(P.fb);
  const legW = 12 * z, armW = 9.5 * z;

  const limb = (a, b, l1, l2, w, col, endCol, endR, legs) => {
    const pick = legs ? (c1, c2) => c1[0] * F > c2[0] * F : (c1, c2) => c1[1] > c2[1];
    const r = ik(a, b, l1 * z, l2 * z, pick);
    g.lineStyle(w, C(col), 1);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(r.mid[0], r.mid[1]); g.lineTo(r.end[0], r.end[1]); g.strokePath();
    g.fillStyle(C(col), 1);
    g.fillCircle(r.mid[0], r.mid[1], w / 2);
    g.fillStyle(C(endCol), 1);
    g.fillCircle(r.end[0], r.end[1], endR * z);
  };

  // Brazo trasero y pierna trasera (más oscuros)
  limb(sh, hb, 22, 22, armW, shade(d.skin, 0.78), shade(d.skin, 0.78), 6, false);
  limb(hip, fb, 28, 28, legW, shade(d.pants, 0.72), shade(d.boots, 0.75), 8, true);

  // Torso
  g.lineStyle(26 * z, C(d.gi), 1);
  g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(sh[0], sh[1]); g.strokePath();
  g.fillStyle(C(d.gi), 1); g.fillCircle(sh[0], sh[1], 13 * z); g.fillCircle(hip[0], hip[1], 12 * z);
  // cuello/pecho de piel
  const nk = [sh[0] + (head[0] - sh[0]) * 0.55, sh[1] + (head[1] - sh[1]) * 0.55];
  g.lineStyle(7 * z, C(d.skin), 1); g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(nk[0], nk[1]); g.strokePath();
  // cinturón
  const bl = [hip[0] + (sh[0] - hip[0]) * 0.22, hip[1] + (sh[1] - hip[1]) * 0.22];
  g.lineStyle(27 * z, C(d.belt), 1); g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(bl[0], bl[1]); g.strokePath();

  // Cabeza
  const hr = (d.hairStyle === 'bald' ? 14.5 : 13) * z;
  // Pelo detrás
  if (d.hairStyle !== 'bald') {
    g.fillStyle(C(hairCol), 1);
    const tris = hairTris(d.hairStyle, o.sup);
    for (const t of tris) {
      const base = (ang, r) => L([P.head[0] + Math.cos(ang) * r, P.head[1] + Math.sin(ang) * r]);
      const b1 = base(t.a - t.w, 10), b2 = base(t.a + t.w, 10), tip = base(t.a, 10 + t.len);
      g.fillTriangle(b1[0], b1[1], b2[0], b2[1], tip[0], tip[1]);
    }
  }
  g.fillStyle(C(d.skin), 1); g.fillCircle(head[0], head[1], hr);
  if (d.hairStyle !== 'bald') {
    // flequillo
    g.fillStyle(C(hairCol), 1);
    const c1 = L([P.head[0] - 8, P.head[1] - 6]), c2 = L([P.head[0] + 6, P.head[1] - 9]), c3 = L([P.head[0] + 12, P.head[1] - 2]), c4 = L([P.head[0] + 1, P.head[1] - 1]);
    g.fillTriangle(c1[0], c1[1], c2[0], c2[1], c4[0], c4[1]);
    g.fillTriangle(c2[0], c2[1], c3[0], c3[1], c4[0], c4[1]);
    const top = L([P.head[0] - 2, P.head[1] - 12]);
    g.fillCircle(top[0], top[1], 8 * z);
  } else {
    // ceño marcado del coloso
    g.lineStyle(2.2 * z, C(0x2a5a20), 1);
    const a1 = L([P.head[0] + 3, P.head[1] - 6]), a2 = L([P.head[0] + 13, P.head[1] - 3]);
    g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.strokePath();
  }
  // Ojo
  const closed = o.state === 'hurt' || o.state === 'launched' || o.state === 'down' || o.state === 'ko';
  const eye = L([P.head[0] + 7, P.head[1] - 1]);
  if (closed) {
    g.lineStyle(2 * z, 0x20202a, 1);
    const e1 = L([P.head[0] + 4, P.head[1] - 3]), e2 = L([P.head[0] + 10, P.head[1] + 1]);
    g.beginPath(); g.moveTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.strokePath();
    const e3 = L([P.head[0] + 10, P.head[1] - 3]), e4 = L([P.head[0] + 4, P.head[1] + 1]);
    g.beginPath(); g.moveTo(e3[0], e3[1]); g.lineTo(e4[0], e4[1]); g.strokePath();
  } else {
    g.fillStyle(0xffffff, 1); g.fillEllipse(eye[0], eye[1], 6 * z, 7 * z);
    const pu = L([P.head[0] + 8.6, P.head[1] - 1]);
    g.fillStyle(o.sup ? 0x1fb6a0 : 0x15151c, 1); g.fillCircle(pu[0], pu[1], 2.2 * z);
    g.lineStyle(2.2 * z, C(d.hairStyle === 'bald' ? 0x2a5a20 : hairCol), 1);
    const b1 = L([P.head[0] + 3.5, P.head[1] - 6.5]), b2 = L([P.head[0] + 11.5, P.head[1] - 4]);
    g.beginPath(); g.moveTo(b1[0], b1[1]); g.lineTo(b2[0], b2[1]); g.strokePath();
  }
  // Boca
  const m1 = L([P.head[0] + 6, P.head[1] + 7]), m2 = L([P.head[0] + 11, P.head[1] + 6]);
  g.lineStyle(1.8 * z, 0x4a2418, 1); g.beginPath(); g.moveTo(m1[0], m1[1]); g.lineTo(m2[0], m2[1]); g.strokePath();

  // Pierna delantera y brazo delantero
  limb(hip, ff, 28, 28, legW, d.pants, d.boots, 8.5, true);
  limb(sh, hf, 22, 22, armW, d.skin, d.skin, 7, false);
  // muñequeras / mangas del gi
  g.fillStyle(C(d.belt), 1);
  const mf = [(sh[0] * 2 + hf[0]) / 3, (sh[1] * 2 + hf[1]) / 3];
  g.fillCircle(sh[0], sh[1], 7 * z);
  void mf;
}

// Aura aditiva (llamas) alrededor del luchador.
export function drawAura(g, o, strength = 1) {
  const d = o.def, z = (d.scale || 1);
  const T = o.time;
  const cx = o.x, base = o.y;
  g.fillStyle(d.aura, 0.10 * strength);
  for (let i = 0; i < 3; i++) g.fillEllipse(cx, base - 58 * z, (60 + i * 16) * z + Math.sin(T * 14 + i) * 3, (140 + i * 22) * z);
  g.fillStyle(d.aura, 0.32 * strength);
  for (let k = 0; k < 9; k++) {
    const bx = cx + (k - 4) * 9 * z;
    const h = (70 + Math.abs(Math.sin(T * 11 + k * 1.9)) * 55) * z * (1 - Math.abs(k - 4) * 0.12);
    const jx = Math.sin(T * 17 + k) * 5;
    g.fillTriangle(bx - 8 * z, base - 4, bx + 8 * z, base - 4, bx + jx, base - h);
  }
}
