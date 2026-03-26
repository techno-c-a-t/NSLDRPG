import { CONFIG } from './config.js';
import { keys } from './input.js';

export class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.targetX = x; this.targetY = y;
        this.isMoving = true;
        this.progress = 0;
        this.sprite = new Image();
        this.sprite.src = CONFIG.SPRITE_PATH;
        this.frameX = 0;
        this.frameY = 0;
        this.animTimer = 0;
        this.sW = CONFIG.SPRITE_W;
        this.sH = CONFIG.SPRITE_H;
        this.lastFrameId = "";
    }

    // update(world) {
    //     const baseSpeed = CONFIG.MOVE_SPEED;
    //     const currentSpeed = keys.Shift ? baseSpeed * 2 : baseSpeed;
    //     const animationSpeed = keys.Shift ? CONFIG.ANIM_SPEED * 2 : CONFIG.ANIM_SPEED;

    //     // 1. Накапливаем прогресс за текущий кадр
    //     this.progress += currentSpeed;

    //     // 2. Цикл обработки "шагов". Если скорость > 1, мы можем пройти несколько чанков за кадр
    //     while (this.progress >= 1) {
    //         // Мы физически прибыли в целевой чанк
    //         this.x = this.targetX;
    //         this.y = this.targetY;

    //         // Считаем остаток (тот самый delta)
    //         this.progress -= 1;

    //         // Проверяем ввод для СЛЕДУЮЩЕГО шага
    //         let dx = 0, dy = 0;
    //         if (keys.W) dy = -1;
    //         if (keys.S) dy = 1;
    //         if (keys.A) dx = -1;
    //         if (keys.D) dx = 1;

    //         const anyMoveKey = (dx !== 0 || dy !== 0);

    //         if (anyMoveKey) {
    //             // Приоритет спрайта (Вертикаль > Горизонталь)
    //             if (dy > 0) this.frameY = 0;      // Вперед
    //             else if (dy < 0) this.frameY = 1; // Назад
    //             else if (dx > 0) this.frameY = 2; // Вправо (индекс 2)
    //             else if (dx < 0) this.frameY = 3; // Влево (индекс 3)

    //             // Проверка коллизии для следующего шага на 1 чанк
    //             let canMove = false;
    //             // 1. Пробуем диагональ
    //             if (this.canMoveTo(this.x + dx, this.y + dy, world)) {
    //                 this.targetX = this.x + dx; this.targetY = this.y + dy;
    //                 canMove = true;
    //             }
    //             // 2. Пробуем скольжение по Y
    //             else if (dy !== 0 && this.canMoveTo(this.x, this.y + dy, world)) {
    //                 this.targetY = this.y + dy;
    //                 canMove = true;
    //             }
    //             // 3. Пробуем скольжение по X
    //             else if (dx !== 0 && this.canMoveTo(this.x + dx, this.y, world)) {
    //                 this.targetX = this.x + dx;
    //                 canMove = true;
    //             }

    //             if (canMove) {
    //                 this.isMoving = true;
    //             } else {
    //                 // Уперлись в стену: сбрасываем прогресс, чтобы стоять ровно в чанке
    //                 this.isMoving = false;
    //                 this.progress = 0;
    //                 break;
    //             }
    //         } else {
    //             // Кнопки не нажаты: останавливаемся в текущем чанке
    //             this.isMoving = false;
    //             this.progress = 0;
    //             this.frameX = 0;
    //             this.animTimer = 0;
    //             break;
    //         }
    //     }

    //     // 3. Анимация крутится только если мы в процессе движения
    //     if (this.isMoving) {
    //         this.animTimer += animationSpeed;
    //         this.frameX = Math.floor(this.animTimer) % 4;
    //     }

    //     // ДЕБАГ ЛОГ
    //     const currentFrameId = `Row:${this.frameY}, Col:${this.frameX}`;
    //     if (currentFrameId !== this.lastFrameId) {
    //         console.log(`%c Sprite Change: ${currentFrameId} `, 'background: #222; color: #bada55');
    //         this.lastFrameId = currentFrameId;
    //     }
    // }


    update(world) {
        // 1. РАСЧЕТ СКОРОСТИ
        const baseSpeed = CONFIG.MOVE_SPEED;
        const currentSpeed = (keys.Shift ? baseSpeed * 2 : baseSpeed);
        const animSpeedMult = keys.Shift ? 2 : 1;

        // 2. АНИМАЦИЯ (крутим, если нажаты кнопки или всё еще едем)
        const anyMoveKey = keys.W || keys.S || keys.A || keys.D;
        if (anyMoveKey || this.isMoving) {
            this.animTimer += CONFIG.ANIM_SPEED * animSpeedMult;
            this.frameX = Math.floor(this.animTimer) % 4;
        } else {
            this.frameX = 0;
            this.animTimer = 0;
        }

        // 3. ПРОЦЕСС ДВИЖЕНИЯ (Смещение спрайта)
        if (this.isMoving) {
            this.progress += currentSpeed;
        }

        // 4. ПРОВЕРКА ПРИБЫТИЯ В ЧАНК
        if (this.progress >= 1) {
            // Мы дошли до цели. Сохраняем лишнюю скорость (остаток после 1.0)
            let overflow = this.progress - 1;

            this.x = this.targetX;
            this.y = this.targetY;
            this.progress = 0;
            this.isMoving = false;

            // Если кнопка всё еще зажата, "бесшовно" начинаем следующий шаг
            if (anyMoveKey) {
                this.startNextMove(world);
                if (this.isMoving) {
                    // Применяем накопленный остаток скорости к новому шагу
                    this.progress = overflow;
                }
            }
        }
        // Если мы стояли и нажали кнопку
        else if (!this.isMoving && anyMoveKey) {
            this.startNextMove(world);
        }

        // ДЕБАГ ЛОГ (только при смене кадра)
        const currentFrameId = `Row:${this.frameY}, Col:${this.frameX}`;
        if (currentFrameId !== this.lastFrameId) {
            console.log(`%c Sprite Change: ${currentFrameId} `, 'background: #222; color: #bada55');
            this.lastFrameId = currentFrameId;
        }
    }

    // Вынес логику поиска пути в отдельный метод внутри класса Player
    startNextMove(world) {
        let dx = 0, dy = 0;
        // Приоритет: Вертикаль > Горизонталь
        if (keys.W) { dy = -1; this.frameY = 1; }
        else if (keys.S) { dy = 1; this.frameY = 0; }
        else if (keys.A) { dx = -1; this.frameY = 2; }
        else if (keys.D) { dx = 1; this.frameY = 3; }

        // Проверка диагоналей (если зажато два направления)
        // Дополнительные проверки для плавности (если W+D)
        if (keys.W && keys.D) { dx = 1; dy = -1; this.frameY = 1; }
        if (keys.W && keys.A) { dx = -1; dy = -1; this.frameY = 1; }
        if (keys.S && keys.D) { dx = 1; dy = 1; this.frameY = 0; }
        if (keys.S && keys.A) { dx = -1; dy = 1; this.frameY = 0; }

        if (dx !== 0 || dy !== 0) {
            // Проверяем коллайдер по твоей новой функции (ноги)
            if (this.canMoveTo(this.x + dx, this.y + dy, world)) {
                this.targetX = this.x + dx;
                this.targetY = this.y + dy;
                this.isMoving = true;
            }
            // Скольжение вдоль стен
            else if (dy !== 0 && this.canMoveTo(this.x, this.y + dy, world)) {
                this.targetY = this.y + dy;
                this.isMoving = true;
            }
            else if (dx !== 0 && this.canMoveTo(this.x + dx, this.y, world)) {
                this.targetX = this.x + dx;
                this.isMoving = true;
            }
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

        // if (this.sprite.complete) {
            ctx.drawImage(
                this.sprite,
                Math.round(this.frameX * this.sW),
                Math.round(this.frameY * this.sH),
                Math.round(this.sW), 
                Math.round(this.sH),
                Math.round(rx), 
                Math.round(ry),
                CONFIG.PLAYER_W * CONFIG.CHUNK, 
                CONFIG.PLAYER_H * CONFIG.CHUNK
            );


        // }
    }
}
