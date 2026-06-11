/* ════════════════════════════════════════════════════════════════
   AI PLAYER — BreakingLab
   ════════════════════════════════════════════════════════════════
   Oponente simulado para el modo "Contra la Máquina".
   La IA siempre es el jugador 1 (zona superior).

   Niveles:
     easy   → Becario Byte      juega relajado, comete errores
     normal → Dra. Curie 3000   juega sólido, la mejor molécula
     hard   → Dr. Heisenberg IA optimiza ataque, economía de cartas
                                y uso de efectos
════════════════════════════════════════════════════════════════ */

const AI_LEVELS = {
  easy:   {key:'easy',   label:'Becario', emoji:'🥼', name:'Becario Byte',
           corp:'GarajeLab™',
           desc:'GarajeLab™ — un becario con ganas. Comete errores. Ideal para aprender.'},
  normal: {key:'normal', label:'Doctora', emoji:'🔬', name:'Dra. Curie 3000',
           corp:'Quantum Corp™',
           desc:'Quantum Corp™ — juega sólido. Un reto justo.'},
  hard:   {key:'hard',   label:'Nobel',   emoji:'🧠', name:'Dr. Heisenberg IA',
           corp:'Helix Industries™',
           desc:'Helix Industries™ — calcula cada átomo. Sin piedad.'},
};

const AI = {

  /* Todas las jugadas posibles con la mano actual:
     moléculas válidas completas + Uranio en solitario. */
  findBuilds(hand){
    const res = [];
    for(const mol of VALID_MOLECULES){
      const avail = [...hand], cards = [];
      let ok = true;
      for(const id of mol.ids){
        const i = avail.findIndex(c => c.id === id);
        if(i === -1){ ok = false; break; }
        cards.push(avail[i]); avail.splice(i,1);
      }
      if(ok) res.push({cards, atk:mol.atk, def:mol.def, hasU:false, n:cards.length});
    }
    const u = hand.find(c => c.id === 'U');
    if(u) res.push({cards:[u], atk:u.atk, def:u.def, hasU:true, n:1});
    return res;
  },

  /* Decisión del turno como ATACANTE. Devuelve:
       {action:'attack', cards:[...]}  atacar con una molécula
       {action:'spell',  id:'Pb'}      jugar un hechizo (sin efecto aún)
       {action:'draw'}                 robar 2 cartas
     El defensor responderá después, así que se elige a ciegas:
     maximizar ATK (el daño es ATK − DEF de la defensa rival). */
  chooseAction(G){
    const hand = G.hands[1];
    const lvl  = G.aiLevel || 'normal';
    const opts = this.findBuilds(hand);

    if(lvl === 'easy'){
      /* ⚠️ Hechizos sin efecto: el Becario juega uno de vez en cuando
         solo por diversión. Quitar cuando los efectos se definan. */
      if(G.spells[1].length && Math.random() < .15)
        return {action:'spell', id: G.spells[1][Math.floor(Math.random()*G.spells[1].length)].id};
      if(!opts.length || Math.random() < .3) return {action:'draw'};
      const o = opts[Math.floor(Math.random()*opts.length)];
      return {action:'attack', cards:o.cards};
    }

    if(!opts.length) return {action:'draw'};
    /* Nobel: más ATK con desempate por menos cartas y U primero;
       Doctora: simplemente el de más ATK. */
    opts.sort(lvl === 'hard'
      ? (a,b)=>(b.atk-a.atk)||(a.n-b.n)||((b.hasU?1:0)-(a.hasU?1:0))
      : (a,b)=>b.atk-a.atk);
    const best = opts[0];
    /* ataque flojo y mano corta → mejor pescar cartas */
    const minAtk = lvl === 'hard' ? 4 : 3;
    if(best.atk < minAtk && hand.length <= 6) return {action:'draw'};
    return {action:'attack', cards:best.cards};
  },

  /* Decisión como DEFENSOR. Devuelve {cards:[...]} o null (pasar).
     ⚠️ A CIEGAS: el ataque rival está boca abajo, la IA no conoce su
     ATK. Defiende según la calidad de su mejor muro: una defensa
     floja es tirar cartas (cualquier daño > 0 cuesta 1 analista). */
  chooseDefense(G){
    const hand = G.hands[1];
    const lvl  = G.aiLevel || 'normal';
    const opts = this.findBuilds(hand);
    if(!opts.length) return null;

    if(lvl === 'easy'){
      if(Math.random() < .55)
        return {cards: opts[Math.floor(Math.random()*opts.length)].cards};
      return null;
    }

    /* mejor muro: máxima DEF, desempate por menos cartas */
    opts.sort((a,b)=>(b.def-a.def)||(a.n-b.n));
    const best = opts[0];
    const desperate = G.an[1] <= 2; /* con la vida al límite arriesga más */
    const minDef = lvl === 'hard' ? (desperate ? 3 : 4) : (desperate ? 3 : 4);
    if(best.def >= minDef) return {cards: best.cards};
    if(lvl === 'normal' && best.def >= 3 && Math.random() < .4)
      return {cards: best.cards};
    return null;
  },

  /* Paso de la ronda de hechizos: id del hechizo a jugar o null (pasar).
     ⚠️ Efectos pendientes de diseño → casi siempre pasa. Implementar
     aquí la heurística real cuando se definan los efectos. */
  chooseRoundSpell(G){
    const hand = G.spells[1];
    if(!hand.length) return null;
    const pr = {easy:.4, normal:.2, hard:.1}[G.aiLevel || 'normal'] ?? .2;
    return Math.random() < pr ? hand[Math.floor(Math.random()*hand.length)].id : null;
  },
};
