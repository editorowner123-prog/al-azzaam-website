// Sitemap otomatis: halaman tetap + semua berita yang sudah terbit.
const { sbGet, esc, SITE } = require("./_sb");

const PAGES = [
  ["/", "weekly", "1.0"],
  ["/profil", "monthly", "0.8"],
  ["/program", "monthly", "0.8"],
  ["/ppdb", "monthly", "0.9"],
  ["/berita", "daily", "0.7"],
  ["/galeri", "monthly", "0.6"],
];

module.exports = async (req, res) => {
  let berita = [];
  try {
    berita = await sbGet("berita?status=eq.published&select=slug,tanggal_publish&order=tanggal_publish.desc&limit=1000");
  } catch (e) { berita = []; }
  const today = new Date().toISOString().slice(0, 10);
  const u = (loc, freq, pr, last) =>
    "  <url><loc>" + esc(loc) + "</loc>" + (last ? "<lastmod>" + last + "</lastmod>" : "") +
    "<changefreq>" + freq + "</changefreq><priority>" + pr + "</priority></url>";
  const rows = PAGES.map(([p, f, pr]) => u(SITE + p, f, pr, today));
  berita.forEach((b) => {
    if (!b.slug) return;
    const d = b.tanggal_publish ? new Date(b.tanggal_publish).toISOString().slice(0, 10) : undefined;
    rows.push(u(SITE + "/berita?slug=" + encodeURIComponent(b.slug), "monthly", "0.6", d));
  });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows.join("\n") + "\n</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.end(xml);
};
