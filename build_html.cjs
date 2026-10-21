const fs = require('fs');
const cheerio = require('cheerio');

// 1. Baca data
const htmlDocs = fs.readFileSync('./tmp/shorekeeper.html', 'utf8');
const htmlHome = fs.readFileSync('./tmp/home.html', 'utf8');
const css = fs.readFileSync('./tmp/shorekeeper.css', 'utf8');
const endpoints = JSON.parse(fs.readFileSync('./tmp/endpoints.json', 'utf8'));

// 2. Parse Docs HTML
const $ = cheerio.load(htmlDocs);

// Bersihkan script, preload, stylesheet bawaan Next.js
$('script').remove();
$('link[rel=preload]').remove();
$('link[rel=stylesheet]').remove();

$('title').text('Shorekeeper API - Fast Response, No API Key');

// 3. Ekstrak konten Landing Page Home
const $home = cheerio.load(htmlHome);
const homeMain = $home('main');

// Siapkan container SPA (view-home dan view-docs)
const docsMain = $('main');
const docsMainHtml = docsMain.html();

// Ubah body agar memiliki view-home dan view-docs
$('body').html(`
<!-- VIEW 1: LANDING PAGE -->
<div id="view-home" class="min-h-screen w-full bg-[#030712] text-white">
  ${homeMain.parent().html()}
</div>

<!-- VIEW 2: API EXPLORER DOCS -->
<div id="view-docs" class="min-h-screen w-full hidden">
  <main class="${docsMain.attr('class') || 'min-h-screen bg-zinc-950 text-white font-sans relative pb-40 overflow-hidden'}">
    ${docsMainHtml}
  </main>
</div>
`);

// 4. Perbaiki & Percantik CSS
$('head').append(`
<style>
${css}

/* Extra Solid Theme & Modal Fixes */
.drawer-solid-bg {
  background-color: #0a0a0f !important;
  background-image: linear-gradient(to bottom, #11111a, #08080c) !important;
  opacity: 1 !important;
}

.input-solid-bg {
  background-color: #050508 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #f4f4f5 !important;
}

.input-solid-bg:focus {
  border-color: rgba(6, 182, 212, 0.6) !important;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.2) !important;
}

/* Syntax Highlighting */
.json-key { color: #22d3ee; }
.json-string { color: #86efac; }
.json-number { color: #f472b6; }
.json-boolean { color: #fbbf24; }
.json-null { color: #9ca3af; }

/* Custom scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.4); }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.6); }

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}
</style>
`);

// 5. Hubungkan Link Home dan Docs
const homeExploreBtn = $('#view-home a[href="/docs"]');
homeExploreBtn.attr('href', '#docs');
homeExploreBtn.attr('id', 'explore-api-btn');

// Update counter di home jika ada
const endpointCounter = $('#view-home').find('.text-2xl, .text-xl, .font-mono').filter((_, el) => $(el).text().trim() === '0');
if (endpointCounter.length) {
  endpointCounter.text('26');
}

// Update tombol Back to Home di Docs
const backHomeBtn = $('#view-docs header a').first();
backHomeBtn.attr('href', '#home');
backHomeBtn.attr('id', 'back-to-home-btn');

// 6. Tambahkan Search Bar di View Docs
const filterContainer = $('#view-docs .flex.flex-col.md\\:flex-row.md\\:items-end.justify-between').first();
if (filterContainer.length) {
  const searchBarHtml = `
    <div class="mt-4 w-full md:w-80 relative">
      <div class="flex items-center bg-black/70 border border-white/10 hover:border-zinc-700 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 rounded-xl px-3.5 py-2.5 transition-all shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500 mr-2.5 flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="endpoint-search-input" type="text" placeholder="Search 26 endpoints or paths..." autocomplete="off" class="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder:text-zinc-500 w-full font-sans"/>
      </div>
    </div>
  `;
  filterContainer.after(searchBarHtml);
}

// 7. Update Kategori Tab Buttons
const catMap = ['all', 'ai', 'wuwa', 'game', 'search', 'tools', 'canvas'];
const topButtons = $('#view-docs main button');
topButtons.each((idx, el) => {
  if (idx < catMap.length) {
    $(el).attr('data-cat', catMap[idx]);
    $(el).addClass('category-tab-btn');
  }
});

// 8. Update Seluruh 26 Endpoint Card
const cards = $('#view-docs main .group');
cards.each((idx, el) => {
  const ep = endpoints[idx];
  if (!ep) return;

  $(el).attr('id', `card-${ep.id}`);
  $(el).attr('data-id', ep.id);
  $(el).attr('data-category', ep.category);
  $(el).attr('data-name', ep.name.toLowerCase());
  $(el).attr('data-path', ep.path.toLowerCase());
  $(el).addClass('endpoint-card');

  // Copy Path button
  const copyBtn = $(el).find('button').filter((_, b) => $(b).text().trim() === '' && $(b).find('svg').length > 0).first();
  if (copyBtn.length) {
    copyBtn.attr('data-copy-path', `https://www.shorekeeper-api.web.id${ep.basePath}`);
    copyBtn.addClass('copy-path-btn');
  }

  // Action Button ("TEST ENDPOINT" atau "OPEN TUTORIAL")
  const actionBtn = $(el).find('button').filter((_, b) => {
    const t = $(b).text().trim();
    return t.includes('TEST ENDPOINT') || t.includes('OPEN TUTORIAL');
  });

  if (ep.id === 'wuwa-gacha') {
    actionBtn.attr('data-action', 'tutorial');
    actionBtn.addClass('tutorial-trigger-btn');
  } else {
    actionBtn.attr('data-action', 'test');
    actionBtn.attr('data-target', ep.id);
    actionBtn.addClass('test-endpoint-btn');
  }

  // Response console
  const consoleBox = $(el).find('.font-mono.text-\\[11px\\]');
  if (consoleBox.length) {
    consoleBox.attr('id', `console-${ep.id}`);
  }
});

// Tambahkan Empty State jika filter kosong
const gridContainer = $('#view-docs .grid.grid-cols-1.xl\\:grid-cols-2').first();
if (gridContainer.length) {
  gridContainer.after(`
    <div id="no-endpoints-found" class="hidden flex flex-col items-center justify-center p-16 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-xl mt-6">
      <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </div>
      <h3 class="text-lg font-bold text-white tracking-wide">No Endpoints Found</h3>
      <p class="text-xs text-zinc-400 mt-1 max-w-sm">No endpoints match your current category or search criteria.</p>
    </div>
  `);
}

// 9. Append Solid Bottom Drawer & Backdrop (TIDAK TRANSPARAN!)
$('body').append(`
<!-- BACKDROP OVERLAY DRAWER -->
<div id="drawer-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 hidden transition-opacity duration-300"></div>

<!-- SOLID BOTTOM DRAWER -->
<div id="test-drawer" class="fixed bottom-0 left-0 w-full z-50 animate-slide-up hidden" style="filter: drop-shadow(0 -20px 40px rgba(0,0,0,0.9));">
  <div class="drawer-solid-bg border-t border-cyan-500/30 shadow-[0_-20px_60px_rgba(6,182,212,0.15)] max-h-[85vh] overflow-y-auto" style="background-color: #0a0a0f !important; opacity: 1 !important;">
    <div class="max-w-7xl mx-auto p-4 md:p-6 lg:px-12 relative">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent"></div>
      
      <!-- Drawer Header -->
      <div class="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
        <div class="flex items-center space-x-4">
          <div class="relative flex items-center justify-center w-9 h-9 rounded-xl bg-black border border-white/15 shadow-inner">
            <span id="drawer-method" class="font-mono text-xs font-black text-cyan-400">GET</span>
          </div>
          <div>
            <div class="flex items-center space-x-3">
              <h3 id="drawer-title" class="font-bold text-white uppercase tracking-widest text-sm drop-shadow-sm">Endpoint Name</h3>
              <span id="drawer-category-badge" class="hidden md:inline-flex px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 text-[10px] tracking-widest font-mono font-bold">WUWA</span>
            </div>
            <p id="drawer-path" class="text-[11px] text-zinc-400 font-mono mt-0.5">/api/endpoint</p>
          </div>
        </div>
        
        <button id="drawer-close-btn" class="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex flex-col lg:flex-row gap-6 items-end">
        <div id="drawer-params-container" class="flex-1 w-full space-y-4">
          <!-- Parameter fields dynamically rendered -->
        </div>

        <div class="w-full lg:w-64 flex-shrink-0">
          <button id="drawer-send-btn" class="w-full h-14 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.35)] rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group">
            <span id="drawer-send-content" class="flex items-center justify-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:scale-125 transition-transform"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              <span>SEND REQUEST</span>
            </span>
          </button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- GACHA TUTORIAL MODAL -->
<div id="gacha-modal" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden flex items-center justify-center p-4">
  <div class="bg-[#0b0c10] border border-cyan-500/30 rounded-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" style="background-color: #0b0c10 !important;">
    <div class="flex items-center justify-between pb-4 border-b border-zinc-800">
      <div>
        <h3 class="text-xl font-bold text-white tracking-tight">Wuthering Waves Gacha Import Tutorial</h3>
        <p class="text-xs text-zinc-400 mt-1">Ikuti langkah di bawah untuk mengambil link riwayat gacha / convene kamu.</p>
      </div>
      <button id="gacha-modal-close" class="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>

    <div class="mt-5 space-y-4 text-xs text-zinc-300 font-sans">
      <div class="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-700/40">
        <span class="font-bold text-cyan-400 block mb-1">Langkah 1:</span>
        Buka game Wuthering Waves di PC, buka menu <strong>Convene</strong> (Gacha), lalu buka tab <strong>History</strong>.
      </div>
      <div class="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <span class="font-bold text-white block mb-1">Langkah 2 (PowerShell):</span>
        Buka PowerShell di Windows dan jalankan perintah berikut:
        <div class="relative mt-2">
          <pre class="bg-black/90 p-3.5 rounded-lg font-mono text-[11px] text-zinc-300 overflow-x-auto select-all border border-white/10">iwr -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"} https://raw.githubusercontent.com/wuwatracker/wuwatracker/c46dbadc006ed0d2c3f3a20b06b448a45475d32b/import.ps1 | iex</pre>
          <button id="copy-ps-btn" class="absolute right-2 top-2 px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/40 text-cyan-300 rounded text-[10px] font-bold transition-all">Copy Script</button>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-700/40">
        <span class="font-bold text-cyan-400 block mb-1">Langkah 3:</span>
        Link Convene akan otomatis tersalin ke clipboard kamu. Masukkan URL tersebut ke parameter endpoint <code>/api/wuwa/gacha?url=...</code> untuk membaca pity & history gacha.
      </div>
    </div>
  </div>
</div>
`);

// 10. Embed Single Page App & Interactive Logic
$('body').append(`
<script>
// Data Endpoints
const ENDPOINTS = ${JSON.stringify(endpoints)};

// State
let activeView = 'home';
let activeCategory = 'all';
let searchQuery = '';
let currentEndpoint = null;
let currentParams = {};
let customDynamicParams = [{ key: '', value: '' }];

// Elements
const viewHome = document.getElementById('view-home');
const viewDocs = document.getElementById('view-docs');
const exploreApiBtn = document.getElementById('explore-api-btn');
const backToHomeBtn = document.getElementById('back-to-home-btn');
const cards = document.querySelectorAll('.endpoint-card');
const catButtons = document.querySelectorAll('.category-tab-btn');
const searchInput = document.getElementById('endpoint-search-input');
const noEndpointsBox = document.getElementById('no-endpoints-found');

// Drawer Elements
const testDrawer = document.getElementById('test-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerCloseBtn = document.getElementById('drawer-close-btn');
const drawerSendBtn = document.getElementById('drawer-send-btn');
const drawerSendContent = document.getElementById('drawer-send-content');
const drawerTitle = document.getElementById('drawer-title');
const drawerMethod = document.getElementById('drawer-method');
const drawerCategoryBadge = document.getElementById('drawer-category-badge');
const drawerPath = document.getElementById('drawer-path');
const drawerParamsContainer = document.getElementById('drawer-params-container');

// Gacha Modal Elements
const gachaModal = document.getElementById('gacha-modal');
const gachaModalClose = document.getElementById('gacha-modal-close');
const copyPsBtn = document.getElementById('copy-ps-btn');

// --- 1. SPA ROUTING (Home <-> Docs) ---
function switchView(targetView) {
  if (targetView === 'docs') {
    viewHome.classList.add('hidden');
    viewDocs.classList.remove('hidden');
    activeView = 'docs';
    window.location.hash = 'docs';
  } else {
    viewDocs.classList.add('hidden');
    viewHome.classList.remove('hidden');
    activeView = 'home';
    window.location.hash = 'home';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (exploreApiBtn) {
  exploreApiBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('docs');
  });
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
  });
}

// Initial route based on hash
window.addEventListener('load', () => {
  if (window.location.hash === '#docs') {
    switchView('docs');
  } else {
    switchView('home');
  }
});

// --- 2. CATEGORY & SEARCH FILTERING ---
function updateFilter() {
  const query = searchQuery.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category');
    const cardName = card.getAttribute('data-name');
    const cardPath = card.getAttribute('data-path');

    const matchesCat = (activeCategory === 'all') || (cardCat === activeCategory);
    const matchesSearch = !query || cardName.includes(query) || cardPath.includes(query);

    if (matchesCat && matchesSearch) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  if (noEndpointsBox) {
    if (visibleCount === 0) {
      noEndpointsBox.classList.remove('hidden');
    } else {
      noEndpointsBox.classList.add('hidden');
    }
  }
}

catButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.getAttribute('data-cat');
    activeCategory = cat;

    catButtons.forEach(b => {
      if (b.getAttribute('data-cat') === cat) {
        b.className = 'category-tab-btn px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-105';
      } else {
        b.className = 'category-tab-btn px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 bg-transparent text-zinc-400 hover:text-white hover:bg-white/5';
      }
    });

    updateFilter();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    updateFilter();
  });
}

// --- 3. COPY PATH BUTTON ---
document.querySelectorAll('.copy-path-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = btn.getAttribute('data-copy-path');
    navigator.clipboard.writeText(url).then(() => {
      const origHtml = btn.innerHTML;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
    });
  });
});

// --- 4. BOTTOM DRAWER TEST ENDPOINT ---
function openTestDrawer(endpointId) {
  const ep = ENDPOINTS.find(x => x.id === endpointId);
  if (!ep) return;

  currentEndpoint = ep;
  currentParams = {};
  ep.params.forEach(p => {
    currentParams[p.name] = p.defaultValue || '';
  });

  drawerTitle.textContent = ep.name;
  drawerMethod.textContent = ep.method;
  drawerCategoryBadge.textContent = ep.category.toUpperCase();
  drawerPath.textContent = ep.basePath;

  renderDrawerParams();

  drawerBackdrop.classList.remove('hidden');
  testDrawer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  testDrawer.classList.add('hidden');
  drawerBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
  currentEndpoint = null;
}

if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

function renderDrawerParams() {
  if (!currentEndpoint) return;
  drawerParamsContainer.innerHTML = '';

  const params = currentEndpoint.params || [];
  if (params.length === 0 && !currentEndpoint.isDynamic) {
    drawerParamsContainer.innerHTML = \`
      <div class="flex items-center justify-center p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
        <div class="flex items-center space-x-2 text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70 text-cyan-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span class="text-xs uppercase tracking-widest font-bold">No parameters required</span>
        </div>
      </div>
    \`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

  params.forEach(p => {
    const field = document.createElement('div');
    field.className = 'space-y-2';

    if (p.type === 'file') {
      field.innerHTML = \`
        <label class="text-[10px] uppercase text-zinc-300 font-bold tracking-widest ml-1 flex items-center">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-2 shadow-[0_0_5px_rgba(6,182,212,0.8)]"></span>
          \${p.name} (File)
        </label>
        <div class="relative">
          <input type="file" id="drawer-file-\${p.name}" class="hidden" />
          <button type="button" onclick="document.getElementById('drawer-file-\${p.name}').click()" class="w-full input-solid-bg h-11 px-3.5 rounded-xl font-mono text-xs text-zinc-300 border hover:border-cyan-500/50 flex items-center justify-between transition-all">
            <span id="file-label-\${p.name}" class="truncate text-zinc-400">Select File...</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
      \`;

      field.querySelector(\`#drawer-file-\${p.name}\`).addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          field.querySelector(\`#file-label-\${p.name}\`).textContent = file.name;
          field.querySelector(\`#file-label-\${p.name}\`).classList.remove('text-zinc-400');
          field.querySelector(\`#file-label-\${p.name}\`).classList.add('text-cyan-300');
        }
      });
    } else {
      field.innerHTML = \`
        <label class="text-[10px] uppercase text-zinc-300 font-bold tracking-widest ml-1 flex items-center">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-2 shadow-[0_0_5px_rgba(6,182,212,0.8)]"></span>
          \${p.name}
        </label>
        <input 
          type="text" 
          data-param="\${p.name}" 
          value="\${currentParams[p.name] || ''}" 
          placeholder="\${p.placeholder || p.name}"
          class="w-full input-solid-bg h-11 px-3.5 rounded-xl font-mono text-xs shadow-inner outline-none transition-all"
        />
      \`;

      field.querySelector('input').addEventListener('input', (e) => {
        currentParams[p.name] = e.target.value;
      });
    }

    grid.appendChild(field);
  });

  drawerParamsContainer.appendChild(grid);

  // Dynamic parameters
  if (currentEndpoint.isDynamic) {
    const dynBox = document.createElement('div');
    dynBox.className = 'space-y-3 bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl mt-3';
    dynBox.innerHTML = \`
      <div class="flex items-center justify-between">
        <div class="text-[10px] uppercase text-zinc-300 font-bold tracking-widest flex items-center">
          <span class="w-1.5 h-1.5 rounded-full bg-purple-400 mr-2 shadow-[0_0_5px_rgba(168,85,247,0.8)]"></span>
          Custom Parameters
        </div>
        <button id="add-dyn-btn" type="button" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold tracking-widest uppercase transition-all">
          + ADD KEY
        </button>
      </div>
      <div id="dyn-list" class="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3"></div>
    \`;

    drawerParamsContainer.appendChild(dynBox);

    const renderDyn = () => {
      const dynList = dynBox.querySelector('#dyn-list');
      dynList.innerHTML = '';
      customDynamicParams.forEach((dp, dIdx) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 input-solid-bg p-1.5 rounded-xl border border-zinc-700/80';
        row.innerHTML = \`
          <input type="text" placeholder="Key" value="\${dp.key}" class="bg-transparent border-none focus:outline-none h-8 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 flex-1 px-3"/>
          <div class="w-[1px] h-4 bg-zinc-700"></div>
          <input type="text" placeholder="Value" value="\${dp.value}" class="bg-transparent border-none focus:outline-none h-8 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 flex-1 px-3"/>
          <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        \`;

        const inputs = row.querySelectorAll('input');
        inputs[0].addEventListener('input', (e) => { dp.key = e.target.value; });
        inputs[1].addEventListener('input', (e) => { dp.value = e.target.value; });
        row.querySelector('button').addEventListener('click', () => {
          customDynamicParams.splice(dIdx, 1);
          renderDyn();
        });

        dynList.appendChild(row);
      });
    };

    dynBox.querySelector('#add-dyn-btn').addEventListener('click', () => {
      if (customDynamicParams.length < 10) {
        customDynamicParams.push({ key: '', value: '' });
        renderDyn();
      }
    });

    renderDyn();
  }
}

// --- 5. SEND REQUEST EXECUTION ---
if (drawerSendBtn) {
  drawerSendBtn.addEventListener('click', async () => {
    if (!currentEndpoint) return;
    const ep = currentEndpoint;
    const consoleBox = document.getElementById(\`console-\${ep.id}\`);
    if (!consoleBox) return;

    // URL & Params Builder
    const baseUrl = 'https://www.shorekeeper-api.web.id' + ep.basePath;
    const qParams = new URLSearchParams();

    (ep.params || []).forEach(p => {
      if (p.type !== 'file') {
        const val = currentParams[p.name];
        if (val) qParams.append(p.name, val);
      }
    });

    if (ep.isDynamic) {
      customDynamicParams.forEach(dp => {
        if (dp.key.trim() && dp.value.trim()) {
          qParams.append(dp.key.trim(), dp.value.trim());
        }
      });
    }

    const fullUrl = baseUrl + (qParams.toString() ? '?' + qParams.toString() : '');

    // Tutup drawer agar user bisa langsung melihat hasil di card
    closeDrawer();

    // Scroll card target ke tengah layar
    const targetCard = document.getElementById(\`card-\${ep.id}\`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Set Loading di Console Card
    consoleBox.innerHTML = \`
      <div class="h-full flex flex-col items-center justify-center space-y-3 py-10 text-cyan-400">
        <div class="w-7 h-7 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
        <p class="tracking-widest uppercase text-[10px] font-bold">Awaiting Response...</p>
      </div>
    \`;

    const startTime = Date.now();
    try {
      const response = await fetch(fullUrl, {
        headers: { 'Accept': 'application/json' }
      });
      const latency = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('image')) {
        const blob = await response.blob();
        const imgUrl = URL.createObjectURL(blob);
        renderResponseConsole(consoleBox, ep, fullUrl, response.status, latency, null, imgUrl);
      } else {
        let json;
        try {
          json = await response.json();
        } catch (e) {
          json = { error: 'Failed to parse JSON response', raw: await response.text() };
        }
        renderResponseConsole(consoleBox, ep, fullUrl, response.status, latency, json, null);
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      const fallbackError = {
        status: false,
        message: 'Network or CORS request error. The target server may require direct origin access.',
        details: err.message
      };
      renderResponseConsole(consoleBox, ep, fullUrl, 500, latency, fallbackError, null);
    }
  });
}

// --- 6. RENDER RESPONSE CONSOLE (Request URL, cURL Command, Server Response) ---
function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

function renderResponseConsole(box, ep, reqUrl, status, latency, json, imgUrl) {
  const isOk = status >= 200 && status < 300;
  const curlCmd = \`curl -X \${ep.method || 'GET'} "\${reqUrl}"\`;

  let responseBodyHtml = '';
  if (imgUrl) {
    responseBodyHtml = \`
      <div class="flex flex-col items-center justify-center p-6 bg-zinc-950/80 rounded-xl border border-white/5 mt-2">
        <p class="mb-4 text-cyan-400 uppercase tracking-widest font-bold text-[10px] flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          Image Fetched Successfully
        </p>
        <img src="\${imgUrl}" alt="Response Result" class="max-w-full max-h-56 rounded-lg border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] object-contain" />
      </div>
    \`;
  } else {
    responseBodyHtml = \`
      <div class="bg-[#050505] p-3.5 rounded-xl border border-zinc-800/80 font-mono text-zinc-300 text-[10px] overflow-x-auto shadow-inner">
        <pre class="whitespace-pre-wrap leading-relaxed"><code class="language-json">\${syntaxHighlight(json)}</code></pre>
      </div>
    \`;
  }

  box.innerHTML = \`
    <div class="animate-fade-in flex flex-col gap-4 w-full">
      <!-- 1. Request URL -->
      <div class="flex flex-col">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Request URL</span>
          <button id="copy-url-\${ep.id}" class="h-6 w-6 p-0 text-zinc-500 hover:text-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
        <div class="bg-[#050505] p-3.5 rounded-xl border border-zinc-800/80 font-mono text-cyan-400 text-[10px] overflow-x-auto shadow-inner whitespace-nowrap">
          \${reqUrl}
        </div>
      </div>

      <!-- 2. cURL Command -->
      <div class="flex flex-col">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">cURL Command</span>
          <button id="copy-curl-\${ep.id}" class="h-6 w-6 p-0 text-zinc-500 hover:text-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
        <div class="bg-[#050505] p-3.5 rounded-xl border border-zinc-800/80 font-mono text-cyan-400 text-[10px] overflow-x-auto shadow-inner whitespace-nowrap">
          \${curlCmd}
        </div>
      </div>

      <!-- 3. Server Response -->
      <div class="flex flex-col">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Server Response</span>
          <div class="flex items-center gap-2">
            <div class="\${isOk ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'} flex items-center px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(34,197,94,0.1)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              \${status} \${isOk ? 'OK' : 'ERROR'} • \${latency}ms
            </div>
            <button id="copy-res-\${ep.id}" class="h-6 w-6 p-0 text-zinc-500 hover:text-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
          </div>
        </div>
        \${responseBodyHtml}
      </div>
    </div>
  \`;

  // Bind copy handlers
  const copyUrlBtn = box.querySelector(\`#copy-url-\${ep.id}\`);
  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(reqUrl);
      copyUrlBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyUrlBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      }, 2000);
    });
  }

  const copyCurlBtn = box.querySelector(\`#copy-curl-\${ep.id}\`);
  if (copyCurlBtn) {
    copyCurlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(curlCmd);
      copyCurlBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyCurlBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      }, 2000);
    });
  }

  const copyResBtn = box.querySelector(\`#copy-res-\${ep.id}\`);
  if (copyResBtn) {
    copyResBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(typeof json === 'string' ? json : JSON.stringify(json, null, 2));
      copyResBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
      setTimeout(() => {
        copyResBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      }, 2000);
    });
  }
}

// --- 7. BUTTON CLICK LISTENERS ---
document.querySelectorAll('.test-endpoint-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetId = btn.getAttribute('data-target');
    openTestDrawer(targetId);
  });
});

document.querySelectorAll('.tutorial-trigger-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    gachaModal.classList.remove('hidden');
  });
});

if (gachaModalClose) {
  gachaModalClose.addEventListener('click', () => {
    gachaModal.classList.add('hidden');
  });
}

if (copyPsBtn) {
  copyPsBtn.addEventListener('click', () => {
    const code = 'iwr -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"} https://raw.githubusercontent.com/wuwatracker/wuwatracker/c46dbadc006ed0d2c3f3a20b06b448a45475d32b/import.ps1 | iex';
    navigator.clipboard.writeText(code).then(() => {
      copyPsBtn.textContent = 'COPIED!';
      setTimeout(() => { copyPsBtn.textContent = 'Copy Script'; }, 2000);
    });
  });
}
</script>
`);

// 11. Simpan shorekeeper_docs.html
const finalHtml = $.html();
fs.writeFileSync('/home/container/data/omp-agent/work/b96786850bcd/shorekeeper_docs.html', finalHtml, 'utf8');
console.log('Successfully written complete SPA shorekeeper_docs.html! Total bytes:', finalHtml.length);
