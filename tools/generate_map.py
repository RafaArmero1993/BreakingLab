#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del mapa de Reactivia (RPG) — tools/generate_map.py
Construye un mapa 44×52 con biomas, río con puentes, lago, desierto,
bosques, playa y la capital amurallada; traza carreteras entre todas
las localidades, VALIDA por BFS que todo es alcanzable y lo inyecta en
adventure.js entre los marcadores /*MAP-START*/ y /*MAP-END*/.
Tiles: ~ agua · y playa · . hierba · f flores · h hierba alta ·
       s arena del páramo · r camino · b puente · m montaña · t bosque ·
       letras = localidades (V P S Z C M L O D W H)
"""
import random, re

W,H = 44,52
random.seed(20420)

g=[['.']*W for _ in range(H)]

def put(x,y,ch):
    if 0<=x<W and 0<=y<H: g[y][x]=ch
def get(x,y):
    if 0<=x<W and 0<=y<H: return g[y][x]
    return '~'
def rect(x0,y0,x1,y1,ch):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): put(x,y,ch)

# ── océano perimetral con costa irregular ──
for y in range(H):
    for x in range(W):
        d=min(x,y,W-1-x,H-1-y)
        if d==0: put(x,y,'~')
        elif d==1 and (x*7+y*13)%4!=0: put(x,y,'~')
        elif d==2 and (x*5+y*11)%7==0: put(x,y,'~')

# ── cordillera norte ──
rect(2,2,W-3,9,'m')
# meseta de las Cumbres (oeste de la cordillera)
rect(9,4,17,7,'.')
put(13,5,'W')
# paso de bajada desde las cumbres
for y in range(8,12): put(13,y,'.')
# plaza amurallada de la capital (este)
rect(29,3,39,7,'m')
rect(30,4,38,6,'.')
put(34,4,'H')
# puerta de la capital
put(34,7,'.'); put(34,8,'.'); put(34,9,'.')
# borde sur de la cordillera algo irregular
for x in range(2,W-2):
    if get(x,9)=='m' and (x*13)%5<2: put(x,10,'m')

# ── río desde la cordillera hasta el mar del sur ──
for y in range(10,H-1):
    put(24,y,'~'); put(25,y,'~')

# ── lago del oeste ──
rect(14,14,18,17,'~')
put(13,15,'L')

# ── desierto del páramo ──
rect(3,12,10,32,'s')
put(6,15,'D')
put(7,29,'O')

# ── playa y mar del sur ──
rect(2,46,W-3,47,'y')
rect(2,48,W-3,H-2,'~')

# ── localidades restantes ──
put(33,12,'M')   # Minas
put(33,24,'C')   # Ciudad Carbono
put(19,28,'Z')   # Cruce
put(19,42,'V')   # Villa
put(6,40,'P')    # Puerto
put(33,42,'S')   # Salinas

# ── bosques (manchas deterministas) ──
def blob(cx,cy,r,ch,keep='.'):
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            if (x-cx)**2+(y-cy)**2<=r*r and get(x,y)==keep:
                if (x*73+y*149)%5<3: put(x,y,ch)
blob(15,35,4,'t'); blob(30,33,3,'t'); blob(38,30,3,'t')
blob(10,22,2,'t'); blob(28,16,2,'t'); blob(38,18,2,'t')
blob(26,44,2,'t'); blob(12,44,2,'t')

# ── hierba alta (encuentros) ──
blob(20,20,3,'h'); blob(29,28,2,'h'); blob(16,31,2,'h')
blob(23,36,3,'h'); blob(36,36,2,'h'); blob(10,36,2,'h')
blob(31,9,1,'h')

# ── flores ──
blob(17,40,2,'f'); blob(11,16,1,'f'); blob(36,44,1,'f'); blob(21,12,1,'f')

# ── carreteras (tramos con puntos de paso; cruzan el río por puentes) ──
ROADS=[
 [(19,42),(19,34),(19,28)],            # Villa → Cruce
 [(6,40),(6,44),(16,44),(19,44),(19,42)], # Puerto → costa → Villa
 [(19,42),(28,42),(33,42)],            # Villa → Salinas (cruza el río: puente)
 [(33,42),(33,34),(33,24)],            # Salinas → Carbono
 [(33,24),(33,12)],                    # Carbono → Minas
 [(33,12),(34,12),(34,9)],             # Minas → puerta de la capital
 [(19,28),(28,28),(33,28),(33,24)],    # Cruce → Carbono (cruza el río: puente)
 [(19,28),(19,20),(13,20),(13,16)],    # Cruce → Lago
 [(13,16),(13,11)],                    # Lago → paso de las Cumbres
 [(19,28),(12,28),(12,30),(7,30)],     # Cruce → Oasis (entra al páramo)
 [(7,30),(7,29)],                      # → Oasis
 [(6,15),(6,22),(7,22),(7,29)],        # Desierto → Oasis
 [(6,15),(6,13),(13,13),(13,11)],      # Desierto → falda de las Cumbres
]
for path in ROADS:
    for (x0,y0),(x1,y1) in zip(path,path[1:]):
        x,y=x0,y0
        while x!=x1:
            x+=1 if x1>x else -1
            ch=get(x,y)
            if ch=='~': put(x,y,'b')
            elif ch in '.hftsmy': put(x,y,'r')
        while y!=y1:
            y+=1 if y1>y else -1
            ch=get(x,y)
            if ch=='~': put(x,y,'b')
            elif ch in '.hftsmy': put(x,y,'r')

MAP=[''.join(r) for r in g]

# ── validación ──
towns='VPSZCMLODWH'
flat=''.join(MAP)
assert all(len(r)==W for r in MAP), 'filas desiguales'
for t in towns:
    assert flat.count(t)==1, f'{t} aparece {flat.count(t)} veces'
BLOCK='~mt'
def tile(x,y):
    return MAP[y][x] if 0<=x<W and 0<=y<H else '~'
sx=MAP[42].index('V'); start=(sx,42)
seen={start}; q=[start]
while q:
    x,y=q.pop()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny=x+dx,y+dy
        if (nx,ny) in seen: continue
        if BLOCK.find(tile(nx,ny))>=0: continue
        seen.add((nx,ny)); q.append((nx,ny))
missing=[]
for t in towns:
    for y in range(H):
        x=MAP[y].find(t)
        if x>=0 and (x,y) not in seen: missing.append(t)
assert not missing, 'inaccesibles: '+','.join(missing)
walk=len(seen)
print(f'mapa {W}×{H} · transitables {walk} · hierba {flat.count("h")} · arena {flat.count("s")} · puentes {flat.count("b")}')
print('todas las localidades alcanzables ✓')

# ── inyección en adventure.js ──
js='const RPG_MAP = [\n'+'\n'.join(f"'{r}'," for r in MAP)+'\n];'
src=open('adventure.js',encoding='utf-8').read()
src=re.sub(r'/\*MAP-START\*/[\s\S]*?/\*MAP-END\*/',
           '/*MAP-START*/\n'+js+'\n/*MAP-END*/',src)
open('adventure.js','w',encoding='utf-8').write(src)
print('inyectado en adventure.js')
