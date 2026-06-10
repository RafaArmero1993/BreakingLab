/* ════════════════════════════════════════════════════════════════
   GAME ENGINE — BreakingLab
   VALID_MOLECULES, ELEMENTS, SPELLS  → game-data.js
   CARD_WEIGHTS                       → card-config.js
   AI, AI_LEVELS                      → ai-player.js
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
let G={};
let _mode={vsAI:true, level:'normal'};

function initState(n1,n2){
  G={round:1,names:[n1||'J1',n2||'J2'],an:[MAX_AN,MAX_AN],
     hands:[[],[]],spells:[[],[]],deckSize:[6,6],sharedDeck:32,discardSize:0,
     build:[],selBuildSpell:null,mols:[null,null],molCards:[[],[]],
     phase:'build_p1',spellsInArena:[[],[]],
     attacker:0,spellTurn:0,spellPassed:[false,false],helioCast:[false,false],
     dmg:[0,0],selSpell:null,acted:[false,false],passFor:0,
     vsAI:false,aiLevel:'normal',aiAvatar:'🤖',
     stats:{rounds:0,anLost:[0,0],spells:0}};
  dealHand(0);dealHand(1);
}

function rand(a){return a[Math.floor(Math.random()*a.length)];}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

/* 5 elementos + 1 hechizo = 6 cartas (con pesos, duplicados permitidos) */
function dealHand(p){
  G.hands[p]=[];
  for(let i=0;i<5;i++) G.hands[p].push({...weightedRandom(ELEMENTS)});
  G.spells[p]=[{...weightedRandom(SPELLS)}];
  G.deckSize[p]=G.hands[p].length+G.spells[p].length;
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

/* Cartas-elemento en la arena.
   cards    = array de cartas (vacío = placeholder).
   revealed = true tras flipZone (caras visibles + badge de molécula). */
function renderStack(p,cards,revealed){
  revealed=!!revealed;
  const n=p+1;
  const empty=document.getElementById('zempty'+n);
  const stack=document.getElementById('stack'+n);
  if(!cards||!cards.length){
    empty.style.display='';
    stack.style.display='none';
    stack.innerHTML='';
    return;
  }
  empty.style.display='none';
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
}

function flipZone(p){
  const cards=G.molCards[p];
  if(!cards||!cards.length) return;
  renderStack(p,cards,false);
  const stack=document.getElementById('stack'+(p+1));
  if(!stack) return;
  const flips=stack.querySelectorAll('.card-flip');
  flips.forEach((flip,i)=>{
    setTimeout(()=>{flip.classList.remove('flipped');sfx.flip();}, i*480);
  });
  setTimeout(()=>{
    stack.querySelectorAll('.card').forEach((w,i)=>{
      w.classList.add('clickable');
      w.onclick=()=>showZoom(cards[i]);
    });
  }, flips.length*480+300);
}

/* ── Paginación de la mano ── */
let handPage=0;
const HAND_PAGE=6;

function scrollHand(dir){
  handPage+=dir;
  const p=G.phase==='build_p1'?0:1;
  renderHand(p);
}

function renderHand(p){
  const selectedIds=G.build.map(e=>e.id);
  const handIds=G.hands[p].map(e=>e.id);
  const useful=usableIds(selectedIds,handIds);
  const handUseful=handUsableIds(G.hands[p]);
  const hasSpellSel=!!G.selBuildSpell;
  const hasElemSel=G.build.length>0;

  document.getElementById('no-mol-msg').style.display='none';

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
      /* hechizos solo en ronda de efectos — atenuados durante construcción */
      const el=makeElemCard(card,p,false,true);
      addMarco(el);
      hc.appendChild(el);
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
    confirmBtn.disabled=false;confirmBtn.style.opacity='1';
    prev.className='mprev valid';
    prev.textContent=`✨ ${G.selBuildSpell.name} → pasar turno`;
    if(stats)stats.innerHTML='';
  } else if(!hasElemSel){
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
  G.selBuildSpell=null;
  const idx=G.build.indexOf(card);
  if(idx>-1) G.build.splice(idx); /* quita esta carta y las posteriores (prefijo válido) */
  else G.build.push(card);
  sfx.select();
  renderStack(p,G.build,false);
  renderHand(p);
}

/* ════════════════════════════════
   BUILD PANEL
════════════════════════════════ */
function openBuildPanel(p){
  handPage=0;
  renderHand(p);
  document.getElementById('build-panel').classList.add('open');
}
function closeBuildPanel(){document.getElementById('build-panel').classList.remove('open');}

function onDeckClick(p){
  if(G.vsAI&&p===1)return;
  if(G.phase==='spells'&&p===G.spellTurn){
    document.getElementById('spell-panel').classList.add('open');
    return;
  }
  if(G.phase==='build_p1'&&p!==0)return;
  if(G.phase==='build_p2'&&p!==1)return;
  if(!G.phase.startsWith('build'))return;
  openBuildPanel(p);
}

function onSharedDeckClick(){
  const p=G.phase==='build_p1'?0:(G.phase==='build_p2'?1:-1);
  if(p===-1)return;
  if(G.vsAI&&p===1)return;
  G._drawP=p;
  document.getElementById('ov-draw').classList.add('open');
}

function applyDraw(p){
  const drawn=[{...weightedRandom(ELEMENTS)},{...weightedRandom(ELEMENTS)}];
  G.hands[p]=[...G.hands[p],...drawn].slice(0,8);
  G.sharedDeck=Math.max(0,G.sharedDeck-2);
  G.mols[p]=null;
  G.molCards[p]=[];
  renderStack(p,[],false);
  renderDecks();
}

function confirmDraw(){
  document.getElementById('ov-draw').classList.remove('open');
  const p=G._drawP;
  applyDraw(p);
  sfx.draw();
  _finishTurn(p);
}

function cancelBuild(){
  const p=G.phase==='build_p1'?0:1;
  G.build=[];G.selBuildSpell=null;
  renderStack(p,[],false);
  closeBuildPanel();
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
  G.passFor=toP;
  const nameEl=document.getElementById('pass-name');
  nameEl.textContent=G.names[toP];
  document.getElementById('pass-h').textContent='Pasa el dispositivo';
  rotateTable(toP===1);
  setTimeout(()=>showScreen('pass'),200);
}

function beginTurn(p){
  G.phase=p===0?'build_p1':'build_p2';
  if(G.vsAI){
    showScreen('game');
    updateDefenderPass();
    if(p===1) setTimeout(aiBuildTurn,500);
    else toast('🧪 Tu turno');
  } else {
    showPassScreen(p);
  }
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
  showScreen('game');
  rotateTable(false);
  renderStrip(0);renderStrip(1);renderDecks();
  renderStack(0,[],false);renderStack(1,[],false);
  document.getElementById('zspells1').innerHTML='';
  document.getElementById('zspells2').innerHTML='';
  beginTurn(0);
}

function rematch(){
  const cfg={vsAI:G.vsAI,aiLevel:G.aiLevel,aiAvatar:G.aiAvatar,names:[...G.names]};
  initState(cfg.names[0],cfg.names[1]);
  G.vsAI=cfg.vsAI;G.aiLevel=cfg.aiLevel;G.aiAvatar=cfg.aiAvatar;
  showScreen('game');
  rotateTable(false);
  renderStrip(0);renderStrip(1);renderDecks();
  renderStack(0,[],false);renderStack(1,[],false);
  document.getElementById('zspells1').innerHTML='';
  document.getElementById('zspells2').innerHTML='';
  beginTurn(0);
}

function confirmBuild(){
  if(!G.phase.startsWith('build'))return;
  const p=G.phase==='build_p1'?0:1;

  if(G.selBuildSpell){
    G.selBuildSpell=null;G.mols[p]=null;
    closeBuildPanel();
    G.phase='spells';G.helioCast=[false,false];G.spellPassed=[false,false];
    G.spellsInArena=[[],[]];G.dmg=[0,0];G.attacker=p;
    spellTurnStart(p);
    return;
  }

  if(!G.build.length)return;
  const mol=buildMol(G.build);
  if(!mol.valid)return;

  G._pendingBuild={mol,p};
  document.getElementById('mc-formula').textContent=mol.formula;
  document.getElementById('mc-name').textContent=mol.name;
  document.getElementById('mc-atk').textContent=`🗡 ${mol.atk}`;
  document.getElementById('mc-def').textContent=`🛡 ${mol.def}`;
  document.getElementById('ov-mol-confirm').classList.add('open');
}

function executeBuild(){
  document.getElementById('ov-mol-confirm').classList.remove('open');
  const {mol,p}=G._pendingBuild;
  G.mols[p]=mol;
  G.molCards[p]=[...G.build];
  G.build.forEach(e=>{const i=G.hands[p].indexOf(e);if(i>-1)G.hands[p].splice(i,1);});
  G.discardSize+=G.molCards[p].length;
  G.build=[];
  closeBuildPanel();
  sfx.build();
  renderStack(p,G.molCards[p],false);
  renderDecks();
  _finishTurn(p);
}

function _finishTurn(p){
  const w=document.getElementById('defender-pass-wrap');
  if(w) w.style.display='none';
  G.acted[p]=true;
  const other=1-p;
  if(!G.acted[other]){
    beginTurn(other);
  } else {
    rotateTable(false);
    if(G.mols[0]||G.mols[1]){ G.phase='reveal'; setTimeout(showReveal,600); }
    else nextRound();
  }
}

function resumePass(){
  showScreen('game');
  updateDefenderPass();
}

function updateDefenderPass(){
  const w=document.getElementById('defender-pass-wrap');
  if(!w)return;
  const p=G.phase==='build_p1'?0:(G.phase==='build_p2'?1:-1);
  /* el jugador humano que actúa en segundo lugar puede pasar sin construir */
  const show=p>-1 && G.acted[1-p] && !(G.vsAI&&p===1);
  w.style.display=show?'':'none';
}

function defenderPass(){
  document.getElementById('defender-pass-wrap').style.display='none';
  const p=G.phase==='build_p1'?0:1;
  G.build=[];G.selBuildSpell=null;
  closeBuildPanel();
  G.mols[p]=null;G.molCards[p]=[];
  renderStack(p,[],false);
  _finishTurn(p);
}

/* ════════════════════════════════
   AI TURNS
════════════════════════════════ */
function aiBuildTurn(){
  showAIBanner(`${G.aiAvatar} ${G.names[1]} está pensando`);
  const delay=900+Math.random()*1100;
  setTimeout(()=>{
    const choice=AI.chooseBuild(G);
    if(choice.action==='build'){
      const mol=buildMol(choice.cards);
      G.mols[1]=mol;
      G.molCards[1]=[...choice.cards];
      choice.cards.forEach(c=>{const i=G.hands[1].indexOf(c);if(i>-1)G.hands[1].splice(i,1);});
      G.discardSize+=G.molCards[1].length;
      renderStack(1,G.molCards[1],false);
      renderDecks();
      sfx.build();
      showAIBanner(`${G.aiAvatar} ${G.names[1]} ha reaccionado ⚗️`,1500);
    } else {
      applyDraw(1);
      sfx.draw();
      showAIBanner(`${G.aiAvatar} ${G.names[1]} roba 2 cartas 🃏`,1500);
    }
    setTimeout(()=>_finishTurn(1),1000);
  },delay);
}

function aiSpellTurn(){
  showAIBanner(`${G.aiAvatar} ${G.names[1]} medita un efecto`);
  setTimeout(()=>{
    const id=AI.chooseSpell(G);
    if(id){
      const sp=G.spells[1].find(s=>s.id===id);
      showAIBanner(`${G.aiAvatar} ${G.names[1]} usa ${sp?sp.name:id} ✨`,1700);
      doCastSpell(1,id);
    } else {
      showAIBanner(`${G.aiAvatar} ${G.names[1]} pasa`,1400);
      setTimeout(resolveCombat,900);
    }
  },900+Math.random()*900);
}

/* ════════════════════════════════
   REVEAL
════════════════════════════════ */
function showReveal(){
  const m0=G.mols[0]||{formula:'(robó)',atk:0,def:0,name:'Robó cartas',combo:false,hasU:false,valid:false};
  const m1=G.mols[1]||{formula:'(robó)',atk:0,def:0,name:'Robó cartas',combo:false,hasU:false,valid:false};
  if(G.mols[0]&&G.mols[1]){
    G.attacker=m0.atk>=m1.atk?0:1;
    const def=1-G.attacker;
    let atkV=G.mols[G.attacker].atk,defV=G.mols[def].def;
    if(G.mols[G.attacker].hasU)defV=Math.floor(defV/2);
    G.dmg[def]=Math.max(0,atkV-defV);
    G.dmg[G.attacker]=Math.max(0,G.mols[def].atk-G.mols[G.attacker].def);
  } else if(G.mols[0]){
    G.attacker=0;G.dmg[1]=Math.max(0,G.mols[0].atk);G.dmg[0]=0;
  } else if(G.mols[1]){
    G.attacker=1;G.dmg[0]=Math.max(0,G.mols[1].atk);G.dmg[1]=0;
  }
  const def=1-G.attacker;
  const atMol=G.mols[G.attacker]||m0, dfMol=G.mols[def]||m1;
  const atColor=G.attacker===0?'var(--acc)':'var(--red)';
  const dfColor=def===0?'var(--acc)':'var(--red)';
  document.getElementById('rev-header').innerHTML=
    `<span style="color:${atColor};font-weight:900">🗡${atMol.atk}</span>`+
    `<span style="color:var(--mut);font-size:.9rem;margin:0 1.1rem">vs</span>`+
    `<span style="color:${dfColor};font-weight:900">🛡${dfMol.def}</span>`;
  /* Voltea atacante, luego defensor */
  const at=G.attacker, df=1-G.attacker;
  const flipAt = G.mols[at] ? ()=>flipZone(at) : null;
  const flipDf = G.mols[df] ? ()=>flipZone(df) : null;
  const waitAt = flipAt ? 2000 : 0;
  const waitDf = flipDf ? 2000 : 0;
  if(flipAt) flipAt();
  setTimeout(()=>{
    if(flipDf) flipDf();
    setTimeout(()=>{
      document.getElementById('ov-reveal').classList.add('open');
    }, waitDf + 200);
  }, waitAt);
}

function addMarco(el){
  const m=document.createElement('img');
  m.src='img/marco.png';
  m.style.cssText='position:absolute;inset:-4px;width:calc(100% + 8px);height:calc(100% + 8px);object-fit:fill;pointer-events:none;z-index:30;';
  m.onerror=()=>m.remove();
  el.appendChild(m);
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
}

/* ════════════════════════════════
   SPELL PHASE
════════════════════════════════ */
function startSpellPhase(){
  document.getElementById('ov-reveal').classList.remove('open');
  G.phase='spells';
  G.helioCast=[false,false];
  G.spellPassed=[false,false];
  G.spellsInArena=[[],[]];
  const atMol=G.mols[G.attacker],dfMol=G.mols[1-G.attacker];
  /* empieza el atacante si su ATK <= DEF del defensor; si no, el defensor */
  const starter=(atMol&&dfMol&&atMol.atk<=dfMol.def)?G.attacker:(1-G.attacker);
  spellTurnStart(starter);
}

function spellTurnStart(p){
  G.spellTurn=p;
  if(G.vsAI&&p===1) aiSpellTurn();
  else openSpellPanel(p);
}

function openSpellPanel(p){
  const hint=document.getElementById('spell-phase-hint');
  if(hint){hint.style.display='';hint.textContent='⚡ Ronda de Efectos — '+G.names[p];}
  rotateTable(p===1);
  G.selSpell=null;
  const castBtn=document.getElementById('btn-cast-panel');
  castBtn.disabled=true;castBtn.style.opacity='.45';
  const _nameColor=p===0?'var(--acc)':'var(--red)';
  document.getElementById('sp-panel-title').innerHTML=
    `<span style="color:${_nameColor};font-weight:800;font-size:.9rem">${G.names[p]}</span>`;
  const hand=document.getElementById('sp-hand');hand.innerHTML='';
  const rival=1-p;
  const avail=G.spells[p].filter(sp=>!(G.helioCast[rival]&&sp.id==='He'));
  if(!avail.length){
    hand.innerHTML='<div class="no-mol-msg">Sin efectos disponibles.</div>';
  } else {
    avail.forEach(sp=>{
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
  }
  document.getElementById('spell-panel').classList.add('open');
}

function closeSpellPanelOnly(){
  document.getElementById('spell-panel').classList.remove('open');
}

/* ⚠️ Los efectos de los hechizos están pendientes de diseño: jugar la
   carta la muestra en la arena y la descarta, pero NO altera el daño
   ni el combate. Cuando se definan los efectos, implementarlos aquí. */
function doCastSpell(p,id){
  const sp=G.spells[p].find(s=>s.id===id);if(!sp)return;
  G.spells[p]=G.spells[p].filter(s=>s.id!==id);
  G.discardSize++;G.stats.spells++;
  const rival=1-p;
  G.spellPassed[p]=false;
  G.spellsInArena[p].push(sp);
  sfx.spell();
  renderZoneSpells(p);
  renderDecks();
  document.getElementById('spell-panel').classList.remove('open');
  if(G.spellPassed[rival]||!G.spells[rival].length){
    setTimeout(resolveCombat,700);
  } else {
    setTimeout(()=>spellTurnStart(rival),600);
  }
}

function castSpell(){
  if(!G.selSpell)return;
  doCastSpell(G.spellTurn,G.selSpell);
}

function passSpell(){
  document.getElementById('spell-panel').classList.remove('open');
  resolveCombat();
}

/* ════════════════════════════════
   COMBAT
════════════════════════════════ */
function animateFireball(winnerP, loserP, cb){
  const targetIdx = G.an[loserP] - 1; /* último analista vivo = el eliminado */
  const strip = document.getElementById('astrip'+(loserP+1));
  const cards = strip ? strip.querySelectorAll('.card') : [];
  const targetCard = cards[targetIdx];

  const srcZone = document.getElementById('pzone'+(winnerP+1));
  if(!srcZone||!targetCard){ cb&&cb(); return; }
  const sr = srcZone.getBoundingClientRect();
  const tr = targetCard.getBoundingClientRect();
  const sx = sr.left+sr.width/2, sy = sr.top+sr.height/2;
  const tx = tr.left+tr.width/2, ty = tr.top+tr.height/2;

  const color = winnerP===0 ? 'rgba(34,211,238,.8)' : 'rgba(251,113,133,.8)';
  const glow  = winnerP===0 ? '#7df' : '#f87';

  const fb = document.createElement('div');
  const sz = 28;
  fb.style.cssText = `position:fixed;width:${sz}px;height:${sz}px;border-radius:50%;
    background:radial-gradient(circle,#fff 0%,${glow} 55%,transparent 100%);
    --fb-c:${color};animation:fb-pulse .35s ease-in-out infinite;
    pointer-events:none;z-index:600;
    left:${sx-sz/2}px;top:${sy-sz/2}px;`;
  document.body.appendChild(fb);
  sfx.fire();

  const dur = 2200;
  fb.getBoundingClientRect(); /* fuerza reflow para que arranque la transición */
  fb.style.transition = `left ${dur}ms ease-in, top ${dur}ms ease-in, transform ${dur}ms ease-in`;
  fb.style.left = (tx-sz/2)+'px';
  fb.style.top  = (ty-sz/2)+'px';
  fb.style.transform = 'scale(2)';

  setTimeout(()=>{
    fb.remove();
    sfx.hit();
    const table=document.getElementById('game-table');
    if(table){table.classList.remove('shake');void table.offsetWidth;table.classList.add('shake');}
    targetCard.style.transition = 'opacity .25s, filter .25s';
    targetCard.style.opacity = '.45';
    targetCard.style.filter = 'grayscale(.85) brightness(.6)';
    setTimeout(()=>{ cb&&cb(); }, 1400);
  }, dur+50);
}

function resolveCombat(){
  document.getElementById('spell-panel').classList.remove('open');
  hideAIBanner();

  const losers = [0,1].filter(p=>G.dmg[p]>0);
  function applyAndContinue(){
    for(let p=0;p<2;p++){if(G.dmg[p]>0){G.an[p]=Math.max(0,G.an[p]-1);G.stats.anLost[p]+=1;}}
    G.stats.rounds++;
    renderStrip(0);renderStrip(1);
    if(G.an[0]<=0||G.an[1]<=0){endGame();return;}
    nextRound();
  }
  if(!losers.length){ applyAndContinue(); return; }
  let i=0;
  function next(){
    if(i>=losers.length){ applyAndContinue(); return; }
    const lp=losers[i++];
    animateFireball(1-lp, lp, next);
  }
  next();
}

function nextRound(){
  const hint=document.getElementById('spell-phase-hint');if(hint)hint.style.display='none';
  G.round++;G.mols=[null,null];G.molCards=[[],[]];G.dmg=[0,0];G.spellsInArena=[[],[]];
  G.acted=[false,false];
  document.getElementById('zspells1').innerHTML='';
  document.getElementById('zspells2').innerHTML='';
  for(let p=0;p<2;p++){
    for(let i=0;i<3;i++) G.hands[p].push({...weightedRandom(ELEMENTS)});
    if(G.hands[p].length>8) G.hands[p]=G.hands[p].slice(G.hands[p].length-8);
    if(!G.spells[p].length) G.spells[p]=[{...weightedRandom(SPELLS)}];
    G.deckSize[p]=G.hands[p].length+G.spells[p].length;
  }
  renderDecks();
  renderStack(0,[],false);renderStack(1,[],false);
  const firstP=1-G.attacker; /* el defensor empieza la siguiente ronda */
  beginTurn(firstP);
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
    <div class="crow"><span>Rondas</span><span class="cv">${G.stats.rounds}</span></div>
    <div class="crow"><span>Analistas perdidos ${G.names[0]}</span><span class="cv bad">${G.stats.anLost[0]}</span></div>
    <div class="crow"><span>Analistas perdidos ${G.names[1]}</span><span class="cv bad">${G.stats.anLost[1]}</span></div>
    <div class="crow"><span>Efectos</span><span class="cv">${G.stats.spells}</span></div>
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

/* ════════════════════════════════
   LONG PRESS + ZOOM
════════════════════════════════ */
let _zoomJustOpened=false;

function addLongPress(el,fn){
  let timer=null;
  let fired=false;

  function startTimer(){
    if(timer)clearTimeout(timer);
    fired=false;
    timer=setTimeout(()=>{fired=true;timer=null;fn();},1000);
  }
  function cancelTimer(){
    if(timer){clearTimeout(timer);timer=null;}
  }

  el.addEventListener('touchstart',startTimer,{passive:true});
  el.addEventListener('touchend',(e)=>{
    cancelTimer();
    if(fired){
      e.preventDefault(); /* bloquea el click sintético que cerraría el zoom */
      fired=false;
    }
  });
  el.addEventListener('touchmove',cancelTimer,{passive:true});
  el.addEventListener('touchcancel',cancelTimer);
  el.addEventListener('contextmenu',(e)=>{e.preventDefault();});

  el.addEventListener('mousedown',startTimer);
  el.addEventListener('mouseup',cancelTimer);
  el.addEventListener('mouseleave',cancelTimer);
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
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-'+id).classList.add('active');}
function openRules(){document.getElementById('ov-rules').classList.add('open');}

function toggleSound(){
  const m=sfx.toggle();
  document.getElementById('btn-sound').textContent=m?'🔇':'🔊';
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
  document.getElementById('btn-sound').textContent=sfx.muted?'🔇':'🔊';
  /* desbloquea el audio y reproduce click en interacciones */
  document.addEventListener('pointerdown',()=>sfx.unlock(),{once:true});
  document.addEventListener('click',(e)=>{
    if(e.target.closest('.btn,.mode-card,.diff-chip,.hand-arrow,.pdeck,.cpile.draw'))sfx.click();
  });
  /* pista de instalación en iOS (sin beforeinstallprompt) */
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
