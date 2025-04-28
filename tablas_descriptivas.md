# Parte 8 - Tablas Descriptivas de Casos de Uso

## 8.1 Casos de Uso - Videojuego

| Caso de Uso | Actor | Disparador | Flujo Básico |
|:------------|:------|:-----------|:-------------|
| Moverse izquierda/derecha | Jugador | Presionar tecla A/D | El jugador se desplaza horizontalmente en el nivel. |
| Saltar obstáculos | Jugador | Presionar tecla Espacio | El jugador salta para esquivar barriles u obstáculos. |
| Lanzar bola de fuego | Jugador | Presionar tecla F | El jugador lanza una bola de fuego, empieza enfriamiento de 10s. |
| Ganar experiencia | Jugador | Avanzar en el nivel | El jugador obtiene experiencia por su progreso en el nivel. |
| Reintentar tras Game Over | Jugador | Elegir opción "Reintentar" | Se reinicia la partida desde el nivel inicial. |
| Escuchar música y efectos | Jugador | Iniciar partida o acción en juego | El sistema reproduce música o efectos al jugar. |
| Generar barriles como obstáculos | Sistema | Intervalo de tiempo | El sistema genera barriles que ruedan como obstáculos. |
| Generar enemigos con IA | Sistema | Inicio de nivel | El sistema crea enemigos que patrullan el nivel. |
| Cambiar de nivel automáticamente | Sistema | Alcanzar al mago | El sistema carga el siguiente nivel automáticamente. |
| Iniciar batalla contra jefe final | Sistema | Llegar al último nivel | El sistema inicia la pelea contra el jefe final. |
| Mostrar indicador en pantalla | Sistema | Inicio de partida | El sistema muestra vida, experiencia y enfriamiento de habilidades. |
| Aplicar mejoras al jugador | Sistema | Activar mejoras | El sistema aplica las mejoras compradas por el jugador. |

---

## 8.2 Casos de Uso - Menú Web

| Caso de Uso | Actor | Disparador | Flujo Básico |
|:------------|:------|:-----------|:-------------|
| Iniciar partida | Jugador | Seleccionar "Iniciar partida" en el menú | El sistema carga el primer nivel y empieza el juego. |
| Mejorar habilidades | Jugador | Seleccionar mejoras en el menú | El jugador mejora atributos como vida, velocidad o poder de fuego. |
| Consultar progreso/EXP | Jugador | Acceder al menú de progreso | El jugador consulta su experiencia y mejoras desbloqueadas. |

---

## 8.3 Casos de Uso - Base de Datos

| Caso de Uso | Actor | Disparador | Flujo Básico |
|:------------|:------|:-----------|:-------------|
| Guardar experiencia de jugador | Sistema de Juego | Fin de nivel o fin de partida | El sistema guarda la experiencia acumulada en la base de datos. |
| Recuperar experiencia al iniciar | Sistema de Juego | Iniciar juego | El sistema carga la experiencia previa del jugador. |
| Actualizar mejoras desbloqueadas | Sistema de Juego | Comprar mejora | El sistema actualiza la base de datos con nuevas habilidades adquiridas. |
| Registrar progreso en partida | Sistema de Juego | Durante el juego | El sistema guarda automáticamente el avance en el nivel y experiencia. |
| Almacenar datos de experiencia | Base de Datos Local | Solicitud del sistema | La base de datos almacena permanentemente la experiencia del jugador. |
| Leer datos de progreso | Base de Datos Local | Solicitud del sistema | La base de datos devuelve los datos guardados para restaurar el juego. |

---
