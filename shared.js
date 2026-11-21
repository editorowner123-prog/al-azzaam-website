/* ============================================================
   SHARED.JS — dipakai oleh semua halaman. Edit di SINI cukup 1x,
   tidak perlu per halaman. Halaman masing-masing tetap punya
   script kecil sendiri untuk konten khusus (daftar berita, dsb).
   ============================================================ */

// ---------- Util umum ----------
function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtTanggal(d, opt){ try{ return new Date(d).toLocaleDateString('id-ID', opt || {day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } }
function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return [...(r||document).querySelectorAll(s)]; }

// ---------- Koneksi Supabase (project website, terpisah dari app Al-Hafizh) ----------
const SB_URL = "https://ttpkztaxfpjhkwtnbpec.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0cGt6dGF4ZnBqaGt3dG5icGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDExOTUsImV4cCI6MjEwMjk3NzE5NX0.yfeSSewI_CDw64WxYU4qUVeEbVLsHXVqpDpeCGDT5PI";
const sb = supabase.createClient(SB_URL, SB_ANON);

// ---------- Util: normalisasi link (auto tambah https:// kalau lupa) ----------
function normalizeLink(link){
  if(!link) return '';
  link = String(link).trim();
  if(/^https?:\/\//i.test(link)) return link;
  if(link.startsWith('/') || link.startsWith('#')) return link;
  if(/\.html(\?|#|$)/i.test(link)) return link;
  return 'https://' + link;
}

// ---------- Util: YouTube — ambil ID video dari berbagai bentuk link ----------
function getYoutubeId(url){
  if(!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for(const p of patterns){
    const m = url.match(p);
    if(m) return m[1];
  }
  return null;
}
function getYoutubeThumbnail(url){
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

// ---------- Util: Instagram embed (postingan & Reels) ----------
function ensureInstagramScript(){
  if(document.getElementById('igEmbedScript')) return;
  const s = document.createElement('script');
  s.id = 'igEmbedScript';
  s.async = true;
  s.src = 'https://www.instagram.com/embed.js';
  document.body.appendChild(s);
}
function processInstagramEmbeds(retries){
  retries = retries || 0;
  if(window.instgrm && window.instgrm.Embeds){
    window.instgrm.Embeds.process();
  } else if(retries < 15){
    setTimeout(()=>processInstagramEmbeds(retries+1), 300);
  }
}
async function loadInstagramEmbeds(containerId, limit){
  const container = document.getElementById(containerId);
  if(!container) return;
  const {data, error} = await sb.from('instagram_embed').select('*').eq('status','published').order('urutan').order('created_at',{ascending:false}).limit(limit || 100);
  if(error || !data || data.length===0){
    container.innerHTML = '<div class="empty-state">Belum ada postingan Instagram.</div>';
    return;
  }
  // Hapus data-instgrm-captioned supaya kartu tampil ringkas (tanpa teks caption panjang)
  const compact = code => code.replace(/\s*data-instgrm-captioned(="[^"]*")?/gi, '');
  container.innerHTML = data.map(p=>`<div class="ig-embed-item">${compact(p.embed_code)}</div>`).join('');
  ensureInstagramScript();
  processInstagramEmbeds();
}

// ---------- Logo ----------
async function applyLogo(){
  const {data} = await sb.from('pengaturan_situs').select('key,value').in('key',['logo_url','logo_type','favicon_url']);
  const map = {}; (data||[]).forEach(r=>map[r.key]=r.value);

  // Favicon terpisah dari logo website — pakai favicon_url kalau ada,
  // kalau tidak fallback ke logo_url, kalau tidak ada dua-duanya biarkan
  // favicon default (monogram "A") yang sudah terpasang di <head>.
  const faviconLink = document.getElementById('faviconLink');
  if(faviconLink && (map.favicon_url || map.logo_url)){
    faviconLink.href = map.favicon_url || map.logo_url;
  }

  if(!map.logo_url) return;
  const type = map.logo_type || 'icon';

  document.querySelectorAll('.nav-brand').forEach(el=>{
    if(type === 'full'){
      el.innerHTML = `<img class="nav-logo" src="${map.logo_url}" alt="PPTQ Al Azzaam">`;
    } else {
      el.innerHTML = `<span class="ring" style="background-color:#fff;background-image:url('${map.logo_url}');background-size:contain;background-repeat:no-repeat;background-position:center;background-origin:content-box;background-clip:content-box;padding:5px;"></span><span>PPTQ Al Azzaam</span>`;
    }
  });

  const emblem = document.querySelector('.emblem-ring');
  if(emblem){
    if(type === 'full'){
      emblem.style.cssText += 'border-radius:20px;background:#fff;min-width:180px;min-height:100px;width:auto;height:auto;padding:22px 28px;box-shadow:0 20px 50px -16px rgba(0,0,0,.6),0 0 0 4px var(--a);display:flex;align-items:center;justify-content:center;';
      emblem.innerHTML = `<img src="${map.logo_url}" style="max-width:230px;max-height:100px;object-fit:contain;">`;
    } else {
      emblem.style.cssText += `background-color:#fff;background-image:url('${map.logo_url}');background-size:contain;background-repeat:no-repeat;background-position:center;background-origin:content-box;background-clip:content-box;padding:28px;`;
      emblem.textContent = '';
    }
  }
}

// ---------- Foto Spanduk (Hero, hanya ada di Beranda) ----------
// Foto dipasang lewat variabel --hero-img; CSS halaman yang menentukan cara menampilkannya.
async function applyHeroPhoto(){
  const hero = document.getElementById('heroSection');
  if(!hero) return;
  const {data} = await sb.from('pengaturan_situs').select('value').eq('key','hero_photo_url').maybeSingle();
  if(data && data.value){
    hero.style.setProperty('--hero-img', `url("${String(data.value).replace(/"/g,'%22')}")`);
    hero.classList.add('has-photo');
  }
}

// ---------- Footer (kontak + sosmed) ----------
function _cget(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
function _cset(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
async function loadFooterData(){
  // tampilkan data tersimpan lebih dulu (instan), lalu segarkan dari database
  const cached = _cget('pptq_situs');
  if(cached) renderFooter(cached);
  const {data} = await sb.from('pengaturan_situs').select('key,value');
  const map = {}; (data||[]).forEach(r=>map[r.key]=r.value);
  if(data && data.length){ _cset('pptq_situs', map); }
  renderFooter(map);
}
function renderFooter(map){

  const list = document.getElementById('kontakList');
  if(list){
    const row = (icon, inner) => `<li style="display:flex;gap:10px;align-items:flex-start;"><span style="color:var(--a);margin-top:2px;display:inline-flex;">${ic(icon)}</span><span>${inner}</span></li>`;
    let items = '';
    items += row('pin', map.alamat || 'Alamat belum diisi');
    if(map.google_maps_url) items += row('globe', `<a href="${normalizeLink(map.google_maps_url)}" target="_blank" rel="noopener">Lihat di peta</a>`);
    if(map.no_wa) items += row('phone', `<a href="https://wa.me/${map.no_wa.replace(/[^0-9]/g,'').replace(/^0/,'62')}" target="_blank" rel="noopener">WA: ${map.no_wa}</a>`);
    if(map.email) items += row('mail', `<a href="mailto:${map.email}">${map.email}</a>`);
    list.innerHTML = items;
  }

  const socialRow = document.getElementById('socialRow');
  if(socialRow){
    const socials = [
      {key:'instagram', label:'ig', nama:'Instagram'},
      {key:'facebook', label:'fb', nama:'Facebook'},
      {key:'youtube', label:'yt', nama:'YouTube'},
      {key:'tiktok', label:'tt', nama:'TikTok'},
    ];
    socialRow.innerHTML = socials.filter(s=>map[s.key])
      .map(s=>`<a href="${normalizeLink(map[s.key])}" target="_blank" rel="noopener" class="social-badge" title="${s.nama}" aria-label="${s.nama}">${ic(s.label)}</a>`).join('');
  }

  document.getElementById('yearNow').textContent = new Date().getFullYear();
}

// ---------- Running Text (kecepatan konstan px/detik, tidak terpengaruh panjang teks) ----------
const _TKS = [{key:'instagram',ic:'ig',n:'Instagram'},{key:'facebook',ic:'fb',n:'Facebook'},{key:'youtube',ic:'yt',n:'YouTube'},{key:'tiktok',ic:'tt',n:'TikTok'}];
function renderTickerSoc(map){
  const wrap = document.getElementById('tickerWrap'); if(!wrap || !map) return;
  const list = _TKS.filter(s=>map[s.key]);
  let box = wrap.querySelector('.tk-soc');
  if(!list.length){ if(box) box.remove(); return; }
  if(!box){ box = document.createElement('div'); box.className = 'tk-soc'; wrap.insertBefore(box, wrap.firstChild); }
  box.innerHTML = list.map(s=>`<a href="${normalizeLink(map[s.key])}" target="_blank" rel="noopener" title="${s.n}" aria-label="${s.n}">${ic(s.ic)}</a>`).join('');
}
async function loadTicker(){
  const wrap = document.getElementById('tickerWrap');
  if(!wrap) return;
  const track = document.getElementById('tickerTrack');
  const tc = _cget('pptq_ticker');
  renderTickerSoc(_cget('pptq_situs'));
  if(tc && tc.items && tc.items.length){ track.textContent = tc.text; track.style.animationDuration = Math.max(tc.dur||20,4)+'s'; }
  const [{data: items}, {data: settings}] = await Promise.all([
    sb.from('running_text').select('teks').eq('status','published').order('urutan'),
    sb.from('pengaturan_situs').select('key,value').in('key',['ticker_bg','ticker_text_color','ticker_height','ticker_speed','instagram','facebook','youtube','tiktok']),
  ]);
  const map = {}; (settings||[]).forEach(r=>map[r.key]=r.value);
  wrap.style.background = map.ticker_bg || 'var(--a)';
  wrap.style.height = (map.ticker_height || '42') + 'px';
  wrap.style.setProperty('--tkh', (map.ticker_height || '42') + 'px');
  renderTickerSoc(map);
  track.style.color = map.ticker_text_color || 'var(--pd)';

  if(!items || items.length===0){
    _cset('pptq_ticker',null);
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
    _cset('pptq_ticker',{items:[1],text:track.textContent,dur:duration});
  });
}

// ---------- Flyer Pop-up (bisa beberapa, muncul bergantian, ukuran per-flyer) ----------
const FLYER_SIZE_PX = {kecil:320, sedang:480, besar:680};
let flyerQueue = [];
let flyerIndex = 0;

async function loadFlyer(){
  const overlay = document.getElementById('flyerOverlay');
  if(!overlay) return;
  if(/[?&]editor=1/.test(location.search)) return;
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

// ---------- Mode Istirahat: cek paling awal sebelum apa pun lainnya ----------
// Hanya admin (yang login lewat admin.html di domain yang sama) yang bisa menyalakan/mematikan,
// dan hanya admin yang tetap melihat website normal saat mode ini aktif.
async function checkMaintenanceMode(){
  try{
    const {data} = await sb.from('pengaturan_situs').select('value').eq('key','maintenance_mode').maybeSingle();
    if(data && data.value === 'on'){
      const {data: sess} = await sb.auth.getSession();
      if(sess && sess.session){ showMaintenanceAdminBar(); return false; } // admin: lanjut tampil normal
      window.location.replace('maintenance.html');
      return true;
    }
  }catch(e){ /* kalau gagal cek, biarkan website tampil normal */ }
  return false;
}
function showMaintenanceAdminBar(){
  const bar = document.createElement('div');
  bar.setAttribute('role','status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100000;max-width:min(94vw,720px);display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center;background:#9b1c2e;color:#fff;padding:12px 18px;border-radius:16px;box-shadow:0 14px 34px -10px rgba(0,0,0,.55);font:600 13.5px/1.4 "Plus Jakarta Sans",sans-serif;text-align:center;';
  bar.innerHTML = '<span>Mode istirahat sedang AKTIF. Pengunjung melihat halaman error 503, hanya kamu (admin) yang melihat situs ini.</span>'
    + '<button type="button" id="maintOffBtn" style="border:0;border-radius:999px;padding:8px 16px;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;background:#f7e7ab;color:#2b0810;">Matikan sekarang</button>'
    + '<a href="maintenance.html" target="_blank" rel="noopener" style="color:#f7e7ab;text-decoration:underline;">Lihat halaman istirahat</a>';
  document.body.appendChild(bar);
  document.getElementById('maintOffBtn').addEventListener('click', async ()=>{
    const {error} = await sb.from('pengaturan_situs').upsert({key:'maintenance_mode', value:'off'});
    if(error){ alert('Gagal mematikan: ' + error.message); return; }
    bar.remove();
  });
}


// ---------- Efek interaktif (dipakai semua halaman) ----------
// Muncul saat digulir (.rv) — juga untuk elemen yang dibuat belakangan oleh data Supabase
const _rvIO = ('IntersectionObserver' in window) ? new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){
    e.target.classList.add('on');
    $$('[data-n]', e.target).concat(e.target.hasAttribute('data-n') ? [e.target] : []).forEach(countUp);
    _rvIO.unobserve(e.target);
  }
}), {threshold:.12}) : null;
function rvScan(root){
  $$('.rv:not(.on)', root).forEach((el,i)=>{
    if(el.__rv) return; el.__rv = 1;
    if(!_rvIO){ el.classList.add('on'); return; }
    el.style.transitionDelay = (i % 4) * 80 + 'ms';
    _rvIO.observe(el);
  });
}
function countUp(el){
  if(el.__cu) return; el.__cu = 1;
  const n = Number(el.getAttribute('data-n'));
  if(!isFinite(n)) return;
  const suf = el.getAttribute('data-suf') || '';
  let t0; const f = t=>{ t0 = t0 || t; const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + suf; if(p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
function setupFx(){
  const nav = document.querySelector('.navbar');
  const bar = document.getElementById('bar');
  const onS = ()=>{
    const h = document.documentElement;
    if(nav) nav.classList.toggle('s', scrollY > 40);
    if(bar) bar.style.width = (scrollY / Math.max(1, h.scrollHeight - innerHeight) * 100) + '%';
  };
  addEventListener('scroll', onS, {passive:true}); onS();
  rvScan();
  // MutationObserver: elemen .rv baru (hasil render data) otomatis ikut dianimasikan
  let t = null;
  new MutationObserver(()=>{ clearTimeout(t); t = setTimeout(()=>rvScan(), 60); }).observe(document.body, {childList:true, subtree:true});
  // tombol "magnet" + kartu miring + sorot kursor (delegasi, jalan juga untuk elemen dinamis)
  document.addEventListener('pointermove', e=>{
    if(e.pointerType === 'touch') return;
    const m = e.target.closest && e.target.closest('.mg');
    if(m){ const r = m.getBoundingClientRect(); m.style.transform = `translate(${(e.clientX - r.left - r.width/2) * .22}px,${(e.clientY - r.top - r.height/2) * .32}px)`; }
    const c = e.target.closest && e.target.closest('.tc');
    if(c){ const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.transform = `rotateY(${(x - .5) * 12}deg) rotateX(${(.5 - y) * 12}deg)`; c.style.setProperty('--gx', x * 100 + '%'); c.style.setProperty('--gy', y * 100 + '%'); }
    const h = e.target.closest && e.target.closest('.fx-hero');
    if(h){ const r = h.getBoundingClientRect(); h.style.setProperty('--mx', e.clientX - r.left + 'px'); h.style.setProperty('--my', e.clientY - r.top + 'px'); }
  }, {passive:true});
  document.addEventListener('pointerout', e=>{
    const m = e.target.closest && e.target.closest('.mg'); if(m && !m.contains(e.relatedTarget)) m.style.transform = '';
    const c = e.target.closest && e.target.closest('.tc'); if(c && !c.contains(e.relatedTarget)) c.style.transform = '';
  });
}
// Konfeti kecil (dipakai tombol perayaan)
function confetti(x, y){
  let cv = document.getElementById('cf');
  if(!cv){ cv = document.createElement('canvas'); cv.id = 'cf'; document.body.appendChild(cv); }
  cv.width = innerWidth; cv.height = innerHeight;
  const cx = cv.getContext('2d'), cs = getComputedStyle(document.documentElement);
  const col = [cs.getPropertyValue('--p').trim() || '#8a1530', cs.getPropertyValue('--a').trim() || '#e9b949', '#ffffff'];
  let pcs = []; for(let i = 0; i < 120; i++) pcs.push({x, y, vx:(Math.random() - .5) * 16, vy:-Math.random() * 16 - 4, r:Math.random() * 7 + 3, c:col[i % 3], a:Math.random() * 6, l:1});
  (function f(){
    cx.clearRect(0, 0, cv.width, cv.height);
    pcs.forEach(p=>{ p.vy += .45; p.x += p.vx; p.y += p.vy; p.a += .2; p.l -= .008; cx.globalAlpha = Math.max(p.l, 0); cx.fillStyle = p.c; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore(); });
    pcs = pcs.filter(p=>p.l > 0 && p.y < cv.height + 20);
    if(pcs.length) requestAnimationFrame(f); else cx.clearRect(0, 0, cv.width, cv.height);
  })();
}
// Ketik berganti kata (judul beranda)
function typeWords(el, words){
  if(!el || !words.length) return;
  let wi = 0, ci = 0, del = 0;
  (function t(){
    const w = words[wi]; ci += del ? -1 : 1; el.textContent = w.slice(0, ci);
    let d = del ? 40 : 90;
    if(!del && ci === w.length){ del = 1; d = 1400; } else if(del && ci === 0){ del = 0; wi = (wi + 1) % words.length; d = 400; }
    setTimeout(t, d);
  })();
}


// ---------- Pencarian di navbar ----------
function initNavSearch(){
  const Q = document.getElementById('navQ'), R = document.getElementById('navRes'), B = document.getElementById('navSBtn');
  if(!Q || !R) return;
  const nav = document.querySelector('.navbar');
  const PAGES = [
    ['Beranda','index.html','beranda utama home'],['Profil Pondok','profil.html','profil tentang sejarah'],['Sejarah','profil.html#sejarah','sejarah perjalanan'],
    ['Visi & Misi','profil.html#visimisi','visi misi'],['Struktur Pengurus','profil.html#struktur','struktur pengurus ustadz'],['Program Pendidikan','program.html','program pendidikan formal non formal'],
    ['Berita & Kegiatan','berita.html','berita kegiatan kabar'],['Galeri Foto & Video','galeri.html','galeri foto video dokumentasi'],
    ['Pendaftaran Santri Baru','ppdb.html','ppdb pendaftaran daftar syarat biaya jadwal psb santri baru'],['Kontak & Alamat','index.html#kontak','kontak alamat telepon wa whatsapp lokasi'],
    ['Jadwal Kegiatan Santri','index.html#jalan','jadwal kegiatan harian santri'],['Testimoni','index.html#testimoni','testimoni ulasan']
  ];
  let seq = 0, items = [], idx = -1;
  const safe = s => String(s).replace(/[%,()]/g,' ');
  function show(groups){
    items = []; idx = -1;
    const html = groups.filter(g=>g[1].length).map(g=>`<h6>${g[0]}</h6>` + g[1].map(x=>{ items.push(x.h); return `<a href="${esc(x.h)}">${esc(x.t)}${x.s?`<small>${esc(x.s)}</small>`:''}</a>`; }).join('')).join('');
    R.innerHTML = html || '<div class="none">Tidak ada hasil. Coba kata kunci lain.</div>'; R.hidden = false;
  }
  async function run(){
    const q = Q.value.trim(); const my = ++seq;
    if(q.length < 2){ R.hidden = true; return; }
    const ql = q.toLowerCase(), like = '%' + safe(q) + '%';
    const pg = PAGES.filter(p=>(p[0]+' '+p[2]).toLowerCase().includes(ql)).slice(0,4).map(p=>({t:p[0],h:p[1]}));
    const safeQ = async f => { try{ const r = await f; return r.data || []; }catch(e){ return []; } };
    const [br, pr, gl, kg] = await Promise.all([
      safeQ(sb.from('berita').select('slug,judul,kategori').eq('status','published').ilike('judul', like).limit(4)),
      safeQ(sb.from('program').select('nama,jenjang').ilike('nama', like).limit(4)),
      safeQ(sb.from('galeri').select('judul,kategori').ilike('judul', like).limit(4)),
      safeQ(sb.from('kegiatan_santri').select('judul,jam_mulai').eq('status','published').ilike('judul', like).limit(3))
    ]);
    if(my !== seq) return;
    show([
      ['Halaman', pg],
      ['Berita', br.map(b=>({t:b.judul,s:b.kategori,h:'berita.html?slug='+encodeURIComponent(b.slug)}))],
      ['Program', pr.map(p=>({t:p.nama,s:p.jenjang,h:'program.html'+(p.jenjang?'?jenjang='+encodeURIComponent(p.jenjang):'')}))],
      ['Galeri', gl.map(g=>({t:g.judul,s:g.kategori,h:'galeri.html'}))],
      ['Jadwal kegiatan', kg.map(k=>({t:k.judul,s:k.jam_mulai,h:'index.html#jalan'}))]
    ]);
  }
  let tm; Q.addEventListener('input', ()=>{ clearTimeout(tm); tm = setTimeout(run, 220); });
  Q.addEventListener('focus', ()=>{ if(Q.value.trim().length >= 2) run(); });
  Q.addEventListener('keydown', e=>{
    const as = [...R.querySelectorAll('a')];
    if(e.key === 'ArrowDown' && as.length){ e.preventDefault(); idx = (idx + 1) % as.length; }
    else if(e.key === 'ArrowUp' && as.length){ e.preventDefault(); idx = (idx - 1 + as.length) % as.length; }
    else if(e.key === 'Enter'){ e.preventDefault(); const a = as[idx >= 0 ? idx : 0]; if(a) location.href = a.getAttribute('href'); return; }
    else if(e.key === 'Escape'){ R.hidden = true; Q.blur(); return; }
    else return;
    as.forEach((a,i)=>a.classList.toggle('f', i === idx));
  });
  addEventListener('keydown', e=>{ if(e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName) && !(document.activeElement||{}).isContentEditable && getComputedStyle(document.getElementById('navSearch')).display !== 'none'){ e.preventDefault(); Q.focus(); } });
  document.addEventListener('click', e=>{ if(!e.target.closest('#navSearch') && !e.target.closest('#navSBtn')) R.hidden = true; });
  if(B) B.addEventListener('click', ()=>{ nav.classList.toggle('sopen'); if(nav.classList.contains('sopen')) setTimeout(()=>Q.focus(), 50); else R.hidden = true; });
}


// ---------- Jalankan semua yang umum, di semua halaman ----------
async function initSharedPage(){
  try{ initNavSearch(); }catch(e){ console.error(e); }
  const isMaintenance = await checkMaintenanceMode();
  if(isMaintenance) return;
  setupNavToggle();
  setupFx();
  applyLogo();
  applyHeroPhoto();
  loadFooterData();
  loadTicker();
  populateProgramDropdown();
  loadFlyer();
}
initSharedPage();
