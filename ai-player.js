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
      if(ok) res.push({cards, atk:mol.atk, def:mol.def, n:cards.length});
    }
    return res;
  },

  /* Decisión del turno como ATACANTE. Devuelve:
       {action:'attack', cards:[...]}  atacar con una molécula
       {action:'spell',  id:'Au'}      jugar un hechizo como acción
       {action:'draw'}                 robar 2 cartas
     El defensor responderá después, así que se elige a ciegas:
     maximizar ATK (el daño es ATK − DEF de la defensa rival). */
  chooseAction(G){
    const hand = G.hands[1];
    const lvl  = G.aiLevel || 'normal';
    const opts = this.findBuilds(hand);

    if(lvl === 'easy'){
      if(G.spells[1].length && Math.random() < .15)
        return {action:'spell', id: G.spells[1][Math.floor(Math.random()*G.spells[1].length)].id};
      if(!opts.length || Math.random() < .3) return {action:'draw'};
      const o = opts[Math.floor(Math.random()*opts.length)];
      return {action:'attack', cards:o.cards};
    }

    /* Oro = financiación: con la mano corta es la mejor jugada */
    if(G.spells[1].some(s=>s.id==='Au') && hand.length <= 4)
      return {action:'spell', id:'Au'};

    if(!opts.length) return {action:'draw'};
    /* Nobel: más ATK con desempate por menos cartas;
       Doctora: simplemente el de más ATK. */
    opts.sort(lvl === 'hard'
      ? (a,b)=>(b.atk-a.atk)||(a.n-b.n)
      : (a,b)=>b.atk-a.atk);
    const best = opts[0];
    /* ataque flojo y mano corta → mejor pescar cartas */
    const minAtk = lvl === 'hard' ? 5 : 4;
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
    const minDef = desperate ? 4 : 5;
    if(best.def >= minDef) return {cards: best.cards};
    if(lvl === 'normal' && best.def >= 4 && Math.random() < .4)
      return {cards: best.cards};
    return null;
  },

  /* Paso de la ronda de hechizos: id del hechizo a jugar o null (pasar).
     Las jugadas YA están reveladas en esta fase, así que la IA puede
     evaluar la batalla con los modificadores de los hechizos.
     Pb blinda contra radiactivos · He/Pt refuerzan · Ne/Hg debilitan ·
     Ar contra-anula · Au roba 3. */
  chooseRoundSpell(G){
    const hand = G.spells[1];
    if(!hand.length) return null;
    const lvl = G.aiLevel || 'normal';
    if(lvl === 'easy')
      return Math.random() < .4 ? hand[Math.floor(Math.random()*hand.length)].id : null;

    const has = id => hand.some(s=>s.id===id);
    const iAmAtk = G.turn === 1;
    const myMol = G.mols[1], rivalMol = G.mols[0];
    const rivalCastSomething = (G.spellsInArena[0]||[]).length > 0;
    const isRad = m => !!(m && m.rad);

    /* contramagia: anula los hechizos que el rival ya ha jugado */
    if(has('Ar') && rivalCastSomething) return 'Ar';
    /* financiación siempre es valor */
    if(has('Au')) return 'Au';

    if(iAmAtk && myMol){
      const defV = rivalMol ? rivalMol.def : 0;
      const gap = defV - myMol.atk; /* >=0 → me bloquean */
      if(rivalMol && gap >= 0){
        if(has('Pb') && isRad(rivalMol)) return 'Pb';
        if(has('Hg') && gap < 2) return 'Hg';
        if(has('Pt') && gap < 1) return 'Pt';
      }
    } else if(!iAmAtk && rivalMol){
      if(has('Pb') && isRad(rivalMol)) return 'Pb';
      const margin = rivalMol.atk - (myMol ? myMol.def : 0); /* >0 → recibo daño */
      if(margin > 0){
        if(myMol && has('He') && margin <= 2) return 'He';
        if(has('Ne') && margin <= 2) return 'Ne';
        if(myMol && has('Pt') && margin <= 1) return 'Pt';
        if(lvl === 'hard'){ /* a la desesperada, todo refuerzo suma */
          if(myMol && has('He')) return 'He';
          if(has('Ne')) return 'Ne';
        }
      }
    }
    return null;
  },
};
