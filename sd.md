# Parte 7 y 8 - Casos de Uso y Tablas Descriptivas

## 7. Diagramas de Casos de Uso (UML)

### 7.1 Diagrama General del Sistema (Videojuego completo)

```mermaid
usecaseDiagram
title Casos de Uso Generales - Videojuego
actor "Jugador" as J
actor "Sistema" as S

J --> (Moverse izquierda/derecha)
J --> (Saltar obstáculos)
J --> (Lanzar bola de fuego)
J --> (Subir/bajar escaleras)
J --> (Ganar experiencia)
J --> (Mejorar habilidades en el menú)
J --> (Iniciar partida desde menú)
J --> (Reintentar tras Game Over)
J --> (Escuchar música y efectos)

S --> (Generar barriles como obstáculos)
S --> (Generar enemigos con IA)
S --> (Cambiar de nivel automáticamente)
S --> (Iniciar batalla contra jefe final)
S --> (Mostrar indicadores en pantalla)
S --> (Guardar experiencia entre partidas)
S --> (Aplicar mejoras al jugador)
S --> (Almacenar progreso localmente)

