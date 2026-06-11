/* ════════════════════════════════════
   CARD WEIGHTS  (GENERADO por tools/generate_data.py)
   Peso de cada elemento ∝ veces que aparece en VALID_MOLECULES
   (para H₂O: H cuenta 2 y O cuenta 1; se suman todas).
   Escala 1..10. Los hechizos tienen peso propio.
════════════════════════════════════ */

const CARD_WEIGHTS = {
  "O": 10,  // 190 apariciones
  "Cl":  7,  // 133 apariciones
  "F":  4,  // 80 apariciones
  "H":  4,  // 77 apariciones
  "S":  3,  // 54 apariciones
  "N":  2,  // 39 apariciones
  "C":  2,  // 37 apariciones
  "Br":  2,  // 32 apariciones
  "Na":  1,  // 19 apariciones
  "I":  1,  // 18 apariciones
  "K":  1,  // 15 apariciones
  "Ca":  1,  // 15 apariciones
  "Fe":  1,  // 15 apariciones
  "Li":  1,  // 13 apariciones
  "B":  1,  // 13 apariciones
  "Mg":  1,  // 13 apariciones
  "Cu":  1,  // 10 apariciones
  "Ag":  1,  // 10 apariciones
  "Si":  1,  // 8 apariciones
  "Mn":  1,  // 8 apariciones
  "Se":  1,  // 8 apariciones
  "Al":  1,  // 7 apariciones
  "P":  1,  // 7 apariciones
  "Zn":  1,  // 7 apariciones
  "As":  1,  // 7 apariciones
  "Sn":  1,  // 7 apariciones
  "Sb":  1,  // 7 apariciones
  "Ba":  1,  // 7 apariciones
  "Bi":  1,  // 7 apariciones
  "Ti":  1,  // 6 apariciones
  "V":  1,  // 6 apariciones
  "Sr":  1,  // 6 apariciones
  "Cr":  1,  // 5 apariciones
  "Cd":  1,  // 5 apariciones
  "Cs":  1,  // 5 apariciones
  "U":  1,  // 5 apariciones
  "Co":  1,  // 4 apariciones
  "Ni":  1,  // 4 apariciones
  "W":  1,  // 4 apariciones
  "Po":  1,  // 4 apariciones
  "Be":  1,  // 3 apariciones
  "Mo":  1,  // 3 apariciones
  "Ra":  1,  // 3 apariciones
  "Pb":  5,  // hechizo
  "He":  6,  // hechizo
  "Ne":  6,  // hechizo
  "Ar":  5,  // hechizo
  "Au":  3,  // hechizo
  "Pt":  4,  // hechizo
  "Hg":  4,  // hechizo
};
