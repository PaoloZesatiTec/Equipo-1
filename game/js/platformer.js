/* Updated platformer.js to support vertical scrolling camera */

"use strict";

let canvasWidth = 800;
let canvasHeight = 600; // Taller canvas for vertical platformer
let ctx;
let frameStart;
let game;
let player;
let level;

let scale = 29;
const walkSpeed = 0.005;
const initialJumpSpeed = -0.02;
const gravity = 0.0000981;

let cameraY = 0; // New variable for vertical camera scrolling
let keyState = {}; // For climbing

class Player extends AnimatedObject {
    constructor(_color, width, height, x, y, _type) {
        super("green", width, height, x, y, "player");
        this.velocity = new Vec(0.0, 0.0);
        this.gems = 0;

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

    update(level, deltaTime) {
        // Check if the player is on a ladder
        let wasOnLadder = this.isOnLadder;
        let horizontalHitboxContactWithLadder = false;
        if (this.horizontalHitbox) {
            horizontalHitboxContactWithLadder = level.contact(this.position.plus(this.horizontalHitbox.offset), this.horizontalHitbox.size, "ladder");
        } else {
            horizontalHitboxContactWithLadder = level.contact(this.position, this.size, "ladder"); // Fallback
        }

        // If not in contact with a ladder, but were just on one, start cooldown
        if (wasOnLadder && !horizontalHitboxContactWithLadder) {
             this.ladderCooldownTime = performance.now();
             this.isOnLadder = false; // Set isOnLadder to false when leaving ladder contact
        }

        // Player is on ladder if horizontal hitbox is in contact AND not in cooldown
        if (horizontalHitboxContactWithLadder && (!this.ladderCooldownTime || performance.now() - this.ladderCooldownTime > 200)) {
             this.isOnLadder = true;
        }

        // Gravity only if not on ladder
        if (!this.isOnLadder) {
            this.velocity.y += gravity * deltaTime;
        } else {
            // On ladder: vertical movement is controlled by keys
            this.velocity.y = 0;
            if (keyState["w"]) {
                this.velocity.y = -0.015; // climb up faster
            } else if (keyState["s"]) {
                this.velocity.y = 0.015; // climb down faster
            }
        }
    
        let velX = this.velocity.x;
        let velY = this.velocity.y;
    
        // --- Horizontal movement ---
        let newXPosition = this.position.plus(new Vec(velX * deltaTime, 0));
        // Only check for horizontal wall collision if not on a ladder
        if (!this.isOnLadder) {
            // Use horizontal hitbox for horizontal collision with walls
            let horizontalCollision = false;
            if (this.horizontalHitbox) {
                 let hitboxX = newXPosition.plus(this.horizontalHitbox.offset);
                 horizontalCollision = level.contact(hitboxX, this.horizontalHitbox.size, 'wall');
            } else { // Fallback to main hitbox if horizontal hitbox is not defined
                 horizontalCollision = level.contact(newXPosition, this.size, 'wall');
            }

            if (!horizontalCollision) {
                this.position = new Vec(newXPosition.x, this.position.y);
            }
        } else {
             // If on a ladder, allow horizontal movement without wall collision
             this.position = new Vec(newXPosition.x, this.position.y);
        }
    
        // --- Vertical movement ---
        let newYPosition = this.position.plus(new Vec(0, velY * deltaTime));

        // Only check for vertical wall collision if not on a ladder
        if (!this.isOnLadder) {
            // Check for vertical collision using the main hitbox
            if (level.contact(newYPosition, this.size, 'wall')) {
                // If collision, stop vertical movement
                this.velocity.y = 0; // Stop vertical velocity

                // If moving downwards and hit a wall, consider it landing
                if (velY > 0) {
                   this.land(); // Call land() to handle isJumping and animation, and snaps to grid
                }
                // If moving upwards and hit a wall, just stop vertical velocity

            } else {
                // No collision, update vertical position
                this.position = new Vec(this.position.x, newYPosition.y);
            }
        } else {
            // If on a ladder, vertical movement is handled by key presses (already implemented)
            // and wall collisions are ignored.
            this.position = new Vec(this.position.x, newYPosition.y);
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
        super.draw(ctx, scale);
        // Draw default hitbox for debugging (red)
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.position.x * scale,
            this.position.y * scale,
            this.size.x * scale,
            this.size.y * scale
        );
        // Draw horizontal hitbox for debugging (blue) if defined
        if (this.horizontalHitbox) {
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                (this.position.x + this.horizontalHitbox.offset.x) * scale,
                (this.position.y + this.horizontalHitbox.offset.y) * scale,
                this.horizontalHitbox.size.x * scale,
                this.horizontalHitbox.size.y * scale
            );
        }
        ctx.restore();
    }
}


class Gem extends AnimatedObject {
    constructor(_color, width, height, x, y, _type) {
        super("green", width, height, x, y, "gem");
    }

    update(_level, deltaTime) {
        this.updateFrame(deltaTime);
    }
    draw(ctx, scale) {
        super.draw(ctx, scale);
        // Draw default hitbox for debugging
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
    }
}

class Ladder extends GameObject {
    constructor(_color, width, height, x, y, _type) {
        super("brown", width, height, x, y, _type || "ladder");
    }

    draw(ctx, scale) {
        ctx.fillStyle = "#a0522d"; // Brown color
        ctx.fillRect(
            this.position.x * scale,
            this.position.y * scale,
            this.size.x * scale,
            this.size.y * scale
        );
    }

    update() {
        // No behavior needed for static ladders
    }
}


const levelChars = {
    ".": { objClass: GameObject,
           label: "floor",
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
       sprite: '../assets/assets_platform/sprites/coin_gold.png',
       rectParams: [0, 0, 32, 32], // 
       sheetCols: 8,
       startFrame: [0, 7]
                            },
    "L": { 
        objClass: Ladder,
        label: "ladder",
        sprite: null, 
        rectParams: [0, 0, 32, 32]  
}
}

class Fireball extends GameObject {
    constructor(x, y, direction) {
        super("red", 0.5, 0.5, x, y, "fireball");
        this.velocity = new Vec(direction * 0.02, 0); 
    }

    update(level, deltaTime) {
        let newPos = this.position.plus(this.velocity.times(deltaTime));
        if (!level.contact(newPos, this.size, 'wall')) {
            this.position = newPos;
        } else {
            // Remove fireball if it hits a wall
            game.actors = game.actors.filter(actor => actor !== this);
        }
    }

    draw(ctx, scale) {
        ctx.fillStyle = "red";
        ctx.fillRect(this.position.x * scale, this.position.y * scale, this.size.x * scale, this.size.y * scale);
    }
}

class Barrel extends GameObject {
    constructor(x, y) {
        super("brown", 1, 1, x, y, "barrel"); // Brown color, 1x1 unit size
        this.velocity = new Vec(0.0, 0.0);
        this.directionX = 1; // 1 for right, -1 for left
        this.initialHorizontalSpeed = 0.005; // Adjust as needed
        this.velocity.x = this.directionX * this.initialHorizontalSpeed;
    }

    update(level, deltaTime) {
        // Apply gravity
        this.velocity.y += gravity * deltaTime;

        // Calculate next horizontal position
        let newXPosition = this.position.plus(new Vec(this.velocity.x * deltaTime, 0));

        // Check horizontal collision with walls or floors
        // Use the barrel's size for collision
        if (level.contact(newXPosition, this.size, 'wall') || level.contact(newXPosition, this.size, 'floor')) {
            // Reverse horizontal direction on collision
            this.directionX *= -1;
            this.velocity.x = this.directionX * this.initialHorizontalSpeed;
            // Nudge out of collision horizontally
            // Calculate penetration depth and adjust position
             let moveBack = new Vec(this.velocity.x * deltaTime, 0);
             let attemptedPosition = this.position.plus(moveBack);
             // This is a simplified nudge. In a real engine, you'd find the exact collision point.
             this.position = this.position.minus(moveBack.times(1.1)); // Move back slightly more than moved
        } else {
             // Update horizontal position if no collision
             this.position = new Vec(newXPosition.x, this.position.y);
        }

        // Calculate next vertical position
        let newYPosition = this.position.plus(new Vec(0, this.velocity.y * deltaTime));

        // Check vertical collision with walls or floors
        // Use the barrel's size for collision
        if (level.contact(newYPosition, this.size, 'wall') || level.contact(newYPosition, this.size, 'floor')) {
            // Stop vertical movement
            this.velocity.y = 0;
            // Reverse horizontal direction on vertical collision (as requested)
            this.directionX *= -1;
            this.velocity.x = this.directionX * this.initialHorizontalSpeed;
            // Nudge out of collision vertically
            // For falling onto a floor, snap to the grid bottom edge of the barrel
            if (velY > 0) { // Moving downwards
                 this.position.y = Math.floor(this.position.y + this.size.y) - this.size.y; // Snap to grid top
            }
             // If moving upwards, maybe snap to grid top edge of the barrel
             else if (velY < 0) { // Moving upwards
                  this.position.y = Math.ceil(this.position.y); // Snap to grid bottom
             }

        } else {
            // No vertical collision, update vertical position
            this.position = new Vec(this.position.x, newYPosition.y);
        }
    }

    // Barrels will use the default GameObject draw method (draws a colored rectangle)
}

class Level {
    constructor(plan) {
        // Split the plan string into a matrix of strings
        let rows = plan.trim().split('\n').map(l => [...l]);
        this.height = rows.length;
        this.width = rows[0].length;
        this.actors = [];

        // Variable to randomize environments
        let rnd = Math.random();

        // Fill the rows array with a label for the type of element in the cell
        // Most cells are 'empty', except for the 'wall'
        this.rows = rows.map((row, y) => {
            return row.map((ch, x) => {
                let item = levelChars[ch];
                let objClass = item.objClass;
                let cellType = item.label;
                // Create a new instance of the type specified
                let color = item.label === "ladder" ? "brown" : "skyblue";
                let actor = new objClass(color, 1, 1, x, y, item.label);

                // Configurations for each type of cell
                // TODO: Simplify this code, sinde most of it is repeated
                if (actor.type == "player") {
                    // Also instantiate a floor tile below the player
                    this.addBackgroundFloor(x, y);

                    // Make the player larger (visual size)
                    actor.position = actor.position.plus(new Vec(0, -3));
                    actor.size = new Vec(3, 3);

                    // Define horizontal hitbox for horizontal wall collisions (blue rectangle)
                    // This hitbox is narrower than the main size (red rectangle)
                    actor.horizontalHitbox = {
                        offset: new Vec(0.75, 0.1), // Reverted horizontal offset
                        size: new Vec(actor.size.x - 1.5, actor.size.y - 0.2) // Reverted width
                    };

                    let instanceRect = new Rect(...item.rectParams);
                    actor.setSprite(item.sprite, instanceRect);
                    actor.sheetCols = item.sheetCols;
                    actor.setAnimation(...item.startFrame, false, 100);
                    this.player = actor;
                    cellType = "empty";
                } else if (actor.type == "gem") {
                    // Also instantiate a floor tile below the player
                    this.addBackgroundFloor(x, y);

                    // Need to create a new instance of Rect for each item
                    let instanceRect = new Rect(...item.rectParams);
                    actor.setSprite(item.sprite, instanceRect);
                    actor.sheetCols = item.sheetCols;
                    actor.setAnimation(...item.startFrame, true, 100);
                    this.actors.push(actor);
                    cellType = "empty";
                } else if (actor.type == "wall") {
                    // Randomize sprites for each wall tile
                    let instanceRect = this.randomEvironment(rnd);
                    actor.setSprite(item.sprite, instanceRect);
                    this.actors.push(actor);
                    cellType = "wall";
                } else if (actor.type == "floor") {
                    //let instanceRect = new Rect(item.rectParams);
                    //actor.setSprite(item.sprite, item.rect);
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

    // Randomize sprites for each wall tile
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

        this.labelGems = new TextLabel(20, 30, "30px Arial", "black");

        console.log("############ LEVEL START ###################");
    }

    update(deltaTime) {
        this.player.update(this.level, deltaTime);

        for (let actor of this.actors) {
            actor.update(this.level, deltaTime);
        }

        let currentActors = this.actors;
        for (let actor of currentActors) {
            if (actor.type != 'floor' && overlapRectangles(this.player, actor)) {
                if (actor.type == 'coin') {
                    this.player.gems += 1;
                    this.actors = this.actors.filter(item => item !== actor);
                }
            }
        }

        // Update cameraY to follow player upward onlyad
        const targetY = this.player.position.y * scale - canvasHeight * (2 / 3);
        cameraY += (targetY - cameraY) * 0.1; // smooth follow
        
    }

    draw(ctx, scale) {
        ctx.save();
        ctx.translate(0, -cameraY); // Apply vertical camera offset

        for (let actor of this.actors) {
            actor.draw(ctx, scale);
        }
        this.player.draw(ctx, scale);

        ctx.restore();

        this.labelGems.draw(ctx, `Gems: ${this.player.gems}`);
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

    // ⬇️ Set scale dynamically based on canvas height
    scale = canvasHeight / 20; // 20 tiles high view — change to 18 or 15 to adjust zoom

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
        scale = canvasHeight / 20; // Update scale again
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

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    game.update(deltaTime);
    game.draw(ctx, scale);

    frameStart = frameTime;
    requestAnimationFrame(updateCanvas);
}

main();


