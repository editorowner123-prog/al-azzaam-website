/* ============================================================
   SHARED.JS — dipakai oleh semua halaman. Edit di SINI cukup 1x,
   tidak perlu per halaman. Halaman masing-masing tetap punya
   script kecil sendiri untuk konten khusus (daftar berita, dsb).
   ============================================================ */

// ---------- Koneksi Supabase (project website, terpisah dari app Al-Hafizh) ----------
const SB_URL = "https://ttpkztaxfpjhkwtnbpec.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0cGt6dGF4ZnBqaGt3dG5icGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDExOTUsImV4cCI6MjEwMjk3NzE5NX0.yfeSSewI_CDw64WxYU4qUVeEbVLsHXVqpDpeCGDT5PI";
const sb = supabase.createClient(SB_URL, SB_ANON);

// ---------- Util: normalisasi link (auto tambah https:// kalau lupa) ----------
function normalizeLink(link){
  if(!link) return '';
  link = link.trim();
  if(/^https?:\/\//i.test(link)) return link;
  if(link.startsWith('/') || link.startsWith('#')) return link;
  if(/\.html(\?|#|$)/i.test(link)) return link;
  return 'https://' + link;
}

// ---------- Logo ----------
async function applyLogo(){
  const {data} = await sb.from('pengaturan_situs').select('key,value').in('key',['logo_url','logo_type']);
  const map = {}; (data||[]).forEach(r=>map[r.key]=r.value);
  if(!map.logo_url) return;
  const type = map.logo_type || 'icon';

  document.querySelectorAll('.nav-brand').forEach(el=>{
    if(type === 'full'){
      el.innerHTML = `<img src="${map.logo_url}" style="height:32px;max-width:170px;object-fit:contain;display:block;">`;
    } else {
      el.innerHTML = `<span class="ring" style="background-color:#fff;background-image:url('${map.logo_url}');background-size:contain;background-repeat:no-repeat;background-position:center;background-origin:content-box;background-clip:content-box;padding:5px;"></span> PPTQ Al Azzaam`;
    }
  });

  const emblem = document.querySelector('.emblem-ring');
  if(emblem){
    if(type === 'full'){
      emblem.style.cssText += 'border-radius:20px;background:#fff;min-width:180px;min-height:100px;width:auto;height:auto;padding:22px 28px;box-shadow:0 20px 50px -16px rgba(0,0,0,.6),0 0 0 4px var(--gold-500);display:flex;align-items:center;justify-content:center;';
      emblem.innerHTML = `<img src="${map.logo_url}" style="max-width:230px;max-height:100px;object-fit:contain;">`;
    } else {
      emblem.style.cssText += `background-color:#fff;background-image:url('${map.logo_url}');background-size:contain;background-repeat:no-repeat;background-position:center;background-origin:content-box;background-clip:content-box;padding:28px;`;
      emblem.textContent = '';
    }
  }
}

// ---------- Foto Spanduk (Hero, hanya ada di Beranda) ----------
async function applyHeroPhoto(){
  const hero = document.getElementById('heroSection');
  if(!hero) return;
  const {data} = await sb.from('pengaturan_situs').select('value').eq('key','hero_photo_url').maybeSingle();
  if(data && data.value){
    hero.style.backgroundImage = `linear-gradient(160deg, rgba(43,8,16,.68), rgba(61,12,20,.6)), url('${data.value}')`;
  }
}

// ---------- Footer (kontak + sosmed) ----------
async function loadFooterData(){
  const {data} = await sb.from('pengaturan_situs').select('key,value');
  const map = {}; (data||[]).forEach(r=>map[r.key]=r.value);

  const list = document.getElementById('kontakList');
  if(list){
    let items = '';
    items += `<li>${map.alamat || 'Alamat belum diisi'}</li>`;
    if(map.google_maps_url) items += `<li><a href="${map.google_maps_url}" target="_blank">📍 Lihat di Peta</a></li>`;
    if(map.no_wa) items += `<li><a href="https://wa.me/${map.no_wa.replace(/[^0-9]/g,'').replace(/^0/,'62')}" target="_blank">WA: ${map.no_wa}</a></li>`;
    if(map.email) items += `<li><a href="mailto:${map.email}">${map.email}</a></li>`;
    list.innerHTML = items;
  }

  const socialRow = document.getElementById('socialRow');
  if(socialRow){
    const socials = [
      {key:'instagram', label:'IG'},
      {key:'facebook', label:'FB'},
      {key:'youtube', label:'YT'},
      {key:'tiktok', label:'TT'},
    ];
    socialRow.innerHTML = socials.filter(s=>map[s.key])
      .map(s=>`<a href="${map[s.key]}" target="_blank" class="social-badge" title="${s.key}">${s.label}</a>`).join('');
  }

  document.getElementById('yearNow').textContent = new Date().getFullYear();
}

// ---------- Running Text (kecepatan konstan px/detik, tidak terpengaruh panjang teks) ----------
async function loadTicker(){
  const wrap = document.getElementById('tickerWrap');
  if(!wrap) return;
  const track = document.getElementById('tickerTrack');
  const [{data: items}, {data: settings}] = await Promise.all([
    sb.from('running_text').select('teks').eq('status','published').order('urutan'),
    sb.from('pengaturan_situs').select('key,value').in('key',['ticker_bg','ticker_text_color','ticker_height','ticker_speed']),
  ]);
  const map = {}; (settings||[]).forEach(r=>map[r.key]=r.value);
  wrap.style.background = map.ticker_bg || 'var(--maroon-950)';
  wrap.style.height = (map.ticker_height || '38') + 'px';
  track.style.color = map.ticker_text_color || 'var(--gold-400)';

  if(!items || items.length===0){
    wrap.style.display = 'none';
    return;
  }
  const text = items.map(i=>i.teks).join('   •   ') + '   •   ';
  track.textContent = text + text; // duplikat biar looping mulus

  // ticker_speed = kecepatan dalam PIKSEL PER DETIK (bukan detik per putaran),
  // jadi kecepatan terasa sama persis walau teksnya pendek atau panjang.
  const speedPxPerSec = Number(map.ticker_speed) || 80;
  requestAnimationFrame(()=>{
    const distance = track.scrollWidth;
    const duration = Math.max(distance / speedPxPerSec, 4);
    track.style.animationDuration = duration + 's';
  });
}

// ---------- Flyer Pop-up (bisa beberapa, muncul bergantian, ukuran per-flyer) ----------
const FLYER_SIZE_PX = {kecil:320, sedang:480, besar:680};
let flyerQueue = [];
let flyerIndex = 0;

async function loadFlyer(){
  const overlay = document.getElementById('flyerOverlay');
  if(!overlay) return;
  if(sessionStorage.getItem('flyer_dismissed')) return;
  const {data} = await sb.from('flyer_popup').select('*').eq('status','published').order('urutan');
  if(!data || data.length===0) return;
  flyerQueue = data;
  flyerIndex = 0;
  showFlyerAt(0, 600);
}
function showFlyerAt(i, delay){
  if(i >= flyerQueue.length){
    sessionStorage.setItem('flyer_dismissed','1');
    return;
  }
  const f = flyerQueue[i];
  const box = document.querySelector('#flyerOverlay .flyer-box');
  box.style.maxWidth = (FLYER_SIZE_PX[f.ukuran] || 480) + 'px';
  document.getElementById('flyerImage').src = f.gambar_url;
  window._flyerLink = f.link_url || '';
  setTimeout(()=>{ document.getElementById('flyerOverlay').classList.add('open'); }, delay);
}
function closeFlyer(){
  document.getElementById('flyerOverlay').classList.remove('open');
  flyerIndex++;
  if(flyerIndex < flyerQueue.length){
    setTimeout(()=>showFlyerAt(flyerIndex, 0), 500);
  } else {
    sessionStorage.setItem('flyer_dismissed','1');
  }
}
function clickFlyer(){
  if(window._flyerLink) window.open(normalizeLink(window._flyerLink), '_blank');
  closeFlyer();
}

// ---------- Dropdown navbar "Program" (isinya dinamis dari jenjang yang admin buat sendiri) ----------
async function populateProgramDropdown(){
  const menus = document.querySelectorAll('.program-dropdown');
  if(menus.length === 0) return;
  const {data} = await sb.from('program').select('jenjang').not('jenjang','is',null);
  const jenjangSet = [...new Set((data||[]).map(r=>r.jenjang).filter(Boolean))];
  menus.forEach(menu=>{
    menu.innerHTML = jenjangSet.length
      ? jenjangSet.map(j=>`<a href="program.html?jenjang=${encodeURIComponent(j)}">${j}</a>`).join('')
      : `<a href="program.html">Lihat Semua Program</a>`;
  });
}

// ---------- Navbar mobile toggle ----------
function setupNavToggle(){
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if(toggle && links){
    toggle.addEventListener('click', ()=> links.classList.toggle('open'));
  }
}

// ---------- Jalankan semua yang umum, di semua halaman ----------
function initSharedPage(){
  setupNavToggle();
  applyLogo();
  applyHeroPhoto();
  loadFooterData();
  loadTicker();
  populateProgramDropdown();
  loadFlyer();
}
initSharedPage();
