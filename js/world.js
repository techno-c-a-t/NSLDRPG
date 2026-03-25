import { CONFIG } from './engine.js';

export class World {
    constructor() { this.objects = []; }

    async loadObjects() {
        const res = await fetch('./data/objects.json');
        const data = await res.json();
        this.objects = data.objects;
    }

    // Истина: проверяем конкретный чанк
    getAllEffectsAt(x, y) {
        let found = [];
        this.objects.forEach(obj => {
            obj.effects.forEach(eff => {
                if (x >= obj.x - eff.radius && x < obj.x + obj.collision.w + eff.radius &&
                    y >= obj.y - eff.radius && y < obj.y + obj.collision.h + eff.radius) {
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

    checkCollision(nx, ny, nw, nh) {
        return this.objects.some(o => nx < o.x + o.collision.w && nx + nw > o.x && ny < o.y + o.collision.h && ny + nh > o.y);
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
        this.objects.forEach(obj => {
            // Проверяем, находится ли игрок в зоне highlight этого объекта
            let isHighlighted = false;
            playerCorners.forEach(c => {
                const effs = this.getAllEffectsAt(c.x, c.y);
                if (effs.some(e => e.obj.id === obj.id && e.action === 'highlight')) {
                    isHighlighted = true;
                }
            });

            ctx.fillStyle = obj.color;
            ctx.globalAlpha = isHighlighted ? 1.0 : 0.4; // Вот тут меняется яркость
            
            // Тело объекта (квадрат)
            ctx.fillRect(obj.x * CONFIG.CHUNK, obj.y * CONFIG.CHUNK, obj.collision.w * CONFIG.CHUNK, obj.collision.h * CONFIG.CHUNK);
            
            // Маленький круг внутри для красоты (как ты просил: шар внутри прямоугольника)
            ctx.beginPath();
            ctx.arc((obj.x + 2) * CONFIG.CHUNK, (obj.y + 2) * CONFIG.CHUNK, 1.5 * CONFIG.CHUNK, 0, Math.PI*2);
            ctx.fillStyle = 'white';
            ctx.globalAlpha = isHighlighted ? 0.3 : 0.1;
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
        });
    }
}