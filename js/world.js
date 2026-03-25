import { CONFIG } from './engine.js';

export class World {
    constructor() {
        this.objects = [];
        this.assets = new Map(); // Кеш картинок: "путь" -> Image
    }

    async loadObjects() {
        const res = await fetch('./data/objects.json');
        const data = await res.json();
        this.objects = data.objects;

        // Автоматическая загрузка всех картинок из JSON
        const loadPromises = [];

        this.objects.forEach(obj => {
            if (obj.sprite && obj.sprite.url) {
                loadPromises.push(this.loadImage(obj.sprite.url));
            }
        });

        // Ждем, пока ВСЕ картинки загрузятся
        await Promise.all(loadPromises);
        console.log("Все ассеты мира загружены");
    }

    loadImage(url) {
        if (this.assets.has(url)) return Promise.resolve(); // Уже загружено

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.assets.set(url, img);
                resolve();
            };
            img.onerror = () => {
                console.error(`Ошибка загрузки ассета: ${url}`);
                resolve(); // Продолжаем работу даже при ошибке
            };
            img.src = url;
        });
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
        const range = 80;
        for (let x = Math.floor(px - range); x < px + range; x++) {
            for (let y = Math.floor(py - range); y < py + range; y++) {
                if (x < 0 || x >= CONFIG.WORLD_SIZE || y < 0 || y >= CONFIG.WORLD_SIZE) continue;

                // Шахматка
                if ((x + y) % 2 === 0) {
                    ctx.fillStyle = '#0d0d0d';
                    ctx.fillRect(x * CONFIG.CHUNK, y * CONFIG.CHUNK, CONFIG.CHUNK, CONFIG.CHUNK);
                }

                // Эффекты
                if (CONFIG.DEBUG == 1) {
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
        }

        // 2. Отрисовка объектов с эффектом Highlight
        this.objects.forEach(o => {
            // Логика Highlight (яркость)
            let isHigh = false;
            playerCorners.forEach(c => {
                const effs = this.getAllEffectsAt(Math.floor(c.x), Math.floor(c.y));
                if (effs.some(e => e.obj.id === o.id && e.action === 'highlight')) isHigh = true;
            });

            ctx.globalAlpha = 1.0; // isHigh ? 1.0 : 0.6; // Если нет хайлайта, делаем чуть тусклее

            // АВТОМАТИЧЕСКАЯ ОТРИСОВКА КАРТИНКИ
            const img = this.assets.get(o.sprite.url);

            if (img) {
                ctx.drawImage(
                    img,
                    o.x * CONFIG.CHUNK,
                    o.y * CONFIG.CHUNK,
                    o.sprite.w * CONFIG.CHUNK,
                    o.sprite.h * CONFIG.CHUNK
                );
            } else {
                // Фолбэк на цвет, если картинка не указана или не загрузилась
                ctx.fillStyle = o.color || "magenta";
                ctx.fillRect(
                    o.x * CONFIG.CHUNK,
                    o.y * CONFIG.CHUNK,
                    o.sprite.w * CONFIG.CHUNK,
                    o.sprite.h * CONFIG.CHUNK
                );
            }

            // Рендер коллайдера (опционально для дебага)
            if (CONFIG.DEBUG == 1) {
                ctx.strokeStyle = "blue";
                ctx.strokeRect(
                    (o.x + o.collision.ox) * CONFIG.CHUNK,
                    (o.y + o.collision.oy) * CONFIG.CHUNK,
                    o.collision.w * CONFIG.CHUNK,
                    o.collision.h * CONFIG.CHUNK
                );
            }

            ctx.globalAlpha = 1.0;
        });
    }
}