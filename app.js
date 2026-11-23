/* ============================================================================
   BAGIAN 3: STATE APLIKASI, LOCALSTORAGE & AUDIO ENGINE
   ============================================================================ */
const STORAGE_KEY = 'sdq_almahmudah_star_adventure_v2';
const MOTIVATION_RETRY = [
    'Yuk, coba lagi! Kamu pasti bisa! 💪',
    'Tidak apa-apa, kita belajar bersama! 🌟',
    'Sedikit lagi, bintangmu sudah dekat! ✨',
    'Hebat, kamu sudah berusaha! Coba perhatikan petunjuknya ya! 💡'
];
const MOTIVATION_SUCCESS = [
    'MasyaAllah, Pintar Sekali! 🌟',
    'Alhamdulillah, Jawabanmu Benar! 🎉',
    'Hebat! Kamu Mendapat Bintang! ⭐',
    'Keren Banget, Anak Sholeh/Sholehah! 🚀'
];

let appData = {
    playerName: 'Anak Hebat',
    pin: '1234',
    stars: 0,
    unlockedBadges: [],
    completedLevels: {}, // { 'pancasila_1': true, ... }
    indicatorStats: {},  // { 'Matematika|Konsep Jam': { right: 3, wrong: 1 } }
    wrongLog: [],        // [{ q, subjectName, indicator, correctAns, time }]
    sessions: [],        // [{ date, title, total, correct, percent, stars }]
    soundOn: true,
    bgmOn: false
};

let activeSession = null;
let selectedWorldId = 'akhlak';
let setupConfig = { mode: 'practice', count: 5 };
let timerInterval = null;
let timerSeconds = 0;

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            appData = { ...appData, ...parsed };
        }
    } catch (e) { console.warn(e); }
    refreshGlobalUI();
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) { console.warn(e); }
    refreshGlobalUI();
}

function refreshGlobalUI() {
    document.getElementById('hdr-stars').textContent = appData.stars;
    document.getElementById('hdr-badges').textContent = `${appData.unlockedBadges.length}/13`;
    document.getElementById('home-player-name').textContent = appData.playerName;
    document.getElementById('btn-sound').textContent = appData.soundOn ? '🔊' : '🔇';
    document.getElementById('btn-bgm').textContent = appData.bgmOn ? '🎵' : '🔕';

    // Hitung progress keseluruhan berdasarkan indikator yang sudah dikuasai / level selesai
    const totalLevelsPossible = 13 * 5;
    const doneLevels = Object.keys(appData.completedLevels).length;
    const pct = Math.min(100, Math.round((doneLevels / totalLevelsPossible) * 100));
    document.getElementById('home-progress-bar').style.width = `${pct}%`;
    document.getElementById('home-progress-text').textContent = `${pct}% Selesai (${doneLevels}/${totalLevelsPossible} Level)`;

    const rankLevel = Math.floor(appData.stars / 15) + 1;
    const ranks = ['Bintang Pemula', 'Petualang Cilik', 'Penjelajah Galaksi', 'Kapten Bintang', 'Master Bintang SDQ'];
    const rankName = ranks[Math.min(ranks.length - 1, rankLevel - 1)];
    document.getElementById('home-rank').textContent = `🌟 Level ${rankLevel}: ${rankName}`;
}

/* Web Audio Sound Effects & Gentle Background Chime */
let audioCtx = null;
let bgmTimer = null;

function ensureAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Buka kunci audio otomatis pada sentuhan/klik pertama di layar HP
['touchstart', 'pointerdown', 'click'].forEach(evt => {
    document.addEventListener(evt, () => ensureAudio(), { once: true, passive: true });
});

// Bunyi otomatis setiap kali menekan tombol atau kotak jawaban apa pun
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .btn-3d, .btn-opt');
    if (btn && !btn.disabled) {
        sfxClick();
    }
});

function playTone(freq, type, dur, delay = 0, vol = 0.25) {
    if (!appData.soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
}

// 1. Bunyi setiap mencet tombol ("pop" ceria)
function sfxClick() {
    playTone(620, 'sine', 0.08, 0, 0.16);
    playTone(880, 'sine', 0.06, 0.03, 0.10);
}

// 2. Bunyi ketika jawaban BENAR (nada naik ceria Do-Mi-Sol-Do)
function sfxCorrect() {
    playTone(523.25, 'triangle', 0.14, 0, 0.28);
    playTone(659.25, 'triangle', 0.14, 0.10, 0.28);
    playTone(783.99, 'triangle', 0.14, 0.20, 0.28);
    playTone(1046.50, 'triangle', 0.35, 0.30, 0.32);
}

// 3. Bunyi ketika jawaban SALAH ("tet-tot" lembut ramah anak)
function sfxWrong() {
    playTone(310, 'sawtooth', 0.18, 0, 0.18);
    playTone(230, 'sawtooth', 0.30, 0.16, 0.20);
}

// 4. Bunyi saat menyelesaikan kuis (fanfare kemenangan)
function sfxVictory() {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
        playTone(f, 'triangle', 0.25, i * 0.12, 0.28);
    });
}

function toggleSound() {
    appData.soundOn = !appData.soundOn;
    saveData();
    if (appData.soundOn) sfxClick();
}

function toggleBGM() {
    appData.bgmOn = !appData.bgmOn;
    saveData();
    if (appData.bgmOn) {
        ensureAudio();
        startBGM();
    } else {
        stopBGM();
    }
}

function startBGM() {
    stopBGM();
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    let step = 0;
    bgmTimer = setInterval(() => {
        if (!appData.bgmOn || !appData.soundOn) return;
        const ctx = ensureAudio();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(melody[step % melody.length], ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.46);
        step++;
    }, 550);
}

function stopBGM() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
}

function speakQuestion() {
    sfxClick();
    if (!('speechSynthesis' in window) || !activeSession) return;
    window.speechSynthesis.cancel();
    const q = activeSession.questions[activeSession.index];
    const u = new SpeechSynthesisUtterance(q.q.replace(/___+/g, 'titik-titik'));
    u.lang = 'id-ID';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
}

/* ============================================================================
   BAGIAN 4: NAVIGASI & RENDER HALAMAN (HOME, PETA, BELAJAR, SETUP, BADGES)
   ============================================================================ */
function navigate(viewName) {
    sfxClick();
    stopTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    ['home', 'map', 'study', 'setup', 'play', 'result', 'badges', 'parent'].forEach(v => {
        document.getElementById(`view-${v}`).classList.add('hidden');
    });
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'home') renderHomeWorlds();
    if (viewName === 'map') renderAdventureMap();
    if (viewName === 'study') renderStudyMode();
    if (viewName === 'badges') renderBadgesPage();
    if (viewName === 'parent') renderParentDashboard();
}

function renderHomeWorlds() {
    const container = document.getElementById('home-worlds-preview');
    container.innerHTML = WORLDS.map(w => `
        <div onclick="selectedWorldId='${w.id}'; navigate('map')" class="btn-3d cursor-pointer rounded-2xl p-3.5 border-2 ${w.bgSoft} flex flex-col justify-between">
            <div>
                <div class="text-3xl mb-1">${w.icon}</div>
                <h4 class="font-fredoka font-bold text-base text-slate-800 leading-tight">${w.name}</h4>
                <p class="text-[11px] font-bold text-slate-600 mt-1">${w.desc}</p>
            </div>
            <span class="mt-3 text-xs font-extrabold text-sky-700">Jelajahi ▶️</span>
        </div>
    `).join('');
}

function renderAdventureMap() {
    const doneCount = Object.keys(appData.completedLevels).length;
    document.getElementById('map-total-levels').textContent = `${doneCount} Level Selesai`;

    const tabs = document.getElementById('world-tabs');
    tabs.innerHTML = WORLDS.map(w => {
        const active = w.id === selectedWorldId;
        return `<button onclick="sfxClick(); selectedWorldId='${w.id}'; renderAdventureMap()" class="flex-shrink-0 px-4 py-2.5 rounded-2xl font-fredoka font-bold text-sm sm:text-base border-2 transition ${
            active ? `bg-gradient-to-r ${w.color} text-white border-slate-900 shadow` : 'bg-white text-slate-700 border-slate-200'
        }">${w.icon} ${w.name}</button>`;
    }).join('');

    const world = WORLDS.find(w => w.id === selectedWorldId) || WORLDS[0];
    const detail = document.getElementById('world-detail-container');

    detail.innerHTML = world.subjects.map(subjId => {
        const subj = SUBJECTS[subjId];
        const allSubjQ = QUESTION_BANK.filter(q => q.subject === subjId);

        // Buat 5 level bertahap untuk tiap mata pelajaran
        let levelsHTML = '';
        for (let lvl = 1; lvl <= 5; lvl++) {
            const key = `${subjId}_${lvl}`;
            const prevKey = `${subjId}_${lvl - 1}`;
            const isDone = !!appData.completedLevels[key];
            const isUnlocked = lvl === 1 || !!appData.completedLevels[prevKey] || isDone;

            levelsHTML += `
                <button ${isUnlocked ? `onclick="startAdventureLevel('${subjId}', ${lvl})"` : 'disabled'} class="btn-3d rounded-2xl p-3 text-left border-2 flex items-center justify-between gap-2 ${
                    isDone ? 'bg-emerald-50 border-emerald-400 text-emerald-950' :
                    isUnlocked ? 'bg-amber-50 border-amber-400 text-slate-900' :
                    'bg-slate-100 border-slate-200 text-slate-400 opacity-70 cursor-not-allowed'
                }">
                    <div>
                        <p class="font-fredoka font-bold text-sm sm:text-base">${LEVEL_TITLES[lvl - 1]}</p>
                        <p class="text-[11px] font-bold opacity-80">${isDone ? 'Selesai • Bintang Diraih!' : isUnlocked ? 'Siap Dimainkan!' : 'Selesaikan level sebelumnya'}</p>
                    </div>
                    <span class="text-2xl">${isDone ? '⭐' : isUnlocked ? '🚀' : '🔒'}</span>
                </button>
            `;
        }

        return `
            <div class="bg-white rounded-3xl p-5 shadow-md border-2 border-sky-200 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${subj.color} text-white text-2xl flex items-center justify-center shadow">${subj.icon}</div>
                        <div>
                            <h3 class="font-fredoka text-xl font-bold text-slate-800">${subj.name}</h3>
                            <p class="text-xs font-bold text-slate-500">Bank Soal: ${allSubjQ.length} Soal • Hadiah: ${subj.badgeIcon} ${subj.badge}</p>
                        </div>
                    </div>
                    <button onclick="startStudySubject('${subjId}')" class="text-xs font-extrabold bg-sky-100 text-sky-800 px-3 py-1.5 rounded-xl hover:bg-sky-200">
                        Bebas Pilih Materi 📖
                    </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    ${levelsHTML}
                </div>
            </div>
        `;
    }).join('');
}

function renderStudyMode() {
    const grid = document.getElementById('study-subjects-grid');
    grid.innerHTML = Object.values(SUBJECTS).map(subj => {
        const qs = QUESTION_BANK.filter(q => q.subject === subj.id);
        const indicators = [...new Set(qs.map(q => q.indicator))];
        return `
            <div class="bg-white rounded-3xl p-5 shadow-md border-2 border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="w-12 h-12 rounded-2xl bg-gradient-to-br ${subj.color} text-white text-2xl flex items-center justify-center shadow">${subj.icon}</span>
                        <span class="text-xs font-extrabold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">${qs.length} Soal</span>
                    </div>
                    <h3 class="font-fredoka text-xl font-bold text-slate-800">${subj.name}</h3>
                    <p class="text-xs font-bold text-slate-500 mt-1">Cakupan: ${indicators.slice(0, 3).join(', ')}...</p>
                </div>
                <div class="space-y-2">
                    <button onclick="startStudySubject('${subj.id}')" class="btn-3d w-full bg-sky-500 text-white font-fredoka font-bold py-2.5 rounded-2xl text-sm">
                        📖 Pelajari Semua (${qs.length} Soal)
                    </button>
                    <select onchange="if(this.value) startStudyIndicator('${subj.id}', this.value)" class="w-full p-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50">
                        <option value="">🎯 Atau pilih 1 indikator khusus...</option>
                        ${indicators.map(ind => `<option value="${ind}">${ind}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function openPracticeSetup() {
    setupConfig = { mode: 'practice', count: 5 };
    document.getElementById('setup-badge').textContent = 'Mode Latihan Acak';
    document.getElementById('setup-icon').textContent = '🎯';
    document.getElementById('setup-title').textContent = 'Atur Latihan Soal';
    document.getElementById('setup-desc').textContent = 'Campuran Pilihan Ganda, Isian, Benar-Salah, Mencocokkan & Praktik!';
    document.getElementById('setup-subject-wrapper').classList.remove('hidden');
    document.getElementById('setup-timer-wrapper').classList.add('hidden');

    const sel = document.getElementById('setup-subject-select');
    sel.innerHTML = `<option value="ALL">🌟 Semua Mata Pelajaran (Campuran)</option>` +
        Object.values(SUBJECTS).map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
    navigate('setup');
}

function openChallengeSetup() {
    setupConfig = { mode: 'challenge', count: 10 };
    document.getElementById('setup-badge').textContent = 'Mode Tantangan Bos Level';
    document.getElementById('setup-icon').textContent = '👑';
    document.getElementById('setup-title').textContent = 'Tantangan Master Bintang';
    document.getElementById('setup-desc').textContent = 'Uji kemampuanmu dari seluruh mata pelajaran SAS 1!';
    document.getElementById('setup-subject-wrapper').classList.add('hidden');
    document.getElementById('setup-timer-wrapper').classList.remove('hidden');
    navigate('setup');
}

function selectSetupCount(cnt, btnEl) {
    sfxClick();
    setupConfig.count = cnt;
    document.querySelectorAll('.setup-cnt-btn').forEach(b => {
        b.className = 'setup-cnt-btn p-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-fredoka font-bold text-lg';
    });
    btnEl.className = 'setup-cnt-btn p-3 rounded-2xl border-2 border-sky-500 bg-sky-100 text-sky-900 font-fredoka font-bold text-lg';
}

/* ============================================================================
   BAGIAN 5: ENGINE PENGERJAAN SOAL CERDAS & 7 TIPE INTERAKSI
   ============================================================================ */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function startAdventureLevel(subjectId, levelNum) {
    const subj = SUBJECTS[subjectId];
    const pool = QUESTION_BANK.filter(q => q.subject === subjectId);
    // Ambil 4-5 soal sesuai tingkat kesulitan level
    let filtered = pool.filter(q => levelNum <= 2 ? q.diff <= 2 : levelNum >= 4 ? q.diff >= 2 : true);
    if (filtered.length < 4) filtered = pool;
    const selected = shuffle(filtered).slice(0, Math.min(5, filtered.length));

    beginSession({
        mode: 'adventure',
        title: `${subj.icon} ${subj.name} • Level ${levelNum}`,
        subjectId,
        levelNum,
        questions: selected,
        useTimer: false
    });
}

function startStudySubject(subjectId) {
    const subj = SUBJECTS[subjectId];
    const selected = shuffle(QUESTION_BANK.filter(q => q.subject === subjectId));
    beginSession({
        mode: 'study',
        title: `📖 Belajar: ${subj.name}`,
        subjectId,
        questions: selected,
        useTimer: false
    });
}

function startStudyIndicator(subjectId, indicator) {
    const subj = SUBJECTS[subjectId];
    const selected = shuffle(QUESTION_BANK.filter(q => q.subject === subjectId && q.indicator === indicator));
    beginSession({
        mode: 'study',
        title: `🎯 ${subj.name}: ${indicator}`,
        subjectId,
        questions: selected,
        useTimer: false
    });
}

function launchConfiguredSession() {
    const count = setupConfig.count;
    if (setupConfig.mode === 'practice') {
        const subjVal = document.getElementById('setup-subject-select').value;
        const pool = subjVal === 'ALL' ? QUESTION_BANK : QUESTION_BANK.filter(q => q.subject === subjVal);
        const title = subjVal === 'ALL' ? '🎯 Latihan Campuran' : `🎯 Latihan ${SUBJECTS[subjVal].name}`;
        beginSession({
            mode: 'practice',
            title,
            subjectId: subjVal === 'ALL' ? null : subjVal,
            questions: shuffle(pool).slice(0, Math.min(count, pool.length)),
            useTimer: false
        });
    } else {
        const useTimer = document.getElementById('setup-timer-toggle').checked;
        beginSession({
            mode: 'challenge',
            title: '👑 Tantangan Master Bintang',
            subjectId: null,
            questions: shuffle(QUESTION_BANK).slice(0, Math.min(count, QUESTION_BANK.length)),
            useTimer
        });
    }
}

function beginSession(config) {
    activeSession = {
        ...config,
        index: 0,
        correct: 0,
        wrong: 0,
        starsEarned: 0,
        attemptsOnCurrent: 0,
        solvedCurrent: false,
        masteredIndicators: new Set(),
        weakIndicators: new Set()
    };

    navigate('play');
    document.getElementById('play-header-title').textContent = activeSession.title;
    document.getElementById('play-q-total').textContent = activeSession.questions.length;

    const timerPill = document.getElementById('play-timer-pill');
    if (activeSession.useTimer) {
        timerSeconds = activeSession.questions.length * 45;
        timerPill.classList.remove('hidden');
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            if (timerSeconds <= 0) {
                stopTimer();
                finishSession();
            }
        }, 1000);
    } else {
        timerPill.classList.add('hidden');
    }

    renderCurrentQuestion();
}

function updateTimerDisplay() {
    const m = String(Math.floor(Math.max(0, timerSeconds) / 60)).padStart(2, '0');
    const s = String(Math.max(0, timerSeconds) % 60).padStart(2, '0');
    document.getElementById('play-timer-pill').textContent = `⏱️ ${m}:${s}`;
}

function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function renderCurrentQuestion() {
    const q = activeSession.questions[activeSession.index];
    const total = activeSession.questions.length;
    activeSession.attemptsOnCurrent = 0;
    activeSession.solvedCurrent = false;

    document.getElementById('play-q-num').textContent = activeSession.index + 1;
    document.getElementById('play-progress-bar').style.width = `${Math.max(8, (activeSession.index / total) * 100)}%`;

    const typeLabels = {
        mcq: 'Pilihan Ganda',
        tf: 'Benar / Salah',
        fill: 'Isian Singkat',
        essay: 'Uraian Sederhana',
        match: 'Mencocokkan Pasangan',
        order: 'Susun Urutan',
        sim: 'Simulasi Praktik'
    };
    document.getElementById('play-q-type-badge').textContent = typeLabels[q.type] || 'Soal';
    document.getElementById('play-q-indicator').textContent = `${SUBJECTS[q.subject].icon} ${q.indicator}`;

    document.getElementById('play-hint-box').classList.add('hidden');
    document.getElementById('play-hint-text').textContent = q.hint || 'Baca perlahan dan perhatikan gambarnya ya!';

    const vis = document.getElementById('play-visual');
    if (q.visual) {
        vis.innerHTML = q.visual;
        vis.classList.remove('hidden');
    } else {
        vis.classList.add('hidden');
    }

    document.getElementById('play-question-text').textContent = q.q;
    document.getElementById('play-feedback').classList.add('hidden');

    const area = document.getElementById('play-interaction-area');
    area.innerHTML = '';

    // Render sesuai tipe soal
    if (q.type === 'mcq' || q.type === 'sim') {
        const opts = shuffle(q.options.map((text, idx) => ({ text, isCorrect: idx === q.answer })));
        const colors = [
            'bg-sky-50 border-sky-300 text-sky-950',
            'bg-amber-50 border-amber-300 text-amber-950',
            'bg-emerald-50 border-emerald-300 text-emerald-950',
            'bg-purple-50 border-purple-300 text-purple-950'
        ];
        const letters = ['A', 'B', 'C', 'D'];
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';
        opts.forEach((o, i) => {
            const btn = document.createElement('button');
            btn.className = `btn-opt w-full text-left p-4 rounded-2xl border-2 font-bold text-base sm:text-lg flex items-center gap-3 ${colors[i % 4]}`;
            btn.dataset.correct = o.isCorrect ? '1' : '0';
            btn.onclick = () => evaluateMCQ(btn, o.isCorrect);
            btn.innerHTML = `<span class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-fredoka font-bold flex-shrink-0">${letters[i]}</span><span>${o.text}</span>`;
            grid.appendChild(btn);
        });
        area.appendChild(grid);
    }
    else if (q.type === 'tf') {
        area.innerHTML = `
            <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <button id="tf-true" onclick="evaluateTF(true)" class="btn-opt p-5 rounded-3xl border-2 border-emerald-400 bg-emerald-50 text-emerald-900 font-fredoka font-bold text-xl sm:text-2xl flex flex-col items-center gap-1">
                    <span class="text-4xl">⭕</span> BENAR
                </button>
                <button id="tf-false" onclick="evaluateTF(false)" class="btn-opt p-5 rounded-3xl border-2 border-rose-400 bg-rose-50 text-rose-900 font-fredoka font-bold text-xl sm:text-2xl flex flex-col items-center gap-1">
                    <span class="text-4xl">❌</span> SALAH
                </button>
            </div>
        `;
    }
    else if (q.type === 'fill') {
        area.innerHTML = `
            <div class="max-w-md mx-auto space-y-3">
                <input type="text" id="fill-input" autocomplete="off" placeholder="Ketik jawaban singkatmu di sini..." class="w-full p-4 rounded-2xl border-3 border-sky-300 bg-sky-50/50 text-center font-bold text-xl text-slate-800 focus:border-sky-600 outline-none">
                <button id="fill-submit" onclick="evaluateFill()" class="btn-3d w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-fredoka font-bold text-lg py-3.5 rounded-2xl">
                    ✅ Periksa Jawaban
                </button>
            </div>
        `;
        setTimeout(() => document.getElementById('fill-input')?.focus(), 150);
    }
    else if (q.type === 'essay') {
        area.innerHTML = `
            <div class="max-w-lg mx-auto space-y-3">
                <textarea id="essay-input" rows="2" placeholder="Tuliskan jawaban 1 kalimat pendekmu di sini..." class="w-full p-4 rounded-2xl border-2 border-indigo-300 bg-indigo-50/40 font-bold text-base sm:text-lg text-slate-800 focus:border-indigo-600 outline-none"></textarea>
                <div class="flex flex-col sm:flex-row gap-2.5">
                    <button id="essay-submit" onclick="evaluateEssay(false)" class="btn-3d flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-fredoka font-bold text-base sm:text-lg py-3 rounded-2xl">
                        ✅ Kirim Jawaban
                    </button>
                    <button id="essay-parent-check" onclick="evaluateEssay(true)" class="btn-3d bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl">
                        👨‍👩‍👧 Minta Dicek Orang Tua
                    </button>
                </div>
            </div>
        `;
    }
    else if (q.type === 'match') {
        renderMatchUI(q, area);
    }
    else if (q.type === 'order') {
        renderOrderUI(q, area);
    }
}

function showQuestionHint() {
    sfxClick();
    document.getElementById('play-hint-box').classList.remove('hidden');
}

/* --- Evaluasi Pilihan Ganda & Simulasi --- */
function evaluateMCQ(btnEl, isCorrect) {
    if (activeSession.solvedCurrent) return;
    const q = activeSession.questions[activeSession.index];

    if (isCorrect) {
        btnEl.classList.add('opt-correct');
        disableAllOptions();
        handleQuestionSuccess(q.explanation);
    } else {
        btnEl.classList.add('opt-wrong', 'animate-wiggle');
        btnEl.disabled = true;
        activeSession.attemptsOnCurrent++;
        if (activeSession.attemptsOnCurrent < 2) {
            showRetryFeedback();
        } else {
            // Tampilkan kunci setelah 2 kali mencoba
            document.querySelectorAll('#play-interaction-area button').forEach(b => {
                b.disabled = true;
                if (b.dataset.correct === '1') b.classList.add('opt-correct');
            });
            handleQuestionFailed(q.options[q.answer], q.explanation);
        }
    }
}

/* --- Evaluasi Benar / Salah --- */
function evaluateTF(userChoice) {
    if (activeSession.solvedCurrent) return;
    const q = activeSession.questions[activeSession.index];
    const isCorrect = userChoice === q.answer;
    const btnTrue = document.getElementById('tf-true');
    const btnFalse = document.getElementById('tf-false');
    btnTrue.disabled = true;
    btnFalse.disabled = true;

    if (isCorrect) {
        (userChoice ? btnTrue : btnFalse).classList.add('opt-correct');
        handleQuestionSuccess(q.explanation);
    } else {
        (userChoice ? btnTrue : btnFalse).classList.add('opt-wrong', 'animate-wiggle');
        (q.answer ? btnTrue : btnFalse).classList.add('opt-correct');
        handleQuestionFailed(q.answer ? 'BENAR' : 'SALAH', q.explanation);
    }
}

/* --- Evaluasi Isian Singkat --- */
function evaluateFill() {
    if (activeSession.solvedCurrent) return;
    const q = activeSession.questions[activeSession.index];
    const inp = document.getElementById('fill-input');
    const val = inp.value.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!val) {
        inp.classList.add('animate-wiggle', 'border-rose-400');
        setTimeout(() => inp.classList.remove('animate-wiggle', 'border-rose-400'), 450);
        return;
    }

    const isCorrect = q.answers.some(ans => val === ans.toLowerCase().trim());
    if (isCorrect) {
        inp.disabled = true;
        inp.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-900');
        document.getElementById('fill-submit').disabled = true;
        handleQuestionSuccess(q.explanation);
    } else {
        activeSession.attemptsOnCurrent++;
        inp.classList.add('animate-wiggle', 'border-rose-500');
        setTimeout(() => inp.classList.remove('animate-wiggle', 'border-rose-500'), 450);
        if (activeSession.attemptsOnCurrent < 2) {
            showRetryFeedback();
        } else {
            inp.disabled = true;
            document.getElementById('fill-submit').disabled = true;
            handleQuestionFailed(q.answers[0], q.explanation);
        }
    }
}

/* --- Evaluasi Essay Sederhana (Kata Kunci + Opsi Cek Orang Tua) --- */
function isSimilarWord(word, keyword) {
    if (word.includes(keyword) || keyword.includes(word)) return true;
    if (keyword.length < 5 || Math.abs(word.length - keyword.length) > 1) return false;
    // Cek kemiripan huruf (toleransi salah ketik 1 huruf)
    let diff = 0;
    const minLen = Math.min(word.length, keyword.length);
    for (let i = 0; i < minLen; i++) {
        if (word[i] !== keyword[i]) diff++;
    }
    diff += Math.abs(word.length - keyword.length);
    return diff <= 1;
}

function evaluateEssay(forceParentCheck) {
    if (activeSession.solvedCurrent) return;
    const q = activeSession.questions[activeSession.index];
    const inp = document.getElementById('essay-input');
    const rawVal = inp.value.trim();
    const cleanVal = rawVal.toLowerCase().replace(/[.,!?"]/g, '');

    if (!cleanVal && !forceParentCheck) {
        inp.classList.add('animate-wiggle', 'border-rose-400');
        setTimeout(() => inp.classList.remove('animate-wiggle', 'border-rose-400'), 450);
        return;
    }

    inp.disabled = true;
    document.getElementById('essay-submit').disabled = true;
    document.getElementById('essay-parent-check').disabled = true;

    const userWords = cleanVal.split(/\s+/);
    const matchedKeyword = q.keywords.some(kw => {
        const k = kw.toLowerCase();
        return cleanVal.includes(k) || userWords.some(w => isSimilarWord(w, k));
    });

    if (!forceParentCheck && matchedKeyword) {
        handleQuestionSuccess(`Bagus sekali! Contoh jawaban lengkap: "${q.sampleAnswer}". ${q.explanation}`);
    } else {
        appData.wrongLog.unshift({
            q: q.q,
            subjectName: SUBJECTS[q.subject].name,
            indicator: q.indicator,
            correctAns: `Perlu dicek Orang Tua (Jawaban anak: "${rawVal || '-'}")`,
            time: new Date().toLocaleDateString('id-ID')
        });
        saveData();
        handleQuestionSuccess(`Hebat sudah berani menulis! Jawabanmu dicatat untuk dicek Ayah/Ibu. Contoh jawaban: "${q.sampleAnswer}".`);
    }
}

/* --- Tipe 5: Mencocokkan Pasangan (Tap-to-Match Ramah HP) --- */
let matchState = { selectedLeft: null, matchedCount: 0, totalPairs: 0 };

function renderMatchUI(q, area) {
    const pairs = q.pairs;
    matchState = { selectedLeft: null, matchedCount: 0, totalPairs: pairs.length };

    const leftItems = shuffle(pairs.map((p, idx) => ({ text: p[0], id: idx })));
    const rightItems = shuffle(pairs.map((p, idx) => ({ text: p[1], id: idx })));

    area.innerHTML = `
        <p class="text-center text-xs font-extrabold text-slate-500 mb-3">👆 Ketuk 1 kotak di kiri, lalu ketuk pasangannya di kanan!</p>
        <div class="grid grid-cols-2 gap-3">
            <div id="match-left" class="space-y-2.5">
                ${leftItems.map(it => `<button data-id="${it.id}" onclick="tapMatchLeft(this)" class="match-l btn-opt w-full p-3.5 rounded-2xl border-2 border-sky-300 bg-sky-50 font-bold text-sm sm:text-base text-sky-950">${it.text}</button>`).join('')}
            </div>
            <div id="match-right" class="space-y-2.5">
                ${rightItems.map(it => `<button data-id="${it.id}" onclick="tapMatchRight(this)" class="match-r btn-opt w-full p-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50 font-bold text-sm sm:text-base text-amber-950">${it.text}</button>`).join('')}
            </div>
        </div>
    `;
}

function tapMatchLeft(btn) {
    if (btn.disabled || activeSession.solvedCurrent) return;
    sfxClick();
    document.querySelectorAll('.match-l').forEach(b => b.classList.remove('ring-4', 'ring-indigo-500', 'bg-indigo-100'));
    btn.classList.add('ring-4', 'ring-indigo-500', 'bg-indigo-100');
    matchState.selectedLeft = btn;
}

function tapMatchRight(btn) {
    if (btn.disabled || activeSession.solvedCurrent || !matchState.selectedLeft) return;
    const leftBtn = matchState.selectedLeft;
    const q = activeSession.questions[activeSession.index];

    if (leftBtn.dataset.id === btn.dataset.id) {
        sfxClick();
        leftBtn.disabled = true;
        btn.disabled = true;
        leftBtn.className = 'match-l w-full p-3.5 rounded-2xl border-2 opt-correct font-bold text-sm sm:text-base';
        btn.className = 'match-r w-full p-3.5 rounded-2xl border-2 opt-correct font-bold text-sm sm:text-base';
        matchState.selectedLeft = null;
        matchState.matchedCount++;

        if (matchState.matchedCount === matchState.totalPairs) {
            handleQuestionSuccess(q.explanation);
        }
    } else {
        sfxWrong();
        btn.classList.add('opt-wrong', 'animate-wiggle');
        setTimeout(() => btn.classList.remove('opt-wrong', 'animate-wiggle'), 450);
        activeSession.attemptsOnCurrent++;
    }
}

/* --- Tipe 6: Susun Urutan (Tap-to-Order Ramah HP) --- */
let orderState = { chosen: [], correctOrder: [] };

function renderOrderUI(q, area) {
    orderState = { chosen: [], correctOrder: [...q.items] };
    const pool = shuffle(q.items.map((text, idx) => ({ text, idx })));

    area.innerHTML = `
        <p class="text-center text-xs font-extrabold text-slate-500 mb-2">👆 Ketuk kotak di bawah sesuai urutan yang benar (1, 2, 3...)!</p>
        <div id="order-slots" class="min-h-[64px] bg-indigo-50/70 border-2 border-dashed border-indigo-300 rounded-2xl p-3 mb-3 flex flex-wrap gap-2 justify-center items-center">
            <span class="text-xs font-bold text-indigo-400">Urutan jawabanmu akan muncul di sini...</span>
        </div>
        <div id="order-pool" class="flex flex-wrap gap-2.5 justify-center">
            ${pool.map(p => `<button data-text="${p.text}" onclick="tapOrderItem(this)" class="order-btn btn-opt px-4 py-3 rounded-2xl border-2 border-amber-300 bg-amber-50 font-bold text-sm sm:text-base text-amber-950">${p.text}</button>`).join('')}
        </div>
        <div class="flex justify-center gap-3 mt-4">
            <button onclick="resetOrderUI()" class="btn-3d bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl">🔄 Ulangi Urutan</button>
            <button id="order-check-btn" onclick="evaluateOrder()" class="btn-3d bg-emerald-500 text-white font-fredoka font-bold text-sm sm:text-base px-6 py-2.5 rounded-xl">✅ Cek Urutan</button>
        </div>
    `;
}

function tapOrderItem(btn) {
    if (btn.disabled || activeSession.solvedCurrent) return;
    sfxClick();
    btn.disabled = true;
    btn.classList.add('opacity-40');
    orderState.chosen.push(btn.dataset.text);
    updateOrderSlots();
}

function resetOrderUI() {
    if (activeSession.solvedCurrent) return;
    sfxClick();
    orderState.chosen = [];
    document.querySelectorAll('.order-btn').forEach(b => {
        b.disabled = false;
        b.classList.remove('opacity-40');
    });
    updateOrderSlots();
}

function updateOrderSlots() {
    const slots = document.getElementById('order-slots');
    if (orderState.chosen.length === 0) {
        slots.innerHTML = `<span class="text-xs font-bold text-indigo-400">Urutan jawabanmu akan muncul di sini...</span>`;
        return;
    }
    slots.innerHTML = orderState.chosen.map((txt, i) => `
        <span class="bg-indigo-600 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow flex items-center gap-1.5">
            <span class="bg-amber-400 text-slate-900 w-5 h-5 rounded-full text-xs flex items-center justify-center font-fredoka">${i + 1}</span>
            ${txt}
        </span>
    `).join('');
}

function evaluateOrder() {
    if (activeSession.solvedCurrent) return;
    const q = activeSession.questions[activeSession.index];
    if (orderState.chosen.length < orderState.correctOrder.length) {
        showRetryFeedback('Pilih semua kotak sampai lengkap dulu ya! 😊');
        return;
    }

    const isCorrect = orderState.chosen.every((val, idx) => val === orderState.correctOrder[idx]);
    if (isCorrect) {
        document.getElementById('order-check-btn').disabled = true;
        handleQuestionSuccess(q.explanation);
    } else {
        activeSession.attemptsOnCurrent++;
        if (activeSession.attemptsOnCurrent < 2) {
            resetOrderUI();
            showRetryFeedback();
        } else {
            document.getElementById('order-check-btn').disabled = true;
            handleQuestionFailed(orderState.correctOrder.join(' ➡️ '), q.explanation);
        }
    }
}

function disableAllOptions() {
    document.querySelectorAll('#play-interaction-area button').forEach(b => b.disabled = true);
}

/* --- Penanganan Hasil Per Soal & Statistik Indikator --- */
function recordIndicatorResult(q, isRight) {
    const key = `${SUBJECTS[q.subject].name}|${q.indicator}`;
    if (!appData.indicatorStats[key]) appData.indicatorStats[key] = { right: 0, wrong: 0 };
    if (isRight) {
        appData.indicatorStats[key].right++;
        activeSession.masteredIndicators.add(`${SUBJECTS[q.subject].name}: ${q.indicator}`);
    } else {
        appData.indicatorStats[key].wrong++;
        activeSession.weakIndicators.add(`${SUBJECTS[q.subject].name}: ${q.indicator}`);
    }
}

function showRetryFeedback(customMsg) {
    sfxWrong();
    const fb = document.getElementById('play-feedback');
    fb.className = 'rounded-2xl p-4 border-2 bg-amber-50 border-amber-400 text-amber-950 animate-pop mt-4';
    document.getElementById('fb-icon').textContent = '💫';
    document.getElementById('fb-title').textContent = customMsg || MOTIVATION_RETRY[Math.floor(Math.random() * MOTIVATION_RETRY.length)];
    document.getElementById('fb-text').textContent = 'Coba pilih jawaban yang lain ya, kamu pasti bisa!';
    const btn = document.getElementById('fb-action-btn');
    btn.textContent = 'Coba Lagi 💪';
    btn.onclick = () => { sfxClick(); fb.classList.add('hidden'); };
    fb.classList.remove('hidden');
}

function handleQuestionSuccess(explanation) {
    activeSession.solvedCurrent = true;
    const isFirstTry = activeSession.attemptsOnCurrent === 0;

    if (isFirstTry) {
        activeSession.correct++;
    } else {
        activeSession.wrong++;
    }

    const earned = isFirstTry ? 2 : 1;
    activeSession.starsEarned += earned;
    appData.stars += earned;

    const q = activeSession.questions[activeSession.index];
    recordIndicatorResult(q, isFirstTry);
    saveData();

    sfxCorrect();
    spawnConfetti(35);

    const fb = document.getElementById('play-feedback');
    fb.className = 'rounded-2xl p-4 sm:p-5 border-2 bg-emerald-50 border-emerald-400 text-emerald-950 animate-pop mt-4';
    document.getElementById('fb-icon').textContent = '🌟';
    document.getElementById('fb-title').textContent = `${MOTIVATION_SUCCESS[Math.floor(Math.random() * MOTIVATION_SUCCESS.length)]} (+${earned} ⭐)`;
    document.getElementById('fb-text').textContent = explanation;
    setupNextButton();
    fb.classList.remove('hidden');
}

function handleQuestionFailed(correctText, explanation) {
    activeSession.solvedCurrent = true;
    activeSession.wrong++;

    const q = activeSession.questions[activeSession.index];
    recordIndicatorResult(q, false);

    appData.wrongLog.unshift({
        q: q.q,
        subjectName: SUBJECTS[q.subject].name,
        indicator: q.indicator,
        correctAns: correctText,
        time: new Date().toLocaleDateString('id-ID')
    });
    if (appData.wrongLog.length > 40) appData.wrongLog.pop();
    saveData();

    sfxWrong();

    const fb = document.getElementById('play-feedback');
    fb.className = 'rounded-2xl p-4 sm:p-5 border-2 bg-rose-50 border-rose-300 text-rose-950 animate-pop mt-4';
    document.getElementById('fb-icon').textContent = '💡';
    document.getElementById('fb-title').textContent = 'Tidak apa-apa, kita belajar bersama! Jawaban yang benar: ' + correctText;
    document.getElementById('fb-text').textContent = explanation;
    setupNextButton();
    fb.classList.remove('hidden');
}

function setupNextButton() {
    const btn = document.getElementById('fb-action-btn');
    const isLast = activeSession.index + 1 >= activeSession.questions.length;
    btn.textContent = isLast ? 'Lihat Hasil 🏆' : 'Soal Berikutnya ➡️';
    btn.onclick = () => {
        sfxClick();
        if (!isLast) {
            activeSession.index++;
            renderCurrentQuestion();
        } else {
            finishSession();
        }
    };
}

function finishSession() {
    stopTimer();
    sfxVictory();
    spawnConfetti(100);

    const total = activeSession.questions.length;
    const correct = activeSession.correct;
    const wrong = activeSession.wrong;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Bonus menyelesaikan level & pembukaan badge
    let bonusMsg = 'Petualangan Bintang Selesai!';
    if (activeSession.mode === 'adventure' && activeSession.subjectId && percent >= 60) {
        const lvlKey = `${activeSession.subjectId}_${activeSession.levelNum}`;
        if (!appData.completedLevels[lvlKey]) {
            appData.completedLevels[lvlKey] = true;
            appData.stars += 3;
            activeSession.starsEarned += 3;
        }
        const subj = SUBJECTS[activeSession.subjectId];
        if (!appData.unlockedBadges.includes(subj.id)) {
            appData.unlockedBadges.push(subj.id);
        }
        bonusMsg = `🎉 Lencana Terbuka: ${subj.badgeIcon} ${subj.badge}!`;
    } else if (activeSession.subjectId && percent >= 70) {
        const subj = SUBJECTS[activeSession.subjectId];
        if (!appData.unlockedBadges.includes(subj.id)) {
            appData.unlockedBadges.push(subj.id);
            bonusMsg = `🎉 Lencana Terbuka: ${subj.badgeIcon} ${subj.badge}!`;
        }
    }

    // Simpan riwayat sesi
    appData.sessions.unshift({
        date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        title: activeSession.title,
        total,
        correct,
        percent,
        stars: activeSession.starsEarned
    });
    if (appData.sessions.length > 30) appData.sessions.pop();
    saveData();

    // Isi Halaman Hasil
    document.getElementById('res-emoji').textContent = percent >= 80 ? '🏆' : percent >= 50 ? '🌟' : '🚀';
    document.getElementById('res-badge-pill').textContent = bonusMsg;
    document.getElementById('res-title').textContent = percent >= 80 ? 'MasyaAllah, Juara Bintang!' : 'Wah, Kamu Hebat Sudah Berusaha!';
    document.getElementById('res-message').textContent = 'Wah, kamu sudah menyelesaikan petualangan hari ini! Setiap jawaban membuatmu semakin pintar. Yuk, terus kumpulkan bintang!';

    document.getElementById('res-total').textContent = total;
    document.getElementById('res-correct').textContent = correct;
    document.getElementById('res-wrong').textContent = wrong;
    document.getElementById('res-percent').textContent = `${percent}%`;
    document.getElementById('res-stars').textContent = `+${activeSession.starsEarned} ⭐`;

    const masteredArr = [...activeSession.masteredIndicators];
    const weakArr = [...activeSession.weakIndicators];

    document.getElementById('res-mastered-list').innerHTML = masteredArr.length
        ? masteredArr.map(m => `<li>• ${m}</li>`).join('')
        : '<li>• Terus berlatih untuk membuka indikator dikuasai!</li>';

    document.getElementById('res-weak-list').innerHTML = weakArr.length
        ? weakArr.map(w => `<li>• ${w}</li>`).join('')
        : '<li>• Keren! Semua soal di sesi ini terjawab dengan baik!</li>';

    navigate('result');
}

function replayLastSession() {
    if (!activeSession) { navigate('home'); return; }
    beginSession({
        mode: activeSession.mode,
        title: activeSession.title,
        subjectId: activeSession.subjectId,
        levelNum: activeSession.levelNum,
        questions: shuffle(activeSession.questions),
        useTimer: activeSession.useTimer
    });
}

function confirmExitPlay() {
    openDialog('🏠', 'Keluar dari Soal?', 'Apakah kamu yakin ingin kembali ke beranda?', () => navigate('home'));
}

/* ============================================================================
   BAGIAN 6: HALAMAN LENCANA & DASHBOARD ORANG TUA (PIN + EXPORT/IMPORT)
   ============================================================================ */
function renderBadgesPage() {
    document.getElementById('badges-page-count').textContent = `${appData.unlockedBadges.length}/13`;
    document.getElementById('badges-collection-grid').innerHTML = Object.values(SUBJECTS).map(s => {
        const unlocked = appData.unlockedBadges.includes(s.id);
        return `
            <div class="p-4 rounded-3xl border-2 text-center ${unlocked ? 'bg-gradient-to-b from-amber-50 to-yellow-100 border-amber-400 shadow' : 'bg-white border-slate-200 opacity-60'}">
                <div class="text-5xl mb-2">${unlocked ? s.badgeIcon : '🔒'}</div>
                <h4 class="font-fredoka font-bold text-base text-slate-800">${s.badge}</h4>
                <p class="text-xs font-bold ${unlocked ? 'text-amber-700' : 'text-slate-500'} mt-1">${s.name}</p>
            </div>
        `;
    }).join('');
}

function openParentGate() {
    sfxClick();
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').classList.add('hidden');
    document.getElementById('modal-pin').classList.remove('hidden');
    setTimeout(() => document.getElementById('pin-input').focus(), 100);
}

function closePinModal() {
    document.getElementById('modal-pin').classList.add('hidden');
}

function verifyParentPin() {
    const val = document.getElementById('pin-input').value.trim();
    if (val === appData.pin) {
        closePinModal();
        navigate('parent');
    } else {
        document.getElementById('pin-error').classList.remove('hidden');
    }
}

function renderParentDashboard() {
    document.getElementById('parent-child-name').textContent = appData.playerName;
    document.getElementById('par-stars').textContent = `${appData.stars} ⭐`;
    document.getElementById('par-sessions').textContent = appData.sessions.length;
    document.getElementById('par-qcount').textContent = `${QUESTION_BANK.length} Soal`;
    document.getElementById('par-badges').textContent = `${appData.unlockedBadges.length} / 13`;

    // Penguasaan per Mapel
    document.getElementById('par-subject-bars').innerHTML = Object.values(SUBJECTS).map(s => {
        let right = 0, wrong = 0;
        Object.entries(appData.indicatorStats).forEach(([k, v]) => {
            if (k.startsWith(s.name + '|')) { right += v.right; wrong += v.wrong; }
        });
        const tot = right + wrong;
        const pct = tot > 0 ? Math.round((right / tot) * 100) : 0;
        return `
            <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div class="flex justify-between text-xs font-extrabold mb-1">
                    <span>${s.icon} ${s.name}</span>
                    <span class="text-sky-700">${tot > 0 ? `${pct}% (${right}/${tot})` : 'Belum dimainkan'}</span>
                </div>
                <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Indikator lemah
    const weakEntries = Object.entries(appData.indicatorStats)
        .filter(([, v]) => v.wrong > 0 && v.wrong >= v.right)
        .sort((a, b) => b[1].wrong - a[1].wrong);

    const weakBox = document.getElementById('par-weak-indicators');
    weakBox.innerHTML = weakEntries.length ? weakEntries.map(([key, v]) => {
        const [subjName, ind] = key.split('|');
        const subjObj = Object.values(SUBJECTS).find(x => x.name === subjName);
        return `
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                <div>
                    <p class="text-xs font-extrabold text-rose-900">${subjName} • ${ind}</p>
                    <p class="text-[11px] font-bold text-rose-700">Benar: ${v.right} | Salah: ${v.wrong}</p>
                </div>
                ${subjObj ? `<button onclick="startStudyIndicator('${subjObj.id}', '${ind.replace(/'/g, "\\'")}')" class="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">Latih Sekarang</button>` : ''}
            </div>
        `;
    }).join('') : `<p class="text-xs font-bold text-slate-400">Belum ada indikator lemah yang tercatat. Bagus sekali!</p>`;

    // Log soal salah
    const logBox = document.getElementById('par-wrong-log');
    logBox.innerHTML = appData.wrongLog.length ? appData.wrongLog.map(item => `
        <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <p class="font-extrabold text-slate-800">[${item.subjectName}] ${item.q}</p>
            <p class="font-bold text-emerald-700 mt-0.5">Kunci / Catatan: ${item.correctAns}</p>
        </div>
    `).join('') : `<p class="text-xs font-bold text-slate-400">Belum ada catatan soal salah.</p>`;

    // Riwayat sesi
    const histBox = document.getElementById('par-history-list');
    histBox.innerHTML = appData.sessions.length ? appData.sessions.map(ses => `
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-bold">
            <div>
                <p class="text-slate-800">${ses.title}</p>
                <p class="text-slate-400">${ses.date}</p>
            </div>
            <div class="text-right">
                <span class="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg">Nilai ${ses.percent}% (${ses.correct}/${ses.total})</span>
                <span class="ml-1 text-amber-600">+${ses.stars} ⭐</span>
            </div>
        </div>
    `).join('') : `<p class="text-xs font-bold text-slate-400">Belum ada riwayat sesi permainan.</p>`;
}

function changeParentPin() {
    openInputDialog('🔑', 'Ubah PIN Orang Tua', 'Masukkan 4 digit angka PIN baru:', appData.pin, (newPin) => {
        if (/^\d{4}$/.test(newPin.trim())) {
            appData.pin = newPin.trim();
            saveData();
            openDialog('✅', 'PIN Diperbarui', `PIN baru Anda adalah ${appData.pin}`, () => {});
        } else {
            openDialog('⚠️', 'Format Salah', 'PIN harus terdiri dari 4 digit angka.', () => {});
        }
    });
}

function exportProgressJSON() {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_petualangan_bintang_${appData.playerName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importProgressJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (typeof imported.stars === 'number') {
                appData = { ...appData, ...imported };
                saveData();
                renderParentDashboard();
                openDialog('✅', 'Backup Dipulihkan', 'Data progres belajar berhasil dimuat!', () => {});
            }
        } catch {
            openDialog('⚠️', 'File Tidak Valid', 'Pastikan file backup berformat JSON yang benar.', () => {});
        }
    };
    reader.readAsText(file);
}

function confirmResetAllData() {
    openDialog('🗑️', 'Reset Semua Progress?', 'Seluruh bintang, lencana, dan riwayat belajar akan dihapus menjadi 0. Yakin?', () => {
        appData.stars = 0;
        appData.unlockedBadges = [];
        appData.completedLevels = {};
        appData.indicatorStats = {};
        appData.wrongLog = [];
        appData.sessions = [];
        saveData();
        renderParentDashboard();
    });
}

function promptPlayerName() {
    openInputDialog('✏️', 'Nama Petualang Cilik', 'Siapa namamu, anak hebat?', appData.playerName, (name) => {
        if (name.trim()) {
            appData.playerName = name.trim();
            saveData();
        }
    });
}

/* ============================================================================
   BAGIAN 7: MODAL DIALOG KUSTOM & ANIMASI KONFETI
   ============================================================================ */
function openDialog(icon, title, body, onOk) {
    document.getElementById('dlg-icon').textContent = icon;
    document.getElementById('dlg-title').textContent = title;
    document.getElementById('dlg-body').textContent = body;
    document.getElementById('dlg-input-wrap').classList.add('hidden');
    document.getElementById('dlg-ok').onclick = () => { closeDialog(); onOk(); };
    document.getElementById('modal-dialog').classList.remove('hidden');
}

function openInputDialog(icon, title, body, defaultVal, onOk) {
    document.getElementById('dlg-icon').textContent = icon;
    document.getElementById('dlg-title').textContent = title;
    document.getElementById('dlg-body').textContent = body;
    const wrap = document.getElementById('dlg-input-wrap');
    const inp = document.getElementById('dlg-input');
    wrap.classList.remove('hidden');
    inp.value = defaultVal;
    document.getElementById('dlg-ok').onclick = () => { closeDialog(); onOk(inp.value); };
    document.getElementById('modal-dialog').classList.remove('hidden');
    setTimeout(() => inp.focus(), 100);
}

function closeDialog() {
    document.getElementById('modal-dialog').classList.add('hidden');
}

/* Confetti Canvas */
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animId = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnConfetti(count) {
    const colors = ['#FACC15', '#38BDF8', '#4ADE80', '#F472B6', '#A78BFA', '#FB923C'];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 80,
            size: 7 + Math.random() * 7,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: 3 + Math.random() * 4,
            vx: (Math.random() - 0.5) * 4,
            rot: Math.random() * 360,
            vrot: (Math.random() - 0.5) * 10
        });
    }
    if (!animId) loopConfetti();
}

function loopConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, idx) => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
        if (p.y > canvas.height + 20) particles.splice(idx, 1);
    });
    animId = particles.length > 0 ? requestAnimationFrame(loopConfetti) : null;
}

window.onload = function () {
    loadData();
    renderHomeWorlds();
};