/* ============================================================
   TEMA.JS — palet warna seluruh website. Dimuat di <head> SEBELUM
   halaman tampil, supaya warna langsung benar (tanpa berkedip).

   Warna disimpan sebagai variabel CSS di <html>:
     --p  warna utama      --pd  utama gelap     --a  aksen (emas)
     --al aksen muda       --bg  latar halaman   --bg2 latar kedua
     --ink teks            --mu  teks redup      --on  teks di atas warna utama

   Admin memilih palet di menu Preview (disimpan di tabel
   layout_halaman, halaman '_tema'). Pengunjung memakai yang LIVE.
   ============================================================ */
(function(){
'use strict';
const PALS = {
  maroon:{n:'Maroon & Emas',d:'Warna asli pondok: berwibawa, hangat',p:'#8a1530',pd:'#4a0b19',a:'#e9b949',al:'#fdeab5',bg:'#fff8ec',bg2:'#f6ead6',ink:'#2a1519',mu:'#6f5a5e',on:'#ffffff'},
  zamrud:{n:'Zamrud & Krem',d:'Hijau Islami: tenang, segar, tepercaya',p:'#0f6b57',pd:'#053b30',a:'#e2b04a',al:'#f8e7b8',bg:'#f6fbf7',bg2:'#e4f1ea',ink:'#10261f',mu:'#52695f',on:'#ffffff'},
  malam:{n:'Biru Malam & Emas',d:'Elegan & resmi, kesan prestisius',p:'#1d3a6e',pd:'#0b1b3a',a:'#f0b840',al:'#fbe6ad',bg:'#f7f8fc',bg2:'#e6eaf5',ink:'#121a2e',mu:'#58637e',on:'#ffffff'},
  teal:{n:'Teal & Terakota',d:'Modern, ramah anak muda, kontras hangat',p:'#0e7c86',pd:'#07434a',a:'#e8743b',al:'#fbd9c4',bg:'#f4fafa',bg2:'#dff0f1',ink:'#102a2d',mu:'#506a6d',on:'#ffffff'},
  plum:{n:'Plum & Peach',d:'Lembut & berkarakter',p:'#6a2a63',pd:'#34123a',a:'#f29b72',al:'#fde0d0',bg:'#fdf7f6',bg2:'#f4e6ef',ink:'#2a1228',mu:'#6c5568',on:'#ffffff'}
};
const KEYS = ['p','pd','a','al','bg','bg2','ink','mu','on'];
const HEX = /^#[0-9a-f]{6}$/i;

function rgb(h){ h = h.replace('#',''); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)); }
function hex(a){ return '#' + a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function mix(h1,h2,t){ const a = rgb(h1), b = rgb(h2); return hex(a.map((v,i)=>v + (b[i]-v)*t)); }
function lum(h){ const [r,g,b] = rgb(h).map(v=>{ v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4); }); return .2126*r + .7152*g + .0722*b; }

// Warna kustom: admin cukup memilih 3 warna, sisanya dihitung otomatis
function derive(p,a,bg){
  const pd = mix(p,'#000000',.46);
  const ink = mix(p,'#000000',.84);
  return {p:p, pd:pd, a:a, al:mix(a,'#ffffff',.66), bg:bg, bg2:mix(bg,p,.09), ink:ink, mu:mix(ink,bg,.48), on: lum(p) > .55 ? '#1a1214' : '#ffffff'};
}
// theme = {pal:'maroon'} atau {pal:'custom', p:'#..', a:'#..', bg:'#..'}
function resolve(t){
  if(!t || typeof t !== 'object') return null;
  if(t.pal === 'custom' && HEX.test(t.p) && HEX.test(t.a) && HEX.test(t.bg)) return derive(t.p,t.a,t.bg);
  if(PALS[t.pal]) return PALS[t.pal];
  return null;
}
function apply(t){
  const c = resolve(t), st = document.documentElement.style;
  KEYS.forEach(k=>{ if(c) st.setProperty('--' + k, c[k]); else st.removeProperty('--' + k); });
  return c;
}
function clean(t){
  if(!t || typeof t !== 'object') return null;
  if(t.pal === 'custom'){
    if(HEX.test(t.p) && HEX.test(t.a) && HEX.test(t.bg)) return {pal:'custom', p:t.p.toLowerCase(), a:t.a.toLowerCase(), bg:t.bg.toLowerCase()};
    return null;
  }
  return PALS[t.pal] ? {pal:t.pal} : null;
}
function cache(t){ try{ if(t) localStorage.setItem('pptq_tema2', JSON.stringify(t)); else localStorage.removeItem('pptq_tema2'); }catch(e){} }

window.PPTQTema = {PALS:PALS, KEYS:KEYS, derive:derive, resolve:resolve, apply:apply, clean:clean, cache:cache, mix:mix};

// terapkan lebih awal dari cache (hanya untuk pengunjung; editor memakai draf)
if(document.documentElement.hasAttribute('data-no-tema')){
  /* halaman admin: jangan diwarnai */
} else if(!/[?&]editor=1(&|$)/.test(location.search)){
  try{ apply(JSON.parse(localStorage.getItem('pptq_tema2') || 'null')); }catch(e){}
} else {
  document.documentElement.classList.add('is-ed');
}
})();
