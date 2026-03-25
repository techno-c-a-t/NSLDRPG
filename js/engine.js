export const CONFIG = {
    CHUNK: 8,
    WORLD_SIZE: 256, // 256 * 8 = 2048px
    VIEW_SIZE: 512,
    PLAYER_W: 5, // в чанках
    PLAYER_H: 8,  // в чанках
    MOVE_SPEED: 0.3,
    SPRITE_W: 748 / 4, // 187px
    SPRITE_H: 1100 / 4, // 275px
    ANIM_SPEED: 0.05,    // Скорость смены кадров
    P_COLL_W: 5,
    P_COLL_H: 4,  // Только 2 чанка высоты (ноги)
    P_COLL_OX: 0, // Без смещения по X вправо
    P_COLL_OY: 4,  // Смещение на 6 чанков вниз (8 - 2 = 6)
    DEBUG: 0,
    START_X: 120,
    START_Y: 120
};

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
    }

    resize() {
        const minSide = Math.min(window.innerWidth, window.innerHeight);
        // Целочисленное масштабирование (1x, 2x, 4x...)
        this.scale = Math.max(1, Math.floor(minSide / CONFIG.VIEW_SIZE));
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
    }

    draw(player, world) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        // Центрируем камеру на игроке
        const camX = Math.floor(this.canvas.width / 2 - (player.x * CONFIG.CHUNK + (CONFIG.PLAYER_W * CONFIG.CHUNK)/2) * this.scale);
        const camY = Math.floor(this.canvas.height / 2 - (player.y * CONFIG.CHUNK + (CONFIG.PLAYER_H * CONFIG.CHUNK)/2) * this.scale);
        
        this.ctx.translate(camX, camY);
        this.ctx.scale(this.scale, this.scale);

        world.draw(this.ctx);
        player.draw(this.ctx);
        
        this.ctx.restore();
    }
}