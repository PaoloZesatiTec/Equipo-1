# Documentación de Interfaces HTML - Mage Tower

Este archivo describe las funciones, diseño y propósito de los archivos HTML usados en el cliente del videojuego **Mage Tower**.

---

## Contenido

1. [index.html - Página principal del juego](#1-indexhtml---página-principal-del-juego)
2. [login.html - Inicio de sesión](#2-loginhtml---inicio-de-sesión)
3. [register.html - Registro de usuario](#3-registerhtml---registro-de-usuario)
4. [stats.html - Estadísticas del jugador](#4-statshtml---estadísticas-del-jugador)
5. [admin.html - Panel de administración](#5-adminhtml---panel-de-administración)
6. [help.html - Página de ayuda](#6-helphtml---página-de-ayuda)

---

## 1. `index.html` - Página principal del juego

- Es la interfaz donde se ejecuta el juego.
- Contiene tres paneles:
  - **Izquierdo**: controles del juego.
  - **Centro**: canvas donde se dibuja el juego.
  - **Derecho**: saludo del jugador, estadísticas en tiempo real y botón de cerrar sesión.
- Permite visualizar un tráiler del juego.
- Usa múltiples scripts JS: `game_classes.js`, `platformer.js`, `enemies.js`, etc.

## 2. `login.html` - Inicio de sesión

- Formulario con campos de usuario y contraseña.
- Estilo visual basado en animación y fuego mágico.
- Al hacer login, guarda `playerId` y `playerName` en `localStorage`.
- Contiene una animación de mago atacando y un botón con efectos visuales.
- Redirige a la página principal (`index.html`) al autenticarse.

## 3. `register.html` - Registro de usuario

- Formulario para crear una cuenta.
- Campos requeridos: usuario, correo, contraseña y confirmación.
- Validación de coincidencia de contraseñas en el cliente.
- Llama a `POST /api/createplayer` al enviar el formulario.
- Reproduce música desde `sound_manager.js` al iniciar.

## 4. `stats.html` - Estadísticas del jugador

- Consulta `GET /api/gamestats?id_jugador=...` para obtener estadísticas.
- Muestra:
  - Partidas jugadas
  - Nivel máximo alcanzado
  - Enemigos eliminados
  - Power-ups usados
  - Tiempo total de juego
  - Experiencia acumulada
- Requiere `playerId` y `playerName` almacenados en `localStorage`.
- Si no existen, redirige al login.

## 5. `admin.html` - Panel de administración

- Autenticación por `POST /api/admin/login`.
- Permite:
  - Buscar usuarios por nombre.
  - Eliminar usuarios.
  - Ver estadísticas del sistema y jugadores específicos.
  - Ver partidas recientes.
- Accede a rutas protegidas como `/api/admin/stats`, `/api/admin/users`, etc.

## 6. `help.html` - Página de ayuda

- Ofrece instrucciones visuales y escritas del juego.
- Describe cómo se usan teclas para moverse, disparar y saltar.
- Complementa al panel de instrucciones dentro de `index.html`.

---

## Consideraciones Técnicas

- Todos los archivos usan la fuente retro `Press Start 2P`.
- Los fondos animados y efectos visuales están optimizados para estilo arcade/fantástico.
- Se usa `localStorage` para gestionar la sesión del usuario.
- Redirecciones automáticas aseguran que solo jugadores autenticados puedan acceder.

---
