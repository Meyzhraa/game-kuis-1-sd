/* ============================================================================
   BAGIAN 1: STRUKTUR PETA DUNIA, MATA PELAJARAN & VISUAL SVG INTERAKTIF
   ============================================================================ */
const WORLDS = [
    {
        id: 'akhlak',
        name: 'Pulau Akhlak & Ibadah',
        icon: '🕌',
        color: 'from-emerald-400 to-teal-600',
        bgSoft: 'bg-emerald-50 border-emerald-300',
        desc: 'Pendidikan Pancasila, Character Building & Pendidikan Agama Islam',
        subjects: ['pancasila', 'cb', 'pai']
    },
    {
        id: 'bahasa',
        name: 'Hutan Bahasa & Budaya',
        icon: '📚',
        color: 'from-sky-400 to-blue-600',
        bgSoft: 'bg-sky-50 border-sky-300',
        desc: 'Bahasa Indonesia, Bahasa Inggris, Bahasa Arab & Bahasa Sunda',
        subjects: ['bindo', 'inggris', 'arab', 'sunda']
    },
    {
        id: 'sains',
        name: 'Planet Logika & Sains',
        icon: '🚀',
        color: 'from-amber-400 to-orange-600',
        bgSoft: 'bg-amber-50 border-amber-300',
        desc: 'Matematika, IPAS & Informatika (TIK)',
        subjects: ['mtk', 'ipas', 'informatika']
    },
    {
        id: 'seni',
        name: 'Taman Seni & Gerak',
        icon: '🎨',
        color: 'from-pink-400 to-rose-600',
        bgSoft: 'bg-pink-50 border-pink-300',
        desc: 'Seni Budaya & Prakarya (SBdP) dan PJOK',
        subjects: ['sbdp', 'pjok']
    },
    {
        id: 'praktik',
        name: 'Galaksi Ujian Praktik',
        icon: '🌙',
        color: 'from-purple-500 to-indigo-700',
        bgSoft: 'bg-purple-50 border-purple-300',
        desc: 'Tahfiz Qur’an (Halaqah 1-3), Tahfiz al-Hadis & Tahfiz Du’a',
        subjects: ['praktik']
    }
];

const SUBJECTS = {
    pancasila: { id: 'pancasila', name: 'Pendidikan Pancasila', icon: '🇮🇩', badge: 'Bintang Pancasila', badgeIcon: '🎖️', color: 'from-rose-500 to-red-600' },
    cb:        { id: 'cb', name: 'Character Building', icon: '💖', badge: 'Anak Beradab Mulia', badgeIcon: '👑', color: 'from-pink-500 to-rose-600' },
    pai:       { id: 'pai', name: 'Pendidikan Agama Islam', icon: '🕌', badge: 'Anak Sholeh & Sholehah', badgeIcon: '🌙', color: 'from-emerald-600 to-green-700' },
    bindo:     { id: 'bindo', name: 'Bahasa Indonesia', icon: '📖', badge: 'Jagoan Bahasa', badgeIcon: '📚', color: 'from-sky-500 to-blue-600' },
    inggris:   { id: 'inggris', name: 'Bahasa Inggris', icon: '🇬🇧', badge: 'English Star Kid', badgeIcon: '🌟', color: 'from-indigo-500 to-violet-600' },
    arab:      { id: 'arab', name: 'Bahasa Arab', icon: '🌴', badge: 'Bintang Bahasa Arab', badgeIcon: '🕌', color: 'from-lime-600 to-green-700' },
    sunda:     { id: 'sunda', name: 'Bahasa Sunda', icon: '🎶', badge: 'Barudak Pinter Sunda', badgeIcon: '🎋', color: 'from-teal-500 to-cyan-600' },
    mtk:       { id: 'mtk', name: 'Matematika', icon: '🔢', badge: 'Juara Berhitung', badgeIcon: '🧮', color: 'from-amber-500 to-orange-600' },
    ipas:      { id: 'ipas', name: 'IPAS', icon: '🌱', badge: 'Penjelajah Alam Cilik', badgeIcon: '🔬', color: 'from-cyan-500 to-sky-600' },
    informatika:{ id: 'informatika', name: 'Informatika (TIK)', icon: '💻', badge: 'Jagoan Komputer Cilik', badgeIcon: '🖱️', color: 'from-slate-600 to-slate-800' },
    sbdp:      { id: 'sbdp', name: 'SBdP', icon: '🎨', badge: 'Seniman Kreatif', badgeIcon: '🖌️', color: 'from-fuchsia-500 to-pink-600' },
    pjok:      { id: 'pjok', name: 'PJOK', icon: '⚽', badge: 'Atlet Cilik Sehat', badgeIcon: '🏅', color: 'from-green-500 to-emerald-600' },
    praktik:   { id: 'praktik', name: 'Ujian Praktik Tahfiz & Du’a', icon: '📖', badge: 'Hafiz Cilik Al Mahmudah', badgeIcon: '✨', color: 'from-amber-500 to-orange-600' }
};

const LEVEL_TITLES = [
    'Level 1: Pemanasan',
    'Level 2: Petualang Pemula',
    'Level 3: Penjelajah Bintang',
    'Level 4: Tantangan Hebat',
    'Level 5: Master Bintang'
];

/* Helper Generator SVG Visual */
function svgClock(hour, minute) {
    const minAngle = minute * 6;
    const hourAngle = ((hour % 12) + minute / 60) * 30;
    let nums = '';
    for (let i = 1; i <= 12; i++) {
        const rad = (i * 30 - 90) * Math.PI / 180;
        const x = 65 + 45 * Math.cos(rad);
        const y = 69 + 45 * Math.sin(rad);
        nums += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#1E293B">${i}</text>`;
    }
    return `<svg viewBox="0 0 130 130" class="w-32 h-32 mx-auto drop-shadow">
        <circle cx="65" cy="65" r="59" fill="#FFF" stroke="#0284C7" stroke-width="5"/>
        <circle cx="65" cy="65" r="54" fill="none" stroke="#E0F2FE" stroke-width="2"/>
        ${nums}
        <line x1="65" y1="65" x2="65" y2="25" stroke="#334155" stroke-width="3.5" stroke-linecap="round" transform="rotate(${minAngle} 65 65)"/>
        <line x1="65" y1="65" x2="65" y2="37" stroke="#EF4444" stroke-width="5.5" stroke-linecap="round" transform="rotate(${hourAngle} 65 65)"/>
        <circle cx="65" cy="65" r="4.5" fill="#0F172A"/>
    </svg>`;
}

function svgDice(n) {
    const dots = {
        1: [[25,25]],
        2: [[14,14],[36,36]],
        3: [[14,14],[25,25],[36,36]],
        4: [[14,14],[36,14],[14,36],[36,36]],
        5: [[14,14],[36,14],[25,25],[14,36],[36,36]],
        6: [[14,12],[36,12],[14,25],[36,25],[14,38],[36,38]]
    }[n] || [[25,25]];
    return `<svg viewBox="0 0 50 50" class="w-14 h-14 inline-block">
        <rect x="3" y="3" width="44" height="44" rx="9" fill="#FEF08A" stroke="#CA8A04" stroke-width="3"/>
        ${dots.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#1E293B"/>`).join('')}
    </svg>`;
}

/* Gambar Rumah SBdP Asli dari Lampiran (Genting zigzag, tiang lurus, kabel melengkung, jendela lingkaran, pintu segi empat + titik gagang, atap segitiga, kucing, pohon, batu, rumput) */
const SVG_SBDP_HOUSE = `<svg viewBox="0 0 320 185" class="w-full max-w-md h-44 mx-auto rounded-2xl border-2 border-sky-300 shadow-sm">
    <!-- Langit & Tanah -->
    <rect x="0" y="0" width="320" height="120" fill="#38BDF8"/>
    <rect x="0" y="120" width="320" height="65" fill="#A3E635"/>
    <!-- Tiang Listrik (Garis Lurus) & Kabel (Garis Melengkung) -->
    <rect x="26" y="30" width="12" height="90" fill="#94A3B8" stroke="#334155" stroke-width="2"/>
    <rect x="24" y="36" width="16" height="10" fill="#FACC15" stroke="#334155" stroke-width="1.5"/>
    <path d="M 32 32 Q 160 65 315 28" fill="none" stroke="#1E293B" stroke-width="2.5"/>
    <!-- Badan Rumah (Segi Empat) -->
    <rect x="90" y="68" width="110" height="52" fill="#FEF08A" stroke="#1E293B" stroke-width="2"/>
    <!-- Atap Rumah (Segitiga) & Genting Zigzag -->
    <polygon points="82,68 145,25 208,68" fill="#F59E0B" stroke="#1E293B" stroke-width="2"/>
    <polyline points="105,58 115,48 125,58 135,48 145,58 155,48 165,58 175,48 185,58" fill="none" stroke="#78350F" stroke-width="2.5"/>
    <!-- Jam Dinding & Jendela Bulat (Lingkaran) -->
    <circle cx="145" cy="52" r="10" fill="#1D4ED8" stroke="#FFF" stroke-width="1.5"/>
    <circle cx="114" cy="90" r="10" fill="#E0F2FE" stroke="#1E293B" stroke-width="2"/>
    <!-- Pintu (Segi Empat) & Gagang/Lubang Kunci (Titik) -->
    <rect x="142" y="84" width="22" height="36" fill="#E2E8F0" stroke="#1E293B" stroke-width="2"/>
    <circle cx="159" cy="103" r="2.5" fill="#0F172A"/>
    <!-- Jendela Kotak -->
    <rect x="172" y="85" width="18" height="18" fill="#FFF" stroke="#1E293B" stroke-width="1.5"/>
    <!-- Jalan Segitiga -->
    <polygon points="142,120 164,120 185,185 115,185" fill="#D97706" stroke="#78350F" stroke-width="1.5"/>
    <!-- Pohon (Non-Geometris) -->
    <rect x="242" y="82" width="14" height="38" fill="#92400E"/>
    <path d="M225,85 Q218,62 238,54 Q250,42 265,55 Q282,64 272,85 Z" fill="#16A34A" stroke="#14532D" stroke-width="2"/>
    <!-- Kucing, Batu, Rumput (Non-Geometris) -->
    <text x="65" y="152" font-size="24">🐈</text>
    <ellipse cx="265" cy="155" rx="18" ry="11" fill="#64748B" stroke="#334155" stroke-width="2"/>
    <text x="205" y="148" font-size="16">🌱</text>
    <text x="35" y="168" font-size="16">🌱</text>
</svg>`;

const SVG_MONITOR = `<svg viewBox="0 0 120 90" class="w-28 h-24 mx-auto"><rect x="15" y="10" width="90" height="56" rx="6" fill="#E0F2FE" stroke="#1E293B" stroke-width="4"/><polygon points="28,55 48,32 66,55" fill="#38BDF8"/><circle cx="82" cy="28" r="7" fill="#FACC15"/><rect x="52" y="66" width="16" height="12" fill="#64748B"/><rect x="36" y="76" width="48" height="6" rx="3" fill="#334155"/></svg>`;
const SVG_MOUSE = `<svg viewBox="0 0 90 110" class="w-24 h-28 mx-auto"><path d="M45 25 C45 10, 65 10, 65 5" fill="none" stroke="#334155" stroke-width="3"/><rect x="22" y="25" width="46" height="72" rx="23" fill="#F8FAFC" stroke="#1E293B" stroke-width="4"/><line x1="22" y1="54" x2="68" y2="54" stroke="#1E293B" stroke-width="3"/><line x1="45" y1="25" x2="45" y2="54" stroke="#1E293B" stroke-width="3"/><rect x="42" y="34" width="6" height="12" rx="3" fill="#0284C7"/></svg>`;
const SVG_POWER = `<svg viewBox="0 0 90 90" class="w-24 h-24 mx-auto"><rect x="12" y="12" width="66" height="66" rx="16" fill="#F1F5F9" stroke="#1E293B" stroke-width="4"/><path d="M33 31 A 18 18 0 1 0 57 31" fill="none" stroke="#EF4444" stroke-width="5" stroke-linecap="round"/><line x1="45" y1="22" x2="45" y2="44" stroke="#EF4444" stroke-width="5" stroke-linecap="round"/></svg>`;
const SVG_RINGS = `<svg viewBox="0 0 210 70" class="w-52 h-20 mx-auto"><ellipse cx="35" cy="35" rx="16" ry="8" fill="#FACC15" stroke="#1E293B" stroke-width="2"/><ellipse cx="35" cy="35" rx="5" ry="2.5" fill="#FFF"/><text x="35" y="60" text-anchor="middle" font-size="11" font-weight="bold">Kecil</text><ellipse cx="105" cy="35" rx="32" ry="13" fill="#38BDF8" stroke="#1E293B" stroke-width="2"/><ellipse cx="105" cy="35" rx="9" ry="4" fill="#FFF"/><text x="105" y="60" text-anchor="middle" font-size="11" font-weight="bold">Besar</text><ellipse cx="175" cy="35" rx="24" ry="10" fill="#F472B6" stroke="#1E293B" stroke-width="2"/><ellipse cx="175" cy="35" rx="7" ry="3" fill="#FFF"/><text x="175" y="60" text-anchor="middle" font-size="11" font-weight="bold">Sedang</text></svg>`;