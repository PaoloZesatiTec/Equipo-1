/* Updated platformer.js to support vertical scrolling camera */

"use strict";

let canvasWidth = 700; // Reverted back to original
let canvasHeight = 700; // Taller canvas for vertical platformer
let ctx;
let frameStart;
let game;
let player;
let level;

let scale = 30;
const walkSpeed = 0.006;
const initialJumpSpeed = -0.014;
const gravity = 0.000045;

let cameraY = 0; // New variable for vertical camera scrolling
let keyState = {}; // For climbing

class Player extends AnimatedObject {
    constructor(color, width, height, x, y, type) {
        // Make hitbox even smaller - reducing height and width further
        super(color, 0.3, 1.3, x, y, type); // Even smaller hitbox (0.5 width, 1.3 height)
        
        // Store original position for proper centering
        this.originalX = x;
        this.originalY = y;
        
        // Center the hitbox on the player sprite
        this.centerHitbox();
        
        this.velocity = new Vec(0.0, 0.0);
        this.gems = 0;
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.isDead = false;

        this.isFacingRight = true;
        this.isJumping = false;
        this.isCrouching = false;
        this.wasSpacePressed = false; // Track space key for responsive jumping
        this.lastFireTime = -Infinity;
        this.fireCooldown = 10000; // 10 seconds in milliseconds
        this.exitingLadder = false;
        this.isOnLadder = false; // Initialize isOnLadder

        // Horizontal hitbox: narrower than the player's main hitbox, defined in Level constructor
        this.horizontalHitbox = null; // Initialize to null

        // Mage animation system
        this.currentAnimation = 'idle';
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 150; // milliseconds per frame
        this.isAttacking = false;
        this.isHurt = false;
        this.hurtTimer = 0;
        this.hurtDuration = 500; // 500ms hurt animation
        
        // Attack timing variables
        this.attackStartTime = 0;
        this.fireballDelay = 100; // 0.1 seconds in milliseconds
        this.fireballFired = false;

        // Load all mage sprites
        this.sprites = {
            idle: [],
            walk: [],
            jump: [],
            attack: [],
            climb: [],
            hurt: []
        };

        this.loadMageSprites();

        // Animation frame counts
        this.animationFrames = {
            idle: 14,
            walk: 6,
            jump: 7, // Updated to use all 7 jump frames
            attack: 7,
            climb: 4,
            hurt: 4 // Updated to use all 4 hurt frames
        };
    }

    loadMageSprites() {
        // Load idle animation (14 frames)
        for (let i = 1; i <= 14; i++) {
            const img = new Image();
            img.src = `../assets/figure/Mage/Idle/idle${i}.png`;
            this.sprites.idle.push(img);
        }

        // Load walk animation (6 frames)
        for (let i = 1; i <= 6; i++) {
            const img = new Image();
            img.src = `../assets/figure/Mage/Walk/walk${i}.png`;
            this.sprites.walk.push(img);
        }

        // Load jump animation (7 frames)
        for (let i = 1; i <= 7; i++) {
            const img = new Image();
            img.src = `../assets/figure/Mage/Jump/jump${i}.png`;
            this.sprites.jump.push(img);
        }

        // Load attack animation (7 frames)
        for (let i = 1; i <= 7; i++) {
            const img = new Image();
            img.src = `../assets/figure/Mage/Attack/attack${i}.png`;
            this.sprites.attack.push(img);
        }

        // Load climb animation (4 frames)
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            img.src = `../assets/figure/Mage/Climb/climb${i}.png`;
            this.sprites.climb.push(img);
        }

        // Load hurt animation (4 frames)
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            img.src = `../assets/figure/Mage/Hurt/hurt${i}.png`;
            this.sprites.hurt.push(img);
        }
    }

    // Method to center the hitbox
    centerHitbox() {
        // Center the smaller hitbox on the visual sprite
        const xOffset = (1 - this.size.x) / 2;
        const yOffset = (1 - this.size.y) / 2;
        this.position = new Vec(this.originalX + xOffset, this.originalY + yOffset);
    }

    setMageAnimation(animationType) {
        if (this.currentAnimation !== animationType) {
            this.currentAnimation = animationType;
            // Start attack animation with frame 2 (attack3.png)
            this.animationFrame = animationType === 'attack' ? 2 : 0;
            this.animationTimer = 0;
        }
    }

    updateMageAnimation(deltaTime) {
        this.animationTimer += deltaTime;
        
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            
            const maxFrames = this.animationFrames[this.currentAnimation];
            
            if (this.currentAnimation === 'attack' && this.isAttacking) {
                this.animationFrame++;
                if (this.animationFrame >= maxFrames) {
                    this.isAttacking = false;
                    this.animationFrame = 0;
                    // Return to appropriate animation after attack
                    if (this.velocity.x !== 0) {
                        this.setMageAnimation('walk');
                    } else {
                        this.setMageAnimation('idle');
                    }
                }
            } else if (this.currentAnimation === 'hurt' && this.isHurt) {
                // Hurt animation doesn't loop, just stays on frame 0
                // The hurt state is controlled by hurtTimer
            } else {
                // Normal looping animations
                this.animationFrame = (this.animationFrame + 1) % maxFrames;
            }
        }
    }

    update(level, deltaTime) {
        if (this.isDead) return;

        // Handle delayed fireball creation during attack
        if (this.isAttacking && !this.fireballFired) {
            const now = performance.now();
            if (now - this.attackStartTime >= this.fireballDelay) {
                // Create fireball after delay
                const fireX = this.position.x + (this.isFacingRight ? this.size.x : -0.5);
                const fireY = this.position.y + (this.size.y * 0.3); // Lower position, about chest level
                const direction = this.isFacingRight ? 1 : -1;
                const fireball = new Fireball(fireX, fireY, direction);
                game.actors.push(fireball);
                this.fireballFired = true;
            }
        }

        // Update hurt state
        if (this.isHurt) {
            this.hurtTimer -= deltaTime;
            if (this.hurtTimer <= 0) {
                this.isHurt = false;
                // Return to appropriate animation
                if (this.velocity.x !== 0) {
                    this.setMageAnimation('walk');
                } else {
                    this.setMageAnimation('idle');
                }
            }
        }

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // Handle jumping - only allow jump when on ground
        if (keyState[" "] && !this.wasSpacePressed && this.isOnGround(level)) {
            this.velocity.y = initialJumpSpeed;
            this.isJumping = true;
            if (!this.isHurt && !this.isAttacking) {
                this.setMageAnimation('jump');
            }
        }
        this.wasSpacePressed = keyState[" "];

        // Simplified ladder system: activate when touching ladder AND pressing W or S
        let wasOnLadder = this.isOnLadder;
        let bottomOnLadder = this.isBottomOnLadder(level);
        
        // Enter ladder mode if touching ladder AND pressing W or S
        if (bottomOnLadder && (keyState["w"] || keyState["s"]) && !this.isOnLadder) {
            this.isOnLadder = true;
            // Center player on ladder when entering
            const ladderX = Math.floor(this.position.x) + 0.5; // Center of the ladder cell
            this.position.x = ladderX - (this.size.x / 2); // Adjust for player width
        }
        
        // Exit ladder mode only if no longer touching ladder with bottom
        if (this.isOnLadder && !bottomOnLadder) {
            this.isOnLadder = false;
        }

        // Apply gravity or ladder movement
        if (!this.isOnLadder) {
            this.velocity.y += gravity * deltaTime;
        } else {
            // On ladder: vertical movement is controlled by keys
            this.velocity.y = 0;
            if (keyState["w"]) {
                // Check if there's a wall directly above before moving up
                let upwardPosition = this.position.plus(new Vec(0, -0.1));
                if (!level.contact(upwardPosition, this.size, 'wall')) {
                    this.velocity.y = -0.008;
                    // Keep player centered on ladder while moving up
                    const ladderX = Math.floor(this.position.x) + 0.5;
                    this.position.x = ladderX - (this.size.x / 2);
                    if (!this.isHurt && !this.isAttacking) {
                        this.setMageAnimation('climb');
                    }
                }
            } else if (keyState["s"]) {
                // Check if there's a wall directly below before moving down
                let downwardPosition = this.position.plus(new Vec(0, 0.1));
                if (!level.contact(downwardPosition, this.size, 'wall')) {
                    this.velocity.y = 0.008;
                    if (!this.isHurt && !this.isAttacking) {
                        this.setMageAnimation('climb');
                    }
                }
            } else if (this.isOnLadder && !this.isHurt && !this.isAttacking) {
                // Idle on ladder
                this.setMageAnimation('idle');
            }
        }
    
        let velX = this.velocity.x;
        let velY = this.velocity.y;
    
        // --- Horizontal movement ---
        let newXPosition = this.position.plus(new Vec(velX * deltaTime, 0));
        
        // Always check for horizontal wall collision, even on ladder
        let horizontalCollision = false;
        if (this.horizontalHitbox) {
            let hitboxX = newXPosition.plus(this.horizontalHitbox.offset);
            horizontalCollision = level.contact(hitboxX, this.horizontalHitbox.size, 'wall');
        } else {
            horizontalCollision = level.contact(newXPosition, this.size, 'wall');
        }

        if (!horizontalCollision) {
            this.position = newXPosition;
        }
    
        // --- Vertical movement ---
        let newYPosition = this.position.plus(new Vec(0, velY * deltaTime));

        // When on ladder, only check for ceiling/floor collisions, not walls
        if (this.isOnLadder) {
            // Check for ceiling/floor collisions using main hitbox
            let verticalCollision = level.contact(newYPosition, this.size, 'wall');
            if (!verticalCollision) {
                this.position = newYPosition;
            } else {
                this.velocity.y = 0;
            }
        } else {
            // Normal collision check when not on ladder
            // Check for both walls and ladders as solid surfaces
            if (level.contact(newYPosition, this.size, 'wall') || 
                (level.contact(newYPosition, this.size, 'ladder') && velY > 0)) {
                this.velocity.y = 0;
                if (velY > 0) {
                    this.land();
                }
            } else {
                this.position = newYPosition;
            }
        }

        // Reset isJumping if player is on ground and has no upward velocity
        if (this.isJumping && this.isOnGround(level) && this.velocity.y >= 0) {
            this.isJumping = false;
        }

        // Update animation state based on movement
        if (!this.isHurt && !this.isAttacking) {
            if (this.isJumping) {
                this.setMageAnimation('jump');
            } else if (this.velocity.x !== 0 && !this.isOnLadder) {
                this.setMageAnimation('walk');
            } else if (!this.isOnLadder) {
                this.setMageAnimation('idle');
            }
        }
    
        this.updateMageAnimation(deltaTime);
    }

    startMovement(direction) {
        this.isFacingRight = direction == "right";
        if (!this.isCrouching && !this.isAttacking) {
            this.velocity.x = (direction === "right" ? 1 : -1) * walkSpeed;
            if (!this.isHurt && !this.isJumping && !this.isOnLadder) {
                this.setMageAnimation('walk');
            }
        }
    }

    stopMovement(direction) {
        this.velocity.x = 0;
        if (!this.isHurt && !this.isAttacking && !this.isJumping && !this.isOnLadder) {
            this.setMageAnimation('idle');
        }
    }

    crouch() {
        this.isCrouching = true;
        this.velocity.x = 0;
        // Mage doesn't have crouch animation, use idle
        if (!this.isHurt && !this.isAttacking) {
            this.setMageAnimation('idle');
        }
    }

    standUp() {
        this.isCrouching = false;
        if (!this.isHurt && !this.isAttacking) {
            this.setMageAnimation('idle');
        }
    }

    // Method to check if player is on the ground
    isOnGround(level) {
        // Check if there's a wall or ladder directly below the player
        // Use a larger offset to account for floating point precision issues
        const testPosition = this.position.plus(new Vec(0, 0.05)); // Increased from 0.01 to 0.05
        return level.contact(testPosition, this.size, 'wall') || level.contact(testPosition, this.size, 'ladder');
    }

    // Method to check if only the bottom part of the player is touching a ladder
    isBottomOnLadder(level) {
        // Check a larger portion of the player hitbox for ladder contact (bottom 60%)
        // Also extend slightly below to catch ladders when standing on top
        const bottomHeight = this.size.y * 0.6; // Bottom 60% of the player (increased from 50%)
        const bottomPosition = new Vec(this.position.x, this.position.y + this.size.y - bottomHeight);
        const bottomSize = new Vec(this.size.x, bottomHeight + 0.1); // Extend slightly below
        return level.contact(bottomPosition, bottomSize, 'ladder');
    }

    land() {
        // If the character is touching the ground,
        // there is no vertical velocity
        this.velocity.y = 0;
        if (this.isJumping) {
            // Reset the jump variable
            this.isJumping = false;
            // Return to appropriate animation
            if (!this.isHurt && !this.isAttacking) {
                if (this.velocity.x !== 0) {
                    this.setMageAnimation('walk');
                } else {
                    this.setMageAnimation('idle');
                }
            }
        }
    }

    fireFireball() {
        const now = performance.now();
        if (now - this.lastFireTime >= this.fireCooldown) {
            // Start attack animation immediately
            this.isAttacking = true;
            this.setMageAnimation('attack');
            this.attackStartTime = now;
            this.fireballFired = false;
            this.lastFireTime = now;
        }
    }

    draw(ctx, scale) {
        // Get current sprite
        const currentSprites = this.sprites[this.currentAnimation];
        if (!currentSprites || currentSprites.length === 0) return;
        
        const currentSprite = currentSprites[this.animationFrame];
        if (!currentSprite || !currentSprite.complete) return;

        // Calculate sprite size (adjust scale for better fit)
        const spriteScale = 2.5; // Increased from 2.0 to make sprite bigger
        const spriteWidth = this.size.x * scale * spriteScale * 1.4; // Made 30% wider (increased from 1.15)
        const spriteHeight = this.size.y * scale * spriteScale * 1.05;
        
        // Center the sprite on the hitbox with adjustments for mage sprite padding
        const hitboxCenterX = (this.position.x + this.size.x / 2) * scale;
        const hitboxCenterY = (this.position.y + this.size.y / 2) * scale;
        
        // Add offsets to account for mage sprite internal padding
        const verticalOffset = -15; // Increased from -5 to move sprite up so feet align with hitbox bottom
        const horizontalOffset = 5; // Move sprite slightly to the right (reduced from 8)
        
        const drawX = hitboxCenterX - spriteWidth / 2 + horizontalOffset;
        const drawY = hitboxCenterY - spriteHeight / 2 + verticalOffset;

        ctx.save();
        
        // Flip horizontally if facing left
        if (!this.isFacingRight) {
            ctx.scale(-1, 1);
            // When flipped, we need to adjust the horizontal offset
            const flippedDrawX = hitboxCenterX - spriteWidth / 2 - horizontalOffset;
            ctx.drawImage(
                currentSprite,
                -(flippedDrawX + spriteWidth), drawY,
                spriteWidth, spriteHeight
            );
        } else {
            ctx.drawImage(
                currentSprite,
                drawX, drawY,
                spriteWidth, spriteHeight
            );
        }
        
        ctx.restore();
    }

    // Add method to handle losing a life
    loseLife() {
        if (!this.invulnerable && !this.isDead) {
            this.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 2000; // 2 seconds of invulnerability (changed from 1500)
            
            // Trigger hurt animation
            this.isHurt = true;
            this.hurtTimer = this.hurtDuration;
            this.setMageAnimation('hurt');
            
            if (this.lives <= 0) {
                this.die();
            }
        }
    }

    die() {
        this.isDead = true;
        this.velocity = new Vec(0, 0);
        this.stopMovement("left");
        this.stopMovement("right");
        this.isJumping = false;
        this.isCrouching = false;
        this.isOnLadder = false;
    }
}

class Portal extends AnimatedObject {
    constructor(x, y) {
        super("purple", 1.5, 1.5, x, y, "portal"); // Increased hitbox from 1x1 to 1.5x1.5
        
        // Set up sprite animation for the dimensional portal (32x32 sprite sheet)
        this.setSprite('../assets/figure/Portal/Dimensional_Portal.png', new Rect(0, 0, 32, 32));
        this.sheetCols = 3; // 3 columns as specified
        
        // Start portal animation - 6 frames total (3 columns x 2 rows)
        this.setAnimation(0, 5, true, 200); // Frames 0-5, looping, 200ms per frame
    }

    update(level, deltaTime) {
        // Update animation frame
        this.updateFrame(deltaTime);
    }

    draw(ctx, scale) {
        // Draw the animated portal sprite
        if (this.spriteImage && this.spriteRect) {
            const spriteScale = 3.0; // Increased from 2.0 to 3.0 for bigger animation
            const offsetX = (this.size.x * (spriteScale - 1)) / 2; // Center the larger sprite horizontally
            const offsetY = (this.size.y * (spriteScale - 1)) / 2 + this.size.y * 1.5; // Move sprite much higher above the platform
            
            ctx.drawImage(this.spriteImage,
                          this.spriteRect.x * this.spriteRect.width,
                          this.spriteRect.y * this.spriteRect.height,
                          this.spriteRect.width, this.spriteRect.height,
                          (this.position.x - offsetX) * scale, 
                          (this.position.y - offsetY) * scale, // Adjusted Y position to be well above platform
                          this.size.x * scale * spriteScale, 
                          this.size.y * scale * spriteScale);
        } else {
            // Fallback to purple rectangle if sprite isn't loaded
            ctx.fillStyle = this.color; 
            ctx.fillRect(
                this.position.x * scale,
                this.position.y * scale,
                this.size.x * scale,
                this.size.y * scale
            );
        }
    }
}

class Level {
    constructor(plan) {
        let rows = plan.trim().split('\n').map(l => [...l]);
        this.height = rows.length;
        this.width = rows[0].length;
        this.actors = [];

        let rnd = Math.random();

        this.rows = rows.map((row, y) => {
            return row.map((ch, x) => {
                let item = levelChars[ch];
                if (!item) return "empty";

                let cellType = item.label;

                if (item.label === "ladder") {
                    let ladder = new Ladder("#8B4513", 1, 1, x, y, "ladder");
                    this.actors.push(ladder);
                    return "ladder";
                }

                let color = item.label === "ladder" ? "#8B4513" : "transparent";

                if (item.label === "enemy") {
                    this.actors.push(new Enemy("blue", 1, 1, x, y, "enemy"));
                    return "empty";
                }

                if (item.label === "minotaur") {
                    this.actors.push(new Minotaur("red", 1, 1, x, y, "minotaur"));
                    return "empty";
                }

                if (item.label === "barrel"){
                    this.actors.push(new Barrel("brown", 1, 1, x, y, "barrel"));
                    return "empty"
                }

                if (item.label === "portal"){
                    let portal = new Portal(x, y);
                    this.actors.push(portal);
                    return "empty"; 
                }

                if (item.label === "spawner"){
                    let spawner = new BarrelSpawner (x,y);
                    this.actors.push(spawner);
                    return "empty";
                }

                let actor = new item.objClass(color, 1, 1, x, y, item.label);

                if (actor.type === "player") {
                    this.addBackgroundFloor(x, y);
                    
                    // Set the final hitbox size first
                    actor.size = new Vec(0.7, 1.5);
                    
                    // Calculate proper position so bottom of hitbox aligns with ground
                    // The original position (x, y) represents the top-left of the grid cell
                    // We want the bottom of the player hitbox to be at y + 1 (bottom of the cell)
                    const targetBottomY = y + 1;  // Bottom of the grid cell
                    const newY = targetBottomY - actor.size.y;  // Top of hitbox
                    
                    // Center horizontally in the cell
                    const newX = x + (1 - actor.size.x) / 2;
                    
                    actor.position = new Vec(newX, newY);

                    // No need for sprite configuration - mage sprites are loaded in Player class
                    this.player = actor;
                    cellType = "empty";
                } else if (actor.type === "gem") {
                    this.addBackgroundFloor(x, y);
                    let gemActor = new Gem(x, y);
                    this.actors.push(gemActor);
                    cellType = "empty";
                } else if (actor.type === "wall") {
                    let instanceRect = this.randomEvironment(rnd);
                    actor.setSprite(item.sprite, instanceRect);
                    const originalDraw = actor.draw;
                    actor.draw = function(ctx, scale) {
                        originalDraw.call(this, ctx, scale);
                    };
                    this.actors.push(actor);
                    cellType = "wall";
                } else if (actor.type === "empty") {
                    this.actors.push(actor);
                    cellType = "floor";
                }
                 // Ensure other object types (like Portal) are added if their objClass was created
                else if (actor.type !== "player") {
                     this.actors.push(actor);
                 }
                return cellType;
            });
        });
    }

    addBackgroundFloor(x, y) {
        let floor = levelChars['.'];
        let floorActor = new GameObject("transparent", 1, 1, x, y, floor.label);
        //let instanceRect = new Rect(item.rectParams);
        //floorActor.setSprite(floor.sprite, instanceRect);
        this.actors.push(floorActor);
    }

    randomTile(xStart, xRange, y) {
        let tile = Math.floor(Math.random() * xRange + xStart);
        return new Rect(tile, y, 32, 32);
    }

    randomEvironment(rnd) {
        let rect;
        if (rnd < 0.33) {
            rect = this.randomTile(1, 10, 6);    // yellow marble
        } else if (rnd < 0.66) {
            rect = this.randomTile(1, 12, 16);     // green marble with carvings
        } else {
            rect = this.randomTile(21, 12, 16);  // brown and yellow pebbles
        }
        return rect;
    }

    // Detect when the player touches a wall
    contact(playerPos, playerSize, type) {
        // Determine which cells the player is occupying
        let xStart = Math.floor(playerPos.x);
        let xEnd = Math.ceil(playerPos.x + playerSize.x);
        let yStart = Math.floor(playerPos.y);
        let yEnd = Math.ceil(playerPos.y + playerSize.y);

        // Check each of those cells
        for (let y=yStart; y<yEnd; y++) {
            for (let x=xStart; x<xEnd; x++) {
                // Anything outside of the bounds of the canvas is considered
                // to be a wall, so it blocks the player's movement
                let isOutside = x < 0 || x >= this.width ||
                                y < 0 || y >= this.height;
                let here = isOutside ? 'wall' : this.rows[y][x];
                // Detect if an object of type specified is being touched
                if (here == type) {
                    return true;
                }
            }
        }
        return false;
    }
}



const levelChars = {
    ".": { objClass: GameObject,
           label: "empty",
           sprite: '../assets/assets_platform/sprites/ProjectUtumno_full.png',
           rectParams: [12, 17, 32, 32] },
   "#": {
        objClass: GameObject,
        label: "wall",
        sprite: '../assets/assets_platform/sprites/ProjectUtumno_full.png',
        rectParams: [1, 6, 32, 32] 
                                    },
    "@": { objClass: Player,
           label: "player" },
    "$": { objClass: Gem,
       label: "collectible",
       sprite: '../assets/Items/Gems/Gem Animations/gem_animation.png',
       rectParams: [0, 0, 32, 32], // 
       sheetCols: 4,
       startFrame: [0, 3]
                            },
    "L": { 
        objClass: Ladder,
        label: "ladder",
        sprite: null, 
        rectParams: [0, 0, 32, 32]  },
    "E": {
        objClass: Enemy,
        label: "enemy",
        sprite: null },
    "M": {
        objClass: Minotaur,
        label: "minotaur",
        sprite: null },
    "B": {
        objClass: Barrel,
        label: "barrel",
        sprite: null },
    "S": {
        objClass: BarrelSpawner,
        label: "spawner",
        sprite: null
    },
    "P": {
        objClass: Portal,
        label: "portal",
        sprite: null
    }
}




class Game {
    constructor(state, level, levelNumber = 1) {
        this.state = state;
        this.level = level;
        this.player = level.player;
        this.actors = [...level.actors];
        this.gameOver = false;
        this.gameWon = false;
        this.currentLevel = levelNumber; // Track current level
        this.totalLevels = 3; // Updated to 3 total levels
        
        // Transition state properties
        this.isTransitioning = false;
        this.transitionTimer = 0;
        this.transitionDuration = 3000; // 3 seconds
        this.nextLevelNumber = null;
        
        // Load transition images
        this.transitionImages = {};
        this.transitionImagesLoaded = {};
        
        // Load level 2 transition image
        this.transitionImages[2] = new Image();
        this.transitionImagesLoaded[2] = false;
        this.transitionImages[2].src = '../assets/figure/Transition/level2transition.png';
        this.transitionImages[2].onload = () => {
            console.log("Level 2 transition image loaded successfully!");
            this.transitionImagesLoaded[2] = true;
        };
        this.transitionImages[2].onerror = () => {
            console.error("Failed to load level 2 transition image");
        };
        
        // Load level 3 transition image
        this.transitionImages[3] = new Image();
        this.transitionImagesLoaded[3] = false;
        this.transitionImages[3].src = '../assets/figure/Transition/level3transition.png';
        this.transitionImages[3].onload = () => {
            console.log("Level 3 transition image loaded successfully!");
            this.transitionImagesLoaded[3] = true;
        };
        this.transitionImages[3].onerror = () => {
            console.error("Failed to load level 3 transition image");
        };

        // Load level background image based on level number
        this.backgroundImage = new Image();
        this.backgroundLoaded = false;
        
        if (levelNumber === 1) {
            this.backgroundImage.src = '../assets/Map1.jpg';
        } else if (levelNumber === 2) {
            this.backgroundImage.src = '../assets/stages/Map-2/map-2.png';
        } else if (levelNumber === 3) {
            this.backgroundImage.src = '../assets/stages/Map-3/map_3.png';
        }
        
        
        this.backgroundImage.onload = () => {
            //console.log("Image dimensions:", this.backgroundImage.width, "x", this.backgroundImage.height);
            this.backgroundLoaded = true;
        };
        
        this.backgroundImage.onerror = (e) => {
            console.error(`Failed to load level ${levelNumber} background image. Please check the browser console for details.`);
        };

        // Load UI sprites
        this.heartSprite = new Image();
        this.heartSprite.src = '../assets/Items/Heart/heart.png';
        
        // Add gem UI sprite
        this.gemUISprite = new Image();
        this.gemUISprite.src = '../assets/Items/Gems/Gem_UI/gem.png';
        
        this.labelGems = new TextLabel(80, 30, "30px Arial", "black");

        console.log(`############ LEVEL ${levelNumber} START ###################`);
    }

    update(deltaTime) {
        if (this.gameOver || this.gameWon) return;

        // Handle level transition
        if (this.isTransitioning) {
            this.transitionTimer += deltaTime;
            if (this.transitionTimer >= this.transitionDuration) {
                // Transition complete, load next level
                this.completeTransition();
            }
            return; // Don't update game during transition
        }

        this.player.update(this.level, deltaTime);

        // Update all actors
        for (let actor of this.actors) {
            if (actor.type === 'minotaur') {
                actor.update(this.level, deltaTime, this.player);
            } else if (actor.type === 'barrel' && actor.position.y > this.level.height - 2){
                this.actors = this.actors.filter(item => item !== actor);
            }else{
                actor.update(this.level, deltaTime);
            }
        }

        // Handle collisions
        for (let actor of this.actors) {
            if (actor.type !== 'empty' && this.checkCollision(this.player, actor)) {
                if (actor.type === 'collectible' || actor.type === 'gem') {
                    this.player.gems += 1;
                    this.actors = this.actors.filter(item => item !== actor);
                } else if (actor.type === 'enemy' || actor.type === 'barrel' || actor.type === 'minotaur') {
                    this.player.loseLife();
                    // Optional: push player away from enemy
                    const pushDirection = this.player.position.x < actor.position.x ? -1 : 1;
                    this.player.position = this.player.position.plus(new Vec(pushDirection * 0.5, -0.5));
                    
                    // Check for game over
                    if (this.player.lives <= 0) {
                        this.gameOver = true;
                    }
                } else if (actor.type === 'portal') {
                    // Check if this is the last level
                    if (this.currentLevel >= this.totalLevels) {
                        // Final level completed - end the game
                        this.gameWon = true;
                    } else {
                        // Start transition to next level
                        this.startTransition();
                    }
                }
            }
        }

        // Update camera to follow player upward only
        const targetY = this.player.position.y * scale - canvasHeight * (2 / 3);
        cameraY += (targetY - cameraY) * 0.1; // smooth follow
    }

    // Add collision detection method
    checkCollision(obj1, obj2) {
        return obj1.position.x < obj2.position.x + obj2.size.x &&
               obj1.position.x + obj1.size.x > obj2.position.x &&
               obj1.position.y < obj2.position.y + obj2.size.y &&
               obj1.position.y + obj1.size.y > obj2.position.y;
    }

    // Method to start level transition
    startTransition() {
        this.isTransitioning = true;
        this.transitionTimer = 0;
        this.nextLevelNumber = this.currentLevel + 1;
    }

    // Method to complete the transition and load next level
    completeTransition() {
        
        // Reset camera position
        cameraY = 0;
        
        // Create new level
        const nextLevel = new Level(GAME_LEVELS[this.nextLevelNumber - 1]);
        
        // Preserve player stats but reset position and state
        const playerGems = this.player.gems;
        const playerLives = this.player.lives;
        
        // Create new game instance for next level
        game = new Game('playing', nextLevel, this.nextLevelNumber);
        
        // Restore player stats
        game.player.gems = playerGems;
        game.player.lives = playerLives;
        
        console.log(`Level ${this.nextLevelNumber} loaded with ${playerGems} gems and ${playerLives} lives`);
    }

    // Method to advance to the next level (kept for compatibility, now just calls startTransition)
    advanceToNextLevel() {
        this.startTransition();
    }

    draw(ctx, scale) {
        // Handle transition screen
        if (this.isTransitioning) {
            // Draw black background
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Calculate fade effect
            const fadeInDuration = 500; // 0.5 seconds to fade in
            const fadeOutDuration = 500; // 0.5 seconds to fade out
            const holdDuration = this.transitionDuration - fadeInDuration - fadeOutDuration; // Time to hold at full opacity
            
            let opacity = 1;
            
            if (this.transitionTimer < fadeInDuration) {
                // Fade in phase
                opacity = this.transitionTimer / fadeInDuration;
            } else if (this.transitionTimer > fadeInDuration + holdDuration) {
                // Fade out phase
                const fadeOutProgress = this.transitionTimer - (fadeInDuration + holdDuration);
                opacity = 1 - (fadeOutProgress / fadeOutDuration);
            } else {
                // Hold phase - full opacity
                opacity = 1;
            }
            
            // Ensure opacity stays within bounds
            opacity = Math.max(0, Math.min(1, opacity));
            
            // Draw transition image if loaded
            if (this.transitionImagesLoaded[this.nextLevelNumber] && this.transitionImages[this.nextLevelNumber].complete) {
                // Calculate position to center the image
                const imageWidth = this.transitionImages[this.nextLevelNumber].width;
                const imageHeight = this.transitionImages[this.nextLevelNumber].height;
                
                // Scale the image to fit nicely on screen (max 80% of canvas size)
                const maxWidth = canvasWidth * 0.8;
                const maxHeight = canvasHeight * 0.8;
                
                let displayWidth = imageWidth;
                let displayHeight = imageHeight;
                
                // Scale down if image is too large
                if (imageWidth > maxWidth || imageHeight > maxHeight) {
                    const scaleRatio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
                    displayWidth = imageWidth * scaleRatio;
                    displayHeight = imageHeight * scaleRatio;
                }
                
                // Center the image
                const x = (canvasWidth - displayWidth) / 2;
                const y = (canvasHeight - displayHeight) / 2;
                
                // Apply opacity
                ctx.save();
                ctx.globalAlpha = opacity;
                
                ctx.drawImage(
                    this.transitionImages[this.nextLevelNumber],
                    x, y,
                    displayWidth, displayHeight
                );
                
                ctx.restore();
            } else {
                // Fallback text if image isn't loaded
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 48px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(`Entering Level ${this.nextLevelNumber}`, canvasWidth / 2, canvasHeight / 2);
                ctx.restore();
            }
            
            return; // Don't draw game elements during transition
        }

        ctx.save();
        
        // Apply camera translation for game elements
        ctx.translate(0, -cameraY);

        // First draw background and non-interactive elements
        for (let actor of this.actors) {
            if (actor.type === 'empty' || actor.type === 'wall' || actor.type === 'ladder') {
                actor.draw(ctx, scale);
            }
        }

        // Then draw interactive elements and enemies
        for (let actor of this.actors) {
            if (actor.type !== 'empty' && actor.type !== 'wall' && actor.type !== 'ladder') {
                actor.draw(ctx, scale);
            }
        }

        // Draw player (flashing when invulnerable)
        if (!this.player.invulnerable || Math.floor(Date.now() / 100) % 2) {
            this.player.draw(ctx, scale);
        }

        ctx.restore();

        // Draw UI elements with improved styling
        // ======================================
        
        // Draw gem icon - moved down and made bigger
        if (this.gemUISprite && this.gemUISprite.complete) {
            ctx.drawImage(
                this.gemUISprite, 
                20,         // X position
                30,         // Y position
                60,         // Width (increased from 40)
                60          // Height (increased from 40)
            );
        }
        
        // Draw gem counter with improved styling
        ctx.font = "bold 32px 'Arial Rounded MT Bold', 'Arial Black', sans-serif"; // Increased font size
        ctx.fillStyle = "#FFD700"; // Gold color
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        
        // Add text shadow for better visibility
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Position text centered vertically with the gem icon
        ctx.fillText(
            `${this.player.gems}`, 
            90,  // X position (adjusted for bigger gem icon)
            60   // Y position (centered with the new gem icon position)
        );
        
        // Reset shadow for other elements
        ctx.shadowColor = "transparent";
        
        // Draw hearts based on player's lives - moved down and made bigger
        for (let i = 0; i < this.player.lives; i++) {
            ctx.drawImage(
                this.heartSprite, 
                20 + i * 70, // X position (hearts are 70px apart, increased spacing)
                120,        // Y position (moved down from 80 to 120 to add more space)
                60,         // Width
                60          // Height
            );
        }

        // Draw fireball cooldown indicator - moved down and made bigger
        const now = performance.now();
        const timeSinceLastFire = now - this.player.lastFireTime;
        const cooldownProgress = Math.min(timeSinceLastFire / this.player.fireCooldown, 1);
        const isReady = cooldownProgress >= 1;

        // Fireball icon background
        ctx.fillStyle = isReady ? "rgba(255, 100, 0, 0.8)" : "rgba(100, 100, 100, 0.5)";
        ctx.fillRect(20, 200, 60, 60); // Moved down and made bigger (from 40x40 to 60x60)

        // Fireball icon
        ctx.fillStyle = isReady ? "orange" : "gray";
        ctx.fillRect(24, 204, 52, 52); // Adjusted for bigger size
        ctx.fillStyle = isReady ? "red" : "darkgray";
        ctx.fillRect(32, 212, 36, 36); // Adjusted for bigger size

        // Cooldown progress bar
        if (!isReady) {
            // Background bar
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.fillRect(20, 265, 60, 10); // Moved down and made wider
            
            // Progress bar
            ctx.fillStyle = "orange";
            ctx.fillRect(20, 265, 60 * cooldownProgress, 10); // Adjusted for new size
        }

        // Fireball ready text
        if (isReady) {
            ctx.font = "bold 16px Arial"; // Bigger font
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText("E", 50, 280); // Adjusted position
        } else {
            // Show remaining time
            const remainingTime = Math.ceil((this.player.fireCooldown - timeSinceLastFire) / 1000);
            ctx.font = "bold 16px Arial"; // Bigger font
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(remainingTime + "s", 50, 280); // Adjusted position
        }

        // Draw game over screen
        if (this.gameOver) {
            ctx.save();
            // Semi-transparent black background
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Game over text
            ctx.font = "bold 48px 'Arial Rounded MT Bold', 'Arial Black', sans-serif";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GAME OVER", canvasWidth / 2, canvasHeight / 2 - 50);

            // Score text
            ctx.font = "bold 32px 'Arial Rounded MT Bold', 'Arial Black', sans-serif";
            ctx.fillText(`Final Score: ${this.player.gems}`, canvasWidth / 2, canvasHeight / 2 + 20);

            // Restart instruction
            ctx.font = "24px Arial";
            ctx.fillText("Press R to Restart", canvasWidth / 2, canvasHeight / 2 + 80);
            ctx.restore();
        }

        if (this.gameWon) {
            ctx.save();
            ctx.fillStyle = "rgba(128, 0, 128, 0.7)";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.font = "bold 48px 'Arial Rounded MT Bold', 'Arial Black', sans-serif";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // Show different message based on whether this is the final level
            if (this.currentLevel >= this.totalLevels) {
                ctx.fillText("GAME COMPLETE!", canvasWidth / 2, canvasHeight / 2 - 50);
                ctx.font = "bold 32px 'Arial Rounded MT Bold', 'Arial Black', sans-serif";
                ctx.fillText(`Final Score: ${this.player.gems}`, canvasWidth / 2, canvasHeight / 2 + 20);
                ctx.font = "24px Arial";
                ctx.fillText("Press R to Play Again", canvasWidth / 2, canvasHeight / 2 + 80);
            } else {
                ctx.fillText("LEVEL COMPLETE!", canvasWidth / 2, canvasHeight / 2 - 50);
                ctx.font = "bold 32px 'Arial Rounded MT Bold', 'Arial Black', sans-serif";
                ctx.fillText(`Score: ${this.player.gems}`, canvasWidth / 2, canvasHeight / 2 + 20);
                ctx.font = "24px Arial";
                ctx.fillText("Entering Portal...", canvasWidth / 2, canvasHeight / 2 + 80);
            }
            
            ctx.restore();
        }
    }

}


function main() {
    window.onload = init;
}

function init() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('No se encontró el elemento canvas');
        return;
    }

    const container = canvas.parentElement;
    // Set a minimum canvas size to ensure UI elements are visible
    const minWidth = 800; // Reverted back to original
    const minHeight = 600;
    
    canvas.width = Math.max(container.clientWidth, minWidth);
    canvas.height = Math.max(container.clientHeight, minHeight);

    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('No se pudo obtener el contexto 2D del canvas');
        return;
    }

    // Resize handler: re-fit scale when window changes
    window.addEventListener('resize', () => {
        canvas.width = Math.max(container.clientWidth, minWidth);
        canvas.height = Math.max(container.clientHeight, minHeight);
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
    });

    gameStart();
}


function gameStart() {
    game = new Game('playing', new Level(GAME_LEVELS[0]), 1); // Start with level 1
    setEventListeners();
    updateCanvas(document.timeline.currentTime);
}

function setEventListeners() {
    // Remove existing event listeners to prevent duplicates
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    
    // Add new event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
}

function handleKeyDown(event) {
    keyState[event.key] = true;

    if (event.key == 'a') game.player.startMovement("left");
    if (event.key == 'd') game.player.startMovement("right");
    if (event.key == 's') game.player.crouch();
    if (event.key == 'e') game.player.fireFireball();
    if (event.key == ' ') {
        // Simplified jumping logic - allow jumping if not already jumping and velocity is low
        if (!game.player.isJumping && game.player.velocity.y >= -0.001) {
            game.player.velocity.y = initialJumpSpeed;
            game.player.isJumping = true;
            
            if (game.player.isOnLadder) {
                game.player.exitingLadder = true;
                game.player.isOnLadder = false;
            }
            
            if (!game.player.isHurt && !game.player.isAttacking) {
                game.player.setMageAnimation('jump');
            }
        }
    }
    
    // Restart game when R is pressed and game is over or won
    if (event.key == 'r' && (game.gameOver || game.gameWon)) {
        // Reset game state
        frameStart = undefined;
        cameraY = 0;
        // Create new game instance starting from level 1
        game = new Game('playing', new Level(GAME_LEVELS[0]), 1);
    }
}

function handleKeyUp(event) {
    keyState[event.key] = false;

    if (event.key == 'a') game.player.stopMovement("left");
    if (event.key == 'd') game.player.stopMovement("right");
    if (event.key == 's') game.player.standUp();
}

function updateCanvas(frameTime) {
    if (frameStart === undefined) {
        frameStart = frameTime;
    }
    let deltaTime = frameTime - frameStart;

    // Draw background image stretched to fill entire canvas
    if (game && game.backgroundLoaded && game.backgroundImage && game.backgroundImage.complete) {
        // Force the image to fill the entire canvas, stretching if necessary
        ctx.drawImage(
            game.backgroundImage,
            0, 0,                    // Source position
            game.backgroundImage.width, game.backgroundImage.height, // Source size (full image)
            0, 0,                    // Destination position
            canvasWidth, canvasHeight // Destination size (full canvas)
        );
    } else {
        // Only clear if no background image
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    
    if (game) {
        game.update(deltaTime);
        game.draw(ctx, scale);
    }

    frameStart = frameTime;
    requestAnimationFrame(updateCanvas);
}

main();


