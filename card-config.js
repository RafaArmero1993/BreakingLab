/* ════════════════════════════════════
   CARD WEIGHT CONFIGURATION
   ════════════════════════════════════
   Modifica los valores de peso para controlar la probabilidad de aparición
   de cada carta en el mazo de los jugadores.

   - Mayor peso = mayor probabilidad de aparecer.
   - Peso por defecto: 1.
   - Un jugador puede tener cartas duplicadas.
   - Ejemplo: un elemento con peso 4 aparece 4 veces más que uno con peso 1.
════════════════════════════════════ */

const CARD_WEIGHTS = {

  /* ── Elementos ── */
  'O':  3,   // Oxígeno  — común (forma muchas moléculas)
  'H':  4,   // Hidrógeno — muy común (base de casi todo)
  'N':  2,   // Nitrógeno
  'C':  2,   // Carbono
  'S':  2,   // Azufre
  'P':  2,   // Fósforo
  'U':  1,   // Uranio   — raro (muy poderoso)

  /* ── Hechizos (reparto inicial y reposición) ── */
  'Pb': 2,   // Plomo  — Escudo
  'He': 2,   // Helio  — Evasión

};
