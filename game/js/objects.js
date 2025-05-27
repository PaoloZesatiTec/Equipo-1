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
        const x = this.position.x * scale;
        const y = this.position.y * scale;
        const width = this.size.x * scale;
        const height = this.size.y * scale;

        // Draw ladder shadow first (for depth)
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(x + 2, y + 2, width, height);

        // Draw background (wall behind ladder)
        ctx.fillStyle = "#654321"; // Dark brown background
        ctx.fillRect(x, y, width, height);

        // Calculate ladder dimensions
        const railWidth = width * 0.15; // Side rails are 15% of total width
        const rungSpacing = height / 6; // 6 rungs per ladder block
        const rungThickness = 4;
        const rungWidth = width * 0.7; // Rungs span 70% of width
        const rungStartX = x + (width - rungWidth) / 2;

        // Draw left rail with gradient effect
        const leftRailGradient = ctx.createLinearGradient(x, y, x + railWidth, y);
        leftRailGradient.addColorStop(0, "#8B4513"); // Saddle brown
        leftRailGradient.addColorStop(0.5, "#A0522D"); // Sienna
        leftRailGradient.addColorStop(1, "#654321"); // Dark brown
        ctx.fillStyle = leftRailGradient;
        ctx.fillRect(x + railWidth * 0.5, y, railWidth, height);

        // Draw right rail with gradient effect
        const rightRailGradient = ctx.createLinearGradient(x + width - railWidth, y, x + width, y);
        rightRailGradient.addColorStop(0, "#654321"); // Dark brown
        rightRailGradient.addColorStop(0.5, "#A0522D"); // Sienna
        rightRailGradient.addColorStop(1, "#8B4513"); // Saddle brown
        ctx.fillStyle = rightRailGradient;
        ctx.fillRect(x + width - railWidth * 1.5, y, railWidth, height);

        // Draw rungs with 3D effect
        for (let i = 1; i <= 5; i++) {
            const rungY = y + (i * rungSpacing);
            
            // Rung shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.fillRect(rungStartX + 1, rungY + 1, rungWidth, rungThickness);
            
            // Main rung with gradient
            const rungGradient = ctx.createLinearGradient(rungStartX, rungY, rungStartX, rungY + rungThickness);
            rungGradient.addColorStop(0, "#D2B48C"); // Tan (highlight)
            rungGradient.addColorStop(0.5, "#A0522D"); // Sienna
            rungGradient.addColorStop(1, "#8B4513"); // Saddle brown (shadow)
            ctx.fillStyle = rungGradient;
            ctx.fillRect(rungStartX, rungY, rungWidth, rungThickness);

            // Rung highlight on top
            ctx.fillStyle = "#DEB887"; // Burlywood highlight
            ctx.fillRect(rungStartX, rungY, rungWidth, 1);
        }

        // Add some wood grain texture to rails
        ctx.strokeStyle = "rgba(101, 67, 33, 0.3)"; // Dark brown grain
        ctx.lineWidth = 1;
        
        // Left rail grain
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + railWidth * 0.5 + i * 2, y);
            ctx.lineTo(x + railWidth * 0.5 + i * 2, y + height);
            ctx.stroke();
        }
        
        // Right rail grain
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + width - railWidth * 1.5 + i * 2, y);
            ctx.lineTo(x + width - railWidth * 1.5 + i * 2, y + height);
            ctx.stroke();
        }

        // Add metal brackets at connection points (top and bottom)
        ctx.fillStyle = "#696969"; // Dim gray for metal
        
        // Top brackets
        ctx.fillRect(x + railWidth * 0.3, y + 2, railWidth * 0.4, 3);
        ctx.fillRect(x + width - railWidth * 0.7, y + 2, railWidth * 0.4, 3);
        
        // Bottom brackets
        ctx.fillRect(x + railWidth * 0.3, y + height - 5, railWidth * 0.4, 3);
        ctx.fillRect(x + width - railWidth * 0.7, y + height - 5, railWidth * 0.4, 3);

        // Add subtle highlight to the entire ladder
        ctx.strokeStyle = "rgba(222, 184, 135, 0.2)"; // Burlywood with transparency
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    }

    update() {
        // No behavior needed for static ladders
    }
}