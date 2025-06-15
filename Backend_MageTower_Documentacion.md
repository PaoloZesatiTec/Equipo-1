# Documentación del Servidor Backend - Mage Tower

Este archivo documenta el funcionamiento de `app.js`, el servidor Express que maneja las rutas de la API, autenticación, y acceso a archivos estáticos para el videojuego **Mage Tower**.

---

## Contenido

- [1. Configuración y Middlewares](#1-configuración-y-middlewares)
- [2. Conexión a Base de Datos](#2-conexión-a-base-de-datos)
- [3. Endpoints de Usuario](#3-endpoints-de-usuario)
- [4. Endpoints del Juego](#4-endpoints-del-juego)
- [5. Endpoints de Estadísticas](#5-endpoints-de-estadísticas)
- [6. Administración (Admin)](#6-administración-admin)
- [7. Rutas Estáticas y HTML](#7-rutas-estáticas-y-html)

---

## 1. Configuración y Middlewares

- Uso de `express`, `mysql2/promise`, `fs`, y `path`.
- Middleware de `express.json()` y `express.urlencoded()` para manejar JSON y formularios.

## 2. Conexión a Base de Datos

```js
async function ConnectDB() {
    return await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: 'admin',
        database: 'mage_db',
    });
}
```

---

## 3. Endpoints de Usuario

### `POST /api/createplayer`

Registra un nuevo jugador con nombre y contraseña. Valida duplicados y longitud mínima.

### `POST /api/login`

Autentica al usuario verificando nombre y contraseña.

---

## 4. Endpoints del Juego

### `POST /api/newgame`

Crea una nueva partida para un jugador dado su ID.

### `PATCH /api/newgame/:id`

Actualiza una partida existente agregando duración, nivel alcanzado, vida restante y experiencia ganada.

### `POST /api/substats`

Agrega estadísticas específicas de una partida como enemigos eliminados y power-ups usados.

### `PATCH /api/substats`

Actualiza estadísticas específicas ya existentes de una partida.

---

## 5. Endpoints de Estadísticas

### `GET /api/gamestats?id_jugador=...`

Devuelve estadísticas acumuladas del jugador: total de partidas, nivel máximo, experiencia total, enemigos eliminados y powerups usados.

---

## 6. Administración (Admin)

### `POST /api/admin/login`

Autentica a un administrador (requiere campo `es_admin` en tabla `jugador`).

### `GET /api/admin/users`

Lista todos los jugadores.

### `GET /api/admin/users/search?q=nombre`

Busca jugadores por nombre.

### `DELETE /api/admin/users/:id`

Elimina un jugador y sus partidas/estadísticas relacionadas.

### `GET /api/admin/stats`

Devuelve estadísticas globales del sistema.

### `GET /api/admin/recent-games`

Muestra las 10 partidas más recientes finalizadas.

### `GET /api/admin/users/:userId/stats`

Devuelve estadísticas completas de un jugador específico, junto con su historial de partidas.

---

## 7. Rutas Estáticas y HTML

El servidor sirve archivos desde la carpeta `/game/html`:

- `/`, `/index`, `/index.html`: Página principal del juego.
- `/login`, `/register`, `/help`, `/creditos`, `/estadisticas`, `/info`: Páginas funcionales.
- `/admin`: Redirige a `/admin.html` y verifica si el archivo existe antes de cargarlo.

---

## Puerto del Servidor

```js
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
```

El servidor escucha en el puerto `3000` por defecto.

---