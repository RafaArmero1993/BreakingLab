/* ════════════════════════════════════════════════════════════════
   MODO AVENTURA — BreakingLab · El País de Reactivia (RPG)
   ════════════════════════════════════════════════════════════════
   RPG clásico de los 90 a calidad comercial:
   - MUNDO CONTINENTAL 440×520 (228.800 baldosas, 100× el anterior)
     generado en tiempo de ejecución con semilla fija: costa ondulada,
     cordillera nevada, río, lago, desierto, bosques y capital
     amurallada. Minimapa cacheado y VIAJE RÁPIDO entre localidades
     visitadas.
   - Sprites PIXEL-ART propios con 4 direcciones y animación de
     caminar; movimiento interpolado entre baldosas con cámara suave.
   - RENDER POR CAPAS con objetos a ESCALA REALISTA: el personaje mide
     1 baldosa, pero árboles (~2), casas (~3) y edificios (hasta ~4,5)
     se dibujan como sprites grandes ordenados por profundidad. Cada
     localidad es un POBLADO (edificio principal según su estilo, casas,
     tienda, cartel, jardines, parque/fuente, árboles, vallas y farolas).
     Todo cacheado en lienzos fuera de pantalla; solo visual (no altera
     baldosas ni colisiones).
   - NPCs con paleta intercambiada que deambulan, se giran hacia ti
     al hablar y bloquean el paso.
   - Sistema de DIÁLOGOS con caja clásica, efecto máquina de escribir
     y regalos de una sola vez (banderas guardadas).
   - Encuentros salvajes en hierba alta y arena; localidades con
     compañías, tiendas especiales y la capital con candado.
   Tiles: ~ agua · y playa · . hierba · f flores · h hierba alta ·
          s arena (encuentros) · r camino · b puente · m montaña ·
          t bosque · letras = localidades
════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════
   GENERADOR DEL MUNDO (440×520 = 228.800 baldosas, 100× el anterior)
   Se genera en tiempo de ejecución con SEMILLA FIJA (mulberry32):
   determinista, 0 KB de mapa en el código y validado por la suite
   (BFS: todas las localidades alcanzables a pie).
   Tiles: ~ agua · y playa · . hierba · f flores · h hierba alta ·
   s arena (encuentros) · n nieve (encuentros) · r camino · b puente ·
   m montaña · t bosque · letras = localidades
════════════════════════════════ */
const RPG_W=440, RPG_H=520;
const RPG_VIEW=13;
const RPG_BLOCK='~mt';
const RPG_ENCOUNTER={h:.08, s:.07, n:.07};

const RPG_TOWN_POS={
  V:[200,440], P:[70,420], S:[340,430], Z:[210,300], C:[330,260],
  M:[350,140], L:[150,172], O:[80,292], D:[60,200], W:[180,84], H:[350,60],
};

const RPG_MAP=(function buildWorld(){
  /* PRNG con semilla fija */
  let _s=0x9E3779B9;
  const rnd=()=>{
    _s|=0;_s=(_s+0x6D2B79F5)|0;
    let t=Math.imul(_s^(_s>>>15),1|_s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
  const W=RPG_W,H=RPG_H;
  const g=new Array(H);
  for(let y=0;y<H;y++)g[y]=new Array(W).fill('.');
  const get=(x,y)=>(x<0||y<0||x>=W||y>=H)?'~':g[y][x];
  const put=(x,y,ch)=>{if(x>=0&&y>=0&&x<W&&y<H)g[y][x]=ch;};
  const ellipse=(cx,cy,rx,ry,ch,over)=>{
    for(let y=Math.max(0,cy-ry);y<=Math.min(H-1,cy+ry);y++)
      for(let x=Math.max(0,cx-rx);x<=Math.min(W-1,cx+rx);x++){
        const dx=(x-cx)/rx,dy=(y-cy)/ry;
        if(dx*dx+dy*dy<=1&&(!over||over.includes(get(x,y))))put(x,y,ch);
      }
  };
  const blob=(cx,cy,r,ch,density)=>{
    for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
      const dx=x-cx,dy=y-cy;
      if(dx*dx+dy*dy<=r*r&&get(x,y)==='.'&&rnd()<density)put(x,y,ch);
    }
  };

  /* océano perimetral con costa ondulada */
  for(let y=0;y<H;y++){
    const k=y*0.045;
    const wl=22+Math.round(10*Math.sin(k)+6*Math.sin(k*2.7));
    const wr=22+Math.round(10*Math.cos(k*1.3)+6*Math.sin(k*1.9+2));
    for(let x=0;x<wl;x++)put(x,y,'~');
    for(let x=W-wr;x<W;x++)put(x,y,'~');
  }
  for(let x=0;x<W;x++){
    const k=x*0.05;
    const wt=20+Math.round(9*Math.sin(k)+5*Math.cos(k*2.2));
    const wb=24+Math.round(11*Math.sin(k*1.4+1)+6*Math.cos(k*0.8));
    for(let y=0;y<wt;y++)put(x,y,'~');
    for(let y=H-wb;y<H;y++)put(x,y,'~');
  }

  /* cordillera norte (banda con relieve) + sierras secundarias */
  for(let x=0;x<W;x++){
    const k=x*0.03;
    const top=34+Math.round(8*Math.sin(k*1.7));
    const bot=92+Math.round(14*Math.sin(k+2)+8*Math.sin(k*2.3));
    for(let y=top;y<bot;y++)if(get(x,y)==='.')put(x,y,'m');
  }
  ellipse(255,200,26,16,'m',['.']);
  ellipse(120,350,20,12,'m',['.']);
  ellipse(390,330,16,22,'m',['.']);

  /* nieve en el norte */
  for(let y=0;y<118;y++)for(let x=0;x<W;x++)
    if(get(x,y)==='.'&&rnd()<.8)put(x,y,'n');

  /* meseta de las Cumbres */
  ellipse(180,84,22,13,'.');
  /* recinto amurallado de la capital con puerta sur */
  for(let y=40;y<=82;y++)for(let x=326;x<=374;x++){
    const edge=(y<=42||y>=80||x<=328||x>=372);
    put(x,y,edge?'m':'.');
  }
  for(let y=80;y<=88;y++){put(349,y,'.');put(350,y,'.');put(351,y,'.');}

  /* desierto del oeste */
  ellipse(75,245,48,95,'s',['.','n']);
  /* lago de Argón */
  ellipse(165,150,22,14,'.',['m','n']);
  ellipse(165,150,18,11,'~');

  /* ríos: caminata sesgada hacia el sur desde la cordillera */
  const river=(x0,y0,drift)=>{
    let x=x0;
    for(let y=y0;y<H;y++){
      put(x,y,'~');put(x+1,y,'~');
      if(y>H-45&&get(x,y+2)==='~')break;
      x+=rnd()<.5?0:(rnd()<.5+drift?1:-1);
      x=Math.max(30,Math.min(W-30,x));
    }
  };
  river(255,95,.06);
  river(120,118,-.04);

  /* bosques, hierba alta y flores */
  for(let i=0;i<150;i++)blob(40+Math.floor(rnd()*(W-80)),120+Math.floor(rnd()*(H-180)),4+Math.floor(rnd()*7),'t',.55);
  for(let i=0;i<170;i++)blob(35+Math.floor(rnd()*(W-70)),110+Math.floor(rnd()*(H-160)),3+Math.floor(rnd()*6),'h',.7);
  for(let i=0;i<60;i++)blob(40+Math.floor(rnd()*(W-80)),130+Math.floor(rnd()*(H-190)),2+Math.floor(rnd()*3),'f',.6);

  /* playas junto al mar */
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    if(g[y][x]!=='.')continue;
    if(get(x,y+1)==='~'||get(x+1,y)==='~'||get(x-1,y)==='~')put(x,y,'y');
  }

  /* localidades: plaza despejada + letra */
  for(const [ch,p] of Object.entries(RPG_TOWN_POS)){
    const tx=p[0],ty=p[1];
    for(let y=ty-3;y<=ty+3;y++)for(let x=tx-3;x<=tx+3;x++)
      if(get(x,y)!=='~')put(x,y,'.');
    put(tx,ty,ch);
  }

  /* carreteras entre localidades (tramos en L; el agua se vuelve puente) */
  const ROADS=[
    ['V',[200,360],'Z'], ['P',[70,442],[200,442],'V'], ['V',[270,442],[340,442],'S'],
    ['S',[338,330],'C'], ['C',[345,180],'M'], ['M',[350,90],[350,84]],
    ['Z',[300,300],[330,290],'C'], ['Z',[210,220],[150,220],'L'],
    ['L',[150,100],[176,88],'W'], ['Z',[120,300],'O'], ['O',[62,250],'D'],
    ['D',[60,120],[150,100]],
  ];
  const pos=p=>Array.isArray(p)?p:RPG_TOWN_POS[p];
  for(const path of ROADS){
    for(let i=0;i<path.length-1;i++){
      let xy=pos(path[i]);
      let x=xy[0],y=xy[1];
      const tgt=pos(path[i+1]);
      const carve=()=>{
        const ch=get(x,y);
        if(ch==='~')put(x,y,'b');
        else if('.hftsmyn'.includes(ch))put(x,y,'r');
      };
      while(x!==tgt[0]){x+=tgt[0]>x?1:-1;carve();}
      while(y!==tgt[1]){y+=tgt[1]>y?1:-1;carve();}
    }
  }

  return g.map(r=>r.join(''));
})();

const RPG_TOWNS = {
 V:{id:'villa',   icon:'🏠', name:'Villa Hidrógeno', region:'Costa Azur',
    corp:'Garaje Quark', level:'easy', reward:40,
    desc:'El pueblo donde todo laboratorio empieza. El garaje local presume de su química casera.'},
 P:{id:'puerto',  icon:'⚓', name:'Puerto Oxígeno', region:'Costa Azur',
    corp:'OxiCorp', level:'easy', reward:50,
    desc:'El aire salado oxida hasta las ideas. OxiCorp controla los muelles… y no le gustan los visitantes.'},
 S:{id:'salinas', icon:'🧂', name:'Salinas del Este', region:'Costa Azur',
    corp:'Salitre S.A.', level:'easy', reward:55,
    desc:'Montañas blancas de sal hasta el horizonte. Salitre S.A. patenta hasta el agua del mar.'},
 Z:{id:'cruce',   icon:'🛖', name:'Cruce del Azufre', region:'Llanos del Centro',
    corp:null,
    desc:'Aquí se cruzan todos los caminos del país. Su mercado ambulante vende de todo… un 20% más barato.'},
 C:{id:'carbono', icon:'🏭', name:'Ciudad Carbono', region:'Llanos del Centro',
    corp:'Grafeno Works', level:'normal', reward:70,
    desc:'Chimeneas, hollín y diamantes. En Grafeno Works dicen que el futuro se escribe con lápiz.'},
 M:{id:'minas',   icon:'⛏️', name:'Minas de Hierro', region:'Llanos del Centro',
    corp:'Ferrum Industries', level:'normal', reward:80,
    desc:'El metal canta bajo tierra. Ferrum forja aleaciones… y rivales difíciles de romper.'},
 L:{id:'lago',    icon:'♨️', name:'Lago Argón', region:'Sierra Wolframio',
    corp:null,
    desc:'Aguas termales bajo auroras de gas noble. El balneario vende hechizos a los viajeros.'},
 O:{id:'oasis',   icon:'🏜️', name:'Oasis del Litio', region:'Páramo Radiante',
    corp:null,
    desc:'Último refugio antes del desierto. Su caravana trae rarezas de todos los rincones del país.'},
 D:{id:'desierto',icon:'☢️', name:'Desierto de Uranio', region:'Páramo Radiante',
    corp:'RadCorp', level:'hard', reward:110,
    desc:'Un páramo que brilla de noche. RadCorp juega sucio: trae plomo si quieres sobrevivir.'},
 W:{id:'cumbres', icon:'🏔️', name:'Cumbres del Wolframio', region:'Sierra Wolframio',
    corp:'Wolfram Defense', level:'hard', reward:95,
    desc:'En la montaña más dura, la compañía más dura. Su laboratorio funde a 3.400 grados.'},
 H:{id:'helix',   icon:'🌆', name:'Helix City', region:'Capital',
    corp:'Helix Industries™', level:'hard', reward:150, boss:true,
    desc:'La capital corta el cielo con su torre. Arriba espera el Dr. Heisenberg IA… y la Molécula Maestra.'},
};

const ADV_CAPITAL_WINS = 5;
const ADV_STARTER = {H:6,O:5,C:3,N:3,Na:2,Cl:2,S:2,Ca:2,K:1,Fe:1,Mg:1,He:1,Ne:1};
const ADV_START_COINS = 60;
const ADV_SAVE_KEY = 'bl-rpg';

let ADV = null;

/* ════════════════════════════════
   SPRITES pixel-art a ESCALA REALISTA
   ─────────────────────────────────
   El personaje mide 1 baldosa de ancho y ~1,5 de alto. Los árboles,
   casas y edificios se dibujan MUCHO más grandes (2–4 baldosas) como
   objetos independientes, ordenados por profundidad. Todo se cachea en
   lienzos fuera de pantalla y se vuelca con drawImage (rápido y nítido).
   ART = píxeles-de-arte por baldosa.
════════════════════════════════ */
const ART=10;

/* utilidades de color */
function _hex(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function _rgb(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
function shade(hex,f){const c=_hex(hex);return _rgb(f<1?c.map(v=>v*f):c.map(v=>v+(255-v)*(f-1)));}
function mix(a,b,t){const x=_hex(a),y=_hex(b);return _rgb(x.map((v,i)=>v+(y[i]-v)*t));}

/* construye la paleta completa del muñeco a partir de pocos colores */
function mkPal(o){return {
  O:'#0c1126', E:'#101a30',
  H:o.hair, h:shade(o.hair,.7),
  F:o.skin, f:shade(o.skin,.82),
  C:o.coat, c:shade(o.coat,.8),
  S:o.shirt,s:shade(o.shirt,.78),
  P:o.pants,p:shade(o.pants,.78),
  B:o.boot||shade(o.pants,.6),
  G:o.accent };}

const PAL_PLAYER=mkPal({skin:'#f4c9a0',hair:'#2b3357',coat:'#eef3fb',shirt:'#22d3ee',pants:'#2c3566',boot:'#1a2036',accent:'#22d3ee'});
const NPC_PALS={
 profe:   mkPal({skin:'#ecc09a',hair:'#cfd4e8',coat:'#e6def4',shirt:'#a78bfa',pants:'#4a3f73',accent:'#a78bfa'}),
 abuela:  mkPal({skin:'#eebfa0',hair:'#e6e8f0',coat:'#c8718f',shirt:'#9c5277',pants:'#6e4458',accent:'#f0a8c4'}),
 marino:  mkPal({skin:'#d9a878',hair:'#5a4632',coat:'#3b6a9c',shirt:'#274e74',pants:'#22405e',accent:'#7fd0ff'}),
 guardia: mkPal({skin:'#e0a87a',hair:'#2b2218',coat:'#b3403f',shirt:'#8a2f2f',pants:'#3a2828',accent:'#f59e0b'}),
 mercader:mkPal({skin:'#dba87f',hair:'#3a2d1c',coat:'#c79b3b',shirt:'#9a7424',pants:'#5e4a22',accent:'#fde047'}),
 nino:    mkPal({skin:'#f4c9a0',hair:'#7a4a2a',coat:'#3fae6a',shirt:'#2a8050',pants:'#2a5e44',accent:'#a7f3d0'}),
 minero:  mkPal({skin:'#d9a878',hair:'#4a3b2d',coat:'#8c7a5b',shirt:'#6b5d44',pants:'#4a4032',accent:'#fbbf24'}),
 botanica:mkPal({skin:'#e8b88a',hair:'#2d4a33',coat:'#2f8f5b',shirt:'#247048',pants:'#1f5c3b',accent:'#86efac'}),
 eremita: mkPal({skin:'#dba87f',hair:'#bfc4d8',coat:'#6b7280',shirt:'#525a66',pants:'#3f4654',accent:'#cbd5e1'}),
 banista: mkPal({skin:'#f4c9a0',hair:'#2d3a5e',coat:'#38bdf8',shirt:'#2a93c4',pants:'#1f6b8f',accent:'#7fe7ff'}),
 cientif: mkPal({skin:'#f2c79b',hair:'#8a3b5e',coat:'#f1f5f9',shirt:'#f472b6',pants:'#7a3450',accent:'#f472b6'}),
 viejo:   mkPal({skin:'#e0a87a',hair:'#d8d8d8',coat:'#7a6a4a',shirt:'#5e523a',pants:'#4a4232',accent:'#cbd5e1'}),
};

/* matrices del muñeco — 11×14, '.'=transparente, espejo para 'right' */
const CHAR={
down:[[
'...OOOOO...','..OHHHHHO..','.OHHHHHHHO.','.OHFFFFFHO.','.OFFFFFFFO.',
'.OFEFFFEFO.','.OFFFFFFFO.','..OfFFFfO..','.OCCCCCCCO.','OCCCSSSCCCO',
'OCcCSSScCcO','.OCcSSScCO.','..PPP.PPP..','..BB...BB..',
],[
'...OOOOO...','..OHHHHHO..','.OHHHHHHHO.','.OHFFFFFHO.','.OFFFFFFFO.',
'.OFEFFFEFO.','.OFFFFFFFO.','..OfFFFfO..','.OCCCCCCCO.','OCCCSSSCCCO',
'OCcCSSScCcO','.OCcSSScCO.','..PPP.PPP..','.BB.....BB.',
]],
up:[[
'...OOOOO...','..OHHHHHO..','.OHHHHHHHO.','.OHHHHHHHO.','.OHHHHHHHO.',
'.OHHHHHHHO.','.OHHHHHHHO.','..OHHHHHO..','.OCCCCCCCO.','OCCCCCCCCCO',
'OCcCCCCCcCO','.OCcCCCcCO.','..PPP.PPP..','..BB...BB..',
],[
'...OOOOO...','..OHHHHHO..','.OHHHHHHHO.','.OHHHHHHHO.','.OHHHHHHHO.',
'.OHHHHHHHO.','.OHHHHHHHO.','..OHHHHHO..','.OCCCCCCCO.','OCCCCCCCCCO',
'OCcCCCCCcCO','.OCcCCCcCO.','..PPP.PPP..','.BB.....BB.',
]],
left:[[
'..OOOOO....','.OHHHHHO...','OHHHHHHHO..','OHFFFFHO...','OHFFFFFO...',
'OEFFFFFO...','OFFFFFFO...','.OfFFFfO...','.OCCCCCO...','OCCSCCCO...',
'OCcSCCcO...','.OCSCCcO...','..PPPP.....','..BBBB.....',
],[
'..OOOOO....','.OHHHHHO...','OHHHHHHHO..','OHFFFFHO...','OHFFFFFO...',
'OEFFFFFO...','OFFFFFFO...','.OfFFFfO...','.OCCCCCO...','OCCSCCCO...',
'OCcSCCcO...','.OCSCCcO...','..PP.PP....','.BB..BB....',
]],
};
CHAR.right=CHAR.left;

/* ════════════════════════════════
   CACHÉ DE SPRITES (lienzos fuera de pantalla al tamaño de baldosa)
════════════════════════════════ */
let _PX=3, _sprTs=0, _scn=new Map(), _charC=new Map();
function _cv(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;}
function rpgBuildSprites(){
  _PX=Math.max(2,Math.floor(_rpgTs/ART));
  _sprTs=_rpgTs; _scn.clear(); _charC.clear();
}
/* bloque de "píxel de arte" */
function _b(ctx,x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(x*_PX),Math.round(y*_PX),Math.ceil(w*_PX),Math.ceil(h*_PX));}

/* —— MUÑECO —— */
function charCanvas(palKey,pal,dir,frame){
  const key=palKey+'|'+dir+'|'+frame+'|'+_sprTs;
  let c=_charC.get(key); if(c)return c;
  const W=11,H=14, mat=(CHAR[dir]||CHAR.down)[frame%2], flip=dir==='right';
  c=_cv(W*_PX,H*_PX); const x=c.getContext('2d');
  for(let r=0;r<H;r++){const line=mat[r]||''; for(let col=0;col<W;col++){
    const ch=line[flip?W-1-col:col]||'.'; if(ch==='.')continue;
    _b(x,col,r,1,1,pal[ch]||'#fff');
  }}
  _charC.set(key,c); return c;
}

/* —— ESCENARIO (procedural, estética pixel chunky) —— */
function _scnGet(key,aw,ah,paint){
  let o=_scn.get(key); if(o)return o;
  const c=_cv(aw*_PX,ah*_PX), x=c.getContext('2d');
  paint(x,aw,ah); o={cv:c,aw,ah}; _scn.set(key,o); return o;
}
/* copa de árbol frondoso (~1.6×2.2 baldosas) */
function paintTree(x,aw,ah,leaf){
  const dk=shade(leaf,.62), lt=shade(leaf,1.28), trunk='#6b4a2c', td='#4f3620';
  _b(x,aw/2-1.4,ah-6,2.8,6,td); _b(x,aw/2-1.4,ah-6,1.3,6,trunk);          // tronco
  const cx=aw/2, blobs=[[cx,7,7.2],[cx-4,9,4.6],[cx+4,9,4.6],[cx,11,7.6],[cx,4.5,5.4]];
  for(const[bx,by,br]of blobs)for(let yy=-br;yy<=br;yy++)for(let xx=-br;xx<=br;xx++){
    if(xx*xx+yy*yy>br*br)continue; const px=bx+xx,py=by+yy;
    if(px<0||px>=aw||py<0||py>=ah-5)continue;
    const t=(xx-yy)/br, col=t<-.35?lt:(t>.45?dk:leaf); _b(x,px,py,1,1,col);
  }
  for(let i=0;i<10;i++){_b(x,cx-3+(i*1.7)%6,3+((i*2.3)%7),1,1, i%2?lt:dk);} // moteado
}
/* conífera */
function paintPine(x,aw,ah,snow){
  const g='#1f6b3e',gd='#15502d',gl='#2f8a52',trunk='#5a3f26';
  _b(x,aw/2-1,ah-5,2,5,trunk);
  let tiers=[[2.5,4.5],[5,5.5],[7.8,6.5]];
  for(let t=0;t<tiers.length;t++){const[ty,tw]=tiers[t];
    for(let r=0;r<5;r++){const w=tw*(r/5+.2), y=ty+r;
      _b(x,aw/2-w/2,y,w,1, r<2?gl:(r>3?gd:g));}}
  if(snow){for(let i=0;i<7;i++)_b(x,aw/2-3+i,2.6+(i%3),1,1,'#eef4ff');}
}
/* roca / risco */
function paintRock(x,aw,ah,snow){
  const g='#5b6378',gd='#3c4456',gl='#828aa0';
  for(let r=0;r<ah;r++){const f=r/ah, w=aw*(0.5+0.5*f);
    _b(x,(aw-w)/2,r,w,1, r<ah*0.4?gl:(r>ah*0.72?gd:g));}
  _b(x,aw*0.2,ah*0.45,aw*0.18,ah*0.3,gd); _b(x,aw*0.6,ah*0.5,aw*0.16,ah*0.28,gd);
  if(snow){_b(x,aw*0.16,0,aw*0.68,2.4,'#eef4ff'); _b(x,aw*0.3,2.2,aw*0.4,1,'#dbe6f7');}
}
/* edificio genérico parametrizable */
function paintBuilding(x,aw,ah,o){
  const wall=o.wall,wd=shade(wall,.82),wl=shade(wall,1.12);
  const roof=o.roof,rd=shade(roof,.78);
  const roofH=o.roofH||Math.round(ah*0.34), bodyY=roofH, bodyH=ah-roofH;
  // cuerpo
  _b(x,1,bodyY,aw-2,bodyH,wall);
  _b(x,1,bodyY,1.2,bodyH,wd); _b(x,aw-2.2,bodyY,1.2,bodyH,wd);  // esquinas sombreadas
  _b(x,1,bodyY,aw-2,1,wl);
  // hiladas de "ladrillo"/tablones suaves
  for(let r=bodyY+2;r<ah-1;r+=2)_b(x,1.6,r,aw-3.2,0.4,wd);
  // tejado
  if(o.flat){ _b(x,0.4,roofH-2.4,aw-0.8,2.4,roof); _b(x,0.4,roofH-2.4,aw-0.8,0.8,shade(roof,1.15));
    for(let i=1;i<aw-1;i+=2)_b(x,i,roofH-3.4,1,1,roof); // almenas
  } else {
    /* tejado a dos aguas: pico estrecho arriba, alero ancho abajo (△) */
    for(let r=0;r<roofH;r++){const w=aw*((r+1)/roofH); _b(x,(aw-w)/2,r,w,1, r<roofH*0.45?roof:rd);}
    _b(x,1,roofH-1,aw-2,0.8,rd);             // alero
    _b(x,aw/2-0.5,0.2,1,1.4,rd);             // caballete del pico
  }
  // puerta
  const dw=Math.max(2.2,aw*0.2), dh=Math.max(3,bodyH*0.55), dx=aw/2-dw/2, dy=ah-dh;
  _b(x,dx,dy,dw,dh,'#3a2718'); _b(x,dx+0.4,dy+0.5,dw-0.8,dh-0.6,o.door||'#6b4a2c');
  _b(x,aw/2-0.3,dy+dh*0.45,0.6,0.8,'#f4d27a');
  // ventanas iluminadas
  const wy=bodyY+1.6, ww=Math.max(1.6,aw*0.14);
  for(const wx of [aw*0.18, aw*0.82-ww]){
    _b(x,wx-0.4,wy-0.4,ww+0.8,ww+0.8,wd);
    _b(x,wx,wy,ww,ww,o.accent||'#ffe08a');
    _b(x,wx+ww/2-0.2,wy,0.4,ww,wd); _b(x,wx,wy+ww/2-0.2,ww,0.4,wd);
  }
  // chimeneas / torres
  if(o.chimney)for(const cxp of (o.chimney===2?[aw*0.3,aw*0.62]:[aw*0.66])){
    _b(x,cxp,roofH-roofH*0.2,2,roofH*0.6,wd); _b(x,cxp-0.3,roofH-roofH*0.2,2.6,1,shade(wall,.6));
  }
}

/* —— constructores cacheados por tipo —— */
const TREE_LEAVES=['#2f9e54','#3aa85f','#2b8f6a','#4fae3e'];
function scnTree(v){return _scnGet('tree'+v,16,22,(x,aw,ah)=>paintTree(x,aw,ah,TREE_LEAVES[v%TREE_LEAVES.length]));}
function scnPine(snow){return _scnGet('pine'+(snow?'s':''),13,24,(x,aw,ah)=>paintPine(x,aw,ah,snow));}
function scnRock(snow){return _scnGet('rock'+(snow?'s':''),17,15,(x,aw,ah)=>paintRock(x,aw,ah,snow));}
function scnBush(){return _scnGet('bush',12,9,(x,aw,ah)=>{const g='#2f8f50';
  for(let yy=0;yy<ah;yy++){const w=aw*(0.5+0.5*Math.sin((yy/ah)*Math.PI)); _b(x,(aw-w)/2,yy,w,1, yy<3?shade(g,1.25):(yy>ah-3?shade(g,.7):g));}});}
function scnFence(){return _scnGet('fence',10,7,(x,aw,ah)=>{const w='#9c8156',wd='#6e5a3a';
  _b(x,0,2,aw,1.4,w); _b(x,0,4.6,aw,1.4,w);
  for(const px of [1,aw*0.5-0.7,aw-2.4]){_b(x,px,0.5,1.4,ah-0.5,w);_b(x,px,0.5,0.5,ah-0.5,wd);}});}
function scnSign(txt){return _scnGet('sign',10,14,(x,aw,ah)=>{const w='#b58a52',wd='#7a5a32';
  _b(x,aw/2-0.7,5,1.4,ah-5,wd);                       // poste
  _b(x,0.5,1,aw-1,5,w); _b(x,0.5,1,aw-1,1,shade(w,1.2)); _b(x,0.5,5,aw-1,1,wd);
  for(let r=0;r<3;r++)_b(x,1.6,2+r*1.1,aw-3.2,0.5,'#4a3320');});}     // "texto"
function scnGarden(c1,c2){return _scnGet('garden'+c1,12,8,(x,aw,ah)=>{
  _b(x,0.5,3,aw-1,ah-3,'#5a3f28'); _b(x,0.5,3,aw-1,1,'#6e4f34');       // tierra
  const cols=[c1,c2,'#fde047'];
  for(let i=0;i<7;i++){const px=1.4+(i*1.5)%(aw-2), py=0.5+(i%3)*1.2;
    _b(x,px,py,1.4,1.4,cols[i%3]); _b(x,px+0.4,py+0.4,0.6,0.6,'#fffbe6');}});}
function scnFountain(){return _scnGet('fountain',18,12,(x,aw,ah)=>{const st='#8b93a6';
  _b(x,1,ah-5,aw-2,5,st); _b(x,1,ah-5,aw-2,1,shade(st,1.2)); _b(x,2,ah-3.4,aw-4,2,'#2f7fd6');
  _b(x,aw/2-1.2,2,2.4,ah-6,st); _b(x,aw/2-2.6,1,5.2,2,'#3f95e8'); _b(x,aw/2-0.5,0,1,2,'#7fd0ff');});}
function scnLamp(){return _scnGet('lamp',6,18,(x,aw,ah)=>{const m='#3a4256';
  _b(x,aw/2-0.6,3,1.2,ah-3,m); _b(x,aw/2-1.6,1,3.2,3,m); _b(x,aw/2-1,1.4,2,2,'#ffe9a8');});}
function scnCrate(){return _scnGet('crate',8,8,(x,aw,ah)=>{const w='#a9824e',wd='#7a5d34';
  _b(x,0.5,0.5,aw-1,ah-1,w); _b(x,0.5,0.5,aw-1,1,shade(w,1.2)); _b(x,0.5,ah-1.5,aw-1,1,wd);
  _b(x,aw/2-0.4,0.5,0.8,ah-1,wd); _b(x,0.5,ah/2-0.4,aw-1,0.8,wd);});}
/* edificios por estilo (devuelven {cv,aw,ah}) */
function scnHouse(v){const pal=[['#d9b48a','#b0413c'],['#cbb89a','#3f6aa0'],['#d7c39a','#4a8f5f'],['#c9a37a','#8a5a86']][v%4];
  return _scnGet('house'+v,18,24,(x,aw,ah)=>paintBuilding(x,aw,ah,{wall:pal[0],roof:pal[1],accent:'#ffe08a'}));}
function scnShop(){return _scnGet('shop',22,22,(x,aw,ah)=>{paintBuilding(x,aw,ah,{wall:'#e6d2a6',roof:'#c8762e',accent:'#bff0ff'});
  const ax=x; for(let i=0;i<aw-2;i++)_b(ax,1+i, ah*0.5, 1, 1.6, i%2?'#e23b3b':'#f4f0e6');});}  // toldo a rayas
const BUILD_STYLES={
  lab:    {aw:30,ah:34,o:{wall:'#dfe6f2',roof:'#5b6bb0',accent:'#7fe7ff',chimney:1}},
  factory:{aw:32,ah:34,o:{wall:'#9aa1ad',roof:'#6b5040',accent:'#ffcf6a',chimney:2}},
  port:   {aw:28,ah:34,o:{wall:'#cdd6dd',roof:'#c23b3b',accent:'#bff0ff',chimney:1}},
  salt:   {aw:28,ah:32,o:{wall:'#eef2f7',roof:'#9fb6c9',accent:'#dff3ff'}},
  mine:   {aw:30,ah:34,o:{wall:'#b8a07e',roof:'#5a4632',accent:'#ffcf6a',chimney:1}},
  spa:    {aw:28,ah:30,o:{wall:'#e7d2e6',roof:'#7a4f86',accent:'#ffd6f0'}},
  desert: {aw:30,ah:30,o:{wall:'#e3c98f',roof:'#c08a3e',accent:'#ffe7a8',flat:true}},
  market: {aw:28,ah:28,o:{wall:'#d8b27a',roof:'#3f8f6a',accent:'#ffe7a8'}},
  capital:{aw:30,ah:46,o:{wall:'#d7def0',roof:'#6a5ba8',accent:'#a7f3ff',flat:true,roofH:14,chimney:2}},
};
function scnBuild(style){const b=BUILD_STYLES[style]||BUILD_STYLES.lab;
  return _scnGet('bld:'+style,b.aw,b.ah,(x,aw,ah)=>paintBuilding(x,aw,ah,b.o));}

/* ════════════════════════════════
   NPCs — anclados a localidades (se colocan en la 1ª baldosa libre)
════════════════════════════════ */
const RPG_NPCS=[
 {key:'profe', name:'Prof. Reactivo', pal:'profe', near:'villa', slot:0, wander:false,
  gift:{coins:25},
  dialog:[
   '¡Bienvenido a Reactivia, joven química!',
   'Las compañías han patentado hasta el aire. Solo un laboratorio libre puede sintetizar la Molécula Maestra.',
   'Recuerda: en los duelos, selecciona los elementos EN EL ORDEN de la fórmula. H·H·O para el agua.',
   'Toma unas monedas para empezar. ¡Gástalas bien en las tiendas!']},
 {key:'abuela', name:'Abuela Hidra', pal:'abuela', near:'villa', slot:1, wander:true,
  gift:{card:'H'},
  dialog:[
   'En mis tiempos el hidrógeno se respetaba…',
   'Dos de hidrógeno y uno de oxígeno: no hay molécula más noble que el agua.',
   'Ten, llevaba esta carta de Hidrógeno en el delantal. A mí ya no me hace falta.']},
 {key:'marino', name:'Marino Brea', pal:'marino', near:'puerto', slot:0, wander:true,
  dialog:[
   'OxiCorp controla cada contenedor del puerto…',
   'Dicen que su jefa oxida los tratos que no le gustan. ¡Defiéndete con buena DEF, grumete!']},
 {key:'guardia', name:'Guardia de Helix', pal:'guardia', near:'helix', slot:0, wander:false,
  dialog:[
   '¡ALTO! La capital es propiedad de Helix Industries™.',
   'Solo los laboratorios con CINCO victorias sobre compañías pueden cruzar estas puertas.',
   'El Dr. Heisenberg IA no recibe a aficionados.']},
 {key:'mercader', name:'Mercader Áureo', pal:'mercader', near:'oasis', slot:0, wander:false,
  gift:{card:'Pb'},
  dialog:[
   'Psst… viajero. El páramo brilla de noche, y no por las estrellas.',
   'RadCorp juega con uranio. Contra radiactivos, nada como un buen blindaje…',
   'Toma este Plomo. Me debes una cuando seas Nobel.']},
 {key:'nino', name:'Niño Valencia', pal:'nino', near:'cruce', slot:0, wander:true,
  dialog:[
   '¡Pío pío! ¡Soy un electrón libre!',
   'El mercader del cruce vende TODO más barato. ¡Pero no se lo digas a las compañías!']},
 {key:'minero', name:'Capataz Mena', pal:'minero', near:'minas', slot:0, wander:true,
  dialog:[
   'Ferrum saca hierro hasta de las lentejas.',
   'Su molécula favorita es la pirita: FeS₂. Oro de los tontos… pero pega como el oro de verdad.']},
 {key:'botanica', name:'Botánica Flora', pal:'botanica', near:'cruce', slot:1, wander:true,
  dialog:[
   '¡Cuidado con la hierba alta! 🌿',
   'Entre las matas se esconden químicos errantes que retan a cualquiera.',
   'Aunque… derrotarlos da buenas monedas. Tú decides, valiente.']},
 {key:'eremita', name:'Eremita Volframio', pal:'eremita', near:'cumbres', slot:0, wander:false,
  dialog:[
   'He visto fundirse mil aleaciones en estas cumbres…',
   'Wolfram Defense forja murallas de WC, la widia. Necesitarás un ataque DEMOLEDOR.']},
 {key:'banista', name:'Bañista Argón', pal:'banista', near:'lago', slot:0, wander:true,
  dialog:[
   '¡Ahhh… estas termas de gas noble!',
   'El balneario solo vende hechizos. El Xenón anestesia hasta las discusiones de pareja.']},
 {key:'cientif', name:'Dra. Mol', pal:'cientif', near:'carbono', slot:0, wander:true,
  dialog:[
   'En Grafeno Works me robaron la patente del grafeno… ¡con un lápiz!',
   'Consejo: guarda siempre un hechizo. La ronda de hechizos decide más duelos que el ATK.']},
 {key:'viejo', name:'Viejo del Puente', pal:'viejo', near:'salinas', slot:0, wander:false,
  dialog:[
   'Este río baja de la cordillera cargado de minerales…',
   'Antes había peces. Ahora hay patentes flotando. Qué tiempos.']},
];

/* ════════════════════════════════
   POBLADOS — cada localidad es un caserío con edificio principal,
   casas, tienda, cartel, jardines, parque, árboles y vallas.
   Solo VISUAL: no altera baldosas ni colisiones (la lógica entra al
   pisar la baldosa-letra). Distribución determinista por pueblo.
════════════════════════════════ */
const TOWN_STYLE={villa:'lab',puerto:'port',salinas:'salt',cruce:'market',
  carbono:'factory',minas:'mine',lago:'spa',oasis:'market',desierto:'desert',
  cumbres:'factory',helix:'capital'};
const GARDEN_COLS=[['#f472b6','#a78bfa'],['#fb7185','#fbbf24'],['#7fe7ff','#86efac'],['#f9a8d4','#fde047']];
let _villages={};
function villageProps(townChar){
  if(_villages[townChar])return _villages[townChar];
  const t=RPG_TOWNS[townChar]; const [tx,ty]=RPG_TOWN_POS[townChar];
  let s=(tx*131+ty*977+7)>>>0; const rnd=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
  const style=TOWN_STYLE[t.id]||'lab';
  const P=[]; const add=(type,dx,dy,extra)=>P.push({type,ox:tx+dx,oy:ty+dy,...extra});
  add('build',0,0,{style});                                     // edificio principal
  add('house',-3,-1,{v:(s>>>1)%4}); add('house',3,-1,{v:(s>>>3)%4});
  add('house',-3,2,{v:(s>>>5)%4});  add('shop',3,2,{});         // casas + tienda
  add('sign',-1,3,{});                                          // cartel de bienvenida
  add('lamp',-2,1,{}); add('lamp',2,1,{});                      // farolas junto a la puerta
  add('garden',-3,3,{cols:GARDEN_COLS[(s>>>7)%4]});
  add('garden',1,3,{cols:GARDEN_COLS[(s>>>9)%4]});             // jardines
  add('fence',-2,3,{}); add('fence',2,3,{});                    // vallas
  add('tree',-4,-1,{v:(s>>>2)%4}); add('tree',4,0,{v:(s>>>4)%4});
  add('tree',-4,2,{v:(s>>>6)%4});  add('tree',4,3,{v:(s>>>8)%4});
  add('bush',-2,2,{}); add('bush',2,3,{});
  if(t.id==='helix'||t.id==='lago'||t.id==='salinas') add('fountain',0,3,{}); // parque/fuente
  if(t.id==='puerto'||t.id==='cruce'||t.id==='oasis'){add('crate',-2,2,{});add('crate',4,1,{});}
  _villages[townChar]=P; return P;
}
/* sprite cacheado para un prop del poblado */
function scnForProp(p){
  switch(p.type){
    case 'build':   return scnBuild(p.style);
    case 'house':   return scnHouse(p.v||0);
    case 'shop':    return scnShop();
    case 'sign':    return scnSign();
    case 'garden':  return scnGarden((p.cols||GARDEN_COLS[0])[0],(p.cols||GARDEN_COLS[0])[1]);
    case 'fountain':return scnFountain();
    case 'tree':    return scnTree(p.v||0);
    case 'bush':    return scnBush();
    case 'fence':   return scnFence();
    case 'lamp':    return scnLamp();
    case 'crate':   return scnCrate();
  }
  return scnBush();
}

/* ── estado ── */
function rpgTile(x,y){
  if(x<0||y<0||x>=RPG_W||y>=RPG_H)return '~';
  return RPG_MAP[y][x];
}
function rpgTownAt(x,y){ return RPG_TOWNS[rpgTile(x,y)]||null; }
function rpgFindTile(ch){
  for(let y=0;y<RPG_H;y++){const x=RPG_MAP[y].indexOf(ch);if(x>-1)return {x,y};}
  return {x:2,y:2};
}
function advPlaceById(id){
  for(const t of Object.values(RPG_TOWNS))if(t.id===id)return t;
  return null;
}
function advWins(){ return Object.values(ADV.cleared).filter(Boolean).length; }
function rpgRegionAt(x,y){
  const t=rpgTownAt(x,y);
  if(t)return t.name;
  const ch=rpgTile(x,y);
  if(x>320&&y<90)return 'Murallas de la Capital';
  if(y<118)return 'Sierra Nevada de Wolframio';
  if(ch==='s'||(x<130&&y<350))return 'Páramo Radiante';
  if(y>400)return 'Costa Azur';
  return 'Llanos del Centro';
}

/* ── persistencia ── */
function advSave(){
  try{ localStorage.setItem(ADV_SAVE_KEY, JSON.stringify({
    x:ADV.x, y:ADV.y, dir:ADV.dir, coins:ADV.coins, col:ADV.col,
    cleared:ADV.cleared, flags:ADV.flags, visited:ADV.visited||{}, done:ADV.done
  })); }catch(e){}
}
function advLoad(){
  try{
    const s=JSON.parse(localStorage.getItem(ADV_SAVE_KEY));
    if(s&&s.col&&typeof s.x==='number')return s;
  }catch(e){}
  return null;
}
function advNew(){
  const v=rpgFindTile('V');
  ADV={x:v.x, y:v.y+1, dir:'down', coins:ADV_START_COINS, col:{...ADV_STARTER},
       cleared:{}, flags:{}, visited:{}, done:false,
       inBattle:false, duelKind:'town', duelTown:'villa',
       wildLevel:'easy', wildName:'', wildCoins:0,
       battleDeck:[], battleSpells:[], offers:[], _onTown:false};
  if(RPG_BLOCK.includes(rpgTile(ADV.x,ADV.y))){ADV.x=v.x;ADV.y=v.y;ADV._onTown=true;}
  advSave();
}

function advEnter(){
  const s=advLoad();
  if(s){
    ADV={...s, dir:s.dir||'down', flags:s.flags||{}, visited:s.visited||{},
         inBattle:false, duelKind:'town', duelTown:'villa',
         wildLevel:'easy', wildName:'', wildCoins:0,
         battleDeck:[], battleSpells:[], offers:[],
         _onTown:!!rpgTownAt(s.x,s.y)};
    /* posición de un mapa antiguo → recoloca en la Villa */
    if(RPG_BLOCK.includes(rpgTile(ADV.x,ADV.y))||ADV.x>=RPG_W||ADV.y>=RPG_H){
      const v=rpgFindTile('V');ADV.x=v.x;ADV.y=v.y+1;ADV._onTown=false;
    }
  } else {
    advNew();
  }
  rpgPlaceNPCs();
  showScreen('map');
  rpgInit();
}
function advReset(){
  _miniCache=null;
  if(!confirm('¿Reiniciar la aventura? Perderás tu colección y tus monedas.'))return;
  advNew();
  rpgPlaceNPCs();
  rpgDraw();
  toast('🗺 Nueva aventura comenzada');
}

/* ════════════════════════════════
   NPCs: colocación y comportamiento
════════════════════════════════ */
let _npcs=[];
function rpgWalkable(x,y){
  const ch=rpgTile(x,y);
  if(RPG_BLOCK.includes(ch)||RPG_TOWNS[ch])return false;
  return true;
}
function rpgPlaceNPCs(){
  _npcs=[];
  for(const def of RPG_NPCS){
    const town=advPlaceById(def.near);
    let anchor=null;
    for(const [ch,t] of Object.entries(RPG_TOWNS))if(t.id===def.near)anchor=rpgFindTile(ch);
    if(!anchor)continue;
    /* búsqueda en espiral de baldosas libres alrededor del pueblo */
    const free=[];
    for(let r=1;r<=3&&free.length<=def.slot;r++){
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        const x=anchor.x+dx,y=anchor.y+dy;
        if(rpgWalkable(x,y)&&!free.some(f=>f.x===x&&f.y===y)&&!_npcs.some(n=>n.x===x&&n.y===y))
          free.push({x,y});
      }
    }
    const spot=free[Math.min(def.slot,free.length-1)];
    if(!spot)continue;
    _npcs.push({...def, x:spot.x, y:spot.y, hx:spot.x, hy:spot.y, dir:'down'});
  }
}
function rpgNpcAt(x,y){ return _npcs.find(n=>n.x===x&&n.y===y)||null; }

/* deambular: un pasito aleatorio cerca de casa */
function rpgNpcWander(){
  for(const n of _npcs){
    if(!n.wander||Math.random()<.65)continue;
    const dirs=[[0,1,'down'],[0,-1,'up'],[-1,0,'left'],[1,0,'right']];
    const [dx,dy,d]=dirs[Math.floor(Math.random()*4)];
    const nx=n.x+dx,ny=n.y+dy;
    if(Math.abs(nx-n.hx)>1||Math.abs(ny-n.hy)>1)continue;
    if(!rpgWalkable(nx,ny))continue;
    if(rpgNpcAt(nx,ny))continue;
    if(ADV&&nx===ADV.x&&ny===ADV.y)continue;
    n.x=nx;n.y=ny;n.dir=d;
  }
}

/* ════════════════════════════════
   MOTOR (canvas, cámara suave, animación)
════════════════════════════════ */
let _rpgCv=null,_rpgCtx=null,_rpgTs=24,_rpgKeysBound=false;
let _anim=null;       /* {fx,fy,tx,ty,t0,dur} interpolación de paso */
let _walkFrame=0;
let _padDir=null;     /* dirección mantenida en la cruceta */
let _ticker=null;

function rpgActive(){
  const sc=document.getElementById('screen-map');
  return sc&&sc.classList.contains('active');
}

function rpgInit(){
  _rpgCv=document.getElementById('rpg-canvas');
  if(!_rpgCv)return;
  const w=Math.min(innerWidth*0.94,430);
  _rpgTs=Math.floor(w/RPG_VIEW);
  _rpgCv.width=_rpgTs*RPG_VIEW;
  _rpgCv.height=_rpgTs*RPG_VIEW;
  _rpgCtx=_rpgCv.getContext('2d');
  rpgBuildSprites();
  if(!_rpgKeysBound){
    _rpgKeysBound=true;
    document.addEventListener('keydown',(e)=>{
      if(!rpgActive())return;
      if(_dlg){if(e.key==='Enter'||e.key===' '){e.preventDefault();dlgAdvance();}return;}
      if(document.querySelector('.ov.open'))return;
      const k=e.key.toLowerCase();
      if(k==='arrowup'||k==='w'){e.preventDefault();rpgStep(0,-1,'up');}
      else if(k==='arrowdown'||k==='s'){e.preventDefault();rpgStep(0,1,'down');}
      else if(k==='arrowleft'||k==='a'){e.preventDefault();rpgStep(-1,0,'left');}
      else if(k==='arrowright'||k==='d'){e.preventDefault();rpgStep(1,0,'right');}
      else if(k==='enter'||k===' '){e.preventDefault();rpgAction();}
      else if(k==='m'){e.preventDefault();openMinimap();}
    });
    _rpgCv.addEventListener('click',()=>{if(_dlg)dlgAdvance();});
  }
  clearInterval(_ticker);
  _ticker=setInterval(()=>{
    if(!rpgActive()||ADV&&ADV.inBattle)return;
    if(!_dlg)rpgNpcWander();
    if(!_anim)rpgDraw();
  },420);
  rpgDraw();
}

/* colores base del suelo (también los usa el minimapa) */
const RPG_COLORS={
  '~':'#15396b', '.':'#2e7d46', 'h':'#236437', 's':'#cdb074',
  'r':'#9c8158', 'm':'#5b6378', 't':'#2a6b3e', 'b':'#8a6a40',
  'y':'#d8c389', 'f':'#2e7d46', 'n':'#dce8f6',
};
const GRASS2='#379a55', GRASS_D='#246b3c';

/* dibuja UNA baldosa de suelo con textura y orillas */
function drawGround(ctx,ch,sx,sy,ts,x,y,now,n,waveF){
  const base=RPG_COLORS[ch]||(RPG_TOWNS[ch]?'#3f9a5e':'#2e7d46');
  ctx.fillStyle=RPG_TOWNS[ch]?'#3f9a5e':base;
  ctx.fillRect(sx,sy,ts+1,ts+1);
  if(ch==='~'){                                   // agua: bandas + oleaje
    ctx.fillStyle='rgba(10,28,60,.45)';
    ctx.fillRect(sx,sy+ts*.5,ts+1,ts*.5);
    ctx.fillStyle='rgba(140,195,255,'+((n%2===waveF)?'.22':'.08')+')';
    ctx.fillRect(sx+ts*.12,sy+ts*(.25+(n%4)*.16),ts*.5,Math.max(1,ts*.08));
    /* espuma junto a tierra */
    if('.hsytrfb'.includes(rpgTile(x,y-1)))ctx.fillRect(sx,sy,ts+1,Math.max(1,ts*.14));
    if('.hsytrfb'.includes(rpgTile(x-1,y))){ctx.fillStyle='rgba(200,225,255,.5)';ctx.fillRect(sx,sy,Math.max(1,ts*.12),ts+1);}
  } else if(ch==='.'||ch==='f'||ch==='t'||RPG_TOWNS[ch]){ // hierba: moteado bitono
    ctx.fillStyle=(n%3===0)?GRASS2:GRASS_D;
    ctx.fillRect(sx+(n%5)*ts*.17,sy+(n%4)*ts*.2,Math.max(1,ts*.12),Math.max(1,ts*.1));
    ctx.fillStyle='rgba(180,255,200,.10)';
    ctx.fillRect(sx+((n>>3)%4)*ts*.22,sy+((n>>2)%5)*ts*.16,Math.max(1,ts*.1),Math.max(1,ts*.07));
    if(ch==='f'){                                  // flores
      ctx.fillStyle=(n%2)?'#f472b6':'#fde047';
      ctx.fillRect(sx+ts*.24,sy+ts*.3,Math.max(2,ts*.13),Math.max(2,ts*.13));
      ctx.fillStyle=(n%2)?'#a78bfa':'#fb7185';
      ctx.fillRect(sx+ts*.58,sy+ts*.6,Math.max(2,ts*.12),Math.max(2,ts*.12));
    }
  } else if(ch==='h'){                              // hierba alta (peligro)
    for(let i=0;i<4;i++){ctx.fillStyle=(i+n)%2?'#1c5530':'#2f8f50';
      ctx.fillRect(sx+i*ts*.26+ts*.05,sy+ts*(.3+((i+n)%3)*.12),Math.max(1,ts*.12),ts*.55);}
  } else if(ch==='s'||ch==='y'){                    // arena / playa
    ctx.fillStyle='rgba(255,240,190,.18)';
    ctx.fillRect(sx+(n%4)*ts*.22,sy+(n%5)*ts*.17,Math.max(1,ts*.1),Math.max(1,ts*.08));
    ctx.fillStyle='rgba(150,110,60,.12)';
    ctx.fillRect(sx+((n>>2)%5)*ts*.18,sy+((n>>1)%4)*ts*.22,Math.max(1,ts*.07),Math.max(1,ts*.07));
  } else if(ch==='n'){                              // nieve
    ctx.fillStyle='rgba(255,255,255,'+((n%3)?'.5':'.2')+')';
    ctx.fillRect(sx+(n%4)*ts*.22,sy+(n%5)*ts*.18,Math.max(1,ts*.13),Math.max(1,ts*.11));
    ctx.fillStyle='rgba(150,180,220,.25)';
    ctx.fillRect(sx,sy+ts*.8,ts+1,ts*.2);
  } else if(ch==='r'){                              // camino de tierra
    ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(sx,sy+ts*.74,ts+1,ts*.26);
    ctx.fillStyle='rgba(255,235,190,.10)';ctx.fillRect(sx,sy,ts+1,ts*.18);
    ctx.fillStyle='rgba(90,70,40,.4)';
    ctx.fillRect(sx+(n%5)*ts*.18,sy+(n%4)*ts*.2,Math.max(1,ts*.09),Math.max(1,ts*.09));
  } else if(ch==='b'){                              // puente de tablones
    ctx.fillStyle='rgba(60,40,20,.5)';
    for(let i=0;i<4;i++)ctx.fillRect(sx,sy+ts*(.12+i*.24),ts+1,Math.max(1,ts*.05));
    ctx.fillStyle='rgba(255,220,160,.12)';ctx.fillRect(sx,sy,ts+1,ts*.1);
  } else if(ch==='m'){                              // base rocosa (bajo el risco)
    ctx.fillStyle='rgba(0,0,0,.18)';
    ctx.fillRect(sx+(n%4)*ts*.2,sy+(n%5)*ts*.18,Math.max(1,ts*.14),Math.max(1,ts*.1));
  }
}

/* sombra suave bajo un objeto */
function _shadow(ctx,cx,by,w){
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath();ctx.ellipse(cx,by-w*.06,w*.5,w*.2,0,0,7);ctx.fill();
}
function rpgDraw(){
  if(!_rpgCtx||!ADV)return;
  if(_sprTs!==_rpgTs)rpgBuildSprites();
  const ctx=_rpgCtx, ts=_rpgTs, now=Date.now();
  let px=ADV.x, py=ADV.y;
  if(_anim){
    const k=Math.min(1,(now-_anim.t0)/_anim.dur);
    px=_anim.fx+(_anim.tx-_anim.fx)*k; py=_anim.fy+(_anim.ty-_anim.fy)*k;
  }
  const half=(RPG_VIEW-1)/2;
  const camX=Math.max(0,Math.min(px-half,RPG_W-RPG_VIEW));
  const camY=Math.max(0,Math.min(py-half,RPG_H-RPG_VIEW));
  ctx.clearRect(0,0,_rpgCv.width,_rpgCv.height);
  const waveF=Math.floor(now/600)%2;
  const x0=Math.floor(camX),y0=Math.floor(camY);

  /* ── CAPA 1: SUELO ── */
  for(let vy=-1;vy<=RPG_VIEW+1;vy++)for(let vx=-1;vx<=RPG_VIEW+1;vx++){
    const x=x0+vx,y=y0+vy, ch=rpgTile(x,y);
    const n=(x*73856093 ^ y*19349663)>>>0;
    drawGround(ctx,ch,(x-camX)*ts,(y-camY)*ts,ts,x,y,now,n,waveF);
  }

  /* ── CAPA 2: OBJETOS (ordenados por profundidad) ── */
  const objs=[];
  const blit=(o,cx,by,w)=>objs.push({...o,cx,by,w});
  for(let vy=-5;vy<=RPG_VIEW+2;vy++)for(let vx=-4;vx<=RPG_VIEW+4;vx++){
    const x=x0+vx,y=y0+vy; if(x<0||y<0||x>=RPG_W||y>=RPG_H)continue;
    const ch=rpgTile(x,y), n=(x*2654435761 ^ y*40503)>>>0;
    const cx=(x-camX+.5)*ts, by=(y-camY+1)*ts;
    if(ch==='t'){
      const spr=(y<150||(n&7)===0)?scnPine(y<118):scnTree(n%4);
      blit({spr,kind:'scn'},cx,by, spr.aw*_PX);
    } else if(ch==='m'){
      const spr=scnRock(y<118); blit({spr,kind:'scn'},cx,by, spr.aw*_PX);
    } else if(RPG_TOWNS[ch]){
      const town=RPG_TOWNS[ch];
      for(const p of villageProps(ch)){
        const spr=scnForProp(p);
        blit({spr,kind:'scn',sub:p.type,town:p.type==='build'?town:null,_oy:p.oy},
             (p.ox-camX+.5)*ts,(p.oy-camY+1)*ts, spr.aw*_PX);
      }
    } else if(ch==='.'&&(n%41===0)){            // matojos dispersos
      const spr=scnBush(); blit({spr,kind:'scn'},cx,by, spr.aw*_PX);
    } else if(ch==='.'&&(n%163===0)){           // algún árbol solitario
      const spr=scnTree(n%4); blit({spr,kind:'scn'},cx,by, spr.aw*_PX);
    }
  }
  /* NPCs */
  for(const npc of _npcs){
    if(npc.x<x0-2||npc.x>x0+RPG_VIEW+2||npc.y<y0-2||npc.y>y0+RPG_VIEW+2)continue;
    blit({kind:'char',pal:NPC_PALS[npc.pal]||PAL_PLAYER,palKey:npc.pal,dir:npc.dir,frame:0},
         (npc.x-camX+.5)*ts,(npc.y-camY+1)*ts, 11*_PX);
  }
  /* jugador */
  blit({kind:'char',player:true,pal:PAL_PLAYER,palKey:'player',dir:ADV.dir,frame:_walkFrame},
       (px-camX+.5)*ts,(py-camY+1)*ts, 11*_PX);

  /* orden: por línea base; el personaje pisa por delante en su fila */
  objs.sort((a,b)=> (a.by - b.by) || ((a.kind==='char'?1:0)-(b.kind==='char'?1:0)) );
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const o of objs){
    if(o.kind==='char'){
      const c=charCanvas(o.palKey,o.pal,o.dir,o.frame);
      _shadow(ctx,o.cx,o.by,o.w*.9);
      if(o.player){ctx.save();ctx.shadowColor='rgba(34,211,238,.5)';ctx.shadowBlur=ts*.22;}
      ctx.drawImage(c,Math.round(o.cx-c.width/2),Math.round(o.by-c.height));
      if(o.player)ctx.restore();
    } else {
      const s=o.spr;
      if(o.sub==='build'||o.sub==='house'||o.sub==='shop'||o.sub==='tree'||!o.sub)
        _shadow(ctx,o.cx,o.by,o.w);
      ctx.drawImage(s.cv,Math.round(o.cx-s.cv.width/2),Math.round(o.by-s.cv.height));
      /* estado del pueblo sobre el edificio principal */
      if(o.sub==='build'&&o.town){
        const top=o.by - s.cv.height - ts*.1;
        const locked=o.town.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[o.town.id];
        ctx.font=(ts*.6)+'px serif';
        if(locked)ctx.fillText('🔒',o.cx,top);
        else if(ADV.cleared[o.town.id])ctx.fillText('✅',o.cx,top);
        ctx.font='700 '+(ts*.34)+'px Exo 2,sans-serif';
        ctx.fillStyle='rgba(8,12,30,.78)';
        const nm=o.town.name, tw=ctx.measureText(nm).width;
        ctx.fillRect(o.cx-tw/2-4,top-ts*.62,tw+8,ts*.42);
        ctx.fillStyle='#eef2ff';ctx.fillText(nm,o.cx,top-ts*.41);
      }
    }
  }

  /* HUD */
  const coins=document.getElementById('map-coins');
  if(coins)coins.textContent='🪙 '+ADV.coins;
  const wins=document.getElementById('map-wins');
  if(wins)wins.textContent='🏅 '+advWins()+' / '+ADV_CAPITAL_WINS;
  const loc=document.getElementById('map-loc');
  if(loc)loc.textContent='📍 '+rpgRegionAt(ADV.x,ADV.y);
}

/* un paso con interpolación */
function rpgStep(dx,dy,dir){
  if(!ADV||ADV.inBattle||_anim||_dlg)return;
  ADV.dir=dir;
  const nx=ADV.x+dx, ny=ADV.y+dy;
  const ch=rpgTile(nx,ny);
  if(RPG_BLOCK.includes(ch)||rpgNpcAt(nx,ny)){rpgDraw();return;}
  const town=RPG_TOWNS[ch];
  if(town&&town.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[town.id]){
    toast(`Las puertas de la capital exigen ${ADV_CAPITAL_WINS} victorias (llevas ${advWins()})`);
    rpgDraw();return;
  }
  _walkFrame^=1;
  _anim={fx:ADV.x,fy:ADV.y,tx:nx,ty:ny,t0:Date.now(),dur:150};
  ADV.x=nx;ADV.y=ny;
  requestAnimationFrame(rpgAnimFrame);
}
function rpgAnimFrame(){
  if(!_anim)return;
  const done=(Date.now()-_anim.t0)>=_anim.dur;
  rpgDraw();
  if(!done){requestAnimationFrame(rpgAnimFrame);return;}
  _anim=null;
  rpgDraw();
  rpgArrive();
  /* cruceta mantenida → siguiente paso */
  if(_padDir&&!_dlg&&!ADV.inBattle){
    const d=_padDir;
    setTimeout(()=>{if(_padDir===d)rpgStep(d[0],d[1],d[2]);},10);
  }
}
function rpgArrive(){
  advSave();
  const ch=rpgTile(ADV.x,ADV.y);
  const town=RPG_TOWNS[ch];
  if(town){
    if(!ADV._onTown){ADV._onTown=true;sfx.select();setTimeout(()=>advOpenTown(town.id),140);}
    return;
  }
  ADV._onTown=false;
  const rate=RPG_ENCOUNTER[ch];
  if(rate&&Math.random()<rate){_padDir=null;rpgWildEncounter(ch,ADV.y);}
}

/* cruceta táctil: mantener = caminar */
function padStart(dx,dy,dir){
  _padDir=[dx,dy,dir];
  rpgStep(dx,dy,dir);
}
function padStop(){_padDir=null;}

/* ════════════════════════════════
   MINIMAPA del continente (cacheado, 1px por baldosa)
════════════════════════════════ */
let _miniCache=null;
function rpgBuildMinimap(){
  const cv=document.createElement('canvas');
  cv.width=RPG_W;cv.height=RPG_H;
  const c=cv.getContext('2d');
  if(!c)return null;
  for(let y=0;y<RPG_H;y++)for(let x=0;x<RPG_W;x++){
    const ch=rpgTile(x,y);
    c.fillStyle=RPG_TOWNS[ch]?'#fbbf24':(RPG_COLORS[ch]||'#17402b');
    c.fillRect(x,y,1,1);
  }
  /* localidades como puntos brillantes */
  for(const [ch,[tx,ty]] of Object.entries(RPG_TOWN_POS)){
    c.fillStyle='#fde047';
    c.fillRect(tx-2,ty-2,5,5);
  }
  return cv;
}
function openMinimap(){
  if(!ADV)return;
  if(!_miniCache)_miniCache=rpgBuildMinimap();
  const cv=document.getElementById('mini-canvas');
  if(!cv||!_miniCache)return;
  cv.width=RPG_W;cv.height=RPG_H;
  const c=cv.getContext('2d');
  if(!c)return;
  c.drawImage(_miniCache,0,0);
  /* tu posición */
  c.fillStyle='#22d3ee';
  c.fillRect(ADV.x-3,ADV.y-3,7,7);
  c.strokeStyle='#fff';c.lineWidth=2;
  c.strokeRect(ADV.x-5,ADV.y-5,11,11);
  document.getElementById('ov-mini').classList.add('open');
}

/* ════════════════════════════════
   VIAJE RÁPIDO entre localidades visitadas
════════════════════════════════ */
function advOpenFastTravel(){
  const list=document.getElementById('fast-list');
  list.innerHTML='';
  const visited=Object.keys(ADV.visited||{}).filter(id=>id!==ADV.duelTown);
  if(!visited.length){
    list.innerHTML='<div class="no-mol-msg">Aún no has visitado otras localidades.</div>';
  }
  for(const id of visited){
    const t=advPlaceById(id);
    if(!t)continue;
    const b=document.createElement('button');
    b.className='btn sec';
    b.style.width='100%';
    b.innerHTML=`${t.icon} ${t.name} <small style="color:var(--mut)">· ${t.region}</small>`;
    b.onclick=()=>advFastTravel(id);
    list.appendChild(b);
  }
  document.getElementById('ov-fast').classList.add('open');
}
function advFastTravel(id){
  document.getElementById('ov-fast').classList.remove('open');
  let ch=null;
  for(const [k,t] of Object.entries(RPG_TOWNS))if(t.id===id)ch=k;
  if(!ch)return;
  const [tx,ty]=RPG_TOWN_POS[ch];
  ADV.x=tx;ADV.y=ty;ADV.dir='down';ADV._onTown=true;
  advSave();
  sfx.whoosh();
  toast('🧭 Viajas a '+advPlaceById(id).name);
  advBackToMap();
}

/* botón A: hablar con el NPC de enfrente o entrar en la localidad */
const DIRV={down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]};
function rpgAction(){
  if(!ADV||ADV.inBattle)return;
  if(_dlg){dlgAdvance();return;}
  const [dx,dy]=DIRV[ADV.dir]||[0,1];
  const npc=rpgNpcAt(ADV.x+dx,ADV.y+dy)
        ||rpgNpcAt(ADV.x,ADV.y+1)||rpgNpcAt(ADV.x,ADV.y-1)
        ||rpgNpcAt(ADV.x-1,ADV.y)||rpgNpcAt(ADV.x+1,ADV.y);
  if(npc){dlgStart(npc);return;}
  const town=rpgTownAt(ADV.x,ADV.y);
  if(town)advOpenTown(town.id);
}

/* ════════════════════════════════
   DIÁLOGOS (caja clásica + máquina de escribir)
════════════════════════════════ */
let _dlg=null; /* {npc,line,typing,timer} */
function dlgStart(npc){
  /* el NPC se gira hacia ti */
  const ddx=ADV.x-npc.x, ddy=ADV.y-npc.y;
  npc.dir=Math.abs(ddx)>Math.abs(ddy)?(ddx>0?'right':'left'):(ddy>0?'down':'up');
  rpgDraw();
  _dlg={npc,line:0};
  document.getElementById('dlg-name').textContent=npc.name;
  document.getElementById('dialog-box').style.display='';
  sfx.select();
  dlgType(npc.dialog[0]);
}
function dlgType(text){
  const el=document.getElementById('dlg-text');
  el.textContent='';
  _dlg.typing=text;
  _dlg.pos=0;
  clearInterval(_dlg.timer);
  _dlg.timer=setInterval(()=>{
    if(!_dlg){return;}
    _dlg.pos++;
    el.textContent=_dlg.typing.slice(0,_dlg.pos);
    if(_dlg.pos>=_dlg.typing.length){clearInterval(_dlg.timer);_dlg.typing=null;}
  },16);
}
function dlgAdvance(){
  if(!_dlg)return;
  if(_dlg.typing){ /* completa la línea de golpe */
    clearInterval(_dlg.timer);
    document.getElementById('dlg-text').textContent=_dlg.typing;
    _dlg.typing=null;
    return;
  }
  const npc=_dlg.npc;
  _dlg.line++;
  if(_dlg.line<npc.dialog.length){
    sfx.click();
    dlgType(npc.dialog[_dlg.line]);
    return;
  }
  /* regalo de una sola vez */
  if(npc.gift&&!ADV.flags['gift-'+npc.key]){
    ADV.flags['gift-'+npc.key]=true;
    if(npc.gift.coins){
      ADV.coins+=npc.gift.coins;
      toast('🪙 +'+npc.gift.coins+' monedas de '+npc.name);
    }
    if(npc.gift.card){
      ADV.col[npc.gift.card]=(ADV.col[npc.gift.card]||0)+1;
      const c=advCardById(npc.gift.card);
      toast('🎴 '+(c?c.name:npc.gift.card)+' — regalo de '+npc.name);
    }
    advSave();
    sfx.build();
  }
  dlgEnd();
}
function dlgEnd(){
  if(_dlg)clearInterval(_dlg.timer);
  _dlg=null;
  document.getElementById('dialog-box').style.display='none';
  rpgDraw();
}

/* ════════════════════════════════
   ENCUENTROS SALVAJES
════════════════════════════════ */
const RPG_WILD={
  h_easy:[{n:'Químico Errante',lv:'easy',c:18},{n:'Becario Fugado',lv:'easy',c:15}],
  h_hard:[{n:'Alquimista Salvaje',lv:'normal',c:30},{n:'Catedrático Ermitaño',lv:'normal',c:34}],
  s:[{n:'Mutante del Páramo',lv:'normal',c:38},{n:'Carroñero Radiactivo',lv:'hard',c:55}],
  n:[{n:'Yeti Criogénico',lv:'hard',c:60},{n:'Glaciólogo Renegado',lv:'normal',c:36}],
};
function rpgWildEncounter(ch,y){
  if(advShuffledElements().length<8)return;
  const pool=ch==='s'?RPG_WILD.s:(ch==='n'?RPG_WILD.n:(y<RPG_H*0.45?RPG_WILD.h_hard:RPG_WILD.h_easy));
  const foe=pool[Math.floor(Math.random()*pool.length)];
  ADV.duelKind='wild';
  ADV.wildLevel=foe.lv;
  ADV.wildName=foe.n;
  ADV.wildCoins=foe.c;
  sfx.fire();vibe(50);
  announce('⚡ ¡DUELO SALVAJE!','#a3e635',()=>{
    ADV.inBattle=true;
    initState('Tú', foe.n);
    G.vsAI=true;
    G.adventure=true;
    G.aiLevel=foe.lv;
    G.aiAvatar='🌿';
    G.sharedDeck=ADV.battleDeck.length;
    _bootTable();
    showVersus(()=>beginTurn(0));
  },1100);
}

/* ════════════════════════════════
   COLECCIÓN
════════════════════════════════ */
function advCardById(id){
  return ELEMENTS.find(e=>e.id===id)||SPELLS.find(s=>s.id===id)||null;
}
function advColEntries(){
  return Object.entries(ADV.col).filter(([,n])=>n>0)
    .map(([id,n])=>({card:advCardById(id),n})).filter(x=>x.card);
}
function advShuffledElements(){
  const pool=[];
  for(const [id,n] of Object.entries(ADV.col)){
    const c=ELEMENTS.find(e=>e.id===id);
    if(c)for(let i=0;i<n;i++)pool.push(c);
  }
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool;
}
function advShuffledSpells(){
  const pool=[];
  for(const [id,n] of Object.entries(ADV.col)){
    const c=SPELLS.find(s=>s.id===id);
    if(c)for(let i=0;i<n;i++)pool.push(c);
  }
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool;
}

/* ════════════════════════════════
   LOCALIDADES, TIENDAS Y DUELOS
════════════════════════════════ */
function advOpenTown(id){
  ADV.duelKind='town';
  ADV.duelTown=id;
  ADV.visited=ADV.visited||{};
  if(!ADV.visited[id]){ADV.visited[id]=true;advSave();}
  const t=advPlaceById(id);
  document.getElementById('town-icon').textContent=t.icon;
  document.getElementById('town-name').textContent=t.name;
  document.getElementById('town-region').textContent=t.region;
  document.getElementById('town-desc').textContent=t.desc;
  document.getElementById('town-coins').textContent='🪙 '+ADV.coins;
  const duelBtn=document.getElementById('town-duel');
  if(t.corp){
    duelBtn.style.display='';
    const cleared=!!ADV.cleared[id];
    duelBtn.innerHTML=cleared
      ?`⚔️ Re-duelo amistoso vs ${t.corp} <small>(recompensa ½)</small>`
      :`⚔️ Duelo vs ${t.corp}${t.boss?' — JEFE FINAL':''}`;
  } else {
    duelBtn.style.display='none';
  }
  const shopBtn=document.getElementById('town-shop');
  shopBtn.textContent=
    id==='cruce'?'🛒 Mercado ambulante (−20%)':
    id==='lago' ?'🛒 Balneario de hechizos':
    id==='oasis'?'🛒 Caravana de rarezas':'🛒 Tienda de cartas';
  advMakeOffers(id);
  showScreen('town');
}

function advBackToMap(){
  showScreen('map');
  rpgInit();
}

function advPrice(card,discount){
  const isSpell=card.type==='spell'||card.type==='noble';
  const w=getWeight(card.id);
  let price=isSpell?34+(7-Math.min(7,w))*6:6+(10-w)*3;
  if(discount)price=Math.max(3,Math.round(price*discount));
  return price;
}
function advMakeOffers(id){
  const offers=[];
  const used=new Set();
  const push=c=>{if(c&&!used.has(c.id)){used.add(c.id);offers.push(c);}};
  let guard=0;
  if(id==='lago'){
    while(offers.length<4&&guard++<60)push(SPELLS[Math.floor(Math.random()*SPELLS.length)]);
  } else if(id==='oasis'){
    while(offers.length<5&&guard++<80)push(ELEMENTS[Math.floor(Math.random()*ELEMENTS.length)]);
    while(offers.length<6&&guard++<100)push(SPELLS[Math.floor(Math.random()*SPELLS.length)]);
  } else {
    const nElem=id==='cruce'?6:4;
    while(offers.length<nElem&&guard++<80)push(weightedRandom(ELEMENTS));
    while(offers.length<nElem+2&&guard++<100)push(SPELLS[Math.floor(Math.random()*SPELLS.length)]);
  }
  const discount=id==='cruce'?0.8:null;
  ADV.offers=offers.map(c=>({id:c.id,price:advPrice(c,discount)}));
}
function advOpenShop(){
  advRenderShop();
  document.getElementById('ov-shop').classList.add('open');
}
function advRenderShop(){
  document.getElementById('shop-coins').textContent='🪙 '+ADV.coins;
  const grid=document.getElementById('shop-grid');
  grid.innerHTML='';
  if(!ADV.offers.length){
    grid.innerHTML='<div class="no-mol-msg">No queda género. Vuelve más tarde.</div>';
    return;
  }
  ADV.offers.forEach((o,idx)=>{
    const card=advCardById(o.id);
    if(!card)return;
    const wrap=document.createElement('div');
    wrap.className='shop-item';
    const el=makeElemCard(card,0,false,false);
    el.onclick=null;
    addMarco(el);
    addLongPress(el,()=>showZoom(card));
    const buy=document.createElement('button');
    buy.className='btn gold sm shop-buy';
    buy.textContent='🪙 '+o.price;
    buy.onclick=()=>advBuy(idx);
    if(ADV.coins<o.price){buy.disabled=true;buy.style.opacity='.4';}
    wrap.appendChild(el);wrap.appendChild(buy);
    grid.appendChild(wrap);
  });
}
function advBuy(idx){
  const o=ADV.offers[idx];
  if(!o||ADV.coins<o.price)return;
  ADV.coins-=o.price;
  ADV.col[o.id]=(ADV.col[o.id]||0)+1;
  ADV.offers.splice(idx,1);
  advSave();
  sfx.build();
  toast('🎴 '+(advCardById(o.id).name)+' añadida a tu colección');
  advRenderShop();
  document.getElementById('town-coins').textContent='🪙 '+ADV.coins;
}

function advOpenCollection(){
  const grid=document.getElementById('col-grid');
  grid.innerHTML='';
  const entries=advColEntries().sort((a,b)=>b.n-a.n);
  document.getElementById('col-count').textContent=
    entries.reduce((s,e)=>s+e.n,0)+' cartas';
  entries.forEach(({card,n})=>{
    const wrap=document.createElement('div');
    wrap.className='shop-item';
    const el=makeElemCard(card,0,false,false);
    el.onclick=null;
    addMarco(el);
    addLongPress(el,()=>showZoom(card));
    const tag=document.createElement('div');
    tag.className='col-count-tag';
    tag.textContent='×'+n;
    wrap.appendChild(el);wrap.appendChild(tag);
    grid.appendChild(wrap);
  });
  document.getElementById('ov-collection').classList.add('open');
}

function advStartDuel(){
  const t=advPlaceById(ADV.duelTown);
  if(!t||!t.corp)return;
  if(advShuffledElements().length<8){
    toast('Necesitas al menos 8 cartas de elemento. ¡Pasa por una tienda!');
    return;
  }
  ADV.duelKind='town';
  ADV.inBattle=true;
  initState('Tú', t.corp);
  G.vsAI=true;
  G.adventure=true;
  G.aiLevel=t.level;
  G.aiAvatar=AI_LEVELS[t.level].emoji;
  G.sharedDeck=ADV.battleDeck.length;
  _bootTable();
  showVersus(()=>beginTurn(0));
}

function advBattleEnd(winner){
  ADV.inBattle=false;
  const won=winner===0;
  const title=document.getElementById('rtitle');
  const sub=document.getElementById('rsub');
  const stats=document.getElementById('rstats');
  const btns=document.getElementById('result-btns');
  title.classList.remove('lose');

  if(ADV.duelKind==='wild'){
    if(won){
      const coins=ADV.wildCoins||20;
      ADV.coins+=coins;
      let lootTxt='—';
      if(Math.random()<.5){
        const c=weightedRandom(ELEMENTS);
        ADV.col[c.id]=(ADV.col[c.id]||0)+1;
        lootTxt=c.name;
      }
      title.textContent='🏆 ¡Rival salvaje derrotado!';
      sub.textContent=`${ADV.wildName} huye entre la maleza.`;
      stats.innerHTML=`
        <div class="crow"><span>Monedas</span><span class="cv">+🪙 ${coins}</span></div>
        <div class="crow"><span>Botín</span><span class="cv">${lootTxt}</span></div>
        <div class="crow"><span>Tu bolsa</span><span class="cv">🪙 ${ADV.coins}</span></div>`;
      sfx.win();
    } else {
      const fine=Math.min(5,ADV.coins);
      ADV.coins-=fine;
      title.textContent='💀 Te han vencido';
      title.classList.add('lose');
      sub.textContent=`${ADV.wildName} te sacude el maletín${fine?` (−🪙 ${fine})`:''}.`;
      stats.innerHTML=`<div class="crow"><span>Tu bolsa</span><span class="cv">🪙 ${ADV.coins}</span></div>`;
      sfx.lose();
    }
    btns.innerHTML=`<button class="btn gold" onclick="advBackToMap()">🥾 Seguir explorando</button>`;
    advSave();
    showScreen('result');
    return;
  }

  const id=ADV.duelTown;
  const t=advPlaceById(id);
  const wasCleared=!!ADV.cleared[id];
  if(won){
    const coins=wasCleared?Math.round(t.reward/2):t.reward;
    ADV.coins+=coins;
    const lootCards=[];
    for(let k=0;k<2;k++){
      const c=(t.level!=='easy'&&Math.random()<.25)
        ?SPELLS[Math.floor(Math.random()*SPELLS.length)]
        :weightedRandom(ELEMENTS);
      ADV.col[c.id]=(ADV.col[c.id]||0)+1;
      lootCards.push(c.name);
    }
    ADV.cleared[id]=true;
    if(t.boss){
      ADV.done=true;
      title.textContent='🏆 ¡LA MOLÉCULA MAESTRA ES TUYA!';
      sub.textContent=`Has derrotado a ${t.corp} en lo alto de Helix City. Reactivia entera corea tu nombre.`;
    } else {
      title.textContent='🏆 ¡Duelo ganado!';
      sub.textContent=`${t.corp} se rinde. ${advWins()>=ADV_CAPITAL_WINS?'¡Las puertas de la capital ya están abiertas!':'Victorias para la capital: '+advWins()+'/'+ADV_CAPITAL_WINS+'.'}`;
    }
    stats.innerHTML=`
      <div class="crow"><span>Monedas ganadas</span><span class="cv">+🪙 ${coins}</span></div>
      <div class="crow"><span>Botín</span><span class="cv">${lootCards.join(' · ')}</span></div>
      <div class="crow"><span>Tu bolsa</span><span class="cv">🪙 ${ADV.coins}</span></div>`;
    btns.innerHTML=`<button class="btn gold" onclick="advBackToMap()">🗺 Continuar viaje</button>`;
    sfx.win();vibe([80,60,140]);launchConfetti();
  } else if(winner===-1){
    title.textContent='🤝 Empate técnico';
    sub.textContent='Ambos laboratorios quedan KO. La compañía no suelta el pueblo.';
    stats.innerHTML='';
    btns.innerHTML=`<button class="btn gold" onclick="advStartDuel()">⚔️ Reintentar</button>
      <button class="btn sec" onclick="advBackToMap()">🗺 Volver al país</button>`;
  } else {
    const fine=Math.min(10,ADV.coins);
    ADV.coins-=fine;
    title.textContent='💀 Derrota';
    title.classList.add('lose');
    sub.textContent=`${t.corp} te cierra el paso${fine?` y te requisa 🪙 ${fine}`:''}. Refuerza tu mazo en las tiendas del país y vuelve.`;
    stats.innerHTML=`<div class="crow"><span>Tu bolsa</span><span class="cv">🪙 ${ADV.coins}</span></div>`;
    btns.innerHTML=`<button class="btn gold" onclick="advStartDuel()">⚔️ Reintentar</button>
      <button class="btn sec" onclick="advBackToMap()">🗺 Volver al país</button>`;
    sfx.lose();
  }
  advSave();
  showScreen('result');
}
