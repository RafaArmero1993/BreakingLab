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
   - RENDER POR TILES: cada baldosa es su PROPIO sprite de celda completa
     (16×16 u) con relieve y ANIMACIÓN (agua con oleaje y espuma de orilla,
     hierba que se mece, flores, nieve); las costas y los acantilados se
     autoconectan. Las copas de bosque rellenan su celda sin solaparse.
   - OBJETOS a escala con HUELLA en celdas (árbol 2×2, casa 3×3, fuente
     3×3 con agua dinámica, capital 4×4) colocados en una REJILLA con
     control de ocupación: ninguna huella se solapa con otra. Cada
     localidad es un POBLADO (edificio principal según su estilo, casas,
     tienda, plaza adoquinada, cartel, jardines, parque con fuente,
     árboles, vallas y farolas). Todo cacheado fuera de pantalla; solo
     visual (no altera baldosas ni colisiones).
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
let _PX=3, _U=2, _sprTs=0, _frame=0, _scn=new Map(), _charC=new Map(), _tile=new Map();
function _cv(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;}
function rpgBuildSprites(){
  _PX=Math.max(2,Math.floor(_rpgTs/ART));
  _U=Math.max(2,Math.floor(_rpgTs/16));
  _sprTs=_rpgTs; _scn.clear(); _charC.clear(); _tile.clear();
}
/* bloque de "píxel de arte" del MUÑECO (escala _PX) */
function _b(ctx,x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(x*_PX),Math.round(y*_PX),Math.ceil(w*_PX),Math.ceil(h*_PX));}
/* bloque de TILES/OBJETOS (escala _U, 16 u = 1 baldosa; bordes redondeados sin costuras) */
function q(ctx,x,y,w,h,col){const x0=Math.round(x*_U),y0=Math.round(y*_U),x1=Math.round((x+w)*_U),y1=Math.round((y+h)*_U);
  ctx.fillStyle=col;ctx.fillRect(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0));}

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

/* ════════════════════════════════
   TILES DE SUELO (sprite de celda COMPLETA 16×16, con relieve y animación)
   Cada baldosa es su propio sprite; los bordes se autoconectan en el draw.
════════════════════════════════ */
const TILE_FRAMES={'~':4,'.':3,'h':3,'f':3,'n':2};
function tileFrames(ch){return TILE_FRAMES[ch]||1;}
function tileCanvas(ch,frame){
  const fr=frame%tileFrames(ch), key=ch+'|'+fr+'|'+_sprTs;
  let o=_tile.get(key); if(o)return o;
  const c=_cv(16*_U,16*_U), x=c.getContext('2d'); paintTile(x,ch,fr);
  _tile.set(key,c); return c;
}
function _dots(x,pts,w,h,col){for(const[px,py] of pts)q(x,px,py,w,h,col);}
function paintTile(x,ch,f){
  if(ch==='~'){                                   // AGUA animada (bandas que bajan + destellos)
    q(x,0,0,16,16,'#2f74c8'); q(x,0,8,16,8,'#2660b2');
    for(let r=0;r<16;r++) if(((r+f)%4)===0) q(x,0,r,16,1,'#4f8fe0');
    _dots(x,[[2,1],[8,3],[13,6],[5,10],[11,13]].map(([a,b])=>[(a+f*3)%14,b]),3,1,'#9cc6f2');
  } else if(ch==='.'||ch==='f'||ch==='p'){        // HIERBA con relieve y vaivén
    q(x,0,0,16,16,'#3f9d54');
    _dots(x,[[2,3],[9,2],[5,8],[12,9],[3,12],[10,13],[7,5],[13,3]],3,2,'#34883f');
    _dots(x,[[6,2],[12,5],[1,7],[8,11],[13,12],[4,6]],2,1,'#55b466');
    const o=f===1?1:(f===2?-1:0);
    for(const[bx,by] of [[3,12],[6,10],[9,13],[12,9],[1,14],[14,12],[7,7],[11,6]]){
      q(x,bx+o,by-3,1,3,'#2c7a3f'); q(x,bx+o,by-4,1,1,'#62c277'); }
    if(ch==='p'){q(x,0,0,16,16,'rgba(214,186,138,.55)'); for(let i=0;i<=16;i+=4){q(x,i,0,0.5,16,'rgba(120,96,60,.4)');q(x,0,i,16,0.5,'rgba(120,96,60,.4)');}}
    if(ch==='f'){const fy=f===1?0:1, C=[['#f472b6','#fbcfe8'],['#fde047','#fff7c2'],['#a78bfa','#ddd6fe']];
      for(const [i,p] of [[0,[3,5]],[1,[10,4]],[2,[6,11]],[0,[12,12]]]){
        q(x,p[0],p[1]+fy,2,2,C[i][0]); q(x,p[0],p[1]+fy-1,1,1,C[i][1]); }}
  } else if(ch==='h'){                             // HIERBA ALTA (encuentros): más oscura y alta
    q(x,0,0,16,16,'#2c7a44'); q(x,0,10,16,6,'#236437');
    const o=f===1?1:(f===2?-1:0);
    for(const[bx,by] of [[2,15],[5,14],[8,15],[11,13],[14,15],[3,12],[9,12],[13,11],[6,11]]){
      q(x,bx+o,by-6,1.4,6,'#1f5e33'); q(x,bx+o,by-7,1.4,1,'#3f9a55'); }
  } else if(ch==='s'||ch==='y'){                   // ARENA / PLAYA
    q(x,0,0,16,16, ch==='y'?'#e2cd95':'#d8bf86');
    _dots(x,[[2,3],[9,5],[5,11],[13,9],[7,2],[11,13],[3,8]],2,1,'#c7a96a');
    _dots(x,[[6,6],[12,3],[1,12],[10,9]],1,1,'#f1e1b0');
  } else if(ch==='n'){                             // NIEVE
    q(x,0,0,16,16,'#e9f1fc'); q(x,0,12,16,4,'#cfe0f2');
    _dots(x, (f?[[3,4],[11,7],[7,12]]:[[5,3],[13,9],[2,11]]),1,1,'#ffffff');
    _dots(x,[[6,6],[12,12],[2,7]],1,1,'#bcd2ea');
  } else if(ch==='r'){                             // CAMINO de tierra
    q(x,0,0,16,16,'#b39a6e'); q(x,0,0,16,2,'#c7af83'); q(x,0,14,16,2,'#8f774f');
    _dots(x,[[3,5],[9,8],[12,4],[5,11],[13,12],[2,9]],2,1,'#9c8259');
    _dots(x,[[6,3],[11,10]],1,1,'#cdb88c');
  } else if(ch==='b'){                             // PUENTE de tablones
    q(x,0,0,16,16,'#8a6a40');
    for(let r=0;r<16;r+=4)q(x,0,r,16,0.6,'#5e4528'); q(x,0,0,16,1,'#a98a58');
    _dots(x,[[1,1],[14,1],[1,8],[14,8]],1,1,'#3a2c18');
  } else if(ch==='m'){                             // ROCA (meseta); la cara se dibuja aparte
    q(x,0,0,16,16,'#6b7184'); q(x,0,0,16,3,'#838aa0');
    _dots(x,[[3,6],[9,9],[12,5],[5,12],[2,10]],3,2,'#565d70');
    _dots(x,[[7,4],[11,11],[1,13]],1,1,'#9aa1b6');
  } else if(ch==='t'){                             // COPA de bosque (se autollena, bloquea el paso)
    q(x,0,0,16,16,'#1c6638');
    for(const[cx2,cy2,r] of [[4,4,4.2],[11,5,4.2],[7,11,4.6],[13,12,3.6],[2,12,3.4],[9,15,3.2]])
      for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){ if(xx*xx+yy*yy>r*r)continue;
        const pxx=cx2+xx,pyy=cy2+yy; if(pxx<0||pxx>=16||pyy<0||pyy>=16)continue;
        const t=(xx*0.6+yy)/r; q(x,pxx,pyy,1,1, t<-.4?'#3fa15e':(t>.5?'#14512c':'#2c8a4c')); }
    _dots(x,[[3,3],[10,4],[7,10],[13,11]],1,1,'#52b56e');
  } else { q(x,0,0,16,16,'#3f9d54'); }
}

/* ════════════════════════════════
   OBJETOS (un sprite por TIPO; huella en celdas → no se solapan)
   footprint [anchoCeldas, altoCeldas]; el sprite puede ser más alto.
════════════════════════════════ */
const OBJ_FOOT={tree:[2,2],bigtree:[2,2],bush:[1,1],fountain:[3,3],sign:[1,1],lamp:[1,1],
  fence:[1,1],garden:[2,1],crate:[1,1],flowerpot:[1,1],
  house:[3,3],shop:[3,3],build:[3,3],capital:[4,4]};
function _scnGet(key,wpx,hpx,paint){
  let o=_scn.get(key); if(o)return o;
  const c=_cv(Math.round(wpx*_U),Math.round(hpx*_U)), x=c.getContext('2d');
  paint(x,wpx,hpx); o={cv:c,wpx,hpx}; _scn.set(key,o); return o;
}
/* árbol redondo (huella 2×2) con volumen */
function paintTree(x,wpx,hpx,leaf){
  const dk=shade(leaf,.6),lt=shade(leaf,1.3),tr='#6f4c2c',td='#503520', cx=wpx/2;
  q(x,cx-2,hpx-9,4,9,td); q(x,cx-2,hpx-9,2,9,tr); q(x,cx-2,hpx-3,4,1.4,'rgba(0,0,0,.25)');
  const blobs=[[cx,10,9],[cx-5,13,6],[cx+5,13,6],[cx,15,9.5],[cx,6,7]];
  for(const[bx,by,br] of blobs)for(let yy=-br;yy<=br;yy++)for(let xx=-br;xx<=br;xx++){
    if(xx*xx+yy*yy>br*br)continue; const px=bx+xx,py=by+yy; if(px<1||px>=wpx-1||py<0||py>hpx-8)continue;
    const t=(xx*0.7+yy)/br; q(x,px,py,1,1, t<-.45?lt:(t>.5?dk:leaf)); }
  for(const[i,p] of [[0,[6,6]],[1,[14,9]],[0,[10,14]],[1,[5,12]],[0,[18,12]]]) q(x,p[0],p[1],1.4,1.4, i?dk:lt);
}
function paintBush(x,wpx,hpx){const g='#2f9050',d='#1f6e3c',l='#52b56e';
  for(let yy=0;yy<hpx;yy++){const w=wpx*(0.45+0.55*Math.sin((yy/hpx)*Math.PI)); q(x,(wpx-w)/2,yy,w,1, yy<3?l:(yy>hpx-3?d:g));}
  q(x,wpx*0.3,hpx*0.3,1.2,1.2,l); q(x,wpx*0.62,hpx*0.5,1,1,d);}
/* FUENTE 3×3 con AGUA DINÁMICA (4 frames) */
function paintFountain(x,wpx,hpx,f){
  const st='#9aa1b3', sd='#6c7488', sl='#c2c8d6', cx=wpx/2, by=hpx-2;
  q(x,2,by-7,wpx-4,8,sd); q(x,2,by-8,wpx-4,2,st); q(x,2,by-8,wpx-4,0.8,sl);     // pilón exterior
  q(x,4,by-6.5,wpx-8,5.5,'#2f7fd6'); q(x,4,by-6.5,wpx-8,1,'#1f64ad');            // agua del pilón
  for(let i=0;i<5;i++){const r=((f+i)%5)*1.6; q(x,cx-r,by-4,r*2,0.8,'rgba(180,222,255,.5)');} // ondas
  q(x,cx-2.5,by-15,5,9,sd); q(x,cx-2.5,by-15,5,1,sl); q(x,cx-1.5,by-14,3,8,st);  // columna
  q(x,cx-3.5,by-18,7,3.5,st); q(x,cx-3.5,by-18,7,1,sl); q(x,cx-3.5,by-15,7,1,sd);// taza superior
  for(const[hx,ph] of [[cx-3.2,f%2?1:0],[cx+2.2,f%2?0:1]])
    for(let k=0;k<6;k++) q(x,hx+k*0.15,by-13+k*1.8+ph,0.9,1.2,'#bfe2ff');        // chorros
  q(x,cx-0.8,by-22,1.6,4,'#7fd0ff');                                             // surtidor
}
function paintSign(x,wpx,hpx){const w='#b58a52',wd='#7a5a32',wl='#cda671';
  q(x,wpx/2-0.8,7,1.6,hpx-7,wd);
  q(x,1,2,wpx-2,6,w); q(x,1,2,wpx-2,1,wl); q(x,1,7,wpx-2,1,wd);
  for(let r=0;r<3;r++)q(x,2.2,3+r*1.3,wpx-4.4,0.7,'#4a3320');}
function paintLamp(x,wpx,hpx){const m='#39414f',ml='#525b6c';
  q(x,wpx/2-0.7,4,1.4,hpx-4,m); q(x,wpx/2-0.7,4,0.6,hpx-4,ml);
  q(x,wpx/2-2,1,4,4,m); q(x,wpx/2-1.4,1.6,2.8,2.8,'#ffe9a8'); q(x,wpx/2-1,2,2,2,'#fff6d8');}
function paintFence(x,wpx,hpx){const w='#a78a5c',wd='#71623f';
  q(x,0,hpx*0.35,wpx,1.6,w); q(x,0,hpx*0.68,wpx,1.6,w);
  for(const px of [1,wpx*0.5-0.8,wpx-2.6]){q(x,px,1,1.6,hpx-1,w);q(x,px,1,0.6,hpx-1,wd);}}
function paintGarden(x,wpx,hpx,c1,c2){q(x,0.5,hpx*0.35,wpx-1,hpx*0.65,'#5a3f28');q(x,0.5,hpx*0.35,wpx-1,1,'#6e4f34');
  const C=[c1,c2,'#fde047']; for(let i=0;i<6;i++){const px=1.4+(i*2.3)%(wpx-3),py=0.5+(i%2)*2.2;
    q(x,px,py,1.8,1.8,C[i%3]); q(x,px+0.5,py+0.5,0.7,0.7,'#fffbe6');}}
function paintCrate(x,wpx,hpx){const w='#ac8450',wd='#7a5d34',wl='#c79c63';
  q(x,1,1,wpx-2,hpx-2,w); q(x,1,1,wpx-2,1,wl); q(x,1,hpx-2,wpx-2,1,wd);
  q(x,wpx/2-0.5,1,1,hpx-2,wd); q(x,1,hpx/2-0.5,wpx-2,1,wd);}
function paintPot(x,wpx,hpx){q(x,wpx*0.25,hpx*0.5,wpx*0.5,hpx*0.5,'#a9603a');q(x,wpx*0.22,hpx*0.45,wpx*0.56,1.2,'#c2724a');
  q(x,wpx*0.3,hpx*0.18,wpx*0.4,hpx*0.34,'#2f9050'); q(x,wpx*0.42,hpx*0.1,1.6,1.6,'#f472b6');}
/* EDIFICIO con relieve (cuerpo + tejado a dos aguas/azotea, puerta, ventanas, chimeneas) */
function paintBuilding(x,wpx,hpx,o){
  const wall=o.wall,wd=shade(wall,.8),wl=shade(wall,1.13),roof=o.roof,rd=shade(roof,.74),rl=shade(roof,1.16);
  const roofH=o.flat?Math.round(hpx*0.22):Math.round(hpx*0.4), bY=roofH, bH=hpx-roofH;
  q(x,1,bY,wpx-2,bH,wall); q(x,1,bY,2,bH,wl); q(x,wpx-3,bY,2,bH,wd); q(x,1,hpx-2,wpx-2,2,wd);
  for(let r=bY+3;r<hpx-2;r+=3)q(x,2,r,wpx-4,0.5,'rgba(0,0,0,.10)');
  if(o.flat){ q(x,0.5,roofH-3,wpx-1,3.4,roof); q(x,0.5,roofH-3,wpx-1,1,rl);
    for(let i=1;i<wpx-1;i+=3)q(x,i,roofH-5,1.6,2,roof);
  } else { for(let r=0;r<roofH;r++){const w=wpx*((r+1)/roofH); q(x,(wpx-w)/2,r,w,1, r<roofH*0.4?rl:(r>roofH*0.8?rd:roof));}
    q(x,1,roofH-1.4,wpx-2,1.4,rd); q(x,wpx/2-0.7,0.3,1.4,2,rd); }
  const dw=Math.max(3,wpx*0.2),dh=Math.max(5,bH*0.55),dx=wpx/2-dw/2,dy=hpx-dh;
  q(x,dx-0.6,dy-0.6,dw+1.2,dh+0.6,wd); q(x,dx,dy,dw,dh,'#3a2718'); q(x,dx+0.6,dy+0.7,dw-1.2,dh-0.8,o.door||'#6f4a2c');
  q(x,dx+dw*0.62,dy+dh*0.45,0.7,1,'#f4d27a');
  const wy=bY+2.4, ww=Math.max(2.4,wpx*0.16);
  for(const wx of [wpx*0.16, wpx*0.84-ww]){ q(x,wx-0.7,wy-0.7,ww+1.4,ww+1.4,wd); q(x,wx,wy,ww,ww,'#2a3550');
    q(x,wx,wy,ww,ww,o.accent||'#ffe08a'); q(x,wx+ww/2-0.3,wy,0.6,ww,wd); q(x,wx,wy+ww/2-0.3,ww,0.6,wd);
    q(x,wx,wy,ww*0.5,ww*0.5,shade(o.accent||'#ffe08a',1.25)); }
  if(o.chimney)for(const cxp of (o.chimney===2?[wpx*0.26,wpx*0.6]:[wpx*0.64])){
    q(x,cxp,roofH-roofH*0.5,2.4,roofH*0.9,wd); q(x,cxp-0.4,roofH-roofH*0.5,3.2,1.2,shade(wall,.55));}
  if(o.awning)for(let i=0;i<wpx-3;i++)q(x,1.5+i,bY+bH*0.46,1,2,i%2?'#e23b3b':'#f6f0e4');
}
const BUILD_STYLES={
  lab:    {wall:'#e0e7f3',roof:'#5b6bb0',accent:'#7fe7ff',chimney:1},
  factory:{wall:'#9aa1ad',roof:'#6b5040',accent:'#ffcf6a',chimney:2},
  port:   {wall:'#cdd6dd',roof:'#c23b3b',accent:'#bff0ff',chimney:1},
  salt:   {wall:'#eef2f7',roof:'#9fb6c9',accent:'#dff3ff'},
  mine:   {wall:'#b8a07e',roof:'#5a4632',accent:'#ffcf6a',chimney:1},
  spa:    {wall:'#e7d2e6',roof:'#7a4f86',accent:'#ffd6f0'},
  desert: {wall:'#e3c98f',roof:'#c08a3e',accent:'#ffe7a8',flat:true},
  market: {wall:'#d8b27a',roof:'#3f8f6a',accent:'#ffe7a8',awning:true},
  capital:{wall:'#d7def0',roof:'#6a5ba8',accent:'#a7f3ff',flat:true,chimney:2},
};
const TREE_LEAVES=['#37a25a','#2f9e6e','#46a83e','#2b8f52'];
/* devuelve {cv,wpx,hpx} del objeto (con frame para los animados) */
function objSprite(type,opt,frame){
  opt=opt||{};
  if(type==='tree')   return _scnGet('tree'+(opt.v||0),32,46,(x,w,h)=>paintTree(x,w,h,TREE_LEAVES[(opt.v||0)%4]));
  if(type==='bigtree')return _scnGet('btree'+(opt.v||0),34,52,(x,w,h)=>paintTree(x,w,h,TREE_LEAVES[(opt.v||0)%4]));
  if(type==='bush')   return _scnGet('bush',16,15,paintBush);
  if(type==='fountain')return _scnGet('foun'+(frame%4),48,42,(x,w,h)=>paintFountain(x,w,h,frame%4));
  if(type==='sign')   return _scnGet('sign',16,26,paintSign);
  if(type==='lamp')   return _scnGet('lamp',16,30,paintLamp);
  if(type==='fence')  return _scnGet('fence',16,14,paintFence);
  if(type==='garden') return _scnGet('grd'+((opt.cols||['#f472b6'])[0]),32,15,(x,w,h)=>paintGarden(x,w,h,(opt.cols||['#f472b6','#a78bfa'])[0],(opt.cols||['#f472b6','#a78bfa'])[1]));
  if(type==='crate')  return _scnGet('crate',16,16,paintCrate);
  if(type==='flowerpot')return _scnGet('pot',16,16,paintPot);
  if(type==='capital')return _scnGet('bld:capital',64,84,(x,w,h)=>paintBuilding(x,w,h,BUILD_STYLES.capital));
  if(type==='shop')   return _scnGet('shop',48,58,(x,w,h)=>paintBuilding(x,w,h,{...BUILD_STYLES.market,awning:true}));
  if(type==='house'){const P=[['#d9b48a','#b0413c'],['#cbb89a','#3f6aa0'],['#d7c39a','#4a8f5f'],['#c9a37a','#8a5a86']][(opt.v||0)%4];
    return _scnGet('house'+(opt.v||0),48,58,(x,w,h)=>paintBuilding(x,w,h,{wall:P[0],roof:P[1],accent:'#ffe08a'}));}
  const style=opt.style||'lab';
  return _scnGet('bld:'+style,48,60,(x,w,h)=>paintBuilding(x,w,h,BUILD_STYLES[style]||BUILD_STYLES.lab));
}

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
/* Coloca los props en una REJILLA con control de ocupación: ninguna huella
   se solapa con otra. Cada prop = {type,x0,y0,w,h,...opt} en celdas absolutas;
   (x0,y0)=esquina sup-izq de la huella. La baldosa-letra (tx,ty) es la PUERTA. */
function villageProps(townChar){
  if(_villages[townChar])return _villages[townChar];
  const t=RPG_TOWNS[townChar]; const [tx,ty]=RPG_TOWN_POS[townChar];
  let s=(tx*131+ty*977+7)>>>0; const rnd=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
  const isCap=t.id==='helix';
  const P=[], occ=new Set();
  const free=(x0,y0,w,h)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(occ.has(x+','+y))return false;return true;};
  const mark=(x0,y0,w,h)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)occ.add(x+','+y);};
  const put=(type,rx,ry,opt)=>{const[w,h]=OBJ_FOOT[type]||[1,1], x0=tx+rx, y0=ty+ry;
    if(!free(x0,y0,w,h))return false; mark(x0,y0,w,h); P.push({type,x0,y0,w,h,...(opt||{})}); return true;};
  const putAny=(type,cands,opt)=>{for(const[rx,ry] of cands)if(put(type,rx,ry,opt))return true;return false;};
  /* edificio principal: puerta (centro-abajo) sobre la baldosa-letra */
  if(isCap) put('capital',-2,-3,{town:t,main:true});
  else      put('build',-1,-2,{town:t,main:true,style:TOWN_STYLE[t.id]||'lab'});
  /* casas y tienda */
  put('house',-5,-2,{v:(s>>>1)%4}); put('house',3,-2,{v:(s>>>3)%4});
  put('house',-5,2,{v:(s>>>5)%4});  put('shop',3,2,{});
  /* parque con fuente (capital, balneario, salinas) */
  if(isCap||t.id==='lago'||t.id==='salinas') put('fountain',-1,2,{});
  /* cartel, farolas */
  putAny('sign',[[1,3],[-2,3],[2,4],[-3,4]]);
  put('lamp',-2,1); put('lamp',2,1);
  /* jardines y vallas (a los lados, sin pisar el centro) */
  putAny('garden',[[-5,5],[-3,5],[-6,4]],{cols:GARDEN_COLS[(s>>>7)%4]});
  putAny('garden',[[3,5],[2,5],[4,4]],{cols:GARDEN_COLS[(s>>>9)%4]});
  putAny('fence',[[-2,4],[-3,4]]); putAny('fence',[[2,4],[3,4]]);
  /* arbolitos en las esquinas del poblado */
  put('tree',-7,-1,{v:(s>>>2)%4}); put('tree',6,-1,{v:(s>>>4)%4});
  put('tree',-7,3,{v:(s>>>6)%4});  put('tree',6,3,{v:(s>>>8)%4});
  /* matojos en huecos libres */
  for(const[rx,ry] of [[-3,1],[3,1],[-1,4],[1,5],[-4,0],[5,1]]) if(P.length<26) put('bush',rx,ry);
  /* cajas en puertos y mercados */
  if(t.id==='puerto'||t.id==='cruce'||t.id==='oasis'){putAny('crate',[[-4,1],[-4,0]]); putAny('crate',[[5,2],[6,1]]);}
  _villages[townChar]=P; return P;
}
/* conjunto de centros de localidad (para pavimentar la plaza) */
const TOWN_CENTERS=Object.values(RPG_TOWN_POS);
function nearTown(x,y){for(const[cx,cy] of TOWN_CENTERS)if(Math.abs(x-cx)<=3&&Math.abs(y-cy)<=3)return true;return false;}

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
  let _wt=0;
  _ticker=setInterval(()=>{
    if(!rpgActive()||ADV&&ADV.inBattle)return;
    _frame++;                                       // reloj de animación (agua, hierba, fuente)
    if((_wt=(_wt+1)%3)===0 && !_dlg) rpgNpcWander(); // deambular ~cada 3 frames
    if(!_anim)rpgDraw();
  },150);
  rpgDraw();
}

/* colores base del suelo (los usa el minimapa) */
const RPG_COLORS={
  '~':'#2f74c8', '.':'#3f9d54', 'h':'#2c7a44', 's':'#d8bf86',
  'r':'#b39a6e', 'm':'#6b7184', 't':'#1c6638', 'b':'#8a6a40',
  'y':'#e2cd95', 'f':'#3f9d54', 'n':'#e9f1fc',
};
/* TILE de suelo a pintar en (x,y): plaza pavimentada junto a los pueblos */
function groundType(x,y){const ch=rpgTile(x,y);
  if(RPG_TOWNS[ch])return 'p';
  if(ch==='.'&&nearTown(x,y))return 'p';
  return ch;}
/* bordes AUTOCONECTADOS: espuma en la costa y cara de acantilado en la roca */
function drawEdges(ctx,x,y,gch,dx,dy,dw,dh,F){
  if(rpgTile(x,y)==='~'){
    ctx.fillStyle=(F&1)?'rgba(222,240,255,.7)':'rgba(198,228,255,.5)';
    if(rpgTile(x,y-1)!=='~')ctx.fillRect(dx,dy,dw,Math.max(1,dh*0.16));
    if(rpgTile(x,y+1)!=='~')ctx.fillRect(dx,dy+dh*0.84,dw,Math.max(1,dh*0.16));
    if(rpgTile(x-1,y)!=='~')ctx.fillRect(dx,dy,Math.max(1,dw*0.16),dh);
    if(rpgTile(x+1,y)!=='~')ctx.fillRect(dx+dw*0.84,dy,Math.max(1,dw*0.16),dh);
  } else if(gch==='m'){
    if(rpgTile(x,y-1)!=='m'){ctx.fillStyle='#9aa1b6';ctx.fillRect(dx,dy,dw,Math.max(1,dh*0.14));}
    if(rpgTile(x,y+1)!=='m'){                              // cara del risco
      ctx.fillStyle='#4a4f60';ctx.fillRect(dx,dy+dh*0.5,dw,dh*0.5);
      ctx.fillStyle='#3a3f4e';ctx.fillRect(dx,dy+dh*0.82,dw,dh*0.18);
      ctx.fillStyle='#5a6072';ctx.fillRect(dx+dw*0.3,dy+dh*0.55,Math.max(1,dw*0.08),dh*0.4);
      ctx.fillRect(dx+dw*0.62,dy+dh*0.58,Math.max(1,dw*0.08),dh*0.34);
    }
  }
}

/* sombra suave bajo un objeto */
function _shadow(ctx,cx,by,w){
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath();ctx.ellipse(cx,by-w*.05,w*.5,w*.2,0,0,7);ctx.fill();
}
function rpgDraw(){
  if(!_rpgCtx||!ADV)return;
  if(_sprTs!==_rpgTs)rpgBuildSprites();
  const ctx=_rpgCtx, ts=_rpgTs, F=_frame;
  let px=ADV.x, py=ADV.y;
  if(_anim){
    const k=Math.min(1,(Date.now()-_anim.t0)/_anim.dur);
    px=_anim.fx+(_anim.tx-_anim.fx)*k; py=_anim.fy+(_anim.ty-_anim.fy)*k;
  }
  const half=(RPG_VIEW-1)/2;
  const camX=Math.max(0,Math.min(px-half,RPG_W-RPG_VIEW));
  const camY=Math.max(0,Math.min(py-half,RPG_H-RPG_VIEW));
  ctx.clearRect(0,0,_rpgCv.width,_rpgCv.height);
  ctx.imageSmoothingEnabled=false;
  const x0=Math.floor(camX),y0=Math.floor(camY);
  const sxAt=x=>Math.round((x-camX)*ts), syAt=y=>Math.round((y-camY)*ts);

  /* ── CAPA 1: SUELO — un sprite por celda, bordes sin costura ── */
  for(let vy=-1;vy<=RPG_VIEW+1;vy++)for(let vx=-1;vx<=RPG_VIEW+1;vx++){
    const x=x0+vx,y=y0+vy, gch=groundType(x,y);
    const dx=sxAt(x),dy=syAt(y),dw=sxAt(x+1)-dx,dh=syAt(y+1)-dy;
    const tc=tileCanvas(gch,F);
    ctx.drawImage(tc,0,0,tc.width,tc.height,dx,dy,dw,dh);
    drawEdges(ctx,x,y,gch,dx,dy,dw,dh,F);
  }

  /* ── CAPA 2: OBJETOS — huella en celdas, ordenados por fila base ── */
  const objs=[];
  for(let vy=-6;vy<=RPG_VIEW+2;vy++)for(let vx=-4;vx<=RPG_VIEW+4;vx++){
    const x=x0+vx,y=y0+vy; if(x<0||y<0||x>=RPG_W||y>=RPG_H)continue;
    const ch=rpgTile(x,y), n=(x*2654435761 ^ y*40503)>>>0;
    if(RPG_TOWNS[ch]){
      for(const p of villageProps(ch)) objs.push({t:'scn',p, r:p.y0+p.h-1});
    } else if(ch==='.'&&!nearTown(x,y)&&(n%47===0)){     // matojo suelto (1×1, no se solapa)
      objs.push({t:'scn',p:{type:'bush',x0:x,y0:y,w:1,h:1}, r:y});
    }
  }
  for(const npc of _npcs){
    if(npc.x<x0-2||npc.x>x0+RPG_VIEW+2||npc.y<y0-2||npc.y>y0+RPG_VIEW+2)continue;
    objs.push({t:'char',npc, r:npc.y});
  }
  objs.push({t:'char',player:true,px,py, r:py});

  objs.sort((a,b)=> (a.r-b.r) || ((a.t==='char'?1:0)-(b.t==='char'?1:0)) );
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const o of objs){
    if(o.t==='char'){
      const tx=o.player?o.px:o.npc.x, tyy=o.player?o.py:o.npc.y;
      const dir=o.player?ADV.dir:o.npc.dir, fr=o.player?_walkFrame:0;
      const palK=o.player?'player':o.npc.pal, pal=o.player?PAL_PLAYER:(NPC_PALS[o.npc.pal]||PAL_PLAYER);
      const cx=sxAt(tx)+(sxAt(tx+1)-sxAt(tx))/2, by=syAt(tyy+1);
      const c=charCanvas(palK,pal,dir,fr);
      _shadow(ctx,cx,by,c.width*0.95);
      if(o.player){ctx.save();ctx.shadowColor='rgba(34,211,238,.5)';ctx.shadowBlur=ts*.2;}
      ctx.drawImage(c,Math.round(cx-c.width/2),Math.round(by-c.height));
      if(o.player)ctx.restore();
    } else {
      const p=o.p, spr=objSprite(p.type,p,F);
      const x0p=sxAt(p.x0), wpx=sxAt(p.x0+p.w)-x0p, by=syAt(p.y0+p.h);
      const hpx=wpx*(spr.hpx/spr.wpx);
      if(p.type!=='garden'&&p.type!=='fence') _shadow(ctx,x0p+wpx/2,by,wpx*0.9);
      ctx.drawImage(spr.cv,0,0,spr.cv.width,spr.cv.height, x0p, by-hpx, wpx, hpx);
      if(p.main&&p.town){                          // estado del pueblo sobre el edificio principal
        const cx=x0p+wpx/2, top=by-hpx-ts*0.12, tn=p.town;
        const locked=tn.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[tn.id];
        ctx.font=(ts*.55)+'px serif';
        if(locked)ctx.fillText('🔒',cx,top); else if(ADV.cleared[tn.id])ctx.fillText('✅',cx,top);
        ctx.font='700 '+(ts*.32)+'px Exo 2,sans-serif';
        const nm=tn.name, tw=ctx.measureText(nm).width;
        ctx.fillStyle='rgba(8,12,30,.8)'; ctx.fillRect(cx-tw/2-4,top-ts*.58,tw+8,ts*.4);
        ctx.fillStyle='#eef2ff'; ctx.fillText(nm,cx,top-ts*.38);
      }
    }
  }

  /* HUD */
  const coins=document.getElementById('map-coins'); if(coins)coins.textContent='🪙 '+ADV.coins;
  const wins=document.getElementById('map-wins'); if(wins)wins.textContent='🏅 '+advWins()+' / '+ADV_CAPITAL_WINS;
  const loc=document.getElementById('map-loc'); if(loc)loc.textContent='📍 '+rpgRegionAt(ADV.x,ADV.y);
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
