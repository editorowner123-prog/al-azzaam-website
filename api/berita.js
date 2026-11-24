// Menyajikan berita-page.html dengan judul, deskripsi, foto, dan data terstruktur milik berita yang dibuka (?slug=...)
// supaya pratinjau WhatsApp/Facebook/Google menampilkan berita yang benar, bukan tampilan umum.
const fs = require("fs");
const path = require("path");
const { sbGet, esc, SITE } = require("./_sb");

function plain(isi) {
  return String(isi || "").replace(/\[\[gambar:.*?\]\]/g, " ").replace(/\s+/g, " ").trim();
}
function cut(s, n) {
  s = String(s || "").trim();
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}
function setMeta(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html;
}

module.exports = async (req, res) => {
  let html;
  try {
    html = fs.readFileSync(path.join(process.cwd(), "berita-page.html"), "utf8");
  } catch (e) {
    res.statusCode = 500;
    return res.end("berita-page.html tidak ditemukan");
  }
  const slug = String((req.query && req.query.slug) || "").slice(0, 200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  let b = null;
  if (slug) {
    try {
      const rows = await sbGet(
        "berita?slug=eq." + encodeURIComponent(slug) + "&status=eq.published&select=judul,slug,ringkasan,isi,foto_url,kategori,tanggal_publish&limit=1"
      );
      b = rows && rows[0];
    } catch (e) { b = null; }
  }
  if (!b) {
    // daftar berita (tanpa slug) disimpan sebentar; slug tidak ditemukan / draf tidak di-cache
    res.setHeader("Cache-Control", slug ? "no-store" : "public, s-maxage=300, stale-while-revalidate=86400");
    return res.end(html);
  }

  const url = SITE + "/berita?slug=" + encodeURIComponent(b.slug);
  const title = b.judul + " — PPTQ Al Azzaam";
  const desc = cut(b.ringkasan || plain(b.isi), 160);
  // WhatsApp menolak gambar besar (foto HP bisa beberapa MB): kecilkan jadi 1200x630 lewat wsrv.nl (gratis, ber-cache).
  const img = b.foto_url
    ? "https://wsrv.nl/?url=" + encodeURIComponent(b.foto_url) + "&w=1200&h=630&fit=cover&output=jpg&q=80"
    : SITE + "/og-image.jpg";
  const tgl = b.tanggal_publish ? new Date(b.tanggal_publish).toISOString() : undefined;

  html = html.replace(/<title id="pageTitle">[\s\S]*?<\/title>/, '<title id="pageTitle">' + esc(title) + "</title>");
  html = setMeta(html, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(desc) + '">');
  html = setMeta(html, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(url) + '">');
  html = setMeta(html, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="article">');
  html = setMeta(html, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(url) + '">');
  html = setMeta(html, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(title) + '">');
  html = setMeta(html, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(desc) + '">');
  html = setMeta(html, /<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + esc(img) + '">');
  html = html.replace(/<meta property="og:image:(width|height)" content="[^"]*">\n?/g, "");
  html = html.replace('<meta property="og:image" content="' + esc(img) + '">', '<meta property="og:image" content="' + esc(img) + '">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">');
  html = setMeta(html, /<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + esc(title) + '">');
  html = setMeta(html, /<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + esc(desc) + '">');
  html = setMeta(html, /<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + esc(img) + '">');

  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, "");
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: url,
    headline: cut(b.judul, 110),
    description: desc,
    image: [img],
    articleSection: b.kategori || undefined,
    datePublished: tgl,
    dateModified: tgl,
    inLanguage: "id",
    author: { "@type": "Organization", name: "PPTQ Al Azzaam" },
    publisher: { "@type": "Organization", name: "PPTQ Al Azzaam", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" } },
  };
  const bc = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Berita", item: SITE + "/berita" },
      { "@type": "ListItem", position: 3, name: b.judul, item: url },
    ],
  };
  const j = (o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, "\\u003c") + "</script>\n";
  html = html.replace("</head>", j(ld) + j(bc) + "</head>");

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.end(html);
};
