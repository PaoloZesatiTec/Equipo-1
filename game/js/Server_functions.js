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
        console.log("Save data se llamó con valores:", {
            id_partida,
            id_jugador,
            nivel,
            duracion,
            vida,
            experiencia,
            enemigos,
            powerups
        });
    try {
        // First try to update game stats with PATCH
        const gameStatsResponse = await fetch(`/api/newgame/${id_partida}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                nivel_maximo_alcanzado: nivel,
                duracion,
                vida,
                experiencia_ganada: experiencia
            })
        });

        if (!gameStatsResponse.ok) {
            throw new Error(`Error updating game stats: ${gameStatsResponse.status}`);
        }

        // Try to save substats with POST first
        const postData = {
            id_partida,
            id_jugador,
            enemigos_eliminados: enemigos,
            powerups_usados: powerups
        };
        console.log('Sending POST data:', postData);
        
        let substatsResponse = await fetch(`/api/substats`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(postData)
        });

        // If POST returns 409, use PATCH instead
        if (substatsResponse.status === 409) {
            console.log('Stats already exist, updating with PATCH...');
            const patchData = {
                id_partida,
                id_jugador,
                enemigos_eliminados: enemigos,
                powerups_usados: powerups
            };
            console.log('Sending PATCH data:', patchData);
            
            substatsResponse = await fetch(`/api/substats`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(patchData)
            });

            if (!substatsResponse.ok) {
                const errorData = await substatsResponse.json();
                console.error('PATCH response error:', errorData);
                throw new Error(`Error updating substats: ${substatsResponse.status} - ${errorData.message || 'Unknown error'}`);
            }

            const responseData = await substatsResponse.json();
            console.log('PATCH response:', responseData);
        } else if (!substatsResponse.ok) {
            throw new Error(`Error saving substats: ${substatsResponse.status}`);
        }

        console.log('Datos finales enviados correctamente');
    } catch(error) {
        console.error('Error al guardar las estadisticas:', error);
        // You might want to show this error to the user in a non-intrusive way
        // For example, you could add a small notification in the game UI
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
            console.log('Respuesta de creación de partida:', newGameData);
            if (newGameData.success && newGameData.id_partida) {
                localStorage.setItem('id_partida', newGameData.id_partida);
                console.log('id_partida guardado en localStorage:', newGameData.id_partida);            
            }else{
                console.log("No se pudo crear partida");
                return;
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
function secondsToHHMMSS(segundos) {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}