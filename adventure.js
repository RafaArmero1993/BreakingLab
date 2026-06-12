/* ════════════════════════════════════════════════════════════════
   MODO AVENTURA — BreakingLab · El País de Reactivia (RPG)
   ════════════════════════════════════════════════════════════════
   Jugable como los RPG clásicos de los 90: un mundo de baldosas
   visto desde arriba por el que tu científico CAMINA paso a paso
   (cruceta táctil o flechas/WASD), con colisiones, pueblos en los
   que se entra al pisarlos (o con el botón A encima), hierba alta y
   desierto con ENCUENTROS SALVAJES, aldeas con tiendas especiales y
   la capital amurallada que exige 5 victorias.

   Leyenda del mapa:
     ~ agua (bloquea) · m montaña (bloquea) · t bosque (bloquea)
     . llanura · r camino (sin encuentros) · h hierba alta (encuentros)
     s arena del páramo (encuentros) · letras = localidades
════════════════════════════════════════════════════════════════ */

const RPG_MAP = [
'~~~~~~~~~~~~~~~~~~~~~~~~',
'~~~~mmmmm~~~~~mmmmmm~~~~',
'~~mmmm..mm~~mm....mmm~~~',
'~~mm.W.r.mm.mm.rrH.mm~~~',
'~~mm..r..m...m.r..mm~~~~',
'~~m...r.hh.r.r.r.mm~~~~~',
'~~m..rr..h.rrrrrr.m~~~~~',
'~~mssr.mm.....r..mm~~~~~',
'~~sssr.m.tt..rr.mm~~~~~~',
'~ssDsr....t..r.Mr.m~~~~~',
'~ssssr.tt....r..r..~~~~~',
'~ssssr..t..L.r..r..~~~~~',
'~ssssr..rrrr.r..r..~~~~~',
'~sssOr..r....r..r..~~~~~',
'~~ssrr..r.hh.rrrCr.~~~~~',
'~~~.r...r..h....r..~~~~~',
'~~~.rrrrZrrrrrrrr..~~~~~',
'~~~.....r..hh......~~~~~',
'~~t.t...r...h..tt..~~~~~',
'~~tt....r....t.t...~~~~~',
'~~.t..rrr.t......t~~~~~~',
'~~~Prr.r...t..t....~~~~~',
'~~~....r....rrSr...~~~~~',
'~~~....rrrVrr......~~~~~',
'~~~~....t....t..~~~~~~~~',
'~~~~~..t..t...~~~~~~~~~~',
'~~~~~~~~~~~~~~~~~~~~~~~~',
];
const RPG_W = RPG_MAP[0].length;
const RPG_H = RPG_MAP.length;
const RPG_VIEW = 13;          /* baldosas visibles (13×13) */
const RPG_BLOCK = '~mt';      /* terreno que bloquea el paso */
const RPG_ENCOUNTER = {h:.13, s:.11}; /* prob. de duelo salvaje por paso */

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
const ADV_OLD_KEY = 'bl-reactivia';

let ADV = null;

function rpgTile(x,y){
  if(x<0||y<0||x>=RPG_W||y>=RPG_H)return '~';
  return RPG_MAP[y][x];
}
function rpgTownAt(x,y){ return RPG_TOWNS[rpgTile(x,y)]||null; }
function rpgFindTile(ch){
  for(let y=0;y<RPG_H;y++){const x=RPG_MAP[y].indexOf(ch);if(x>-1)return {x,y};}
  return {x:10,y:23};
}
function advPlaceById(id){
  for(const t of Object.values(RPG_TOWNS))if(t.id===id)return t;
  return null;
}
function advWins(){ return Object.values(ADV.cleared).filter(Boolean).length; }
function rpgRegionAt(x,y){
  const t=rpgTownAt(x,y);
  if(t)return t.name;
  if(y<8)return x>12?'Camino de la Capital':'Sierra Wolframio';
  if(x<7&&y<15)return 'Páramo Radiante';
  if(y>19)return 'Costa Azur';
  return 'Llanos del Centro';
}

/* ── persistencia ── */
function advSave(){
  try{ localStorage.setItem(ADV_SAVE_KEY, JSON.stringify({
    x:ADV.x, y:ADV.y, coins:ADV.coins, col:ADV.col, cleared:ADV.cleared, done:ADV.done
  })); }catch(e){}
}
function advLoad(){
  try{
    const s=JSON.parse(localStorage.getItem(ADV_SAVE_KEY));
    if(s&&s.col&&typeof s.x==='number')return s;
  }catch(e){}
  /* migración desde el guardado anterior (mapa de nodos) */
  try{
    const old=JSON.parse(localStorage.getItem(ADV_OLD_KEY));
    if(old&&old.col){
      const v=rpgFindTile('V');
      return {x:v.x,y:v.y,coins:old.coins??ADV_START_COINS,col:old.col,
              cleared:old.cleared||{},done:!!old.done};
    }
  }catch(e){}
  return null;
}
function advNew(){
  const v=rpgFindTile('V');
  ADV={x:v.x, y:v.y, coins:ADV_START_COINS, col:{...ADV_STARTER},
       cleared:{}, done:false,
       inBattle:false, duelKind:'town', duelTown:'villa',
       wildLevel:'easy', wildName:'',
       battleDeck:[], battleSpells:[], offers:[], _onTown:true};
  advSave();
}

/* ── entrada al modo ── */
function advEnter(){
  const s=advLoad();
  if(s){
    ADV={...s, inBattle:false, duelKind:'town', duelTown:'villa',
         wildLevel:'easy', wildName:'',
         battleDeck:[], battleSpells:[], offers:[],
         _onTown:!!rpgTownAt(s.x,s.y)};
  } else {
    advNew();
  }
  showScreen('map');
  rpgInit();
}
function advReset(){
  if(!confirm('¿Reiniciar la aventura? Perderás tu colección y tus monedas.'))return;
  advNew();
  rpgDraw();
  toast('🗺 Nueva aventura comenzada');
}

/* ════════════════════════════════
   MOTOR DE TILES (canvas)
════════════════════════════════ */
let _rpgCv=null,_rpgCtx=null,_rpgTs=24,_rpgKeysBound=false;

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
      if(!document.getElementById('screen-map').classList.contains('active'))return;
      if(document.querySelector('.ov.open'))return;
      const k=e.key.toLowerCase();
      if(k==='arrowup'||k==='w'){e.preventDefault();rpgStep(0,-1);}
      else if(k==='arrowdown'||k==='s'){e.preventDefault();rpgStep(0,1);}
      else if(k==='arrowleft'||k==='a'){e.preventDefault();rpgStep(-1,0);}
      else if(k==='arrowright'||k==='d'){e.preventDefault();rpgStep(1,0);}
      else if(k==='enter'||k===' '){e.preventDefault();rpgAction();}
    });
  }
  rpgDraw();
}

const RPG_COLORS={
  '~':'#0d2c5e', '.':'#17402b', 'h':'#0e4f2a', 's':'#6b5a2e',
  'r':'#7c6a45', 'm':'#3a3f55', 't':'#123a24',
};
function rpgDraw(){
  if(!_rpgCtx||!ADV)return;
  const ctx=_rpgCtx, ts=_rpgTs;
  const half=Math.floor(RPG_VIEW/2);
  let camX=Math.max(0,Math.min(ADV.x-half,RPG_W-RPG_VIEW));
  let camY=Math.max(0,Math.min(ADV.y-half,RPG_H-RPG_VIEW));
  ctx.clearRect(0,0,_rpgCv.width,_rpgCv.height);
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(let vy=0;vy<RPG_VIEW;vy++){
    for(let vx=0;vx<RPG_VIEW;vx++){
      const x=camX+vx,y=camY+vy;
      const ch=rpgTile(x,y);
      const town=RPG_TOWNS[ch];
      const base=town?'.':(RPG_COLORS[ch]||'#17402b');
      ctx.fillStyle=town?'#27513a':base;
      ctx.fillRect(vx*ts,vy*ts,ts,ts);
      /* textura sutil por baldosa (determinista) */
      const n=(x*73856093 ^ y*19349663)>>>0;
      if(ch==='~'){
        ctx.fillStyle='rgba(120,180,255,'+(n%3===0?'.14':'.06')+')';
        ctx.fillRect(vx*ts+ts*.15,vy*ts+ts*(.3+(n%4)*.12),ts*.5,Math.max(1,ts*.06));
      } else if(ch==='.'||ch==='h'){
        ctx.fillStyle='rgba(90,220,140,'+(ch==='h'?'.22':'.10')+')';
        ctx.fillRect(vx*ts+(n%5)*ts*.16,vy*ts+(n%3)*ts*.25,Math.max(1,ts*.08),Math.max(1,ts*.14));
      } else if(ch==='s'){
        ctx.fillStyle='rgba(255,230,150,.12)';
        ctx.fillRect(vx*ts+(n%4)*ts*.2,vy*ts+(n%5)*ts*.16,Math.max(1,ts*.1),Math.max(1,ts*.08));
      } else if(ch==='r'){
        ctx.fillStyle='rgba(0,0,0,.18)';
        ctx.fillRect(vx*ts,vy*ts+ts*.42,ts,ts*.16);
      }
      /* elementos con glifo */
      ctx.font=(ts*.78)+'px serif';
      if(ch==='m')ctx.fillText('⛰',vx*ts+ts/2,vy*ts+ts*.55);
      else if(ch==='t')ctx.fillText('🌲',vx*ts+ts/2,vy*ts+ts*.55);
      else if(ch==='h')ctx.fillText('🌿',vx*ts+ts/2,vy*ts+ts*.6);
      else if(town){
        const locked=town.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[town.id];
        ctx.fillText(locked?'🔒':town.icon,vx*ts+ts/2,vy*ts+ts*.52);
        if(ADV.cleared[town.id]){
          ctx.font=(ts*.34)+'px serif';
          ctx.fillText('✅',vx*ts+ts*.78,vy*ts+ts*.22);
        }
      }
    }
  }
  /* tu científico */
  const px=(ADV.x-camX)*ts, py=(ADV.y-camY)*ts;
  ctx.font=(ts*.85)+'px serif';
  ctx.shadowColor='rgba(34,211,238,.9)';ctx.shadowBlur=ts*.4;
  ctx.fillText('🧑‍🔬',px+ts/2,py+ts*.5);
  ctx.shadowBlur=0;
  /* HUD */
  const coins=document.getElementById('map-coins');
  if(coins)coins.textContent='🪙 '+ADV.coins;
  const wins=document.getElementById('map-wins');
  if(wins)wins.textContent='🏅 '+advWins()+' / '+ADV_CAPITAL_WINS;
  const loc=document.getElementById('map-loc');
  if(loc)loc.textContent='📍 '+rpgRegionAt(ADV.x,ADV.y);
}

/* un paso del científico */
function rpgStep(dx,dy){
  if(!ADV||ADV.inBattle)return;
  const nx=ADV.x+dx, ny=ADV.y+dy;
  const ch=rpgTile(nx,ny);
  if(RPG_BLOCK.includes(ch)){sfx.click();return;}
  const town=RPG_TOWNS[ch];
  if(town&&town.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[town.id]){
    toast(`Las puertas de la capital exigen ${ADV_CAPITAL_WINS} victorias (llevas ${advWins()})`);
    return;
  }
  ADV.x=nx;ADV.y=ny;
  advSave();
  rpgDraw();
  if(town){
    if(!ADV._onTown){ADV._onTown=true;sfx.select();setTimeout(()=>advOpenTown(town.id),180);}
  } else {
    ADV._onTown=false;
    /* encuentros salvajes en hierba alta y arena */
    const rate=RPG_ENCOUNTER[ch];
    if(rate&&Math.random()<rate)rpgWildEncounter(ch,ny);
  }
}

/* botón A: entrar en la localidad sobre la que estás */
function rpgAction(){
  if(!ADV||ADV.inBattle)return;
  const town=rpgTownAt(ADV.x,ADV.y);
  if(town)advOpenTown(town.id);
}

/* mantener pulsada la cruceta = caminar */
let _padT=null;
function padStart(dx,dy){
  rpgStep(dx,dy);
  clearInterval(_padT);
  _padT=setInterval(()=>{
    if(!document.getElementById('screen-map').classList.contains('active')){clearInterval(_padT);return;}
    rpgStep(dx,dy);
  },170);
}
function padStop(){clearInterval(_padT);_padT=null;}

/* ── encuentros salvajes ── */
const RPG_WILD={
  h_easy:[{n:'Químico Errante',lv:'easy',c:18},{n:'Becario Fugado',lv:'easy',c:15}],
  h_hard:[{n:'Alquimista Salvaje',lv:'normal',c:30},{n:'Catedrático Ermitaño',lv:'normal',c:34}],
  s:[{n:'Mutante del Páramo',lv:'normal',c:38},{n:'Carroñero Radiactivo',lv:'hard',c:55}],
};
function rpgWildEncounter(ch,y){
  if(advShuffledElements().length<8)return;
  const pool=ch==='s'?RPG_WILD.s:(y<14?RPG_WILD.h_hard:RPG_WILD.h_easy);
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

/* ── colección ── */
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

/* ── localidad ── */
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

/* volver del panel de localidad al mundo */
function advBackToMap(){
  showScreen('map');
  rpgInit();
}

/* ── tiendas (cada aldea tiene la suya) ── */
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

/* ── colección (visor) ── */
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

/* ── duelo contra la compañía local ── */
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

/* fin de duelo de aventura (pueblo o salvaje) */
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
