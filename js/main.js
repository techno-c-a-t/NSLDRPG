import { World } from './world.js';
import { Player } from './player.js';
import { keys, initJoystick, updateUIVisibility } from './input.js';
import { CONFIG } from './engine.js';;
import { DialogueManager } from './dialogue.js';

const world = new World();
const dialogue = new DialogueManager();
let player;
let token = '';
let isPausedByIntro = false;

async function init() {
    await world.loadObjects();
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token') || Math.random().toString(36).substr(2, 8);
    if (!urlParams.get('token')) window.history.replaceState({}, '', `?token=${token}`);

    const saved = localStorage.getItem('save_' + token);
    const startPos = saved ? JSON.parse(saved) : { x: CONFIG.START_X, y: CONFIG.START_X };
    player = new Player(startPos.x, startPos.y);
    initJoystick(); // Включаем джойстик

    const introSeen = sessionStorage.getItem('intro_seen');
    const introOverlay = document.getElementById('intro-overlay');
    const closeBtn = document.getElementById('close-intro-btn');
    isPausedByIntro = true;
    introOverlay.classList.remove('hidden');

    closeBtn.addEventListener('click', () => {
        sessionStorage.setItem('intro_seen', 'true');
        introOverlay.classList.add('hidden');
        isPausedByIntro = false;
    });

    requestAnimationFrame(loop);
}


function loop() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const corners = player.getCorners()

    if (isPausedByIntro) {
        requestAnimationFrame(loop);
        return;
    }
    // 1. Блокируем обновление игрока, если идет разговор
    if (!dialogue.isActive) {
        player.update(world);
    } else {
        // В режиме диалога пробел/клик листает текст
        if (keys.Space) {
            keys.Space = false; // "Съедаем" нажатие, чтобы не листало сразу всё
            dialogue.next();
        }
    }


    let found = [];
    corners.forEach(c => {
        found.push(...world.getAllEffectsAt(Math.floor(c.x), Math.floor(c.y)));
    });
    const activeEff = world.resolvePriority(found);

    const prompt = document.getElementById('interaction-prompt');
    const isInteractable = (activeEff && activeEff.type === 'active');
    updateUIVisibility(isInteractable); // Делегируем выбор UI джойстику

    if (isInteractable && !dialogue.isActive) {
        if (keys.Space) {
            keys.Space = false;
            if (activeEff.dialogue) {
                dialogue.show(activeEff.npc_name || "Объект", activeEff.dialogue);
            }
        }
    }



    // 2. Триггер диалога (например, при нажатии Пробела в активной зоне)

    if (activeEff && activeEff.type === 'active' && !dialogue.isActive) {
        // prompt.classList.remove('hidden');

        if (keys.Space) {
            keys.Space = false;

            // Проверяем, есть ли у эффекта готовый диалог
            if (activeEff.dialogue) {
                const name = activeEff.npc_name || "Объект";
                const lines = activeEff.dialogue;

                dialogue.show(name, lines);
            }
        }
    }




    // HUD
    document.getElementById('pos-val').innerText = `${Math.round(player.x)}, ${Math.round(player.y)}`;
    document.getElementById('token-val').innerText = CONFIG.tmp;

    // Отрисовка
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight) / CONFIG.VIEW_MIN));
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    const cx = (player.x + (player.targetX - player.x) * player.progress + CONFIG.PLAYER_W / 2) * CONFIG.CHUNK;
    const cy = (player.y + (player.targetY - player.y) * player.progress + CONFIG.PLAYER_H / 2) * CONFIG.CHUNK;
    ctx.translate(canvas.width / 2, canvas.height / 2);
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