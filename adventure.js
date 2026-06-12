/* ════════════════════════════════════════════════════════════════
   MODO AVENTURA — BreakingLab · El País de Reactivia (RPG)
   ════════════════════════════════════════════════════════════════
   RPG clásico de los 90 a calidad comercial:
   - Mapa grande 44×52 (generado y validado por tools/generate_map.py)
     con biomas: costa, río con puentes, lago, desierto, bosques,
     cordillera y capital amurallada.
   - Sprites PIXEL-ART propios con 4 direcciones y animación de
     caminar; movimiento interpolado entre baldosas con cámara suave.
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

/*MAP-START*/
const RPG_MAP = [
'~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
'~.~~~.~~~.~~~.~~~.~~~.~~~.~~~.~~~.~~~.~~~.~~',
'~~mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.~',
'~~mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm~~',
'~~mmmmmmm.........mmmmmmmmmmmm....H....mmm~~',
'~.mmmmmmm....W....mmmmmmmmmmmm.........mmm~~',
'~~mmmmmmm.........mmmmmmmmmmmm.........mmm.~',
'~~mmmmmmm.........mmmmmmmmmmmmmmmm.mmmmmmm~~',
'~~mmmmmmmmmmm.mmmmmmmmmmmmmmmmmmmm.mmmmmmm~~',
'~.mmmmmmmmmmm.mmmmmmmmmmmmmmmmmmmmrmmmmmmm~~',
'~~m..m.m..m.m..m.m..m.m.~~.m..m.m.rm.m..m~.~',
'~~...........r.......f..~~........r.......~~',
'~~.ssssssss..r.......f..~~.......Mr.......~~',
'~..sssrrrrrrrr.......f..~~.......r........~~',
'~~.sssrssss..r~~~~~.....~~..t....r.........~',
'~~~sssDssss..L~~~~~.....~~.t.t...r........~~',
'~~.sssrssssffr~~~~~.....~~tt.t...r........~~',
'~..sssrssssf.r~~~~~.....~~..tt...r....tt.~~~',
'~~.sssrssss..r....h.hh..~~..t....r..t.t.t..~',
'~~.sssrssss..r....h.h.h.~~.......r...tt...~~',
'~~.sssrssss..rrrrrrrh.h.~~.......r........~~',
'~..sssrsssst.......r.hh.~~.......r........~~',
'~~~sssrrssst......hr.h..~~.......r.........~',
'~~.ssssrssst.......rh...~~.......r........~~',
'~~.ssssrsss........r....~~.......C.......~~~',
'~..ssssrsss........r....~~.......r........~~',
'~~.ssssrsss........r....~~...h...r.........~',
'~~.ssssrsss........r....~~..hh...r....t...~~',
'~~.ssssrsss.rrrrrrrZrrrrbbrrrrrrrr..t.t.t.~~',
'~.~ssssOsss.r......r....~~..h.h..r...tt.t.~~',
'~~.ssssrrrrrr..h.h.r....~~...ht..r.t.t.tt..~',
'~~.ssssssss...h.hh.r....~~...t.ttr..tt.t.~~~',
'~~.ssssssss..tt.t..r....~~..tt.t.r..t.tt..~~',
'~............t.tt.tr...h~~..t.tt.r....t...~~',
'~~........h.tt.t.ttr..hh~~..t.t.tr.........~',
'~~.......hh.t.tt.t.r..h.~~...tt.tr.h.h....~~',
'~~~......h.ht.t.tt.r.hh.~~h......rh.hh....~~',
'~........h.h.tt.t.tr.h.h~~.......r..h.....~~',
'~~........h..t.tt..r.h.h~~.......r..h....~.~',
'~~.............t.ffr...h~~.......r........~~',
'~~....P........f.f.r....~~.......r........~~',
'~.....r.........ff.r....~~.......r........~~',
'~~....r............VrrrrbbrrrrrrrS.........~',
'~~~...r....t.t.....r....~~t.........f.....~~',
'~~....rrrrrrrrrrrrrr....~~.tt......f.f....~~',
'~...........t...........~~.t.............~~~',
'~~yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.~',
'~~yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy~~',
'~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
'~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
'~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~',
'~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];
/*MAP-END*/
const RPG_W = RPG_MAP[0].length;
const RPG_H = RPG_MAP.length;
const RPG_VIEW = 13;
const RPG_BLOCK = '~mt';
const RPG_ENCOUNTER = {h:.12, s:.10};

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
   SPRITES pixel-art (10×12, 4 direcciones × 2 frames)
════════════════════════════════ */
const SPR={
down:[[
'..kkkkkk..',
'.kkkkkkkk.',
'.kssssssk.',
'.sggssggs.',
'..ssssss..',
'.wwwwwwww.',
'swwwwwwwws',
'.wwwwwwww.',
'.wwwwwwww.',
'..bbbbbb..',
'..bb..bb..',
'..oo..oo..',
],[
'..kkkkkk..',
'.kkkkkkkk.',
'.kssssssk.',
'.sggssggs.',
'..ssssss..',
'.wwwwwwww.',
'.wwwwwwww.',
'swwwwwwwws',
'.wwwwwwww.',
'..bbbbbb..',
'.bb....bb.',
'.oo....oo.',
]],
up:[[
'..kkkkkk..',
'.kkkkkkkk.',
'.kkkkkkkk.',
'.skkkkkks.',
'..kkkkkk..',
'.wwwwwwww.',
'swwwwwwwws',
'.wwwwwwww.',
'.wwwwwwww.',
'..bbbbbb..',
'..bb..bb..',
'..oo..oo..',
],[
'..kkkkkk..',
'.kkkkkkkk.',
'.kkkkkkkk.',
'.skkkkkks.',
'..kkkkkk..',
'.wwwwwwww.',
'.wwwwwwww.',
'swwwwwwwws',
'.wwwwwwww.',
'..bbbbbb..',
'.bb....bb.',
'.oo....oo.',
]],
left:[[
'..kkkkkk..',
'.kkkkkkkk.',
'.kkssssk..',
'.kggsssk..',
'..ssssss..',
'..wwwwww..',
'..swwwww..',
'..wwwwww..',
'..wwwwww..',
'..bbbbb...',
'..bb.bb...',
'..oo.oo...',
],[
'..kkkkkk..',
'.kkkkkkkk.',
'.kkssssk..',
'.kggsssk..',
'..ssssss..',
'..wwwwww..',
'..wwwwws..',
'..wwwwww..',
'..wwwwww..',
'..bbbbb...',
'.bb...bb..',
'.oo...oo..',
]],
};
SPR.right=SPR.left; /* se dibuja en espejo */

const PAL_PLAYER={k:'#23304a',s:'#f2c79b',w:'#e8ecf2',b:'#3b4a8c',o:'#1c1c28',g:'#22d3ee'};
const NPC_PALS={
 profe:   {k:'#cfd4e8',s:'#e8b88a',w:'#d9c9ee',b:'#5b4a8c',o:'#1c1c28',g:'#a78bfa'},
 abuela:  {k:'#d9dbe8',s:'#eebfa0',w:'#b3678f',b:'#7a4a66',o:'#1c1c28',g:'#b3678f'},
 marino:  {k:'#5a4632',s:'#d9a878',w:'#3b6a9c',b:'#27496b',o:'#1c1c28',g:'#3b6a9c'},
 guardia: {k:'#332b22',s:'#e0a87a',w:'#b3403f',b:'#5e2a2a',o:'#1c1c28',g:'#f59e0b'},
 mercader:{k:'#3a2d1c',s:'#dba87f',w:'#c79b3b',b:'#7a5c2a',o:'#1c1c28',g:'#fde047'},
 nino:    {k:'#7a4a2a',s:'#f2c79b',w:'#3fae6a',b:'#2a6b46',o:'#1c1c28',g:'#3fae6a'},
 minero:  {k:'#4a3b2d',s:'#d9a878',w:'#8c7a5b',b:'#4a4032',o:'#1c1c28',g:'#fbbf24'},
 botanica:{k:'#2d4a33',s:'#e8b88a',w:'#2f8f5b',b:'#1f5c3b',o:'#1c1c28',g:'#86efac'},
 eremita: {k:'#bfc4d8',s:'#dba87f',w:'#6b7280',b:'#3f4654',o:'#1c1c28',g:'#9ca3af'},
 banista: {k:'#2d3a5e',s:'#f2c79b',w:'#38bdf8',b:'#1f6b8f',o:'#1c1c28',g:'#38bdf8'},
 cientif: {k:'#8a3b5e',s:'#f2c79b',w:'#f1f5f9',b:'#8a3b5e',o:'#1c1c28',g:'#f472b6'},
 viejo:   {k:'#d8d8d8',s:'#e0a87a',w:'#7a6a4a',b:'#4a4232',o:'#1c1c28',g:'#9ca3af'},
};

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
  if(y<10)return x>26?'Murallas de la Capital':'Sierra Wolframio';
  if(x<12&&y<34)return 'Páramo Radiante';
  if(y>38)return 'Costa Azur';
  return 'Llanos del Centro';
}

/* ── persistencia ── */
function advSave(){
  try{ localStorage.setItem(ADV_SAVE_KEY, JSON.stringify({
    x:ADV.x, y:ADV.y, dir:ADV.dir, coins:ADV.coins, col:ADV.col,
    cleared:ADV.cleared, flags:ADV.flags, done:ADV.done
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
       cleared:{}, flags:{}, done:false,
       inBattle:false, duelKind:'town', duelTown:'villa',
       wildLevel:'easy', wildName:'', wildCoins:0,
       battleDeck:[], battleSpells:[], offers:[], _onTown:false};
  if(RPG_BLOCK.includes(rpgTile(ADV.x,ADV.y))){ADV.x=v.x;ADV.y=v.y;ADV._onTown=true;}
  advSave();
}

function advEnter(){
  const s=advLoad();
  if(s){
    ADV={...s, dir:s.dir||'down', flags:s.flags||{},
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

const RPG_COLORS={
  '~':'#0d2c5e', '.':'#17402b', 'h':'#0e4f2a', 's':'#6b5a2e',
  'r':'#7c6a45', 'm':'#3a3f55', 't':'#123a24', 'b':'#7a5a38',
  'y':'#b9a468', 'f':'#1c4a2f',
};

function drawSprite(ctx,px,py,ts,dir,frame,pal){
  const mat=(SPR[dir]||SPR.down)[frame%2];
  const flip=dir==='right';
  const cell=ts/10;
  for(let r=0;r<12;r++){
    const line=mat[r];
    for(let c=0;c<10;c++){
      const ch=line[flip?9-c:c];
      if(ch==='.')continue;
      ctx.fillStyle=pal[ch]||'#fff';
      ctx.fillRect(px+c*cell, py+(r-3)*cell, cell+0.5, cell+0.5);
    }
  }
}

function rpgDraw(){
  if(!_rpgCtx||!ADV)return;
  const ctx=_rpgCtx, ts=_rpgTs;
  const now=Date.now();
  /* posición de cámara (en píxeles de baldosa, con interpolación) */
  let px=ADV.x, py=ADV.y;
  if(_anim){
    const k=Math.min(1,(now-_anim.t0)/_anim.dur);
    px=_anim.fx+(_anim.tx-_anim.fx)*k;
    py=_anim.fy+(_anim.ty-_anim.fy)*k;
  }
  const half=(RPG_VIEW-1)/2;
  let camX=Math.max(0,Math.min(px-half,RPG_W-RPG_VIEW));
  let camY=Math.max(0,Math.min(py-half,RPG_H-RPG_VIEW));
  ctx.clearRect(0,0,_rpgCv.width,_rpgCv.height);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const waveF=Math.floor(now/600)%2;
  const x0=Math.floor(camX),y0=Math.floor(camY);
  for(let vy=0;vy<=RPG_VIEW;vy++){
    for(let vx=0;vx<=RPG_VIEW;vx++){
      const x=x0+vx,y=y0+vy;
      const sx=(x-camX)*ts, sy=(y-camY)*ts;
      const ch=rpgTile(x,y);
      const town=RPG_TOWNS[ch];
      ctx.fillStyle=town?'#27513a':(RPG_COLORS[ch]||'#17402b');
      ctx.fillRect(sx,sy,ts+1,ts+1);
      const n=(x*73856093 ^ y*19349663)>>>0;
      if(ch==='~'){
        ctx.fillStyle='rgba(120,180,255,'+((n%2===waveF)?'.16':'.05')+')';
        ctx.fillRect(sx+ts*.12,sy+ts*(.28+(n%4)*.14),ts*.55,Math.max(1,ts*.07));
      } else if(ch==='.'||ch==='h'){
        ctx.fillStyle='rgba(90,220,140,'+(ch==='h'?'.22':'.10')+')';
        ctx.fillRect(sx+(n%5)*ts*.16,sy+(n%3)*ts*.27,Math.max(1,ts*.08),Math.max(1,ts*.15));
      } else if(ch==='s'||ch==='y'){
        ctx.fillStyle='rgba(255,235,170,.14)';
        ctx.fillRect(sx+(n%4)*ts*.2,sy+(n%5)*ts*.17,Math.max(1,ts*.1),Math.max(1,ts*.08));
      } else if(ch==='r'){
        ctx.fillStyle='rgba(0,0,0,.16)';
        ctx.fillRect(sx,sy+ts*.42,ts,ts*.16);
      } else if(ch==='b'){
        ctx.fillStyle='rgba(0,0,0,.25)';
        for(let i=0;i<3;i++)ctx.fillRect(sx,sy+ts*(.18+i*.3),ts,Math.max(1,ts*.07));
      } else if(ch==='f'){
        ctx.fillStyle=(n%2)?'#f472b6':'#fbbf24';
        ctx.fillRect(sx+ts*.25,sy+ts*.3,Math.max(2,ts*.14),Math.max(2,ts*.14));
        ctx.fillStyle=(n%2)?'#fbbf24':'#f472b6';
        ctx.fillRect(sx+ts*.6,sy+ts*.62,Math.max(2,ts*.12),Math.max(2,ts*.12));
      }
      ctx.font=(ts*.78)+'px serif';
      if(ch==='m')ctx.fillText('⛰',sx+ts/2,sy+ts*.55);
      else if(ch==='t')ctx.fillText('🌲',sx+ts/2,sy+ts*.55);
      else if(ch==='h')ctx.fillText('🌿',sx+ts/2,sy+ts*.6);
      else if(town){
        const locked=town.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[town.id];
        ctx.fillText(locked?'🔒':town.icon,sx+ts/2,sy+ts*.52);
        if(ADV.cleared[town.id]){
          ctx.font=(ts*.34)+'px serif';
          ctx.fillText('✅',sx+ts*.78,sy+ts*.22);
        }
      }
    }
  }
  /* NPCs visibles */
  for(const npc of _npcs){
    if(npc.x<x0-1||npc.x>x0+RPG_VIEW+1||npc.y<y0-1||npc.y>y0+RPG_VIEW+1)continue;
    drawSprite(ctx,(npc.x-camX)*ts,(npc.y-camY)*ts,ts,npc.dir,0,NPC_PALS[npc.pal]||PAL_PLAYER);
  }
  /* jugador */
  ctx.shadowColor='rgba(34,211,238,.55)';ctx.shadowBlur=ts*.3;
  drawSprite(ctx,(px-camX)*ts,(py-camY)*ts,ts,ADV.dir,_walkFrame,PAL_PLAYER);
  ctx.shadowBlur=0;
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
};
function rpgWildEncounter(ch,y){
  if(advShuffledElements().length<8)return;
  const pool=ch==='s'?RPG_WILD.s:(y<26?RPG_WILD.h_hard:RPG_WILD.h_easy);
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
