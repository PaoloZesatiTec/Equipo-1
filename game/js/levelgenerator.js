// Level Generator for Roguelike Platformer

class LevelGenerator {
    constructor(width = 30, height = 60) {
        this.width = width;
        this.height = height;
        this.minPlatformLength = 4;
        this.maxPlatformLength = 7;
        this.jumpDistance = 3; // Reasonable jump distance
        this.layerHeight = 6; // Increased from 5 to 6 units between layers
        this.enemyChance = 0.4; // Increased from 0.15 to 0.4 to compensate for one-enemy-per-platform
        this.gemChance = 0.4; // Good gem distribution
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
        
        // Add enemies and collectibles
        this.populateLevel();

        // Add portal at the top
        this.addPortal();

        console.log("Generated Level Grid:\n" + this.gridToString());
        console.log("Level dimensions:", this.width, "x", this.height);
        console.log("Layer height:", this.layerHeight);
        
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
        const numLayers = 15;
        const layerSpacing = 6;
        
        // First, create all platforms
        for (let layer = 1; layer < numLayers; layer++) {
            const y = this.height - 1 - (layer * layerSpacing);
            if (y <= 0) continue;
            
            const isJumpLayer = layer % 3 === 0;
            if (isJumpLayer) {
                this.createJumpablePlatforms(y);
            } else {
                this.createConnectedPlatforms(y);
            }
        }
        
        // Clear all existing ladders
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 'L') {
                    this.grid[y][x] = '.';
                }
            }
        }
        
        // Place ladders one by one, ensuring they're on different platforms
        let lastLadderX = -1;
        
        for (let layer = 1; layer < numLayers; layer++) {
            const y = this.height - 1 - (layer * layerSpacing);
            if (y <= 0) continue;
            
            // Find all platforms in this layer
            let platforms = [];
            let currentPlatform = null;
            
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] === '#') {
                    if (!currentPlatform) {
                        currentPlatform = { start: x, end: x };
                    } else {
                        currentPlatform.end = x;
                    }
                } else if (currentPlatform) {
                    platforms.push(currentPlatform);
                    currentPlatform = null;
                }
            }
            if (currentPlatform) {
                platforms.push(currentPlatform);
            }
            
            // If no platforms found, create a small platform for the ladder
            if (platforms.length === 0) {
                const platformX = Math.floor(this.width / 2);
                for (let i = -1; i <= 1; i++) {
                    if (platformX + i > 0 && platformX + i < this.width - 1) {
                        this.grid[y][platformX + i] = '#';
                    }
                }
                platforms.push({ start: platformX - 1, end: platformX + 1 });
            }
            
            // Filter out platforms that contain the last ladder
            let validPlatforms = platforms.filter(platform => {
                if (lastLadderX === -1) return true;
                return !(lastLadderX >= platform.start && lastLadderX <= platform.end);
            });
            
            // If no valid platforms, use the longest platform
            if (validPlatforms.length === 0) {
                validPlatforms = [platforms.reduce((longest, current) => 
                    (current.end - current.start) > (longest.end - longest.start) ? current : longest, platforms[0])];
            }
            
            // Choose the longest platform from valid platforms
            const selectedPlatform = validPlatforms.reduce((longest, current) => 
                (current.end - current.start) > (longest.end - longest.start) ? current : longest, validPlatforms[0]);
            
            const ladderX = Math.floor((selectedPlatform.start + selectedPlatform.end) / 2);
            
            // Find the next platform below
            let nextPlatformY = -1;
            for (let checkY = y + 1; checkY <= y + layerSpacing; checkY++) {
                if (this.grid[checkY][ladderX] === '#') {
                    nextPlatformY = checkY;
                    break;
                }
            }
            
            // If no platform below found, create one
            if (nextPlatformY === -1) {
                nextPlatformY = y + layerSpacing;
                for (let i = -1; i <= 1; i++) {
                    if (ladderX + i > 0 && ladderX + i < this.width - 1) {
                        this.grid[nextPlatformY][ladderX + i] = '#';
                    }
                }
            }
            
            // Place the ladder
            for (let ladderY = y; ladderY < nextPlatformY; ladderY++) {
                this.grid[ladderY][ladderX] = 'L';
            }
            
            lastLadderX = ladderX;
            console.log(`Layer ${layer}: Placed ladder at x=${ladderX}, from y=${y} to y=${nextPlatformY}`);
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
        // Place player on ground level
        this.grid[this.height - 2][2] = '@';
    }

    populateLevel() {
        // Add enemies and gems to platforms with constraints
        console.log("Starting enemy placement...");
        
        // First, identify all platforms
        let platforms = [];
        
        for (let y = 1; y < this.height - 2; y++) {
            let currentPlatform = null;
            
            for (let x = 1; x < this.width - 1; x++) {
                // Check if this is a platform block (wall or ladder) with empty space above
                const isPlatformBlock = (this.grid[y][x] === '#' || this.grid[y][x] === 'L') && this.grid[y - 1][x] === '.';
                
                if (isPlatformBlock) {
                    // This is a platform block with empty space above
                    if (!currentPlatform) {
                        currentPlatform = { y: y, startX: x, endX: x };
                    } else {
                        currentPlatform.endX = x;
                    }
                } else if (this.grid[y][x] !== '#' && this.grid[y][x] !== 'L') {
                    // End of platform (hit empty space)
                    if (currentPlatform) {
                        platforms.push(currentPlatform);
                        console.log(`Found platform at y=${currentPlatform.y}, x=${currentPlatform.startX}-${currentPlatform.endX}`);
                        currentPlatform = null;
                    }
                }
            }
            
            // Don't forget the last platform if it ends at the edge
            if (currentPlatform) {
                platforms.push(currentPlatform);
                console.log(`Found platform at y=${currentPlatform.y}, x=${currentPlatform.startX}-${currentPlatform.endX}`);
            }
        }
        
        console.log(`Found ${platforms.length} platforms total`);
        
        // Now place exactly one enemy per platform (with chance)
        platforms.forEach((platform, index) => {
            if (Math.random() < this.enemyChance) {
                // Find valid positions on this platform (only on actual wall blocks, not ladders)
                let validPositions = [];
                for (let x = platform.startX; x <= platform.endX; x++) {
                    if (this.grid[platform.y][x] === '#' && this.grid[platform.y - 1][x] === '.') {
                        validPositions.push(x);
                    }
                }
                
                if (validPositions.length > 0) {
                    // Choose a random valid position
                    const randomX = validPositions[Math.floor(Math.random() * validPositions.length)];
                    const enemyY = platform.y - 1;
                    
                    // Double check the spot is empty
                    if (this.grid[enemyY][randomX] === '.') {
                        const enemyType = Math.random();
                        if (enemyType < 0.3) {
                            this.grid[enemyY][randomX] = 'E'; // Regular enemy
                            console.log(`Placed Enemy at (${randomX}, ${enemyY}) on platform ${index}`);
                        } else if (enemyType < 0.6) {
                            this.grid[enemyY][randomX] = 'M'; // Minotaur
                            console.log(`Placed Minotaur at (${randomX}, ${enemyY}) on platform ${index}`);
                        } else {
                            this.grid[enemyY][randomX] = 'B'; // Barrel
                            console.log(`Placed Barrel at (${randomX}, ${enemyY}) on platform ${index}`);
                        }
                    } else {
                        console.log(`Spot (${randomX}, ${enemyY}) on platform ${index} was not empty: ${this.grid[enemyY][randomX]}`);
                    }
                }
            }
        });
        
        // Now place gems on remaining empty spots
        for (let y = 1; y < this.height - 2; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] === '#' && this.grid[y - 1][x] === '.') {
                    // Empty platform spot, chance for gem
                    if (Math.random() < this.gemChance) {
                        this.grid[y - 1][x] = '$';
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
    new LevelGenerator(28, 60).generate(),
    new LevelGenerator(28, 60).generate(),
];

// Export GAME_LEVELS for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_LEVELS };
} else {
    window.GAME_LEVELS = GAME_LEVELS;
}