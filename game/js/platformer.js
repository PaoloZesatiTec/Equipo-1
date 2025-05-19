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
const walkSpeed = 0.004;
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
        if (this.exitingLadder) {
            // Delay ladder re-attachment for 200ms
            this.ladderCooldownTime = performance.now();
            this.exitingLadder = false;
            this.isOnLadder = false;
        } else if (!this.ladderCooldownTime || performance.now() - this.ladderCooldownTime > 200) {
            this.isOnLadder = level.contact(this.position, this.size, "ladder");
        }
        
    
        // Gravity only if not on ladder
        if (!this.isOnLadder) {
            this.velocity.y += gravity * deltaTime;
        } else {
            // On ladder: stay in place unless moving
            this.velocity.y = 0;
            if (keyState["w"]) {
                this.velocity.y = -0.01;
            } else if (keyState["s"]) {
                this.velocity.y = 0.01;
            }
        }
    
        let velX = this.velocity.x;
        let velY = this.velocity.y;
    
        // Horizontal movement
        let newXPosition = this.position.plus(new Vec(velX * deltaTime, 0));
        if (!level.contact(newXPosition, this.size, 'wall')) {
            this.position = newXPosition;
        }
    
        // Vertical movement
        let newYPosition = this.position.plus(new Vec(0, velY * deltaTime));
        if (!level.contact(newYPosition, this.size, 'wall')) {
            this.position = newYPosition;
        } else {
            this.land();
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
        // Draw smaller hitbox for debugging
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        
        // Make hitbox 80% of the sprite size and center it
        const hitboxWidth = this.size.x * 0.6;
        const hitboxHeight = this.size.y * 0.8;
        const xOffset = (this.size.x - hitboxWidth) / 2;
        const yOffset = (this.size.y - hitboxHeight) / 2;
        
        ctx.strokeRect(
            (this.position.x + xOffset) * scale,
            (this.position.y + yOffset) * scale,
            hitboxWidth * scale,
            hitboxHeight * scale
        );
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
        super("#8B4513", width, height, x, y, _type || "ladder");
    }

    draw(ctx, scale) {
        // Fill with brown color
        ctx.fillStyle = "#8B4513"; // Darker brown
        ctx.fillRect(
            this.position.x * scale,
            this.position.y * scale,
            this.size.x * scale,
            this.size.y * scale
        );

        // Add some ladder rungs for visual effect
        ctx.fillStyle = "#A0522D"; // Lighter brown for rungs
        const rungs = 3;
        const rungHeight = (this.size.y * scale) / (rungs + 1);
        for (let i = 1; i <= rungs; i++) {
            ctx.fillRect(
                this.position.x * scale,
                this.position.y * scale + (i * rungHeight),
                this.size.x * scale,
                5 // rung thickness
            );
        }
    }

    update() {
        // No behavior needed for static ladders
    }
}


class Enemy extends GameObject {
    constructor(color, width, height, x, y, type) {
        super(color || "blue", width, height, x, y, type || "enemy");
        this.velocity = new Vec(0.003, 0); // Reduced velocity for smoother movement
        this.moveDistance = 3;
        this.startX = x;
        this.direction = 1; // 1 for right, -1 for left
    }

    update(level, deltaTime) {
        // Calculate next position
        let nextX = this.position.x + this.velocity.x * deltaTime;
        
        // Check if next position would be within bounds
        if (nextX < 0 || nextX > level.width - this.size.x) {
            this.velocity.x *= -1;
            this.direction *= -1;
            return;
        }

        let newPos = new Vec(nextX, this.position.y);

        // Check for wall collision
        let wallHit = level.contact(newPos, this.size, "wall");

        // Check for floor
        let footX = this.position.x + (this.direction > 0 ? this.size.x : 0);
        let footY = this.position.y + this.size.y + 0.1;
        let noFloor = !level.contact(new Vec(footX, footY), new Vec(0.1, 0.1), "wall");

        if (wallHit || noFloor) {
            this.velocity.x *= -1;
            this.direction *= -1;
        } else {
            this.position = newPos;
        }
    }

    draw(ctx, scale) {
        // Draw enemy body
        ctx.fillStyle = "blue";
        ctx.fillRect(
            this.position.x * scale,
            this.position.y * scale,
            this.size.x * scale,
            this.size.y * scale
        );

        // Draw hitbox for debugging
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
},
    "E": {
    objClass: Enemy,
    label: "enemy",
    sprite: null 
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

                let actor = new item.objClass(color, 1, 1, x, y, item.label);

                if (actor.type === "player") {
                    this.addBackgroundFloor(x, y);
                    actor.position = actor.position.plus(new Vec(0, -3));
                    actor.size = new Vec(3, 3);
                    let instanceRect = new Rect(...item.rectParams);
                    actor.setSprite(item.sprite, instanceRect);
                    actor.sheetCols = item.sheetCols;
                    actor.setAnimation(...item.startFrame, false, 100);
                    this.player = actor;
                    cellType = "empty";
                } else if (actor.type === "gem") {
                    this.addBackgroundFloor(x, y);
                    let instanceRect = new Rect(...item.rectParams);
                    actor.setSprite(item.sprite, instanceRect);
                    actor.sheetCols = item.sheetCols;
                    actor.setAnimation(...item.startFrame, true, 100);
                    this.actors.push(actor);
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

        this.labelGems = new TextLabel(20, 30, "30px Arial", "black");

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
                } else if (actor.type === 'enemy') {
                    console.log("Player hit by enemy!");
                    // Handle enemy collision here
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

    ctx.fillStyle = "#87CEEB"; // Sky blue or any background color you prefer
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    game.update(deltaTime);
    game.draw(ctx, scale);

    frameStart = frameTime;
    requestAnimationFrame(updateCanvas);
}

main();


