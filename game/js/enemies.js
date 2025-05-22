

class Barrel extends GameObject {
    constructor(color, width, height, x, y, type) {
        super(color || "brown", width, height, x, y, type || "barrel");
        this.velocity = new Vec(0.003, 0); // Reduced velocity for smoother movement
        this.moveDistance = 3;
        this.startX = x;
        this.direction = 1; // 1 for right, -1 for left
    }

    update(level, deltaTime) {

        // Check for floor
        let TouchingFloor = level.contact(this.position, this.size, "wall");
        console.log("floor:", TouchingFloor);




        // Calculate next position

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

        /*
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
        // Draw enemy body
        ctx.fillStyle = "brown";
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