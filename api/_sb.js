// Pembantu Supabase untuk fungsi server (hanya baca data publik lewat kunci anon, yang memang publik).
const SB_URL = "https://ttpkztaxfpjhkwtnbpec.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0cGt6dGF4ZnBqaGt3dG5icGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDExOTUsImV4cCI6MjEwMjk3NzE5NX0.yfeSSewI_CDw64WxYU4qUVeEbVLsHXVqpDpeCGDT5PI";
const SITE = "https://pesantrenalazzaam.org";
async function sbGet(path) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: { apikey: SB_ANON, Authorization: "Bearer " + SB_ANON } });
  if (!r.ok) throw new Error("Supabase " + r.status);
  return r.json();
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
module.exports = { SB_URL, SITE, sbGet, esc };
