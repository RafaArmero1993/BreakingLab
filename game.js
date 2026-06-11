/* ════════════════════════════════════════════════════════════════
   GAME ENGINE — BreakingLab
   VALID_MOLECULES, ELEMENTS, SPELLS  → game-data.js
   CARD_WEIGHTS                       → card-config.js
   AI, AI_LEVELS                      → ai-player.js

   SISTEMA DE TURNOS (v1.3)
   ────────────────────────
   Turnos alternos, empieza el jugador. En tu turno (atacante) eliges:
     ⚔️ Atacar  — seleccionas cartas EN EL ORDEN de la fórmula
                  (H,H,O para H₂O). El rival entonces SE DEFIENDE
                  formando una molécula o pasando. Después viene la
                  RONDA DE HECHIZOS (defensor primero, alternando) y
                  por último la RESOLUCIÓN de la batalla:
                    dmg = ATK − DEF defensa (U ignora media DEF)
                    dmg > 0 → el defensor pierde 1 analista
                    dmg ≤ 0 → ataque bloqueado
                  Ambas moléculas van al descarte.
     ✨ Hechizo — juegas un hechizo y se abre la ronda de hechizos
                  (sin batalla). Efectos pendientes de diseño.
     🃏 Robar   — robas 2 cartas del mazo central.
   Después el turno pasa al rival, que hace exactamente lo mismo.
════════════════════════════════════════════════════════════════ */

/* Versión única de la app: se muestra en portada y reglas, y debe ir
   a la par con CACHE_VERSION en sw.js */
const APP_VERSION='v1.7';

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
    whoosh(){ tone(900,.4,'sawtooth',.06,0,120); },
    announce(){ tone(660,.14,'triangle',.1); tone(990,.18,'triangle',.1,.1); },
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
  const useful = new Set();
  const avail = handIds ? [...handIds] : [];
  for(const id of selectedIds){ const i=avail.indexOf(id); if(i>-1) avail.splice(i,1); }
  /* prefijo ordenado: selectedIds debe ser prefijo exacto de mol.ids,
     que está escrito en el orden de la fórmula */
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
  for(const mol of VALID_MOLECULES){
    const needed=[...mol.ids], avail=[...handIds];
    let ok=true;
    for(const id of needed){const i=avail.indexOf(id);if(i===-1){ok=false;break;}avail.splice(i,1);}
    if(ok) return true;
  }
  return false;
}

function molIsRad(mol){ return !!(mol&&mol.rad); }

function buildMol(elems){
  const m = matchMol(elems);
  const bA = elems.reduce((s,x)=>s+x.atk,0);
  const bD = elems.reduce((s,x)=>s+x.def,0);
  const rad = elems.some(x=>typeof RADIOACTIVE!=='undefined'&&RADIOACTIVE.includes(x.id));
  if(m) return {name:m.name,formula:m.formula,atk:m.atk,def:m.def,combo:true,rad,valid:true};
  return {name:'Compuesto',formula:elems.map(x=>x.sym).join(''),atk:bA,def:bD,combo:false,rad,valid:false};
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
     hands:[[],[]],spells:[[],[]],deckSize:[6,6],sharedDeck:200,discardSize:0,
     build:[],mols:[null,null],molCards:[[],[]],
     spellsInArena:[[],[]],selSpell:null,
     turn:0,turnCount:0,busy:false,phase:'action',
     spellTurn:0,spellPasses:0,spellSteps:0,
     _buildRole:'attack',_afterPass:null,
     vsAI:false,aiLevel:'normal',aiAvatar:'🤖',
     stats:{turns:0,battles:0,anLost:[0,0],spells:0}};
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
/* Color neón por carta: CARD_COLORS llega de game-data.js (generado);
   este mapa queda como respaldo */
const ELEMENT_COLORS={
  H:'#7dd3fc', O:'#fb7185', N:'#60a5fa', C:'#e2e8f0',
  S:'#facc15', P:'#fb923c', U:'#a3e635', Pb:'#94a3b8', He:'#fbbf24',
};
function elColor(id){
  if(typeof CARD_COLORS!=='undefined'&&CARD_COLORS[id])return CARD_COLORS[id];
  return ELEMENT_COLORS[id] || '#7c8cff';
}

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
  lbl.textContent=(p===0?'⚗️ ':(G.vsAI?G.aiAvatar+' ':'🧬 '))+G.names[p];
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
  const z=[document.getElementById('zempty1'),document.getElementById('zempty2')];
  const atk=G.turn, def=1-G.turn;
  const txt=['',''];
  if(G.phase==='action'){
    txt[atk]=(G.vsAI&&atk===1)?'🤖 turno del rival':'⚔️ tu turno — elige una acción';
    txt[def]='esperando…';
  } else if(G.phase==='defense'){
    txt[atk]='⚔️ atacando';
    txt[def]=(G.vsAI&&def===1)?'🛡 el rival decide su defensa':'🛡 ¡defiéndete o pasa!';
  } else if(G.phase==='spells'){
    txt[0]=txt[1]='✨ ronda de hechizos';
  } else {
    txt[0]=txt[1]='💥';
  }
  for(let p=0;p<2;p++){if(z[p])z[p].textContent=txt[p];}
  /* brillo en la zona del que debe actuar */
  const zone=[document.getElementById('pzone1'),document.getElementById('pzone2')];
  let act=-1;
  if(G.phase==='action')act=atk;
  else if(G.phase==='defense')act=def;
  else if(G.phase==='spells')act=G.spellTurn;
  for(let p=0;p<2;p++){if(zone[p])zone[p].classList.toggle('active-glow',p===act);}
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
    let w=makeElemCard(card,p,false,false);
    w.onclick=null; /* quita el toggleSelect de makeElemCard */
    if(!revealed){
      /* boca abajo: se clona el nodo para ELIMINAR todos los listeners
         (zoom por long-press incluido) — nadie puede espiar la jugada */
      w.classList.remove('clickable');
      const flip=w.querySelector('.card-flip');
      if(flip)flip.classList.add('flipped');
      w=w.cloneNode(true);
    } else {
      w.classList.add('clickable');
      w.onclick=()=>showZoom(card);
    }
    addMarco(w);
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
    setTimeout(()=>{flip.classList.remove('flipped');sfx.flip();}, i*380);
  });
  setTimeout(()=>{
    renderStack(p,cards,true);
    cb&&cb();
  }, flips.length*380+420);
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
  renderHand(G._buildFor!=null?G._buildFor:G.turn);
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

  const isAttackMode=G._buildRole!=='defense';
  const hasSpellSel=!!G.selHandSpell;

  pageCards.forEach(card=>{
    const isSpell=card.type==='spell'||card.type==='noble';
    if(isSpell){
      /* en ataque los hechizos son jugables desde la mano;
         en defensa quedan atenuados */
      if(isAttackMode){
        const el=makeElemCard(card,p,G.selHandSpell===card,hasElemSel);
        el.onclick=()=>toggleSelectSpell(card,p);
        addMarco(el);
        hc.appendChild(el);
      } else {
        const el=makeElemCard(card,p,false,true);
        addMarco(el);
        hc.appendChild(el);
      }
    } else {
      const inBuild=G.build.includes(card);
      let dimmed;
      if(hasSpellSel) dimmed=true;
      else if(hasElemSel) dimmed=!inBuild&&!useful.has(card.id);
      else dimmed=!handUseful.has(card.id);
      const el=makeElemCard(card,p,inBuild,dimmed);
      addMarco(el);
      hc.appendChild(el);
    }
  });

  const confirmBtn=document.getElementById('btn-confirm');
  const prev=document.getElementById('mprev');
  const stats=document.getElementById('build-stats');
  if(hasSpellSel){
    confirmBtn.textContent='✨ Jugar hechizo';
    confirmBtn.disabled=false;confirmBtn.style.opacity='1';
    prev.className='mprev valid';
    prev.textContent=G.selHandSpell.name;
    if(stats)stats.innerHTML='';
    return;
  }
  confirmBtn.textContent=G._buildRole==='defense'?'🛡 ¡Defender!':'⚔️ ¡Atacar!';
  if(!hasElemSel){
    confirmBtn.disabled=true;confirmBtn.style.opacity='.45';
    prev.textContent='';prev.className='mprev';
    if(stats)stats.innerHTML='';
  } else {
    const pv=buildMol(G.build);
    const seq=G.build.map(c=>c.sym).join('·');
    if(stats)stats.innerHTML=
      `<span style="color:var(--red);font-weight:900;font-size:.8rem">🗡${pv.atk}</span> `+
      `<span style="color:var(--ok);font-weight:900;font-size:.8rem">🛡${pv.def}</span>`;
    if(pv.valid){
      confirmBtn.disabled=false;confirmBtn.style.opacity='1';
      prev.className='mprev valid';
      prev.textContent=`${seq} = ${pv.formula} ✅`;
    } else {
      confirmBtn.disabled=true;confirmBtn.style.opacity='.45';
      prev.className='mprev';
      prev.textContent=seq+' …';
    }
  }
}

function toggleSelect(card,p){
  G.selHandSpell=null;
  const idx=G.build.indexOf(card);
  if(idx>-1) G.build.splice(idx); /* quita esta carta y las posteriores (prefijo válido) */
  else G.build.push(card);
  sfx.select();
  renderHand(p);
}

function toggleSelectSpell(card,p){
  if(G.selHandSpell===card)G.selHandSpell=null;
  else{G.selHandSpell=card;G.build=[];}
  sfx.select();
  renderHand(p);
}

/* ════════════════════════════════
   FEEDBACK — toast, banner IA y anuncios de fase
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

/* Gran anuncio de fase en el centro de la pantalla */
function announce(txt,color,cb,dur){
  const el=document.getElementById('phase-banner');
  if(!el){cb&&cb();return;}
  el.textContent=txt;
  el.style.textShadow=`0 0 16px ${color},0 0 46px ${color}`;
  el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  sfx.announce();
  if(cb)setTimeout(cb,dur||1250);
}

/* ════════════════════════════════
   INTERACCIÓN SIN BOTONES
   Todo se juega tocando los mazos: el tuyo abre tu mano (elementos
   para atacar/defender o un hechizo), el central roba 2 y pasa.
════════════════════════════════ */
function isHuman(p){ return !(G.vsAI&&p===1); }

/* compat: la antigua barra de acciones ya no existe */
function updateActionBar(){ setZoneHints(); }

/* vibración háptica (móvil) */
function vibe(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

/* En 2 jugadores: pasa el dispositivo antes de que actúe p */
function handOff(p,fn){
  if(G.vsAI){fn();return;}
  G._afterPass=fn;
  showPassScreen(p);
}

function showPassScreen(toP){
  document.getElementById('pass-name').textContent=G.names[toP];
  document.getElementById('pass-h').textContent='Pasa el dispositivo';
  rotateTable(toP===1);
  setTimeout(()=>showScreen('pass'),200);
}

function resumePass(){
  showScreen('game');
  const fn=G._afterPass;G._afterPass=null;
  if(fn)fn();
}

/* ════════════════════════════════
   TURN FLOW
════════════════════════════════ */
function beginTurn(p){
  G.turn=p;
  G.phase='action';
  G.turnCount++;
  G.stats.turns++;
  G.busy=false;

  /* mantenimiento: roba 1 carta automática (salvo los 2 primeros turnos),
     repone hechizo si no queda ninguno y limpia hechizos de la arena */
  if(G.turnCount>2) sharedDeckTake(p,1);
  if(!G.spells[p].length) G.spells[p]=[{...weightedRandom(SPELLS)}];
  for(let q=0;q<2;q++){if(G.spellsInArena[q].length){G.spellsInArena[q]=[];renderZoneSpells(q);}}
  renderDecks();

  if(G.vsAI&&p===1){
    showScreen('game');
    setZoneHints();
    setTimeout(aiTakeTurn,600);
  } else {
    handOff(p,()=>{
      showScreen('game');
      setZoneHints();
      hideAIBanner();
      toast(G.vsAI?'🧪 Tu turno — toca tu mazo o el central':'⚔️ Turno de '+G.names[p]);
    });
  }
}

function endTurn(){
  G.busy=false;
  G.mols=[null,null];G.molCards=[[],[]];
  renderStack(0,[],false);renderStack(1,[],false);
  beginTurn(1-G.turn);
}

/* ── Tu mazo: abre la mano (atacar con elementos o jugar hechizo) ── */
function openHandPanel(){
  if(G.phase!=='action'||G.busy||!isHuman(G.turn))return;
  G._buildRole='attack';
  G._buildFor=G.turn;
  G.build=[];
  G.selHandSpell=null;
  handPage=0;
  document.getElementById('btn-bp-pass').style.display='none';
  document.getElementById('bp-title').textContent='⚔️ Ataca con una molécula (en el orden de la fórmula) o juega un hechizo';
  renderHand(G.turn);
  document.getElementById('build-panel').classList.add('open');
}

/* ── Mazo central: robar 2 y pasar el turno (con confirmación) ── */
function onSharedDeckClick(){
  if(G.phase!=='action'||G.busy||!isHuman(G.turn))return;
  document.getElementById('ov-draw').classList.add('open');
}

function confirmDraw(){
  document.getElementById('ov-draw').classList.remove('open');
  if(G.phase!=='action'||G.busy||!isHuman(G.turn))return;
  G.busy=true;
  sharedDeckTake(G.turn,2);
  sfx.draw();
  renderDecks();
  toast('🃏 Robas 2 cartas');
  setZoneHints();
  setTimeout(endTurn,700);
}

function onDeckClick(p){
  if(G.vsAI&&p===1)return;
  if(G.phase==='action'&&p===G.turn){openHandPanel();return;}
  if(G.phase==='defense'&&p===1-G.turn){abDefend();return;}
}

function cancelBuild(){
  G.build=[];
  G.selHandSpell=null;
  document.getElementById('build-panel').classList.remove('open');
}

/* ── Confirmación de jugada (molécula o hechizo desde la mano) ── */
function confirmBuild(){
  if(G._buildRole==='attack'&&G.selHandSpell){
    const sp=G.selHandSpell;
    G.selHandSpell=null;G.build=[];
    document.getElementById('build-panel').classList.remove('open');
    if(!doCastSpell(G.turn,sp.id))return;
    G.busy=true;
    setZoneHints();
    announce(`✨ ${G.names[G.turn]} lanza un hechizo`,'#fbbf24',()=>startSpellRound(),1100);
    return;
  }
  if(!G.build.length)return;
  const mol=buildMol(G.build);
  if(!mol.valid)return;
  G._pendingBuild={mol,cards:[...G.build]};
  document.getElementById('mc-formula').textContent=mol.formula;
  document.getElementById('mc-name').textContent=mol.name;
  document.getElementById('mc-atk').textContent=`🗡 ${mol.atk}`;
  document.getElementById('mc-def').textContent=`🛡 ${mol.def}`;
  document.getElementById('mc-confirm-btn').textContent=G._buildRole==='defense'?'🛡 ¡Defender!':'⚔️ ¡Atacar!';
  document.getElementById('ov-mol-confirm').classList.add('open');
}

function executeBuild(){
  document.getElementById('ov-mol-confirm').classList.remove('open');
  document.getElementById('build-panel').classList.remove('open');
  const {mol,cards}=G._pendingBuild;
  const p=G._buildFor;
  G.build=[];
  G.busy=true;
  placeMolecule(p,mol,cards);
  sfx.build();
  updateActionBar('off');
  /* las cartas quedan BOCA ABAJO: nadie ve la jugada rival hasta la
     resolución de la batalla */
  if(G._buildRole==='attack'){
    announce(`⚔️ ${G.names[p]} lanza un ataque secreto`,'#fb7185',()=>startDefense());
  } else {
    announce(`🛡 ${G.names[p]} presenta su defensa`,'#22d3ee',()=>startSpellRound());
  }
}

/* Coloca una molécula en la zona de p (sale de la mano; se descarta
   en la resolución de la batalla) */
function placeMolecule(p,mol,cards){
  G.mols[p]=mol;
  G.molCards[p]=cards;
  cards.forEach(c=>{const i=G.hands[p].indexOf(c);if(i>-1)G.hands[p].splice(i,1);});
  renderStack(p,cards,false);
  renderDecks();
}

/* ════════════════════════════════
   FASE DE DEFENSA
════════════════════════════════ */
function startDefense(){
  G.phase='defense';
  G.busy=false;
  const defP=1-G.turn;
  setZoneHints();
  if(G.vsAI&&defP===1){
    showAIBanner(`${G.aiAvatar} ${G.names[1]} decide su defensa`);
    setTimeout(()=>{
      /* la IA defiende A CIEGAS: el ataque está boca abajo también para ella */
      const d=AI.chooseDefense(G);
      if(d){
        const mol=buildMol(d.cards);
        placeMolecule(1,mol,[...d.cards]);
        sfx.build();
        showAIBanner(`${G.aiAvatar} ${G.names[1]} presenta su defensa 🛡`,2000);
        setTimeout(startSpellRound,1100);
      } else {
        showAIBanner(`${G.aiAvatar} ${G.names[1]} no se defiende 😨`,1800);
        setTimeout(startSpellRound,1000);
      }
    },900+Math.random()*900);
  } else {
    handOff(defP,()=>{
      setZoneHints();
      /* sin botones: el panel de defensa se abre solo, con opción Pasar */
      announce('🛡 ¡DEFIÉNDETE! El ataque es secreto','#22d3ee',()=>abDefend(),1250);
    });
  }
}

function abDefend(){
  if(G.phase!=='defense'||G.busy)return;
  const defP=1-G.turn;
  G._buildRole='defense';
  G._buildFor=defP;
  G.build=[];
  G.selHandSpell=null;
  handPage=0;
  document.getElementById('btn-bp-pass').style.display='';
  document.getElementById('bp-title').textContent='🛡 Forma tu defensa (o pasa) — el ataque rival es secreto';
  renderHand(defP);
  document.getElementById('build-panel').classList.add('open');
}

function abNoDefend(){
  if(G.phase!=='defense'||G.busy)return;
  G.build=[];G.selHandSpell=null;
  document.getElementById('build-panel').classList.remove('open');
  const defP=1-G.turn;
  setZoneHints();
  announce(`😨 ${G.names[defP]} no se defiende`,'#fb7185',()=>startSpellRound());
}

/* ════════════════════════════════
   RONDA DE HECHIZOS
   Defensor primero, alternando. Cada uno puede jugar un hechizo o
   pasar; dos pases seguidos (o sin hechizos) cierran la ronda.
   ⚠️ Efectos pendientes de diseño: jugar un hechizo lo muestra en la
   arena y lo descarta, sin alterar el combate (ver doCastSpell).
════════════════════════════════ */
function startSpellRound(){
  G.phase='spells';
  G.busy=false;
  G.spellPasses=0;
  G.spellSteps=0;
  G.spellTurn=1-G.turn; /* el defensor responde primero */
  setZoneHints();
  /* GRAN REVELACIÓN: las jugadas estaban boca abajo durante el duelo y
     se voltean AHORA, al empezar la fase de hechizos (ataque primero,
     defensa después) */
  revealMolecules(()=>{
    /* si nadie tiene hechizos, la ronda se salta para no cortar el ritmo */
    if(!G.spells[0].length&&!G.spells[1].length){finishSpellRound();return;}
    announce('✨ RONDA DE HECHIZOS','#fbbf24',()=>spellStep(),1100);
  });
}

function revealMolecules(cb){
  const seq=[];
  if(G.molCards[G.turn].length)seq.push(G.turn);
  if(G.molCards[1-G.turn].length)seq.push(1-G.turn);
  if(!seq.length){cb&&cb();return;}
  const next=()=>{ if(!seq.length){cb&&cb();return;} flipZone(seq.shift(),next); };
  next();
}

function spellStep(){
  if(G.spellPasses>=2||G.spellSteps>=8){finishSpellRound();return;}
  G.spellSteps++;
  const p=G.spellTurn;
  setZoneHints();
  if(!G.spells[p].length){
    G.spellPasses++;
    G.spellTurn=1-p;
    spellStep();
    return;
  }
  if(G.vsAI&&p===1){
    showAIBanner(`${G.aiAvatar} ${G.names[1]} medita un hechizo`);
    setTimeout(()=>{
      const id=AI.chooseRoundSpell(G);
      if(id){
        const sp=G.spells[1].find(s=>s.id===id);
        showAIBanner(`${G.aiAvatar} ${G.names[1]} juega ${sp?sp.name:id} ✨`,1600);
        doCastSpell(1,id);
        G.spellPasses=0;
      } else {
        showAIBanner(`${G.aiAvatar} ${G.names[1]} pasa`,1300);
        G.spellPasses++;
      }
      G.spellTurn=0;
      setTimeout(spellStep,900);
    },800+Math.random()*800);
  } else {
    handOff(p,()=>openSpellPanel(p,'round'));
  }
}

function finishSpellRound(){
  closeSpellPanelOnly();
  if(G.mols[G.turn]) resolveBattle();
  else {
    announce('➡️ Fin del turno','#a78bfa',()=>endTurn(),900);
  }
}

/* ── Panel de hechizos ──
   mode 'action' → el atacante juega un hechizo como acción de turno.
   mode 'round'  → paso de la ronda de hechizos (puede Jugar o Pasar). */
function openSpellPanel(p,mode){
  G._spellMode=mode;
  G._spellFor=p;
  G.selSpell=null;
  const castBtn=document.getElementById('btn-cast-panel');
  castBtn.disabled=true;castBtn.style.opacity='.45';
  document.getElementById('btn-pass-spell').style.display=mode==='round'?'':'none';
  document.getElementById('btn-close-spell').style.display=mode==='action'?'':'none';
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

/* Efectos de los hechizos: Au actúa al instante; el resto se registran
   en spellsInArena y los aplica battleMods() en la resolución */
function doCastSpell(p,id){
  const sp=G.spells[p].find(s=>s.id===id);if(!sp)return false;
  G.spells[p]=G.spells[p].filter(s=>s.id!==id);
  G.discardSize++;G.stats.spells++;
  G.spellsInArena[p].push(sp);
  sfx.spell();
  if(sp.id==='Au'){
    sharedDeckTake(p,3);
    if(isHuman(p))toast('💰 Financiación: robas 3 cartas');
  }
  renderZoneSpells(p);
  renderDecks();
  return true;
}

function castSpell(){
  if(!G.selSpell)return;
  const p=G._spellFor;
  closeSpellPanelOnly();
  if(!doCastSpell(p,G.selSpell))return;
  G.selSpell=null;
  if(G._spellMode==='action'){
    /* hechizo como acción de turno → se abre la ronda de hechizos */
    updateActionBar('off');
    announce(`✨ ${G.names[p]} lanza un hechizo`,'#fbbf24',()=>startSpellRound(),1100);
  } else {
    G.spellPasses=0;
    G.spellTurn=1-p;
    setTimeout(spellStep,500);
  }
}

function passRoundSpell(){
  closeSpellPanelOnly();
  const p=G._spellFor;
  G.spellPasses++;
  G.spellTurn=1-p;
  setTimeout(spellStep,300);
}

/* ════════════════════════════════
   RESOLUCIÓN DE LA BATALLA
════════════════════════════════ */
/* Modificadores de los hechizos jugados este turno (efectos reales):
   Ar anula los hechizos del rival · Pb reduce 50% ATK/DEF a las jugadas
   radiactivas rivales · He +2 DEF propia · Pt +1/+1 propia ·
   Ne −2 ATK rival · Hg −2 DEF rival · (Au actúa al jugarse: roba 3) */
function battleMods(atkP,defP){
  const cast=p=>(G.spellsInArena[p]||[]).map(s=>s.id);
  const arCancel=[cast(0).includes('Ar'),cast(1).includes('Ar')];
  const active=p=>arCancel[1-p]?[]:cast(p).filter(id=>id!=='Ar');
  let atkMod=0, defMod=0, atkMul=1, defMul=1;
  for(const id of active(atkP)){
    if(id==='Pt')atkMod+=1;
    if(id==='Hg')defMod-=2;
    if(id==='Pb'&&molIsRad(G.mols[defP]))defMul=.5;
  }
  for(const id of active(defP)){
    if(id==='He')defMod+=2;
    if(id==='Pt')defMod+=1;
    if(id==='Ne')atkMod-=2;
    if(id==='Pb'&&molIsRad(G.mols[atkP]))atkMul=.5;
  }
  return {atkMod,defMod,atkMul,defMul};
}

function resolveBattle(){
  G.phase='resolve';
  G.busy=true;
  setZoneHints();
  hideAIBanner();
  const atkP=G.turn, defP=1-atkP;
  const atk=G.mols[atkP], def=G.mols[defP];
  const mods=battleMods(atkP,defP);
  const atkV=Math.max(0,Math.round(atk.atk*mods.atkMul)+mods.atkMod);
  const defV=def?Math.max(0,Math.round(def.def*mods.defMul)+mods.defMod):0;
  const dmg=atkV-defV;
  const blocked=!!def&&dmg<=0;
  G.stats.battles++;

  /* las jugadas ya se revelaron al empezar la ronda de hechizos:
     directo al veredicto (con los hechizos ya aplicados ✨) y al choque */
  const fx=(atkV!==atk.atk||(def&&defV!==def.def))?' ✨':'';
  announce(
    `${atk.formula} 🗡${atkV}  VS  ${def?def.formula+' 🛡'+defV:'SIN DEFENSA'}${fx}`,
    '#a78bfa',doClash,1400);

  function doClash(){
    clashAnimation(atkP,defP,blocked,!def,()=>{
      if(!blocked)loseAnalyst(defP);
      /* ambas moléculas van al descarte */
      for(const p of [atkP,defP]){
        if(G.molCards[p].length){
          G.discardSize+=G.molCards[p].length;
          G.mols[p]=null;G.molCards[p]=[];
          renderStack(p,[],false);
        }
      }
      renderDecks();
      if(G.an[defP]<=0){setTimeout(endGame,900);return;}
      setTimeout(endTurn,650);
    });
  }
}

function loseAnalyst(p){
  G.an[p]=Math.max(0,G.an[p]-1);
  G.stats.anLost[p]++;
  renderStrip(p);
}

/* ── VFX: choque de cartas en el CENTRO de la pantalla, por encima
   de todo (clones a nivel de body, z-index 700 — nunca por debajo
   del mazo central) ── */
function _analystTarget(p){
  const strip=document.getElementById('astrip'+(p+1));
  if(!strip)return null;
  const cards=strip.querySelectorAll('.analysts .card');
  return cards[Math.max(0,G.an[p]-1)]||cards[cards.length-1]||null;
}

function cloneStack(stackEl){
  const r=stackEl.getBoundingClientRect();
  const c=stackEl.cloneNode(true);
  c.style.cssText+=`;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;
    margin:0;z-index:700;pointer-events:none;will-change:transform;
    transition:transform .6s cubic-bezier(.45,-.15,.6,1.1),opacity .45s ease;`;
  document.body.appendChild(c);
  return {c,r};
}

function screenFlash(){
  const f=document.getElementById('flash');
  if(!f)return;
  f.style.opacity='.55';
  setTimeout(()=>{f.style.opacity='0';},130);
}

function shakeTable(){
  const table=document.getElementById('game-table');
  if(!table)return;
  table.classList.remove('shake');void table.offsetWidth;table.classList.add('shake');
}

function spawnSparks(x,y,color,n){
  for(let i=0;i<(n||18);i++){
    const s=document.createElement('div');
    s.className='spark';
    const sz=4+Math.random()*8;
    s.style.cssText=`width:${sz}px;height:${sz}px;left:${x-sz/2}px;top:${y-sz/2}px;
      background:radial-gradient(circle,#fff 0%,${color} 60%,transparent 100%);
      box-shadow:0 0 8px ${color};`;
    document.body.appendChild(s);
    const ang=Math.random()*Math.PI*2;
    const dist=50+Math.random()*130;
    s.getBoundingClientRect();
    s.style.transition=`transform ${.45+Math.random()*.4}s ease-out, opacity .65s ease-out`;
    s.style.transform=`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px) scale(.2)`;
    s.style.opacity='0';
    setTimeout(()=>s.remove(),950);
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

function clashAnimation(atkP,defP,blocked,direct,done){
  const sA=document.getElementById('stack'+(atkP+1));
  if(!sA||!sA.children.length){done&&done();return;}
  const cx=innerWidth/2, cy=innerHeight*0.44;
  const A=cloneStack(sA);
  sA.style.visibility='hidden';
  sfx.whoosh();

  if(direct){
    /* sin defensa: golpe directo al último analista vivo */
    const target=_analystTarget(defP);
    const t=target?target.getBoundingClientRect():{left:cx,top:cy,width:0,height:0};
    const tx=t.left+t.width/2, ty=t.top+t.height/2;
    A.c.getBoundingClientRect();
    A.c.style.transform=`translate(${tx-(A.r.left+A.r.width/2)}px,${ty-(A.r.top+A.r.height/2)}px) scale(.8) rotate(${atkP===0?-8:8}deg)`;
    setTimeout(()=>{
      screenFlash();shakeTable();sfx.hit();vibe(70);
      spawnSparks(tx,ty,'#fb7185',26);
      dmgPop(tx,ty-36,'💥 ¡GOLPE DIRECTO! −1','#fb7185');
      A.c.style.opacity='0';
      setTimeout(()=>{A.c.remove();sA.style.visibility='';done&&done();},500);
    },620);
    return;
  }

  const sB=document.getElementById('stack'+(defP+1));
  const B=sB&&sB.children.length?cloneStack(sB):null;
  if(B)sB.style.visibility='hidden';

  /* ambos vuelan al centro y chocan */
  const off=Math.min(34,innerHeight*0.04);
  A.c.getBoundingClientRect();
  A.c.style.transform=`translate(${cx-(A.r.left+A.r.width/2)}px,${cy+off-(A.r.top+A.r.height/2)}px) scale(1.05) rotate(-4deg)`;
  if(B){
    B.c.getBoundingClientRect();
    B.c.style.transform=`translate(${cx-(B.r.left+B.r.width/2)}px,${cy-off-(B.r.top+B.r.height/2)}px) scale(1.05) rotate(4deg)`;
  }

  setTimeout(()=>{
    screenFlash();shakeTable();vibe(blocked?35:70);
    spawnSparks(cx,cy,blocked?'#7dd3fc':'#fbbf24',42);
    if(blocked){
      sfx.block();
      shieldRing(cx,cy);
      dmgPop(cx,cy-60,'🛡 ¡BLOQUEADO!','#7dd3fc');
      A.c.classList.add('blasted'); /* el ataque se estrella contra el escudo */
    } else {
      sfx.hit();
      dmgPop(cx,cy-60,'💥 −1 ANALISTA','#fb7185');
      if(B)B.c.classList.add('blasted'); /* la defensa salta en pedazos */
    }
    setTimeout(()=>{
      /* el superviviente también se descarta: se desvanece */
      (blocked?(B&&B.c):A.c)&&((blocked?B.c:A.c).style.opacity='0');
      setTimeout(()=>{
        A.c.remove();if(B)B.c.remove();
        sA.style.visibility='';if(sB)sB.style.visibility='';
        done&&done();
      },480);
    },620);
  },640);
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
   SETUP / START
════════════════════════════════ */
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
  showVersus(()=>beginTurn(0)); /* el primer turno es siempre del jugador */
}

function rematch(){
  const cfg={vsAI:G.vsAI,aiLevel:G.aiLevel,aiAvatar:G.aiAvatar,names:[...G.names]};
  initState(cfg.names[0],cfg.names[1]);
  G.vsAI=cfg.vsAI;G.aiLevel=cfg.aiLevel;G.aiAvatar=cfg.aiAvatar;
  _bootTable();
  showVersus(()=>beginTurn(0));
}

/* Pantalla VS: los dos laboratorios frente a frente antes del duelo */
function showVersus(cb){
  const ov=document.getElementById('ov-versus');
  if(!ov){cb&&cb();return;}
  const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  document.getElementById('vs-name1').innerHTML='⚗️ '+esc(G.names[0]);
  document.getElementById('vs-name2').innerHTML=
    (G.vsAI?G.aiAvatar+' ':'🧬 ')+esc(G.names[1])+
    (G.vsAI&&AI_LEVELS[G.aiLevel]?`<small>${AI_LEVELS[G.aiLevel].corp}</small>`:'');
  ov.classList.remove('show');void ov.offsetWidth;ov.classList.add('show');
  sfx.announce();
  setTimeout(()=>sfx.fire(),700);
  setTimeout(()=>{ov.classList.remove('show');cb&&cb();},2400);
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
   AI TURN (atacante)
════════════════════════════════ */
function aiTakeTurn(){
  showAIBanner(`${G.aiAvatar} ${G.names[1]} está pensando`);
  setTimeout(()=>{
    const choice=AI.chooseAction(G);
    if(choice.action==='attack'){
      const mol=buildMol(choice.cards);
      placeMolecule(1,mol,[...choice.cards]);
      sfx.build();
      hideAIBanner();
      /* boca abajo: la fórmula no se revela hasta la resolución */
      announce(`⚔️ ${G.names[1]} lanza un ataque secreto`,'#fb7185',()=>startDefense());
    } else if(choice.action==='spell'){
      const sp=G.spells[1].find(s=>s.id===choice.id);
      showAIBanner(`${G.aiAvatar} ${G.names[1]} juega ${sp?sp.name:choice.id} ✨`,1600);
      doCastSpell(1,choice.id);
      setTimeout(()=>startSpellRound(),1100);
    } else {
      sharedDeckTake(1,2);
      sfx.draw();
      renderDecks();
      showAIBanner(`${G.aiAvatar} ${G.names[1]} roba 2 cartas 🃏`,1500);
      setTimeout(endTurn,1100);
    }
  },900+Math.random()*1100);
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
  const corp=G.vsAI&&AI_LEVELS[G.aiLevel]?AI_LEVELS[G.aiLevel].corp:'';
  if(w===-1){
    title.textContent='🤝 La molécula se pierde';
    sub.textContent='Ambos laboratorios caen. La Molécula Maestra sigue siendo un misterio.';
  } else if(G.vsAI){
    if(w===0){
      title.textContent='🏆 ¡Patente conseguida!';
      sub.textContent=`Tu laboratorio sintetiza la Molécula Maestra antes que ${corp}. ¡El Nobel y la gloria son tuyos!`;
    } else {
      title.textContent='💀 Laboratorio clausurado';
      title.classList.add('lose');
      sub.textContent=`${G.names[1]} registra la patente para ${corp}. Tu laboratorio cierra sus puertas… ¡Exige la revancha!`;
    }
  } else {
    title.textContent=`🏆 ¡${G.names[w]} consigue la patente!`;
    sub.textContent=`La Molécula Maestra ya tiene dueño. El laboratorio de ${G.names[1-w]} cierra sus puertas.`;
  }
  document.getElementById('rstats').innerHTML=`
    <div class="crow"><span>Turnos jugados</span><span class="cv">${G.stats.turns}</span></div>
    <div class="crow"><span>Batallas</span><span class="cv">${G.stats.battles}</span></div>
    <div class="crow"><span>Analistas perdidos ${G.names[0]}</span><span class="cv bad">${G.stats.anLost[0]}</span></div>
    <div class="crow"><span>Analistas perdidos ${G.names[1]}</span><span class="cv bad">${G.stats.anLost[1]}</span></div>
    <div class="crow"><span>Hechizos jugados</span><span class="cv">${G.stats.spells}</span></div>
    <div class="crow"><span>Analistas restantes ${G.names[0]}</span><span class="cv ${G.an[0]>0?'':'bad'}">${G.an[0]}</span></div>
    <div class="crow"><span>Analistas restantes ${G.names[1]}</span><span class="cv ${G.an[1]>0?'':'bad'}">${G.an[1]}</span></div>`;
  showScreen('result');
  const playerWon = w===0 || (!G.vsAI && w===1);
  if(playerWon){ sfx.win(); vibe([80,60,140]); launchConfetti(); }
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

let _zoomCard=null;

function showZoom(card){
  _zoomCard=card;
  const wrap=document.getElementById('zoom-card-inner');
  wrap.innerHTML='';
  const el=makeElemCard(card,0,false,false);
  el.classList.remove('clickable');
  el.onclick=null;
  addMarco(el);
  wrap.appendChild(el);
  /* reinicia a vista de carta */
  _setZoomHist(false);
  _zoomJustOpened=true;
  document.getElementById('ov-zoom').classList.add('open');
  setTimeout(()=>{_zoomJustOpened=false;},600);
}

/* Panel de historia del elemento dentro del zoom */
function _setZoomHist(open){
  const hist=document.getElementById('zoom-hist');
  const wrap=document.getElementById('zoom-card-inner');
  const btn=document.getElementById('zoom-hist-btn');
  if(!hist||!wrap||!btn)return;
  if(open&&_zoomCard){
    hist.innerHTML=`<h3>${_zoomCard.name} <span>(${_zoomCard.sym} · nº ${_zoomCard.num})</span></h3>
      <p>${_zoomCard.hist||_zoomCard.info||'Sin datos históricos.'}</p>`;
    hist.style.display='';
    wrap.style.display='none';
    btn.textContent='🃏 Ver carta';
  } else {
    hist.style.display='none';
    wrap.style.display='';
    btn.textContent='📚 Historia del elemento';
  }
}

function toggleZoomHist(e){
  if(e){e.stopPropagation();e.preventDefault();}
  const open=document.getElementById('zoom-hist').style.display==='none';
  sfx.select();
  _setZoomHist(open);
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
  document.body.classList.toggle('on-intro',id==='intro');
}
function openRules(){document.getElementById('ov-rules').classList.add('open');}
function openStory(){document.getElementById('ov-story').classList.add('open');}

/* Ajustes (engranaje, solo en el panel principal) */
function openSettings(){
  _syncSoundUI();
  document.getElementById('ov-settings').classList.add('open');
}
function _syncSoundUI(){
  const b=document.getElementById('btn-sound-set');
  if(b)b.textContent='Sonido: '+(sfx.muted?'silenciado':'activado');
}
function toggleSound(){
  const m=sfx.toggle();
  _syncSoundUI();
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
  const v1=document.getElementById('app-ver');
  const v2=document.getElementById('app-ver-rules');
  const v3=document.getElementById('app-ver-set');
  if(v1)v1.textContent=APP_VERSION;
  if(v2)v2.textContent='BreakingLab '+APP_VERSION;
  if(v3)v3.textContent='BreakingLab '+APP_VERSION;
  _syncSoundUI();
  document.addEventListener('pointerdown',()=>sfx.unlock(),{once:true});
  document.addEventListener('click',(e)=>{
    if(e.target.closest('.btn,.mode-card,.diff-chip,.hand-arrow,.pdeck,.cpile.draw'))sfx.click();
  });
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(isIOS&&!standalone){
    const h=document.getElementById('ios-hint');
    if(h)h.style.display='block';
  }
  if('serviceWorker' in navigator){
    /* si un service worker nuevo toma el control (versión nueva
       publicada), recarga una única vez para mostrarla */
    const hadController=!!navigator.serviceWorker.controller;
    let _swReloaded=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!hadController||_swReloaded)return;
      _swReloaded=true;
      window.location.reload();
    });
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{});
  }
});
