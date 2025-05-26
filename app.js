"use strict"
import express from 'express'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = 3000

// Middleware 
app.use(express.json())
app.use(express.static('./game'))

let itemsCatalog = []
let nextId = 1

app.get('/', (req, res) => {
    res.sendFile(path.resolve('game/html/index.html'));
  });
  
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });