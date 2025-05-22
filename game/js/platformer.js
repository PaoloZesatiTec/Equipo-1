/* Updated platformer.js to support vertical scrolling camera */

"use strict";

let canvasWidth = 700;
let canvasHeight = 700; // Taller canvas for vertical platformer
let ctx;
let frameStart;
let game;
let player;
let level;

let scale = 25;
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
        this.lives = 2;
        this.invulnerable = false;
        this.invulnerableTimer = 0;

        this.isFacingRight = true;
        this.isJumping = false;
        this.isCrouching = false;
        this.lastFireTime = -Infinity;
        this.fireCooldown = 10000; // 10 seconds in milliseconds
        this.exitingLadder = false;
        this.isOnLadder = false; // Initialize isOnLadder

        // Horizontal hitbox: narrower than the player's main hitbox, defined in Level constructor
        this.horizontalHitbox = null; // Initialize to null

        // Movement variables to define directions and animations
        this.movement = {
            right:  { status: false,
                      axis: "x",
                      sign: 1,
                      repeat: true,
                      duration: 80,
                      moveFrames: [24, 31],
                      idleFrames: [0, 0] },
            left:   { status: false,
                      axis: "x",
                      sign: -1,
                      repeat: true,
                      duration: 80,
                      moveFrames: [56, 63],
                      idleFrames: [32, 32] },
            jump:   { status: false,
                      repeat: false,
                      duration: 300,
                      right: [6, 7],
                      left: [38, 39] },
            crouch: { status: false,
                      repeat: false,
                      duration: 100,
                      right: [1, 1],
                      left: [33, 33],
                      upRight: [0, 0],
                      upLeft: [32, 32] },
        };
    }

    // Method to center the hitbox
    centerHitbox() {
        // Center the smaller hitbox on the visual sprite
        const xOffset = (1 - this.size.x) / 2;
        const yOffset = (1 - this.size.y) / 2;
        this.position = new Vec(this.originalX + xOffset, this.originalY + yOffset);
    }

    update(level, deltaTime) {
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // Check if the player is on a ladder using the entire player hitbox
        let wasOnLadder = this.isOnLadder;
        let ladderContact = level.contact(this.position, this.size, "ladder");

        // Update ladder state
        if (wasOnLadder && !ladderContact) {
            this.ladderCooldownTime = performance.now();
            this.isOnLadder = false;
        }

        if (ladderContact && (!this.ladderCooldownTime || performance.now() - this.ladderCooldownTime > 200)) {
            this.isOnLadder = true;
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
                }
            } else if (keyState["s"]) {
                // Check if there's a wall directly below before moving down
                let downwardPosition = this.position.plus(new Vec(0, 0.1));
                if (!level.contact(downwardPosition, this.size, 'wall')) {
                    this.velocity.y = 0.008;
                }
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
            if (level.contact(newYPosition, this.size, 'wall')) {
                this.velocity.y = 0;
                if (velY > 0) {
                    this.land();
                }
            } else {
                this.position = newYPosition;
            }
        }
    
        this.updateFrame(deltaTime);
    }
    

    startMovement(direction) {
        const dirData = this.movement[direction];
        this.isFacingRight = direction == "right";
        if (!dirData.status && !this.isCrouching) {
            dirData.status = true;
            this.velocity[dirData.axis] = dirData.sign * walkSpeed;
            this.setAnimation(...dirData.moveFrames, dirData.repeat, dirData.duration);
        }
    }

    stopMovement(direction) {
        const dirData = this.movement[direction];
        dirData.status = false;
        this.velocity[dirData.axis] = 0;
        this.setAnimation(...dirData.idleFrames, dirData.repeat, 100);
    }

    crouch() {
        this.isCrouching = true;
        this.velocity.x = 0;
        const crouchData = this.movement.crouch;
        if (this.isFacingRight) {
            this.setAnimation(...crouchData.right, crouchData.repeat, crouchData.duration);
        } else {
            this.setAnimation(...crouchData.left, crouchData.repeat, crouchData.duration);
        }
    }

    standUp () {
        this.isCrouching = false;
        const crouchData = this.movement.crouch;
        if (this.isFacingRight) {
            this.setAnimation(...crouchData.upRight, crouchData.repeat, crouchData.duration);
        } else {
            this.setAnimation(...crouchData.upLeft, crouchData.repeat, crouchData.duration);
        }
    }

    jump() {
        if (!this.isJumping || this.isOnLadder) {
            this.velocity.y = initialJumpSpeed;
            this.isJumping = true;
    
            if (this.isOnLadder) {
                this.exitingLadder = true;   // Signal we're jumping *off* the ladder
                this.isOnLadder = false;
            }
    
            const jumpData = this.movement.jump;
            if (this.isFacingRight) {
                this.setAnimation(...jumpData.right, jumpData.repeat, jumpData.duration);
            } else {
                this.setAnimation(...jumpData.left, jumpData.repeat, jumpData.duration);
            }
        }
    }
    
    

    land() {
        // If the character is touching the ground,
        // there is no vertical velocity
        this.velocity.y = 0;
        // Force the player to move down to touch the floor
        this.position.y = Math.ceil(this.position.y);
        if (this.isJumping) {
            // Reset the jump variable
            this.isJumping = false;
            const leftData = this.movement["left"];
            const rightData = this.movement["right"];
            // Continue the running animation if the player is moving
            if (leftData.status) {
                this.setAnimation(...leftData.moveFrames, leftData.repeat, leftData.duration);
            } else if (rightData.status) {
                this.setAnimation(...rightData.moveFrames, rightData.repeat, rightData.duration);
            // Otherwise switch to the idle animation
            } else {
                if (this.isFacingRight) {
                    this.setAnimation(0, 0, false, 100);
                } else {
                    this.setAnimation(32, 32, false, 100);
                }
            }
        }
    }
    fireFireball() {
        const now = performance.now();
        if (now - this.lastFireTime >= this.fireCooldown) {
            const fireX = this.position.x + (this.isFacingRight ? this.size.x : -0.5);
            const direction = this.isFacingRight ? 1 : -1;
            const fireball = new Fireball(fireX, this.position.y + this.size.y / 2, direction);
            game.actors.push(fireball);
            this.lastFireTime = now;
        }
    }

    draw(ctx, scale) {
        // Draw the player sprite first
        super.draw(ctx, scale);
        console.log(scale, "scale");
        
        // Draw hitbox outline for debugging
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            this.position.x * scale,
            this.position.y * scale,
            this.size.x * scale,
            this.size.y * scale
        );
        
        // Add center cross marker
        const centerX = (this.position.x + this.size.x/2) * scale;
        const centerY = (this.position.y + this.size.y/2) * scale;
        const crossSize = 10;
        
        ctx.beginPath();
        ctx.moveTo(centerX - crossSize, centerY);
        ctx.lineTo(centerX + crossSize, centerY);
        ctx.moveTo(centerX, centerY - crossSize);
        ctx.lineTo(centerX, centerY + crossSize);
        ctx.stroke();
    }

    // Add method to handle losing a life
    loseLife() {
        if (!this.invulnerable) {
            this.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 1500; // 1.5 seconds of invulnerability
            
            if (this.lives <= 0) {
                // Game over - reset player
                this.lives = 2;
                this.gems = 0;
                // Could add more reset logic here
            }
        }
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
           label: "player",
           sprite: '../assets/assets_platform/sprites/hero/redpants_left_right.png',
           rectParams: [0, 0, 46, 50],
           sheetCols: 8,
           startFrame: [0, 0] },
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
    "B": {
    objClass: Barrel,
    label: "barrel",
    sprite: null }
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

                let color = item.label === "ladder" ? "#8B4513" : "skyblue";

                if (item.label === "enemy") {
                    this.actors.push(new Enemy("blue", 1, 1, x, y, "enemy"));
                    return "empty";
                }

                if (item.label === "barrel"){
                    this.actors.push(new Barrel("brown", 1, 1, x, y, "barrel"));
                    return "empty"
                }

                let actor = new item.objClass(color, 1, 1, x, y, item.label);

                if (actor.type === "player") {
                    this.addBackgroundFloor(x, y);
                    actor.position = actor.position.plus(new Vec(0, -3));
                    actor.size = new Vec(0.8, 3);

                    let instanceRect = new Rect(...item.rectParams);
                    actor.setSprite(item.sprite, instanceRect);
                    actor.sheetCols = item.sheetCols;
                    actor.setAnimation(...item.startFrame, false, 100);
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
                        
                        // Add hitbox
                        ctx.save();
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(
                            this.position.x * scale,
                            this.position.y * scale,
                            this.size.x * scale,
                            this.size.y * scale
                        );
                        ctx.restore();
                    };
                    this.actors.push(actor);
                    cellType = "wall";
                } else if (actor.type === "empty") {
                    this.actors.push(actor);
                    cellType = "floor";
                }
                return cellType;
            });
        });
    }

    addBackgroundFloor(x, y) {
        let floor = levelChars['.'];
        let floorActor = new GameObject("skyblue", 1, 1, x, y, floor.label);
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


class Game {
    constructor(state, level) {
        this.state = state;
        this.level = level;
        this.player = level.player;
        this.actors = [...level.actors];

        // Load UI sprites
        this.heartSprite = new Image();
        this.heartSprite.src = '../assets/Items/Heart/heart.png';
        
        // Add gem UI sprite
        this.gemUISprite = new Image();
        this.gemUISprite.src = '../assets/Items/Gems/Gem_UI/gem.png';
        
        this.labelGems = new TextLabel(80, 30, "30px Arial", "black");

        console.log("############ LEVEL START ###################");
    }

    update(deltaTime) {
        this.player.update(this.level, deltaTime);

        // Update all actors
        for (let actor of this.actors) {
            actor.update(this.level, deltaTime);
        }

        // Handle collisions
        for (let actor of this.actors) {
            if (actor.type !== 'empty' && this.checkCollision(this.player, actor)) {
                if (actor.type === 'coin' || actor.type === 'gem') {
                    this.player.gems += 1;
                    this.actors = this.actors.filter(item => item !== actor);
                } else if (actor.type === 'enemy' || actor.type === 'barrel') {
                    this.player.loseLife();
                    // Optional: push player away from enemy
                    const pushDirection = this.player.position.x < actor.position.x ? -1 : 1;
                    this.player.position = this.player.position.plus(new Vec(pushDirection * 0.5, -0.5));
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

    draw(ctx, scale) {
        ctx.save();
        ctx.translate(0, -cameraY); // Apply vertical camera offset

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
        
        // Draw gem icon
        if (this.gemUISprite && this.gemUISprite.complete) {
            ctx.drawImage(
                this.gemUISprite, 
                20,         // X position
                20,         // Y position
                40,         // Width
                40          // Height
            );
        }
        
        // Draw gem counter with improved styling
        ctx.font = "bold 28px 'Arial Rounded MT Bold', 'Arial Black', sans-serif";
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
            75,  // X position (adjusted to be closer to gem)
            40   // Y position (centered with the gem icon)
        );
        
        // Reset shadow for other elements
        ctx.shadowColor = "transparent";
        
        // Draw hearts based on player's lives
        for (let i = 0; i < this.player.lives; i++) {
            ctx.drawImage(
                this.heartSprite, 
                20 + i * 50, // X position (hearts are 50px apart)
                80,         // Y position (moved down a bit to separate from gems)
                40,         // Width
                40          // Height
            );
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
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('No se pudo obtener el contexto 2D del canvas');
        return;
    }

    // Resize handler: re-fit scale when window changes
    window.addEventListener('resize', () => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;

    });

    gameStart();
}


function gameStart() {
    game = new Game('playing', new Level(GAME_LEVELS[0]));
    setEventListeners();
    updateCanvas(document.timeline.currentTime);
}

function setEventListeners() {
    window.addEventListener("keydown", event => {
        keyState[event.key] = true;
    
        if (event.code == 'Space') game.player.jump();
        if (event.key == 'a') game.player.startMovement("left");
        if (event.key == 'd') game.player.startMovement("right");
        if (event.key == 's') game.player.crouch();
        if (event.key == 'e') game.player.fireFireball();
        // No need to handle 'w' here unless you want animation feedback
    });
    
    window.addEventListener("keyup", event => {
        keyState[event.key] = false;
    
        if (event.key == 'a') game.player.stopMovement("left");
        if (event.key == 'd') game.player.stopMovement("right");
        if (event.key == 's') game.player.standUp();
    });
}



function updateCanvas(frameTime) {
    if (frameStart === undefined) {
        frameStart = frameTime;
    }
    let deltaTime = frameTime - frameStart;

    ctx.fillStyle = "#87CEEB"; // Sky blue or any background color you prefer
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    game.update(deltaTime);
    game.draw(ctx, scale);

    frameStart = frameTime;
    requestAnimationFrame(updateCanvas);
}

main();


