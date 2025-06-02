DROP SCHEMA IF EXISTS MAGE_DB;
CREATE SCHEMA MAGE_DB;
USE MAGE_DB;

CREATE DATABASE MAGE_DB;
USE MAGE_DB;

CREATE TABLE Jugador (
    id_jugador SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    password_jugador varchar(10),
    vida int default 2 PRIMARY KEY,
    experiencia_total INT DEFAULT 0
) engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Partida (
    id_partida MEDIUMINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_jugador SMALLINT NOT NULL,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME DEFAULT NULL,
    nivel_maximo_alcanzado INT,
    duracion TIME DEFAULT NULL,
    vida int,
    experiencia_ganada INT,
    FOREIGN KEY (id_jugador) REFERENCES Jugador(id_jugador)
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Nivel (
    id_nivel INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    dificultad INT NOT NULL
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Enemigo (
    id_enemigo INT AUTO_INCREMENT PRIMARY KEY,
    id_nivel INT,
    tipo VARCHAR(10),
    vida INT NOT NULL,
    FOREIGN KEY (id_nivel) REFERENCES Nivel(id_nivel)
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Obstaculo (
    id_obstaculo INT AUTO_INCREMENT PRIMARY KEY,
    id_nivel INT,
    tipo VARCHAR(30),
    comportamiento TEXT,
    FOREIGN KEY (id_nivel) REFERENCES Nivel(id_nivel)
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE MejoraPoder (
    id_mejora INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(20),
    tipo ENUM('temporal', 'permanente'),
    descripcion TEXT
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Partida_Nivel (
    id_partida INT,
    id_nivel INT,
    PRIMARY KEY (id_partida, id_nivel),
    FOREIGN KEY (id_partida) REFERENCES Partida(id_partida),
    FOREIGN KEY (id_nivel) REFERENCES Nivel(id_nivel)
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Jugador_MejoraPoder (
    id_jugador INT,
    id_mejora INT,
    fecha_desbloqueo DATETIME,
    PRIMARY KEY (id_jugador, id_mejora),
    FOREIGN KEY (id_jugador) REFERENCES Jugador(id_jugador),
    FOREIGN KEY (id_mejora) REFERENCES MejoraPoder(id_mejora)
)engine = InnoDB default charset = utf8mb4 ;

CREATE TABLE Estadistica_partida (
    id_partida INT,
    id_jugador INT,
    enemigos_eliminados INT DEFAULT 0,
    powerups_usados INT DEFAULT 0,
    PRIMARY KEY (id_partida, id_jugador),
    FOREIGN KEY (id_partida) REFERENCES Partida(id_partida),
    FOREIGN KEY (id_jugador) REFERENCES Jugador(id_jugador)
) engine = InnoDB DEFAULT CHARSET = utf8mb4 ;

CREATE VIEW partidas_simple AS
SELECT 
    p.id_partida,
    j.nombre,
    p.fecha_inicio,
    p.duracion,
    p.nivel_maximo_alcanzado,
    p.experiencia_ganada,
    e.enemigos_eliminados,
    e.powerups_usados
FROM Partida p
JOIN Jugador j ON p.id_jugador = j.id_jugador
JOIN Estadistica_partida e ON p.id_partida = e.id_partida;
