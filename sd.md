# Diagramas de Casos de Uso UML

## 🎮 Videojuego

**Actor:** Jugador

**Casos de Uso:**
- (Moverse)
- (Saltar)
- (Lanzar Bola de Fuego)
- (Escalar)
- (Enfrentar Enemigos)
- (Derrotar Jefe Final)
- (Gestionar Game Over)

## 🌐 Web / Menú Principal

**Actor:** Jugador

**Casos de Uso:**
- (Ver Mejoras Disponibles)
- (Comprar Mejoras)
- (Iniciar Partida)
- (Ver Progreso de Experiencia)

## 🗄️ Base de Datos

**Actor:** Sistema

**Casos de Uso:**
- (Guardar Experiencia)
- (Guardar Mejoras)
- (Consultar Progreso)

---

# Tablas Descriptivas por Caso de Uso

## 🎮 Videojuego

### Caso de Uso: Moverse
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador presiona la tecla de movimiento (A/D). |
| Flujo Principal | El personaje se desplaza hacia la izquierda o derecha en el escenario. |

### Caso de Uso: Saltar
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador presiona la tecla de salto (Espacio). |
| Flujo Principal | El personaje realiza un salto vertical para esquivar obstáculos. |

### Caso de Uso: Lanzar Bola de Fuego
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador presiona la tecla de ataque (F) cuando el enfriamiento lo permite. |
| Flujo Principal | El personaje lanza una bola de fuego que rebota y destruye enemigos o barriles. |

### Caso de Uso: Escalar
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador presiona W o S frente a una escalera. |
| Flujo Principal | El personaje asciende o desciende por la escalera para cambiar de nivel vertical. |

### Caso de Uso: Enfrentar Enemigos
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador se encuentra en la misma plataforma o línea de visión de un enemigo. |
| Flujo Principal | El jugador debe esquivar, derrotar o ser dañado por el enemigo. |

### Caso de Uso: Derrotar Jefe Final
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador llega a la sala del jefe final. |
| Flujo Principal | El jugador esquiva ataques y golpea al jefe tres veces para ganar. |

### Caso de Uso: Gestionar Game Over
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador recibe un golpe mortal (sin vidas restantes). |
| Flujo Principal | Se muestra "Game Over" y se ofrece reintentar. |

## 🌐 Web / Menú Principal

### Caso de Uso: Ver Mejoras Disponibles
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador entra al menú de mejoras. |
| Flujo Principal | Se muestra una lista de mejoras desbloqueables. |

### Caso de Uso: Comprar Mejoras
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador selecciona una mejora y confirma la compra. |
| Flujo Principal | Se descuenta EXP y se habilita la mejora. |

### Caso de Uso: Iniciar Partida
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador presiona "Iniciar Juego". |
| Flujo Principal | Se carga el primer nivel del juego. |

### Caso de Uso: Ver Progreso de Experiencia
| Elemento | Descripción |
|:---------|:------------|
| Actores | Jugador |
| Disparador | El jugador abre el perfil o menú de progreso. |
| Flujo Principal | Se muestra la barra o número de experiencia acumulada. |

## 🗄️ Base de Datos

### Caso de Uso: Guardar Experiencia
| Elemento | Descripción |
|:---------|:------------|
| Actores | Sistema |
| Disparador | El jugador gana experiencia. |
| Flujo Principal | Se actualiza la base de datos con la nueva EXP. |

### Caso de Uso: Guardar Mejoras
| Elemento | Descripción |
|:---------|:------------|
| Actores | Sistema |
| Disparador | El jugador compra una mejora. |
| Flujo Principal | Se registra la mejora como desbloqueada en la base de datos. |

### Caso de Uso: Consultar Progreso
| Elemento | Descripción |
|:---------|:------------|
| Actores | Sistema |
| Disparador | El jugador accede al menú de progreso. |
| Flujo Principal | El sistema recupera datos de experiencia y mejoras desbloqueadas. |
