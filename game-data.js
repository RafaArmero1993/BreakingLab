/* ════════════════════════════════════════════════════════════════
   GAME DATA — BreakingLab
   ════════════════════════════════════════════════════════════════
   Fichero de configuración del juego. Puedes añadir, editar o
   eliminar elementos, hechizos y moléculas libremente.

   ── ELEMENTOS ─────────────────────────────────────────────────
   Cada elemento requiere:
     id   : identificador único (string, p.e. 'O')
     sym  : símbolo mostrado en la carta
     name : nombre completo
     num  : número atómico
     atk  : puntos de ataque  (número entero ≥ 0)
     def  : puntos de defensa (número entero ≥ 0)
     type : tipo visual → 'nonmetal' (azul) | 'spell' / 'noble' (dorado)
     img  : ruta a la imagen (p.e. 'img/O.png')
     eff  : texto del efecto especial
     info : dato curioso

   ── HECHIZOS ──────────────────────────────────────────────────
   Igual que elementos pero con type 'spell' o 'noble'.
   ⚠️ Los efectos están PENDIENTES DE DISEÑO: por ahora jugar un
   hechizo no altera el combate. Cuando se definan, implementarlos
   en doCastSpell() dentro de game.js (y la heurística de la IA en
   AI.chooseSpell() dentro de ai-player.js).

   ── MOLÉCULAS ─────────────────────────────────────────────────
   Cada entrada requiere:
     ids     : array con los ids de elementos que la forman.
               Pueden repetirse (p.e. ['H','H','O'] para H₂O).
     name    : nombre de la molécula
     formula : fórmula química (puedes usar subíndices Unicode)
     atk     : ATK total de la molécula
     def     : DEF total de la molécula
════════════════════════════════════════════════════════════════ */

/* ── Moléculas válidas ──
   ⚠️ El orden de `ids` importa: es el orden en el que el jugador debe
   seleccionar las cartas, y debe leerse igual que la fórmula
   (NH₃ → N,H,H,H · SO₂ → S,O,O · PH₃ → P,H,H,H · PO → P,O). */
const VALID_MOLECULES = [
  {ids:['H','H','O'],       name:'Agua',     formula:'H₂O',   atk:4, def:4},
  {ids:['H','H','O','O'],   name:'Peróxido', formula:'H₂O₂',  atk:5, def:3},
  {ids:['O','O'],           name:'O₂',       formula:'O₂',    atk:4, def:2},
  {ids:['H','H'],           name:'H₂',       formula:'H₂',    atk:2, def:3},
  {ids:['H','H','H'],       name:'H₃',       formula:'H₃',    atk:3, def:4},
  {ids:['C','O'],           name:'CO',       formula:'CO',    atk:4, def:2},
  {ids:['C','O','O'],       name:'CO₂',      formula:'CO₂',   atk:5, def:2},
  {ids:['N','N'],           name:'N₂',       formula:'N₂',    atk:3, def:5},
  {ids:['N','O','P'],       name:'NOP',      formula:'NOP',   atk:6, def:3},
  {ids:['N','O','O'],       name:'NO₂',      formula:'NO₂',   atk:5, def:3},
  {ids:['N','H','H','H'],   name:'Amoníaco', formula:'NH₃',   atk:5, def:3},
  {ids:['H','H','S'],       name:'H₂S',      formula:'H₂S',   atk:6, def:2},
  {ids:['S','O','O'],       name:'SO₂',      formula:'SO₂',   atk:6, def:2},
  {ids:['S','S'],           name:'S₂',       formula:'S₂',    atk:5, def:2},
  {ids:['P','H','H','H'],   name:'PH₃',      formula:'PH₃',   atk:5, def:3},
  {ids:['P','O'],           name:'PO',       formula:'PO',    atk:4, def:3},
];

/* ── Elementos ── */
const ELEMENTS = [
  {id:'O', sym:'O', name:'Oxígeno',   num:8,  atk:3, def:1, type:'nonmetal', img:'img/O.png',
   eff:'Potencia moléculas oxidantes.', info:'Gas esencial. 21% de la atmósfera.',
   hist:'Carl Scheele y Joseph Priestley lo aislaron casi a la vez (1771-1774), pero fue Lavoisier quien lo entendió y le dio nombre. Su descubrimiento destruyó la teoría del flogisto y fundó la química moderna. Sin él no habría fuego… ni tú estarías leyendo esto.'},
  {id:'H', sym:'H', name:'Hidrógeno', num:1,  atk:1, def:2, type:'nonmetal', img:'img/H.png',
   eff:'Base de toda molécula.', info:'El elemento más abundante del universo.',
   hist:'Henry Cavendish lo descubrió en 1766 y lo llamó «aire inflamable». Lavoisier lo bautizó hidrógeno: «creador de agua». Es el 90 % de los átomos del universo y el combustible de las estrellas: el Sol fusiona 600 millones de toneladas cada segundo.'},
  {id:'N', sym:'N', name:'Nitrógeno', num:7,  atk:2, def:3, type:'nonmetal', img:'img/N.png',
   eff:'Estabilizador. +1 DEF al activarse.', info:'Compone el 78% del aire.',
   hist:'Daniel Rutherford lo aisló en 1772 estudiando el «aire quemado» donde nada podía vivir. Su nombre francés, azote, significa «sin vida». Irónicamente hoy alimenta al mundo: el proceso Haber-Bosch lo convierte en el fertilizante que sostiene a media humanidad.'},
  {id:'C', sym:'C', name:'Carbono',   num:6,  atk:2, def:2, type:'nonmetal', img:'img/C.png',
   eff:'Base orgánica. +1 ATK y +1 DEF.', info:'El elemento de la vida.',
   hist:'Conocido desde la prehistoria como carbón y hollín, Lavoisier lo reconoció como elemento en 1789. Es el gran arquitecto de la vida: cada célula tuya se construye sobre él. Y según cómo ordene sus átomos, es lápiz barato… o diamante.'},
  {id:'S', sym:'S', name:'Azufre',    num:16, atk:4, def:1, type:'nonmetal', img:'img/S.png',
   eff:'Corrosivo. Con H inflige daño extra.', info:'Elemento volcánico.',
   hist:'Los antiguos ya lo conocían: es el «fuego y azufre» de la Biblia y el favorito de los alquimistas. Lavoisier demostró en 1777 que era un elemento. Dio su potencia a la pólvora china y hoy vulcaniza los neumáticos de tu coche.'},
  {id:'P', sym:'P', name:'Fósforo',   num:15, atk:3, def:2, type:'nonmetal', img:'img/P.png',
   eff:'Potenciador. +2 ATK con O.', info:'Esencial en el ADN. Fósforo blanco es inflamable.',
   hist:'Hennig Brand lo descubrió en 1669 destilando orina en busca de la piedra filosofal: obtuvo una cera que brillaba en la oscuridad y lo llamaron «portador de luz». Fue el primer elemento con descubridor conocido… y hoy guarda la energía de tu ADN.'},
  {id:'U', sym:'U', name:'Uranio',    num:92, atk:6, def:3, type:'nonmetal', img:'img/U.png',
   eff:'☢ CRÍTICO: Ignora la mitad de la DEF rival.', info:'Metal radiactivo. Fisión nuclear.',
   hist:'Martin Klaproth lo aisló en 1789 y lo nombró por el recién descubierto planeta Urano. Con él, Becquerel descubrió la radiactividad en 1896, y en 1938 su fisión cambió la historia para siempre. Un solo kilo libera la energía de 2.700 toneladas de carbón.'},
];

/* ── Hechizos ── */
const SPELLS = [
  {id:'Pb', sym:'Pb', name:'Plomo', num:82, atk:0, def:5, type:'spell', img:'img/Pb.png',
   eff:'✨ Efecto por definir. De momento no hace nada.', info:'Blindaje contra radiación.',
   hist:'Los romanos lo usaban en tuberías, copas y monedas: de su nombre latino, plumbum, viene «plomería». Es tan denso que detiene la radiación — por eso los delantales de rayos X lo llevan dentro. Algunos historiadores culpan a sus tuberías del declive de Roma.'},
  {id:'He', sym:'He', name:'Helio', num:2,  atk:3, def:0, type:'noble', img:'img/He.png',
   eff:'✨ Efecto por definir. De momento no hace nada.', info:'Gas noble inerte.',
   hist:'El único elemento descubierto fuera de la Tierra: Janssen y Lockyer lo detectaron en 1868 en el espectro del Sol y lo nombraron por Helios. Es el segundo más abundante del universo, no reacciona con nada y sin él no funcionarían las resonancias magnéticas.'},
];
