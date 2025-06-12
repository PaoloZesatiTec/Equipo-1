"Use strict"


async function Save_data(
    {id_partida, 
    id_jugador, 
    nivel, 
    duracion, 
    vida, 
    experiencia, 
    enemigos, 
    powerups}
    ) {
        console.log("Save data se llamó");
    try{
    await fetch(`/api/newgame/${id_partida}`,{
        method : 'PATCH',
        headers : {'Content-Type' : 'application/json'},
        body : JSON.stringify({
            nivel_maximo_alcanzado : nivel,
            duracion,
            vida,
            experiencia_ganada : experiencia
        })
    });

    await fetch(`/api/substats`, {
        method : 'POST',
        Headers: {'Content-Type' : 'application/json'},
        body : JSON.stringify({
            id_partida,
            id_jugador,
            enemigos_eliminados : enemigos,
            powerups_usados :powerups
        })
    });
    console.log('Datos finales enviados correctamente');
    }catch(error){
        console.error('Error al guardar las estadisticas', error);

    }
}

async function getGameStats(id_partida){
    try{
        const response = await fetch(`/api/gamestats?id_partida=${id_partida}`);
        const result = await response.json();

        if(result.success){
            console.log('Estadisticas completas: ', result.data);
            return result.data;
        }else{
            console.warn('Estadisticas no encontradas:', result.message);
            return null
        }
    }catch(error){
        console.error('Error al obtener estadísticas: ', error);
        return null;
    }
}

// Manejo del formulario de login
document.querySelector('.login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.querySelector('input[placeholder="Usuario"]').value;
    const password = document.querySelector('input[placeholder="Contraseña"]').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: username,
                password_jugador: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar el ID del jugador en localStorage
            localStorage.setItem('playerId', data.data.id_jugador);
            localStorage.setItem('playerName', data.data.nombre);
            
            // Crear una nueva partida antes de redirigir
            const newGameResponse = await fetch('/api/newgame', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_jugador: data.data.id_jugador
                })
            });

            const newGameData = await newGameResponse.json();
            if (newGameData.success) {
                localStorage.setItem('id_partida', newGameData.id_partida);
            }
            
            // Redirigir al juego
            window.location.href = 'index.html';
        } else {
            alert(data.message || 'Error en el inicio de sesión');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
});


// Función para enviar estadísticas al servidor
async function sendGameStats(gameStats) {
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            console.error('No hay ID de jugador disponible');
            return;
        }

        

        // Actualizar estadísticas principales
//        await fetch(`/api/newgame/${id_partida}`, {
//            method: 'PATCH',
//            headers: {
//                'Content-Type': 'application/json'
//            },
//            body: JSON.stringify({
//                nivel_maximo_alcanzado: gameStats.level,
//                duracion: gameStats.time,
//                vida: gameStats.health,
//                experiencia_ganada: gameStats.score
//            })
//        });

  //      // Enviar estadísticas detalladas
  //      await fetch('/api/substats', {
  //          method: 'POST',
  //          headers: {
  //              'Content-Type': 'application/json'
  //          },
  //          body: JSON.stringify({
  //              id_partida: id_partida,
  //              id_jugador: playerId,
  //              enemigos_eliminados: gameStats.enemiesKilled,
  //              powerups_usados: gameStats.powerupsUsed
  //          })
  //      });

        console.log('Estadísticas enviadas correctamente');
    } catch (error) {
        console.error('Error al enviar estadísticas:', error);
    }
}