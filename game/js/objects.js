class Gem extends AnimatedObject {
    constructor(x, y) {
        // Use a smaller hitbox (1x1) but render larger
        super("yellow", 1, 1, x, y, "gem");
        
        // Load the animated gem sprite
        this.sprite = new Image();
        this.sprite.src = '../assets/Items/Gems/Gem Animations/gem_animation.png';
        
        // Set up correct animation properties
        this.frameCount = 4;  // Assuming 4 frames in the animation
        this.frameWidth = 16; // Typical frame width for these sprites
        this.frameHeight = 16; // Typical frame height
        this.animationSpeed = 200; // Milliseconds per frame
        
        // Initialize animation
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.setAnimation(0, this.frameCount - 1, true, this.animationSpeed);
    }
    
    update(level, deltaTime) {
        super.update(deltaTime);
        
        // Update animation frame
        this.animationTimer += deltaTime;
        if (this.animationTimer >= this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.animationTimer = 0;
        }
    }
    
    draw(ctx, scale) {
        if (this.sprite && this.sprite.complete) {
            // Visual size multiplier for bigger gems (2x bigger)
            const visualSizeMultiplier = 1.0;
            
            // Calculate the offset to center the visual larger gem on the hitbox
            const xOffset = (this.size.x * (visualSizeMultiplier - 1)) / 2;
            const yOffset = (this.size.y * (visualSizeMultiplier - 1)) / 2;
            
            // Draw the current animation frame with increased size
            ctx.drawImage(
                this.sprite,
                this.currentFrame * this.frameWidth, 0, // Source position
                this.frameWidth, this.frameHeight,      // Source dimensions
                (this.position.x - xOffset) * scale,    // Destination position x (centered)
                (this.position.y - yOffset) * scale,    // Destination position y (centered)
                this.size.x * scale * visualSizeMultiplier,   // Destination width (bigger)
                this.size.y * scale * visualSizeMultiplier    // Destination height (bigger)
            );
            
            // Debug hitbox visualization (uncomment to see hitbox)
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
        } else {
            // Fallback to a simple colored square if image isn't loaded
            ctx.fillStyle = "gold";
            ctx.fillRect(
                this.position.x * scale,
                this.position.y * scale,
                this.size.x * scale,
                this.size.y * scale
            );
        }
    }
}

class Fireball extends GameObject {
    constructor(x, y, direction) {
        super("red", 0.5, 0.5, x, y, "fireball");
        this.velocity = new Vec(direction * 0.02, 0); 
    }

    update(level, deltaTime) {
        let newPos = this.position.plus(this.velocity.times(deltaTime));
        
        // Check for wall collision
        if (level.contact(newPos, this.size, 'wall')) {
            // Remove fireball if it hits a wall
            game.actors = game.actors.filter(actor => actor !== this);
            return;
        }
        
        // Check for enemy collisions
        for (let actor of game.actors) {
            if ((actor.type === 'enemy' || actor.type === 'minotaur' || actor.type === 'barrel') && 
                this.checkCollision(actor)) {
                // Remove both the fireball and the enemy
                game.actors = game.actors.filter(item => item !== this && item !== actor);
                return;
            }
        }
        
        // Update position if no collision
        this.position = newPos;
        
        // Remove fireball if it goes off screen
        if (this.position.x < 0 || this.position.x > level.width) {
            game.actors = game.actors.filter(actor => actor !== this);
        }
    }
    
    checkCollision(other) {
        return this.position.x < other.position.x + other.size.x &&
               this.position.x + this.size.x > other.position.x &&
               this.position.y < other.position.y + other.size.y &&
               this.position.y + this.size.y > other.position.y;
    }

    draw(ctx, scale) {
        // Draw a more visible fireball
        ctx.fillStyle = "orange";
        ctx.fillRect(this.position.x * scale, this.position.y * scale, this.size.x * scale, this.size.y * scale);
        
        // Add a red center
        ctx.fillStyle = "red";
        const centerSize = this.size.x * 0.6;
        const offset = (this.size.x - centerSize) / 2;
        ctx.fillRect(
            (this.position.x + offset) * scale, 
            (this.position.y + offset) * scale, 
            centerSize * scale, 
            centerSize * scale
        );
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