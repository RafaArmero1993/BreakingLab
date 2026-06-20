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
   - OBJETOS como TILES 1×1 (estilo 16-bit, finales 90 / principios 2000):
     árbol, arbusto, roca, cartel, farola, valla, jardín, caja y flores
     ocupan UNA celda; la fuente se compone con 3×3 tiles (agua animada).
     Los EDIFICIOS se MONTAN con piezas (tejado/pared/puerta/ventana), así
     que el pueblo se dibuja como un tilemap clásico, sin sprites grandes
     pegados ni solapes. Cada localidad es un POBLADO (edificio principal
     según su estilo, casas, plaza adoquinada, cartel, jardines, fuente,
     árboles, vallas y farolas). Solo visual (no altera baldosas/colisiones).
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

const PAL_PLAYER=mkPal({skin:'#f6cda2',hair:'#6b4a2c',coat:'#f1f4fb',shirt:'#26c6d6',pants:'#3a4470',boot:'#272036',accent:'#26c6d6'});
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

/* MUÑECO chibi dibujado por bloques (14×20 art); el contorno se añade
   automáticamente en charCanvas. 'right' = 'left' espejado (FL). */
function drawCharFills(g,pal,dir,fr){
  const H=pal.H,Hs=pal.h,Hl=shade(pal.H,1.25),F=pal.F,Fs=pal.f,C=pal.C,Cs=pal.c,Cl=shade(pal.C,1.08),
        S=pal.S,Ss=pal.s,P=pal.P,Ps=pal.p,B=pal.B||'#241a30';
  const E='#243049',Wt='#ffffff',blush='#ec9c98';
  const FL=dir==='right', prof=FL||dir==='left', up=dir==='up', down=dir==='down';
  const b=(ax,ay,w,h,c)=>{g.fillStyle=c; g.fillRect((FL?14-ax-w:ax)+1, ay+1, w, h);};
  const st=fr&1;
  /* piernas + botas (con animación de paso) */
  if(prof){ const a=st?1:0,k=st?0:1;
    b(7,16,3,2+k,P); b(7,16,1,2,Ps); b(7,18+k,3,1,B);
    b(4,16,3,2+a,P); b(4,16,1,2,Ps); b(4,18+a,3,1,B);
  }else{ const dl=st?1:0,dr=st?0:1;
    b(4,15,2,3+dl,P); b(4,15,1,3,Ps); b(4,18+dl,2,1,B);
    b(8,15,2,3+dr,P); b(8,15,1,3,Ps); b(8,18+dr,2,1,B); }
  /* cuerpo (bata de laboratorio) */
  if(prof){
    b(4,9,6,7,C); b(4,9,1,7,Cs); b(9,9,1,7,Cs); b(5,9,1,7,Cl); b(4,15,6,1,Cs);
    b(5,9,2,2,S);
    const sw=st?1:0; b(4,10+sw,2,4,C); b(4,10+sw,1,4,Cs); b(4,13+sw,2,1,F);   // brazo+mano
  }else{
    b(3,9,8,7,C); b(3,9,1,7,Cs); b(10,9,1,7,Cs); b(3,9,1,1,Cl); b(3,15,8,1,Cs);
    if(down){ b(6,9,2,3,S); b(6,9,2,1,Ss); } else { b(4,9,6,1,Cs); }
    b(2,9,1,5,C); b(2,9,1,5,Cs); b(11,9,1,5,C); b(11,9,1,5,Cs);               // brazos
    b(2,12+(st?1:0),1,1,F); b(11,12+(st?0:1),1,1,F);                          // manos (alternan)
  }
  /* cabeza */
  if(down){
    b(3,0,8,2,H); b(2,1,10,2,H); b(2,3,2,4,H); b(10,3,2,4,H); b(3,3,8,1,H);
    b(3,0,6,1,Hl); b(3,2,2,1,Hs); b(9,2,2,1,Hs);
    b(4,3,6,6,F); b(3,4,1,3,F); b(10,4,1,3,F); b(4,9,6,1,Fs);
    b(4,4,2,2,E); b(8,4,2,2,E); b(4,4,1,1,Wt); b(8,4,1,1,Wt);
    b(3,6,1,1,blush); b(10,6,1,1,blush); b(6,7,2,1,Fs);
  }else if(up){
    b(3,0,8,2,H); b(2,1,10,2,H); b(2,3,2,5,H); b(10,3,2,5,H); b(3,3,8,5,H);
    b(3,0,6,1,Hl); b(3,7,8,1,Hs);
  }else{
    b(3,0,8,2,H); b(2,1,8,2,H); b(7,3,4,5,H); b(2,3,2,1,H);
    b(3,0,5,1,Hl);
    b(3,3,5,5,F); b(2,4,1,3,F); b(3,8,4,1,Fs);
    b(3,4,2,2,E); b(3,4,1,1,Wt); b(3,6,1,1,blush); b(3,7,2,1,Fs);
  }
}

/* ════════════════════════════════
   CACHÉ DE SPRITES (lienzos fuera de pantalla al tamaño de baldosa)
════════════════════════════════ */
let _PX=3, _U=2, _sprTs=0, _frame=0, _scn=new Map(), _charC=new Map(), _tile=new Map(), _obj=new Map();
function _cv(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;}
function rpgBuildSprites(){
  _PX=Math.max(2,Math.floor(_rpgTs/ART));
  _U=Math.max(2,Math.floor(_rpgTs/16));
  _sprTs=_rpgTs; _scn.clear(); _charC.clear(); _tile.clear(); _obj.clear();
}
/* bloque de "píxel de arte" del MUÑECO (escala _PX) */
function _b(ctx,x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(x*_PX),Math.round(y*_PX),Math.ceil(w*_PX),Math.ceil(h*_PX));}
/* bloque de TILES/OBJETOS (escala _U, 16 u = 1 baldosa; bordes redondeados sin costuras) */
function q(ctx,x,y,w,h,col){const x0=Math.round(x*_U),y0=Math.round(y*_U),x1=Math.round((x+w)*_U),y1=Math.round((y+h)*_U);
  ctx.fillStyle=col;ctx.fillRect(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0));}

/* —— MUÑECO —— */
function charCanvas(palKey,pal,dir,frame){
  const key=palKey+'|'+dir+'|'+(frame&1)+'|'+_sprTs;
  let c=_charC.get(key); if(c)return c;
  const MW=16,MH=22;                                   // 14×20 art + 1px de margen para el contorno
  const tiny=_cv(MW,MH), g=tiny.getContext('2d');
  drawCharFills(g,pal,dir,frame);
  /* contorno automático: cada píxel transparente pegado a uno opaco → color O */
  const img=g.getImageData(0,0,MW,MH), d=img.data, O=_hex(pal.O);
  const A=(x,y)=> x>=0&&y>=0&&x<MW&&y<MH&&d[(y*MW+x)*4+3]>0;
  const out=[];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){ if(d[(y*MW+x)*4+3]>0)continue;
    if(A(x-1,y)||A(x+1,y)||A(x,y-1)||A(x,y+1)) out.push((y*MW+x)*4); }
  for(const i of out){ d[i]=O[0]; d[i+1]=O[1]; d[i+2]=O[2]; d[i+3]=255; }
  g.putImageData(img,0,0);
  /* escalado nítido a tamaño de pantalla */
  c=_cv(MW*_U,MH*_U); const f=c.getContext('2d'); f.imageSmoothingEnabled=false;
  f.drawImage(tiny,0,0,MW,MH,0,0,MW*_U,MH*_U);
  _charC.set(key,c); return c;
}

/* ════════════════════════════════
   TILES DE SUELO (sprite de celda COMPLETA 16×16, con relieve y animación)
   Cada baldosa es su propio sprite; los bordes se autoconectan en el draw.
════════════════════════════════ */
const TILE_FRAMES={'~':4,'.':3,'h':3,'f':3,'n':2};
function tileFrames(ch){return TILE_FRAMES[ch]||1;}
function tileCanvas(ch,frame,v){
  const fr=frame%tileFrames(ch), key=ch+'|'+fr+'|'+(v||0)+'|'+_sprTs;
  let o=_tile.get(key); if(o)return o;
  const c=_cv(16*_U,16*_U), x=c.getContext('2d'); paintTile(x,ch,fr,v||0);
  _tile.set(key,c); return c;
}
function _dots(x,pts,w,h,col){for(const[px,py] of pts)q(x,px,py,w,h,col);}
/* variantes de hierba para que el campo no se repita */
const G_BLADE=[
 [[2,8],[5,12],[9,9],[12,13],[7,6],[14,11],[4,14],[11,6]],
 [[3,10],[6,7],[10,13],[13,9],[1,13],[8,14],[11,5],[5,5]],
 [[2,13],[6,10],[9,14],[12,7],[4,6],[14,13],[8,9],[10,11]]];
const G_SPECK=[[[3,4],[10,3],[13,11],[6,13],[8,8]],[[5,5],[12,8],[2,10],[9,4],[7,12]],[[4,11],[11,12],[7,3],[14,6],[2,7]]];
function grassBase(x){ q(x,0,0,16,16,'#48a64c');
  for(const[px,py,w,h] of [[1,2,5,3],[8,1,6,4],[3,8,6,5],[10,9,5,5],[0,12,5,4],[12,4,4,4]]) q(x,px,py,w,h,'#4dac51'); // parches claros
  for(const[px,py,w,h] of [[5,5,3,2],[11,3,3,3],[6,11,4,3],[1,9,2,2]]) q(x,px,py,w,h,'#42974a'); // parches oscuros
  q(x,0,0,16,1,'#55b358'); }
function paintTile(x,ch,f,v){
  v=v%3;
  if(ch==='~'){                                   // AGUA: degradado + cáusticas animadas + destellos
    q(x,0,0,16,16,'#3a86d6'); q(x,0,6,16,10,'#2f6fbe'); q(x,0,11,16,5,'#27619f');
    for(let r=0;r<16;r++) if(((r+f)%4)===0) q(x,0,r,16,1,'#5b9fe6');
    for(let r=2;r<16;r+=4) q(x,((f*3)%6),r,5,0.8,'#7fb7ee');
    _dots(x,[[3,2],[10,5],[6,11],[13,8],[8,14]].map(([a,b])=>[(a+f*2)%14,b]),2,1,'#bcdcf7');
  } else if(ch==='.'||ch==='f'){                  // HIERBA frondosa (variantes + vaivén)
    grassBase(x);
    const sway=f===1?0.6:(f===2?-0.6:0);
    _dots(x,G_SPECK[v],1,1,'#63c267'); _dots(x,G_SPECK[(v+1)%3],1,1,'#3f9646');
    for(const[bx,by] of G_BLADE[v]){ q(x,bx+sway,by-3,1,3,'#2f8a3c'); q(x,bx+sway,by-4,1,1,'#74d06d'); }
    if(v===1){ q(x,4,6,1.6,1.6,'#fff4c2'); q(x,4.4,6.4,0.8,0.8,'#ffd23b'); q(x,11,10,1.6,1.6,'#ffffff'); q(x,11.4,10.4,0.8,0.8,'#ffd23b'); }
    if(ch==='f'){const fy=f===1?0:1, C=[['#f472b6','#fff0f8'],['#fde047','#fffae0'],['#a78bfa','#efeaff'],['#fb7185','#fff0f2']];
      for(const [i,p] of [[0,[3,5]],[1,[10,4]],[2,[6,11]],[3,[12,12]]]){
        q(x,p[0],p[1]+fy,2.4,2.4,C[i][0]); q(x,p[0]+0.6,p[1]+fy+0.6,1,1,C[i][1]); q(x,p[0]+0.8,p[1]+fy+2.4,0.6,2,'#2f8a3c'); }}
  } else if(ch==='p'){                            // PLAZA adoquinada
    q(x,0,0,16,16,'#b7a987');
    const st='#cabe9c',stl='#e0d5b3',std='#988a68';
    for(const[sx,sy] of [[0.6,0.6],[8.4,0.6],[0.6,8.4],[8.4,8.4]]){
      q(x,sx,sy,6.6,6.6,st); q(x,sx,sy,6.6,1,stl); q(x,sx,sy,1,6.6,stl);
      q(x,sx+5.6,sy,1,6.6,std); q(x,sx,sy+5.6,6.6,1,std); }
  } else if(ch==='h'){                             // HIERBA ALTA (encuentros)
    grassBase(x); q(x,0,9,16,7,'#2f7a40');
    const o=f===1?0.7:(f===2?-0.7:0);
    for(const[bx,by] of [[2,16],[5,15],[8,16],[11,14],[14,16],[3,13],[9,13],[13,12],[6,12]]){
      q(x,bx+o,by-7,1.5,7,'#236b38'); q(x,bx+o,by-8,1.5,1.4,'#46a85a'); }
  } else if(ch==='s'||ch==='y'){                   // ARENA / PLAYA
    q(x,0,0,16,16, ch==='y'?'#e6d49c':'#dcc488'); q(x,0,0,16,4, ch==='y'?'#efe0ab':'#e6cf97');
    _dots(x,[[2,5],[9,6],[5,11],[13,9],[7,3],[11,13],[3,9],[14,4]],2,1,'#c9ab6c');
    _dots(x,[[6,7],[12,4],[1,12],[10,10],[4,14]],1,1,'#f6ead0'); q(x,0,15,16,1,'#caa86a');
  } else if(ch==='n'){                             // NIEVE
    q(x,0,0,16,16,'#eef4fd'); q(x,0,0,16,4,'#ffffff'); q(x,0,12,16,4,'#d2e2f3');
    _dots(x, (f?[[3,4],[11,7],[7,12],[14,3]]:[[5,3],[13,9],[2,11],[9,6]]),1.2,1.2,'#ffffff');
    _dots(x,[[6,7],[12,12],[2,7]],1,1,'#c2d6ee');
  } else if(ch==='r'){                             // CAMINO de tierra empedrado
    q(x,0,0,16,16,'#bda06b'); q(x,1,1,14,14,'#c4a872');
    const s='#ad9059',sl='#d2b884',sd='#8f774a';
    const setA=[[1,2,4,3],[6,1,5,4],[12,3,3,4],[2,7,5,4],[8,7,4,3],[13,8,3,5],[3,12,4,3],[9,12,5,3]];
    const setB=[[2,1,5,4],[8,2,5,3],[1,6,4,5],[7,6,5,4],[13,5,3,5],[3,11,5,4],[10,11,5,4]];
    for(const[sx,sy,sw,sh] of (v?setB:setA)){ q(x,sx,sy,sw,sh,s); q(x,sx,sy,sw,0.8,sl); q(x,sx,sy+sh-0.8,sw,0.8,sd); q(x,sx,sy,0.8,sh,sl); }
  } else if(ch==='b'){                             // PUENTE de tablones
    q(x,0,0,16,16,'#9a7546'); q(x,0,0,16,1.4,'#b89160');
    for(let r=3.5;r<16;r+=4)q(x,0,r,16,0.8,'#5e4528');
    q(x,0,0,1.4,16,'#6e5128'); q(x,14.6,0,1.4,16,'#6e5128');
    _dots(x,[[2,1.6],[13,1.6],[2,9],[13,9]],1.2,1.2,'#3a2c18');
  } else if(ch==='m'){                             // ROCA (meseta); la cara se dibuja aparte
    q(x,0,0,16,16,'#717892'); q(x,0,0,16,3,'#8a91aa'); q(x,0,0,16,1,'#9ba2bc');
    _dots(x,[[3,6,3,2],[9,9,3,2],[12,5,3,2],[5,12,3,2],[2,10,2,2]].map(a=>[a[0],a[1]]),3,2,'#5b6276');
    _dots(x,[[7,4],[11,11],[1,13],[14,7]],1,1,'#aab1c9');
  } else if(ch==='t'){                             // COPA de bosque (autollena, bloquea)
    q(x,0,0,16,16,'#1c6638');
    for(const[cx2,cy2,r] of [[4,4,4.4],[11,5,4.4],[7,11,4.8],[13,12,3.8],[2,12,3.6],[9,15,3.4]])
      for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){ if(xx*xx+yy*yy>r*r)continue;
        const pxx=cx2+xx,pyy=cy2+yy; if(pxx<0||pxx>=16||pyy<0||pyy>=16)continue;
        const t=(xx*0.6+yy)/r; q(x,pxx,pyy,1,1, t<-.42?'#46ab63':(t>.5?'#124a2a':'#2c8a4c')); }
    _dots(x,[[3,3],[10,4],[7,10],[13,11],[5,13]],1,1,'#5cc070');
  } else { grassBase(x); }
}

/* ════════════════════════════════
   TILES DE OBJETO 1×1 (estética 16-bit, finales 90 / principios 2000)
   Cada objeto es UNA celda; los edificios se MONTAN con tiles (tejado,
   pared, puerta, ventana). Fondo transparente salvo lo opaco (edificios).
════════════════════════════════ */
const BUILD_STYLES={
  lab:    {wall:'#e6ebf6',roof:'#5b6bb0'}, factory:{wall:'#aab0bc',roof:'#6b5040'},
  port:   {wall:'#d2dade',roof:'#c23b3b'}, salt:   {wall:'#eef2f7',roof:'#8fa6bb'},
  mine:   {wall:'#c2ab86',roof:'#5a4632'}, spa:    {wall:'#ecd6ea',roof:'#7a4f86'},
  desert: {wall:'#e6cd92',roof:'#c08a3e'}, market: {wall:'#dcb87e',roof:'#3f8f6a'},
  capital:{wall:'#dde4f4',roof:'#6a5ba8'},
};
const HOUSE_PALS=[['#e0c79c','#b0413c'],['#d2c19c','#3f6aa0'],['#dcc89e','#4a8f5f'],
  ['#d0ac84','#8a5a86'],['#cdb892','#c97b3a'],['#c6c2b0','#5a7d8c']];

/* ── caché de tiles de objeto (transparentes salvo edificios) ── */
function objTile(id,f){
  const anim=id.charCodeAt(0)===102&&id.charCodeAt(1)===110; // empieza por 'fn'
  const fr=anim?(f&3):0, key=id+'#'+fr+'#'+_sprTs;
  let c=_obj.get(key); if(c)return c;
  c=_cv(16*_U,16*_U); paintObj(c.getContext('2d'),id,fr); _obj.set(key,c); return c;
}
function paintObj(x,id,f){
  switch(id){
    case 'bush':  return ot_bush(x);   case 'rock':  return ot_rock(x);
    case 'flower':return ot_flower(x); case 'fenceH':return ot_fenceH(x);
    case 'fenceV':return ot_fenceV(x); case 'garden':return ot_garden(x);
    case 'crate': return ot_crate(x);
  }
  const p=id.split('|');
  if(p[0]==='tree')return bigTree(x, -(p[1].charCodeAt(0)-48)*16, -(p[1].charCodeAt(1)-48)*16, +p[2]||0);
  if(p[0]==='lamp')return bigLamp(x, -(+p[1])*16);
  if(p[0]==='sign')return bigSign(x, -(+p[1])*16);
  if(p[0]==='roof')return ot_roof(x,p[1],p[2]);
  if(p[0]==='wall')return ot_wall(x,p[1]);
  if(p[0]==='door')return ot_door(x,p[1]);
  if(p[0]==='win') return ot_window(x,p[1]);
  if(p[0]==='fn')  return ot_fountain(x,+p[1],+p[2],f);
}
/* —— ÁRBOL grande 2×2 (32×32 art; OX,OY = -celda*16) —— */
const TREE_COL=['#3aa55a','#33a06e','#46aa40','#2f9558'];
function bigTree(x,OX,OY,v){const Q=(ax,ay,w,h,c)=>q(x,ax+OX,ay+OY,w,h,c);
  const leaf=TREE_COL[v%4], dk=shade(leaf,.6), lt=shade(leaf,1.32), tr='#6f4c2c',td='#523620',tl='#87633c';
  Q(13,21,6,11,td); Q(13,21,2.4,11,tr); Q(14.4,21,1,11,tl); Q(12,30.5,8,1.6,'rgba(0,0,0,.18)');
  const blobs=[[16,13,13],[9,17,8.5],[23,17,8.5],[16,21,12],[16,7,9.5]];
  for(const[bx,by,br] of blobs)for(let yy=-br;yy<=br;yy++)for(let xx=-br;xx<=br;xx++){
    if(xx*xx+yy*yy>br*br)continue; const px=bx+xx,py=by+yy; if(px<0||px>=32||py<0||py>27)continue;
    const t=(xx*0.55+yy)/br; Q(px,py,1,1, t<-.46?lt:(t>.55?dk:leaf)); }
  for(const[a,b] of [[9,6],[20,9],[6,15],[14,4]]) Q(a,b,2.2,2.2,lt);
  for(const[a,b] of [[23,20],[14,23],[26,14],[10,22]]) Q(a,b,2.2,2.2,dk);
  if(v%4===2)for(const[a,b] of [[12,12],[21,15],[16,21]]){ Q(a,b,1.6,1.6,'#ff5a5a'); Q(a+0.4,b+0.4,0.7,0.7,'#ffd0d0'); }
}
/* —— FAROLA alta 1×2 y CARTEL alto 1×2 (16×32 art; OY = -celda*16) —— */
function bigLamp(x,OY){const Q=(ax,ay,w,h,c)=>q(x,ax,ay+OY,w,h,c);
  const m='#39414f',ml='#5a6376',md='#262c37',glow='#ffe9a8';
  Q(7,9,2,22,m); Q(7,9,0.8,22,ml); Q(7.4,12,1.2,18,md); Q(5.6,30,4.8,2,md); Q(6.6,29,2.8,1.4,m);
  Q(4.4,2,7.2,8,md); Q(5,2.6,6,6.8,m); Q(5.5,3.2,5,5.6,glow); Q(6.2,3.8,3.6,4,'#fff6d8');
  Q(4,1,8,1.6,m); Q(6.6,0,2.8,1.4,m); Q(5.4,9,5.2,1.2,m);}
function bigSign(x,OY){const Q=(ax,ay,w,h,c)=>q(x,ax,ay+OY,w,h,c);
  const w='#b88a52',wd='#7a5a32',wl='#d4aa6c';
  Q(6.4,12,3.2,18,wd); Q(6.4,12,1,18,'#5e4628');
  Q(1,2,14,11,w); Q(1,2,14,1.6,wl); Q(1,11.4,14,1.6,wd); Q(1,2,1.4,11,wl); Q(13.6,2,1.4,11,wd);
  Q(3,4.5,10,1.3,'#4a3320'); Q(3,7,8,1.3,'#4a3320'); Q(3,9.4,9,1.3,'#4a3320');}
/* —— props 1×1 —— */
function ot_bush(x){const d='#1a6034',g='#2c8a4c',l='#52b56e';
  for(let yy=5;yy<15;yy++)for(let xx=1;xx<15;xx++){const dx=xx-8,dy=yy-10; if(dx*dx*0.72+dy*dy>27)continue;
    const t=dy/5; q(x,xx,yy,1,1, t<-.3?l:(t>.45?d:g)); } q(x,5,7,1.8,1.8,l); q(x,10,9,1.4,1.4,d);}
function ot_rock(x){const d='#565d70',g='#787f93',l='#9aa1b6';
  for(let yy=5;yy<15;yy++)for(let xx=2;xx<14;xx++){const dx=xx-8,dy=yy-10.5; if(dx*dx*0.7+dy*dy>22)continue;
    const t=dy/5; q(x,xx,yy,1,1, t<-.3?l:(t>.45?d:g)); } q(x,6,7.5,1.6,1.6,l);}
function ot_flower(x){const C=['#f472b6','#fde047','#a78bfa','#fb7185'];
  for(const[i,p] of [[0,[3,5]],[1,[9,3]],[2,[6,10]],[3,[12,9]]]){q(x,p[0]+0.7,p[1]+2,0.6,2.4,'#2c7a3f'); q(x,p[0],p[1],2.4,2.4,C[i]); q(x,p[0]+0.7,p[1]+0.7,0.9,0.9,'#fffbe6');}}
function ot_fenceH(x){const w='#a78a5c',wd='#71623f',wl='#c2a877';
  q(x,0,6,16,2,w); q(x,0,6,16,0.6,wl); q(x,0,10,16,2,w); q(x,0,10,16,0.6,wl);
  for(const px of [2,8,13]){q(x,px,4,2,10,w); q(x,px,4,0.7,10,wd);} }
function ot_fenceV(x){const w='#a78a5c',wd='#71623f',wl='#c2a877';
  q(x,7,0,2,16,w); q(x,6.6,0,0.6,16,wd);
  for(const py of [3,11]){ q(x,3,py,10,1.8,w); q(x,3,py,10,0.6,wl); } }
function ot_garden(x){q(x,1,3,14,12,'#5a3f28'); q(x,1,3,14,1.4,'#6e4f34');
  const C=['#f472b6','#fde047','#a78bfa','#fb7185'];
  for(let i=0;i<5;i++){const px=2.5+(i*2.8)%11, py=5+(i%2)*4.5; q(x,px,py,2,2,C[i%4]); q(x,px+0.6,py+0.6,0.8,0.8,'#fffbe6'); } }
function ot_crate(x){const w='#ac8450',wd='#7a5d34',wl='#c79c63';
  q(x,2,4,12,11,w); q(x,2,4,12,1,wl); q(x,2,14,12,1,wd); q(x,8,4,1,11,wd); q(x,2,9,12,1,wd);}
/* FUENTE en 3×3 tiles (ox,oy ∈ -1..1): estanque redondo + agua animada */
function ot_fountain(x,ox,oy,f){
  const st='#9aa1b3',sd='#6c7488',sl='#c8cedb',w='#2f7fd6',wl='#5aa0e6',wd='#1f64ad';
  for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){
    const gx=(ox+1)*16+xx+0.5, gy=(oy+1)*16+yy+0.5, dx=gx-24, dy=gy-24, d=Math.sqrt(dx*dx+dy*dy);
    if(d>22.5)continue; let col;
    if(d>18) col=dy<-3?sl:(dy>5?sd:st);
    else if(d>15) col=sd;
    else col = d>13.5?wd:(((Math.floor(d)+f)&3)<2?wl:w);
    q(x,xx,yy,1,1,col);
  }
  if(ox===0&&oy===0){ q(x,7,3,2,9,st); q(x,6.4,3,0.6,9,sl);
    q(x,5.5,1.5,5,2.2,st); q(x,5.5,1.5,5,0.8,sl); q(x,7,0.4,2,2,'#7fd0ff');
    q(x,5,4+(f&1),1,2,'#bfe2ff'); q(x,10,5-(f&1),1,2,'#bfe2ff'); }
}
/* —— PIEZAS DE EDIFICIO (opacas; se montan en la rejilla) —— */
function ot_wall(x,hex){const wl=shade(hex,1.13),wd=shade(hex,.78),wd2=shade(hex,.6);
  q(x,0,0,16,16,hex); q(x,0,0,16,1.4,wl); q(x,0,0,1.4,16,wl);
  q(x,14.6,0,1.4,16,wd); q(x,0,14.6,16,1.4,wd2);
  for(let r=4;r<14;r+=4)q(x,1,r,14,0.5,'rgba(0,0,0,.07)');}
function ot_window(x,hex){ot_wall(x,hex); const fr='#3a2a18',frl='#5a4630',a='#bfe9ff',al='#eaf8ff';
  q(x,3,2,10,8.6,fr); q(x,3,2,10,1,frl);                    // marco de madera
  q(x,3.9,2.9,8.2,6.8,a); q(x,3.9,2.9,3.8,2.6,al);          // cristal + brillo
  q(x,7.6,2.9,0.8,6.8,fr); q(x,3.9,5.6,8.2,0.8,fr);         // crucetas
  q(x,2.4,10.4,11.2,2.6,'#6b4a2c'); q(x,2.4,10.4,11.2,0.7,'#8a6038'); // jardinera
  for(const fx of [3.6,6.6,9.6]){ q(x,fx,9.2,1.8,1.8, fx===6.6?'#ffd23b':'#f472b6'); q(x,fx+0.5,9.7,0.8,0.8,'#fff'); } }
function ot_door(x,hex){ot_wall(x,hex); const fr='#241408',d='#5a3a22',dl='#7a5230',dh='#8f6238';
  q(x,2.2,1.6,11.6,14.4,fr); q(x,3,2.4,10,13.6,d); q(x,3,2.4,10,1,dh);     // marco + hoja GRANDE
  q(x,7.6,2.6,0.8,13.4,fr);                                                 // junta central
  q(x,3.8,3.8,3.6,4.2,dl); q(x,8.6,3.8,3.6,4.2,dl);                         // cuarterones altos
  q(x,3.8,8.6,3.6,6,dl);   q(x,8.6,8.6,3.6,6,dl);                           // cuarterones bajos
  q(x,6.7,8.8,1,1.6,'#f4d27a'); q(x,9,8.8,1,1.6,'#f4d27a');                 // pomos
  q(x,2,15.2,12,1,shade(hex,.55)); }                                        // umbral
function ot_roof(x,hex,sub){const r=hex,rl=shade(hex,1.2),rl2=shade(hex,1.36),rd=shade(hex,.7),rd2=shade(hex,.5);
  q(x,0,0,16,16,r);
  for(let row=0;row<4;row++){const yy=1.4+row*3; q(x,0,yy,16,2.2,row%2?shade(r,.92):r); q(x,0,yy,16,0.7,rl);
    for(let i=(row%2?2:0);i<16;i+=4)q(x,i,yy,0.7,2.2,rd);}   // tejas
  q(x,0,0,16,1.8,rl2);                                        // caballete (luz)
  q(x,0,13,16,3,rd); q(x,0,15.4,16,0.6,rd2);                  // alero + sombra del vuelo
  if(sub==='L'){ q(x,0,0,2.6,16,rd); q(x,0,0,1,16,rd2); }
  else if(sub==='R'){ q(x,13.4,0,2.6,16,rd); q(x,15,0,1,16,rd2); }
  else if(sub==='peak'){ q(x,6.6,0,2.8,16,rl2); }
  else if(sub==='crown'){ q(x,0,0,16,16,r); q(x,0,11,16,5,rd); q(x,0,0,16,1.6,rl2);
    for(let i=0;i<16;i+=4){q(x,i,0,2.4,4,rd); q(x,i,0,2.4,1,rl2);} }
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
   POBLADOS — cada localidad se COMPONE con tiles 1×1 sobre la rejilla:
   el edificio principal se monta con piezas (tejado/pared/puerta/ventana),
   la fuente con 3×3 tiles, y los props (árbol, cartel, farola, valla,
   jardín…) ocupan UNA celda. Nada se solapa. Solo visual: la lógica entra
   al pisar la baldosa-letra (= la PUERTA del edificio principal).
════════════════════════════════ */
const TOWN_STYLE={villa:'lab',puerto:'port',salinas:'salt',cruce:'market',
  carbono:'factory',minas:'mine',lago:'spa',oasis:'market',desierto:'desert',
  cumbres:'factory',helix:'capital'};
let _tov={}, _overlayMap=null;
function townOverlay(townChar){
  if(_tov[townChar])return _tov[townChar];
  const t=RPG_TOWNS[townChar], pos=RPG_TOWN_POS[townChar], tx=pos[0], ty=pos[1];
  let s=(tx*131+ty*977+7)>>>0;
  const bs=BUILD_STYLES[TOWN_STYLE[t.id]||'lab']||BUILD_STYLES.lab, isCap=t.id==='helix';
  const M=new Map(), has=(x,y)=>M.has(x+','+y), set=(x,y,id)=>{if(!has(x,y))M.set(x+','+y,id);};
  const areaFree=(x0,y0,w,h)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(has(x,y))return false;return true;};
  /* edificio: puerta (centro-abajo) en (dxc,dyc); roofRows tejado + wallRows pared */
  function building(dxc,dyc,w,roofRows,wallRows,roof,wall,crown){
    const x0=dxc-((w-1)>>1), mid=(w-1)>>1, topWall=dyc-(wallRows-1), topRoof=topWall-roofRows;
    for(let ry=0;ry<roofRows;ry++)for(let i=0;i<w;i++){
      const sub=crown?'crown':(i===0?'L':(i===w-1?'R':(ry===0?'peak':'M')));
      set(x0+i,topRoof+ry,'roof|'+roof+'|'+sub); }
    for(let wy=0;wy<wallRows;wy++){const y=topWall+wy, bottom=(wy===wallRows-1);
      for(let i=0;i<w;i++){ let id;
        if(!bottom) id='win|'+wall;
        else if(i===mid) id='door|'+wall;
        else if(i===0||i===w-1) id='win|'+wall; else id='wall|'+wall;
        set(x0+i,y,id); } }
  }
  function tryHouse(dxc,dyc,roof,wall){ if(!areaFree(dxc-1,dyc-1,3,2))return; building(dxc,dyc,3,1,1,roof,wall,false);}
  const prop=(x,y,id)=>{ if(areaFree(x,y,1,1)) set(x,y,id); };
  const placeTree=(x,y,v)=>{ if(!areaFree(x,y-1,2,2))return; set(x,y-1,'tree|00|'+v);set(x+1,y-1,'tree|10|'+v);set(x,y,'tree|01|'+v);set(x+1,y,'tree|11|'+v); };
  const placeTall=(x,y,k)=>{ if(!areaFree(x,y-1,1,2))return; set(x,y-1,k+'|0'); set(x,y,k+'|1'); };
  /* PRINCIPAL — la puerta cae en la baldosa-letra (tx,ty) */
  if(isCap) building(tx,ty,4,2,2,bs.roof,bs.wall,true);
  else      building(tx,ty,3,1,2,bs.roof,bs.wall,false);
  /* casas acogedoras (2 de alto) a los lados, colores variados */
  const H=i=>HOUSE_PALS[(s>>>i)%HOUSE_PALS.length];
  tryHouse(tx-5,ty-1,H(1)[1],H(1)[0]); tryHouse(tx+5,ty-1,H(3)[1],H(3)[0]);
  tryHouse(tx-5,ty+2,H(5)[1],H(5)[0]); tryHouse(tx+5,ty+2,H(7)[1],H(7)[0]);
  /* fuente 3×3 (capital, balneario, salinas) al sur de la plaza */
  if(isCap||t.id==='lago'||t.id==='salinas'){
    if(areaFree(tx-1,ty+2,3,3)) for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++) set(tx+ox,ty+3+oy,'fn|'+ox+'|'+oy);
  }
  /* cartel, farolas (altos 1×2) */
  placeTall(tx,ty+2,'sign'); placeTall(tx-2,ty+1,'lamp'); placeTall(tx+2,ty+1,'lamp');
  /* jardines y vallas */
  prop(tx-2,ty+3,'garden'); prop(tx+2,ty+3,'garden');
  prop(tx-1,ty+5,'fenceH'); prop(tx,ty+5,'fenceH'); prop(tx+1,ty+5,'fenceH');
  /* árboles 2×2 en las esquinas, matojos y flores */
  placeTree(tx-7,ty-1,(s>>>2)%4); placeTree(tx+6,ty-1,(s>>>4)%4);
  placeTree(tx-7,ty+3,(s>>>6)%4); placeTree(tx+6,ty+3,(s>>>8)%4);
  prop(tx-3,ty+1,'bush'); prop(tx+4,ty+1,'flower'); prop(tx-4,ty+4,'flower'); prop(tx+3,ty+5,'bush');
  /* cajas en puertos y mercados */
  if(t.id==='puerto'||t.id==='cruce'||t.id==='oasis'){prop(tx-4,ty+1,'crate'); prop(tx+4,ty+2,'crate');}
  _tov[townChar]=M; return M;
}
/* capa de objetos global (mezcla de todos los poblados) + consulta O(1) */
function buildOverlay(){ _overlayMap=new Map();
  for(const ch of Object.keys(RPG_TOWN_POS)){const M=townOverlay(ch);
    for(const [k,v] of M) if(!_overlayMap.has(k)) _overlayMap.set(k,v);} }
function overlayAt(x,y){ if(!_overlayMap)buildOverlay(); return _overlayMap.get(x+','+y); }
function townOf(x,y){ for(const[ch,p] of Object.entries(RPG_TOWN_POS)) if(Math.abs(x-p[0])<=3&&Math.abs(y-p[1])<=4)return RPG_TOWNS[ch]; return null; }
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
    /* delante (al SUR) de la puerta, sobre la plaza, sin pisar edificios/props */
    const free=[];
    for(let dy=1;dy<=4;dy++)for(let dx=-3;dx<=3;dx++){
      const x=anchor.x+dx,y=anchor.y+dy;
      if(!rpgWalkable(x,y)||overlayAt(x,y))continue;
      if(_npcs.some(n=>n.x===x&&n.y===y))continue;
      free.push({x,y,d:dy*2+Math.abs(dx)});
    }
    /* fallback: cualquier celda libre alrededor si el sur está bloqueado */
    if(!free.length)for(let r=1;r<=4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const x=anchor.x+dx,y=anchor.y+dy;
      if(rpgWalkable(x,y)&&!overlayAt(x,y)&&!_npcs.some(n=>n.x===x&&n.y===y))free.push({x,y,d:r});
    }
    free.sort((a,b)=>a.d-b.d);
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
    if(!rpgWalkable(nx,ny)||overlayAt(nx,ny))continue;
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
    const gv=('.fhr'.includes(gch))?(((x*7+y*13)%3)+3)%3:0;
    const tc=tileCanvas(gch,F,gv);
    ctx.drawImage(tc,0,0,tc.width,tc.height,dx,dy,dw,dh);
    drawEdges(ctx,x,y,gch,dx,dy,dw,dh,F);
  }

  /* ── CAPA 2: OBJETOS 1×1 (overlay de tiles; nada se solapa) ── */
  for(let vy=-1;vy<=RPG_VIEW+1;vy++)for(let vx=-1;vx<=RPG_VIEW+1;vx++){
    const x=x0+vx,y=y0+vy;
    let id=overlayAt(x,y);
    if(!id){                                       // decoración dispersa en hierba (1×1)
      const ch=rpgTile(x,y);
      if(ch==='.'&&!nearTown(x,y)){const n=(x*2654435761 ^ y*40503)>>>0;
        if(n%41===0)id='bush'; else if(n%89===0)id='flower'; else if(n%157===0)id='rock';}
    }
    if(id){const dx=sxAt(x),dy=syAt(y),dw=sxAt(x+1)-dx,dh=syAt(y+1)-dy;
      const tc=objTile(id,F); ctx.drawImage(tc,0,0,tc.width,tc.height,dx,dy,dw,dh);}
  }

  /* ── CAPA 3: PERSONAJES (siempre por encima de los tiles) ── */
  const drawChar=(tx,tyy,dir,fr,palK,pal,glow)=>{
    const cx=sxAt(tx)+(sxAt(tx+1)-sxAt(tx))/2, by=syAt(tyy+1), c=charCanvas(palK,pal,dir,fr);
    if(glow){ctx.save();ctx.shadowColor='rgba(34,211,238,.45)';ctx.shadowBlur=ts*.18;}
    ctx.drawImage(c,Math.round(cx-c.width/2),Math.round(by-c.height));
    if(glow)ctx.restore();
  };
  for(const npc of _npcs){ if(npc.x<x0-2||npc.x>x0+RPG_VIEW+2||npc.y<y0-2||npc.y>y0+RPG_VIEW+2)continue;
    drawChar(npc.x,npc.y,npc.dir,0,npc.pal,NPC_PALS[npc.pal]||PAL_PLAYER,false); }
  drawChar(px,py,ADV.dir,_walkFrame,'player',PAL_PLAYER,true);

  /* ── CAPA 4: rótulo y estado de cada localidad visible ── */
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const [ch,p] of Object.entries(RPG_TOWN_POS)){
    const tx2=p[0],ty2=p[1];
    if(tx2<x0-1||tx2>x0+RPG_VIEW+1||ty2<y0-1||ty2>y0+RPG_VIEW+2)continue;
    const tn=RPG_TOWNS[ch], cx=sxAt(tx2)+(sxAt(tx2+1)-sxAt(tx2))/2, top=syAt(ty2-3);
    const locked=tn.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[tn.id];
    ctx.font='700 '+(ts*.3)+'px Exo 2,sans-serif';
    const nm=tn.name, tw=ctx.measureText(nm).width;
    ctx.fillStyle='rgba(8,12,30,.82)'; ctx.fillRect(cx-tw/2-4,top-ts*.46,tw+8,ts*.38);
    ctx.fillStyle='#eef2ff'; ctx.fillText(nm,cx,top-ts*.27);
    if(locked||ADV.cleared[tn.id]){ctx.font=(ts*.5)+'px serif'; ctx.fillText(locked?'🔒':'✅',cx,top-ts*.85);}
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
