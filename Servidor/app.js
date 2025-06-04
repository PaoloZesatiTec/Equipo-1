"use strict"
import express from 'express'
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { error } from 'console'


const app = express()
const PORT = 3000

app.use(express.json())
app.use(express.static('../game'))
app.use(express.static('../game/html'))
app.use(express.static('../game/css'))
app.use(express.static('../game/js'))


let itemsCatalog = []
let nextId = 1

app.get('/', (req, res) => {
    res.sendFile(path.resolve('../game/html/index.html'));
  });
  


  async function ConnectDB(){
    return await mysql.createConnection({
      host: "localhost",
      user: "DataBase",
      password: 'DataBase123',
      database: 'mage_db',
  });
}

//--------------------------------------------------------------------------------------------------
// Registro

  app.post("/api/createplayer", async (req, res) => {
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

        console.log(result.insertId,"result");


        res.status(201).json({
            success: true,
            message: 'Jugador registrado!',
            data: 0  
        });
    } catch (error) {
        console.error('Error al registrar jugador: ', error);

        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({
                success: false,
                message: 'Ya existe un jugador con esas credenciales',
                error: 'DUPLICATE_ENTRY'
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
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
//Login

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

app.get("/api/gamestats", async (req, res)=>{
    let connection = null;
    try{
        connection = await ConnectDB();
        const id_partida = req.query.id_partida ? parseInt(req.query.id_partida) : null;

        if (!id_partida) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID de la partida',
                error: 'MISSING_GAME_ID'
            });
        }

        // Usamos la vista Estadisticas_part que ya tiene toda la información necesaria
        const statsQuery = `
            SELECT * FROM Estadisticas_part 
            WHERE id_partida = ?
        `;

        const [stats] = await connection.execute(statsQuery, [id_partida]);

        if (stats.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró la partida especificada',
                error: 'GAME_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Estadísticas de la partida obtenidas exitosamente',
            data: stats[0]  // Retornamos el primer resultado ya que es una partida específica
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de la partida:', error);
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



app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

