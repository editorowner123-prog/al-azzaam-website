/* ============================================================
   EDITOR.JS — editor visual untuk menu "Preview" di panel admin.
   Hanya dimuat oleh layout.js bila halaman dibuka dengan ?editor=1
   DAN admin sedang login. Pengunjung biasa tidak pernah memuat ini.

   Fitur:
   - Klik blok untuk memilih
   - Seret ikon pegangan (kiri atas) untuk memindahkan blok
   - Tarik tepi kanan / bawah / sudut untuk mengubah ukuran (tampilan desktop)
   - Klik 2x pada teks untuk mengedit tulisan
   Semua perubahan disimpan lewat panel admin (tombol Simpan draf /
   Publikasikan), BUKAN ke tabel berita/program/dll.
   ============================================================ */
(function(){
'use strict';
const L = window.PPTQLayout;
if(!L || window.PPTQEditor) return;

// ---------- gaya editor ----------
const css = `
body.ed-on{cursor:default;}
body.ed-on [data-lk]{cursor:default;}
.ed-ui{font-family:'Figtree',system-ui,sans-serif;}
.ed-hover{position:absolute;pointer-events:none;border:2px dashed rgba(199,154,43,.9);border-radius:14px;z-index:9990;display:none;}
.ed-sel{position:absolute;pointer-events:none;border:2px solid #7a1126;border-radius:14px;z-index:9991;display:none;box-shadow:0 0 0 4px rgba(122,17,38,.12);}
.ed-chip{position:absolute;left:0;bottom:100%;margin-bottom:6px;background:#7a1126;color:#fff;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap;display:flex;gap:8px;align-items:center;pointer-events:auto;}
.ed-chip button{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:999px;font:700 11.5px 'Figtree',sans-serif;padding:3px 9px;cursor:pointer;}
.ed-chip button:hover{background:rgba(255,255,255,.35);}
.ed-grip{position:absolute;left:-14px;top:-14px;width:30px;height:30px;border-radius:50%;background:#7a1126;color:#fff;display:grid;place-items:center;cursor:grab;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,.35);touch-action:none;}
.ed-grip:active{cursor:grabbing;}
.ed-grip svg{width:16px;height:16px;}
.ed-h{position:absolute;background:#fff;border:2px solid #7a1126;pointer-events:auto;touch-action:none;box-shadow:0 2px 6px rgba(0,0,0,.3);}
.ed-h.e{right:-8px;top:50%;width:14px;height:34px;margin-top:-17px;border-radius:8px;cursor:ew-resize;}
.ed-h.s{bottom:-8px;left:50%;height:14px;width:34px;margin-left:-17px;border-radius:8px;cursor:ns-resize;}
.ed-h.se{right:-10px;bottom:-10px;width:20px;height:20px;border-radius:50%;cursor:nwse-resize;background:#7a1126;}
.ed-nores .ed-h{display:none;}
.ed-ghost{position:fixed;z-index:9999;pointer-events:none;background:#7a1126;color:#fff;font:700 13px 'Figtree',sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 10px 24px rgba(0,0,0,.35);opacity:.92;transform:translate(12px,12px);}
.ed-drop{position:absolute;z-index:9992;background:#c79a2b;border-radius:4px;pointer-events:none;box-shadow:0 0 0 3px rgba(199,154,43,.35);display:none;}
.ed-dragging{opacity:.35!important;}
.ed-editing{outline:2px solid #c79a2b!important;outline-offset:3px;border-radius:6px;cursor:text!important;background-color:rgba(243,221,154,.25);}
[data-tk]:hover{outline:1px dotted rgba(122,17,38,.45);outline-offset:2px;}
`;
const st = document.createElement('style'); st.id = 'edStyle'; st.textContent = css; document.head.appendChild(st);
document.body.classList.add('ed-on');

// ---------- UI overlay ----------
function mk(cls, parent){ const d = document.createElement('div'); d.className = cls + ' ed-ui'; (parent||document.body).appendChild(d); return d; }
const hov = mk('ed-hover');
const sel = mk('ed-sel');
const drop = mk('ed-drop');
const chip = document.createElement('div'); chip.className = 'ed-chip'; sel.appendChild(chip);
const grip = document.createElement('div'); grip.className = 'ed-grip';
grip.title = 'Seret untuk memindahkan';
grip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';
sel.appendChild(grip);
['e','s','se'].forEach(d=>{ const h = document.createElement('div'); h.className = 'ed-h ' + d; h.dataset.dir = d; sel.appendChild(h); });

let current = null;       // blok terpilih
let editingEl = null;

const isUI = el => !!(el && el.closest && el.closest('.ed-ui'));
const blockAt = el => el && el.closest ? el.closest('[data-lk]') : null;
const canResize = () => window.innerWidth > 980;

function place(box, el){
  const r = el.getBoundingClientRect();
  box.style.left = (r.left + scrollX) + 'px';
  box.style.top = (r.top + scrollY) + 'px';
  box.style.width = r.width + 'px';
  box.style.height = r.height + 'px';
  box.style.display = 'block';
}
function labelOf(el){
  const k = el.getAttribute('data-lk') || '', c = el.getAttribute('data-lc') || '';
  return k.indexOf(c + '-') === 0 ? k.slice(c.length + 1) : k;
}
function info(el){
  const s = (L.getState().size || {})[el.getAttribute('data-lk')] || {};
  const bits = [];
  if(s.span) bits.push(s.span + ' kolom');
  if(s.rows) bits.push(s.rows + ' baris');
  if(s.w) bits.push(s.w + '%');
  if(s.h && !s.rows) bits.push(s.h + 'px');
  return bits.join(' · ');
}
function refresh(){
  if(current && document.contains(current)){
    place(sel, current);
    sel.classList.toggle('ed-nores', !canResize());
    const parent = current.parentElement ? blockAt(current.parentElement) : null;
    chip.innerHTML = '';
    const t = document.createElement('span'); t.textContent = labelOf(current) + (info(current) ? '  ·  ' + info(current) : '');
    chip.appendChild(t);
    if(parent){ const b = document.createElement('button'); b.textContent = 'Pilih induk'; b.onclick = e=>{ e.stopPropagation(); select(parent); }; chip.appendChild(b); }
    const rs = (L.getState().size || {})[current.getAttribute('data-lk')];
    if(rs){ const b = document.createElement('button'); b.textContent = 'Ukuran awal'; b.onclick = e=>{ e.stopPropagation(); resetSize(current); }; chip.appendChild(b); }
  } else { sel.style.display = 'none'; }
}
function select(el){ current = el; refresh(); }
function resetSize(el){
  const k = el.getAttribute('data-lk');
  L.commit(s=>{ delete s.size[k]; });
  setTimeout(refresh, 30);
}
L.onChange(()=>{ requestAnimationFrame(refresh); });
addEventListener('resize', ()=>requestAnimationFrame(refresh));
addEventListener('scroll', ()=>{ if(hov.style.display === 'block') hov.style.display = 'none'; }, {passive:true});

// ---------- hover & klik ----------
document.addEventListener('mousemove', e=>{
  if(dragging || resizing || isUI(e.target)) return;
  const b = blockAt(e.target);
  if(b && b !== current){ place(hov, b); } else hov.style.display = 'none';
}, true);
document.addEventListener('mouseleave', ()=>{ hov.style.display = 'none'; });

document.addEventListener('click', e=>{
  if(isUI(e.target)) return;
  if(editingEl && editingEl.contains(e.target)) return;   // sedang mengetik: biarkan
  e.preventDefault(); e.stopPropagation();
  const b = blockAt(e.target);
  if(editingEl) stopEdit();
  if(b) select(b); else { current = null; refresh(); }
}, true);
// cegah submit/aksi bawaan lain saat mode edit
['mousedown','mouseup','auxclick','submit'].forEach(t=>document.addEventListener(t, e=>{
  if(isUI(e.target)) return;
  if(editingEl && editingEl.contains(e.target)) return;
  if(t === 'mousedown' && !e.target.closest('a,button,[onclick]')) return;
  if(t !== 'mousedown') e.preventDefault();
}, true));

// ---------- edit teks ----------
document.addEventListener('dblclick', e=>{
  if(isUI(e.target)) return;
  const el = e.target.closest('[data-tk]');
  if(!el) return;
  e.preventDefault(); e.stopPropagation();
  startEdit(el);
}, true);
function startEdit(el){
  if(editingEl && editingEl !== el) stopEdit();
  editingEl = el; el.__editing = true;
  el.contentEditable = 'true';
  el.classList.add('ed-editing');
  el.focus();
  const sel2 = getSelection(); const r = document.createRange(); r.selectNodeContents(el); sel2.removeAllRanges(); sel2.addRange(r);
  el.addEventListener('keydown', onKey);
  el.addEventListener('paste', onPaste);
  el.addEventListener('blur', stopEdit, {once:true});
}
function onKey(e){
  if(e.key === 'Escape'){ e.preventDefault(); this.__cancel = true; this.blur(); }
  else if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); this.blur(); }
}
function onPaste(e){
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
}
function stopEdit(){
  const el = editingEl; if(!el) return;
  editingEl = null;
  el.removeEventListener('keydown', onKey);
  el.removeEventListener('paste', onPaste);
  el.contentEditable = 'false';
  el.classList.remove('ed-editing');
  el.__editing = false;
  const key = el.getAttribute('data-tk');
  const before = el.__cur !== undefined ? el.__cur : el.__orig;
  if(el.__cancel){ el.__cancel = false; el.innerHTML = before; return; }
  // bersihkan sisa bawaan browser (div/ style)
  let html = el.innerHTML.replace(/<div[^>]*>/gi, '<br>').replace(/<\/div>/gi, '').replace(/\sstyle="[^"]*"/gi, '');
  html = html.replace(/(<br>\s*)+$/i, '');
  if(html === before) { el.innerHTML = before; return; }
  L.commit(s=>{
    if(html === el.__orig) delete s.text[key]; else s.text[key] = html;
  });
}

// ---------- seret & lepas (pindah blok) ----------
let dragging = null;
grip.addEventListener('pointerdown', e=>{
  if(!current) return;
  e.preventDefault(); e.stopPropagation();
  grip.setPointerCapture(e.pointerId);
  const block = current, c = block.parentElement;
  const ghost = mk('ed-ghost'); ghost.textContent = labelOf(block);
  ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
  block.classList.add('ed-dragging');
  dragging = {block, c, ghost, target:null, before:true};
  hov.style.display = 'none';
});
grip.addEventListener('pointermove', e=>{
  if(!dragging) return;
  const d = dragging;
  d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
  if(e.clientY < 70) scrollBy(0, -22); else if(e.clientY > innerHeight - 70) scrollBy(0, 22);
  // cari saudara blok yang ada di bawah pointer
  let el = document.elementFromPoint(e.clientX, e.clientY);
  let sib = null;
  while(el && el !== document.body){
    if(el.parentElement === d.c && el.hasAttribute('data-lk')){ sib = el; break; }
    el = el.parentElement;
  }
  if(!sib || sib === d.block){ drop.style.display = 'none'; d.target = null; return; }
  const r = sib.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const vertical = Math.abs(e.clientY - cy) / r.height > Math.abs(e.clientX - cx) / r.width;
  d.before = vertical ? e.clientY < cy : e.clientX < cx;
  d.target = sib;
  // garis penanda tempat jatuh
  if(vertical || r.width > d.c.clientWidth * 0.9){
    drop.style.left = (r.left + scrollX) + 'px'; drop.style.width = r.width + 'px'; drop.style.height = '6px';
    drop.style.top = ((d.before ? r.top : r.bottom) + scrollY - 3) + 'px';
  } else {
    drop.style.top = (r.top + scrollY) + 'px'; drop.style.height = r.height + 'px'; drop.style.width = '6px';
    drop.style.left = ((d.before ? r.left : r.right) + scrollX - 3) + 'px';
  }
  drop.style.display = 'block';
});
function endDrag(e, cancel){
  if(!dragging) return;
  const d = dragging; dragging = null;
  d.ghost.remove(); drop.style.display = 'none';
  d.block.classList.remove('ed-dragging');
  if(cancel || !d.target) return;
  const name = d.c.getAttribute('data-lay');
  const keys = L.blocksOf(d.c).map(b=>b.getAttribute('data-lk'));
  const me = d.block.getAttribute('data-lk');
  const without = keys.filter(k=>k !== me);
  let at = without.indexOf(d.target.getAttribute('data-lk'));
  if(!d.before) at++;
  without.splice(at, 0, me);
  if(JSON.stringify(without) === JSON.stringify(keys)) return;
  L.commit(s=>{ s.order[name] = without; });
  setTimeout(()=>{ select(d.block); }, 30);
}
grip.addEventListener('pointerup', e=>endDrag(e,false));
grip.addEventListener('pointercancel', e=>endDrag(e,true));

// ---------- ubah ukuran (tarik tepi) ----------
let resizing = null;
sel.addEventListener('pointerdown', e=>{
  const h = e.target.closest('.ed-h'); if(!h || !current || !canResize()) return;
  e.preventDefault(); e.stopPropagation();
  h.setPointerCapture(e.pointerId);
  const block = current, c = block.parentElement, cs = getComputedStyle(c);
  const rect = block.getBoundingClientRect();
  const isGrid = /grid/.test(cs.display);
  const tracks = isGrid ? cs.gridTemplateColumns.split(' ').filter(Boolean) : [];
  const cols = tracks.length;
  const gap = parseFloat(cs.columnGap) || 0;
  const rgap = parseFloat(cs.rowGap) || 0;
  const colW = cols ? (tracks.reduce((a,t)=>a+parseFloat(t),0) / cols) : 0;
  const rowH = Number(c.getAttribute('data-rowh')) || 0;
  const cw = c.clientWidth - (parseFloat(cs.paddingLeft)||0) - (parseFloat(cs.paddingRight)||0);
  resizing = {block, key:block.getAttribute('data-lk'), dir:h.dataset.dir, x:e.clientX, y:e.clientY, w:rect.width, h:rect.height,
    isGrid, cols, gap, rgap, colW, rowH, cw, before:L.clone(L.getState()), moved:false};
});
sel.addEventListener('pointermove', e=>{
  const r = resizing; if(!r) return;
  const dx = e.clientX - r.x, dy = e.clientY - r.y;
  const st = L.getState();
  const cur = Object.assign({}, st.size[r.key] || {});
  if(r.dir.includes('e')){
    if(r.isGrid && r.cols > 1){
      const span = Math.max(1, Math.min(r.cols, Math.round((r.w + dx + r.gap) / (r.colW + r.gap))));
      cur.span = span; delete cur.w;
    } else {
      cur.w = Math.max(25, Math.min(100, Math.round((r.w + dx) / r.cw * 100))); delete cur.span;
    }
  }
  if(r.dir.includes('s')){
    const nh = Math.max(48, r.h + dy);
    if(r.isGrid && r.rowH){
      cur.rows = Math.max(1, Math.round((nh + r.rgap) / (r.rowH + r.rgap))); delete cur.h;
    } else { cur.h = Math.round(nh); delete cur.rows; }
  }
  st.size[r.key] = cur;
  r.moved = true;
  // pratinjau langsung tanpa masuk riwayat
  L.preview(st);
  refresh();
});
function endResize(){
  const r = resizing; if(!r) return; resizing = null;
  if(!r.moved) return;
  L.finishPreview(r.before, L.getState());   // catat sebagai satu langkah (bisa di-undo)
  refresh();
}
sel.addEventListener('pointerup', endResize);
sel.addEventListener('pointercancel', endResize);

// ---------- papan ketik ----------
document.addEventListener('keydown', e=>{
  if(editingEl) return;
  if(e.key === 'Escape'){ current = null; refresh(); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); e.shiftKey ? L.redo() : L.undo(); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y'){ e.preventDefault(); L.redo(); }
});

window.PPTQEditor = {select, refresh, startEdit};
})();
