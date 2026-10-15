#!/usr/bin/env python3
"""Genera las hojas de sprites (atlas Phaser), efectos y capas de escenario.

Determinista: mismo resultado en cada ejecución. Pipeline de `create-game-assets`:
dibujo a 4x -> reducción LANCZOS -> ancla fija pie-centro -> atlas JSON + manifiesto.
"""
import json
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

SS = 4
FW, FH = 256, 192
FEET = (128, 180)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')

CHARS = {
    'kaito': dict(skin=0xf3c692, gi=0xff7a1a, pants=0xff7a1a, belt=0x2347c9, boots=0x2347c9,
                  hair=0x14141c, superHair=0xffd83a, style='spiky', scale=1.0),
    'ryuzen': dict(skin=0xeab98f, gi=0x2d55d8, pants=0x1c2f86, belt=0xe8e8f0, boots=0xe8e8f0,
                   hair=0xc9d4e8, superHair=0x7ff0ff, style='long', scale=0.97),
    'brolok': dict(skin=0x84c86c, gi=0x6b2f9e, pants=0x4a1f72, belt=0xffd83a, boots=0x2b2b35,
                   hair=0x000000, superHair=0x000000, style='bald', scale=1.16),
}

# anim -> (frames, loop, fps)
ANIMS = {
    'idle': (6, True, 6), 'walk': (6, True, 12), 'jump': (1, False, 0),
    'p1': (4, False, 0), 'p2': (4, False, 0), 'p3': (4, False, 0), 'kick': (4, False, 0), 'air': (4, False, 0),
    'block': (1, False, 0), 'hurt': (2, False, 0), 'launched': (1, False, 0), 'down': (1, False, 0),
    'ko': (1, False, 0), 'charge': (3, True, 18), 'cast': (3, False, 0),
    'wind': (2, False, 0), 'fire': (2, True, 10), 'transform': (3, False, 0), 'dash': (1, False, 0), 'win': (2, True, 4),
}
REACH = {'p1': 64, 'p2': 66, 'p3': 76, 'kick': 84, 'air': 70}


def rgb(c, a=255):
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255, a)


def shade(c, f):
    return rgb(int(min(255, ((c >> 16) & 255) * f)) << 16 | int(min(255, ((c >> 8) & 255) * f)) << 8 | int(min(255, (c & 255) * f)))


def clamp(v, a, b):
    return max(a, min(b, v))


def tri(e):
    return math.sin(clamp(e, 0, 1) * math.pi)


def pose(state, t, st, atk):
    """Posición de articulaciones en coordenadas locales (+x adelante, y=0 suelo).
    t: tiempo (para ciclos), st: progreso 0..1 del estado."""
    bob = math.sin(t * 6) * 1.6
    P = dict(hip=[0, -52], sh=[2, -92 + bob], head=[5, -110 + bob], hf=[30, -96], hb=[17, -84],
             ff=[18, 0], fb=[-14, 0], rot=0.0)
    if state == 'walk':
        w, w2 = math.sin(t * 13) * 17, math.sin(t * 13 + math.pi) * 17
        P['ff'] = [12 + w, -max(0, math.cos(t * 13)) * 9]
        P['fb'] = [12 + w2, -max(0, -math.cos(t * 13)) * 9]
        P['hf'][0] += math.sin(t * 13) * 5
        P['hb'][0] -= math.sin(t * 13) * 5
        P['sh'][0] += 3
        P['head'][0] += 4
    elif state == 'jump':
        P.update(ff=[20, -26], fb=[-8, -16], hf=[30, -112], hb=[14, -104], hip=[0, -56])
    elif state == 'attack':
        e = tri(st) ** 0.7
        r = REACH.get(atk, 64)
        if atk == 'kick':
            P['ff'] = [20 + e * (r - 14), -e * 62]
            P['sh'][0] -= e * 10; P['head'][0] -= e * 8; P['hip'][0] -= e * 4
            P['hf'] = [22, -96]; P['hb'] = [10, -90]
        elif atk == 'air':
            P['ff'] = [22 + e * (r - 20), -30 - e * 14]; P['fb'] = [-10, -16]
            P['hf'] = [26 + e * 30, -90]; P['hb'] = [12, -96]
        elif atk == 'p2':
            P['hb'] = [26 + e * r * 0.85, -90]; P['sh'][0] += e * 6; P['head'][0] += e * 5; P['ff'][0] = 24
        elif atk == 'p3':
            P['hf'] = [26 + e * r * 0.9, -100]; P['hb'] = [14 + e * 16, -96]
            P['sh'][0] += e * 12; P['head'][0] += e * 10; P['hip'][0] += e * 6
            P['ff'] = [34, 0]; P['fb'] = [-22, 0]
        else:
            P['hf'] = [28 + e * r * 0.85, -98]; P['sh'][0] += e * 6; P['head'][0] += e * 5; P['ff'][0] = 22
    elif state == 'block':
        P.update(hip=[-2, -46], sh=[0, -84], head=[0, -100], hf=[22, -92], hb=[20, -102], ff=[18, 0], fb=[-10, 0])
    elif state == 'hurt':
        P.update(sh=[-8, -90], head=[-12, -106], hf=[-4, -72 + math.sin(t * 40) * 3], hb=[-16, -78],
                 ff=[16, 0], fb=[-20, 0], rot=-0.18)
    elif state == 'launched':
        P.update(hf=[-10, -98], hb=[-22, -86], ff=[8, -24], fb=[-18, -34], rot=-0.9)
    elif state in ('down', 'ko'):
        P.update(hf=[-6, -80], hb=[-18, -86], ff=[14, -4], fb=[-4, 0], rot=-math.pi / 2)
    elif state == 'charge':
        j = math.sin(t * 50) * 1.5
        P.update(hip=[0, -46], sh=[j, -84], head=[2 + j, -101], ff=[26, 0], fb=[-26, 0], hf=[20, -62], hb=[-14, -62])
    elif state == 'cast':
        e = clamp(st, 0, 1)
        P.update(hf=[20 + e * 28, -92], hb=[16 + e * 26, -96], ff=[24, 0], fb=[-20, 0])
        P['sh'][0] += 4; P['head'][0] += 5
    elif state == 'wind':
        e = clamp(st, 0, 1)
        P.update(hf=[-14 - e * 6, -84], hb=[-22 - e * 6, -92], ff=[26, 0], fb=[-24, 0], hip=[-2, -46], sh=[-4, -86], head=[-2, -102])
    elif state == 'fire':
        P.update(hf=[52, -92], hb=[46, -98], ff=[30, 0], fb=[-26, 0])
        P['sh'][0] += 8; P['head'][0] += 9
    elif state == 'transform':
        j = math.sin(t * 60) * 2
        P.update(hip=[0, -46], sh=[j, -84], head=[-2 + j, -104], ff=[24, 0], fb=[-24, 0], hf=[18, -66], hb=[-8, -66])
        if st > 0.5:
            P['hf'] = [22, -70]; P['hb'] = [-14, -72]
    elif state == 'dash':
        P.update(sh=[14, -84], head=[22, -98], hip=[-2, -50], hf=[-10, -78], hb=[-22, -84], ff=[-14, -12], fb=[-36, -4])
    elif state == 'win':
        P.update(hf=[14, -126 - math.sin(t * 8) * 4], hb=[4, -120], ff=[16, 0], fb=[-14, 0])
    return P


def hair_tris(style, sup):
    T = []
    def add(a, ln, w):
        T.append((math.radians(a), ln, math.radians(w)))
    if style == 'spiky':
        L = [28, 36, 42, 36, 24, 30] if sup else [20, 27, 31, 25, 18]
        A = [-165, -135, -105, -75, -45, -190] if sup else [-150, -120, -90, -60, -30]
        for a, ln in zip(A, L):
            add(a, ln, 17)
    elif style == 'long':
        L = [26, 34, 42, 46, 40, 34] if sup else [22, 28, 34, 38, 30]
        A = [-80, -115, -150, -180, -205, -230] if sup else [-85, -120, -155, -185, -215]
        for a, ln in zip(A, L):
            add(a, ln, 18)
        add(-50, 20 if sup else 16, 15)
    return T


def ik(a, b, l1, l2, pick):
    dx, dy = b[0] - a[0], b[1] - a[1]
    d = math.hypot(dx, dy) or 1
    dd = min(d, l1 + l2 - 0.5)
    ux, uy = dx / d, dy / d
    aa = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd)
    h = math.sqrt(max(0, l1 * l1 - aa * aa))
    c1 = (a[0] + ux * aa - uy * h, a[1] + uy * aa + ux * h)
    c2 = (a[0] + ux * aa + uy * h, a[1] + uy * aa - ux * h)
    return (c1 if pick(c1, c2) else c2), (a[0] + ux * dd, a[1] + uy * dd)


def draw_fighter(d, sup, state, t, st, atk):
    z = d['scale']
    P = pose(state, t, st, atk)
    rot = P['rot']
    cs, sn = math.cos(rot), math.sin(rot)
    lying = abs(rot) > 1
    lift = -9 * z if lying else 0
    xs = 57 * z if lying else 0

    def L(p):
        x, y = p[0] * z, p[1] * z
        if rot:
            x, y = x * cs - y * sn, x * sn + y * cs
        return ((FEET[0] + x + xs) * SS, (FEET[1] + y + lift) * SS)

    img = Image.new('RGBA', (FW * SS, FH * SS), (0, 0, 0, 0))
    g = ImageDraw.Draw(img)

    def line(a, b, w, col):
        g.line([a, b], fill=col, width=int(w * SS))

    def circ(c, r, col):
        g.ellipse([c[0] - r * SS, c[1] - r * SS, c[0] + r * SS, c[1] + r * SS], fill=col)

    def limb(a, b, l1, l2, w, col, endcol, endr, legs):
        pick = (lambda c1, c2: c1[0] > c2[0]) if legs else (lambda c1, c2: c1[1] > c2[1])
        mid, end = ik(a, b, l1 * z * SS, l2 * z * SS, pick)
        line(a, mid, w * z, col); line(mid, end, w * z, col)
        circ(a, w * z / 2, col); circ(mid, w * z / 2, col)
        circ(end, endr * z, endcol)

    hair = d['superHair'] if sup else d['hair']
    hip, sh, head = L(P['hip']), L(P['sh']), L(P['head'])
    hf, hb, ff, fb = L(P['hf']), L(P['hb']), L(P['ff']), L(P['fb'])
    skin = rgb(d['skin'])
    limb(sh, hb, 22, 22, 9.5, shade(d['skin'], .78), shade(d['skin'], .78), 6, False)
    limb(hip, fb, 28, 28, 12, shade(d['pants'], .72), shade(d['boots'], .75), 8, True)
    # torso
    line(hip, sh, 26 * z, rgb(d['gi']))
    circ(sh, 13 * z, rgb(d['gi'])); circ(hip, 12 * z, rgb(d['gi']))
    nk = (sh[0] + (head[0] - sh[0]) * .55, sh[1] + (head[1] - sh[1]) * .55)
    line(sh, nk, 7 * z, skin)
    bl = (hip[0] + (sh[0] - hip[0]) * .22, hip[1] + (sh[1] - hip[1]) * .22)
    line(hip, bl, 27 * z, rgb(d['belt']))
    # head
    hr = (14.5 if d['style'] == 'bald' else 13) * z
    ph = P['head']
    if d['style'] != 'bald':
        for a, ln, w in hair_tris(d['style'], sup):
            def base(ang, r):
                return L([ph[0] + math.cos(ang) * r, ph[1] + math.sin(ang) * r])
            g.polygon([base(a - w, 10), base(a + w, 10), base(a, 10 + ln)], fill=rgb(hair))
    circ(head, hr, skin)
    if d['style'] != 'bald':
        c1, c2, c3, c4 = L([ph[0] - 8, ph[1] - 6]), L([ph[0] + 6, ph[1] - 9]), L([ph[0] + 12, ph[1] - 2]), L([ph[0] + 1, ph[1] - 1])
        g.polygon([c1, c2, c4], fill=rgb(hair)); g.polygon([c2, c3, c4], fill=rgb(hair))
        circ(L([ph[0] - 2, ph[1] - 12]), 8 * z, rgb(hair))
    else:
        line(L([ph[0] + 3, ph[1] - 6]), L([ph[0] + 13, ph[1] - 3]), 2.2 * z, rgb(0x2a5a20))
    closed = state in ('hurt', 'launched', 'down', 'ko')
    if closed:
        for a, b in ((([ph[0] + 4, ph[1] - 3]), [ph[0] + 10, ph[1] + 1]), ([ph[0] + 10, ph[1] - 3], [ph[0] + 4, ph[1] + 1])):
            line(L(a), L(b), 2 * z, rgb(0x20202a))
    else:
        e = L([ph[0] + 7, ph[1] - 1])
        g.ellipse([e[0] - 3 * z * SS, e[1] - 3.5 * z * SS, e[0] + 3 * z * SS, e[1] + 3.5 * z * SS], fill=(255, 255, 255, 255))
        circ(L([ph[0] + 8.6, ph[1] - 1]), 2.2 * z, rgb(0x1fb6a0) if sup else rgb(0x15151c))
        line(L([ph[0] + 3.5, ph[1] - 6.5]), L([ph[0] + 11.5, ph[1] - 4]), 2.2 * z, rgb(0x2a5a20) if d['style'] == 'bald' else rgb(hair))
    line(L([ph[0] + 6, ph[1] + 7]), L([ph[0] + 11, ph[1] + 6]), 1.8 * z, rgb(0x4a2418))
    # front leg / arm
    limb(hip, ff, 28, 28, 12, rgb(d['pants']), rgb(d['boots']), 8.5, True)
    limb(sh, hf, 22, 22, 9.5, skin, skin, 7, False)
    circ(sh, 7 * z, rgb(d['belt']))
    return img.resize((FW, FH), Image.LANCZOS)


def build_fighter(cid, d, sup):
    frames, order = [], []
    for name, (n, loop, fps) in ANIMS.items():
        for i in range(n):
            if name in ('idle',):
                state, t, st, atk = 'idle', i / n * (2 * math.pi / 6), 0, None
            elif name == 'walk':
                state, t, st, atk = 'walk', i / n * (2 * math.pi / 13), 0, None
            elif name in ('p1', 'p2', 'p3', 'kick', 'air'):
                state, t, st, atk = 'attack', 0, [0.12, 0.4, 0.62, 0.9][i], name
            elif name == 'hurt':
                state, t, st, atk = 'hurt', i * 0.07, 0, None
            elif name == 'charge':
                state, t, st, atk = 'charge', i * 0.021, 0, None
            elif name == 'cast':
                state, t, st, atk = 'cast', 0, [0.0, 0.6, 1.0][i], None
            elif name == 'wind':
                state, t, st, atk = 'wind', 0, [0.2, 1.0][i], None
            elif name == 'fire':
                state, t, st, atk = 'fire', 0, 0, None
            elif name == 'transform':
                state, t, st, atk = 'transform', i * 0.013, [0.1, 0.4, 0.8][i], None
            elif name == 'win':
                state, t, st, atk = 'win', i * 0.4, 0, None
            else:
                state, t, st, atk = name, 0, 0, None
            frames.append((f'{name}_{i}', draw_fighter(d, sup, state, t, st, atk)))
    cols = 8
    rows = math.ceil(len(frames) / cols)
    sheet = Image.new('RGBA', (cols * FW, rows * FH), (0, 0, 0, 0))
    atlas = {'frames': {}, 'meta': {'image': f'{cid}{"_super" if sup else ""}.png', 'size': {'w': cols * FW, 'h': rows * FH}, 'scale': '1'}}
    for k, (name, im) in enumerate(frames):
        x, y = (k % cols) * FW, (k // cols) * FH
        sheet.paste(im, (x, y))
        atlas['frames'][name] = {'frame': {'x': x, 'y': y, 'w': FW, 'h': FH}, 'rotated': False, 'trimmed': False,
                                 'spriteSourceSize': {'x': 0, 'y': 0, 'w': FW, 'h': FH}, 'sourceSize': {'w': FW, 'h': FH}}
    base = os.path.join(OUT, 'fighters', f'{cid}{"_super" if sup else ""}')
    sheet.save(base + '.png', optimize=True)
    json.dump(atlas, open(base + '.json', 'w'), separators=(',', ':'))
    return base


# ---------------- efectos ----------------
def build_fx():
    cell = 128
    names = ['glow', 'beam', 'spark', 'ring', 'flame']
    sheet = Image.new('RGBA', (cell * len(names), cell), (0, 0, 0, 0))
    atlas = {'frames': {}, 'meta': {'image': 'fx.png', 'size': {'w': cell * len(names), 'h': cell}, 'scale': '1'}}
    for i, n in enumerate(names):
        im = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
        px = im.load()
        for y in range(cell):
            for x in range(cell):
                dx, dy = (x - cell / 2 + .5) / (cell / 2), (y - cell / 2 + .5) / (cell / 2)
                r = math.hypot(dx, dy)
                if n == 'glow':
                    a = max(0, 1 - r) ** 2
                elif n == 'beam':       # franja horizontal con borde suave (se estira en X)
                    a = max(0, 1 - abs(dy)) ** 1.5
                elif n == 'spark':
                    a = max(0, 1 - r) ** 3 if r < 1 else 0
                elif n == 'ring':
                    a = max(0, 1 - abs(r - 0.82) / 0.12)
                else:                   # flame: gota alargada
                    a = max(0, 1 - (dx * dx / 0.35 + (dy + 0.1) ** 2 / 1.0)) ** 1.4
                v = int(255 * min(1, a))
                px[x, y] = (255, 255, 255, v)
        sheet.paste(im, (i * cell, 0))
        atlas['frames'][n] = {'frame': {'x': i * cell, 'y': 0, 'w': cell, 'h': cell}, 'rotated': False, 'trimmed': False,
                              'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell}, 'sourceSize': {'w': cell, 'h': cell}}
    sheet.save(os.path.join(OUT, 'fx', 'fx.png'), optimize=True)
    json.dump(atlas, open(os.path.join(OUT, 'fx', 'fx.json'), 'w'), separators=(',', ':'))


# ---------------- escenarios ----------------
STAGES = {
    'llanura':  dict(top=0x2a6fd6, bot=0xbfe6ff, sun=0xfff3b0, far=0x7aa6c8, near=0x4d7b6a, ground=0x7a5a3a, edge=0xa9825a, name='LLANURA'),
    'atardecer': dict(top=0x2a0f3d, bot=0xff7a3d, sun=0xffd27a, far=0x7a2f4f, near=0x3d1a33, ground=0x4a2a28, edge=0x7a4538, name='ATARDECER'),
    'isla':     dict(top=0x0b3b2e, bot=0x9cf0a4, sun=0xeaffd0, far=0x2f8f6a, near=0x1d5f4c, ground=0x2f5a3a, edge=0x5f9a56, name='ISLA VERDE'),
}


def lerp_col(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def build_stage(sid, s):
    rnd = random.Random(sid)
    W, H = 960, 540
    top, bot = rgb(s['top'])[:3], rgb(s['bot'])[:3]
    sky = Image.new('RGB', (W, H))
    sd = ImageDraw.Draw(sky)
    for y in range(H):
        sd.line([(0, y), (W, y)], fill=lerp_col(top, bot, min(1, y / 440)))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    sc = rgb(s['sun'])
    for r, a in ((95, 50), (70, 80), (46, 235)):
        gd.ellipse([700 - r, 140 - r, 700 + r, 140 + r], fill=sc[:3] + (a,))
    for _ in range(9):
        cx, cy, w, h = rnd.randint(0, W), rnd.randint(40, 230), rnd.randint(90, 190), rnd.randint(20, 38)
        gd.ellipse([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], fill=(255, 255, 255, 46))
    sky = Image.alpha_composite(sky.convert('RGBA'), glow)
    sky.save(os.path.join(OUT, 'stages', f'stage_{sid}_sky.png'), optimize=True)

    def mountains(name, col, hmin, hmax, step, height):
        TW = 1920
        im = Image.new('RGBA', (TW, height), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        n = TW // step
        peaks = [rnd.randint(hmin, hmax) for _ in range(n)]
        pts = [(0, height)]
        for i in range(n + 1):
            x = i * step
            pts.append((x, height - peaks[i % n]))
            pts.append((x + step // 2, height - peaks[i % n] // 3))
        pts.append((TW, height))
        d.polygon(pts, fill=rgb(col)[:3] + (255,))
        im.save(os.path.join(OUT, 'stages', f'stage_{sid}_{name}.png'), optimize=True)
    mountains('far', s['far'], 90, 210, 130, 260)
    mountains('near', s['near'], 50, 130, 90, 180)

    gw, gh = 512, 110
    gr = Image.new('RGBA', (gw, gh), rgb(s['ground']))
    d = ImageDraw.Draw(gr)
    d.rectangle([0, 0, gw, 8], fill=rgb(s['edge']))
    d.rectangle([0, 8, gw, 12], fill=(0, 0, 0, 46))
    for _ in range(26):
        x, y, w = rnd.randint(0, gw), rnd.randint(22, gh - 8), rnd.randint(8, 38)
        for dx in (-gw, 0, gw):     # envolver para que repita sin costuras
            d.ellipse([x + dx - w, y - w // 6, x + dx + w, y + w // 6], fill=(0, 0, 0, 40))
    gr.save(os.path.join(OUT, 'stages', f'stage_{sid}_ground.png'), optimize=True)


def main():
    for sub in ('fighters', 'fx', 'stages'):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
    manifest = []
    for cid, d in CHARS.items():
        for sup in (False, True):
            base = build_fighter(cid, d, sup)
            manifest.append(os.path.relpath(base + '.png', os.path.join(OUT, '..', '..')))
            print('built', base)
    build_fx()
    for sid, s in STAGES.items():
        build_stage(sid, s)
    # tabla de animaciones para el juego
    json.dump({k: {'n': v[0], 'loop': v[1], 'fps': v[2]} for k, v in ANIMS.items()},
              open(os.path.join(OUT, 'fighters', 'anims.json'), 'w'), indent=1)
    print('done')


if __name__ == '__main__':
    main()
