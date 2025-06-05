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

// Lava class for the final level
class Lava {
    constructor(levelHeight) {
        this.height = 0; // Start below the first floor (changed from 0.5)
        this.maxHeight = levelHeight - 10; // Don't go all the way to top
        this.riseSpeed = 0.0006; // Increased from 0.0001 to 0.0002 (2x faster)
        this.levelHeight = levelHeight;
        this.active = false; // Only active on level 4
        this.delayTimer = 0; // Timer for the initial delay
        this.delayDuration = 2000; // 2 seconds delay before starting to rise
        this.hasStartedRising = false; // Track if lava has started rising
    }

    update(deltaTime, currentLevel) {
        if (currentLevel === 4 && this.active) {
            if (!this.hasStartedRising) {
                // Count down the delay timer
                this.delayTimer += deltaTime;
                if (this.delayTimer >= this.delayDuration) {
                    this.hasStartedRising = true;
                }
            } else {
                // Start rising after delay
                this.height += this.riseSpeed * deltaTime;
                if (this.height > this.maxHeight) {
                    this.height = this.maxHeight;
                }
            }
        }
    }

    checkCollision(player) {
        if (this.active && player.position.y + player.size.y >= this.levelHeight - this.height) {
            return true; // Player touched lava
        }
        return false;
    }

    draw(ctx, scale, levelWidth, levelHeight) {
        if (!this.active) return;
        
        const lavaY = (levelHeight - this.height) * scale;
        const lavaHeight = this.height * scale;
        
        // Always show lava pool below the ground level for visual effect
        const basePoolHeight = 100; // Height of the base lava pool in pixels
        const poolY = levelHeight * scale; // Start from the bottom of the level
        
        // Draw the base lava pool below ground level - using same colors as rising lava
        const poolGradient = ctx.createLinearGradient(0, poolY, 0, poolY + basePoolHeight);
        poolGradient.addColorStop(0, '#FF4500'); // Orange red at top (same as rising lava)
        poolGradient.addColorStop(0.5, '#FF6347'); // Tomato in middle (same as rising lava)
        poolGradient.addColorStop(1, '#DC143C'); // Crimson at bottom (same as rising lava)
        
        ctx.fillStyle = poolGradient;
        ctx.fillRect(0, poolY, levelWidth * scale, basePoolHeight);
        
        // Add bubbling effect to the base pool
        const time = Date.now() * 0.003;
        for (let i = 0; i < 8; i++) {
            const x = (Math.sin(time + i * 0.8) * 0.5 + 0.5) * levelWidth * scale;
            const bubbleY = poolY + Math.sin(time * 1.5 + i) * 15 + 20;
            
            ctx.fillStyle = '#FF6347'; // Tomato bubbles
            ctx.beginPath();
            ctx.arc(x, bubbleY, 2 + Math.sin(time + i) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw the rising lava if it's above ground level
        if (this.height > 0) {
            // Create lava gradient for rising portion
            const gradient = ctx.createLinearGradient(0, lavaY, 0, lavaY + lavaHeight);
            gradient.addColorStop(0, '#FF4500'); // Orange red at top
            gradient.addColorStop(0.5, '#FF6347'); // Tomato in middle  
            gradient.addColorStop(1, '#DC143C'); // Crimson at bottom
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, lavaY, levelWidth * scale, lavaHeight);
            
            // Add lava bubbling effect for rising lava
            const activeTime = Date.now() * 0.005;
            for (let i = 0; i < 10; i++) {
                const x = (Math.sin(activeTime + i) * 0.5 + 0.5) * levelWidth * scale;
                const bubbleY = lavaY + Math.sin(activeTime * 2 + i) * 10;
                
                ctx.fillStyle = '#FFD700'; // Gold bubbles
                ctx.beginPath();
                ctx.arc(x, bubbleY, 3 + Math.sin(activeTime + i) * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    reset() {
        this.height = 0; // Reset to start below the first floor (changed from 0.5)
        this.active = false;
        this.delayTimer = 0; // Reset the delay timer
        this.hasStartedRising = false; // Reset the rising flag
    }

    activate() {
        this.active = true;
        this.delayTimer = 0; // Reset delay timer when activated
        this.hasStartedRising = false; // Reset rising flag when activated
    }
}

class Player extends AnimatedObject {
    constructor(color, width, height, x, y, type, powerUps = {}) {
        // Make hitbox even smaller - reducing height and width further
        super(color, 0.3, 1.3, x, y, type); // Even smaller hitbox (0.5 width, 1.3 height)
        
        // Store original position for proper centering
        this.originalX = x;
        this.originalY = y;
        
        // Center the hitbox on the player sprite
        this.centerHitbox();
        
        this.velocity = new Vec(0.0, 0.0);
        this.gems = 0;
        this.lives = 2; // Back to original 2 base lives
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.isDead = false;

        this.isFacingRight = true;
        this.isJumping = false;
        this.isCrouching = false;
        this.wasSpacePressed = false; // Track space key for responsive jumping
        this.lastFireTime = -Infinity;
        this.fireCooldown = 10000; // 10 seconds in milliseconds (can be reduced by power-up)
        this.exitingLadder = false;
        this.isOnLadder = false; // Initialize isOnLadder

        // Power-up flags
        this.hasFastFireball = powerUps.hasFastFireball || false; // Reduces cooldown to 7 seconds
        this.hasExtraLife = powerUps.hasExtraLife || false; // No longer used
        this.lifeUpgradeLevel = powerUps.lifeUpgradeLevel || 0; // 0 = 2 lives, 1 = 3 lives, 2 = 4 lives, 3 = 5 lives

        // Apply power-ups if purchased
        if (this.hasFastFireball) {
            this.fireCooldown = 7000; // 7 seconds
        }
        
        // Apply life upgrades based on level
        switch (this.lifeUpgradeLevel) {
            case 1:
                this.lives = Math.max(this.lives, 3); // First upgrade: 2 -> 3 lives
                break;
            case 2:
                this.lives = Math.max(this.lives, 4); // Second upgrade: 3 -> 4 lives
                break;
            case 3:
                this.lives = Math.max(this.lives, 5); // Third upgrade: 4 -> 5 lives
                break;
            default:
                this.lives = Math.max(this.lives, 2); // Base lives
                break;
        }

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

    update(level, deltaTime, actors = []) {
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

        // Handle jumping - improved ground detection and jump logic
        const isGrounded = this.isOnGround(level);
        if (keyState[" "] && isGrounded && !this.isJumping) {
            this.velocity.y = initialJumpSpeed;
            this.isJumping = true;
            if (!this.isHurt && !this.isAttacking) {
                this.setMageAnimation('jump');
            }
        }

        // Reset isJumping if player is on ground and has no upward velocity
        if (this.isJumping && isGrounded && this.velocity.y >= 0) {
            this.isJumping = false;
        }

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
        
        // Check for horizontal wall collision only
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

        // When on ladder, only check for ceiling/floor collisions
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
            // Check for walls and ladders only
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
        const testPosition = this.position.plus(new Vec(0, 0.05)); // Increased offset for better ground detection
        const isOnWall = level.contact(testPosition, this.size, 'wall');
        const isOnLadder = level.contact(testPosition, this.size, 'ladder');
        
        // Also check if we're very close to the ground (within 0.05 units)
        const isVeryCloseToGround = Math.abs(this.position.y - Math.floor(this.position.y)) < 0.05;
        
        return isOnWall || isOnLadder || isVeryCloseToGround;
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
        
        // Incrementar contador de muertes cuando el jugador muere
        game.deathCount++;
        // Actualizar el panel de estadísticas
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = game.deathCount;
        }
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

class Princess extends AnimatedObject {
    constructor(x, y) {
        super("pink", 1.5, 1.5, x, y, "princess"); // Same hitbox size as portal
        
        // Set up sprite animation for the princess (32x32 sprite sheet, 4 frames in 1 row)
        this.setSprite('../assets/figure/Princess/princess.png', new Rect(0, 0, 32, 32));
        this.sheetCols = 4; // 4 columns (frames) in 1 row
        
        // Start princess animation - 4 frames total, looping
        this.setAnimation(0, 3, true, 300); // Frames 0-3, looping, 300ms per frame
    }

    update(level, deltaTime) {
        // Update animation frame
        this.updateFrame(deltaTime);
    }

    draw(ctx, scale) {
        // Draw the animated princess sprite
        if (this.spriteImage && this.spriteRect) {
            const spriteScale = 3.0; // Same scale as portal for consistency
            const offsetX = (this.size.x * (spriteScale - 1)) / 2; // Center the larger sprite horizontally
            const offsetY = (this.size.y * (spriteScale - 1)) / 2 + this.size.y * 1.5; // Move sprite higher above the platform
            
            ctx.drawImage(this.spriteImage,
                          this.spriteRect.x * this.spriteRect.width,
                          this.spriteRect.y * this.spriteRect.height,
                          this.spriteRect.width, this.spriteRect.height,
                          (this.position.x - offsetX) * scale, 
                          (this.position.y - offsetY) * scale, // Adjusted Y position to be well above platform
                          this.size.x * scale * spriteScale, 
                          this.size.y * scale * spriteScale);
        } else {
            // Fallback to pink rectangle if sprite isn't loaded
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

                if (item.label === "princess"){
                    let princess = new Princess(x, y);
                    this.actors.push(princess);
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
                    // Create custom wall actor with pixel art drawing
                    actor.drawCustomWall = this.drawCustomWall.bind(this);
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

    // Custom pixel art wall drawing based on level theme
    drawCustomWall(ctx, scale, x, y, levelNumber) {
        const blockSize = scale;
        const drawX = x * scale;
        const drawY = y * scale;
        
        // Disable anti-aliasing for crisp pixel art
        ctx.imageSmoothingEnabled = false;
        
        if (levelNumber === 1) {
            // Level 1: Dirt with grass block
            this.drawDirtGrassBlock(ctx, drawX, drawY, blockSize);
        } else if (levelNumber === 2) {
            // Level 2: Cloud block
            this.drawCloudBlock(ctx, drawX, drawY, blockSize);
        } else if (levelNumber === 3) {
            // Level 3: Lava/Obsidian block
            this.drawLavaObsidianBlock(ctx, drawX, drawY, blockSize);
        } else if (levelNumber === 4) {
            // Level 4: Molten lava cubes
            this.drawMoltenLavaBlock(ctx, drawX, drawY, blockSize);
        }
        
        // Re-enable anti-aliasing
        ctx.imageSmoothingEnabled = true;
    }

    drawDirtGrassBlock(ctx, x, y, size) {
        const pixelSize = size / 16; // 16x16 pixel block
        
        // Use position as seed for consistent random patterns
        const seed = (x / size) * 1000 + (y / size);
        
        // Draw dirt base (brown tones)
        ctx.fillStyle = "#8B4513"; // Saddle brown
        ctx.fillRect(x, y + pixelSize * 3, size, size - pixelSize * 3);
        
        // Add dirt texture with darker brown pixels (deterministic)
        ctx.fillStyle = "#654321";
        for (let i = 0; i < 8; i++) {
            const px = x + (Math.floor((seed + i * 17) % 16)) * pixelSize;
            const py = y + (3 + Math.floor((seed + i * 23) % 13)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Draw grass top layer
        ctx.fillStyle = "#228B22"; // Forest green
        ctx.fillRect(x, y, size, pixelSize * 3);
        
        // Add grass texture with different green shades (deterministic)
        ctx.fillStyle = "#32CD32"; // Lime green highlights
        for (let i = 0; i < 6; i++) {
            const px = x + (Math.floor((seed + i * 31) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 37) % 3)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Add some darker green for depth (deterministic)
        ctx.fillStyle = "#006400"; // Dark green
        for (let i = 0; i < 4; i++) {
            const px = x + (Math.floor((seed + i * 41) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 43) % 3)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
    }

    drawCloudBlock(ctx, x, y, size) {
        const pixelSize = size / 16; // 16x16 pixel block
        
        // Use position as seed for consistent random patterns
        const seed = (x / size) * 1000 + (y / size);
        
        // Draw cloud base (light blue/white)
        ctx.fillStyle = "#F0F8FF"; // Alice blue
        ctx.fillRect(x, y, size, size);
        
        // Add cloud puffs with white
        ctx.fillStyle = "#FFFFFF";
        // Top row puffs
        ctx.fillRect(x + pixelSize * 2, y, pixelSize * 12, pixelSize * 4);
        ctx.fillRect(x + pixelSize * 1, y + pixelSize, pixelSize * 14, pixelSize * 3);
        
        // Middle section
        ctx.fillRect(x, y + pixelSize * 4, size, pixelSize * 8);
        
        // Bottom puffs
        ctx.fillRect(x + pixelSize * 1, y + pixelSize * 12, pixelSize * 14, pixelSize * 3);
        ctx.fillRect(x + pixelSize * 2, y + pixelSize * 15, pixelSize * 12, pixelSize);
        
        // Add some light gray shadows for depth (deterministic)
        ctx.fillStyle = "#E6E6FA"; // Lavender
        for (let i = 0; i < 8; i++) {
            const px = x + (Math.floor((seed + i * 19) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 29) % 16)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Add subtle blue tint in some areas (deterministic)
        ctx.fillStyle = "#E0F6FF";
        for (let i = 0; i < 6; i++) {
            const px = x + (Math.floor((seed + i * 47) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 53) % 16)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
    }

    drawLavaObsidianBlock(ctx, x, y, size) {
        const pixelSize = size / 16; // 16x16 pixel block
        
        // Use position as seed for consistent random patterns
        const seed = (x / size) * 1000 + (y / size);
        
        // Draw obsidian base (very dark)
        ctx.fillStyle = "#1C1C1C"; // Very dark gray
        ctx.fillRect(x, y, size, size);
        
        // Add obsidian texture with slightly lighter grays (deterministic)
        ctx.fillStyle = "#2F2F2F";
        for (let i = 0; i < 10; i++) {
            const px = x + (Math.floor((seed + i * 13) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 17) % 16)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Add lava cracks/veins
        ctx.fillStyle = "#FF4500"; // Orange red
        // Horizontal cracks
        ctx.fillRect(x + pixelSize * 2, y + pixelSize * 5, pixelSize * 8, pixelSize);
        ctx.fillRect(x + pixelSize * 1, y + pixelSize * 10, pixelSize * 10, pixelSize);
        
        // Vertical cracks
        ctx.fillRect(x + pixelSize * 6, y + pixelSize * 2, pixelSize, pixelSize * 6);
        ctx.fillRect(x + pixelSize * 12, y + pixelSize * 8, pixelSize, pixelSize * 5);
        
        // Add bright lava glow in cracks
        ctx.fillStyle = "#FFD700"; // Gold
        ctx.fillRect(x + pixelSize * 3, y + pixelSize * 5, pixelSize * 4, pixelSize);
        ctx.fillRect(x + pixelSize * 2, y + pixelSize * 10, pixelSize * 6, pixelSize);
        ctx.fillRect(x + pixelSize * 6, y + pixelSize * 3, pixelSize, pixelSize * 3);
        ctx.fillRect(x + pixelSize * 12, y + pixelSize * 9, pixelSize, pixelSize * 3);
        
        // Add some red hot spots (deterministic)
        ctx.fillStyle = "#DC143C"; // Crimson
        for (let i = 0; i < 6; i++) {
            const px = x + (Math.floor((seed + i * 59) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 61) % 16)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
    }

    drawMoltenLavaBlock(ctx, x, y, size) {
        const pixelSize = size / 16; // 16x16 pixel block
        
        // Use position as seed for consistent random patterns
        const seed = (x / size) * 1000 + (y / size);
        
        // Add time-based animation for flowing lava effect
        const time = Date.now() * 0.001;
        const animOffset = Math.sin(time + seed * 0.1) * 0.5 + 0.5;
        
        // Draw molten rock base (dark red-orange)
        ctx.fillStyle = "#8B0000"; // Dark red
        ctx.fillRect(x, y, size, size);
        
        // Add molten texture with bright orange (deterministic but animated)
        ctx.fillStyle = "#FF4500"; // Orange red
        for (let i = 0; i < 12; i++) {
            const px = x + (Math.floor((seed + i * 11 + animOffset * 2) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 13) % 16)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Add bright lava flows
        ctx.fillStyle = "#FF6347"; // Tomato
        // Flowing horizontal streams
        const flowY1 = y + pixelSize * Math.floor(4 + animOffset * 3);
        const flowY2 = y + pixelSize * Math.floor(10 + animOffset * 2);
        ctx.fillRect(x + pixelSize * 2, flowY1, pixelSize * 12, pixelSize);
        ctx.fillRect(x + pixelSize * 1, flowY2, pixelSize * 14, pixelSize);
        
        // Flowing vertical streams
        const flowX1 = x + pixelSize * Math.floor(5 + animOffset * 4);
        const flowX2 = x + pixelSize * Math.floor(11 + animOffset * 3);
        ctx.fillRect(flowX1, y + pixelSize * 2, pixelSize, pixelSize * 12);
        ctx.fillRect(flowX2, y + pixelSize * 1, pixelSize, pixelSize * 14);
        
        // Add super bright lava core
        ctx.fillStyle = "#FFD700"; // Gold
        ctx.fillRect(x + pixelSize * 6, y + pixelSize * 6, pixelSize * 4, pixelSize * 4);
        
        // Add animated hot spots
        ctx.fillStyle = "#FFFF00"; // Yellow
        for (let i = 0; i < 6; i++) {
            const px = x + (Math.floor((seed + i * 17 + animOffset * 5) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 19 + animOffset * 3) % 16)) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Add white-hot center spots
        ctx.fillStyle = "#FFFFFF"; // White hot
        for (let i = 0; i < 3; i++) {
            const px = x + (Math.floor((seed + i * 23 + animOffset * 7) % 16)) * pixelSize;
            const py = y + (Math.floor((seed + i * 29 + animOffset * 4) % 16)) * pixelSize;
            if (px >= x + pixelSize * 4 && px <= x + pixelSize * 12 && 
                py >= y + pixelSize * 4 && py <= y + pixelSize * 12) {
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }
        }
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
    },
    "R": {
        objClass: Princess,
        label: "princess",
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
        this.currentLevel = levelNumber;
        this.totalLevels = 4;
        this.deathCount = 0;
        
        // Pause system
        this.isPaused = false;
        
        // Initialize lava system
        this.lava = new Lava(level.height);
        if (levelNumber === 4) {
            this.lava.activate();
        }
        
        // Shop system
        this.shop = new Shop();
        this.showShop = false;
        
        // Death fade transition
        this.isDeathFading = false;
        this.deathFadeTimer = 0;
        this.deathFadeDuration = 2000;
        this.shopFadeIn = false;
        this.shopFadeTimer = 0;
        this.shopFadeDuration = 1500;
        
        // Transition state properties
        this.isTransitioning = false;
        this.transitionTimer = 0;
        this.transitionDuration = 3000;
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
        
        // Load level 4 transition image
        this.transitionImages[4] = new Image();
        this.transitionImagesLoaded[4] = false;
        this.transitionImages[4].src = '../assets/figure/Transition/level4transition.png';
        this.transitionImages[4].onload = () => {
            console.log("Level 4 transition image loaded successfully!");
            this.transitionImagesLoaded[4] = true;
        };
        this.transitionImages[4].onerror = () => {
            console.error("Failed to load level 4 transition image");
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
        } else if (levelNumber === 4) {
            this.backgroundImage.src = '../assets/stages/Map-Final Boss/final_level.png';
        }
        
        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
        };
        
        this.backgroundImage.onerror = (e) => {
            console.error(`Failed to load level ${levelNumber} background image.`);
        };

        // Load UI sprites
        this.heartSprite = new Image();
        this.heartSprite.src = '../assets/Items/Heart/heart.png';
        
        // Add gem UI sprite
        this.gemUISprite = new Image();
        this.gemUISprite.src = '../assets/Items/Gems/Gem_UI/gem.png';
        
        // Add fireball UI sprite
        this.fireballUISprite = new Image();
        this.fireballUISprite.src = '../assets/Items/Fire_ball_icon/fireball.png';
        
        this.labelGems = new TextLabel(80, 30, "30px Arial", "black");

        console.log(`############ LEVEL ${levelNumber} START ###################`);
    }

    update(deltaTime) {
        if (this.gameWon) return;
        
        // Don't update game when paused
        if (this.isPaused) return;
        
        // Handle shop state
        if (this.showShop && !this.shopFadeIn) {
            // Don't update game while shop is open (and not fading in)
            return;
        }
        
        // Handle shop fade-in transition
        if (this.shopFadeIn) {
            this.shopFadeTimer += deltaTime;
            if (this.shopFadeTimer >= this.shopFadeDuration) {
                // Shop fade-in complete
                this.shopFadeIn = false;
            }
            return; // Don't update game during shop fade-in
        }
        
        // Handle death fade transition
        if (this.isDeathFading) {
            this.deathFadeTimer += deltaTime;
            if (this.deathFadeTimer >= this.deathFadeDuration) {
                // Death fade complete, start shop fade-in
                this.isDeathFading = false;
                this.showShop = true;
                this.shop.openWithPlayer(this.player);
                this.shopFadeIn = true;
                this.shopFadeTimer = 0;
            }
            return; // Don't update game during death fade
        }
        
        if (this.gameOver) return;

        // Handle level transition
        if (this.isTransitioning) {
            this.transitionTimer += deltaTime;
            if (this.transitionTimer >= this.transitionDuration) {
                // Transition complete, load next level
                this.completeTransition();
            }
            return; // Don't update game during transition
        }

        // Update lava system
        this.lava.update(deltaTime, this.currentLevel);
        
        // Check lava collision
        if (this.lava.checkCollision(this.player)) {
            // Lava instantly kills - force death
            this.player.lives = 0;
            this.player.die();
            this.isDeathFading = true;
            this.deathFadeTimer = 0;
            return;
        }

        this.player.update(this.level, deltaTime);

        // Update all actors
        for (let actor of this.actors) {
            if (actor.type === 'minotaur') {
                actor.update(this.level, deltaTime, this.player);
            } else if (actor.type === 'barrel') {
                // Check if barrel should be destroyed (when they reach bottom platform area)
                // Bottom platforms are typically at level.height - 1, so barrels sitting on them would be at level.height - 2
                const shouldDestroy = actor.position.y >= this.level.height - 3;
                
                if (shouldDestroy) {
                    console.log(`Destroying barrel at bottom: y=${actor.position.y}, level.height=${this.level.height}`);
                this.actors = this.actors.filter(item => item !== actor);
                    continue; // Skip updating this barrel since it's being removed
                }
                actor.update(this.level, deltaTime);
            } else {
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
                    // Only apply damage if player is not invulnerable
                    if (!this.player.invulnerable && !this.player.isDead) {
                    this.player.loseLife();
                    
                        // Check for game over - start death fade instead of immediately opening shop
                    if (this.player.lives <= 0) {
                            this.isDeathFading = true;
                            this.deathFadeTimer = 0;
                    }
                    }
                    // No physical collision or knockback - player can move freely through enemies when invulnerable
                } else if (actor.type === 'portal' || actor.type === 'princess') {
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

    // Pause system methods
    togglePause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? "Game Paused" : "Game Resumed");
    }

    quitToMenu() {
        // Reset all game state completely
        this.isPaused = false;
        this.gameOver = false;
        this.gameWon = false;
        this.showShop = false;
        this.isTransitioning = false;
        this.isDeathFading = false;
        
        // Reset camera and frame timing
        cameraY = 0;
        frameStart = undefined;
        
        // Generate a new random level 1 for complete restart
        let level1Plan;
        if (typeof LevelGenerator !== 'undefined') {
            const generator = new LevelGenerator(28, 60, 1);
            level1Plan = generator.generate();
        } else {
            // Fallback to static level 1 if LevelGenerator is not available
            level1Plan = GAME_LEVELS[0];
        }
        
        // Create completely new game instance from level 1
        game = new Game('playing', new Level(level1Plan), 1);
        
        // Show the menu from menu.js
        if (typeof showMenu === 'function') {
            showMenu();
        } else {
            console.error('showMenu function not found');
        }
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
        
        console.log(`Starting transition to level ${this.nextLevelNumber}`);
        
        // Generate a new random layout for the next level
        let nextLevelPlan;
        if (typeof LevelGenerator !== 'undefined') {
            // Use LevelGenerator to create a fresh random layout
            const generator = new LevelGenerator(28, 60, this.nextLevelNumber);
            nextLevelPlan = generator.generate();
            console.log(`Generated new random layout for level ${this.nextLevelNumber}`);
        } else {
            // Fallback to existing level if LevelGenerator is not available
            nextLevelPlan = GAME_LEVELS[this.nextLevelNumber - 1];
            console.log(`Using static layout for level ${this.nextLevelNumber}`);
        }
        
        // Create new level with random layout
        const nextLevel = new Level(nextLevelPlan);
        console.log(`Created new level instance for level ${this.nextLevelNumber}`);
        
        // Preserve player stats but reset position and state
        const playerGems = this.player.gems;
        const playerLives = this.player.lives; // Preserve current lives
        const playerPowerUps = {
            hasFastFireball: this.player.hasFastFireball,
            hasExtraLife: this.player.hasExtraLife,
            lifeUpgradeLevel: this.player.lifeUpgradeLevel
        };
        
        // Update game state for next level
        this.currentLevel = this.nextLevelNumber;
        this.level = nextLevel;
        this.player = nextLevel.player;
        this.actors = [...nextLevel.actors];
        
        // Update level counter in UI
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.currentLevel;
        }
        
        // Reset lava system and activate for level 4
        this.lava.reset();
        if (this.currentLevel === 4) {
            this.lava.activate();
        }
        
        // Restore player stats and power-ups
        this.player.gems = playerGems;
        this.player.lives = playerLives; // Restore the preserved lives
        this.player.hasFastFireball = playerPowerUps.hasFastFireball;
        this.player.hasExtraLife = playerPowerUps.hasExtraLife;
        this.player.lifeUpgradeLevel = playerPowerUps.lifeUpgradeLevel;
        
        // Apply power-ups (but don't override lives)
        if (this.player.hasFastFireball) {
            this.player.fireCooldown = 7000; // 7 seconds
        }
        
        // Note: Life upgrade logic removed from here - lives should be preserved exactly as they were
        // The upgrade effects are only applied when purchasing upgrades or respawning from death
        
        // Update background for the new level
        this.backgroundImage = new Image();
        this.backgroundLoaded = false;
        
        if (this.currentLevel === 1) {
            this.backgroundImage.src = '../assets/Map1.jpg';
            console.log('Loading level 1 background: ../assets/Map1.jpg');
        } else if (this.currentLevel === 2) {
            this.backgroundImage.src = '../assets/stages/Map-2/map-2.png';
            console.log('Loading level 2 background: ../assets/stages/Map-2/map-2.png');
        } else if (this.currentLevel === 3) {
            this.backgroundImage.src = '../assets/stages/Map-3/map_3.png';
            console.log('Loading level 3 background: ../assets/stages/Map-3/map_3.png');
        } else if (this.currentLevel === 4) {
            this.backgroundImage.src = '../assets/stages/Map-Final Boss/final_level.png';
            console.log('Loading level 4 background: ../assets/stages/Map-Final Boss/final_level.png');
        }
        
        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
            console.log(`Level ${this.currentLevel} background loaded successfully`);
        };
        
        this.backgroundImage.onerror = (e) => {
            console.error('Error details:', e);
        };
        
        // Reset transition state
        this.isTransitioning = false;
        this.transitionTimer = 0;
        this.nextLevelNumber = null;
        
        console.log(`Level ${this.currentLevel} loaded with ${playerGems} gems and ${this.player.lives} lives`);
    }

    // Method to advance to the next level (kept for compatibility, now just calls startTransition)
    advanceToNextLevel() {
        this.startTransition();
    }

    // Handle shop purchase and respawn
    handleShopPurchase() {
        const item = this.shop.items[this.shop.selectedItem];
        
        if (item.name === "Continue") {
            // Only "Continue" option returns to game
            this.shop.close();
            this.showShop = false;
            this.shopFadeIn = false;
            this.shopFadeTimer = 0;
            this.restartFromLevel1();
        } else {
            // For other items, just attempt purchase but stay in shop
            this.shop.purchase(this.player);
            // Update the life upgrade item in case it was purchased
            this.shop.updateLifeUpgradeItem(this.player);
            // Shop remains open for more purchases
        }
    }

    // Restart from level 1 (roguelike style) while preserving gems and upgrades
    restartFromLevel1() {
        // Store player stats and upgrades
        const playerGems = this.player.gems;
        const playerPowerUps = {
            hasFastFireball: this.player.hasFastFireball,
            hasExtraLife: this.player.hasExtraLife,
            lifeUpgradeLevel: this.player.lifeUpgradeLevel
        };
        
        // Generate a completely new random level 1 layout
        let newLevel1Plan;
        if (typeof LevelGenerator !== 'undefined') {
            // Use LevelGenerator to create a fresh random layout for level 1
            const generator = new LevelGenerator(28, 60, 1);
            newLevel1Plan = generator.generate();
        } else {
            // Fallback to existing level 1 if LevelGenerator is not available
            newLevel1Plan = GAME_LEVELS[0];
        }
        
        // Create completely new game instance starting from level 1
        const newLevel = new Level(newLevel1Plan);
        
        // Reset to level 1
        this.currentLevel = 1;
        this.level = newLevel;
        this.player = newLevel.player;
        this.actors = [...newLevel.actors];
        
        // Update level counter in UI
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.currentLevel;
        }
        
        // Reset lava system (deactivated for level 1)
        this.lava.reset();
        
        // Restore player gems and purchased power-ups
        this.player.gems = playerGems;
        this.player.hasFastFireball = playerPowerUps.hasFastFireball;
        this.player.hasExtraLife = playerPowerUps.hasExtraLife;
        this.player.lifeUpgradeLevel = playerPowerUps.lifeUpgradeLevel;
        
        // Apply power-ups
        if (this.player.hasFastFireball) {
            this.player.fireCooldown = 7000; // 7 seconds
        }
        
        // Apply life upgrades based on level
        switch (this.player.lifeUpgradeLevel) {
            case 1:
                this.player.lives = 3; // First upgrade: 2 -> 3 lives
                break;
            case 2:
                this.player.lives = 4; // Second upgrade: 3 -> 4 lives
                break;
            case 3:
                this.player.lives = 5; // Third upgrade: 4 -> 5 lives
                break;
            default:
                this.player.lives = 2; // Base lives
                break;
        }
        
        // Set player state
        this.player.isDead = false;
        this.player.invulnerable = true;
        this.player.invulnerableTimer = 2000;
        this.player.velocity = new Vec(0, 0);
        
        // Reset camera
        cameraY = 0;
        
        // Load level 1 background
        this.backgroundImage = new Image();
        this.backgroundLoaded = false;
        this.backgroundImage.src = '../assets/Map1.jpg';
        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
        };
        this.backgroundImage.onerror = (e) => {
            console.error('Failed to load level 1 background image.');
        };
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
                if (actor.type === 'wall' && actor.drawCustomWall) {
                    // Use custom wall drawing with level theme
                    actor.drawCustomWall(ctx, scale, actor.position.x, actor.position.y, this.currentLevel);
                } else {
                actor.draw(ctx, scale);
                }
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
        
        // Draw lava (on top of everything else in the game world)
        this.lava.draw(ctx, scale, this.level.width, this.level.height);

        ctx.restore();

        // Draw UI elements with improved styling
        // ======================================
        
        // Draw gem icon - moved down and made bigger
        if (this.gemUISprite && this.gemUISprite.complete) {
            ctx.drawImage(
                this.gemUISprite, 
                20,         // X position
                30,         // Y position (moved down from 10)
                40,         // Width (increased from 30)
                40          // Height (increased from 30)
            );
        }
        
        // Draw gem counter with improved styling
        ctx.font = "bold 28px 'Arial Rounded MT Bold', 'Arial Black', sans-serif"; // Increased font size
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
            70,  // X position (adjusted for bigger gem icon)
            50   // Y position (centered with the new gem icon position)
        );
        
        // Reset shadow for other elements
        ctx.shadowColor = "transparent";
        
        // Draw hearts based on player's lives
        for (let i = 0; i < this.player.lives; i++) {
            ctx.drawImage(
                this.heartSprite, 
                20 + i * 50,
                80,
                40,
                40
            );
        }

        // Draw fireball cooldown indicator
        const now = performance.now();
        const timeSinceLastFire = now - this.player.lastFireTime;
        const cooldownProgress = Math.min(timeSinceLastFire / this.player.fireCooldown, 1);
        const isReady = cooldownProgress >= 1;

        // Draw fireball icon
        if (this.fireballUISprite.complete) {
            ctx.save();
            if (!isReady) {
                // Aplicar efecto gris cuando está en cooldown
                ctx.globalAlpha = 0.5;
            }
            ctx.drawImage(
                this.fireballUISprite,
                22,
                132,
                36,
                36
            );
            ctx.restore();
        }

        // Cooldown progress bar
        if (!isReady) {
            // Background bar
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.fillRect(20, 175, 40, 8);
            
            // Progress bar
            ctx.fillStyle = "orange";
            ctx.fillRect(20, 175, 40 * cooldownProgress, 8);
        }

        // Draw fireball ready text
        if (isReady) {
            ctx.font = "12px Arial"; // Slightly bigger font
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText("E", 40, 190); // Adjusted position
        } else {
            // Show remaining time
            const remainingTime = Math.ceil((this.player.fireCooldown - timeSinceLastFire) / 1000);
            ctx.font = "12px Arial"; // Slightly bigger font
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(remainingTime + "s", 40, 190); // Adjusted position
        }

        // Handle death fade transition - draw fade overlay over everything
        if (this.isDeathFading) {
            const fadeProgress = this.deathFadeTimer / this.deathFadeDuration;
            const opacity = Math.min(fadeProgress, 1);
            
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.restore();
        }

        // Draw shop with fade-in effect
        if (this.showShop) {
            if (this.shopFadeIn) {
                // Shop is fading in - apply opacity
                const fadeProgress = this.shopFadeTimer / this.shopFadeDuration;
                const shopOpacity = Math.min(fadeProgress, 1);
                const blackOpacity = 1 - shopOpacity; // Black fades out as shop fades in
                
                ctx.save();
                
                // Draw shop with increasing opacity
                ctx.globalAlpha = shopOpacity;
                this.shop.draw(ctx, canvasWidth, canvasHeight, this.player.gems);
                
                // Draw black overlay with decreasing opacity
                ctx.globalAlpha = blackOpacity;
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                
                ctx.restore();
            } else {
                // Shop is fully visible
                this.shop.draw(ctx, canvasWidth, canvasHeight, this.player.gems);
            }
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
        
        // Draw pause menu if game is paused
        if (this.isPaused) {
            this.drawPauseMenu(ctx, canvasWidth, canvasHeight);
        }
    }

    // Method to draw pause menu
    drawPauseMenu(ctx, canvasWidth, canvasHeight) {
        ctx.save();
        
        // Semi-transparent overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Pause menu background
        const menuWidth = 400;
        const menuHeight = 300;
        const menuX = (canvasWidth - menuWidth) / 2;
        const menuY = (canvasHeight - menuHeight) / 2;
        
        // Create gradient background for menu
        const gradient = ctx.createLinearGradient(menuX, menuY, menuX, menuY + menuHeight);
        gradient.addColorStop(0, "#2C3E50");
        gradient.addColorStop(1, "#34495E");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
        
        // Menu border
        ctx.strokeStyle = "#F39C12";
        ctx.lineWidth = 3;
        ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);
        
        // Title
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = "#F39C12";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PAUSED", canvasWidth / 2, menuY + 80);
        
        // Instructions
        ctx.font = "24px Arial";
        ctx.fillStyle = "#ECF0F1";
        ctx.fillText("Press P to Resume", canvasWidth / 2, menuY + 150);
        ctx.fillText("Press Q to Quit to Menu", canvasWidth / 2, menuY + 190);
        
        // Additional decorative elements
        ctx.font = "16px Arial";
        ctx.fillStyle = "#BDC3C7";
        ctx.fillText("Game Progress is Saved", canvasWidth / 2, menuY + 240);
        
        ctx.restore();
    }

    // Method to draw barrel spawner information
    drawBarrelSpawnerInfo(ctx, canvasWidth, canvasHeight) {
        // Find all barrel spawners
        const spawners = this.actors.filter(actor => actor.type === 'spawner');
        
        if (spawners.length === 0) return;

        ctx.save();
        
        // Background for spawner info
        const infoWidth = 180;
        const infoHeight = 100;
        const infoX = canvasWidth - infoWidth - 10;
        const infoY = 10;
        
        // Semi-transparent background
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
        
        // Border
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);
        
        // Title
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText("BARREL SPAWNERS", infoX + infoWidth/2, infoY + 20);
        
        // Get spawn interval for current level
        let spawnInterval;
        switch (this.currentLevel) {
            case 1:
                spawnInterval = 10000; // 10 seconds
                break;
            case 2:
                spawnInterval = 9000;  // 9 seconds
                break;
            case 3:
                spawnInterval = 8000;  // 8 seconds
                break;
            case 4:
                spawnInterval = 7000;  // 7 seconds
                break;
            default:
                spawnInterval = 10000;
                break;
        }
        
        // Display spawner information
        ctx.font = "12px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        
        spawners.forEach((spawner, index) => {
            const yPos = infoY + 40 + (index * 20);
            
            // Timer information only
            const timeUntilSpawn = Math.max(0, spawnInterval - spawner.spawnTimer);
            const secondsLeft = Math.ceil(timeUntilSpawn / 1000);
            
            if (timeUntilSpawn <= 0) {
                ctx.fillStyle = "#FF4444"; // Red when ready to spawn
                ctx.fillText(`Spawner ${index + 1}: Ready!`, infoX + 10, yPos);
            } else {
                ctx.fillStyle = "#AAAAAA"; // Gray when counting down
                ctx.fillText(`Spawner ${index + 1}: ${secondsLeft}s`, infoX + 10, yPos);
            }
            
            ctx.fillStyle = "white"; // Reset color for next spawner
        });
        
        ctx.restore();
    }

}

class Shop {
    constructor() {
        this.isOpen = false;
        this.selectedItem = 0; // 0 = Fast Fireball, 1 = Life Upgrade, 2 = Continue
        this.items = [
            {
                name: "Fast Fireball",
                description: "Reduce fireball cooldown to 7 seconds",
                cost: 200,
                purchased: false,
                icon: "FIRE"
            },
            {
                name: "Life Upgrade",
                description: "Increase maximum lives",
                cost: 50, // Will be dynamically updated
                purchased: false,
                icon: "LIFE"
            },
            {
                name: "Continue",
                description: "Respawn and continue playing",
                cost: 0,
                purchased: false,
                icon: "PLAY"
            }
        ];
    }

    updateLifeUpgradeItem(player) {
        const lifeItem = this.items[1]; // Life Upgrade item
        
        switch (player.lifeUpgradeLevel) {
            case 0:
                // Player has 2 lives, can upgrade to 3 for 30 gems
                lifeItem.name = "Life Upgrade I";
                lifeItem.description = "Upgrade to 3 lives (2 -> 3)";
                lifeItem.cost = 30;
                lifeItem.purchased = false;
                break;
            case 1:
                // Player has 3 lives, can upgrade to 4 for 60 gems
                lifeItem.name = "Life Upgrade II";
                lifeItem.description = "Upgrade to 4 lives (3 -> 4)";
                lifeItem.cost = 60;
                lifeItem.purchased = false;
                break;
            case 2:
                // Player has 4 lives, can upgrade to 5 for 90 gems
                lifeItem.name = "Life Upgrade III";
                lifeItem.description = "Upgrade to 5 lives (4 -> 5)";
                lifeItem.cost = 90;
                lifeItem.purchased = false;
                break;
            case 3:
            default:
                // Player has max lives (5)
                lifeItem.name = "Life Upgrade";
                lifeItem.description = "Maximum lives reached (5)";
                lifeItem.cost = 0;
                lifeItem.purchased = true;
                break;
        }
    }

    open() {
        this.isOpen = true;
        this.selectedItem = 0;
    }

    openWithPlayer(player) {
        this.isOpen = true;
        this.selectedItem = 0;
        this.updateLifeUpgradeItem(player);
    }

    close() {
        this.isOpen = false;
    }

    selectNext() {
        this.selectedItem = (this.selectedItem + 1) % this.items.length;
    }

    selectPrevious() {
        this.selectedItem = (this.selectedItem - 1 + this.items.length) % this.items.length;
    }

    canPurchase(playerGems) {
        const item = this.items[this.selectedItem];
        return playerGems >= item.cost && !item.purchased;
    }

    purchase(player) {
        const item = this.items[this.selectedItem];
        
        if (item.name === "Continue") {
            // Continue is always "purchasable" (free)
            return true;
        }
        
        if (this.canPurchase(player.gems)) {
            player.gems -= item.cost;
            item.purchased = true;
            
            // Apply power-up immediately
            if (item.name === "Fast Fireball") {
                player.hasFastFireball = true;
                player.fireCooldown = 7000; // 7 seconds
            } else if (item.name.startsWith("Life Upgrade")) {
                // Upgrade the life level and apply immediately
                player.lifeUpgradeLevel++;
                
                // Apply the new life count based on upgrade level
                switch (player.lifeUpgradeLevel) {
                    case 1:
                        player.lives = 3; // First upgrade: 2 -> 3 lives
                        break;
                    case 2:
                        player.lives = 4; // Second upgrade: 3 -> 4 lives
                        break;
                    case 3:
                        player.lives = 5; // Third upgrade: 4 -> 5 lives
                        break;
                }
            }
            
            return true; // Purchase successful
        }
        
        return false; // Purchase failed (not enough gems)
    }

    // Helper function to create gradient
    createGradient(ctx, x, y, width, height, color1, color2) {
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    }

    // Helper function to draw rounded rectangle
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    draw(ctx, canvasWidth, canvasHeight, playerGems) {
        if (!this.isOpen) return;

        ctx.save();

        // Disable anti-aliasing for pixel art look
        ctx.imageSmoothingEnabled = false;

        // Magical background with deep reds and oranges
        ctx.fillStyle = "#1a0a0a";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Create a magical dithered pattern with fiery colors
        const patternSize = 8;
        ctx.fillStyle = "#2d1b1b";
        for (let x = 0; x < canvasWidth; x += patternSize * 2) {
            for (let y = 0; y < canvasHeight; y += patternSize * 2) {
                ctx.fillRect(x, y, patternSize, patternSize);
                ctx.fillRect(x + patternSize, y + patternSize, patternSize, patternSize);
            }
        }

        // Add magical floating runes and sparkles with fiery colors
        const time = Date.now() * 0.001;
        const colors = ["#ff4500", "#ff6b35", "#ff8c42", "#ffa500", "#ffd700"];
        
        for (let i = 0; i < 40; i++) {
            const x = Math.floor((Math.sin(time + i * 0.5) * 0.4 + 0.5) * canvasWidth / 4) * 4;
            const y = Math.floor((Math.cos(time * 0.7 + i * 0.3) * 0.4 + 0.5) * canvasHeight / 4) * 4;
            const colorIndex = Math.floor((Math.sin(time + i) + 1) * 2.5) % colors.length;
            ctx.fillStyle = colors[colorIndex];
            
            // Draw magical symbols (stars, diamonds, crosses)
            const symbol = i % 4;
            if (symbol === 0) {
                // Star
                ctx.fillRect(x, y - 4, 4, 4);
                ctx.fillRect(x - 4, y, 4, 4);
                ctx.fillRect(x + 4, y, 4, 4);
                ctx.fillRect(x, y + 4, 4, 4);
                ctx.fillRect(x, y, 4, 4);
            } else if (symbol === 1) {
                // Diamond
                ctx.fillRect(x, y - 8, 4, 4);
                ctx.fillRect(x - 4, y - 4, 4, 4);
                ctx.fillRect(x + 4, y - 4, 4, 4);
                ctx.fillRect(x, y, 4, 4);
            } else if (symbol === 2) {
                // Cross/Plus
                ctx.fillRect(x, y - 4, 4, 12);
                ctx.fillRect(x - 4, y, 12, 4);
            } else {
                // Simple sparkle
                ctx.fillRect(x, y, 4, 4);
            }
        }

        // Magical shop title with fiery styling
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Title with magical glow effect (multiple layers)
        ctx.font = "bold 48px monospace";
        // Outer glow
        ctx.fillStyle = "#8b0000";
        ctx.fillText("ARCANE EMPORIUM", canvasWidth / 2 + 3, 103);
        ctx.fillText("ARCANE EMPORIUM", canvasWidth / 2 - 3, 103);
        ctx.fillText("ARCANE EMPORIUM", canvasWidth / 2, 106);
        ctx.fillText("ARCANE EMPORIUM", canvasWidth / 2, 94);
        // Main title
        ctx.fillStyle = "#ff6b35";
        ctx.fillText("ARCANE EMPORIUM", canvasWidth / 2, 100);

        // Magical gems display with fiery styling
        const gemBoxWidth = 320;
        const gemBoxHeight = 60;
        const gemBoxX = canvasWidth / 2 - gemBoxWidth / 2;
        const gemBoxY = 150;

        // Magical gem box with fiery border
        ctx.fillStyle = "#4a1a1a";
        ctx.fillRect(gemBoxX, gemBoxY, gemBoxWidth, gemBoxHeight);
        
        // Enchanted border with fiery colors
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(gemBoxX - 3, gemBoxY - 3, gemBoxWidth + 6, 3); // top
        ctx.fillRect(gemBoxX - 3, gemBoxY + gemBoxHeight, gemBoxWidth + 6, 3); // bottom
        ctx.fillRect(gemBoxX - 3, gemBoxY - 3, 3, gemBoxHeight + 6); // left
        ctx.fillRect(gemBoxX + gemBoxWidth, gemBoxY - 3, 3, gemBoxHeight + 6); // right
        
        // Inner magical glow
        ctx.fillStyle = "#ff8c42";
        ctx.fillRect(gemBoxX - 1, gemBoxY - 1, gemBoxWidth + 2, 1); // top inner
        ctx.fillRect(gemBoxX - 1, gemBoxY + gemBoxHeight, gemBoxWidth + 2, 1); // bottom inner
        ctx.fillRect(gemBoxX - 1, gemBoxY - 1, 1, gemBoxHeight + 2); // left inner
        ctx.fillRect(gemBoxX + gemBoxWidth, gemBoxY - 1, 1, gemBoxHeight + 2); // right inner

        // Magical gem text
        ctx.font = "bold 24px monospace";
        ctx.fillStyle = "#ffa500";
        ctx.fillText(`MYSTICAL GEMS: ${playerGems}`, canvasWidth / 2, gemBoxY + gemBoxHeight / 2);

        // Magical shop items
        const startY = 240;
        const itemHeight = 120;
        const itemWidth = 620;
        const itemX = canvasWidth / 2 - itemWidth / 2;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const y = startY + i * itemHeight;
            const isSelected = i === this.selectedItem;
            const canAfford = playerGems >= item.cost;
            const isPurchased = item.purchased;

            // Magical item background
            if (isSelected) {
                // Selected item with magical aura
                ctx.fillStyle = "#660000";
                ctx.fillRect(itemX, y, itemWidth, 80);
                
                // Magical selected border (pulsing effect)
                const pulse = Math.sin(time * 3) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(255, 107, 53, ${pulse})`;
                ctx.fillRect(itemX - 2, y - 2, itemWidth + 4, 2); // top
                ctx.fillRect(itemX - 2, y + 80, itemWidth + 4, 2); // bottom
                ctx.fillRect(itemX - 2, y - 2, 2, 84); // left
                ctx.fillRect(itemX + itemWidth, y - 2, 2, 84); // right
                
                // Inner magical glow
                ctx.fillStyle = "#ff4500";
                ctx.fillRect(itemX - 1, y - 1, itemWidth + 2, 1);
                ctx.fillRect(itemX - 1, y + 80, itemWidth + 2, 1);
                ctx.fillRect(itemX - 1, y - 1, 1, 82);
                ctx.fillRect(itemX + itemWidth, y - 1, 1, 82);
            } else {
                // Normal magical item background
                ctx.fillStyle = "#4a1a1a";
                ctx.fillRect(itemX, y, itemWidth, 80);
                
                // Subtle magical border
                ctx.fillStyle = "#b22222";
                ctx.fillRect(itemX - 1, y - 1, itemWidth + 2, 1); // top
                ctx.fillRect(itemX - 1, y + 80, itemWidth + 2, 1); // bottom
                ctx.fillRect(itemX - 1, y - 1, 1, 82); // left
                ctx.fillRect(itemX + itemWidth, y - 1, 1, 82); // right
            }

            // Magical item icons
            const iconX = itemX + 20;
            const iconY = y + 15;
            
            if (item.icon === "FIRE") {
                // Magical fireball spell icon
                const fireColor = isPurchased ? "#4CAF50" : (canAfford ? "#ff4500" : "#666666");
                ctx.fillStyle = fireColor;
                // Magical flame pattern
                ctx.fillRect(iconX + 16, iconY + 8, 8, 8);
                ctx.fillRect(iconX + 12, iconY + 16, 8, 8);
                ctx.fillRect(iconX + 20, iconY + 16, 8, 8);
                ctx.fillRect(iconX + 8, iconY + 24, 8, 8);
                ctx.fillRect(iconX + 24, iconY + 24, 8, 8);
                ctx.fillRect(iconX + 16, iconY + 32, 8, 8);
                // Magical core
                ctx.fillStyle = isPurchased ? "#4CAF50" : (canAfford ? "#ffd700" : "#888888");
                ctx.fillRect(iconX + 16, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 12, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 20, iconY + 28, 8, 8);
            } else if (item.icon === "LIFE") {
                // Magical life essence icon (mystical heart)
                const lifeColor = isPurchased ? "#4CAF50" : (canAfford ? "#dc143c" : "#666666");
                ctx.fillStyle = lifeColor;
                // Mystical heart with magical aura
                ctx.fillRect(iconX + 8, iconY + 12, 8, 8);
                ctx.fillRect(iconX + 24, iconY + 12, 8, 8);
                ctx.fillRect(iconX + 4, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 28, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 8, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 16, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 24, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 12, iconY + 36, 8, 8);
                ctx.fillRect(iconX + 20, iconY + 36, 8, 8);
                ctx.fillRect(iconX + 16, iconY + 44, 8, 8);
                // Magical glow around heart
                ctx.fillStyle = isPurchased ? "#4CAF50" : (canAfford ? "#ff6b35" : "#444444");
                ctx.fillRect(iconX + 12, iconY + 16, 8, 8);
                ctx.fillRect(iconX + 20, iconY + 16, 8, 8);
                ctx.fillRect(iconX + 16, iconY + 32, 8, 8);
            } else if (item.icon === "PLAY") {
                // Magical portal/continue icon
                ctx.fillStyle = "#ff4500";
                // Magical portal design
                ctx.fillRect(iconX + 8, iconY + 12, 8, 8);
                ctx.fillRect(iconX + 24, iconY + 12, 8, 8);
                ctx.fillRect(iconX + 4, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 28, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 4, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 28, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 8, iconY + 36, 8, 8);
                ctx.fillRect(iconX + 24, iconY + 36, 8, 8);
                // Portal center
                ctx.fillStyle = "#ff8c42";
                ctx.fillRect(iconX + 12, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 20, iconY + 20, 8, 8);
                ctx.fillRect(iconX + 12, iconY + 28, 8, 8);
                ctx.fillRect(iconX + 20, iconY + 28, 8, 8);
                ctx.fillStyle = "#ffa500";
                ctx.fillRect(iconX + 16, iconY + 24, 8, 8);
            }

            // Magical item name
            ctx.font = "bold 24px monospace";
            ctx.fillStyle = isPurchased ? "#4CAF50" : (canAfford || item.cost === 0) ? "#ffa500" : "#b22222";
            ctx.textAlign = "left";
            ctx.fillText(item.name, itemX + 100, y + 25);

            // Magical cost display
            if (item.cost > 0) {
                ctx.font = "bold 20px monospace";
                ctx.fillStyle = isPurchased ? "#4CAF50" : (canAfford ? "#ffd700" : "#dc143c");
                ctx.textAlign = "right";
                if (isPurchased) {
                    ctx.fillText("ENCHANTED", itemX + itemWidth - 20, y + 25);
                } else {
                    ctx.fillText(`${item.cost} GEMS`, itemX + itemWidth - 20, y + 25);
                }
            } else {
                ctx.font = "bold 20px monospace";
                ctx.fillStyle = "#4CAF50";
                ctx.textAlign = "right";
                ctx.fillText("FREE MAGIC", itemX + itemWidth - 20, y + 25);
            }

            // Magical item description
            ctx.font = "16px monospace";
            ctx.fillStyle = "#ff8c42";
            ctx.textAlign = "left";
            ctx.fillText(item.description, itemX + 100, y + 50);

            // Magical selection indicator
            if (isSelected) {
                ctx.fillStyle = "#ffd700";
                // Magical rune arrow
                const arrowX = itemX - 30;
                const arrowY = y + 25;
                // Draw a magical rune-like arrow
                ctx.fillRect(arrowX, arrowY, 4, 4);
                ctx.fillRect(arrowX + 4, arrowY - 8, 4, 4);
                ctx.fillRect(arrowX + 4, arrowY + 8, 4, 4);
                ctx.fillRect(arrowX + 8, arrowY - 4, 4, 4);
                ctx.fillRect(arrowX + 8, arrowY + 4, 4, 4);
                ctx.fillRect(arrowX + 12, arrowY - 12, 4, 4);
                ctx.fillRect(arrowX + 12, arrowY + 12, 4, 4);
                ctx.fillRect(arrowX + 16, arrowY - 8, 4, 4);
                ctx.fillRect(arrowX + 16, arrowY + 8, 4, 4);
                ctx.fillRect(arrowX + 20, arrowY - 4, 4, 4);
                ctx.fillRect(arrowX + 20, arrowY + 4, 4, 4);
                ctx.fillRect(arrowX + 24, arrowY, 4, 4);
            }
        }

        // Magical instructions area
        const instructY = canvasHeight - 80;
        
        // Mystical instructions background
        ctx.fillStyle = "#4a1a1a";
        ctx.fillRect(0, instructY - 15, canvasWidth, 60);
        
        // Magical border
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(0, instructY - 16, canvasWidth, 1);

        // Enchanted instructions text
        ctx.font = "bold 18px monospace";
        ctx.fillStyle = "#ffa500";
        ctx.textAlign = "center";
        ctx.fillText("CAST W/S TO NAVIGATE - SPACE TO ENCHANT", canvasWidth / 2, instructY + 5);
        
        ctx.font = "14px monospace";
        ctx.fillStyle = "#ff8c42";
        ctx.fillText("YOUR SPIRIT HAS DEPARTED! ACQUIRE MAGICAL POWERS OR CONTINUE", canvasWidth / 2, instructY + 25);

        // Re-enable anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.restore();
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
    // Generate a random level 1 for the start of the game
    let level1Plan;
    if (typeof LevelGenerator !== 'undefined') {
        const generator = new LevelGenerator(28, 60, 1);
        level1Plan = generator.generate();
    } else {
        // Fallback to static level 1 if LevelGenerator is not available
        level1Plan = GAME_LEVELS[0];
    }
    
    game = new Game('playing', new Level(level1Plan), 1); // Start with random level 1
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

    // Handle pause functionality
    if (event.key === 'p' || event.key === 'P') {
        if (!game.showShop && !game.gameOver && !game.gameWon && !game.isTransitioning) {
            game.togglePause();
        }
        return;
    }

    // Handle quit to menu when paused
    if (event.key === 'q' || event.key === 'Q') {
        if (game.isPaused) {
            game.quitToMenu();
        }
        return;
    }

    // Handle shop navigation
    if (game.showShop) {
        if (event.key === 'w') {
            game.shop.selectPrevious();
        } else if (event.key === 's') {
            game.shop.selectNext();
        } else if (event.key === ' ') {
            game.handleShopPurchase();
        }
        return; // Don't process other keys while shop is open
    }

    // Don't process movement keys when paused
    if (game.isPaused) {
        return;
    }

    if (event.key == 'a') game.player.startMovement("left");
    if (event.key == 'd') game.player.startMovement("right");
    if (event.key == 's') game.player.crouch();
    if (event.key == 'e') game.player.fireFireball();
    // Jump handling is now done in Player.update() method with proper ground checking
    
    // Restart game when R is pressed and game is over or won
    if (event.key == 'r' && (game.gameOver || game.gameWon)) {
        // Reset game state
        frameStart = undefined;
        cameraY = 0;
        
        // Generate a new random level 1 for restart
        let level1Plan;
        if (typeof LevelGenerator !== 'undefined') {
            const generator = new LevelGenerator(28, 60, 1);
            level1Plan = generator.generate();
        } else {
            // Fallback to static level 1 if LevelGenerator is not available
            level1Plan = GAME_LEVELS[0];
        }
        
        // Create new game instance starting from random level 1
        game = new Game('playing', new Level(level1Plan), 1);
    }
}

function handleKeyUp(event) {
    keyState[event.key] = false;

    // Don't process movement keys while shop is open
    if (game.showShop) {
        return;
    }

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
        // Debug logging for background issues
        if (game) {
            console.log(`Background debug - Level: ${game.currentLevel}, Loaded: ${game.backgroundLoaded}, Image exists: ${!!game.backgroundImage}, Complete: ${game.backgroundImage ? game.backgroundImage.complete : 'N/A'}`);
        }
        
        // Fallback background color based on current level
        if (game && game.currentLevel === 1) {
            // Level 1: Green/brown nature theme
            ctx.fillStyle = "#87CEEB"; // Sky blue
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else if (game && game.currentLevel === 2) {
            // Level 2: Sky/cloud theme
            ctx.fillStyle = "#87CEFA"; // Light sky blue
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else if (game && game.currentLevel === 3) {
            // Level 3: Lava/volcanic theme
            ctx.fillStyle = "#2F1B14"; // Dark brown/volcanic
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else if (game && game.currentLevel === 4) {
            // Level 4: Final boss theme
            ctx.fillStyle = "#1C1C1C"; // Dark gray
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else {
            // Default fallback
            ctx.fillStyle = "#87CEEB";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    }
    
    if (game) {
        game.update(deltaTime);
        game.draw(ctx, scale);
    } else {
        console.error("Game instance is null or undefined");
    }

    frameStart = frameTime;
    requestAnimationFrame(updateCanvas);
}

main();



