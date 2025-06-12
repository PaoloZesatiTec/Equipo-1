# **Torre del Mago: Rescata a la Princesa**

## _Documento de Diseño del Juego_

---

##### **Aviso de Derechos de Autor / Información del Autor**

Paolo Zesati  
Efren Chavez
Juan Pablo Narchi  

##
## _Tabla de Contenidos_

---

1. [Tabla de Contenidos](#tabla-de-contenidos)
2. [Diseño del Juego](#diseno-del-juego)
    1. [Resumen](#resumen)
    2. [Jugabilidad](#jugabilidad)
    3. [Experiencia del Jugador](#experiencia-del-jugador)
3. [Técnico](#tecnico)
    1. [Pantallas](#pantallas)
    2. [Controles](#controles)
    3. [Mecánicas Principales](#mecanicas-principales)
4. [Diseño de Niveles](#diseno-de-niveles)
    1. [Temas de Niveles](#temas-de-niveles)
    2. [Flujo del Juego](#flujo-del-juego)
5. [Desarrollo](#desarrollo)
    1. [Arquitectura](#arquitectura)
    2. [Integración de Base de Datos](#integracion-de-base-de-datos)
6. [Gráficos](#graficos)
    1. [Estilo Visual](#estilo-visual)
    2. [Recursos de Sprites](#recursos-de-sprites)
7. [Sistema de Audio](#sistema-de-audio)
    1. [Música](#musica)
    2. [Efectos de Sonido](#efectos-de-sonido)
8. [Interfaz de Usuario](#interfaz-de-usuario)

# _Diseño del Juego_

---

## **Resumen**

Torre del Mago es un juego de plataformas de acción 2D donde los jugadores controlan a un mago hábil en una misión para rescatar a una princesa de una torre malvada. El juego presenta 4 niveles distintos con generación procedural, un sistema de combate integral con magia de bolas de fuego, gemas y corazones coleccionables, un sistema de tienda para mejoras, e integración completa con base de datos MySQL para el seguimiento de progresión del jugador.

Los jugadores navegan a través de niveles generados aleatoriamente llenos de enemigos (enemigos básicos, minotauros y generadores de barriles), recolectan gemas como moneda, restauran salud con corazones recolectables, y mejoran sus habilidades a través de un sistema de tienda accesible al morir. El juego culmina en alcanzar a la princesa al final del nivel 4.

---

## **Jugabilidad**

### **Objetivo Principal**
Navegar a través de 4 niveles desafiantes para alcanzar y rescatar a la princesa, mientras recolectas gemas, gestionas la salud y mejoras habilidades.

### **Personaje del Jugador: El Mago**
- **Sistema de Salud**: Comienza con 2 vidas, mejorable hasta 6 vidas máximo mediante compras en la tienda
- **Combate**: Habilidad de lanzar bolas de fuego con sistema de tiempo de espera (10 segundos por defecto, reducible a 7 segundos con mejoras)
- **Movimiento**: Movimiento horizontal, salto y escalado de escaleras
- **Invulnerabilidad**: Período de invulnerabilidad de 2 segundos después de recibir daño

### **Progresión de Niveles**
- **4 Niveles Únicos**: Cada uno con temas distintivos, enemigos y estilos visuales
- **Generación Procedural**: Los niveles se generan aleatoriamente en cada partida para valor de rejugabilidad
- **Dificultad Progresiva**: Cada nivel introduce nuevos desafíos y tipos de enemigos
- **Sistema de Portales**: Toca portales para avanzar al siguiente nivel

### **Sistema de Combate**
- **Magia de Bolas de Fuego**: Ataque principal con temporizador de tiempo de espera
- **Tipos de Enemigos**:
  - **Enemigos Básicos**: Enemigos simples terrestres
  - **Minotauros**: Enemigos más fuertes y agresivos
  - **Generadores de Barriles**: Generan proyectiles de barriles rodantes
  - **Barriles Rodantes**: Peligros proyectiles que caen desde arriba

### **Recolección y Progresión**
- **Gemas**: Moneda principal para compras en la tienda
- **Corazones**: Objetos de restauración de salud (solo cuando falten vidas)
- **Sistema de Tienda**: Accesible después de morir, ofrece tres tipos de mejoras:
  - **Mejoras de Vida**: Aumentar salud máxima (Nivel 1: 3 vidas, Nivel 2: 4 vidas, Nivel 3: 5 vidas)
  - **Bola de Fuego Rápida**: Reduce tiempo de espera de 10s a 7s
  - **Continuar**: Regresar al Nivel 1 con mejoras actuales

### **Mecánicas Especiales**
- **Sistema de Escaleras**: Subir y bajar usando teclas W/S
- **Peligro de Lava**: El Nivel 4 presenta lava que sube y mata instantáneamente
- **Sistema de Pausa**: P para pausar, Q para salir al menú cuando está pausado
- **Muerte y Reaparición**: Al morir, acceso al sistema de tienda antes de continuar

---

## **Experiencia del Jugador**

Los jugadores deberían sentirse:
- **Desafiados** — Dificultad progresiva y riesgo de muerte permanente
- **Recompensados** — Recolección de gemas y mejoras significativas
- **Comprometidos** — Generación aleatoria de niveles asegura rejugabilidad
- **Empoderados** — Sistema de mejoras permite progresión y estrategia

---

## _Técnico_

---

### **Pantallas**

1. **Sistema de Inicio de Sesión/Registro**
   - Integración con base de datos MySQL
   - Autenticación de usuarios
   - Seguimiento de estadísticas del jugador

2. **Menú Principal**
   - Iniciar Juego
   - Ver Estadísticas
   - Cerrar Sesión

3. **Niveles del Juego (1-4)**
   - Diseños generados proceduralmente
   - Jugabilidad en tiempo real
   - HUD con vidas, gemas y visualización de nivel

4. **Sistema de Tienda**
   - Tres categorías de mejoras
   - Compras basadas en gemas
   - Mecánicas de continuar/reintentar

5. **Pantalla de Victoria**
   - Finalización del rescate de la princesa
   - Visualización de estadísticas

---

### **Controles**

- `A` / `D` — Moverse izquierda/derecha
- `W` / `S` — Subir/bajar escaleras
- `Espacio` — Saltar
- `E` — Lanzar Bola de Fuego
- `P` — Pausar juego
- `Q` — Salir al menú (cuando está pausado)
- **Navegación de la Tienda**:
  - `W` / `S` — Navegar artículos de la tienda
  - `Espacio` — Comprar/Continuar

---

### **Mecánicas Principales**

### **Sistema de Física**
- **Gravedad**: Física de caída realista
- **Detección de Colisiones**: Colisión precisa basada en hitbox
- **Detección de Suelo**: Previene exploits de salto en el aire
- **Física de Escaleras**: Estado de movimiento especial para escalado

### **Sistema de Combate**
- **Proyectiles de Bolas de Fuego**: Proyectiles basados en física con tiempo de espera
- **Sistema de Daño**: Reducción de salud con marcos de invulnerabilidad
- **Enemigos**: Patrones de patrulla e interacción con el jugador

### **Generación de Niveles**
- **Diseños Procedurales**: Colocación aleatoria de plataformas y enemigos
- **Recursos Temáticos**: Elementos visuales y de jugabilidad específicos del nivel
- **Colocación de Corazones**: Distribución inteligente de objetos de salud (30-70% de altura del nivel)

### **Integración de Base de Datos**
- **Cuentas de Jugadores**: Sistema seguro de inicio de sesión/registro
- **Seguimiento de Estadísticas**: Muertes, niveles alcanzados, tiempo de juego, gemas recolectadas
- **Gestión de Sesiones**: Datos persistentes del usuario entre sesiones

---

## _Diseño de Niveles_

---

### **Temas de Niveles**

### **Nivel 1: Bosque/Naturaleza**
- **Tema Visual**: Bloques de césped verde, ambientes naturales
- **Fondo**: Paisaje de bosque (`../assets/Map1.jpg`)
- **Enemigos**: Enemigos básicos, generación moderada de barriles
- **Música**: `level_1_music.mp3`

### **Nivel 2: Reino del Cielo/Nubes**
- **Tema Visual**: Bloques de nubes azul claro
- **Fondo**: Ambiente de cielo (`../assets/stages/Map-2/map-2.png`)
- **Enemigos**: Dificultad aumentada, más minotauros
- **Música**: `level_2_music.mp3`

### **Nivel 3: Volcánico/Oscuro**
- **Tema Visual**: Bloques de obsidiana de lava oscura
- **Fondo**: Ambiente volcánico (`../assets/stages/Map-3/map_3.png`)
- **Enemigos**: Alta densidad de enemigos, patrones desafiantes
- **Música**: `level_3_music.mp3`

### **Nivel 4: Área del Jefe Final**
- **Tema Visual**: Bloques de lava fundida con estética peligrosa
- **Fondo**: Ambiente del jefe final (`../assets/stages/Map-Final Boss/final_level.png`)
- **Peligro Especial**: Sistema de lava que sube (muerte instantánea)
- **Finalización**: El encuentro con la princesa termina el juego
- **Música**: `level_4_music.mp3`

### **Flujo del Juego**

1. **Sistema de Inicio de Sesión**: Autenticación del jugador y carga de estadísticas
2. **Menú Principal**: Mostrar estadísticas del jugador, iniciar jugabilidad
3. **Nivel 1**: Introducción tipo tutorial con enemigos básicos
4. **Transición de Portal**: Finalización de nivel con música de transición
5. **Nivel 2**: Dificultad aumentada y nuevos patrones de enemigos
6. **Nivel 3**: Desafíos avanzados y diseños complejos
7. **Nivel 4**: Desafío final con peligro de lava y rescate de la princesa
8. **Sistema de Tienda**: Accesible al morir para mejoras y continuación
9. **Victoria**: Finalización del rescate de la princesa con actualización de estadísticas

---

## _Desarrollo_

---

### **Arquitectura**

### **Clases Principales**
- **`Player`**: Personaje principal con salud, movimiento y combate
- **`Enemy`**: Clase base de enemigo con colisión
- **`Minotaur`**: Enemigo avanzado con comportamiento mejorado
- **`BarrelSpawner`**: Crea proyectiles de barriles
- **`Barrel`**: Obstáculos proyectiles rodantes
- **`Heart`**: Recolectables de restauración de salud
- **`Gem`**: Coleccionables de moneda
- **`Portal`**: Objetos de transición de nivel
- **`Princess`**: Personaje del objetivo final

### **Clases del Sistema**
- **`Game`**: Gestión principal del estado del juego
- **`Level`**: Generación y gestión de niveles
- **`Shop`**: Sistema de mejoras y compras
- **`SoundManager`**: Gestión del sistema de audio
- **`LevelGenerator`**: Creación procedural de niveles
- **`Lava`**: Sistema de peligro del Nivel 4

### **Integración de Base de Datos**

### **Esquema de Base de Datos MySQL**
- **Autenticación de Usuarios**: Inicio de sesión/registro seguro
- **Estadísticas del Jugador**: Muertes, niveles, tiempo de juego, gemas
- **Gestión de Sesiones**: Datos persistentes entre sesiones
- **Análisis del Juego**: Seguimiento de rendimiento y progresión

### **Arquitectura del Servidor**
- **Backend Node.js**: Servidor Express con integración MySQL
- **API RESTful**: Endpoints para autenticación y gestión de datos
- **Actualizaciones en Tiempo Real**: Seguimiento de estadísticas en vivo durante la jugabilidad

---

## _Gráficos_

---

### **Estilo Visual**

- **Estética de Arte Pixelado**: Gráficos de alta calidad basados en sprites
- **Personajes Animados**: Sistema de animación basado en marcos
- **Fondos Dinámicos**: Ambientes temáticos específicos del nivel
- **Retroalimentación Visual**: 
  - Efectos de parpadeo de daño
  - Indicadores visuales de invulnerabilidad
  - Animaciones de sprites suaves

### **Recursos de Sprites**

### **Sprites de Personajes**
- **Personaje Mago**: Conjunto completo de animaciones (inactivo, caminar, saltar, atacar, herido, escalar)
- **Enemigos**: Sprites animados para todos los tipos de enemigos
- **Princesa**: Personaje de finalización animado

### **Recursos Ambientales**
- **Bloques Específicos del Nivel**: Estilos visuales temáticos para cada nivel
- **Fondos**: Fondos de nivel de alta calidad
- **Objetos Interactivos**: Escaleras, portales, coleccionables

### **Elementos de UI**
- **Componentes de HUD**: Contadores de vidas, gemas, niveles
- **Interfaz de Tienda**: UI de selección de mejoras y compras

---

## _Sistema de Audio_

---

### **Música**

### **Música de Fondo (En Bucle)**
- **`level_1_music.mp3`**: Tema del bosque
- **`level_2_music.mp3`**: Tema del reino del cielo  
- **`level_3_music.mp3`**: Tema volcánico
- **`level_4_music.mp3`**: Tema del nivel final
- **`shop_music.mp3`**: Tema del sistema de tienda

### **Música de Transición**
- **`level-win-6416.mp3`**: Transiciones de finalización de nivel

### **Efectos de Sonido**

- **`jump_sound.mp3`**: Retroalimentación de acción de salto
- **`cast_fire_spell.mp3`**: Sonido de lanzamiento de bolas de fuego
- **`taking_damage.mp3`**: Sonido de daño recibido
- **`dying_music.mp3`**: Sonido de secuencia de muerte

### **Características de Audio**
- **Control de Volumen Inteligente**: Volumen separado para música/efectos (30%/15%)
- **Manejo de Reproducción Automática del Navegador**: Cumplimiento con requisito de interacción del usuario
- **Cambio de Música Dinámico**: Transiciones sin problemas entre niveles y tienda
- **Gestión de Estado de Audio**: Detención/inicio adecuado de pistas de audio

---

## _Interfaz de Usuario_

---

### **Elementos de HUD**
- **Visualización de Vidas**: Visualización de salud actual/máxima
- **Contador de Gemas**: Visualización de moneda en tiempo real
- **Indicador de Nivel**: Progresión del nivel actual
- **Contador de Muertes**: Seguimiento de estadísticas del jugador

### **Interfaz del Sistema de Tienda**
- **Diseño de Tres Objetos**: Mejora de Vida, Bola de Fuego Rápida, Continuar
- **Indicadores Visuales**: Asequibilidad y estado de compra
- **Navegación**: Sistema de selección basado en teclado
- **Retroalimentación de Compra**: Confirmación visual/auditiva inmediata

### **Sistemas de Menú**
- **Interfaz de Inicio de Sesión**: Formularios de autenticación limpios
- **Menú Principal**: Visualización de estadísticas e inicio del juego
- **Menú de Pausa**: Gestión del estado del juego con instrucciones claras
- **Pantalla de Victoria**: Celebración de finalización y estadísticas

### **Características Técnicas**
- **Diseño Responsivo**: Se adapta a diferentes tamaños de pantalla
- **Integración de Base de Datos**: Actualizaciones de estadísticas en tiempo real
- **Pulido Visual**: Diseño de UI profesional con temática consistente

---

## _Estado de Implementación_

Este Documento de Diseño del Juego refleja el **estado implementado actual** de Torre del Mago, incluyendo:

✅ **Sistema completo de progresión de 4 niveles**  
✅ **Sistema de combate completo con magia de bolas de fuego**  
✅ **Sistema integral de tienda y mejoras**  
✅ **Sistema de audio completo con música y efectos**  
✅ **Integración con base de datos MySQL**  
✅ **Generación procedural de niveles**  
✅ **Sistema profesional de animación de sprites**  
✅ **Física robusta y detección de colisiones**  
✅ **Enemigos y comportamiento**  
✅ **Sistema completo de UI/UX**

El juego está completo en características y representa una experiencia de plataformero 2D pulida y profesional.
