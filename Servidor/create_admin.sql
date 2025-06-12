-- Seleccionar la base de datos
USE mage_db;

-- Verificar la estructura actual de la tabla
DESCRIBE jugador;

-- Agregar columna es_admin a la tabla jugador
ALTER TABLE jugador ADD COLUMN es_admin BOOLEAN DEFAULT FALSE;

-- Verificar que la columna se haya agregado
DESCRIBE jugador;

-- Crear un usuario administrador
INSERT INTO jugador (nombre, password_jugador, es_admin) 
VALUES ('admin', 'admin123', TRUE);

-- Verificar que el usuario se haya creado
SELECT id_jugador, nombre, es_admin FROM jugador WHERE nombre = 'admin'; 