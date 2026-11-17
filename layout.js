/* ============================================================
   LAYOUT.JS — tata letak halaman yang bisa diatur dari panel admin
   (menu Preview / Live). Dimuat di semua halaman publik.

   - Mengatur URUTAN blok, UKURAN blok, dan TEKS statis halaman.
   - Disimpan di tabel layout_halaman (terpisah dari data berita,
     program, galeri, dll), jadi tidak mengubah database konten.
   - Pengunjung memakai versi 'live'. Admin memakai ?editor=1
     (dibuka dari panel admin) untuk melihat/mengedit versi 'draft'.
   ============================================================ */
(function(){
'use strict';

const PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/,'') || 'index';
const IS_ED = /[?&]editor=1(&|$)/.test(location.search);
const GENERIC = new Set(['t','section','wrap','card','sec','shell','i']);
const INLINE = new Set(['EM','STRONG','B','I','SPAN','BR','SVG','SMALL','A','U','MARK','TIME','CODE','S']);
const SKIP_TAGS = new Set(['SCRIPT','STYLE','TEMPLATE','LINK','META','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION','IFRAME','CANVAS','IMG']);

let state = {order:{}, size:{}, text:{}};
let baseline = '';
let applying = false;
const containers = {};
const origOrder = {};
const listeners = [];
const undoStack = [];
const redoStack = [];

// ---------- util ----------
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'') || 'x'; }
function clean(html){
  const t = document.createElement('template');
  t.innerHTML = String(html);
  t.content.querySelectorAll('script,iframe,object,embed,style,link,meta,form').forEach(n=>n.remove());
  t.content.querySelectorAll('*').forEach(n=>{
    [...n.attributes].forEach(a=>{
      const name = a.name.toLowerCase();
      if(name.startsWith('on') || (/(^|:)href$/.test(name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    });
  });
  return t.innerHTML;
}
function normalize(s){
  const o = {order:{}, size:{}, text:{}};
  Object.keys((s&&s.order)||{}).forEach(n=>{
    const arr = s.order[n];
    if(Array.isArray(arr) && arr.length && JSON.stringify(arr) !== JSON.stringify(origOrder[n]||[])) o.order[n] = arr;
  });
  Object.keys((s&&s.size)||{}).forEach(k=>{
    const v = s.size[k]||{}, r = {};
    ['span','rows','h','w'].forEach(f=>{ const x = Number(v[f]); if(x > 0 && isFinite(x)) r[f] = Math.round(x); });
    if(Object.keys(r).length) o.size[k] = r;
  });
  Object.keys((s&&s.text)||{}).forEach(k=>{ if(typeof s.text[k] === 'string') o.text[k] = s.text[k]; });
  const th = window.PPTQTema ? window.PPTQTema.clean(s && s.theme) : null;
  if(th) o.theme = th;
  return o;
}
function str(s){ return JSON.stringify(normalize(s)); }

// ---------- blok & kunci ----------
function blocksOf(c){
  const sel = c.getAttribute('data-lay-sel');
  let kids = [...c.children].filter(k=>
    !SKIP_TAGS.has(k.tagName) && !k.hasAttribute('data-lay-skip') && k.id !== 'spriteIkon' && !k.classList.contains('flyer-overlay') && !k.classList.contains('ed-ui'));
  if(sel) kids = kids.filter(k=>k.matches(sel));
  return kids;
}
function isUnit(el){
  let own = false;
  el.childNodes.forEach(n=>{ if(n.nodeType === 3 && n.textContent.trim()) own = true; });
  if(!own) return false;
  for(const ch of el.children){ if(!INLINE.has(ch.tagName.toUpperCase())) return false; }
  return true;
}
function markTexts(block, key){
  if(block.hasAttribute('data-dyn')) return;
  let idx = 0;
  (function walk(el){
    for(const ch of el.children){
      if(ch instanceof SVGElement || SKIP_TAGS.has(ch.tagName) || ch.hasAttribute('data-dyn') || ch.hasAttribute('data-lk')) continue;
      if(isUnit(ch)){
        ch.setAttribute('data-tk', key + ':' + (idx++));
        ch.__orig = ch.innerHTML;
      } else walk(ch);
    }
  })(block);
}
function register(name, c){
  const used = new Set([...c.children].map(k=>k.getAttribute('data-lk')).filter(Boolean));
  blocksOf(c).forEach(k=>{
    if(k.hasAttribute('data-lk')) return;
    let base = k.id || [...k.classList].filter(x=>!GENERIC.has(x) && !/^(open|active|on|dark)$/.test(x)).join('-') || k.tagName.toLowerCase();
    base = slug(name + '/' + base);
    let key = base, n = 1;
    while(used.has(key)){ n++; key = base + '-' + n; }
    used.add(key);
    k.setAttribute('data-lk', key);
    k.setAttribute('data-lc', name);
    markTexts(k, key);
  });
  if(!origOrder[name]) origOrder[name] = [];
  blocksOf(c).forEach(k=>{ const key = k.getAttribute('data-lk'); if(key && !origOrder[name].includes(key)) origOrder[name].push(key); });
}
function scan(){
  document.querySelectorAll('[data-lay]').forEach(c=>{
    const n = c.getAttribute('data-lay');
    containers[n] = c;
    register(n, c);
  });
}

// ---------- terapkan state ke halaman ----------
function applyOrder(){
  Object.keys(containers).forEach(name=>{
    const c = containers[name];
    const cur = blocksOf(c);
    if(!cur.length) return;
    const want = (state.order[name] || []).concat(origOrder[name] || []);
    const seen = new Set(), els = [];
    want.forEach(k=>{
      if(seen.has(k)) return; seen.add(k);
      const el = cur.find(e=>e.getAttribute('data-lk') === k);
      if(el) els.push(el);
    });
    cur.forEach(e=>{ if(!els.includes(e)) els.push(e); });
    if(els.every((e,i)=>e === cur[i])) return;
    const anchor = document.createComment('');
    c.insertBefore(anchor, cur[0]);
    els.forEach(e=>c.insertBefore(e, anchor));
    anchor.remove();
  });
}
function applyText(){
  document.querySelectorAll('[data-tk]').forEach(el=>{
    if(el.__editing) return;
    const k = el.getAttribute('data-tk');
    const v = state.text[k];
    if(v !== undefined){
      if(el.__cur !== v){ el.innerHTML = clean(v); el.__cur = v; el.__edited = true; }
    } else if(el.__edited){
      el.innerHTML = el.__orig; el.__edited = false; el.__cur = undefined;
    }
  });
}
function buildCss(){
  let r = '';
  Object.keys(state.size || {}).forEach(k=>{
    if(!/^[a-z0-9._-]+$/.test(k)) return;
    const s = state.size[k] || {}; let d = '';
    if(s.span) d += 'grid-column:span ' + (+s.span) + '!important;';
    if(s.rows) d += 'grid-row:span ' + (+s.rows) + '!important;';
    if(s.h && !s.rows) d += 'min-height:' + (+s.h) + 'px!important;';
    if(s.w) d += 'width:' + (+s.w) + '%!important;margin-left:auto!important;margin-right:auto!important;justify-self:center!important;';
    if(d) r += '[data-lk="' + k + '"]{' + d + '}';
  });
  return r ? '@media(min-width:981px){' + r + '}' : '';
}
function applyCss(){
  let st = document.getElementById('layoutCss');
  if(!st){ st = document.createElement('style'); st.id = 'layoutCss'; document.head.appendChild(st); }
  const css = buildCss();
  if(st.textContent !== css) st.textContent = css;
}
function applyTheme(){
  if(!window.PPTQTema) return;
  window.PPTQTema.apply(state.theme || null);
}
function apply(){
  applying = true;
  try{ scan(); applyOrder(); applyText(); applyCss(); applyTheme(); }
  finally{ applying = false; }
}
function notify(){ listeners.forEach(f=>{ try{ f(); }catch(e){} }); }

// ---------- perubahan (dipakai editor) ----------
function commit(mutator){
  undoStack.push(clone(state));
  if(undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
  mutator(state);
  state = normalize(state);
  apply(); notify();
}
function undo(){
  if(!undoStack.length) return false;
  redoStack.push(clone(state));
  state = undoStack.pop(); apply(); notify(); return true;
}
function redo(){
  if(!redoStack.length) return false;
  undoStack.push(clone(state));
  state = redoStack.pop(); apply(); notify(); return true;
}
function setState(s, opts){
  state = normalize(s || {});
  undoStack.length = 0; redoStack.length = 0;
  apply();
  if(opts && opts.baseline) baseline = str(state);
  notify();
}

// ---------- ambil data dari Supabase ----------
async function fetchRows(){
  try{
    if(typeof sb === 'undefined') return {};
    const {data, error} = await sb.from('layout_halaman').select('halaman,status,data').in('halaman', [PAGE, '_tema']);
    if(error || !data) return {};
    const out = {tema:{}}; data.forEach(r=>{
      if(!r.data || r.data.v !== 2) return;
      if(r.halaman === '_tema') out.tema[r.status] = r.data; else out[r.status] = r.data;
    });
    return out;
  }catch(e){ return {}; }
}

let readyResolve;
const ready = new Promise(res=>{ readyResolve = res; });

const API = {
  page: PAGE, isEditor: IS_ED, ready,
  getState: ()=>normalize(state),
  isDirty: ()=>str(state) !== baseline,
  markSaved: ()=>{ baseline = str(state); notify(); },
  setState, commit, undo, redo, apply,
  preview: s=>{ state = normalize(s); applyCss(); },
  finishPreview: (prev, now)=>{ undoStack.push(clone(prev)); redoStack.length = 0; state = normalize(now); apply(); notify(); },
  canUndo: ()=>undoStack.length > 0, canRedo: ()=>redoStack.length > 0,
  clearAll: ()=>commit(s=>{ s.order = {}; s.size = {}; s.text = {}; }),
  // Warna situs: berlaku untuk SEMUA halaman (disimpan terpisah di baris '_tema')
  getTheme: ()=>state.theme ? clone(state.theme) : null,
  previewTheme: t=>{ state.theme = window.PPTQTema.clean(t) || undefined; if(!state.theme) delete state.theme; applyTheme(); },
  setTheme: t=>commit(s=>{ const c = window.PPTQTema.clean(t); if(c) s.theme = c; else delete s.theme; }),
  onChange: f=>listeners.push(f),
  blocksOf, containers, origOrder, clone,
  rows: {}
};
window.PPTQLayout = API;

// ---------- mulai ----------
function boot(){
  scan();
  // pengunjung: pakai cache lokal dulu supaya tidak berkedip
  if(!IS_ED){
    try{
      const c = localStorage.getItem('lay2_' + PAGE);
      if(c){
        state = normalize(JSON.parse(c));
        try{ const tc = window.PPTQTema && window.PPTQTema.clean(JSON.parse(localStorage.getItem('pptq_tema2') || 'null')); if(tc) state.theme = tc; }catch(e){}
        apply();
      }
    }catch(e){}
  }
  // elemen dinamis (diisi JS setelah data datang) -> rapikan lagi otomatis
  let t = null;
  const mo = new MutationObserver(()=>{
    if(applying) return;
    clearTimeout(t); t = setTimeout(()=>{ mo.disconnect(); apply(); observeAll(); }, 40);
  });
  function observeAll(){ Object.keys(containers).forEach(n=>mo.observe(containers[n], {childList:true})); }
  observeAll();

  (async function(){
    const rows = await fetchRows();
    API.rows = rows;
    let sess = null;
    if(IS_ED){
      try{ const r = await sb.auth.getSession(); sess = r && r.data && r.data.session; }catch(e){}
    }
    if(IS_ED && sess){
      mo.disconnect();
      const base = Object.assign({}, rows.draft || rows.live || {});
      const tm = (rows.tema && (rows.tema.draft || rows.tema.live)) || null;
      if(tm) base.theme = tm;
      setState(base, {baseline:true});
      observeAll();
      const s = document.createElement('script');
      s.src = 'editor.js?v=1';
      s.onload = ()=>readyResolve(true);
      s.onerror = ()=>readyResolve(false);
      document.body.appendChild(s);
    } else {
      mo.disconnect();
      const base = Object.assign({}, rows.live || {});
      const tm = rows.tema && rows.tema.live;
      if(tm) base.theme = tm;
      setState(base, {baseline:true});
      observeAll();
      try{
        const ns = normalize(state);
        const th = ns.theme; delete ns.theme;
        localStorage.setItem('lay2_' + PAGE, JSON.stringify(ns));
        window.PPTQTema && window.PPTQTema.cache(th || null);
      }catch(e){}
      readyResolve(true);
    }
  })();
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
