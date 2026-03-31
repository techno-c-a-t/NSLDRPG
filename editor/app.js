const CHUNK = 8;
let ASSETS = [];
let customAssets = [];

// State
let roomData = {
    room_name: "New Room",
    width_chunks: 256,
    height_chunks: 256,
    objects: []
};
let loadedImages = new Map();

// History (Undo/Redo)
const maxHistory = 50;
let historyStack = [];
let historyIndex = -1;

// Camera
let cam = { x: 0, y: 0, zoom: 1 };
let pointers = new Map();
let isDragging = false;
let activeObjects = [];

// Test Mode
let isTesting = false;
let showColliders = true;
let testKeys = { W: false, S: false, A: false, D: false, Shift: false };
let player = {
    x: 10, y: 10, 
    w: 5, h: 8, 
    colW: 5, colH: 4, colX: 0, colY: 4,
    speed: 0.3
};

// Start Joystick
let joyActive = false;
let joyStartX = null;
let joyStartY = null;
const joyLimit = 40;

let editorKeys = { up: false, down: false, left: false, right: false };

// UI Elements
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const assetList = document.getElementById('asset-list');
const inspectorPanel = document.getElementById('editor-panel');
const noSelectionPanel = document.getElementById('no-selection');
const jsonEditor = document.getElementById('json-editor');
const jsonError = document.getElementById('json-error');

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);

function saveState(pushHistory = true) {
    if (pushHistory) {
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push(JSON.stringify(roomData));
        if (historyStack.length > maxHistory) {
            historyStack.shift();
        } else {
            historyIndex++;
        }
    }
    localStorage.setItem("nsld_editor_save", JSON.stringify(roomData));
    
    // Auto-update JSON editor if nothing is active (showing full room)
    if (activeObjects.length === 0 && document.activeElement !== jsonEditor) {
         jsonEditor.value = JSON.stringify(roomData, null, 2);
    } else if (activeObjects.length === 1 && document.activeElement !== jsonEditor) {
         jsonEditor.value = JSON.stringify(activeObjects[0], null, 2);
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        roomData = JSON.parse(historyStack[historyIndex]);
        let nextSel = [];
        activeObjects.forEach(o => {
            let f = roomData.objects.find(x => x.id === o.id);
            if(f) nextSel.push(f);
        });
        selectObjects(nextSel);
        saveState(false);
    }
}

function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        roomData = JSON.parse(historyStack[historyIndex]);
        let nextSel = [];
        activeObjects.forEach(o => {
            let f = roomData.objects.find(x => x.id === o.id);
            if(f) nextSel.push(f);
        });
        selectObjects(nextSel);
        saveState(false);
    }
}

function loadState() {
    let saved = localStorage.getItem("nsld_editor_save");
    if (saved) {
        try { return JSON.parse(saved); } catch(e) {}
    }
    return null;
}

function constrainCamera() {
    let limit_chunks = 150;
    
    let minW = -limit_chunks * CHUNK;
    let maxW = (roomData.width_chunks + limit_chunks) * CHUNK;
    let minH = -limit_chunks * CHUNK;
    let maxH = (roomData.height_chunks + limit_chunks) * CHUNK;

    let camMinX = canvas.width/2 - maxW * cam.zoom;
    let camMaxX = canvas.width/2 - minW * cam.zoom;
    
    let camMinY = canvas.height/2 - maxH * cam.zoom;
    let camMaxY = canvas.height/2 - minH * cam.zoom;
    
    cam.x = Math.max(camMinX, Math.min(cam.x, camMaxX));
    cam.y = Math.max(camMinY, Math.min(cam.y, camMaxY));
}

function setZoom(val, focusX = canvas.width/2, focusY = canvas.height/2) {
    let oldZoom = cam.zoom;
    cam.zoom = Math.max(0.1, Math.min(val, 10));
    let scaleChange = cam.zoom / oldZoom;
    cam.x = focusX - (focusX - cam.x) * scaleChange;
    cam.y = focusY - (focusY - cam.y) * scaleChange;
    constrainCamera();
    
    document.getElementById('zoom-level').innerText = Math.round(cam.zoom * 100) + '%';
}

async function renderPalette() {
    assetList.innerHTML = "";
    
    for (let path of ASSETS) {
        await loadImageAndGetInfo(path);
        let filename = path.split('/').pop().split('.')[0];
        assetList.appendChild(createPaletteItem(path, filename, false));
    }
    
    for (let i = 0; i < customAssets.length; i++) {
        let ca = customAssets[i];
        await loadImageAndGetInfo(ca.data);
        assetList.appendChild(createPaletteItem(ca.data, ca.name, true, i));
    }
}

function createPaletteItem(path, filename, isCustom, idx = -1) {
    let el = document.createElement('div');
    el.className = 'asset-item';
    el.draggable = true;
    let img = document.createElement('img');
    img.src = path;
    let span = document.createElement('span');
    span.innerText = filename;
    el.appendChild(img);
    el.appendChild(span);

    if (isCustom) {
        let delBtn = document.createElement('button');
        delBtn.className = 'custom-del-btn';
        delBtn.innerText = 'X';
        delBtn.title = "Удалить спрайт";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm("Удалить спрайт?")) {
                customAssets.splice(idx, 1);
                localStorage.setItem('nsld_custom_assets', JSON.stringify(customAssets));
                renderPalette();
            }
        };
        el.appendChild(delBtn);
    }

    el.onclick = () => spawnAsset(path, filename);
    el.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({path, name: filename, isCustom}));
    };
    return el;
}

async function init() {
    let state = loadState();
    if (state && confirm("Найдено сохранение. Загрузить последнюю версию локально?")) {
        roomData = state;
    } else {
        try {
            let res = await fetch('../data/objects.json');
            let j = await res.json();
            if(j && j.objects) roomData = j;
        } catch (e) {
            console.warn("Could not load objects.json automatically");
        }
    }

    if (!roomData.objects) roomData.objects = [];
    saveState(true);

    try {
        let res = await fetch('assets.json');
        ASSETS = await res.json();
    } catch(e) { console.warn("Could not fetch assets.json"); }

    try {
        let savedCust = localStorage.getItem('nsld_custom_assets');
        if (savedCust) customAssets = JSON.parse(savedCust);
    } catch(e) {}

    await renderPalette();
    
    for (const obj of roomData.objects) {
        if (obj.sprite && obj.sprite.url) {
            let mappedPath = obj.sprite.url.startsWith('data:image') ? obj.sprite.url : obj.sprite.url.replace('./', '../');
            await loadImageAndGetInfo(mappedPath);
        }
    }

    cam.x = canvas.width / 2;
    cam.y = canvas.height / 2;
    setZoom(1);
    
    selectObjects([]);

    resize();
    setupEvents();
    requestAnimationFrame(renderLoop);
}

function loadImageAndGetInfo(url) {
    if (loadedImages.has(url)) return Promise.resolve(loadedImages.get(url));
    return new Promise((resolve) => {
        let entry = { img: new Image(), w: 10, h: 10, loaded: false };
        loadedImages.set(url, entry);
        entry.img.onload = () => {
            entry.w = Math.ceil(entry.img.width / CHUNK);
            entry.h = Math.ceil(entry.img.height / CHUNK);
            entry.loaded = true;
            resolve(entry);
        };
        entry.img.onerror = () => resolve(entry);
        entry.img.src = url;
    });
}

function spawnAsset(path, name) {
    let wx = Math.floor((-cam.x + canvas.width / 2) / (CHUNK * cam.zoom));
    let wy = Math.floor((-cam.y + canvas.height / 2) / (CHUNK * cam.zoom));
    spawnAssetAt(path, name, wx, wy);
}

function spawnAssetAt(path, name, wx, wy) {
    let entry = loadedImages.get(path);
    let sprW = entry && entry.loaded ? entry.w : 10;
    let sprH = entry && entry.loaded ? entry.h : 10;

    let gamePath = path.startsWith('data:image') ? path : path.replace('../', './');
    let obj = {
        id: name + "_" + Date.now(),
        x: wx,
        y: wy,
        z: 0,
        sprite: { w: sprW, h: sprH, url: gamePath },
        collision: { w: sprW, h: sprH, ox: 0, oy: 0 },
        effects: []
    };
    roomData.objects.push(obj);
    selectObjects([obj]);
    saveState(true);
}

function selectObjects(objs) {
    activeObjects = objs || [];
    inspectorPanel.style.display = 'flex';
    jsonError.style.display = 'none';
    
    if (activeObjects.length === 1) {
        document.getElementById('no-selection').style.display = 'none';
        document.getElementById('btn-max-json').style.display = 'inline-block';
        document.getElementById('btn-merge').style.display = 'none';
        document.getElementById('group-actions').style.display = 'none';
        jsonEditor.style.display = 'block';
        jsonEditor.value = JSON.stringify(activeObjects[0], null, 2);
    } else if (activeObjects.length > 1) {
        document.getElementById('no-selection').style.display = 'block';
        document.getElementById('no-selection').innerText = "Выбрано: " + activeObjects.length;
        document.getElementById('btn-max-json').style.display = 'none';
        document.getElementById('btn-merge').style.display = 'inline-block';
        document.getElementById('group-actions').style.display = 'flex';
        jsonEditor.style.display = 'none';
    } else {
        document.getElementById('no-selection').style.display = 'block';
        document.getElementById('no-selection').innerText = "Вся комната (JSON)";
        document.getElementById('btn-max-json').style.display = 'none';
        document.getElementById('btn-merge').style.display = 'none';
        document.getElementById('group-actions').style.display = 'none';
        jsonEditor.style.display = 'block';
        jsonEditor.value = JSON.stringify(roomData, null, 2);
    }
}

function checkCollision(px, py, pw, ph) {
    return roomData.objects.some(o => {
        if(!o.collision) return false;
        const ocx = o.x + (o.collision.ox !== undefined ? o.collision.ox : 0);
        const ocy = o.y + (o.collision.oy !== undefined ? o.collision.oy : 0);
        const ocolW = o.collision.w !== undefined ? o.collision.w : (o.sprite ? o.sprite.w : 1);
        const ocolH = o.collision.h !== undefined ? o.collision.h : (o.sprite ? o.sprite.h : 1);
        
        if (ocolW === 0 || ocolH === 0) return false;
        
        return px < ocx + ocolW && px + pw > ocx && py < ocy + ocolH && py + ph > ocy;
    });
}

function updateTestPlayer() {
    let dx = 0, dy = 0;
    if (testKeys.W) dy = -1;
    if (testKeys.S) dy = 1;
    if (testKeys.A) dx = -1;
    if (testKeys.D) dx = 1;
    
    if(dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    let sprintMult = testKeys.Shift ? 3.0 : 1.0;
    let tx = player.x + dx * player.speed * sprintMult;
    let ty = player.y + dy * player.speed * sprintMult;

    if (!checkCollision(tx + player.colX, player.y + player.colY, player.colW, player.colH)) {
        player.x = tx;
    }
    if (!checkCollision(player.x + player.colX, ty + player.colY, player.colW, player.colH)) {
        player.y = ty;
    }
    
    player.x = Math.max(0, Math.min(player.x, roomData.width_chunks - player.colW));
    player.y = Math.max(0, Math.min(player.y, roomData.height_chunks - player.colH));
    
    cam.x = canvas.width/2 - player.x * CHUNK * cam.zoom;
    cam.y = canvas.height/2 - player.y * CHUNK * cam.zoom;
}

function renderLoop() {
    if (isTesting) updateTestPlayer();
    draw();
    requestAnimationFrame(renderLoop);
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    let rw = roomData.width_chunks * CHUNK;
    let rh = roomData.height_chunks * CHUNK;
    
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, rw, rh);
    
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1 / cam.zoom;
    ctx.beginPath();
    for (let x = 0; x <= roomData.width_chunks; x+=10) {
        ctx.moveTo(x*CHUNK, 0); ctx.lineTo(x*CHUNK, rh);
    }
    for (let y = 0; y <= roomData.height_chunks; y+=10) {
        ctx.moveTo(0, y*CHUNK); ctx.lineTo(rw, y*CHUNK);
    }
    ctx.stroke();

    let toRender = [...(roomData.objects || [])];
    
    let playerObj = { 
        isPlayer: true, 
        z: player.y, 
        x: player.x, y: player.y, 
        w: player.w*CHUNK, h: player.h*CHUNK 
    };
    if (isTesting) toRender.push(playerObj);

    toRender.sort((a,b)=> (a.z||0) - (b.z||0));

    toRender.forEach(o => {
        if (o.isPlayer) {
            ctx.fillStyle = "cyan";
            ctx.fillRect(o.x*CHUNK, o.y*CHUNK, o.w, o.h);
            
            if (showColliders) {
                ctx.strokeStyle = "yellow";
                ctx.lineWidth = 2 / cam.zoom;
                ctx.strokeRect((player.x+player.colX)*CHUNK, (player.y+player.colY)*CHUNK, player.colW*CHUNK, player.colH*CHUNK);
            }
            return;
        }

        let x = o.x * CHUNK;
        let y = o.y * CHUNK;
        let w = (o.sprite ? o.sprite.w : 10) * CHUNK;
        let h = (o.sprite ? o.sprite.h : 10) * CHUNK;

        let p = o.sprite?.url ? (o.sprite.url.startsWith('data:image') ? o.sprite.url : o.sprite.url.replace('./', '../')) : null;
        let entry = loadedImages.get(p);

        if (entry && entry.loaded) {
            ctx.drawImage(entry.img, x, y, w, h);
        } else {
            ctx.fillStyle = o.color || "magenta";
            ctx.fillRect(x, y, w, h);
        }

        if (activeObjects.includes(o) && !isTesting) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2 / cam.zoom;
            ctx.strokeRect(x, y, w, h);
            
            if(o.collision) {
               ctx.strokeStyle = "blue";
               let cox = o.collision.ox !== undefined ? o.collision.ox : 0;
               let coy = o.collision.oy !== undefined ? o.collision.oy : 0;
               let cw = o.collision.w !== undefined ? o.collision.w : (o.sprite?o.sprite.w:1);
               let ch = o.collision.h !== undefined ? o.collision.h : (o.sprite?o.sprite.h:1);
               if (cw > 0 && ch > 0) ctx.strokeRect((o.x + cox)*CHUNK, (o.y + coy)*CHUNK, cw*CHUNK, ch*CHUNK);
            }
        } else if (isTesting && showColliders && o.collision) {
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 2 / cam.zoom;
            let cox = o.collision.ox !== undefined ? o.collision.ox : 0;
            let coy = o.collision.oy !== undefined ? o.collision.oy : 0;
            let cw = o.collision.w !== undefined ? o.collision.w : (o.sprite?o.sprite.w:1);
            let ch = o.collision.h !== undefined ? o.collision.h : (o.sprite?o.sprite.h:1);
            if (cw > 0 && ch > 0) ctx.strokeRect((o.x + cox)*CHUNK, (o.y + coy)*CHUNK, cw*CHUNK, ch*CHUNK);
        }
    });

    ctx.restore();
}

function setupEvents() {
    document.getElementById('btn-zoom-in').onclick = () => setZoom(cam.zoom * 1.25);
    document.getElementById('btn-zoom-out').onclick = () => setZoom(cam.zoom / 1.25);

    canvas.addEventListener('wheel', (e) => {
        if (isTesting) return;
        let zoomFactor = 1.1;
        let target = e.deltaY < 0 ? cam.zoom * zoomFactor : cam.zoom / zoomFactor;
        setZoom(target, e.offsetX, e.offsetY);
    });

    canvas.addEventListener('pointerdown', (e) => {
        if(document.activeElement && document.activeElement.tagName.toLowerCase() === 'textarea') {
            document.activeElement.blur();
        }
        if(isTesting) return;
        pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, startX: e.offsetX, startY: e.offsetY });
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (isTesting || !pointers.has(e.pointerId)) return;
        
        let p = pointers.get(e.pointerId);
        let dx = e.offsetX - p.x;
        let dy = e.offsetY - p.y;
        
        if (pointers.size === 1) {
             let dist = Math.hypot(e.offsetX - p.startX, e.offsetY - p.startY);
             if (dist > 5) isDragging = true;
             if (isDragging) { 
                 cam.x += dx; 
                 cam.y += dy; 
                 constrainCamera();
             }
        } else if (pointers.size === 2) {
             isDragging = true;
             let ids = Array.from(pointers.keys());
             let p1 = pointers.get(ids[0]);
             let p2 = pointers.get(ids[1]);
             let oldDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
             
             let nx1 = ids[0] === e.pointerId ? e.offsetX : p1.x;
             let ny1 = ids[0] === e.pointerId ? e.offsetY : p1.y;
             let nx2 = ids[1] === e.pointerId ? e.offsetX : p2.x;
             let ny2 = ids[1] === e.pointerId ? e.offsetY : p2.y;
             let newDist = Math.hypot(nx1 - nx2, ny1 - ny2);
             
             if (oldDist > 0) {
                 let targetZoom = cam.zoom * (newDist / oldDist);
                 setZoom(targetZoom, (nx1 + nx2) / 2, (ny1 + ny2) / 2);
             }
        }
        p.x = e.offsetX; p.y = e.offsetY;
    });

    canvas.addEventListener('pointerup', (e) => {
        if (isTesting) return;
        let p = pointers.get(e.pointerId);
        if (!isDragging && pointers.size === 1) {
             let wx = (e.offsetX - cam.x) / cam.zoom / CHUNK;
             let wy = (e.offsetY - cam.y) / cam.zoom / CHUNK;
             
             let clicked = null;
             let sorted = [...(roomData.objects || [])].sort((a,b)=> (b.z||0) - (a.z||0));
             for (let o of sorted) {
                 let w = o.sprite ? o.sprite.w : 10;
                 let h = o.sprite ? o.sprite.h : 10;
                 if (wx >= o.x && wx <= o.x + w && wy >= o.y && wy <= o.y + h) {
                     clicked = o;
                     break;
                 }
             }
             if (e.shiftKey) {
                 if (clicked) {
                     if (activeObjects.includes(clicked)) {
                         activeObjects = activeObjects.filter(o => o !== clicked);
                     } else {
                         activeObjects.push(clicked);
                     }
                 }
                 selectObjects(activeObjects);
             } else {
                 selectObjects(clicked ? [clicked] : []);
             }
             if(!clicked && !e.shiftKey) jsonEditor.focus();
        }
        pointers.delete(e.pointerId);
        if (pointers.size === 0) isDragging = false;
    });
    
    canvas.addEventListener('pointercancel', (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size === 0) isDragging = false;
    });
    
    canvas.ondragover = (e) => { e.preventDefault(); };
    canvas.ondrop = (e) => {
        if(isTesting) return;
        e.preventDefault();
        try {
            let data = JSON.parse(e.dataTransfer.getData('text/plain'));
            let rect = canvas.getBoundingClientRect();
            let wx = Math.floor((e.clientX - rect.left - cam.x) / (cam.zoom * CHUNK));
            let wy = Math.floor((e.clientY - rect.top - cam.y) / (cam.zoom * CHUNK));
            spawnAssetAt(data.path, data.name, wx, wy);
        } catch(err) {}
    };

    jsonEditor.addEventListener('input', () => {
        try {
            let updated = JSON.parse(jsonEditor.value);
            if (activeObjects.length === 1) {
                Object.assign(activeObjects[0], updated);
                if (activeObjects[0].sprite && activeObjects[0].sprite.url) {
                    let p = activeObjects[0].sprite.url.startsWith('data:image') ? activeObjects[0].sprite.url : activeObjects[0].sprite.url.replace('./', '../');
                    loadImageAndGetInfo(p);
                }
            } else if (activeObjects.length > 1) {
                let dx = 0, dy = 0;
                let minX = Math.min(...activeObjects.map(o => o.x));
                let minY = Math.min(...activeObjects.map(o => o.y));
                if (updated.x !== undefined) dx = updated.x - minX;
                if (updated.y !== undefined) dy = updated.y - minY;
                activeObjects.forEach(o => {
                     o.x += dx;
                     o.y += dy;
                });
            } else {
                roomData = updated;
                for (let o of roomData.objects) {
                     if (o.sprite && o.sprite.url) {
                         let p = o.sprite.url.startsWith('data:image') ? o.sprite.url : o.sprite.url.replace('./', '../');
                         loadImageAndGetInfo(p);
                     }
                }
            }
            jsonError.style.display = 'none';
            saveState(false);
        } catch (e) { jsonError.style.display = 'block'; }
    });
    jsonEditor.addEventListener('change', () => { 
        if(jsonError.style.display === 'none') saveState(true); 
    });

    document.getElementById('btn-merge').onclick = () => {
        if (activeObjects.length > 1) {
            let minX = Math.min(...activeObjects.map(o => o.x));
            let minY = Math.min(...activeObjects.map(o => o.y));
            document.getElementById('btn-merge').style.display = 'none';
            document.getElementById('group-actions').style.display = 'none';
            jsonEditor.style.display = 'block';
            jsonEditor.value = JSON.stringify({ x: minX, y: minY }, null, 2);
            document.getElementById('no-selection').innerText = "Координаты группы";
        }
    };
    
    document.getElementById('btn-col-off').onclick = () => {
        if (activeObjects.length > 1) {
            activeObjects.forEach(o => {
                if (!o.collision) o.collision = { ox: 0, oy: 0 };
                o.collision.w = 0;
                o.collision.h = 0;
            });
            saveState(true);
            alert("Коллизия отключена у всех выбранных объектов!");
        }
    };

    document.getElementById('btn-col-on').onclick = () => {
        if (activeObjects.length > 1) {
            activeObjects.forEach(o => {
                if (!o.collision) o.collision = { ox: 0, oy: 0 };
                o.collision.w = o.sprite ? o.sprite.w : 1;
                o.collision.h = o.sprite ? o.sprite.h : 1;
            });
            saveState(true);
            alert("Коллизия включена у всех выбранных объектов!");
        }
    };
    
    document.getElementById('btn-delete-obj').onclick = () => {
        if(activeObjects.length > 0 && confirm("Удалить выбранные объекты?")) {
            roomData.objects = roomData.objects.filter(o => !activeObjects.includes(o));
            selectObjects([]);
            saveState(true);
        }
    };

    document.getElementById('btn-clear-all').onclick = () => {
        if(confirm("Вы уверены, что хотите УДАЛИТЬ ВСЕ ОБЪЕКТЫ с карты?")) {
            if(confirm("ТОЧНО УДАЛИТЬ ВСЕ? ДЕЙСТВИЕ НЕЛЬЗЯ ОТМЕНИТЬ.")) {
                roomData.objects = [];
                selectObjects([]);
                saveState(true);
            }
        }
    };

    document.getElementById('btn-max-json').onclick = () => {
        if(activeObjects.length !== 1) return;
        let o = activeObjects[0];
        let template = {
            id: o.id || "new_object_" + Date.now(),
            x: o.x || 0,
            y: o.y || 0,
            z: o.z || -50,
            color: o.color || "#ff00ff",
            sprite: o.sprite || { w: 5, h: 5, url: "./assets/example.png" },
            collision: o.collision || { w: 5, h: 5, ox: 0, oy: 0 },
            effects: o.effects && o.effects.length > 0 ? o.effects : [
                {
                    type: "active",
                    radius: 2,
                    action: "can_interact",
                    priority: 2.0,
                    dialogue: ["Hello!", "This is a max JSON example."],
                    npc_name: "Example NPC"
                }
            ]
        };
        Object.assign(o, template);
        jsonEditor.value = JSON.stringify(o, null, 2);
        saveState(true);
    };

    // Custom Sprite Upload
    document.getElementById('btn-upload-asset').onclick = () => document.getElementById('file-asset-input').click();
    document.getElementById('file-asset-input').onchange = (e) => {
        let f = e.target.files[0];
        if(!f) return;
        let reader = new FileReader();
        reader.onload = (re) => {
            let dataUrl = re.target.result;
            let fname = f.name.replace(/\.[^/.]+$/, "");
            customAssets.push({ name: fname, data: dataUrl });
            localStorage.setItem('nsld_custom_assets', JSON.stringify(customAssets));
            renderPalette();
        };
        reader.readAsDataURL(f);
        e.target.value = "";
    };

    const roomModal = document.getElementById('room-modal');
    document.getElementById('btn-room-settings').onclick = () => {
        document.getElementById('room-name').value = roomData.room_name || "";
        document.getElementById('room-w').value = roomData.width_chunks || 256;
        document.getElementById('room-h').value = roomData.height_chunks || 256;
        roomModal.style.display = 'flex';
    };
    document.getElementById('btn-close-room').onclick = () => { roomModal.style.display = 'none'; };
    document.getElementById('btn-save-room').onclick = () => {
        roomData.room_name = document.getElementById('room-name').value;
        roomData.width_chunks = parseInt(document.getElementById('room-w').value);
        roomData.height_chunks = parseInt(document.getElementById('room-h').value);
        roomModal.style.display = 'none';
        saveState();
    };

    const helpModal = document.getElementById('help-modal');
    document.getElementById('btn-help').onclick = () => { helpModal.style.display = 'flex'; };
    document.getElementById('btn-close-help').onclick = () => { helpModal.style.display = 'none'; };

    document.getElementById('btn-load').onclick = () => document.getElementById('file-input').click();
    document.getElementById('file-input').onchange = (e) => {
        let f = e.target.files[0];
        if (!f) return;
        let reader = new FileReader();
        reader.onload = (re) => {
            try {
                let data = JSON.parse(re.target.result);
                roomData = data;
                if (!roomData.objects) roomData.objects = [];
                for (const obj of roomData.objects) {
                    if (obj.sprite && obj.sprite.url) {
                        let p = obj.sprite.url.startsWith('data:image') ? obj.sprite.url : obj.sprite.url.replace('./', '../');
                        loadImageAndGetInfo(p);
                    }
                }
                selectObject(null);
                saveState();
                setZoom(1); 
            } catch(err) { alert("Ошибка загрузки JSON."); }
        };
        reader.readAsText(f);
    };

    document.getElementById('btn-copy-json').onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(roomData, null, 2))
            .then(() => alert("Скопировано!"))
            .catch(err => alert("Ошибка при копировании: " + err));
    };

    document.getElementById('btn-download-json').onclick = () => {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(roomData, null, 2));
        let downloadEl = document.createElement('a');
        downloadEl.setAttribute("href", dataStr);
        downloadEl.setAttribute("download", "objects.json");
        document.body.appendChild(downloadEl);
        downloadEl.click();
        downloadEl.remove();
    };
    
    document.getElementById('btn-test').onclick = () => setTestMode(true);
    document.getElementById('btn-test-return').onclick = () => setTestMode(false);
    
    document.getElementById('btn-test-debug').onclick = () => {
        showColliders = !showColliders;
        document.getElementById('btn-test-debug').innerText = "Коллайдеры: " + (showColliders ? "ВКЛ" : "ВЫКЛ");
    };

    let diagState = { active: false, lines: [], idx: 0 };
    const actBox = document.getElementById('test-dialogue-box');
    const actName = document.getElementById('test-dialogue-name');
    const actText = document.getElementById('test-dialogue-text');

    function triggerACT() {
        if (!isTesting) return;
        if (diagState.active) {
            diagState.idx++;
            if (diagState.idx >= diagState.lines.length) {
                diagState.active = false;
                actBox.style.display = 'none';
            } else {
                actText.innerText = diagState.lines[diagState.idx];
            }
        } else {
            let found = null;
            let pRect = { 
                x: player.x + player.colX, 
                y: player.y + player.colY, 
                w: player.colW, 
                h: player.colH 
            };
            
            for (let o of roomData.objects) {
                if (o.effects && o.effects.length > 0) {
                    let cx = o.x + (o.collision && o.collision.ox !== undefined ? o.collision.ox : 0);
                    let cy = o.y + (o.collision && o.collision.oy !== undefined ? o.collision.oy : 0);
                    let cw = (o.collision && o.collision.w !== undefined) ? o.collision.w : (o.sprite?o.sprite.w:1);
                    let ch = (o.collision && o.collision.h !== undefined) ? o.collision.h : (o.sprite?o.sprite.h:1);
                    
                    for (let e of o.effects) {
                        if (e.action === "can_interact") {
                            let pad = e.radius || 0;
                            // Expand object bounds by pad on all sides
                            let oRect = { x: cx - pad, y: cy - pad, w: cw + pad * 2, h: ch + pad * 2 };
                            
                            // AABB Intersection check
                            if (pRect.x < oRect.x + oRect.w && pRect.x + pRect.w > oRect.x &&
                                pRect.y < oRect.y + oRect.h && pRect.y + pRect.h > oRect.y) {
                                found = e; 
                                break;
                            }
                        }
                    }
                    if(found) break;
                }
            }
            if (found && found.dialogue && found.dialogue.length > 0) {
                diagState.active = true;
                diagState.lines = found.dialogue;
                diagState.idx = 0;
                actName.innerText = found.npc_name || "NPC";
                actText.innerText = diagState.lines[0];
                actBox.style.display = 'block';
            }
        }
    }

    document.getElementById('btn-test-act').onclick = triggerACT;
    
    const joyZone = document.getElementById('joystick-zone');
    const stick = document.getElementById('joystick-stick');
    const base = document.getElementById('joystick-base');
    
    let isJoyActive = false;
    let stX=0, stY=0;
    let lastTap = 0;
    
    const hStartOffset = (e) => {
        isJoyActive = true;
        let r = base.getBoundingClientRect();
        stX = r.left + r.width/2;
        stY = r.top + r.height/2;
        
        let now = Date.now();
        if (now - lastTap < 300) testKeys.Shift = true;
        else testKeys.Shift = false;
        lastTap = now;
        
        e.preventDefault();
    };
    const hMoveOffset = (e) => {
        if(!isJoyActive || stX===0) return;
        let t = e.touches ? e.touches[0] : e;
        let dx = t.clientX - stX;
        let dy = t.clientY - stY;
        let d = Math.sqrt(dx*dx + dy*dy);
        if(d > joyLimit) { dx = (dx/d)*joyLimit; dy = (dy/d)*joyLimit; }
        
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        let tresh = 15;
        testKeys.W = dy < -tresh;
        testKeys.S = dy > tresh;
        testKeys.A = dx < -tresh;
        testKeys.D = dx > tresh;
        e.preventDefault();
    };
    const hEndOffset = (e) => {
        isJoyActive = false;
        stick.style.transform = `translate(0px,0px)`;
        testKeys.W = testKeys.S = testKeys.A = testKeys.D = testKeys.Shift = false;
    };
    
    joyZone.addEventListener('mousedown', hStartOffset);
    window.addEventListener('mousemove', hMoveOffset);
    window.addEventListener('mouseup', hEndOffset);
    joyZone.addEventListener('touchstart', hStartOffset, {passive:false});
    window.addEventListener('touchmove', hMoveOffset, {passive:false});
    window.addEventListener('touchend', hEndOffset);
    
    // Global Keyboard Logic
    window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
            if(e.code==="Escape") { document.activeElement.blur(); return; }
            return;
        }

        if (isTesting) {
            if(e.code==="KeyW") testKeys.W = true;
            if(e.code==="KeyS") testKeys.S = true;
            if(e.code==="KeyA") testKeys.A = true;
            if(e.code==="KeyD") testKeys.D = true;
            if(e.code==="ShiftLeft" || e.code==="ShiftRight") testKeys.Shift = true;
            if(e.code==="Space") { e.preventDefault(); triggerACT(); }
            if(e.code==="Escape") { setTestMode(false); }
            return;
        }

        if (e.code === "Escape") {
             selectObjects([]);
             return;
        }

        if (e.code === "ArrowUp") editorKeys.up = true;
        if (e.code === "ArrowDown") editorKeys.down = true;
        if (e.code === "ArrowLeft") editorKeys.left = true;
        if (e.code === "ArrowRight") editorKeys.right = true;

        if (e.ctrlKey) {
            if (e.code === "KeyZ") {
                if (e.shiftKey) redo();
                else undo();
                e.preventDefault();
            } else if (e.code === "KeyC") {
                if (activeObjects.length > 0) {
                    navigator.clipboard.writeText(JSON.stringify(activeObjects));
                }
            } else if (e.code === "KeyX") {
                if (activeObjects.length > 0) {
                    navigator.clipboard.writeText(JSON.stringify(activeObjects));
                    roomData.objects = roomData.objects.filter(o => !activeObjects.includes(o));
                    selectObjects([]);
                    saveState(true);
                }
            } else if (e.code === "KeyV") {
                navigator.clipboard.readText().then(text => {
                    try {
                        let parsed = JSON.parse(text);
                        let arr = Array.isArray(parsed) ? parsed : [parsed];
                        let newSel = [];
                        let wx = Math.floor((-cam.x + canvas.width / 2) / (CHUNK * cam.zoom));
                        let wy = Math.floor((-cam.y + canvas.height / 2) / (CHUNK * cam.zoom));
                        
                        if (arr.length > 0 && arr[0].id) {
                            let minX = Math.min(...arr.map(o => o.x));
                            let minY = Math.min(...arr.map(o => o.y));
                            
                            arr.forEach(parsedObj => {
                                parsedObj.id = parsedObj.id + "_copy_" + Date.now();
                                parsedObj.x = wx + (parsedObj.x - minX);
                                parsedObj.y = wy + (parsedObj.y - minY);
                                roomData.objects.push(parsedObj);
                                newSel.push(parsedObj);
                                
                                if (parsedObj.sprite && parsedObj.sprite.url) {
                                    let p = parsedObj.sprite.url.startsWith('data:image') ? parsedObj.sprite.url : parsedObj.sprite.url.replace('./', '../');
                                    loadImageAndGetInfo(p);
                                }
                            });
                            selectObjects(newSel);
                            saveState(true);
                        }
                    } catch(err) {}
                });
            }
        } else {
             if (e.code === "Delete" || e.code === "Backspace") {
                if (activeObjects.length > 0) {
                    roomData.objects = roomData.objects.filter(o => !activeObjects.includes(o));
                    selectObjects([]);
                    saveState(true);
                }
            }
            if (activeObjects.length > 0) {
                let moveAmount = e.shiftKey ? 5 : 1;
                let dx = 0, dy = 0, ds = 0;
                
                if (editorKeys.up) dy -= moveAmount;
                if (editorKeys.down) dy += moveAmount;
                if (editorKeys.left) dx -= moveAmount;
                if (editorKeys.right) dx += moveAmount;

                if (e.key === "+" || e.key === "=") ds = moveAmount;
                if (e.key === "-") ds = -moveAmount;

                if (dx !== 0 || dy !== 0 || ds !== 0) {
                    activeObjects.forEach(activeObject => {
                        activeObject.x += dx;
                        activeObject.y += dy;
                        
                        if (ds !== 0) {
                            if (activeObject.sprite) {
                                activeObject.sprite.w = Math.max(1, activeObject.sprite.w + ds);
                                activeObject.sprite.h = Math.max(1, activeObject.sprite.h + ds);
                            }
                            if (activeObject.collision) {
                                activeObject.collision.w = Math.max(0, (activeObject.collision.w !== undefined ? activeObject.collision.w : activeObject.sprite.w) + ds);
                                activeObject.collision.h = Math.max(0, (activeObject.collision.h !== undefined ? activeObject.collision.h : activeObject.sprite.h) + ds);
                            }
                        }
                    });
                    saveState(true);
                    selectObjects(activeObjects);
                    
                    // Prevent page scrolling on arrow keys and shift-arrow
                    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code) || ds !== 0) {
                        e.preventDefault();
                    }
                }
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if(e.code==="KeyW") testKeys.W = false;
        if(e.code==="KeyS") testKeys.S = false;
        if(e.code==="KeyA") testKeys.A = false;
        if(e.code==="KeyD") testKeys.D = false;
        if(e.code==="ShiftLeft" || e.code==="ShiftRight") testKeys.Shift = false;

        if (e.code === "ArrowUp") editorKeys.up = false;
        if (e.code === "ArrowDown") editorKeys.down = false;
        if (e.code === "ArrowLeft") editorKeys.left = false;
        if (e.code === "ArrowRight") editorKeys.right = false;
    });

    setupResizer(document.getElementById('resizer-pal'), document.getElementById('palette'), false);
    setupResizer(document.getElementById('resizer-insp'), document.getElementById('inspector'), true);
}

function setTestMode(active) {
    isTesting = active;
    let edUI = [document.getElementById('palette'), document.getElementById('inspector'), ...document.querySelectorAll('.resizer'), document.getElementById('zoom-controls')];
    let testUI = document.getElementById('test-ui');
    
    if (active) {
        edUI.forEach(e => e.style.display = 'none');
        testUI.style.display = 'block';
        
        player.x = (-cam.x + canvas.width/2)/CHUNK/cam.zoom - player.w/2;
        player.y = (-cam.y + canvas.height/2)/CHUNK/cam.zoom - player.h/2;
    } else {
        edUI.forEach(e => e.style.display = ''); 
        testUI.style.display = 'none';
        
        // Hide dialogue if open
        document.getElementById('test-dialogue-box').style.display = 'none';
        let diagState = { active: false, lines: [], idx: 0 };
    }
    resize();
}

function setupResizer(resizer, panel, isAfter) {
    let startVal = 0;
    let startSize = 0;
    let active = false;
    let isVert = false;
    
    const move = (e) => {
        if(!active) return;
        let t = e.touches ? e.touches[0] : e;
        if (isVert) {
            let diff = t.clientY - startVal;
            if (isAfter) panel.style.height = (startSize - diff) + 'px';
            else panel.style.height = (startSize + diff) + 'px';
        } else {
            let diff = t.clientX - startVal;
            if (isAfter) panel.style.width = (startSize - diff) + 'px';
            else panel.style.width = (startSize + diff) + 'px';
        }
    };
    const end = () => { active = false; resize(); };

    const start = (e) => {
        active = true;
        let t = e.touches ? e.touches[0] : e;
        let container = document.getElementById('app-container');
        isVert = window.getComputedStyle(container).flexDirection === 'column';
        
        if (isVert) {
            startVal = t.clientY;
            startSize = panel.offsetHeight;
        } else {
            startVal = t.clientX;
            startSize = panel.offsetWidth;
        }
    };
    
    resizer.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    resizer.addEventListener('touchstart', start, {passive: true});
    window.addEventListener('touchmove', move, {passive: true});
    window.addEventListener('touchend', end);
}

function checkOrientation() {
    let c = document.getElementById('app-container');
    if (window.innerWidth <= 768 || window.innerHeight > window.innerWidth) {
        c.classList.add('vertical');
    } else {
        c.classList.remove('vertical');
    }
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

init();
