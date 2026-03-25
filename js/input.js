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