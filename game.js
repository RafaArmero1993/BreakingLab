/* ════════════════════════════════════════════════════════════════
   GAME ENGINE — BreakingLab
   VALID_MOLECULES, ELEMENTS, SPELLS  → game-data.js
   CARD_WEIGHTS                       → card-config.js
   AI, AI_LEVELS                      → ai-player.js

   SISTEMA DE TURNOS (v1.1)
   ────────────────────────
   Turnos alternos, empieza el jugador. En tu turno eliges UNA acción:
     ⚔️ Batallar — construyes una molécula y ataca inmediatamente.
     ✨ Hechizo  — juegas una carta de efecto (efectos por definir).
     🃏 Robar    — robas 2 cartas del mazo central.
   Tu molécula queda en tu zona como defensa. Al atacar:
     dmg = ATK atacante − DEF de la molécula rival (U ignora media DEF).
     dmg > 0  → la molécula rival se destruye y pierde 1 analista.
     dmg ≤ 0  → ataque bloqueado.
     Sin molécula rival → golpe directo: pierde 1 analista.
════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════
   SFX (WebAudio, sin assets)
════════════════════════════════ */
const sfx = (() => {
  let ctx = null;
  let muted = localStorage.getItem('bl-muted') === '1';

  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
    }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type='sine', vol=.12, when=0, slideTo=null){
    if(muted) return;
    const c = ac(); if(!c) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t0+dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0+.012);
    g.gain.exponentialRampToValueAtTime(.0001, t0+dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0+dur+.05);
  }
  return {
    get muted(){ return muted; },
    toggle(){ muted = !muted; localStorage.setItem('bl-muted', muted?'1':'0'); return muted; },
    unlock(){ ac(); },
    click(){ tone(740,.05,'square',.04); },
    select(){ tone(520,.07,'triangle',.08); tone(780,.07,'triangle',.06,.05); },
    draw(){ tone(300,.09,'triangle',.09); tone(420,.09,'triangle',.09,.07); },
    flip(){ tone(880,.1,'sine',.07,0,1320); },
    build(){ tone(523,.12,'triangle',.1); tone(659,.12,'triangle',.1,.09); tone(784,.2,'triangle',.12,.18); },
    spell(){ tone(980,.25,'sine',.1,0,1960); tone(490,.2,'triangle',.07,.05); },
    fire(){ tone(180,.5,'sawtooth',.09,0,60); },
    hit(){ tone(110,.3,'sawtooth',.16,0,40); tone(70,.35,'square',.1,.03,30); },
    block(){ tone(340,.18,'square',.1,0,220); tone(170,.22,'triangle',.08,.06); },
    win(){ [523,659,784,1047].forEach((f,i)=>tone(f,.22,'triangle',.13,i*.13)); },
    lose(){ [392,330,262,196].forEach((f,i)=>tone(f,.3,'triangle',.12,i*.16)); },
  };
})();

/* ════════════════════════════════
   HELPERS — moléculas
════════════════════════════════ */
function sortIds(arr){ return [...arr].sort(); }
function matchMol(elems){
  const ids = sortIds(elems.map(e=>e.id));
  const key = ids.join(',');
  return VALID_MOLECULES.find(m => sortIds(m.ids).join(',') === key) || null;
}

function usableIds(selectedIds, handIds){
  if(selectedIds.includes('U')) return new Set();
  const useful = new Set();
  if(selectedIds.length === 0 && handIds && handIds.includes('U')) useful.add('U');
  const avail = handIds ? [...handIds] : [];
  for(const id of selectedIds){ const i=avail.indexOf(id); if(i>-1) avail.splice(i,1); }
  /* prefijo ordenado: selectedIds debe ser prefijo exacto de mol.ids */
  for(const mol of VALID_MOLECULES){
    const molIds = mol.ids;
    if(molIds.length <= selectedIds.length) continue;
    let isPrefix = true;
    for(let i=0;i<selectedIds.length;i++){
      if(molIds[i] !== selectedIds[i]){ isPrefix=false; break; }
    }
    if(!isPrefix) continue;
    const nextId = molIds[selectedIds.length];
    if(avail.includes(nextId)) useful.add(nextId);
  }
  return useful;
}

function handUsableIds(hand){
  const useful=new Set();
  const handIds=hand.map(e=>e.id);
  if(handIds.includes('U'))useful.add('U');
  for(const mol of VALID_MOLECULES){
    const needed=[...mol.ids],avail=[...handIds];
    let ok=true;
    for(const id of needed){const i=avail.indexOf(id);if(i===-1){ok=false;break;}avail.splice(i,1);}
    if(ok)mol.ids.forEach(id=>useful.add(id));
  }
  return useful;
}

function canFormAnyMol(hand){
  const handIds = hand.map(e=>e.id);
  if(handIds.includes('U')) return true;
  for(const mol of VALID_MOLECULES){
    const needed=[...mol.ids], avail=[...handIds];
    let ok=true;
    for(const id of needed){const i=avail.indexOf(id);if(i===-1){ok=false;break;}avail.splice(i,1);}
    if(ok) return true;
  }
  return false;
}

function buildMol(elems){
  const m = matchMol(elems);
  const bA = elems.reduce((s,x)=>s+x.atk,0);
  const bD = elems.reduce((s,x)=>s+x.def,0);
  const hasU = elems.some(x=>x.id==='U');
  if(m) return {name:m.name,formula:m.formula,atk:m.atk,def:m.def,combo:true,hasU,valid:true};
  if(elems.length===1 && hasU) return {name:'Uranio',formula:'U',atk:bA,def:bD,combo:false,hasU,valid:true};
  return {name:'Compuesto',formula:elems.map(x=>x.sym).join(''),atk:bA,def:bD,combo:false,hasU,valid:false};
}

/* ════════════════════════════════
   WEIGHTED RANDOM
════════════════════════════════ */
function getWeight(id){
  if(typeof CARD_WEIGHTS !== 'undefined' && CARD_WEIGHTS[id] != null) return CARD_WEIGHTS[id];
  return 1;
}
function weightedRandom(pool){
  const total = pool.reduce((s,c)=>s+getWeight(c.id),0);
  let r = Math.random()*total;
  for(const c of pool){ r-=getWeight(c.id); if(r<=0) return c; }
  return pool[pool.length-1];
}

/* ════════════════════════════════
   STATE
════════════════════════════════ */
const MAX_AN=5;
const HAND_MAX=8;
let G={};
let _mode={vsAI:true, level:'normal'};

function initState(n1,n2){
  G={names:[n1||'J1',n2||'J2'],an:[MAX_AN,MAX_AN],
     hands:[[],[]],spells:[[],[]],deckSize:[6,6],sharedDeck:32,discardSize:0,
     build:[],mols:[null,null],molCards:[[],[]],
     spellsInArena:[[],[]],selSpell:null,
     turn:0,turnCount:0,busy:false,phase:'turn_p1',
     vsAI:false,aiLevel:'normal',aiAvatar:'🤖',
     stats:{turns:0,anLost:[0,0],spells:0}};
  dealHand(0);dealHand(1);
}

function rand(a){return a[Math.floor(Math.random()*a.length)];}

/* 5 elementos + 1 hechizo = 6 cartas (con pesos, duplicados permitidos) */
function dealHand(p){
  G.hands[p]=[];
  for(let i=0;i<5;i++) G.hands[p].push({...weightedRandom(ELEMENTS)});
  G.spells[p]=[{...weightedRandom(SPELLS)}];
  G.deckSize[p]=G.hands[p].length+G.spells[p].length;
}

/* Roba n cartas del mazo central. Si se agota, se rebaraja el descarte. */
function sharedDeckTake(p,n){
  for(let i=0;i<n;i++){
    if(G.hands[p].length>=HAND_MAX) break;
    if(G.sharedDeck<=0){
      G.sharedDeck=Math.max(12,G.discardSize);
      G.discardSize=0;
    }
    G.sharedDeck--;
    G.hands[p].push({...weightedRandom(ELEMENTS)});
  }
}

/* ════════════════════════════════
   CARD BUILDERS
════════════════════════════════ */
/* Color neón por elemento (inspirado en CPK) */
const ELEMENT_COLORS={
  H:'#7dd3fc', O:'#fb7185', N:'#60a5fa', C:'#e2e8f0',
  S:'#facc15', P:'#fb923c', U:'#4ade80', Pb:'#94a3b8', He:'#fbbf24',
};
function elColor(id){ return ELEMENT_COLORS[id] || '#7c8cff'; }

function imgH(src,alt){
  return `<div class="ec-img"><img src="${src}" alt="${alt}" onerror="this.parentNode.innerHTML='<b style=&quot;font-size:1.3rem;color:var(--txt)&quot;>${alt}</b>'"/></div>`;
}

function makeElemCard(card,p,inBuild,dimmed){
  const isSpell=card.type==='spell'||card.type==='noble';
  const fc=isSpell?'cf-gold':'';
  const cc=isSpell?'trao':'tnm';
  const cl=isSpell?'Efecto':card.name;
  const w=document.createElement('div');
  w.className='card clickable'+(inBuild?' sel':'')+(dimmed?' dimmed':'');
  const col=elColor(card.id);
  w.style.setProperty('--el',col);
  w.style.setProperty('--elg',col+'59');
  w.innerHTML=`<div class="card-flip"><div class="card-inner">
    <div class="card-face card-front ${fc}">
      <div class="ec-tl">${card.num}</div>
      <div class="ec-tr">${isSpell?'':`<span class="ec-a">🗡${card.atk}</span><span class="ec-d">🛡${card.def}</span>`}</div>
      <div class="ec-sym">${imgH(card.img,card.sym)}</div>
      <div class="ec-body">
        <div class="ec-chip ${cc}">${cl}</div>
        <div class="ec-eff">${card.eff}</div>
        <div class="ec-info">${card.info}</div>
      </div>
    </div>
    <div class="card-face card-back"></div>
  </div></div>`;
  if(!isSpell) w.onclick=()=>toggleSelect(card,p);
  addLongPress(w,()=>showZoom(card));
  return w;
}

function makeAnalystCard(p,idx,alive){
  const w=document.createElement('div');
  w.className='card';
  const opacity=alive?'1':'.45';
  const filter=alive?'none':'grayscale(.85) brightness(.6)';
  w.innerHTML=`<div style="width:100%;height:100%;border-radius:var(--cr);overflow:hidden;opacity:${opacity};filter:${filter};transition:opacity .4s,filter .4s;border:1px solid ${alive?(p===0?'rgba(34,211,238,.5)':'rgba(251,113,133,.5)'):'rgba(124,140,255,.2)'}">
    <img src="img/analista.png" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.innerHTML='<div style=&quot;width:100%;height:100%;background:#1b2348;border-radius:var(--cr);display:flex;align-items:center;justify-content:center;font-size:1.4rem&quot;>${alive?'🧪':'💀'}</div>'">
  </div>${alive?'':'<div class="analyst-dead-skull">💀</div>'}`;
  return w;
}

function makePDeck(p){
  const d=document.createElement('div');
  d.className='pdeck';
  if(G.vsAI&&p===1){
    d.classList.add('noclick');
    d.title='Mazo rival';
  } else {
    d.title='Ver mazo';
    d.onclick=()=>onDeckClick(p);
  }
  d.innerHTML=`<div class="pdeck-cnt" id="pcnt${p}">${G.hands[p].length+G.spells[p].length}</div>
    <div class="pdeck-lbl">Mazo</div>`;
  return d;
}

/* ════════════════════════════════
   RENDER
════════════════════════════════ */
function renderStrip(p){
  const n=p+1;
  const row=document.getElementById('astrip'+n);
  row.innerHTML='';
  const lbl=document.createElement('div');
  lbl.className='pname-lbl c'+n+((!G.vsAI&&p===1)?' flipped-lbl':'');
  lbl.textContent=(G.vsAI&&p===1?G.aiAvatar+' ':'')+G.names[p];
  row.appendChild(lbl);
  const anWrap=document.createElement('div');anWrap.className='analysts';
  for(let i=0;i<MAX_AN;i++) anWrap.appendChild(makeAnalystCard(p,i,i<G.an[p]));
  row.appendChild(anWrap);
  row.appendChild(makePDeck(p));
}

function renderDecks(){
  for(let p=0;p<2;p++){
    G.deckSize[p]=G.hands[p].length+G.spells[p].length;
    const el=document.getElementById('pcnt'+p);
    if(el)el.textContent=G.deckSize[p];
  }
  document.getElementById('disc-cnt').textContent=G.discardSize;
  document.getElementById('shared-cnt').textContent=G.sharedDeck;
  const discImg=document.querySelector('.cpile.disc img');
  if(discImg)discImg.style.display=G.discardSize>0?'':'none';
}

/* El placeholder de zona solo se ve si no hay NI molécula NI hechizos */
function updateZoneEmpty(p){
  const empty=document.getElementById('zempty'+(p+1));
  if(!empty)return;
  const occupied=(G.molCards[p]&&G.molCards[p].length)||(G.spellsInArena[p]&&G.spellsInArena[p].length);
  empty.style.display=occupied?'none':'';
}

function setZoneHints(){
  const z1=document.getElementById('zempty1');
  const z2=document.getElementById('zempty2');
  const t=G.turn;
  if(z1)z1.textContent=t===0?'⚔️ tu turno — elige una acción':'esperando…';
  if(z2)z2.textContent=t===1?(G.vsAI?'🤖 turno del rival':'⚔️ turno de '+G.names[1]):'esperando…';
  updateZoneEmpty(0);updateZoneEmpty(1);
}

/* Cartas-elemento en la arena.
   cards    = array de cartas (vacío = placeholder).
   revealed = true → caras visibles + badge de molécula. */
function renderStack(p,cards,revealed){
  revealed=!!revealed;
  const n=p+1;
  const stack=document.getElementById('stack'+n);
  if(!cards||!cards.length){
    stack.style.display='none';
    stack.innerHTML='';
    updateZoneEmpty(p);
    return;
  }
  stack.style.display='';
  stack.innerHTML='';
  stack.style.cssText='display:flex;gap:.3rem;align-items:flex-end;justify-content:center;flex-wrap:wrap;padding:.3rem .4rem .1rem;height:auto;';

  cards.forEach((card,i)=>{
    const w=makeElemCard(card,p,false,false);
    w.onclick=null; /* quita el toggleSelect de makeElemCard */
    if(!revealed){
      w.classList.remove('clickable');
      const flip=w.querySelector('.card-flip');
      if(flip)flip.classList.add('flipped');
    } else {
      w.classList.add('clickable');
      w.onclick=()=>showZoom(card);
    }
    addMarco(w);
    addLongPress(w,()=>showZoom(card));
    stack.appendChild(w);
  });

  if(revealed && G.mols[p]){
    const badge=document.createElement('div');
    badge.className='mol-badge';
    badge.textContent=`${G.mols[p].formula} 🗡${G.mols[p].atk} 🛡${G.mols[p].def}`;
    stack.appendChild(badge);
  }
  updateZoneEmpty(p);
}

/* Voltea las cartas de la zona una a una y llama a cb al terminar */
function flipZone(p,cb){
  const cards=G.molCards[p];
  if(!cards||!cards.length){cb&&cb();return;}
  renderStack(p,cards,false);
  const stack=document.getElementById('stack'+(p+1));
  if(!stack){cb&&cb();return;}
  const flips=stack.querySelectorAll('.card-flip');
  flips.forEach((flip,i)=>{
    setTimeout(()=>{flip.classList.remove('flipped');sfx.flip();}, i*420);
  });
  setTimeout(()=>{
    renderStack(p,cards,true);
    cb&&cb();
  }, flips.length*420+450);
}

function renderZoneSpells(p){
  const zs=document.getElementById('zspells'+(p+1));
  if(!zs)return;
  zs.innerHTML='';
  (G.spellsInArena[p]||[]).forEach(sp=>{
    const el=makeElemCard(sp,p,false,false);
    el.classList.remove('clickable','dimmed');
    addMarco(el);
    addLongPress(el,()=>showZoom(sp));
    zs.appendChild(el);
  });
  updateZoneEmpty(p);
}

/* ── Paginación de la mano ── */
let handPage=0;
const HAND_PAGE=6;

function scrollHand(dir){
  handPage+=dir;
  renderHand(G.turn);
}

function renderHand(p){
  const selectedIds=G.build.map(e=>e.id);
  const handIds=G.hands[p].map(e=>e.id);
  const useful=usableIds(selectedIds,handIds);
  const handUseful=handUsableIds(G.hands[p]);
  const hasElemSel=G.build.length>0;
  const canForm=canFormAnyMol(G.hands[p]);

  document.getElementById('no-mol-msg').style.display=canForm?'none':'';

  const allCards=[...G.hands[p],...G.spells[p]];
  const needsPaging=allCards.length>HAND_PAGE;
  const maxPage=Math.max(0,Math.ceil(allCards.length/HAND_PAGE)-1);
  handPage=Math.min(Math.max(0,handPage),maxPage);
  const start=handPage*HAND_PAGE;
  const pageCards=needsPaging?allCards.slice(start,start+HAND_PAGE):allCards;

  const prevBtn=document.getElementById('hand-prev');
  const nextBtn=document.getElementById('hand-next');
  if(prevBtn)prevBtn.style.visibility=(needsPaging&&handPage>0)?'visible':'hidden';
  if(nextBtn)nextBtn.style.visibility=(needsPaging&&handPage<maxPage)?'visible':'hidden';

  const hc=document.getElementById('hand-cards');hc.innerHTML='';

  pageCards.forEach(card=>{
    const isSpell=card.type==='spell'||card.type==='noble';
    if(isSpell){
      /* hechizos se juegan con la acción ✨ Hechizo — atenuados aquí */
      const el=makeElemCard(card,p,false,true);
      addMarco(el);
      hc.appendChild(el);
    } else {
      const inBuild=G.build.includes(card);
      let dimmed;
      if(hasElemSel) dimmed=!inBuild&&!useful.has(card.id);
      else dimmed=!handUseful.has(card.id);
      const el=makeElemCard(card,p,inBuild,dimmed);
      addMarco(el);
      hc.appendChild(el);
    }
  });

  const confirmBtn=document.getElementById('btn-confirm');
  const prev=document.getElementById('mprev');
  const stats=document.getElementById('build-stats');
  if(!hasElemSel){
    confirmBtn.disabled=true;confirmBtn.style.opacity='.45';
    prev.textContent='';prev.className='mprev';
    if(stats)stats.innerHTML='';
  } else {
    const pv=buildMol(G.build);
    if(stats)stats.innerHTML=
      `<span style="color:var(--red);font-weight:900;font-size:.8rem">🗡${pv.atk}</span> `+
      `<span style="color:var(--ok);font-weight:900;font-size:.8rem">🛡${pv.def}</span>`;
    if(pv.valid){
      confirmBtn.disabled=false;confirmBtn.style.opacity='1';
      prev.className='mprev valid';
      prev.textContent=`✅ ${pv.formula}`;
    } else {
      confirmBtn.disabled=true;confirmBtn.style.opacity='.45';
      prev.className='mprev';
      prev.textContent='';
    }
  }
}

function toggleSelect(card,p){
  const idx=G.build.indexOf(card);
  if(idx>-1) G.build.splice(idx); /* quita esta carta y las posteriores (prefijo válido) */
  else G.build.push(card);
  sfx.select();
  renderHand(p);
}

/* ════════════════════════════════
   ACCIONES DEL TURNO
════════════════════════════════ */
function isHumanTurn(){
  if(G.busy)return false;
  if(G.vsAI&&G.turn===1)return false;
  return true;
}

function updateActionBar(){
  const enabled=isHumanTurn()&&!G.busy;
  const b1=document.getElementById('ab-battle');
  const b2=document.getElementById('ab-spell');
  const b3=document.getElementById('ab-draw');
  if(!b1)return;
  b1.disabled=!enabled;
  b2.disabled=!enabled||!G.spells[G.turn]||!G.spells[G.turn].length;
  b3.disabled=!enabled;
  setZoneHints();
}

function actionBattle(){
  if(!isHumanTurn())return;
  G.build=[];
  handPage=0;
  renderHand(G.turn);
  document.getElementById('build-panel').classList.add('open');
}

function actionSpell(){
  if(!isHumanTurn())return;
  const p=G.turn;
  if(!G.spells[p].length){toast('No tienes cartas de efecto');return;}
  openSpellPanel(p);
}

function actionDraw(){
  if(!isHumanTurn())return;
  const p=G.turn;
  G.busy=true;
  sharedDeckTake(p,2);
  sfx.draw();
  renderDecks();
  toast('🃏 Robas 2 cartas');
  setTimeout(()=>{endTurn();},700);
}

function onDeckClick(p){
  if(G.vsAI&&p===1)return;
  if(p!==G.turn||!isHumanTurn())return;
  actionBattle();
}

function cancelBuild(){
  G.build=[];
  document.getElementById('build-panel').classList.remove('open');
}

/* ── Batallar ── */
function confirmBuild(){
  if(!isHumanTurn())return;
  if(!G.build.length)return;
  const mol=buildMol(G.build);
  if(!mol.valid)return;
  G._pendingBuild={mol,p:G.turn};
  document.getElementById('mc-formula').textContent=mol.formula;
  document.getElementById('mc-name').textContent=mol.name;
  document.getElementById('mc-atk').textContent=`🗡 ${mol.atk}`;
  document.getElementById('mc-def').textContent=`🛡 ${mol.def}`;
  document.getElementById('ov-mol-confirm').classList.add('open');
}

function executeBuild(){
  document.getElementById('ov-mol-confirm').classList.remove('open');
  const {mol,p}=G._pendingBuild;
  placeMolecule(p,mol,[...G.build]);
  G.build=[];
  document.getElementById('build-panel').classList.remove('open');
  sfx.build();
  G.busy=true;
  updateActionBar();
  /* voltea las cartas y lanza la batalla */
  flipZone(p,()=>setTimeout(()=>battle(p),350));
}

/* Coloca una molécula en la zona de p (la anterior va al descarte) */
function placeMolecule(p,mol,cards){
  if(G.molCards[p].length) G.discardSize+=G.molCards[p].length;
  G.mols[p]=mol;
  G.molCards[p]=cards;
  cards.forEach(c=>{const i=G.hands[p].indexOf(c);if(i>-1)G.hands[p].splice(i,1);});
  renderStack(p,cards,false);
  renderDecks();
}

/* ── Hechizo ── */
function openSpellPanel(p){
  G.selSpell=null;
  const castBtn=document.getElementById('btn-cast-panel');
  castBtn.disabled=true;castBtn.style.opacity='.45';
  const _nameColor=p===0?'var(--acc)':'var(--red)';
  document.getElementById('sp-panel-title').innerHTML=
    `<span style="color:${_nameColor};font-weight:800;font-size:.9rem">✨ ${G.names[p]}</span>`;
  const hand=document.getElementById('sp-hand');hand.innerHTML='';
  G.spells[p].forEach(sp=>{
    const el=makeElemCard(sp,p,false,false);
    el.onclick=()=>{
      G.selSpell=sp.id;
      sfx.select();
      hand.querySelectorAll('.card').forEach(c=>c.classList.remove('sel'));
      el.classList.add('sel');
      castBtn.disabled=false;castBtn.style.opacity='1';
    };
    addMarco(el);
    hand.appendChild(el);
  });
  document.getElementById('spell-panel').classList.add('open');
}

function closeSpellPanelOnly(){
  document.getElementById('spell-panel').classList.remove('open');
}

/* ⚠️ Los efectos de los hechizos están pendientes de diseño: jugar la
   carta la muestra en la arena y la descarta, pero NO altera el combate.
   Cuando se definan los efectos, implementarlos aquí. */
function doCastSpell(p,id){
  const sp=G.spells[p].find(s=>s.id===id);if(!sp)return false;
  G.spells[p]=G.spells[p].filter(s=>s.id!==id);
  G.discardSize++;G.stats.spells++;
  G.spellsInArena[p].push(sp);
  sfx.spell();
  renderZoneSpells(p);
  renderDecks();
  return true;
}

function castSpell(){
  if(!G.selSpell)return;
  const p=G.turn;
  document.getElementById('spell-panel').classList.remove('open');
  if(!doCastSpell(p,G.selSpell))return;
  G.selSpell=null;
  G.busy=true;
  updateActionBar();
  setTimeout(()=>endTurn(),800);
}

/* ════════════════════════════════
   BATALLA
════════════════════════════════ */
function battle(p){
  const e=1-p;
  const mol=G.mols[p];
  if(!mol){endTurn();return;}
  if(G.mols[e]){
    const defV=mol.hasU?Math.floor(G.mols[e].def/2):G.mols[e].def;
    const dmg=mol.atk-defV;
    if(dmg>0){
      animateBattle(p,e,'break',()=>{
        destroyStack(e,()=>{
          loseAnalyst(e);
          afterBattle();
        });
      });
    } else {
      animateBattle(p,e,'blocked',()=>afterBattle());
    }
  } else {
    animateBattle(p,e,'direct',()=>{
      loseAnalyst(e);
      afterBattle();
    });
  }
}

function loseAnalyst(p){
  G.an[p]=Math.max(0,G.an[p]-1);
  G.stats.anLost[p]++;
  renderStrip(p);
}

function afterBattle(){
  if(G.an[0]<=0||G.an[1]<=0){setTimeout(endGame,900);return;}
  setTimeout(()=>endTurn(),500);
}

function endTurn(){
  G.busy=false;
  G.stats.turns++;
  beginTurn(1-G.turn);
}

/* ── VFX de batalla: las cartas luchan ── */
function _analystTarget(p){
  const strip=document.getElementById('astrip'+(p+1));
  if(!strip)return null;
  const cards=strip.querySelectorAll('.analysts .card');
  return cards[Math.max(0,G.an[p]-1)]||cards[cards.length-1]||null;
}

function screenFlash(){
  const f=document.getElementById('flash');
  if(!f)return;
  f.style.opacity='.55';
  setTimeout(()=>{f.style.opacity='0';},120);
}

function shakeTable(){
  const table=document.getElementById('game-table');
  if(!table)return;
  table.classList.remove('shake');void table.offsetWidth;table.classList.add('shake');
}

function spawnSparks(x,y,color){
  for(let i=0;i<18;i++){
    const s=document.createElement('div');
    s.className='spark';
    const sz=4+Math.random()*7;
    s.style.cssText=`width:${sz}px;height:${sz}px;left:${x-sz/2}px;top:${y-sz/2}px;
      background:radial-gradient(circle,#fff 0%,${color} 60%,transparent 100%);
      box-shadow:0 0 8px ${color};`;
    document.body.appendChild(s);
    const ang=Math.random()*Math.PI*2;
    const dist=40+Math.random()*110;
    s.getBoundingClientRect();
    s.style.transition=`transform ${.45+Math.random()*.35}s ease-out, opacity .6s ease-out`;
    s.style.transform=`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px) scale(.2)`;
    s.style.opacity='0';
    setTimeout(()=>s.remove(),900);
  }
}

function shieldRing(x,y){
  const r=document.createElement('div');
  r.className='shield-ring';
  r.style.left=x+'px';r.style.top=y+'px';
  document.body.appendChild(r);
  setTimeout(()=>r.remove(),700);
}

function dmgPop(x,y,txt,color){
  const d=document.createElement('div');
  d.className='dmg-pop';
  d.textContent=txt;
  d.style.left=x+'px';d.style.top=y+'px';
  d.style.color=color;
  d.style.textShadow=`0 0 18px ${color}`;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),1400);
}

/* La pila atacante embiste contra el objetivo, impacto con chispas,
   flash, temblor y popup de daño. kind: 'break'|'blocked'|'direct'. */
function animateBattle(atkP,defP,kind,done){
  const atkStack=document.getElementById('stack'+(atkP+1));
  const target=kind==='direct'?_analystTarget(defP):document.getElementById('stack'+(defP+1));
  if(!atkStack||!target){finishImpact();return;}

  const a=atkStack.getBoundingClientRect();
  const t=target.getBoundingClientRect();
  const dx=(t.left+t.width/2)-(a.left+a.width/2);
  const dy=(t.top+t.height/2)-(a.top+a.height/2);
  const ix=t.left+t.width/2, iy=t.top+t.height/2;
  const color=atkP===0?'#22d3ee':'#fb7185';

  sfx.fire();
  atkStack.style.position='relative';
  atkStack.style.zIndex='540';
  atkStack.style.transition='transform .55s cubic-bezier(.5,-.25,.75,1)';
  atkStack.style.transform=`translate(${dx*.9}px,${dy*.9}px) scale(1.08) rotate(${atkP===0?-5:5}deg)`;

  setTimeout(()=>{
    /* impacto */
    screenFlash();
    shakeTable();
    spawnSparks(ix,iy,color);
    if(kind==='blocked'){
      sfx.block();
      shieldRing(ix,iy);
      dmgPop(ix,iy-30,'🛡 ¡BLOQUEADO!','#7dd3fc');
    } else if(kind==='direct'){
      sfx.hit();
      dmgPop(ix,iy-30,'💥 ¡GOLPE DIRECTO!','#fb7185');
    } else {
      sfx.hit();
      dmgPop(ix,iy-30,'💥 −1 ANALISTA','#fb7185');
    }
    /* vuelta a casa */
    setTimeout(()=>{
      atkStack.style.transition='transform .4s ease';
      atkStack.style.transform='';
      setTimeout(()=>{
        atkStack.style.zIndex='';
        finishImpact();
      },430);
    },600);
  },560);

  function finishImpact(){done&&done();}
}

/* Explosión de la molécula destruida */
function destroyStack(p,cb){
  const stack=document.getElementById('stack'+(p+1));
  if(stack){
    const r=stack.getBoundingClientRect();
    spawnSparks(r.left+r.width/2,r.top+r.height/2,'#fbbf24');
    stack.querySelectorAll('.card').forEach(c=>c.classList.add('blasted'));
  }
  setTimeout(()=>{
    G.discardSize+=G.molCards[p].length;
    G.mols[p]=null;
    G.molCards[p]=[];
    renderStack(p,[],false);
    renderDecks();
    cb&&cb();
  },620);
}

/* ════════════════════════════════
   TABLE SWAP (solo 2 jugadores)
════════════════════════════════ */
function rotateTable(toP2){
  if(G.vsAI)return; /* contra la máquina el jugador siempre está abajo */
  const table=document.getElementById('game-table');
  const arena=document.querySelector('.arena');
  if(toP2){
    table.insertBefore(document.getElementById('astrip1'),table.firstElementChild);
    table.appendChild(document.getElementById('astrip2'));
    arena.insertBefore(document.getElementById('pzone1'),arena.firstElementChild);
    arena.appendChild(document.getElementById('pzone2'));
  } else {
    table.insertBefore(document.getElementById('astrip2'),table.firstElementChild);
    table.appendChild(document.getElementById('astrip1'));
    arena.insertBefore(document.getElementById('pzone2'),arena.firstElementChild);
    arena.appendChild(document.getElementById('pzone1'));
  }
}

/* ════════════════════════════════
   UI FEEDBACK — toast & banner IA
════════════════════════════════ */
let _toastT=null;
function toast(msg,ms){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(_toastT);
  _toastT=setTimeout(()=>el.classList.remove('show'),ms||1800);
}

let _bannerT=null;
function showAIBanner(msg,autoHide){
  const el=document.getElementById('ai-banner');
  el.innerHTML=autoHide?msg:msg+'<span class="dots"></span>';
  el.classList.add('show');
  clearTimeout(_bannerT);
  if(autoHide)_bannerT=setTimeout(()=>el.classList.remove('show'),autoHide);
}
function hideAIBanner(){
  clearTimeout(_bannerT);
  document.getElementById('ai-banner').classList.remove('show');
}

/* ════════════════════════════════
   GAME FLOW
════════════════════════════════ */
function showPassScreen(toP){
  const nameEl=document.getElementById('pass-name');
  nameEl.textContent=G.names[toP];
  document.getElementById('pass-h').textContent='Pasa el dispositivo';
  rotateTable(toP===1);
  setTimeout(()=>showScreen('pass'),200);
}

function beginTurn(p){
  G.turn=p;
  G.phase='turn_p'+(p+1);
  G.turnCount++;

  /* mantenimiento: roba 1 carta automática (salvo los 2 primeros turnos),
     repone hechizo si no queda ninguno y limpia hechizos de la arena */
  if(G.turnCount>2) sharedDeckTake(p,1);
  if(!G.spells[p].length) G.spells[p]=[{...weightedRandom(SPELLS)}];
  if(G.spellsInArena[p].length){G.spellsInArena[p]=[];renderZoneSpells(p);}
  renderDecks();

  if(G.vsAI){
    showScreen('game');
    updateActionBar();
    if(p===1) setTimeout(aiTakeTurn,600);
    else { hideAIBanner(); toast('🧪 Tu turno'); }
  } else {
    updateActionBar();
    showPassScreen(p);
  }
}

function resumePass(){
  showScreen('game');
  updateActionBar();
  toast('⚔️ Turno de '+G.names[G.turn]);
}

function chooseMode(vsAI){
  _mode.vsAI=vsAI;
  document.getElementById('setup-title').textContent=vsAI?'Tu Laboratorio':'Registro de Laboratorios';
  document.getElementById('wrap-p2').style.display=vsAI?'none':'';
  document.getElementById('diff-wrap').style.display=vsAI?'':'none';
  document.getElementById('setup-error').textContent='';
  if(vsAI)setLevel(_mode.level||'normal');
  showScreen('setup');
}

function setLevel(l){
  _mode.level=l;
  document.querySelectorAll('.diff-chip').forEach(c=>c.classList.toggle('sel',c.dataset.level===l));
  document.getElementById('diff-desc').textContent=AI_LEVELS[l].desc;
}

function startGame(){
  const n1=document.getElementById('inp-p1').value.trim()||'Tú';
  let n2;
  const err=document.getElementById('setup-error');
  if(_mode.vsAI){
    n2=AI_LEVELS[_mode.level].name;
  } else {
    const v1=document.getElementById('inp-p1').value.trim();
    n2=document.getElementById('inp-p2').value.trim();
    if(!v1||!n2){err.textContent='Ambos laboratorios deben tener nombre.';return;}
    if(v1.toLowerCase()===n2.toLowerCase()){err.textContent='Los nombres no pueden ser iguales.';return;}
  }
  err.textContent='';
  initState(n1,n2);
  G.vsAI=_mode.vsAI;
  if(G.vsAI){
    G.aiLevel=_mode.level;
    G.aiAvatar=AI_LEVELS[_mode.level].emoji;
  }
  _bootTable();
  beginTurn(0); /* el primer turno es siempre del jugador */
}

function rematch(){
  const cfg={vsAI:G.vsAI,aiLevel:G.aiLevel,aiAvatar:G.aiAvatar,names:[...G.names]};
  initState(cfg.names[0],cfg.names[1]);
  G.vsAI=cfg.vsAI;G.aiLevel=cfg.aiLevel;G.aiAvatar=cfg.aiAvatar;
  _bootTable();
  beginTurn(0);
}

function _bootTable(){
  showScreen('game');
  rotateTable(false);
  renderStrip(0);renderStrip(1);renderDecks();
  renderStack(0,[],false);renderStack(1,[],false);
  document.getElementById('zspells1').innerHTML='';
  document.getElementById('zspells2').innerHTML='';
  setZoneHints();
}

/* ════════════════════════════════
   AI TURN
════════════════════════════════ */
function aiTakeTurn(){
  showAIBanner(`${G.aiAvatar} ${G.names[1]} está pensando`);
  const delay=900+Math.random()*1100;
  setTimeout(()=>{
    const choice=AI.chooseAction(G);
    G.busy=true;
    if(choice.action==='battle'){
      const mol=buildMol(choice.cards);
      placeMolecule(1,mol,[...choice.cards]);
      sfx.build();
      showAIBanner(`${G.aiAvatar} ${G.names[1]} ataca con ${mol.formula} ⚔️`,2200);
      flipZone(1,()=>setTimeout(()=>battle(1),350));
    } else if(choice.action==='spell'){
      const sp=G.spells[1].find(s=>s.id===choice.id);
      showAIBanner(`${G.aiAvatar} ${G.names[1]} juega ${sp?sp.name:choice.id} ✨`,1700);
      doCastSpell(1,choice.id);
      setTimeout(()=>endTurn(),1000);
    } else {
      sharedDeckTake(1,2);
      sfx.draw();
      renderDecks();
      showAIBanner(`${G.aiAvatar} ${G.names[1]} roba 2 cartas 🃏`,1500);
      setTimeout(()=>endTurn(),1000);
    }
  },delay);
}

/* ════════════════════════════════
   END GAME
════════════════════════════════ */
function endGame(){
  hideAIBanner();
  const w=G.an[0]>0?0:(G.an[1]>0?1:-1);
  const title=document.getElementById('rtitle');
  const sub=document.getElementById('rsub');
  title.classList.remove('lose');
  if(w===-1){
    title.textContent='🤝 ¡Empate!';
    sub.textContent='Ambos equipos de analistas han caído.';
  } else if(G.vsAI){
    if(w===0){
      title.textContent='🏆 ¡Victoria!';
      sub.textContent=`Has derrotado a ${G.names[1]}. ¡El Nobel es tuyo!`;
    } else {
      title.textContent='💀 Derrota';
      title.classList.add('lose');
      sub.textContent=`${G.names[1]} ha desmantelado tu laboratorio. ¡Revancha!`;
    }
  } else {
    title.textContent=`🏆 ¡${G.names[w]} gana!`;
    sub.textContent=`Los analistas de ${G.names[1-w]} han sido eliminados del laboratorio.`;
  }
  document.getElementById('rstats').innerHTML=`
    <div class="crow"><span>Turnos jugados</span><span class="cv">${G.stats.turns}</span></div>
    <div class="crow"><span>Analistas perdidos ${G.names[0]}</span><span class="cv bad">${G.stats.anLost[0]}</span></div>
    <div class="crow"><span>Analistas perdidos ${G.names[1]}</span><span class="cv bad">${G.stats.anLost[1]}</span></div>
    <div class="crow"><span>Efectos jugados</span><span class="cv">${G.stats.spells}</span></div>
    <div class="crow"><span>Analistas restantes ${G.names[0]}</span><span class="cv ${G.an[0]>0?'':'bad'}">${G.an[0]}</span></div>
    <div class="crow"><span>Analistas restantes ${G.names[1]}</span><span class="cv ${G.an[1]>0?'':'bad'}">${G.an[1]}</span></div>`;
  showScreen('result');
  const playerWon = w===0 || (!G.vsAI && w===1);
  if(playerWon){ sfx.win(); launchConfetti(); }
  else if(w===-1){ sfx.draw(); }
  else { sfx.lose(); }
}

/* ── Confetti ── */
function launchConfetti(){
  const cv=document.getElementById('confetti');
  if(!cv)return;
  const ctx=cv.getContext('2d');
  if(!ctx)return;
  cv.width=innerWidth;cv.height=innerHeight;
  const colors=['#22d3ee','#a78bfa','#f472b6','#fbbf24','#34d399','#fb7185'];
  const parts=Array.from({length:140},()=>({
    x:Math.random()*cv.width, y:-20-Math.random()*cv.height*.5,
    w:5+Math.random()*7, h:8+Math.random()*8,
    vy:2+Math.random()*3.5, vx:-1.5+Math.random()*3,
    rot:Math.random()*Math.PI, vr:-.15+Math.random()*.3,
    c:colors[Math.floor(Math.random()*colors.length)],
  }));
  let frames=0;
  function step(){
    ctx.clearRect(0,0,cv.width,cv.height);
    for(const p of parts){
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    frames++;
    if(frames<260)requestAnimationFrame(step);
    else ctx.clearRect(0,0,cv.width,cv.height);
  }
  requestAnimationFrame(step);
}

function addMarco(el){
  const m=document.createElement('img');
  m.src='img/marco.png';
  m.className='marco';
  m.onerror=()=>m.remove();
  el.appendChild(m);
}

/* ════════════════════════════════
   LONG PRESS + ZOOM
   Mantén pulsada una carta ~0.5s para verla en grande.
   Usa Pointer Events con umbral de movimiento: el temporizador solo
   se cancela si el dedo se desplaza >12px (antes cualquier jitter
   táctil lo cancelaba y el zoom nunca se abría en móvil).
════════════════════════════════ */
let _zoomJustOpened=false;
const LP_MS=500;
const LP_MOVE=12;

function addLongPress(el,fn){
  let timer=null, fired=false, sx=0, sy=0;

  function start(x,y){
    sx=x;sy=y;fired=false;
    if(timer)clearTimeout(timer);
    timer=setTimeout(()=>{fired=true;timer=null;fn();},LP_MS);
  }
  function moved(x,y){
    if(timer&&Math.hypot(x-sx,y-sy)>LP_MOVE){clearTimeout(timer);timer=null;}
  }
  function cancel(){
    if(timer){clearTimeout(timer);timer=null;}
  }

  if(window.PointerEvent){
    el.addEventListener('pointerdown',e=>start(e.clientX,e.clientY));
    el.addEventListener('pointermove',e=>moved(e.clientX,e.clientY));
    el.addEventListener('pointerup',cancel);
    el.addEventListener('pointerleave',cancel);
    el.addEventListener('pointercancel',cancel);
  } else {
    el.addEventListener('touchstart',e=>{const t=e.touches[0];start(t.clientX,t.clientY);},{passive:true});
    el.addEventListener('touchmove',e=>{const t=e.touches[0];moved(t.clientX,t.clientY);},{passive:true});
    el.addEventListener('touchend',cancel);
    el.addEventListener('touchcancel',cancel);
    el.addEventListener('mousedown',e=>start(e.clientX,e.clientY));
    el.addEventListener('mouseup',cancel);
    el.addEventListener('mouseleave',cancel);
  }
  /* tras un long press, traga el click/tap sintético para que no
     seleccione la carta ni cierre el zoom recién abierto */
  el.addEventListener('click',(e)=>{
    if(fired){e.preventDefault();e.stopPropagation();fired=false;}
  },true);
  el.addEventListener('contextmenu',(e)=>{e.preventDefault();});
}

function showZoom(card){
  const wrap=document.getElementById('zoom-card-inner');
  wrap.innerHTML='';
  const el=makeElemCard(card,0,false,false);
  el.classList.remove('clickable');
  el.onclick=null;
  addMarco(el);
  wrap.appendChild(el);
  _zoomJustOpened=true;
  document.getElementById('ov-zoom').classList.add('open');
  setTimeout(()=>{_zoomJustOpened=false;},600);
}

function closeZoom(){
  if(_zoomJustOpened)return;
  document.getElementById('ov-zoom').classList.remove('open');
}

/* ════════════════════════════════
   SCREENS & SHELL
════════════════════════════════ */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  document.body.classList.toggle('in-game',id==='game');
}
function openRules(){document.getElementById('ov-rules').classList.add('open');}

function toggleSound(){
  const m=sfx.toggle();
  const icon=m?'🔇':'🔊';
  const b1=document.getElementById('btn-sound');
  const b2=document.getElementById('btn-sound-game');
  if(b1)b1.textContent=icon;
  if(b2)b2.textContent=icon;
  if(!m)sfx.click();
}

/* burbujas flotantes del fondo */
function spawnBubbles(){
  const bg=document.getElementById('bg-fx');
  if(!bg)return;
  for(let i=0;i<14;i++){
    const b=document.createElement('span');
    b.className='bub';
    const s=8+Math.random()*42;
    b.style.width=s+'px';b.style.height=s+'px';
    b.style.left=Math.random()*100+'vw';
    b.style.animationDuration=(11+Math.random()*16)+'s';
    b.style.animationDelay=(-Math.random()*20)+'s';
    bg.appendChild(b);
  }
}

/* ════════════════════════════════
   PWA — instalación + service worker
════════════════════════════════ */
let _deferredInstall=null;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  _deferredInstall=e;
  const b=document.getElementById('btn-install');
  if(b)b.style.display='';
});
async function installApp(){
  if(!_deferredInstall){toast('Usa el menú del navegador → "Añadir a pantalla de inicio"');return;}
  _deferredInstall.prompt();
  const {outcome}=await _deferredInstall.userChoice;
  if(outcome==='accepted'){
    toast('📲 ¡BreakingLab instalado!');
    const b=document.getElementById('btn-install');
    if(b)b.style.display='none';
  }
  _deferredInstall=null;
}
window.addEventListener('appinstalled',()=>{
  const b=document.getElementById('btn-install');
  if(b)b.style.display='none';
});

document.addEventListener('DOMContentLoaded',()=>{
  spawnBubbles();
  const icon=sfx.muted?'🔇':'🔊';
  const b1=document.getElementById('btn-sound');
  const b2=document.getElementById('btn-sound-game');
  if(b1)b1.textContent=icon;
  if(b2)b2.textContent=icon;
  document.addEventListener('pointerdown',()=>sfx.unlock(),{once:true});
  document.addEventListener('click',(e)=>{
    if(e.target.closest('.btn,.mode-card,.diff-chip,.hand-arrow,.pdeck,.cpile.draw,.abtn'))sfx.click();
  });
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(isIOS&&!standalone){
    const h=document.getElementById('ios-hint');
    if(h)h.style.display='block';
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
});
