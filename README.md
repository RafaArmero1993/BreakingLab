# ⚗️ BreakingLab — El Duelo Molecular

Juego de cartas por turnos donde cada carta es un elemento químico. Construye moléculas con las cartas de tu mano y gana la batalla eliminando a los 5 analistas del laboratorio rival.

**v1.0** — Rediseño completo (tema neón de laboratorio), modo **Contra la Máquina** con IA y app instalable (PWA).

## 🎮 Modos de juego

- **🤖 Contra la Máquina** — juega contra un científico artificial con 3 niveles:
  - 🥼 **Becario** — juega relajado y comete errores. Ideal para aprender.
  - 🔬 **Doctora** — juega sólido, siempre la mejor molécula.
  - 🧠 **Nobel** — optimiza ataque y economía de cartas.
- **👥 2 Jugadores** — duelo local pasando el dispositivo.

## 📲 Instalar en el móvil

El juego es una **PWA**: funciona offline y se instala como una app.

1. Sirve la carpeta por HTTPS (por ejemplo con **GitHub Pages**: Settings → Pages → rama `main`).
2. Abre la URL en el móvil.
3. **Android (Chrome):** pulsa el botón **«📲 Instalar en tu móvil»** de la portada, o menú ⋮ → *Añadir a pantalla de inicio*.
4. **iPhone/iPad (Safari):** botón *Compartir* → *Añadir a pantalla de inicio*.

Para probar en local: `python3 -m http.server` y abre `http://localhost:8000`.

## 🧪 Reglas rápidas

- Cada laboratorio tiene **5 analistas**: son su vida.
- **Turnos alternos** (empiezas tú). En tu turno eliges UNA acción: ⚔️ **Atacar**, ✨ **Hechizo** o 🃏 **Robar 2 cartas**. Al empezar cada turno robas además 1 carta automática.
- **Ataque:** selecciona los elementos **en el orden de la fórmula** (H·H·O para H₂O). El rival entonces puede 🛡 **defenderse** con otra molécula o pasar; después viene la ✨ **ronda de hechizos** (defensor primero, alternando) y por último la 💥 **resolución**: ATK − DEF de la defensa. Con daño, el defensor pierde 1 analista; sin daño, bloqueado. Ambas moléculas se descartan. El **Uranio** ☢ ignora la mitad de la DEF rival.
- **Hechizos:** se juegan como acción de turno o en la ronda de hechizos. Sus efectos están pendientes de diseño — de momento no alteran el combate.

## 🗂 Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Pantallas y estructura |
| `style.css` | Tema visual (neón de laboratorio) |
| `game.js` | Motor del juego, sonidos y PWA |
| `ai-player.js` | IA del modo Contra la Máquina |
| `game-data.js` | Elementos, hechizos y moléculas (editable) |
| `card-config.js` | Probabilidad de aparición de cada carta (editable) |
| `sw.js` / `manifest.webmanifest` | Soporte offline e instalación |

> Para balancear el juego solo necesitas tocar `game-data.js` y `card-config.js`.
