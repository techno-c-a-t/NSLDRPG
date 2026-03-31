import { World } from './world.js';
import { Player } from './player.js';
import { keys, initJoystick, updateUIVisibility } from './input.js';
import { CONFIG, CONFIG_ISAAC } from './config.js';;
import { DialogueManager } from './dialogue.js';

const world = new World();
const dialogue = new DialogueManager();
let player;
let token = '';
let isPausedByIntro = false;
let audio = new Audio();

async function init() {
    await world.loadObjects();
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token') || Math.random().toString(36).substr(2, 8);
    if (!urlParams.get('token')) window.history.replaceState({}, '', `?token=${token}`);

    const saved = localStorage.getItem('save_' + token);
    const startPos = saved ? JSON.parse(saved) : { x: CONFIG.START_X, y: CONFIG.START_Y };
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

        audio.volume = 0.5;
        audio.src = 'assets/audio/field_of_hopes_and_dreams.mp3';
        // 2. Включаем автоповтор (зацикливание)
        audio.loop = true;
        // 3. Запускаем воспроизведение, как только данных будет достаточно
        audio.play()
            .then(() => console.log("Музыка играет!"))
            .catch(err => console.error("Ошибка воспроизведения:", err));
    });
    requestAnimationFrame(loop);
}


function loop() {
    // console.log("start");
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const corners = player.getCorners();
    // console.log("next")
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

    // console.log("Algo");
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
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight) / CONFIG.VIEW_SIZE));
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    const cx = (player.x + (player.targetX - player.x) * player.progress + CONFIG.PLAYER_W / 2) * CONFIG.CHUNK;
    const cy = (player.y + (player.targetY - player.y) * player.progress + CONFIG.PLAYER_H / 2) * CONFIG.CHUNK;
    ctx.translate(Math.round(canvas.width / 2), Math.round(canvas.height / 2));
    ctx.scale(scale, scale);
    ctx.translate(Math.round(-cx), Math.round(-cy));
    // Внутри loop() в main.js



    // 1. Самый нижний слой — Шахматка и зоны
    world.drawBackground(ctx, Math.round(player.x), Math.round(player.y));

    // 2. Слой объектов ПОД игроком (Z от -100 до -1)
    world.drawLayer(ctx, Math.round(player.x), Math.round(player.y), corners, -100, -1);

    // 3. Игрок
    player.draw(ctx);

    // 4. Слой объектов НАД игроком (Z от 0 до 100)
    // console.log("Last layer");
    world.drawLayer(ctx, Math.round(player.x), Math.round(player.y), corners, 0, 100);

    ctx.restore();

    requestAnimationFrame(loop);

}
init();