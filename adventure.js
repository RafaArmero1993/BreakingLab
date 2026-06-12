/* ════════════════════════════════════════════════════════════════
   MODO AVENTURA — BreakingLab · El País de Reactivia
   ════════════════════════════════════════════════════════════════
   Un PAÍS abierto por el que desplazarse: 11 localidades unidas por
   carreteras (un grafo con bifurcaciones y rutas alternativas, no un
   camino lineal). Viaja libremente entre localidades conectadas:
   - 8 pueblos controlados por compañías (duelo opcional, recompensa).
   - 3 aldeas sin compañía con tiendas especiales: el mercado del
     Cruce (20% más barato), el balneario del Lago (solo hechizos) y
     la caravana del Oasis (rarezas).
   - Helix City, la capital: sus puertas solo se abren con 5
     victorias sobre compañías. Dentro, el jefe final.
   Tu COLECCIÓN es tu mazo en los duelos y todo se guarda en el
   dispositivo (localStorage).
════════════════════════════════════════════════════════════════ */

/* Coordenadas x,y en el lienzo del mapa (viewBox 100×130) */
const ADV_PLACES = [
 {id:'villa',   x:22, y:112, icon:'🏠', name:'Villa Hidrógeno', region:'Costa Azur',
  corp:'Garaje Quark', level:'easy', reward:40,
  desc:'El pueblo donde todo laboratorio empieza. El garaje local presume de su química casera.'},
 {id:'puerto',  x:10, y:90,  icon:'⚓', name:'Puerto Oxígeno', region:'Costa Azur',
  corp:'OxiCorp', level:'easy', reward:50,
  desc:'El aire salado oxida hasta las ideas. OxiCorp controla los muelles… y no le gustan los visitantes.'},
 {id:'salinas', x:44, y:106, icon:'🧂', name:'Salinas del Este', region:'Costa Azur',
  corp:'Salitre S.A.', level:'easy', reward:55,
  desc:'Montañas blancas de sal hasta el horizonte. Salitre S.A. patenta hasta el agua del mar.'},
 {id:'cruce',   x:36, y:84,  icon:'🛖', name:'Cruce del Azufre', region:'Llanos del Centro',
  corp:null,
  desc:'Aquí se cruzan todas las caravanas del país. Su mercado ambulante vende de todo… un 20% más barato.'},
 {id:'carbono', x:62, y:88,  icon:'🏭', name:'Ciudad Carbono', region:'Llanos del Centro',
  corp:'Grafeno Works', level:'normal', reward:70,
  desc:'Chimeneas, hollín y diamantes. En Grafeno Works dicen que el futuro se escribe con lápiz.'},
 {id:'minas',   x:72, y:64,  icon:'⛏️', name:'Minas de Hierro', region:'Llanos del Centro',
  corp:'Ferrum Industries', level:'normal', reward:80,
  desc:'El metal canta bajo tierra. Ferrum forja aleaciones… y rivales difíciles de romper.'},
 {id:'lago',    x:34, y:58,  icon:'♨️', name:'Lago Argón', region:'Sierra Wolframio',
  corp:null,
  desc:'Aguas termales bajo auroras de gas noble. El balneario vende hechizos a los viajeros.'},
 {id:'oasis',   x:10, y:56,  icon:'🏜️', name:'Oasis del Litio', region:'Páramo Radiante',
  corp:null,
  desc:'Último refugio antes del desierto. Su caravana trae rarezas de todos los rincones del país.'},
 {id:'desierto',x:16, y:32,  icon:'☢️', name:'Desierto de Uranio', region:'Páramo Radiante',
  corp:'RadCorp', level:'hard', reward:110,
  desc:'Un páramo que brilla de noche. RadCorp juega sucio: trae plomo si quieres sobrevivir.'},
 {id:'cumbres', x:52, y:38,  icon:'🏔️', name:'Cumbres del Wolframio', region:'Sierra Wolframio',
  corp:'Wolfram Defense', level:'hard', reward:95,
  desc:'En la montaña más dura, la compañía más dura. Su laboratorio funde a 3.400 grados.'},
 {id:'helix',   x:78, y:16,  icon:'🌆', name:'Helix City', region:'Capital',
  corp:'Helix Industries™', level:'hard', reward:150, boss:true,
  desc:'La capital corta el cielo con su torre. Arriba espera el Dr. Heisenberg IA… y la Molécula Maestra.'},
];

/* Carreteras del país (grafo con bifurcaciones y anillos) */
const ADV_ROADS = [
 ['villa','puerto'],['villa','salinas'],['puerto','cruce'],['salinas','cruce'],
 ['salinas','carbono'],['cruce','carbono'],['cruce','lago'],
 ['carbono','minas'],['minas','cumbres'],['lago','cumbres'],['lago','oasis'],
 ['oasis','desierto'],['desierto','cumbres'],['cumbres','helix'],['minas','helix'],
];

const ADV_REGIONS = [
 {name:'Costa Azur',      x:24, y:120},
 {name:'Llanos del Centro',x:56, y:76},
 {name:'Sierra Wolframio', x:46, y:48},
 {name:'Páramo Radiante',  x:13, y:44},
];

const ADV_CAPITAL_WINS = 5; /* victorias necesarias para entrar en Helix City */

/* colección inicial: suficiente para jugar, pobre para ganar a todos */
const ADV_STARTER = {H:6,O:5,C:3,N:3,Na:2,Cl:2,S:2,Ca:2,K:1,Fe:1,Mg:1,He:1,Ne:1};
const ADV_START_COINS = 60;
const ADV_SAVE_KEY = 'bl-reactivia';

let ADV = null;

function advPlace(id){ return ADV_PLACES.find(p=>p.id===id); }
function advNeighbors(id){
  const out=[];
  for(const [a,b] of ADV_ROADS){
    if(a===id)out.push(b);
    if(b===id)out.push(a);
  }
  return out;
}
function advWins(){ return Object.values(ADV.cleared).filter(Boolean).length; }

/* ── persistencia ── */
function advSave(){
  try{ localStorage.setItem(ADV_SAVE_KEY, JSON.stringify({
    pos:ADV.pos, coins:ADV.coins, col:ADV.col, cleared:ADV.cleared, done:ADV.done
  })); }catch(e){}
}
function advLoad(){
  try{
    const s=JSON.parse(localStorage.getItem(ADV_SAVE_KEY));
    if(s&&s.col&&s.pos)return s;
  }catch(e){}
  return null;
}
function advNew(){
  ADV={pos:'villa', coins:ADV_START_COINS, col:{...ADV_STARTER},
       cleared:{}, done:false,
       inBattle:false, duelTown:'villa', battleDeck:[], battleSpells:[], offers:[]};
  advSave();
}

/* ── entrada al modo ── */
function advEnter(){
  const s=advLoad();
  if(s){
    ADV={...s, inBattle:false, duelTown:s.pos, battleDeck:[], battleSpells:[], offers:[]};
  } else {
    advNew();
  }
  advRenderMap();
  showScreen('map');
}
function advReset(){
  if(!confirm('¿Reiniciar la aventura? Perderás tu colección y tus monedas.'))return;
  advNew();
  advRenderMap();
  toast('🗺 Nueva aventura comenzada');
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

/* ── mapa del país ── */
function advRenderMap(){
  const map=document.getElementById('country-map');
  if(!map)return;
  document.getElementById('map-coins').textContent='🪙 '+ADV.coins;
  document.getElementById('map-wins').textContent=
    '🏅 '+advWins()+' / '+ADV_CAPITAL_WINS+' para la capital';
  map.innerHTML='';

  /* carreteras (SVG bajo los pueblos) */
  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 100 130');
  svg.setAttribute('preserveAspectRatio','none');
  svg.classList.add('map-roads');
  for(const [a,b] of ADV_ROADS){
    const A=advPlace(a),B=advPlace(b);
    const line=document.createElementNS(NS,'line');
    line.setAttribute('x1',A.x);line.setAttribute('y1',A.y);
    line.setAttribute('x2',B.x);line.setAttribute('y2',B.y);
    const open=ADV.cleared[a]||ADV.cleared[b]||a===ADV.pos||b===ADV.pos;
    line.setAttribute('class','road'+(open?' near':''));
    svg.appendChild(line);
  }
  map.appendChild(svg);

  /* nombres de región */
  for(const r of ADV_REGIONS){
    const lbl=document.createElement('div');
    lbl.className='map-region';
    lbl.textContent=r.name;
    lbl.style.left=r.x+'%';
    lbl.style.top=(r.y/1.3)+'%';
    map.appendChild(lbl);
  }

  /* localidades */
  const neighbors=advNeighbors(ADV.pos);
  for(const p of ADV_PLACES){
    const pin=document.createElement('button');
    const here=p.id===ADV.pos;
    const reachable=neighbors.includes(p.id);
    const cleared=!!ADV.cleared[p.id];
    const lockedCapital=p.boss&&advWins()<ADV_CAPITAL_WINS&&!cleared;
    pin.className='map-pin'
      +(here?' here':'')
      +(reachable?' reachable':'')
      +(cleared?' cleared':'')
      +(p.corp?'':' village')
      +(lockedCapital?' locked':'');
    pin.style.left=p.x+'%';
    pin.style.top=(p.y/1.3)+'%';
    pin.innerHTML=`<span class="mp-ico">${lockedCapital?'🔒':p.icon}</span>
      <span class="mp-name">${p.name}</span>`;
    pin.onclick=()=>advTravel(p.id);
    map.appendChild(pin);
  }

  /* tu ficha */
  const token=document.createElement('div');
  token.id='map-token';
  token.textContent='⚗️';
  const cur=advPlace(ADV.pos);
  token.style.left=cur.x+'%';
  token.style.top=(cur.y/1.3)+'%';
  map.appendChild(token);
}

/* viajar por carretera (o abrir la localidad actual) */
function advTravel(id){
  if(id===ADV.pos){advOpenTown(id);return;}
  const neighbors=advNeighbors(ADV.pos);
  if(!neighbors.includes(id)){
    toast('Demasiado lejos: viaja por las carreteras');
    return;
  }
  const dest=advPlace(id);
  if(dest.boss&&advWins()<ADV_CAPITAL_WINS&&!ADV.cleared[id]){
    toast(`Las puertas de la capital exigen ${ADV_CAPITAL_WINS} victorias (llevas ${advWins()})`);
    return;
  }
  ADV.pos=id;
  advSave();
  sfx.draw();
  /* la ficha viaja por la carretera y al llegar se abre la localidad */
  const token=document.getElementById('map-token');
  if(token){
    token.style.left=dest.x+'%';
    token.style.top=(dest.y/1.3)+'%';
    setTimeout(()=>{advRenderMap();advOpenTown(id);},750);
  } else {
    advRenderMap();advOpenTown(id);
  }
}

/* ── localidad ── */
function advOpenTown(id){
  ADV.duelTown=id;
  const t=advPlace(id);
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
    /* balneario: solo hechizos */
    while(offers.length<4&&guard++<60)push(SPELLS[Math.floor(Math.random()*SPELLS.length)]);
  } else if(id==='oasis'){
    /* caravana: rarezas (muestreo uniforme → salen los raros) */
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

/* ── duelo ── */
function advStartDuel(){
  const t=advPlace(ADV.duelTown);
  if(!t||!t.corp)return;
  if(advShuffledElements().length<8){
    toast('Necesitas al menos 8 cartas de elemento. ¡Pasa por una tienda!');
    return;
  }
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

/* fin de duelo de aventura: recompensas y vuelta al país */
function advBattleEnd(winner){
  ADV.inBattle=false;
  const id=ADV.duelTown;
  const t=advPlace(id);
  const won=winner===0;
  const wasCleared=!!ADV.cleared[id];
  const title=document.getElementById('rtitle');
  const sub=document.getElementById('rsub');
  const stats=document.getElementById('rstats');
  const btns=document.getElementById('result-btns');
  title.classList.remove('lose');

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
    btns.innerHTML=`<button class="btn gold" onclick="advAfterDuel()">🗺 Continuar viaje</button>`;
    sfx.win();vibe([80,60,140]);launchConfetti();
  } else if(winner===-1){
    title.textContent='🤝 Empate técnico';
    sub.textContent='Ambos laboratorios quedan KO. La compañía no suelta el pueblo.';
    stats.innerHTML='';
    btns.innerHTML=`<button class="btn gold" onclick="advStartDuel()">⚔️ Reintentar</button>
      <button class="btn sec" onclick="advAfterDuel()">🗺 Volver al país</button>`;
  } else {
    const fine=Math.min(10,ADV.coins);
    ADV.coins-=fine;
    title.textContent='💀 Derrota';
    title.classList.add('lose');
    sub.textContent=`${t.corp} te cierra el paso${fine?` y te requisa 🪙 ${fine}`:''}. Refuerza tu mazo en las tiendas del país y vuelve.`;
    stats.innerHTML=`<div class="crow"><span>Tu bolsa</span><span class="cv">🪙 ${ADV.coins}</span></div>`;
    btns.innerHTML=`<button class="btn gold" onclick="advStartDuel()">⚔️ Reintentar</button>
      <button class="btn sec" onclick="advAfterDuel()">🗺 Volver al país</button>`;
    sfx.lose();
  }
  advSave();
  showScreen('result');
}
function advAfterDuel(){
  advRenderMap();
  showScreen('map');
}
