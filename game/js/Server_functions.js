"Use strict"

import { json } from "body-parser"

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