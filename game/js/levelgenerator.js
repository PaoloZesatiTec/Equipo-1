// Level Generator for Roguelike Platformer

class LevelGenerator {
    constructor(width = 26, height = 60) {
        this.width = width;
        this.height = height;
        this.minPlatformLength = 4;
        this.maxPlatformLength = 7;
        this.jumpDistance = 3; // Reasonable jump distance
        this.layerHeight = 6; // Increased from 5 to 6 units between layers
        this.enemyChance = 0.25; // Increased enemy chance to ensure Minotaurs spawn
        this.gemChance = 0.4; // Good gem distribution
    }

    generate() {
        // Initialize empty grid
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill('.'));
        
        // Create walls
        this.createWalls();
        
        // Create ground level
        this.createGroundLevel();
        
        // Create platforms with proper spacing
        this.createPlatformLayers();
        
        // Add player
        this.addPlayer();
        
        // Add enemies and collectibles
        this.populateLevel();

        // Add portal at the top
        this.addPortal();

        console.log("Generated Level Grid:\n" + this.gridToString());
        console.log("Level dimensions:", this.width, "x", this.height);
        console.log("Layer height:", this.layerHeight);
        
        return this.gridToString();
    }

    createWalls() {
        // Create left and right walls
        for (let y = 0; y < this.height; y++) {
            this.grid[y][0] = '#';
            this.grid[y][this.width - 1] = '#';
        }
    }

    createGroundLevel() {
        // Create solid ground
        for (let x = 0; x < this.width; x++) {
            this.grid[this.height - 1][x] = '#';
        }
    }

    createPlatformLayers() {
        // Create layers with 5-unit spacing
        const numLayers = Math.floor((this.height - 10) / this.layerHeight);
        
        for (let layer = 1; layer < numLayers; layer++) {
            const y = this.height - 1 - (layer * this.layerHeight);
            if (y <= 5) continue; // Leave room for portal
            
            this.createLayerPlatforms(y);
        }
        
        // Add ladders AFTER all platforms are created
        for (let layer = 1; layer < numLayers; layer++) {
            const y = this.height - 1 - (layer * this.layerHeight);
            if (y <= 5) continue;
            
            this.addLaddersToLayer(y);
        }
        
        // Add ladder from ground level to first platform layer
        this.addGroundLadder();
    }
    
    createLayerPlatforms(y) {
        let x = 2; // Start position
        let platformsCreated = 0;
        const maxPlatforms = 3 + Math.floor(Math.random() * 2); // 3-4 platforms per layer
        
        while (x < this.width - 4 && platformsCreated < maxPlatforms) {
            const length = this.minPlatformLength + Math.floor(Math.random() * 
                (this.maxPlatformLength - this.minPlatformLength + 1));
            
            const actualLength = Math.min(length, this.width - x - 3);
            
            // Create platform
            for (let i = 0; i < actualLength; i++) {
                if (x + i < this.width - 1) {
                    this.grid[y][x + i] = '#';
                }
            }
            
            // Move to next platform position with maximum gap of 5
            x += actualLength + 3 + Math.floor(Math.random() * 3); // Gap of 3-5 units (max 5)
            platformsCreated++;
        }
    }
    
    addGroundLadder() {
        // Find the first platform layer
        const firstLayerY = this.height - 1 - this.layerHeight;
        
        // Find platforms in the first layer
        let platforms = [];
        for (let x = 1; x < this.width - 1; x++) {
            if (this.grid[firstLayerY][x] === '#') {
                let start = x;
                while (x < this.width - 1 && this.grid[firstLayerY][x] === '#') {
                    x++;
                }
                platforms.push({ start: start, end: x - 1 });
            }
        }
        
        if (platforms.length > 0) {
            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            const ladderX = Math.floor((platform.start + platform.end) / 2);
            
            // Create ladder from ground to the first platform layer
            for (let checkY = this.height - 2; checkY >= firstLayerY; checkY--) {
                this.grid[checkY][ladderX] = 'L';
            }
            
            console.log(`Ground ladder placed at x=${ladderX}, from y=${this.height - 2} to y=${firstLayerY}`);
        }
    }

    addLaddersToLayer(y) {
        // Find platforms in this layer
        let platforms = [];
        for (let x = 1; x < this.width - 1; x++) {
            if (this.grid[y][x] === '#') {
                let start = x;
                while (x < this.width - 1 && this.grid[y][x] === '#') {
                    x++;
                }
                platforms.push({ start: start, end: x - 1 });
            }
        }
        
        // Add ONE ladder to ONE platform only
        if (platforms.length > 0) {
            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            const ladderX = Math.floor((platform.start + platform.end) / 2);
            
            // Create ladder going up one layer to targetY
            const targetY = y - this.layerHeight;
            for (let checkY = y; checkY >= targetY && checkY >= 0; checkY--) {
                this.grid[checkY][ladderX] = 'L';
            }
            
            console.log(`Layer ladder placed at x=${ladderX}, y=${y}, going to y=${targetY}`);
        }
    }

    addPlayer() {
        // Place player on ground level
        this.grid[this.height - 2][2] = '@';
    }

    populateLevel() {
        // Add enemies and gems to platforms with constraints
        console.log("Starting enemy placement...");
        
        for (let y = 1; y < this.height - 2; y++) {
            // Look for platform blocks (walls)
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] === '#') {
                    // Check if there's empty space above this platform block
                    if (this.grid[y - 1][x] === '.') {
                        // This is a valid platform surface position
                        
                        // Add ONE enemy per platform with chance
                        if (Math.random() < this.enemyChance) {
                            const enemyType = Math.random();
                            if (enemyType < 0.4) {
                                this.grid[y - 1][x] = 'E'; // Regular enemy ON TOP of platform
                                console.log(`Placed Enemy at (${x}, ${y - 1}) above platform at (${x}, ${y})`);
                            } else if (enemyType < 0.8) {
                                this.grid[y - 1][x] = 'M'; // Minotaur ON TOP of platform
                                console.log(`Placed Minotaur at (${x}, ${y - 1}) above platform at (${x}, ${y})`);
                            } else {
                                this.grid[y - 1][x] = 'B'; // Barrel ON TOP of platform
                                console.log(`Placed Barrel at (${x}, ${y - 1}) above platform at (${x}, ${y})`);
                            }
                            
                            // Skip ahead to avoid placing multiple enemies on same platform
                            while (x < this.width - 1 && this.grid[y][x] === '#') {
                                x++;
                            }
                            x--; // Adjust for the upcoming x++ in the for loop
                        }
                        // Add gems to remaining spots (don't overlap with enemies)
                        else if (Math.random() < this.gemChance) {
                            this.grid[y - 1][x] = '$';
                        }
                    }
                }
            }
        }
        
        console.log("Enemy placement completed.");
    }

    addPortal() {
        // Find the highest platform for portal placement
        for (let y = 1; y < 10; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] === '#' && this.grid[y - 1][x] === '.') {
                    this.grid[y - 1][x] = 'P';
                    return;
                }
            }
        }
        
        // If no platform found, create one
        const portalY = 5;
        const portalX = Math.floor(this.width / 2);
        for (let i = -2; i <= 2; i++) {
            if (portalX + i > 0 && portalX + i < this.width - 1) {
                this.grid[portalY][portalX + i] = '#';
            }
        }
        this.grid[portalY - 1][portalX] = 'P';
    }

    gridToString() {
        return this.grid.map(row => row.join('')).join('\n');
    }
}

// Generate levels with all fixes applied
const GAME_LEVELS = [
    new LevelGenerator(26, 60).generate(),
    new LevelGenerator(26, 60).generate(),
];

// Export GAME_LEVELS for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_LEVELS };
} else {
    window.GAME_LEVELS = GAME_LEVELS;
}