"use strict"
import express from 'express'
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { error } from 'console'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Función de conexión a la base de datos
async function ConnectDB() {
    return await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: 'admin',
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

// Configurar rutas estáticas usando rutas absolutas
const gamePath = path.join(__dirname, '..', 'game');
app.use(express.static(gamePath));

// Rutas para las páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'index.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'register.html'));
});

// Manejar rutas con .html
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'register.html'));
});

app.get('/stats.html', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'stats.html'));
});

app.get('/estadisticas', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'stats.html'));
});

let itemsCatalog = []
let nextId = 1

app.get('/', (req, res) => {
    res.sendFile(path.join(gamePath, 'html', 'index.html'));
});

//--------------------------------------------------------------------------------------------------
// Login

app.post("/api/login", async (req, res)=>{

  let connection = null;

  try {
    const {nombre, password_jugador} = req.body;
    if (!nombre || !password_jugador) {
      return res.status(400).json({
          success: false,
          message: 'Se requiere un username y una contraseña',
          error: 'MISSING_REQUIRED_FIELDS'
      });
  }

  connection = await ConnectDB();


  const userQuery = 'SELECT id_jugador, nombre, password_jugador FROM jugador WHERE nombre = ?';
        const [users] = await connection.execute(userQuery, [nombre]);

        if (users.length === 0){
          return res.status(401).json({
            success: false,
            message: 'Credenciales invalidas',
            error: 'INVALID_CREDENTIALS'
          });
        }
        
        const user = users[0];

        if(user.password_jugador !== password_jugador){
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
        console.error('Error en login', error);
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
//--------------------------------------------------------------------------------------------------
//View gamestats

app.get("/api/gamestats", async (req, res) => {
    let connection = null;
    try {
        const id_jugador = req.query.id_jugador;
        
        if (!id_jugador) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del jugador',
                error: 'MISSING_PLAYER_ID'
            });
        }

        connection = await ConnectDB();

        // Consulta para obtener estadísticas totales del jugador
        const statsQuery = `
            SELECT 
                COALESCE(COUNT(*), 0) as total_partidas,
                COALESCE(MAX(nivel_maximo_alcanzado), 0) as nivel_maximo,
                COALESCE(SUM(experiencia_ganada), 0) as experiencia_total,
                COALESCE(SUM(duracion), 0) as tiempo_total,
                COALESCE((
                    SELECT SUM(enemigos_eliminados) 
                    FROM Estadistica_partida 
                    WHERE id_jugador = ?
                ), 0) as total_enemigos_eliminados,
                COALESCE((
                    SELECT SUM(powerups_usados) 
                    FROM Estadistica_partida 
                    WHERE id_jugador = ?
                ), 0) as total_powerups
            FROM Partida 
            WHERE id_jugador = ?
        `;

        const [stats] = await connection.execute(statsQuery, [id_jugador, id_jugador, id_jugador]);

        // Siempre devolver estadísticas, incluso si son cero
        res.status(200).json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: stats[0] || {
                total_partidas: 0,
                nivel_maximo: 0,
                experiencia_total: 0,
                tiempo_total: 0,
                total_enemigos_eliminados: 0,
                total_powerups: 0
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
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
//--------------------------------------------------------------------------------------------------
//Start new game

app.post("/api/newgame", async(req, res)=>{
    let connection = null;
    try{
        const { id_jugador } = req.body;
        if (!id_jugador) {
            return res.status(400).json({
                success : false,
                message : 'ID de jugador es requerido',
                error : 'MISSING_PLAYER_ID'
            });
        }
        connection = await ConnectDB();

        const insertQuery = `
        INSERT INTO PARTIDA (id_jugador)
        VALUES(?)
        `;
        
        const [ result ] = await connection.execute(insertQuery, [ id_jugador ]);

        res.status(201).json({
            succes : true,
            message : 'Partida iniciada correctamente',
            id_partida : result.insertId
        })
    }catch(error){
        console.error('Error al iniciar la partida: ', error);
        res.status(500).json({
            succes : false,
            message : 'Error interno en el servidor',
            error : error.message
        });
    }finally{
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
//--------------------------------------------------------------------------------------------------
//adding the stats like time and exp of said game

app.patch("/api/newgame/:id", async (req, res)=>{
    let connection = null;
    try{
        const id_partida = parseInt (req.params.id);
        const {nivel_maximo_alcanzado, duracion, vida, experiencia_ganada} = req.body;

        if (!id_partida){
            return res.status(400).json({
                succes : false,
                message : 'Id de partida requerido',
                error : 'MISSING_GAME_ID'
            });
        }

        connection = await ConnectDB();

        const updateQuery = `
        UPDATE Partida
        SET
            fecha_fin = NOW(),
            nivel_maximo_alcanzado = ?,
            duracion = ?,
            vida = ?,
            experiencia_ganada = ?
        WHERE id_partida = ?
        `;

        await connection.execute(updateQuery, [
            nivel_maximo_alcanzado,
            duracion,
            vida,
            experiencia_ganada,
            id_partida
        ]);

        res.status (200).json({
            succes : true,
            message : 'Partida actualizada correctamente'
        });

    } catch (error){
        console.error('Error al finalizar partida: ', error);
        res.status(500).json({
            succes : false,
            message : 'Error interno en el servidor',
            error : error.message
        });
        
    }finally{
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
//--------------------------------------------------------------------------------------------------
//Adding analytics stats of game

app.post("/api/substats", async(req, res)=>{
    let connection = null;
    try{
        const  {id_partida, id_jugador, enemigos_eliminados, powerups_usados} = req.body;
        if(!id_partida||!id_jugador){
            return res.status(400).json({
                succes : false,
                message : 'Se requiere el id de partida y de jugador',
                error : "MISSING_REQUIRED_FIELDS"
            });
        }

            connection = await ConnectDB();
            const insertQuery = `
            INSERT INTO Estadistica_partida (id_partida, id_jugador, enemigos_eliminados, powerups_usados)
            VALUES (?,?,?,?)
            `;

            await connection.execute(insertQuery, [
                id_partida,
                id_jugador,
                enemigos_eliminados ?? 0,
                powerups_usados ?? 0
            ]);

            res.status(201).json({
                succes : true,
                message : "Datos agregados exitosamente!"
            });
        
    } catch(error){
        console.error("Error al insertar las estadísticas: ", error);

        if(error.code === "ER_DUP_ENTRY"){
            return res.status(409).json({
                succes : false,
                message : "Ya existen estadísticas para esta partida y jugador",
                error : "DUPLICATE_ENTRY"
            });
        }
    }finally{
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
//--------------------------------------------------------------------------------------------------




app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

