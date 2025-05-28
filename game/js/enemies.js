class Barrel extends GameObject {
    constructor(color, width, height, x, y, type) {
        super(color || "brown", width, height, x, y, type || "barrel");
        this.velocity = new Vec(0.003, 0); // Reduced velocity for smoother movement
        this.moveDistance = 3;
        this.startX = x;
        this.direction = 1; // 1 der, -1 izq
    }

    update(level, deltaTime) {

        // Comprueba colisión
        let TouchingFloor = level.contact(this.position, this.size, "wall");
        //console.log("floor:", TouchingFloor);



        if (!TouchingFloor) {
            this.velocity.y += gravity * deltaTime;
        }else{
            this.velocity.y = 0;

        }
        

        let nextX = this.position.x + this.velocity.x * deltaTime;
        let nextY = this.position.y + this.velocity.y * deltaTime;
        


        // Check if next position would be within bounds
        if (nextX < 0 || nextX > level.width - this.size.x) {
            this.velocity.x *= -1;
            this.direction *= -1;
            return;
        }

        let newPos = new Vec(nextX, nextY);

        /* Temporalmente es comentario, ya que no funciona
        // Check for wall collision
        let wallHit = level.contact(newPos, this.size, "wall");
        console.log("wall:", wallHit);


        if (wallHit) {
            this.velocity.x *= -1;
            this.direction *= -1;
        }
        else{
            this.position = newPos;
        }
            */
           this.position = newPos;

    }

    draw(ctx, scale) {
        // Cuerpo
        ctx.fillStyle = "brown";
        ctx.fillRect(
            this.position.x * scale,
            this.position.y * scale,
            this.size.x * scale,
            this.size.y * scale
        );
    }
}


class Enemy extends AnimatedObject {
    constructor(color, width, height, x, y, type) {
        super(color || "blue", width, height, x, y, type || "enemy");
        this.velocity = new Vec(0.003, 0); // Reduced velocity for smoother movement
        this.moveDistance = 3;
        this.startX = x;
        this.direction = 1; // 1 for right, -1 for left
        
        // Set up sprite animation
        this.setSprite('../assets/figure/Orc/Orc1/Orc1_walk/orc1_walk_full.png', new Rect(0, 0, 64, 64));
        this.sheetCols = 6; // 6 frames per row
        
        // Start with right movement animation (4th row = row 3, 0-indexed)
        this.setAnimation(18, 23, true, 150); // Row 3 (4th row) frames 18-23 for right movement
    }

    update(level, deltaTime) {
        // Calculate next position
        let nextX = this.position.x + this.velocity.x * deltaTime;
        
        // Check if next position would be within bounds
        if (nextX < 0 || nextX > level.width - this.size.x) {
            this.velocity.x *= -1;
            this.direction *= -1;
            this.updateAnimation();
            return;
        }

        let newPos = new Vec(nextX, this.position.y);

        // Check for wall collision (but allow crossing ladders)
        let wallHit = level.contact(newPos, this.size, "wall");

        // Check for floor (enemies can walk over ladders)
        let footX = this.position.x + (this.direction > 0 ? this.size.x : 0);
        let footY = this.position.y + this.size.y + 0.1;
        let hasFloor = level.contact(new Vec(footX, footY), new Vec(0.1, 0.1), "wall") || 
                       level.contact(new Vec(footX, footY), new Vec(0.1, 0.1), "ladder");

        if (wallHit || !hasFloor) {
            this.velocity.x *= -1;
            this.direction *= -1;
            this.updateAnimation();
        } else {
            this.position = newPos;
        }
        
        // Update animation frame
        this.updateFrame(deltaTime);
    }
    
    updateAnimation() {
        // Update animation based on direction
        if (this.direction === 1) {
            // Moving right - use 4th row (row 3, 0-indexed) frames 18-23
            this.setAnimation(18, 23, true, 150);
        } else {
            // Moving left - use 3rd row (row 2, 0-indexed) frames 12-17
            this.setAnimation(12, 17, true, 150);
        }
    }

    draw(ctx, scale) {
        // Draw the animated sprite larger than the hitbox
        if (this.spriteImage && this.spriteRect) {
            const spriteScale = 2.5; // Make sprite much larger (2.5x)
            const offsetX = (this.size.x * (spriteScale - 1)) / 2; // Center the larger sprite
            const offsetY = (this.size.y * (spriteScale - 1)) / 2;
            
            ctx.drawImage(this.spriteImage,
                          this.spriteRect.x * this.spriteRect.width,
                          this.spriteRect.y * this.spriteRect.height,
                          this.spriteRect.width, this.spriteRect.height,
                          (this.position.x - offsetX) * scale, 
                          (this.position.y - offsetY) * scale,
                          this.size.x * scale * spriteScale, 
                          this.size.y * scale * spriteScale);
        }
    }
}

class Minotaur extends AnimatedObject {
    constructor(color, width, height, x, y, type) {
        super(color || "red", width, height, x, y, type || "minotaur");
        this.velocity = new Vec(0.002, 0); // Base patrol speed (decreased from 0.003)
        this.rushSpeed = 0.006; // Faster speed when rushing (decreased from 0.009)
        this.patrolSpeed = 0.002; // Normal patrol speed (decreased from 0.003)
        this.moveDistance = 3;
        this.startX = x;
        this.direction = 1; // 1 for right, -1 for left
        this.state = 'patrol'; // States: patrol, rush, wait
        this.waitTimer = 0;
        this.waitDuration = 2000; // 2 seconds in milliseconds
        this.detectionRange = 5; // Range to detect player
        
        // Set up sprite animation with correct frame size
        this.setSprite('../assets/figure/Minotaur/Minotaur - Sprite Sheet.png', new Rect(0, 0, 96, 96));
        this.sheetCols = 8; // 8 frames per row based on the sprite sheet
        
        // Start with right movement animation (rows 1-2, using row 1 first)
        this.setAnimation(0, 7, true, 120); // Row 1 (frames 0-7) for right movement
    }

    update(level, deltaTime, player = null) {
        // Check for player detection
        if (this.state === 'patrol' && player && !player.isDead) {
            const distanceToPlayer = Math.abs(this.position.x - player.position.x);
            const sameHeight = Math.abs(this.position.y - player.position.y) < 2;
            const playerInDirection = (this.direction === 1 && player.position.x > this.position.x) ||
                                    (this.direction === -1 && player.position.x < this.position.x);

            if (distanceToPlayer < this.detectionRange && sameHeight && playerInDirection) {
                this.state = 'rush';
                this.velocity.x = this.direction * this.rushSpeed;
                this.updateAnimation(); // Update animation for rush state
            }
        }

        // State machine
        switch (this.state) {
            case 'patrol':
                this.updatePatrol(level, deltaTime);
                break;
            case 'rush':
                this.updateRush(level, deltaTime);
                break;
            case 'wait':
                this.updateWait(deltaTime);
                break;
        }

        // Calculate next position (horizontal movement only)
        let nextX = this.position.x + this.velocity.x * deltaTime;
        
        // Check if next position would be within bounds
        if (nextX < 0 || nextX > level.width - this.size.x) {
            if (this.state === 'rush') {
                this.state = 'wait';
                this.waitTimer = 0;
                this.velocity.x = 0;
            } else {
                this.velocity.x *= -1;
                this.direction *= -1;
                this.updateAnimation();
            }
            return;
        }

        let newPos = new Vec(nextX, this.position.y);

        // Check for wall collision (but allow crossing ladders)
        let wallHit = level.contact(newPos, this.size, "wall");
        
        // Check for floor ahead (minotaurs can walk over ladders)
        let footX = this.position.x + (this.direction > 0 ? this.size.x : 0);
        let footY = this.position.y + this.size.y + 0.1;
        let hasFloor = level.contact(new Vec(footX, footY), new Vec(0.1, 0.1), "wall") || 
                       level.contact(new Vec(footX, footY), new Vec(0.1, 0.1), "ladder");

        if (wallHit || !hasFloor) {
            if (this.state === 'rush') {
                this.state = 'wait';
                this.waitTimer = 0;
                this.velocity.x = 0;
            } else {
                this.velocity.x *= -1;
                this.direction *= -1;
                this.updateAnimation();
            }
        } else {
            this.position = newPos;
        }
        
        // Update animation frame
        this.updateFrame(deltaTime);
    }

    updatePatrol(level, deltaTime) {
        // Basic patrol behavior
        let nextX = this.position.x + this.velocity.x * deltaTime;
        
        // Check if next position would be within bounds
        if (nextX < 0 || nextX > level.width - this.size.x) {
            this.velocity.x *= -1;
            this.direction *= -1;
            this.updateAnimation();
        }
    }

    updateRush(level, deltaTime) {
        // Rush behavior uses faster animation
        // Animation is already updated when entering rush state
    }

    updateWait(deltaTime) {
        this.waitTimer += deltaTime;
        if (this.waitTimer >= this.waitDuration) {
            this.state = 'patrol';
            this.velocity.x = this.direction * this.patrolSpeed;
            this.updateAnimation();
        }
    }
    
    updateAnimation() {
        // Update animation based on direction - use rush frames for both states
        if (this.direction === 1) {
            // Moving right - use row 2 (frames 8-15) for all right movement
            const animSpeed = this.state === 'rush' ? 80 : 120; // Faster animation for rush
            this.setAnimation(8, 15, true, animSpeed);
        } else {
            // Moving left - use row 12 (frames 88-95) for all left movement
            const animSpeed = this.state === 'rush' ? 80 : 120; // Faster animation for rush
            this.setAnimation(88, 95, true, animSpeed);
        }
    }

    draw(ctx, scale) {
        // Draw the animated sprite larger than the hitbox
        if (this.spriteImage && this.spriteRect) {
            const spriteScale = 2.5; // Make sprite much larger (2.5x)
            const offsetX = (this.size.x * (spriteScale - 1)) / 2; // Center the larger sprite
            const offsetY = (this.size.y * (spriteScale - 1)) / 2;
            
            ctx.drawImage(this.spriteImage,
                          this.spriteRect.x * this.spriteRect.width,
                          this.spriteRect.y * this.spriteRect.height,
                          this.spriteRect.width, this.spriteRect.height,
                          (this.position.x - offsetX) * scale, 
                          (this.position.y - offsetY) * scale,
                          this.size.x * scale * spriteScale, 
                          this.size.y * scale * spriteScale);
        }
    }
}

class BarrelSpawner extends GameObject {
    constructor(x, y) {
        super("transparent", 1, 1, x, y, "spawner");
        this.spawnTimer = Math.random()*3000;
        this.spawnInterval = 10000; // Spawn a barrel every 2 seconds
        this.maxBarrels = 15; // Maximum number of barrels this spawner can have
        this.activeBarrels = [];
        console.log("Spawner generated")
    }

    update(level, deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;

        // Clean up destroyed barrels from our tracking list
        //this.activeBarrels = this.activeBarrels.filter(barrel => level.actors.includes(barrel));

        // Check if it's time to spawn a new barrel
        if (this.spawnTimer >= this.spawnInterval && this.activeBarrels.length < this.maxBarrels) {
            // Create new barrel
            const barrel = new Barrel("brown", 1, 1, this.position.x, this.position.y, "barrel");
            this.activeBarrels.push(barrel);
            game.actors.push(barrel);
            this.spawnTimer = 0; // Reset timer
        }
    }

    draw(ctx, scale) {
        //ctx.fillStyle = "black";
        //ctx.fillRect(this.position.x*scale, this.position.y*scale,1*scale,1*scale);
    }
}

