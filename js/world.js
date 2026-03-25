import { CONFIG } from './engine.js';

export class World {
    constructor() { this.objects = []; }

    async loadObjects() {
        const res = await fetch('./data/objects.json');
        const data = await res.json();
        this.objects = data.objects;
    }

    // Внутри класса World (world.js)
    getAllEffectsAt(x, y) {
        let found = [];
        this.objects.forEach(obj => {
            // Базовая точка — это начало КОЛЛАЙДЕРА, а не спрайта
            const colX = obj.x + (obj.collision.ox || 0);
            const colY = obj.y + (obj.collision.oy || 0);

            obj.effects.forEach(eff => {
                // Границы эффекта строятся вокруг коллайдера
                const minX = colX - eff.radius;
                const minY = colY - eff.radius;
                const maxX = colX + obj.collision.w + eff.radius - 1;
                const maxY = colY + obj.collision.h + eff.radius - 1;

                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    found.push({ ...eff, obj });
                }
            });
        });
        return found;
    }
    resolvePriority(effects) {
        if (!effects || effects.length === 0) return null;
        return effects.sort((a, b) => {
            if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
            return a.type === 'passive' ? -1 : 1;
        })[0];
    }

    checkCollision(px, py, pw, ph) {
        return this.objects.some(o => {
            // Координаты коллайдера объекта со смещением
            const ocx = o.x + o.collision.ox;
            const ocy = o.y + o.collision.oy;

            return px < ocx + o.collision.w &&
                px + pw > ocx &&
                py < ocy + o.collision.h &&
                py + ph > ocy;
        });
    }

    draw(ctx, px, py, playerCorners) {
        // 1. Отрисовка сетки во всем вьюпорте (чтобы не было пустых черных дыр)
        const range = 40;
        for (let x = Math.floor(px - range); x < px + range; x++) {
            for (let y = Math.floor(py - range); y < py + range; y++) {
                if (x < 0 || x >= CONFIG.WORLD_SIZE || y < 0 || y >= CONFIG.WORLD_SIZE) continue;

                // Шахматка
                if ((x + y) % 2 === 0) {
                    ctx.fillStyle = '#0d0d0d';
                    ctx.fillRect(x * CONFIG.CHUNK, y * CONFIG.CHUNK, CONFIG.CHUNK, CONFIG.CHUNK);
                }

                // Эффекты
                const effs = this.getAllEffectsAt(x, y);
                if (effs.length > 0) {
                    let r = 0, g = 0;
                    effs.forEach(e => {
                        if (e.type === 'active') r = 125;
                        if (e.type === 'passive') g = 125;
                    });
                    ctx.fillStyle = `rgba(${r}, ${g}, 0, 0.3)`;
                    ctx.fillRect(x * CONFIG.CHUNK, y * CONFIG.CHUNK, CONFIG.CHUNK, CONFIG.CHUNK);
                }
            }
        }

        // 2. Отрисовка объектов с эффектом Highlight
        this.objects.forEach(o => {
            // Проверка Highlight по пассивной зоне (считаем от центра коллайдера объекта)
            let isHigh = false;
            playerCorners.forEach(c => {
                const d = this.getAllEffectsAt(c.x, c.y);
                if (d.some(e => e.obj.id === o.id && e.action === 'highlight')) isHigh = true;
            });

            ctx.globalAlpha = isHigh ? 1.0 : 0.4;

            // 1. Рисуем спрайт (используем o.sprite.w/h из JSON)
            ctx.fillStyle = o.color;
            ctx.fillRect(o.x * CONFIG.CHUNK, o.y * CONFIG.CHUNK, o.sprite.w * CONFIG.CHUNK, o.sprite.h * CONFIG.CHUNK);

            // 2. ДЕБАГ: Рисуем коллайдер объекта (синяя рамка)

            ctx.strokeStyle = "blue";
            ctx.strokeRect(
                (o.x + o.collision.ox) * CONFIG.CHUNK,
                (o.y + o.collision.oy) * CONFIG.CHUNK,
                o.collision.w * CONFIG.CHUNK,
                o.collision.h * CONFIG.CHUNK
            );


            ctx.globalAlpha = 1.0;
        });
    }
}