import { keys } from './input.js';

const zone = document.getElementById('joystick-zone');
const stick = document.getElementById('joystick-stick');
const base = document.getElementById('joystick-base');

let active = true;
let startX, startY;
const limit = 40; // Максимальный вылет стика

export function initJoystick() {
    zone.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    // Отключение по нажатию любой клавиши
    window.addEventListener('keydown', () => {
        if (active) {
            active = false;
            zone.classList.add('joystick-hidden');
        }
    }, { once: true }); // Сработает один раз
}

function handleStart(e) {
    if (!active) return;
    const touch = e.touches[0];
    const rect = base.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
    e.preventDefault();
}

function handleMove(e) {
    if (!active || !startX) return;
    const touch = e.touches[0];
    
    let dx = touch.clientX - startX;
    let dy = touch.clientY - startY;
    
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > limit) {
        dx = (dx / dist) * limit;
        dy = (dy / dist) * limit;
    }

    stick.style.transform = `translate(${dx}px, ${dy}px)`;

    // Эмуляция клавиш (с порогом чувствительности)
    const threshold = 15;
    keys.W = dy < -threshold;
    keys.S = dy > threshold;
    keys.A = dx < -threshold;
    keys.D = dx > threshold;

    e.preventDefault();
}

function handleEnd() {
    if (!active) return;
    stick.style.transform = `translate(0px, 0px)`;
    keys.W = keys.S = keys.A = keys.D = false;
    startX = startY = null;
}