import { CONFIG } from './engine.js';
import { keys } from './input.js';

export class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.targetX = x; this.targetY = y;
        this.isMoving = false;
        this.progress = 0;
        this.sprite = new Image();
        this.sprite.src = './assets/characters/player_sprite.png';
        this.frameX = 0;
        this.frameY = 0;
        this.animTimer = 0;
        this.sW = 748 / 4;
        this.sH = 1100 / 4;
        this.lastFrameId = "";
    }

    update(world) {
        const baseSpeed = CONFIG.MOVE_SPEED;
        const anination_speed = keys.Shift ? CONFIG.ANIM_SPEED * 2 : CONFIG.ANIM_SPEED;
        const currentSpeed = keys.Shift ? baseSpeed * 2 : baseSpeed;
        this.progress += currentSpeed;

        // АНИМАЦИЯ: крутим постоянно, пока движемся
        this.animTimer += anination_speed; // Умножаем на 2 для спокойной ходьбы
        this.frameX = Math.floor(this.animTimer) % 4;

        if (this.progress < 1) {
            return;
            // УДАЛИЛИ ОТСЮДА frameX = 0, чтобы не было мерцания в конце каждого чанка
        }
        // ПРОВЕРКА: Если мы НЕ двигаемся и НЕ жмем кнопки — сброс в IDLE
        const anyMoveKey = keys.W || keys.S || keys.A || keys.D;
        if (!anyMoveKey) {
            this.frameX = 0;
            this.animTimer = 0; // Сбрасываем таймер, чтобы следующий шаг начался с первой ноги
        }

        let delta = this.progress - Math.floor(this.progress);
        this.progress = Math.floor(this.progress);

        this.x = this.targetX;
        this.y = this.targetY;

        let dx = 0, dy = 0;
        if (keys.W) dy = -1 * this.progress;
        if (keys.S) dy = this.progress;
        if (keys.A) dx = -1 * this.progress;
        if (keys.D) dx = this.progress;

        this.progress = delta;
        if (dx !== 0 || dy !== 0) {
            // Приоритет спрайта
            if (dy > 0) this.frameY = 0;
            else if (dy < 0) this.frameY = 1;
            else if (dx > 0) this.frameY = 3;
            else if (dx < 0) this.frameY = 2;

            if (this.canMoveTo(this.x + dx, this.y + dy, world)) {
                this.targetX = this.x + dx; this.targetY = this.y + dy;
            } else if (dy !== 0 && this.canMoveTo(this.x, this.y + dy, world)) {
                this.targetY = this.y + dy;
            } else if (dx !== 0 && this.canMoveTo(this.x + dx, this.y, world)) {
                this.targetX = this.x + dx;
            }
        }

        // ДЕБАГ ЛОГ
        const currentFrameId = `Row:${this.frameY}, Col:${this.frameX}`;
        if (currentFrameId !== this.lastFrameId) {
            console.log(`%c Sprite Change: ${currentFrameId} `, 'background: #222; color: #bada55');
            this.lastFrameId = currentFrameId;
        }
    }

    getCorners() {

    // 1. Вычисляем текущие координаты коллайдера НОГ игрока в чанках
    const curX = this.x + (this.targetX - this.x) * this.progress;
    const curY = this.y + (this.targetY - this.y) * this.progress;

    const pColX = curX + CONFIG.P_COLL_OX;
    const pColY = curY + CONFIG.P_COLL_OY;

    // 2. Проверяем 4 угла именно этого маленького прямоугольника (ног)
        return [
        { x: pColX, y: pColY }, // верх-лево ног
        { x: pColX + CONFIG.P_COLL_W - 1, y: pColY }, // верх-право ног
        { x: pColX, y: pColY + CONFIG.P_COLL_H - 1 }, // низ-лево ног
        { x: pColX + CONFIG.P_COLL_W - 1, y: pColY + CONFIG.P_COLL_H - 1 } // низ-право ног
    ];
    }

    canMoveTo(nx, ny, world) {
        if (nx < 0 || nx > CONFIG.WORLD_SIZE - CONFIG.PLAYER_W ||
            ny < 0 || ny > CONFIG.WORLD_SIZE - CONFIG.PLAYER_H) return false;
        return !world.checkCollision(
            nx + CONFIG.P_COLL_OX, 
            ny + CONFIG.P_COLL_OY, 
            CONFIG.P_COLL_W,
            CONFIG.P_COLL_H);
    }

    draw(ctx) {
        const rx = (this.x + (this.targetX - this.x) * this.progress) * CONFIG.CHUNK;
        const ry = (this.y + (this.targetY - this.y) * this.progress) * CONFIG.CHUNK;

        if (this.sprite.complete) {
            ctx.drawImage(
                this.sprite,
                Math.round(this.frameX * this.sW),
                Math.round(this.frameY * this.sH),
                Math.round(this.sW), Math.round(this.sH),
                Math.round(rx), Math.round(ry),
                CONFIG.PLAYER_W * CONFIG.CHUNK, CONFIG.PLAYER_H * CONFIG.CHUNK
            );
        }
    }
}