const CATEGORIES = [
    {
        name: "สัตว์โลกน่ารัก",
        images: [
            "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800",
            "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=800",
            "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800",
            "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800",
            "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800"
        ]
    },
    {
        name: "สถานที่ท่องเที่ยว",
        images: [
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"
        ]
    },
    {
        name: "ร้านอาหาร & เมนูอร่อย",
        images: [
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"
        ]
    }
];

let state = {
    catIndex: 0,
    levelIndex: 0,
    lives: 3,
    timeLeft: 90,
    foundCount: 0,
    hintsLeft: 3,
    differences: [],
    zoomScale: 1,
    timer: null
};

// DOM References
const screens = {
    home: document.getElementById('screen-home'),
    map: document.getElementById('screen-map'),
    game: document.getElementById('screen-game')
};

const canvasLeft = document.getElementById('canvas-left');
const canvasRight = document.getElementById('canvas-right');
const ctxLeft = canvasLeft.getContext('2d');
const ctxRight = canvasRight.getContext('2d');

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Category selection
document.querySelectorAll('.btn-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        state.catIndex = parseInt(target.dataset.cat);
    });
});

document.getElementById('btn-play').addEventListener('click', () => {
    renderLevelGrid();
    switchScreen('map');
});

document.getElementById('map-back').addEventListener('click', () => switchScreen('home'));

function renderLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const card = document.createElement('div');
        card.className = `lvl-card ${i > 0 ? '' : ''}`;
        card.innerHTML = `
            <div class="lvl-num">${i + 1}</div>
            <div class="lvl-stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
        `;
        card.addEventListener('click', () => startLevel(i));
        grid.appendChild(card);
    }
}

function startLevel(lvlIdx) {
    state.levelIndex = lvlIdx;
    state.lives = 3;
    state.timeLeft = 90;
    state.foundCount = 0;
    state.hintsLeft = 3;
    state.zoomScale = 1;
    updateHUD();

    switchScreen('game');
    loadLevelImages();
    startTimer();
}

function updateHUD() {
    document.getElementById('time-left').textContent = state.timeLeft;
    document.getElementById('found-count').textContent = state.foundCount;
    document.getElementById('hint-count').textContent = state.hintsLeft;
    
    const hearts = document.querySelectorAll('#hearts-container i');
    hearts.forEach((h, i) => {
        if (i < state.lives) h.classList.add('active');
        else h.classList.remove('active');
    });
}

function loadLevelImages() {
    const imgList = CATEGORIES[state.catIndex].images;
    const src = imgList[state.levelIndex % imgList.length];
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => {
        canvasLeft.width = img.width;
        canvasLeft.height = img.height;
        canvasRight.width = img.width;
        canvasRight.height = img.height;

        ctxLeft.drawImage(img, 0, 0);
        ctxRight.drawImage(img, 0, 0);

        generateNaturalDifferences(img.width, img.height);
    };
}

function generateNaturalDifferences(w, h) {
    state.differences = [];
    for (let i = 0; i < 3; i++) {
        const cx = Math.floor(w * (0.2 + Math.random() * 0.6));
        const cy = Math.floor(h * (0.2 + Math.random() * 0.6));
        const r = Math.floor(Math.min(w, h) * 0.05);

        // Advanced Pixel clone stamp modification (seamless)
        const sourceData = ctxLeft.getImageData(cx - r*2, cy - r*2, r*2, r*2);
        ctxRight.putImageData(sourceData, cx - r, cy - r);

        state.differences.push({ x: cx, y: cy, r: r, found: false });
    }
}

function startTimer() {
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        state.timeLeft--;
        document.getElementById('time-left').textContent = state.timeLeft;
        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            showModal("หมดเวลา!", "คุณไม่สามารถหาจุดต่างได้ทันเวลา", [{ text: "ลองใหม่", action: () => startLevel(state.levelIndex) }]);
        }
    }, 1000);
}

// Click detection
[canvasLeft, canvasRight].forEach(canvas => {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        checkClick(clickX, clickY);
    });
});

function checkClick(x, y) {
    let hit = false;
    state.differences.forEach(diff => {
        if (!diff.found) {
            const dist = Math.hypot(diff.x - x, diff.y - y);
            if (dist <= diff.r * 1.5) {
                diff.found = true;
                hit = true;
                state.foundCount++;
                drawFoundCircle(diff.x, diff.y, diff.r);
                updateHUD();

                if (state.foundCount >= 3) {
                    clearInterval(state.timer);
                    showModal("ชนะแล้ว!", "คุณพบจุดต่างครบถ้วนอย่างยอดเยี่ยม", [
                        { text: "ด่านถัดไป", action: () => startLevel((state.levelIndex + 1) % 20) }
                    ]);
                }
            }
        }
    });

    if (!hit) {
        state.lives--;
        updateHUD();
        if (state.lives <= 0) {
            clearInterval(state.timer);
            showModal("เกมโอเวอร์", "คุณใช้โควตาหัวใจหมดแล้ว", [{ text: "ลองใหม่", action: () => startLevel(state.levelIndex) }]);
        }
    }
}

function drawFoundCircle(x, y, r) {
    [ctxLeft, ctxRight].forEach(ctx => {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function showModal(title, body, actions) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    const actContainer = document.getElementById('modal-actions');
    actContainer.innerHTML = '';
    
    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'btn-primary-large';
        btn.textContent = act.text;
        btn.onclick = () => {
            document.getElementById('modal-overlay').classList.remove('active');
            act.action();
        };
        actContainer.appendChild(btn);
    });

    document.getElementById('modal-overlay').classList.add('active');
}
