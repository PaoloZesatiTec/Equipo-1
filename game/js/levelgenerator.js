// Level Generator for Roguelike Platformer

class LevelGenerator {
    constructor(width = 26, height = 60) {
        this.width = width;
        this.height = height;
        this.minPlatformLength = 5;
        this.maxPlatformLength = 8;
        this.jumpDistance = 2; // Maximum horizontal distance for a jump
        this.minLayerHeight = 4; // Shorter distance between platforms
        this.ladderFrequency = 0.5; // Not every platform needs a ladder
        this.enemyChance = 0.3;
        this.gemChance = 0.3;
    }

    generate() {
        // Initialize empty grid with sky
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill('.'));
        
        // Always create right wall first to ensure it exists
        this.createRightWall();
        
        // Create ground level
        this.createGroundLevel();
        
        // Create platforms in a more complex pattern
        this.createComplexPlatforms();
        
        // Add player starting position
        this.addPlayer();
        
        // Add enemies
        this.addEnemies();
        
        // Add collectibles (gems)
        this.addCollectibles();

        this.addPortal();

        //Ver nivel para debugear
        console.log("Generated Level Grid:\n" + this.gridToString());

        // Convert grid to level string
        return this.gridToString();
    }

    createRightWall() {
        // Create right barrier - GUARANTEED
        for (let y = 0; y < this.height; y++) {
            this.grid[y][this.width - 1] = '#';
        }
    }

    createGroundLevel() {
        // Create ground platform
        for (let x = 0; x < this.width; x++) {
            this.grid[this.height - 1][x] = '#';
        }
    }

    createComplexPlatforms() {
        // Number of vertical layers
        const numLayers = 15; // 4-6 layers
        const layerSpacing = 6;
        
        // Create platforms layer by layer
        for (let layer = 1; layer < numLayers; layer++) {
            const y = this.height - 1 - (layer * layerSpacing);
            if (y <= 0) continue; // Skip if too high
            
            // Decide if this will be a "jump layer" or "ladder layer"
            const isJumpLayer = layer % 3 === 0; // Every third layer is for jumping platforms
            
            if (isJumpLayer) {
                this.createJumpablePlatforms(y);
            } else {
                this.createConnectedPlatforms(y);
            }
            
            // Ensure every layer has a ladder
            this.ensureLayerHasLadder(y, layerSpacing);
        }
    }
    
    ensureLayerHasLadder(y, layerSpacing) {
        // Find all platforms in this layer
        let platforms = [];
        for (let x = 1; x < this.width - 1; x++) {
            if (this.grid[y][x] === '#') {
                let platformStart = x;
                while (x < this.width - 1 && this.grid[y][x] === '#') {
                    x++;
                }
                platforms.push({
                    startX: platformStart,
                    length: x - platformStart,
                    hasLadder: false
                });
            }
        }
        
        // Check if this layer already has a ladder
        let hasLadder = false;
        for (let x = 1; x < this.width - 1; x++) {
            if (this.grid[y][x] === 'L') {
                hasLadder = true;
                break;
            }
        }
        
        // If no ladder exists, add one
        if (!hasLadder && platforms.length > 0) {
            // Try each platform until we find a valid connection
            let ladderPlaced = false;
            let attempts = 0;
            const maxAttempts = platforms.length * 2; // Try each platform twice if needed
            
            while (!ladderPlaced && attempts < maxAttempts) {
                // Choose a random platform
                const selectedPlatform = platforms[Math.floor(Math.random() * platforms.length)];
                const ladderX = Math.floor(selectedPlatform.startX + selectedPlatform.length / 2);
                
                // Check if there's already a ladder in the adjacent layers
                let hasAdjacentLadder = false;
                
                // Check layer above
                for (let checkY = y - layerSpacing; checkY >= 0; checkY -= layerSpacing) {
                    if (this.grid[checkY][ladderX] === 'L') {
                        hasAdjacentLadder = true;
                        break;
                    }
                }
                
                // Check layer below
                for (let checkY = y + layerSpacing; checkY < this.height; checkY += layerSpacing) {
                    if (this.grid[checkY][ladderX] === 'L') {
                        hasAdjacentLadder = true;
                        break;
                    }
                }
                
                if (!hasAdjacentLadder) {
                    // Find the next platform or ground below, but only look at the immediate next layer
                    let nextPlatformY = -1;
                    const maxSearchY = y + layerSpacing;
                    
                    for (let checkY = y + 1; checkY <= maxSearchY; checkY++) {
                        if (this.grid[checkY][ladderX] === '#') {
                            nextPlatformY = checkY;
                            break;
                        }
                    }
                    
                    if (nextPlatformY !== -1) {
                        // Create ladder from this platform level to the next platform level
                        for (let ladderY = y; ladderY < nextPlatformY; ladderY++) {
                            this.grid[ladderY][ladderX] = 'L';
                        }
                        ladderPlaced = true;
                    }
                }
                
                attempts++;
            }
            
            // If we still haven't placed a ladder, try one last time with any platform
            if (!ladderPlaced) {
                const selectedPlatform = platforms[Math.floor(Math.random() * platforms.length)];
                const ladderX = Math.floor(selectedPlatform.startX + selectedPlatform.length / 2);
                
                // Find the next platform or ground below
                let nextPlatformY = -1;
                const maxSearchY = y + layerSpacing;
                
                for (let checkY = y + 1; checkY <= maxSearchY; checkY++) {
                    if (this.grid[checkY][ladderX] === '#') {
                        nextPlatformY = checkY;
                        break;
                    }
                }
                
                if (nextPlatformY !== -1) {
                    // Create ladder from this platform level to the next platform level
                    for (let ladderY = y; ladderY < nextPlatformY; ladderY++) {
                        this.grid[ladderY][ladderX] = 'L';
                    }
                }
            }
        }
    }
    
    createJumpablePlatforms(y) {
        // Create platforms that can be reached by jumping
        let x = 1;
        while (x < this.width - 3) {
            // Create a platform
            const length = Math.floor(Math.random() * 
                (this.maxPlatformLength - this.minPlatformLength + 1)) + this.minPlatformLength;
            
            const actualLength = Math.min(length, this.width - x -4);
            
            for (let i = 0; i < actualLength; i++) {
                this.grid[y][x + i] = '#';
            }
            
            // Skip ahead by jump distance plus platform length
            x += actualLength + this.jumpDistance;
        }
    }
    
    createConnectedPlatforms(y) {
        let x = 1;
        let platformCount = 0;
        let platforms = []; // Array to store platform information
        
        // First, create all platforms
        while (x < this.width - 3 && platformCount < 3) {
            const length = Math.floor(Math.random() * 
                (this.maxPlatformLength - this.minPlatformLength + 1)) + this.minPlatformLength;
            
            const actualLength = Math.min(length, this.width - x - 2);
            
            // Create the platform
            for (let i = 0; i < actualLength; i++) {
                this.grid[y][x + i] = '#';
            }
            
            // Store platform information
            platforms.push({
                startX: x,
                length: actualLength,
                hasLadder: false // Track if this platform has a ladder
            });
            
            x += actualLength + Math.floor(Math.random() * 3) + 2;
            platformCount++;
        }
    }

    addPlayer() {
        // Place player on the ground level
        let playerX = 2; // Start near left edge
        let playerY = this.height - 2; // Just above ground
        
        this.grid[playerY][playerX] = '@';
    }

    addEnemies() {
        // Find all platforms
        for (let y = 0; y < this.height - 2; y++) {
            let platformStart = -1;
            
            for (let x = 0; x < this.width - 1; x++) {
                // Find start of platform
                if (platformStart === -1 && this.grid[y][x] === '#') {
                    platformStart = x;
                }
                // Find end of platform
                else if (platformStart !== -1 && this.grid[y][x] !== '#') {
                    // Platform ended
                    const platformLength = x - platformStart;
                    
                    // Only add enemies on larger platforms
                    if (platformLength >= 5 && Math.random() < this.enemyChance) {
                        const enemyX = platformStart + Math.floor(platformLength / 2);
                        // Add either a barrel or a spawner
                        if (Math.random() < 0.3) { // 30% chance for spawner
                            this.grid[y - 1][enemyX] = 'B';
                        } else {
                            this.grid[y - 1][enemyX] = 'E';
                        }
                    }
                    
                    platformStart = -1; // Reset for next platform
                }
            }
        }
    }

    addCollectibles() {
        // Add gems on platforms
        for (let y = 0; y < this.height - 2; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                // Place gems above platforms
                if (this.grid[y][x] === '#' && this.grid[y-1][x] === '.' &&
                    Math.random() < this.gemChance) {
                    this.grid[y-1][x] = '$';
                }
            }
        }
    }

    addPortal() {
        
        for (let y = 0; y < this.height - 1; y++) { 
            for (let x = 1; x < this.width - 1; x++) { 
                if (this.grid[y][x] === '#' && this.grid[y - 1][x] === '.') {
                    this.grid[y - 1][x] = 'P'; 
                    return; 
                }
            }
        }
    }

    gridToString() {
        return this.grid.map(row => row.join('')).join('\n');
    }
}

// Generate levels
const GAME_LEVELS = [
    new LevelGenerator().generate(),
    new LevelGenerator().generate(), // Add a second level
];

// Export GAME_LEVELS for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_LEVELS };
} else {
    window.GAME_LEVELS = GAME_LEVELS;
}


/*
let GAME_LEVELS = [`
    ................
    .##############.
    .#............#.
    .#........B...#.
    .#......#######.
    .#............#.
    .#............#.
    .#.@..........#.
    .##############.
    ................
    `,`
    ...................................................................
    ...................................................................
    .#...............................................................#.
    .#...............................................................#.
    .#......................................$........................#.
    .#...............................................................#.
    .#..................................#########....................#.
    .#...............................................................#.
    .#.......................$.......................................#.
    .#......................##########..............$................#.
    .#...............................................................#.
    .#..............$..........................#########.............#.
    .#..........########.............................................#.
    .#.@...$.$.......................................................#.
    .#################################################################.
    ...................................................................
    `];
    
    if (typeof module != "undefined" && module.exports && (typeof window == "undefined" || window.exports != exports))
      module.exports = GAME_LEVELS;
    if (typeof global != "undefined" && !global.GAME_LEVELS)
      global.GAME_LEVELS = GAME_LEVELS;
    

// If your game already has level loading code, modify it to use the generator
// For example:
// function gameStart() {
//     game = new Game('playing', new Level(GAME_LEVELS[0]));
//     setEventListeners();
//     updateCanvas(document.timeline.currentTime);
// } */