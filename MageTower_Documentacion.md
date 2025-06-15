# Mage Tower - Documentación Técnica

Este documento describe los principales componentes y módulos utilizados en el desarrollo del videojuego tipo roguelike **Mage Tower**. Cada sección corresponde a un archivo clave del proyecto.

---

## Índice
- [1. game_classes.js](#1-game_classesjs)
- [2. enemies.js](#2-enemiesjs)
- [3. objects.js](#3-objectsjs)
- [4. platformer.js](#4-platformerjs)
- [5. levelgenerator.js](#5-levelgeneratorjs)
- [6. menu.js](#6-menujs)
- [7. Server_functions.js](#7-server_functionsjs)
- [8. sound_manager.js](#8-sound_managerjs)

---

## 1. game_classes.js

Contiene clases base reutilizables para representar objetos del juego.

- `Vec`: Representa un vector bidimensional con operaciones básicas (suma, resta, producto, longitud).
- `Rect`: Define un rectángulo usado para sprites.
- `GameObject`: Clase base con posición, tamaño, color, y dibujo (con o sin sprite).
- `AnimatedObject`: Extiende `GameObject` para manejar animaciones por cuadros.
- `TextLabel`: Renderiza texto en pantalla.
- `overlapRectangles`: Función para detección de colisiones rectangulares.

## 2. enemies.js

Define enemigos animados con lógica de movimiento:

- `Enemy`: Patrulla plataformas, cambia dirección si encuentra un muro o falta de piso.
- `Barrel`: Rueda por plataformas, cae si no hay soporte y puede cambiar dirección al aterrizar.
- `Minotaur`: Tiene estados de patrullaje y embestida. Reacciona al jugador según proximidad.

## 3. objects.js

Contiene objetos interactivos del juego:

- `Gem`: Coleccionable animado con sprite.
- `Fireball`: Proyectil lanzado por el jugador, elimina enemigos al colisionar.
- `Ladder`: Objeto fijo que permite al jugador escalar.

## 4. platformer.js

Archivo central del juego, que inicializa lógica general:

- Variables globales: `gravity`, `scale`, `cameraY`, `keyState`, etc.
- `Lava`: Mecánica de nivel final, sube tras un retardo y elimina al jugador si lo alcanza.
- `Portal`: Permite pasar de nivel, tiene animación.
- `Princess`: NPC final del juego.
- `Level`: Crea niveles a partir de un mapa de caracteres.
- `Game`: Controla la lógica de estado del juego, pausa, transición, victoria, muerte, música, etc.

## 5. levelgenerator.js

Generador procedural de niveles con características como:

- Capas de plataformas interconectadas.
- Pared derecha garantizada.
- Colocación de gemas, enemigos, corazones, y portal.
- Lógica para escaleras entre plataformas sin repetición.

## 6. menu.js

Crea la interfaz gráfica del menú principal:

- Contenedor flotante con fondo oscuro y borde animado.
- Botón de inicio principal y botones de ayuda/estadísticas.
- Estilo animado con CSS y keyframes (`fireGlow`, `borderGlow`, `buttonGlow`).

## 7. Server_functions.js

Manejo de estadísticas y autenticación con backend:

- `Save_data`: Envía datos de la partida y subestadísticas mediante `PATCH` y `POST`.
- `getGameStats`: Recupera estadísticas pasadas por ID.
- Manejo de inicio de sesión (`login-form`) con creación automática de partida.
- Manejo de almacenamiento local (localStorage).

## 8. sound_manager.js

Administrador de música y efectos de sonido:

- `SoundManager`: Clase con control de volúmenes, carga de audio, y reproducción condicional por interacción del usuario.
- Soporta música por nivel y efectos de salto, hechizo, daño, muerte, y victoria.

---

**Nota:** Todos los sprites, sonidos y efectos están referenciados desde `../assets/` y gestionados dinámicamente en tiempo real.

---

