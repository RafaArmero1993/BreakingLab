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

  /* Decisión del turno. Devuelve:
       {action:'battle', cards:[...]}  construir molécula y atacar
       {action:'spell',  id:'Pb'}      jugar un hechizo (sin efecto aún)
       {action:'draw'}                 robar 2 cartas
     Reglas de combate que evalúa: dmg = ATK − DEF rival (U ignora
     media DEF); dmg > 0 destruye la molécula rival y elimina 1
     analista; sin molécula rival el golpe es directo. */
  chooseAction(G){
    const hand   = G.hands[1];
    const lvl    = G.aiLevel || 'normal';
    const opts   = this.findBuilds(hand);
    const target = G.mols[0]; /* molécula defensiva del jugador */

    const breaks = o => {
      if(!target) return o.atk > 0; /* golpe directo */
      const defV = o.hasU ? Math.floor(target.def/2) : target.def;
      return o.atk - defV > 0;
    };
    const killers = opts.filter(breaks);

    if(lvl === 'easy'){
      /* ⚠️ Hechizos sin efecto: el Becario juega uno de vez en cuando
         solo por diversión. Quitar cuando los efectos se definan. */
      if(G.spells[1].length && Math.random() < .15)
        return {action:'spell', id: G.spells[1][Math.floor(Math.random()*G.spells[1].length)].id};
      if(!opts.length || Math.random() < .3) return {action:'draw'};
      const o = opts[Math.floor(Math.random()*opts.length)];
      return {action:'battle', cards:o.cards};
    }

    if(killers.length){
      /* Nobel: el rompedor más barato en cartas (desempate: más ATK).
         Doctora: simplemente el de más ATK. */
      killers.sort(lvl === 'hard'
        ? (a,b)=>(a.n-b.n)||(b.atk-a.atk)
        : (a,b)=>b.atk-a.atk);
      return {action:'battle', cards:killers[0].cards};
    }

    /* No puede romper la defensa rival. Si está expuesta (sin molécula
       propia) o tiene la mano llena, levanta un muro defensivo: el
       ataque rebotará pero la molécula queda protegiendo su zona.
       Si no, roba para pescar mejores cartas. */
    if(opts.length && (!G.mols[1] || hand.length >= 7)){
      opts.sort((a,b)=>(b.def-a.def)||(b.atk-a.atk));
      return {action:'battle', cards:opts[0].cards};
    }
    return {action:'draw'};
  },
};
