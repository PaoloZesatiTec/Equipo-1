# Parte 7 y 8 - Casos de Uso y Tablas Descriptivas

## 7. Diagramas de Casos de Uso (UML)

### 7.1 Diagrama General del Sistema (Videojuego completo)

```mermaid
flowchart TD
  J(Jugador) --> A[Moverse izquierda/derecha]
  J --> B[Saltar obstáculos]
  J --> C[Lanzar bola de fuego]
  J --> D[Subir/bajar escaleras]
  J --> E[Ganar experiencia]
  J --> F[Mejorar habilidades en el menú]
  J --> G[Iniciar partida desde menú]
  J --> H[Reintentar tras Game Over]
  J --> I[Escuchar música y efectos]

  S(Sistema) --> J1[Generar barriles como obstáculos]
  S --> J2[Generar enemigos con IA]
  S --> J3[Cambiar de nivel automáticamente]
  S --> J4[Iniciar batalla contra jefe final]
  S --> J5[Mostrar indicadores en pantalla]
  S --> J6[Guardar experiencia entre partidas]
  S --> J7[Aplicar mejoras al jugador]
  S --> J8[Almacenar progreso localmente]

flowchart TD
  SG(Sistema de Juego) --> K1[Guardar experiencia de jugador]
  SG --> K2[Recuperar experiencia al iniciar]
  SG --> K3[Actualizar mejoras desbloqueadas]
  SG --> K4[Registrar progreso en partida]

  BD(Base de Datos Local) --> L1[Almacenar datos de experiencia]
  BD --> L2[Leer datos de progreso]
