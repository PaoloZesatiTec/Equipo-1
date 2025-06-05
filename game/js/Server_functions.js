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