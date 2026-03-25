const zone = document.getElementById('joystick-zone');
const stick = document.getElementById('joystick-stick');
const base = document.getElementById('joystick-base');
const actBtn = document.getElementById('mobile-act-button');
const pcPrompt = document.getElementById('interaction-prompt');

let isMobile = true;
let startX, startY;
const limit = 60; // Лимит увеличен пропорционально базе

// Для детекции бега (Shift)
let lastTapTime = 0;
const doubleTapDelay = 300; // мс

export const keys = {
    W: false, A: false, S: false, D: false,
    Space: false, Enter: false,
    anyPressed: false
};

window.addEventListener('keydown', (e) => {
    updateKeyState(e.code, true);
    keys.anyPressed = true;
});

window.addEventListener('keyup', (e) => {
    updateKeyState(e.code, false);
});

function updateKeyState(code, isPressed) {
    if (code === 'KeyW' || code === 'ArrowUp') keys.W = isPressed;
    if (code === 'KeyS' || code === 'ArrowDown') keys.S = isPressed;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.A = isPressed;
    if (code === 'KeyD' || code === 'ArrowRight') keys.D = isPressed;
    if (code === 'Space') keys.Space = isPressed;
    if (code === 'Enter') keys.Enter = isPressed;
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.Shift = isPressed;
}










// export function initJoystick() {
//     zone.addEventListener('touchstart', handleStart, { passive: false });
//     window.addEventListener('touchmove', handleMove, { passive: false });
//     window.addEventListener('touchend', handleEnd);

//     // Отключение по нажатию любой клавиши
//     window.addEventListener('keydown', () => {
//         if (active) {
//             active = false;
//             zone.classList.add('joystick-hidden');
//         }
//     }, { once: true }); // Сработает один раз
// }

// function handleStart(e) {
//     if (!active) return;
//     const touch = e.touches[0];
//     const rect = base.getBoundingClientRect();
//     startX = rect.left + rect.width / 2;
//     startY = rect.top + rect.height / 2;
//     e.preventDefault();
// }

// function handleMove(e) {
//     if (!active || !startX) return;
//     const touch = e.touches[0];
    
//     let dx = touch.clientX - startX;
//     let dy = touch.clientY - startY;
    
//     const dist = Math.sqrt(dx*dx + dy*dy);
//     if (dist > limit) {
//         dx = (dx / dist) * limit;
//         dy = (dy / dist) * limit;
//     }

//     stick.style.transform = `translate(${dx}px, ${dy}px)`;

//     // Эмуляция клавиш (с порогом чувствительности)
//     const threshold = 15;
//     keys.W = dy < -threshold;
//     keys.S = dy > threshold;
//     keys.A = dx < -threshold;
//     keys.D = dx > threshold;

//     e.preventDefault();
// }

// function handleEnd() {
//     if (!active) return;
//     stick.style.transform = `translate(0px, 0px)`;
//     keys.W = keys.S = keys.A = keys.D = false;
//     startX = startY = null;
// }



export function initJoystick() {
    zone.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    // Кнопка ACT
    actBtn.addEventListener('touchstart', () => { keys.Space = true; });
    actBtn.addEventListener('touchend', () => { keys.Space = false; });

    // Отключение мобильного интерфейса при нажатии клавиш ПК
    window.addEventListener('keydown', (e) => {
        if (isMobile) {
            isMobile = false;
            zone.classList.add('hidden');
            actBtn.classList.add('hidden');
        }
    }, { once: true });
}

function handleStart(e) {
    if (!isMobile) return;
    
    // Детекция Шифта: если тапнули быстро дважды и начали тянуть
    const now = Date.now();
    if (now - lastTapTime < doubleTapDelay) {
        keys.Shift = true;
    }
    lastTapTime = now;

    const rect = base.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
    e.preventDefault();
}

function handleMove(e) {
    if (!isMobile || !startX) return;
    const touch = e.touches[0];
    
    let dx = touch.clientX - startX;
    let dy = touch.clientY - startY;
    
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > limit) {
        dx = (dx / dist) * limit;
        dy = (dy / dist) * limit;
    }

    stick.style.transform = `translate(${dx}px, ${dy}px)`;

    const threshold = 15;
    keys.W = dy < -threshold;
    keys.S = dy > threshold;
    keys.A = dx < -threshold;
    keys.D = dx > threshold;

    e.preventDefault();
}

function handleEnd() {
    if (!isMobile) return;
    stick.style.transform = `translate(0px, 0px)`;
    keys.W = keys.S = keys.A = keys.D = keys.Shift = false; // Отключаем и Шифт
    startX = startY = null;
}

// Помощник для main.js: скрывать/показывать промпты
export function updateUIVisibility(canInteract) {
    if (isMobile) {
        pcPrompt.classList.add('hidden'); // На мобилках текст "Пробел" не нужен
        if (canInteract) actBtn.classList.remove('hidden');
        else actBtn.classList.add('hidden');
    } else {
        actBtn.classList.add('hidden');
        if (canInteract) pcPrompt.classList.remove('hidden');
        else pcPrompt.classList.add('hidden');
    }
}
