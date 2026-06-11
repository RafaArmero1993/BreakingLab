#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de datos de BreakingLab (v1.7)
Produce game-data.js y card-config.js:
- 43 elementos de ataque/defensa + 7 hechizos (50 cartas).
- ~250 moléculas/elementos nativos REALES (ids en el orden de la fórmula).
- Frecuencia de cada carta proporcional a sus apariciones en las moléculas.
- ATK/DEF por elemento balanceado por rareza (raro = fuerte) con sabor químico.
- Stats de molécula = suma de los stats de sus elementos.
Ejecutar:  python3 tools/generate_data.py
"""
import re, hashlib, collections, json

# ── 43 elementos de batalla: id → (nombre, Z, categoría, info, historia) ──
E = {
 'H': ('Hidrógeno',1,'h','El elemento más abundante del universo.','Cavendish lo aisló en 1766; Lavoisier lo llamó «creador de agua». Es el combustible de las estrellas.'),
 'Li':('Litio',3,'alkali','El metal más ligero que existe.','Arfwedson lo halló en 1817 en una mina sueca. Hoy mueve el mundo dentro de las baterías.'),
 'Be':('Berilio',4,'alkearth','Ligero y rígido: aeroespacial.','Vauquelin lo descubrió en 1798 analizando esmeraldas: el berilo le dio nombre.'),
 'B': ('Boro',5,'metalloid','Esencial en vidrios resistentes.','Gay-Lussac y Davy lo aislaron casi a la vez en 1808. Endurece el vidrio borosilicatado de tu laboratorio.'),
 'C': ('Carbono',6,'c','El elemento de la vida.','Conocido desde la prehistoria como carbón y hollín. Según ordene sus átomos es lápiz… o diamante.'),
 'N': ('Nitrógeno',7,'pnictogen','Compone el 78% del aire.','Rutherford lo aisló en 1772. Su nombre francés, azote, significa «sin vida»; hoy fertiliza al mundo.'),
 'O': ('Oxígeno',8,'chalcogen','21% de la atmósfera.','Scheele y Priestley lo aislaron (1771-74); Lavoisier lo entendió y fundó la química moderna.'),
 'F': ('Flúor',9,'halogen','El elemento más reactivo.','Moissan lo domó en 1886 tras décadas de intentos que costaron salud (y vidas) a varios químicos.'),
 'Na':('Sodio',11,'alkali','Explota en contacto con agua.','Davy lo aisló en 1807 por electrólisis. La mitad de la sal de tu cocina.'),
 'Mg':('Magnesio',12,'alkearth','Arde con luz blanca cegadora.','Davy lo aisló en 1808. Iluminó los primeros flashes de fotografía.'),
 'Al':('Aluminio',13,'post','El metal más abundante de la corteza.','Wöhler lo obtuvo puro en 1827; fue más caro que el oro hasta dominarse su electrólisis.'),
 'Si':('Silicio',14,'metalloid','La base de toda la electrónica.','Berzelius lo aisló en 1824. De la arena de playa a los chips de tu móvil.'),
 'P': ('Fósforo',15,'pnictogen','Guarda la energía del ADN.','Brand lo descubrió en 1669 destilando orina en busca de la piedra filosofal: brillaba en la oscuridad.'),
 'S': ('Azufre',16,'chalcogen','El «fuego y azufre» bíblico.','Conocido desde la antigüedad; Lavoisier probó en 1777 que era un elemento. Potenció la pólvora.'),
 'Cl':('Cloro',17,'halogen','Desinfecta el agua del planeta.','Scheele lo obtuvo en 1774. Salva millones de vidas potabilizando agua… y fue arma en 1915.'),
 'K': ('Potasio',19,'alkali','Imprescindible para tus neuronas.','Davy lo aisló en 1807: el primer metal obtenido por electrólisis. Arde en violeta.'),
 'Ca':('Calcio',20,'alkearth','Construye huesos y montañas.','Davy lo aisló en 1808. La cal con la que Roma levantó su imperio era su óxido.'),
 'Ti':('Titanio',22,'transition','Tan fuerte como ligero.','Gregor lo halló en 1791. De las prótesis de cadera a los motores de los cohetes.'),
 'V': ('Vanadio',23,'transition','Endurece los aceros.','Del Río lo descubrió en México en 1801, pero no le creyeron; Sefström lo redescubrió en 1830.'),
 'Cr':('Cromo',24,'transition','El brillo de los cromados.','Vauquelin lo aisló en 1797. Da su rojo al rubí y su verde a la esmeralda.'),
 'Mn':('Manganeso',25,'transition','Imprescindible en el acero.','Gahn lo aisló en 1774. Los pigmentos de las cuevas de Altamira ya lo contenían.'),
 'Fe':('Hierro',26,'transition','El esqueleto de la civilización.','Forjado desde hace 5.000 años; los primeros hierros fueron meteoritos caídos del cielo.'),
 'Co':('Cobalto',27,'transition','Azul de los maestros vidrieros.','Brandt lo aisló en 1735: el primer metal descubierto desde la antigüedad. Su nombre viene de los kobold, duendes mineros.'),
 'Ni':('Níquel',28,'transition','Resiste la corrosión.','Cronstedt lo aisló en 1751 del «cobre del diablo» que frustraba a los mineros alemanes.'),
 'Cu':('Cobre',29,'transition','Conduce la electricidad del mundo.','Trabajado desde hace 10.000 años; dio nombre a una era entera de la humanidad.'),
 'Zn':('Cinc',30,'transition','Protege al acero del óxido.','Conocido en la India medieval; Marggraf lo describió en Europa en 1746. Galvaniza el mundo.'),
 'As':('Arsénico',33,'metalloid','El veneno de los Borgia.','Alberto Magno lo aisló hacia 1250. Durante siglos fue «el polvo de la herencia».'),
 'Se':('Selenio',34,'chalcogen','Fotosensible: ve la luz.','Berzelius lo descubrió en 1817 y lo nombró por Selene, la Luna. Hizo posibles las primeras fotocopias.'),
 'Br':('Bromo',35,'halogen','Único no metal líquido.','Balard lo aisló en 1826 de las salinas. Su nombre significa «hedor»… con razón.'),
 'Sr':('Estroncio',38,'alkearth','El rojo de los fuegos artificiales.','Descubierto en 1790 en un mineral escocés de Strontian. Tiñe de carmesí la pirotecnia.'),
 'Mo':('Molibdeno',42,'transition','Acero de blindajes y motores.','Scheele lo distinguió del plomo en 1778; Hjelm lo aisló en 1781.'),
 'Ag':('Plata',47,'transition','El metal que mejor conduce.','Trabajada desde hace 5.000 años; mató más bacterias que muchos antibióticos.'),
 'Cd':('Cadmio',48,'transition','Tóxico y fotovoltaico.','Stromeyer lo halló en 1817 como impureza amarilla en minerales de cinc.'),
 'Sn':('Estaño',50,'post','Unió el bronce y la lata.','Con él nació la Edad del Bronce hace 5.000 años. Napoleón perdió botones (y soldados) por su «peste» en el frío ruso.'),
 'Sb':('Antimonio',51,'metalloid','Cosmética y balas antiguas.','Usado como kohl en el antiguo Egipto; descrito por alquimistas medievales.'),
 'I': ('Yodo',53,'halogen','Tu tiroides lo necesita.','Courtois lo descubrió en 1811 quemando algas. Sus vapores violeta le dieron nombre.'),
 'Ba':('Bario',56,'alkearth','Verde en la pirotecnia.','Davy lo aisló en 1808. Su sulfato hace visibles tus radiografías digestivas.'),
 'W': ('Wolframio',74,'transition','El punto de fusión más alto.','Los hermanos Elhuyar lo aislaron en 1783 en el País Vasco: el único elemento descubierto en España.'),
 'Bi':('Bismuto',83,'post','Cristales de arcoíris.','Confundido con plomo durante siglos; Geoffroy demostró en 1753 que era otro metal.'),
 'Cs':('Cesio',55,'alkali','Late en los relojes atómicos.','Bunsen y Kirchhoff lo descubrieron en 1860 por sus líneas azul cielo: el primer elemento hallado por espectroscopia.'),
 'U': ('Uranio',92,'radio','Metal radiactivo. Fisión nuclear.','Klaproth lo aisló en 1789 y lo nombró por Urano. Con él Becquerel descubrió la radiactividad en 1896.'),
 'Ra':('Radio',88,'radio','Brilla solo en la oscuridad.','Marie y Pierre Curie lo aislaron en 1898 de toneladas de pechblenda. Les valió un Nobel… y les costó la salud.'),
 'Po':('Polonio',84,'radio','El veneno radiactivo más célebre.','Primer elemento de los Curie (1898), nombrado por la Polonia natal de Marie.'),
}

RADIOACTIVE = ['U','Ra','Po']

# ── 7 hechizos con efectos REALES basados en sus propiedades ──
SPELLS = [
 ('Pb','Plomo',82,
  '🛡 BLINDAJE: los elementos radiactivos rivales (U·Ra·Po) pierden el 50% de ATK y DEF esta batalla.',
  'El plomo detiene la radiación.',
  'Los romanos lo usaban en tuberías: de plumbum viene «plomería». Tan denso que bloquea los rayos X.',5,'#94a3b8'),
 ('He','Helio',2,
  '🎈 LIGEREZA: +2 DEF a tu jugada esta batalla. Flota y esquiva.',
  'Más ligero que el aire.',
  'El único elemento descubierto fuera de la Tierra: visto en el espectro del Sol en 1868.',6,'#fbbf24'),
 ('Ne','Neón',10,
  '💡 DESLUMBRAR: −2 ATK a la jugada rival esta batalla.',
  'Su brillo eléctrico ciega.',
  'Ramsay y Travers lo hallaron en 1898; su hijo propuso el nombre: «nuevo». Encendió Las Vegas.',6,'#f472b6'),
 ('Ar','Argón',18,
  '🔕 ATMÓSFERA INERTE: anula los hechizos rivales esta batalla.',
  'Gas protector, como en la soldadura.',
  'Rayleigh y Ramsay lo aislaron en 1894: «el perezoso», porque no reacciona con nada.',5,'#22d3ee'),
 ('Au','Oro',79,
  '💰 FINANCIACIÓN: robas 3 cartas al instante.',
  'El oro paga los mejores laboratorios.',
  'Obsesión de alquimistas y conquistadores. Tan inerte que sobrevive milenios intacto.',3,'#fde047'),
 ('Pt','Platino',78,
  '⚗️ CATÁLISIS: +1 ATK y +1 DEF a tu jugada esta batalla.',
  'El platino acelera cualquier reacción.',
  'Los españoles lo llamaron «platina» (plata pequeña) en el siglo XVIII y lo tiraban al río. Hoy cataliza tu tubo de escape.',4,'#e5e7eb'),
 ('Hg','Mercurio',80,
  '☠️ VAPOR TÓXICO: −2 DEF a la jugada rival esta batalla.',
  'Sus vapores envenenan la defensa.',
  'El «agua viva» de los alquimistas. Volvió locos a los sombrereros del XIX — de ahí la expresión.',4,'#f87171'),
]

# ── Moléculas y elementos nativos REALES (display, parse, nombre) ──
# parse: tokens en el orden de lectura de la fórmula ('' = igual que display)
M = [
 # nativos (sueltos en la naturaleza / criterio del juego)
 ('C','','Carbono nativo'),('S','','Azufre nativo'),('Cu','','Cobre nativo'),
 ('Ag','','Plata nativa'),('Fe','','Hierro meteórico'),('Bi','','Bismuto nativo'),
 ('U','','Uranio'),('Ra','','Radio'),('Po','','Polonio'),
 # diatómicas / alótropos
 ('H2','','Dihidrógeno'),('N2','','Dinitrógeno'),('O2','','Dioxígeno'),('O3','','Ozono'),
 ('F2','','Diflúor'),('Cl2','','Dicloro'),('Br2','','Dibromo'),('I2','','Diyodo'),('S2','','Diazufre'),
 # hidruros / haluros de hidrógeno
 ('H2O','','Agua'),('H2O2','','Peróxido de hidrógeno'),
 ('HF','','Fluoruro de hidrógeno'),('HCl','','Cloruro de hidrógeno'),
 ('HBr','','Bromuro de hidrógeno'),('HI','','Yoduro de hidrógeno'),
 ('H2S','','Sulfuro de hidrógeno'),('H2Se','','Seleniuro de hidrógeno'),
 ('NH3','','Amoníaco'),('PH3','','Fosfina'),('AsH3','','Arsina'),('SbH3','','Estibina'),
 ('CH4','','Metano'),('SiH4','','Silano'),('BH3','','Borano'),
 ('LiH','','Hidruro de litio'),('NaH','','Hidruro de sodio'),('KH','','Hidruro de potasio'),
 ('MgH2','','Hidruro de magnesio'),('CaH2','','Hidruro de calcio'),
 ('SrH2','','Hidruro de estroncio'),('BaH2','','Hidruro de bario'),
 ('HCN','','Cianuro de hidrógeno'),('HN3','','Azida de hidrógeno'),
 # óxidos de no metales
 ('CO','','Monóxido de carbono'),('CO2','','Dióxido de carbono'),
 ('NO','','Óxido nítrico'),('NO2','','Dióxido de nitrógeno'),('N2O','','Gas de la risa'),
 ('N2O3','','Trióxido de dinitrógeno'),
 ('SO2','','Dióxido de azufre'),('SO3','','Trióxido de azufre'),
 ('SiO','','Monóxido de silicio'),('SiO2','','Sílice (cuarzo)'),
 ('B2O3','','Trióxido de boro'),('PO','','Monóxido de fósforo'),
 ('SeO2','','Dióxido de selenio'),('SeO3','','Trióxido de selenio'),
 ('As2O3','','Arsénico blanco'),('Sb2O3','','Trióxido de antimonio'),
 ('Cl2O','','Monóxido de dicloro'),('ClO2','','Dióxido de cloro'),('OF2','','Difluoruro de oxígeno'),
 # óxidos metálicos
 ('Li2O','','Óxido de litio'),('Na2O','','Óxido de sodio'),('Na2O2','','Peróxido de sodio'),
 ('K2O','','Óxido de potasio'),('KO2','','Superóxido de potasio'),
 ('BeO','','Óxido de berilio'),('MgO','','Magnesia'),('CaO','','Cal viva'),
 ('CaO2','','Peróxido de calcio'),('SrO','','Óxido de estroncio'),
 ('BaO','','Óxido de bario'),('BaO2','','Peróxido de bario'),
 ('Al2O3','','Alúmina (corindón)'),('TiO','','Monóxido de titanio'),('TiO2','','Rutilo'),
 ('VO','','Monóxido de vanadio'),('VO2','','Dióxido de vanadio'),
 ('CrO3','','Trióxido de cromo'),('Cr2O3','','Verde de cromo'),
 ('MnO','','Óxido de manganeso(II)'),('MnO2','','Pirolusita'),('Mn2O3','','Óxido de manganeso(III)'),
 ('FeO','','Wustita'),('Fe2O3','','Hematita'),
 ('CoO','','Óxido de cobalto'),('NiO','','Óxido de níquel'),
 ('CuO','','Tenorita'),('Cu2O','','Cuprita'),('ZnO','','Cincita'),
 ('MoO2','','Dióxido de molibdeno'),('MoO3','','Trióxido de molibdeno'),
 ('WO2','','Dióxido de wolframio'),('WO3','','Trióxido de wolframio'),
 ('CdO','','Óxido de cadmio'),('SnO','','Óxido de estaño(II)'),('SnO2','','Casiterita'),
 ('Bi2O3','','Óxido de bismuto'),('Cs2O','','Óxido de cesio'),
 ('UO2','','Uraninita'),('UO3','','Trióxido de uranio'),
 ('RaO','','Óxido de radio'),('PoO2','','Dióxido de polonio'),
 # sales haloideas
 ('NaCl','','Sal común (halita)'),('NaF','','Fluoruro de sodio'),
 ('NaBr','','Bromuro de sodio'),('NaI','','Yoduro de sodio'),
 ('KCl','','Silvina'),('KF','','Fluoruro de potasio'),
 ('KBr','','Bromuro de potasio'),('KI','','Yoduro de potasio'),
 ('LiF','','Fluoruro de litio'),('LiCl','','Cloruro de litio'),
 ('LiBr','','Bromuro de litio'),('LiI','','Yoduro de litio'),
 ('CsCl','','Cloruro de cesio'),('CsF','','Fluoruro de cesio'),
 ('BeF2','','Fluoruro de berilio'),('BeCl2','','Cloruro de berilio'),
 ('MgF2','','Sellaita'),('MgCl2','','Cloruro de magnesio'),('MgBr2','','Bromuro de magnesio'),
 ('CaF2','','Fluorita'),('CaCl2','','Cloruro de calcio'),
 ('CaBr2','','Bromuro de calcio'),('CaI2','','Yoduro de calcio'),
 ('SrF2','','Fluoruro de estroncio'),('SrCl2','','Cloruro de estroncio'),
 ('BaF2','','Fluoruro de bario'),('BaCl2','','Cloruro de bario'),
 ('AlF3','','Fluoruro de aluminio'),('AlCl3','','Cloruro de aluminio'),
 ('AlBr3','','Bromuro de aluminio'),('AlI3','','Yoduro de aluminio'),
 ('BF3','','Trifluoruro de boro'),('BCl3','','Tricloruro de boro'),('BBr3','','Tribromuro de boro'),
 ('SiF4','','Tetrafluoruro de silicio'),('SiCl4','','Tetracloruro de silicio'),
 ('TiCl3','','Tricloruro de titanio'),('TiCl4','','Tetracloruro de titanio'),
 ('VCl3','','Tricloruro de vanadio'),('VCl4','','Tetracloruro de vanadio'),
 ('CrCl2','','Cloruro de cromo(II)'),('CrCl3','','Cloruro de cromo(III)'),
 ('MnCl2','','Cloruro de manganeso'),('MnF2','','Fluoruro de manganeso'),
 ('FeCl2','','Cloruro de hierro(II)'),('FeCl3','','Cloruro férrico'),
 ('FeF3','','Fluoruro férrico'),('FeBr2','','Bromuro de hierro(II)'),
 ('CoCl2','','Cloruro de cobalto'),('CoF2','','Fluoruro de cobalto'),
 ('NiCl2','','Cloruro de níquel'),('NiF2','','Fluoruro de níquel'),
 ('CuCl','','Nantokita'),('CuCl2','','Cloruro cúprico'),
 ('ZnCl2','','Cloruro de cinc'),('ZnF2','','Fluoruro de cinc'),
 ('AgF','','Fluoruro de plata'),('AgCl','','Clorargirita'),
 ('AgBr','','Bromuro de plata'),('AgI','','Yoduro de plata'),
 ('CdCl2','','Cloruro de cadmio'),('CdF2','','Fluoruro de cadmio'),
 ('SnCl2','','Cloruro de estaño(II)'),('SnCl4','','Cloruro de estaño(IV)'),('SnF2','','Fluoruro de estaño'),
 ('SbCl3','','Tricloruro de antimonio'),('SbF3','','Trifluoruro de antimonio'),
 ('AsCl3','','Tricloruro de arsénico'),('AsF3','','Trifluoruro de arsénico'),
 ('BiCl3','','Cloruro de bismuto'),('BiF3','','Fluoruro de bismuto'),
 ('UCl4','','Tetracloruro de uranio'),('UF4','','Sal verde de uranio'),
 ('RaCl2','','Cloruro de radio'),('PoCl2','','Dicloruro de polonio'),('PoCl4','','Tetracloruro de polonio'),
 # interhalógenos
 ('ClF','','Monofluoruro de cloro'),('ClF3','','Trifluoruro de cloro'),
 ('BrF','','Monofluoruro de bromo'),('BrF3','','Trifluoruro de bromo'),
 ('BrCl','','Cloruro de bromo'),('ICl','','Monocloruro de yodo'),('IBr','','Monobromuro de yodo'),
 # azufre / selenio
 ('CS2','','Disulfuro de carbono'),('COS','','Sulfuro de carbonilo'),
 ('SCl2','','Dicloruro de azufre'),('S2Cl2','','Monocloruro de azufre'),
 ('SOCl2','','Cloruro de tionilo'),('SO2Cl2','','Cloruro de sulfurilo'),('SF4','','Tetrafluoruro de azufre'),
 ('Na2S','','Sulfuro de sodio'),('K2S','','Sulfuro de potasio'),('Li2S','','Sulfuro de litio'),
 ('MgS','','Sulfuro de magnesio'),('CaS','','Oldhamita'),
 ('SrS','','Sulfuro de estroncio'),('BaS','','Sulfuro de bario'),
 ('FeS','','Troilita'),('FeS2','','Pirita (oro de los tontos)'),
 ('CoS','','Sulfuro de cobalto'),('NiS','','Millerita'),
 ('CuS','','Covelina'),('Cu2S','','Calcosina'),('ZnS','','Esfalerita'),
 ('Ag2S','','Argentita'),('CdS','','Greenockita'),
 ('SnS','','Herzenbergita'),('SnS2','','Oro musivo'),
 ('Sb2S3','','Antimonita'),('As2S3','','Oropimente'),
 ('MoS2','','Molibdenita'),('WS2','','Tungstenita'),('MnS','','Alabandita'),
 ('SiS2','','Disulfuro de silicio'),('B2S3','','Sulfuro de boro'),('Bi2S3','','Bismutina'),
 ('ZnSe','','Seleniuro de cinc'),('CdSe','','Seleniuro de cadmio'),
 ('FeSe','','Seleniuro de hierro'),('Na2Se','','Seleniuro de sodio'),('Ag2Se','','Naumannita'),
 # nitruros, carburos, cianuros
 ('BN','','Nitruro de boro'),('AlN','','Nitruro de aluminio'),
 ('TiN','','Nitruro de titanio'),('VN','','Nitruro de vanadio'),
 ('Mg3N2','','Nitruro de magnesio'),('Ca3N2','','Nitruro de calcio'),('Li3N','','Nitruro de litio'),
 ('NaCN','','Cianuro de sodio'),('KCN','','Cianuro de potasio'),
 ('CaC2','','Carburo de calcio'),('SiC','','Carborundo'),
 ('TiC','','Carburo de titanio'),('WC','','Widia'),
 ('B4C','','Carburo de boro'),('Fe3C','','Cementita'),
 ('VC','','Carburo de vanadio'),('Mg2Si','','Siliciuro de magnesio'),
 ('CaCN2','CaCNN','Cianamida cálcica'),('C2N2','','Cianógeno'),
 # hidróxidos, oxosales pequeñas, ácidos
 ('NaOH','','Sosa cáustica'),('KOH','','Potasa cáustica'),
 ('LiOH','','Hidróxido de litio'),('CsOH','','Hidróxido de cesio'),
 ('Mg(OH)2','MgOHOH','Leche de magnesia'),('Ca(OH)2','CaOHOH','Cal apagada'),
 ('Cu(OH)2','CuOHOH','Hidróxido de cobre'),('Zn(OH)2','ZnOHOH','Hidróxido de cinc'),
 ('NaNO2','','Nitrito de sodio'),('KNO2','','Nitrito de potasio'),
 ('NaNO3','','Nitrato de Chile'),('KNO3','','Salitre'),('AgNO3','','Piedra infernal'),
 ('NaClO','','Lejía (hipoclorito)'),('NaClO2','','Clorito de sodio'),('KClO3','','Clorato de potasio'),
 ('CaCO3','','Calcita (mármol)'),('MgCO3','','Magnesita'),
 ('BaCO3','','Witherita'),('SrCO3','','Estroncianita'),
 ('FeCO3','','Siderita'),('ZnCO3','','Smithsonita'),('MnCO3','','Rodocrosita'),
 ('HNO3','','Ácido nítrico'),('HNO2','','Ácido nitroso'),
 ('HClO','','Ácido hipocloroso'),('HClO2','','Ácido cloroso'),
 ('HBrO','','Ácido hipobromoso'),('HIO','','Ácido hipoyodoso'),
 ('CH2O2','HCOOH','Ácido fórmico'),('CH2O','','Formaldehído'),
 # orgánicas / carbono pequeñas
 ('C2H2','','Acetileno'),('CCl4','','Tetracloruro de carbono'),
 ('CHCl3','','Cloroformo'),('CF4','','Tetrafluorometano'),
 ('CH2Cl2','','Diclorometano'),('CBr4','','Tetrabromuro de carbono'),
 ('COCl2','','Fosgeno'),
 # haluros de N y P, nitrosilos
 ('NF3','','Trifluoruro de nitrógeno'),('NCl3','','Tricloruro de nitrógeno'),
 ('PF3','','Trifluoruro de fósforo'),('PCl3','','Tricloruro de fósforo'),
 ('PBr3','','Tribromuro de fósforo'),('PI3','','Triyoduro de fósforo'),
 ('POCl3','','Oxicloruro de fósforo'),('NOCl','','Cloruro de nitrosilo'),('NOBr','','Bromuro de nitrosilo'),
]

TOKEN = re.compile(r'([A-Z][a-z]?)(\d*)')

def parse(formula):
    ids=[]
    for sym,n in TOKEN.findall(formula):
        if not sym: continue
        ids += [sym]*(int(n) if n else 1)
    return ids

SUB = str.maketrans('0123456789','₀₁₂₃₄₅₆₇₈₉')

def pretty(display):
    return display.translate(SUB)

def jitter(key, lo, hi):
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return lo + (h % 1000)/999*(hi-lo)

# ── procesado ──
mols=[]
counts=collections.Counter()
seen=set()
for display,parse_str,name in M:
    ids = parse(parse_str or display)
    assert 1 <= len(ids) <= 5, f'{display}: {len(ids)} átomos'
    for i in ids:
        assert i in E, f'{display}: elemento desconocido {i}'
    key=display
    assert key not in seen, f'duplicado {display}'
    seen.add(key)
    mols.append((display,ids,name))
    counts.update(ids)

print('moléculas:',len(mols))
print('elementos usados:',len(counts),'/',len(E))
for el in E:
    if counts[el]==0: print('  SIN USO:',el)

# pesos ∝ apariciones en moléculas (escala 1..10)
mx=max(counts.values())
weights={el:max(1,round(10*counts[el]/mx)) for el in E}

# stats por rareza: raro → fuerte (total 3..9), sabor por categoría
ATK_SHARE={'h':.40,'c':.50,'alkali':.45,'alkearth':.40,'metalloid':.50,
           'pnictogen':.55,'chalcogen':.65,'halogen':.70,'transition':.45,
           'post':.45,'radio':.65}
order=sorted(E,key=lambda e:-counts[e])
N=len(order)
stats={}
for rank,el in enumerate(order):
    r=rank/(N-1)                       # 0 común … 1 raro
    total=3+round(6*r)
    share=ATK_SHARE[E[el][2]]+jitter('s'+el,-.07,.07)
    atk=max(1,min(total-1,round(total*share)))
    stats[el]=(atk,total-atk)

# ── emitir game-data.js ──
def js(s): return json.dumps(s,ensure_ascii=False)

ELEM_EFF='⚔️🛡 Carta de Ataque/Defensa: combínala en el orden de la fórmula para formar moléculas y battle.'
ELEM_EFF='⚔️🛡 Ataque/Defensa: combínala en el orden de la fórmula para formar una molécula y batirte.'

COLORS={'h':'#7dd3fc','c':'#e2e8f0','alkali':'#c084fc','alkearth':'#a78bfa',
        'metalloid':'#5eead4','pnictogen':'#60a5fa','chalcogen':'#fb7185',
        'halogen':'#34d399','transition':'#94a3b8','post':'#9ca3af','radio':'#a3e635'}
# matices propios para los clásicos
COLOR_OVERRIDE={'O':'#fb7185','S':'#facc15','P':'#fb923c','N':'#60a5fa','Se':'#fbbf24',
                'Cu':'#fb923c','Ag':'#e5e7eb','Fe':'#f87171','Cr':'#86efac','Co':'#818cf8',
                'I':'#c084fc','Br':'#f59e0b'}

out=[]
out.append('/* ════════════════════════════════════════════════════════════════')
out.append('   GAME DATA — BreakingLab  (GENERADO por tools/generate_data.py)')
out.append('   No editar a mano: ejecuta el generador para regenerar.')
out.append(f'   {len(E)} elementos de batalla + {len(SPELLS)} hechizos = {len(E)+len(SPELLS)} cartas.')
out.append(f'   {len(mols)} moléculas/elementos nativos reales.')
out.append('   ids de cada molécula = orden de lectura de la fórmula.')
out.append('   ATK/DEF de molécula = suma de los stats de sus elementos.')
out.append('════════════════════════════════════════════════════════════════ */')
out.append('')
out.append(f'const RADIOACTIVE = {js(RADIOACTIVE)};')
out.append('')
out.append('/* ── Elementos de batalla ── */')
out.append('const ELEMENTS = [')
for el in E:
    name,num,cat,info,hist=E[el]
    a,d=stats[el]
    out.append(f'  {{id:{js(el)}, sym:{js(el)}, name:{js(name)}, num:{num}, atk:{a}, def:{d}, type:\'nonmetal\', img:\'img/{el}.png\',')
    out.append(f'   eff:{js(ELEM_EFF)}, info:{js(info)},')
    out.append(f'   hist:{js(hist)}}},')
out.append('];')
out.append('')
out.append('/* ── Hechizos (7) — efectos reales implementados en game.js ── */')
out.append('const SPELLS = [')
for sid,name,num,eff,info,hist,w,color in SPELLS:
    out.append(f'  {{id:{js(sid)}, sym:{js(sid)}, name:{js(name)}, num:{num}, atk:0, def:0, type:\'spell\', img:\'img/{sid}.png\',')
    out.append(f'   eff:{js(eff)}, info:{js(info)},')
    out.append(f'   hist:{js(hist)}}},')
out.append('];')
out.append('')
out.append('/* ── Colores neón por carta ── */')
out.append('const CARD_COLORS = {')
for el in E:
    c=COLOR_OVERRIDE.get(el,COLORS[E[el][2]])
    out.append(f'  {js(el)}: {js(c)},')
for sid,_,_,_,_,_,_,color in SPELLS:
    out.append(f'  {js(sid)}: {js(color)},')
out.append('};')
out.append('')
out.append(f'/* ── {len(mols)} moléculas válidas ── */')
out.append('const VALID_MOLECULES = [')
for display,ids,name in mols:
    atk=sum(stats[i][0] for i in ids)
    dfn=sum(stats[i][1] for i in ids)
    out.append(f'  {{ids:{js(ids)}, name:{js(name)}, formula:{js(pretty(display))}, atk:{atk}, def:{dfn}}},')
out.append('];')
out.append('')

open('game-data.js','w',encoding='utf-8').write('\n'.join(out))

# ── emitir card-config.js ──
cc=[]
cc.append('/* ════════════════════════════════════')
cc.append('   CARD WEIGHTS  (GENERADO por tools/generate_data.py)')
cc.append('   Peso de cada elemento ∝ veces que aparece en VALID_MOLECULES')
cc.append('   (para H₂O: H cuenta 2 y O cuenta 1; se suman todas).')
cc.append('   Escala 1..10. Los hechizos tienen peso propio.')
cc.append('════════════════════════════════════ */')
cc.append('')
cc.append('const CARD_WEIGHTS = {')
for el in sorted(E,key=lambda e:-counts[e]):
    cc.append(f'  {js(el)}: {weights[el]:>2},  // {counts[el]} apariciones')
for sid,_,_,_,_,_,w,_ in SPELLS:
    cc.append(f'  {js(sid)}: {w:>2},  // hechizo')
cc.append('};')
cc.append('')
open('card-config.js','w',encoding='utf-8').write('\n'.join(cc))

print('stats:',{e:stats[e] for e in list(order)[:8]},'…')
print('OK → game-data.js, card-config.js')
