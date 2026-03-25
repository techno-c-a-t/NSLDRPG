import { World } from './world.js';
import { Player } from './player.js';
import { keys } from './input.js';
import { CONFIG } from './engine.js';

const world = new World();
let player;
let token = '';

async function init() {
    await world.loadObjects();
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token') || Math.random().toString(36).substr(2, 8);
    if (!urlParams.get('token')) window.history.replaceState({}, '', `?token=${token}`);
    
    const saved = localStorage.getItem('save_' + token);
    const startPos = saved ? JSON.parse(saved) : { x: 120, y: 120 };
    player = new Player(startPos.x, startPos.y);
    requestAnimationFrame(loop);
}

function loop() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    player.update(world);

    // Проверка углов для эффектов
    const corners = [
        {x: player.x, y: player.y},
        {x: player.x + CONFIG.PLAYER_W - 1, y: player.y},
        {x: player.x, y: player.y + CONFIG.PLAYER_H - 1},
        {x: player.x + CONFIG.PLAYER_W - 1, y: player.y + CONFIG.PLAYER_H - 1}
    ];
    let found = [];
    corners.forEach(c => found.push(...world.getAllEffectsAt(c.x, c.y)));
    const activeEff = world.resolvePriority(found);

    const prompt = document.getElementById('interaction-prompt');
    if (activeEff && activeEff.type === 'active') {
        prompt.classList.remove('hidden');
        if (keys.Space) player.color = activeEff.color || player.color;
    } else { prompt.classList.add('hidden'); }

    // HUD
    document.getElementById('pos-val').innerText = `${Math.round(player.x)}, ${Math.round(player.y)}`;
    document.getElementById('token-val').innerText = CONFIG.tmp;

    // Отрисовка
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight) / CONFIG.VIEW_MIN));
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    const cx = (player.x + (player.targetX - player.x) * player.progress + CONFIG.PLAYER_W/2) * CONFIG.CHUNK;
    const cy = (player.y + (player.targetY - player.y) * player.progress + CONFIG.PLAYER_H/2) * CONFIG.CHUNK;
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    // Внутри loop() в main.js

    // Рисуем мир, передавая углы игрока для расчета хайлайта
    world.draw(ctx, player.x, player.y, corners);
    player.draw(ctx);
    ctx.restore();

    requestAnimationFrame(loop);
}
init();