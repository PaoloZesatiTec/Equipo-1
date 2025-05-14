// Variables globales
let gameStarted = false;
let startButton;
let menuContainer;
let logoImg;

// Función para inicializar el menú
function initMenu() {
    // Obtener el contenedor del canvas
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    if (!canvasWrapper) {
        console.error('No se encontró el contenedor del canvas');
        return;
    }

    // Crear contenedor del menú
    menuContainer = document.createElement('div');
    menuContainer.id = 'menuContainer';
    menuContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        border: 4px solid #ffd700;
        animation: borderGlow 2s infinite;
        box-sizing: border-box;
    `;

    // Crear y agregar el logo animado
    logoImg = document.createElement('img');
    logoImg.src = '../assets/logo.svg';
    logoImg.alt = 'Logo Mage Tower';
    logoImg.style.cssText = `
        width: 180px;
        height: auto;
        margin-bottom: 2rem;
        animation: logoPulse 2.5s infinite;
        filter: drop-shadow(0 0 20px #ffd70088);
    `;

    // Crear botón de inicio
    startButton = document.createElement('button');
    startButton.id = 'startButton';
    startButton.textContent = '¡JUGAR MAGE TOWER!';
    startButton.style.cssText = `
        padding: 20px 40px;
        font-size: 24px;
        font-family: 'Press Start 2P', cursive;
        background-color: #ffd700;
        color: #000;
        border: 4px solid #ff8c00;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        animation: buttonGlow 2s infinite;
    `;

        // Crear botón de inicio
        helpButton = document.createElement('button');
        helpButton.id = 'helpButton';
        helpButton.textContent = 'Ayuda';
        helpButton.style.cssText = `
            padding: 20px 30px;
            font-size: 24px;
            margin-top: 40px;
            font-family: 'Press Start 2P', cursive;
            background-color: #ffd700;
            color: #000;
            border: 4px solid #ff8c00;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: buttonGlow 2s infinite;
        `;


    // Agregar estilos para las animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes buttonGlow {
            0% { box-shadow: 0 0 10px #ffd700; }
            50% { box-shadow: 0 0 20px #ffd700, 0 0 30px #ff8c00; }
            100% { box-shadow: 0 0 10px #ffd700; }
        }

        @keyframes borderGlow {
            0% { border-color: #ff8c00; }
            50% { border-color: #ffd700; }
            100% { border-color: #ff8c00; }
        }

        @keyframes logoPulse {
            0% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 10px #ffd70088); }
            50% { transform: scale(1.08) rotate(2deg); filter: drop-shadow(0 0 30px #ffd700cc); }
            100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 10px #ffd70088); }
        }

        #startButton:hover {
            transform: scale(1.1);
            background-color: #ff8c00;
            border-color: #ffd700;
        }

        .canvas-wrapper {
            position: relative;
        }
    `;
    document.head.appendChild(style);

    // Agregar evento click al botón
    startButton.addEventListener('click', startGame);

    // Agregar elementos al DOM
    menuContainer.appendChild(logoImg);
    menuContainer.appendChild(startButton);
    menuContainer.appendChild(helpButton);
    canvasWrapper.appendChild(menuContainer);
}

// Función para iniciar el juego
function startGame() {
    // Ocultar el menú
    menuContainer.style.display = 'none';
    gameStarted = true;

    // Iniciar el juego
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.style.display = 'block';
    }

    // Iniciar el juego
    main();
}

// Función para mostrar el menú de nuevo
function showMenu() {
    if (menuContainer) {
        menuContainer.style.display = 'flex';
    }
    gameStarted = false;
}

// Inicializar el menú cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Ocultar el canvas inicialmente
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.style.display = 'none';
    }
    
    // Inicializar el menú
    initMenu();
}); 