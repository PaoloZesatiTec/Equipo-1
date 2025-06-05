"use strict"
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Función de conexión a la base de datos
async function ConnectDB() {
    return await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: 'Capo0383',
        database: 'mage_db',
    });
}

// Rutas API
app.post("/api/createplayer", async (req, res) => {
    console.log('Received request:', req.body); // Debug log
    let connection = null;

    try {
        const { nombre, password_jugador } = req.body;

        // Validaciones básicas
        if (!nombre || !password_jugador) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un username y una contraseña',
                error: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validación de longitud de contraseña
        if (password_jugador.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres',
                error: 'PASSWORD_TOO_SHORT'
            });
        }

        connection = await ConnectDB();

        // Verificar si el usuario ya existe
        const checkNombreQuery = 'SELECT id_jugador FROM jugador WHERE nombre = ?';
        const [existingNombre] = await connection.execute(checkNombreQuery, [nombre]);

        if (existingNombre.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Este username ya esta ligado a un usuario',
                error: 'NAME_ALREADY_EXISTS'
            });
        }

        const insertQuery = 'INSERT INTO jugador (nombre, password_jugador) VALUES (?, ?)';
        const [result] = await connection.execute(insertQuery, [nombre, password_jugador]);

        res.status(201).json({
            success: true,
            message: 'Jugador registrado!',
            data: result.insertId
        });
    } catch (error) {
        console.error('Error al registrar jugador: ', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
                console.log('Conexión a DB cerrada correctamente');
            } catch (closeError) {
                console.error('Error al cerrar conexión', closeError);
            }
        }
    }
});

// Ruta de login
app.post("/api/login", async (req, res) => {
    console.log('Received login request:', req.body); // Debug log
    let connection = null;

    try {
        const { nombre, password_jugador } = req.body;

        // Validaciones básicas
        if (!nombre || !password_jugador) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un username y una contraseña',
                error: 'MISSING_REQUIRED_FIELDS'
            });
        }

        connection = await ConnectDB();

        // Buscar usuario
        const userQuery = 'SELECT id_jugador, nombre, password_jugador FROM jugador WHERE nombre = ?';
        const [users] = await connection.execute(userQuery, [nombre]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
                error: 'INVALID_CREDENTIALS'
            });
        }

        const user = users[0];

        if (user.password_jugador !== password_jugador) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta',
                error: 'INVALID_CREDENTIALS'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: {
                id_jugador: user.id_jugador,
                nombre: user.nombre
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
                console.log('Conexión a DB cerrada correctamente');
            } catch (closeError) {
                console.error('Error al cerrar conexión', closeError);
            }
        }
    }
});

// Configurar rutas estáticas
app.use(express.static(path.join(__dirname, 'game')))

// Rutas para las páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/index.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/register.html'));
});

// Manejar rutas con .html
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'game/html/register.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});