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
           desc:'Juega relajado y se equivoca. Ideal para aprender.'},
  normal: {key:'normal', label:'Doctora', emoji:'🔬', name:'Dra. Curie 3000',
           desc:'Juega sólido. Un reto justo.'},
  hard:   {key:'hard',   label:'Nobel',   emoji:'🧠', name:'Dr. Heisenberg IA',
           desc:'Calcula cada átomo. Sin piedad.'},
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

  /* Decisión de turno de construcción.
     Devuelve {action:'draw'} o {action:'build', cards:[...]}. */
  chooseBuild(G){
    const hand = G.hands[1];
    const lvl  = G.aiLevel || 'normal';
    const opts = this.findBuilds(hand);

    if(!opts.length) return {action:'draw'};

    if(lvl === 'easy'){
      /* A veces roba aunque pueda construir, y elige una jugada al azar */
      if(Math.random() < .35 && hand.length < 8) return {action:'draw'};
      return {action:'build', cards: opts[Math.floor(Math.random()*opts.length)].cards};
    }

    const wAtk = lvl === 'hard' ? 1.8 : 1.5;
    const score = o => o.atk*wAtk + o.def + (o.hasU ? 1.5 : 0)
                     - (lvl === 'hard' ? o.n*0.35 : 0); /* economía de cartas */
    opts.sort((a,b) => score(b) - score(a));
    const best = opts[0];

    /* El Nobel prefiere pescar mejores cartas antes que lanzar una molécula floja */
    if(lvl === 'hard' && best.atk <= 3 && hand.length <= 5 && G.sharedDeck > 0)
      return {action:'draw'};

    return {action:'build', cards: best.cards};
  },

  /* Decisión en la ronda de efectos. Devuelve el id del hechizo o null (pasar).
     Pb → reduce 4 el daño que recibe quien lo lanza.
     He → +3 daño al rival y cierra la ronda de efectos. */
  chooseSpell(G){
    const lvl  = G.aiLevel || 'normal';
    const hand = G.spells[1];
    if(!hand.length) return null;
    const has = id => hand.some(s => s.id === id);
    const incoming = G.dmg[1]; /* daño que va a recibir la IA */
    const outgoing = G.dmg[0]; /* daño que va a recibir el jugador */

    if(lvl === 'easy'){
      return Math.random() < .5 ? hand[Math.floor(Math.random()*hand.length)].id : null;
    }

    if(incoming > 0 && has('Pb')) return 'Pb';
    if(outgoing > 0 && has('He') && !G.helioCast[0]) return 'He';
    /* El Nobel usa Helio también para asegurar daño y bloquear el Plomo rival */
    if(lvl === 'hard' && has('He') && !G.helioCast[0]) return 'He';
    return null;
  },
};
