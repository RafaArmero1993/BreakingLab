/* ════════════════════════════════════════════════════════════════
   MODO AVENTURA — BreakingLab
   ════════════════════════════════════════════════════════════════
   La Ruta de la Molécula: viaja de pueblo en pueblo, compra cartas
   en las tiendas, gana duelos contra las compañías locales y llega
   a Helix City para sintetizar la Molécula Maestra.

   - Tu COLECCIÓN de cartas es persistente (localStorage): en los
     duelos de aventura robas de TU mazo, no de uno aleatorio.
   - Las victorias dan monedas y cartas; las derrotas cuestan 10.
   - Puedes volver a pueblos superados para comprar o re-duelar
     (recompensa reducida).
════════════════════════════════════════════════════════════════ */

const ADV_TOWNS = [
  {icon:'🏠', name:'Villa Hidrógeno',      corp:'Garaje Quark',        level:'easy',   reward:40,
   desc:'Un pueblo tranquilo donde todo laboratorio empieza. El garaje local presume de su química casera.'},
  {icon:'⚓', name:'Puerto Oxígeno',        corp:'OxiCorp',             level:'easy',   reward:50,
   desc:'El aire salado oxida hasta las ideas. OxiCorp controla el puerto… y no le gustan los visitantes.'},
  {icon:'🧂', name:'Salinas del Este',     corp:'Salitre S.A.',        level:'normal', reward:60,
   desc:'Montañas blancas de sal hasta el horizonte. Salitre S.A. patenta hasta el agua del mar.'},
  {icon:'🏭', name:'Ciudad Carbono',       corp:'Grafeno Works',       level:'normal', reward:70,
   desc:'Chimeneas, hollín y diamantes. En Grafeno Works dicen que el futuro se escribe con lápiz.'},
  {icon:'⛏️', name:'Minas de Hierro',      corp:'Ferrum Industries',   level:'normal', reward:80,
   desc:'El metal canta bajo tierra. Ferrum forja aleaciones… y rivales difíciles de romper.'},
  {icon:'🏔️', name:'Cumbres del Wolframio',corp:'Wolfram Defense',     level:'hard',   reward:95,
   desc:'En la montaña más dura, la compañía más dura. Su laboratorio funde a 3.400 grados.'},
  {icon:'☢️', name:'Desierto de Uranio',   corp:'RadCorp',             level:'hard',   reward:110,
   desc:'Un páramo que brilla de noche. RadCorp juega sucio: trae plomo si quieres sobrevivir.'},
  {icon:'🌆', name:'Helix City',           corp:'Helix Industries™',   level:'hard',   reward:150, boss:true,
   desc:'La torre de Helix corta el cielo. Arriba espera el Dr. Heisenberg IA… y la Molécula Maestra.'},
];

/* colección inicial: suficiente para jugar, pobre para ganar a todos */
const ADV_STARTER = {H:6,O:5,C:3,N:3,Na:2,Cl:2,S:2,Ca:2,K:1,Fe:1,Mg:1,He:1,Ne:1};
const ADV_START_COINS = 60;
const ADV_SAVE_KEY = 'bl-adventure';

let ADV = null;

/* ── persistencia ── */
function advSave(){
  try{ localStorage.setItem(ADV_SAVE_KEY, JSON.stringify({
    town:ADV.town, coins:ADV.coins, col:ADV.col, cleared:ADV.cleared, done:ADV.done
  })); }catch(e){}
}
function advLoad(){
  try{
    const s=JSON.parse(localStorage.getItem(ADV_SAVE_KEY));
    if(s&&s.col)return s;
  }catch(e){}
  return null;
}
function advNew(){
  ADV={town:0, coins:ADV_START_COINS, col:{...ADV_STARTER},
       cleared:ADV_TOWNS.map(()=>false), done:false,
       inBattle:false, duelTown:0, battleDeck:[], battleSpells:[], offers:[]};
  advSave();
}

/* ── entrada al modo ── */
function advEnter(){
  const s=advLoad();
  if(s){
    ADV={...s, inBattle:false, duelTown:0, battleDeck:[], battleSpells:[], offers:[]};
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

/* ── mapa ── */
function advRenderMap(){
  const path=document.getElementById('map-path');
  if(!path)return;
  document.getElementById('map-coins').textContent='🪙 '+ADV.coins;
  path.innerHTML='';
  ADV_TOWNS.forEach((t,i)=>{
    const cleared=ADV.cleared[i];
    const current=i===ADV.town&&!cleared;
    const locked=i>ADV.town;
    const node=document.createElement('button');
    node.className='map-node'+(cleared?' cleared':'')+(current?' current':'')+(locked?' locked':'');
    node.innerHTML=`<span class="mn-ico">${t.icon}</span>
      <span class="mn-body"><span class="mn-name">${t.name}</span>
      <span class="mn-corp">${cleared?'✔ superado':(locked?'🔒':'⚔️ '+t.corp)}</span></span>`;
    node.onclick=()=>{
      if(locked){toast('Gana el duelo anterior para avanzar');return;}
      advOpenTown(i);
    };
    path.appendChild(node);
    if(i<ADV_TOWNS.length-1){
      const seg=document.createElement('div');
      seg.className='map-seg'+(i<ADV.town||ADV.cleared[i]?' done':'');
      path.appendChild(seg);
    }
  });
}

/* ── pueblo ── */
function advOpenTown(i){
  ADV.duelTown=i;
  const t=ADV_TOWNS[i];
  document.getElementById('town-icon').textContent=t.icon;
  document.getElementById('town-name').textContent=t.name;
  document.getElementById('town-desc').textContent=t.desc;
  document.getElementById('town-coins').textContent='🪙 '+ADV.coins;
  const cleared=ADV.cleared[i];
  const duelBtn=document.getElementById('town-duel');
  duelBtn.innerHTML=cleared
    ?`⚔️ Re-duelo amistoso vs ${t.corp} <small>(recompensa ½)</small>`
    :`⚔️ Duelo vs ${t.corp}${t.boss?' — JEFE FINAL':''}`;
  advMakeOffers(i);
  showScreen('town');
}

/* ── tienda ── */
function advPrice(card){
  const isSpell=card.type==='spell'||card.type==='noble';
  if(isSpell){
    const w=getWeight(card.id);
    return 34+(7-Math.min(7,w))*6;   /* 34..70 según rareza */
  }
  const w=getWeight(card.id);
  return 6+(10-w)*3;                  /* común 6 … rarísimo 33 */
}
function advMakeOffers(townIdx){
  const offers=[];
  const used=new Set();
  let guard=0;
  while(offers.length<4&&guard++<60){
    const c=weightedRandom(ELEMENTS);
    if(used.has(c.id))continue;
    used.add(c.id);offers.push(c);
  }
  guard=0;
  while(offers.length<6&&guard++<40){
    const c=SPELLS[Math.floor(Math.random()*SPELLS.length)];
    if(used.has(c.id))continue;
    used.add(c.id);offers.push(c);
  }
  ADV.offers=offers.map(c=>({id:c.id,price:advPrice(c)}));
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
    grid.innerHTML='<div class="no-mol-msg">La tienda está vacía. Vuelve tras el próximo duelo.</div>';
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
  const i=ADV.duelTown;
  const t=ADV_TOWNS[i];
  if(advShuffledElements().length<8){
    toast('Necesitas al menos 8 cartas de elemento. ¡Pasa por la tienda!');
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

/* fin de duelo de aventura: recompensas y vuelta al mapa */
function advBattleEnd(winner){
  ADV.inBattle=false;
  const i=ADV.duelTown;
  const t=ADV_TOWNS[i];
  const won=winner===0;
  const wasCleared=ADV.cleared[i];
  const title=document.getElementById('rtitle');
  const sub=document.getElementById('rsub');
  const stats=document.getElementById('rstats');
  const btns=document.getElementById('result-btns');
  title.classList.remove('lose');

  if(won){
    const coins=wasCleared?Math.round(t.reward/2):t.reward;
    ADV.coins+=coins;
    /* botín: 2 cartas aleatorias (en pueblos altos puede caer hechizo) */
    const lootCards=[];
    for(let k=0;k<2;k++){
      const c=(i>=3&&Math.random()<.25)
        ?SPELLS[Math.floor(Math.random()*SPELLS.length)]
        :weightedRandom(ELEMENTS);
      ADV.col[c.id]=(ADV.col[c.id]||0)+1;
      lootCards.push(c.name);
    }
    if(!wasCleared){
      ADV.cleared[i]=true;
      if(i===ADV.town&&ADV.town<ADV_TOWNS.length-1)ADV.town++;
    }
    if(t.boss){
      ADV.done=true;
      title.textContent='🏆 ¡LA MOLÉCULA MAESTRA ES TUYA!';
      sub.textContent=`Has derrotado a ${t.corp} en lo alto de Helix City. La patente, el Nobel y la historia llevan tu nombre.`;
    } else {
      title.textContent='🏆 ¡Duelo ganado!';
      sub.textContent=`${t.corp} se rinde. El camino hacia ${ADV_TOWNS[Math.min(i+1,ADV_TOWNS.length-1)].name} queda abierto.`;
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
      <button class="btn sec" onclick="advAfterDuel()">🗺 Volver al mapa</button>`;
  } else {
    const fine=Math.min(10,ADV.coins);
    ADV.coins-=fine;
    title.textContent='💀 Derrota';
    title.classList.add('lose');
    sub.textContent=`${t.corp} te cierra el paso${fine?` y te requisa 🪙 ${fine}`:''}. Refuerza tu mazo en la tienda y vuelve.`;
    stats.innerHTML=`<div class="crow"><span>Tu bolsa</span><span class="cv">🪙 ${ADV.coins}</span></div>`;
    btns.innerHTML=`<button class="btn gold" onclick="advStartDuel()">⚔️ Reintentar</button>
      <button class="btn sec" onclick="advAfterDuel()">🗺 Volver al mapa</button>`;
    sfx.lose();
  }
  advSave();
  showScreen('result');
}
function advAfterDuel(){
  advRenderMap();
  showScreen('map');
}
