// Vercel Serverless Function: ดึงข้อมูลจาก Supabase แล้วส่งให้หน้าเว็บ
// ตั้งค่าใน Vercel > Settings > Environment Variables:
//   SUPABASE_URL  = Project URL
//   SUPABASE_KEY  = publishable key (หรือ anon key ของโปรเจกต์รุ่นเก่า)

const PAGE = 1000; // Supabase ส่งได้ครั้งละ 1,000 แถว จึงต้องดึงเป็นหน้าๆ
const COLUMNS = 'institution,faculty,major,max_68,max_69,min_68,min_69';

// โหมดตรวจสอบ: เปิด /api/data?debug=1 จะเห็นสาเหตุที่โหลดไม่สำเร็จ
// (แสดงเฉพาะชื่อโฮสต์และชนิดของ key ไม่เคยแสดงตัว key)
function describe(url, key) {
  let host = null;
  try { host = new URL(url).host; } catch (e) { host = 'URL ไม่ถูกต้อง'; }
  const keyType = !key ? 'ไม่มี'
    : key.startsWith('sb_publishable_') ? 'publishable'
    : key.startsWith('sb_secret_') ? 'secret (ห้ามใช้!)'
    : key.startsWith('eyJ') ? 'jwt (anon หรือ service_role)'
    : 'ไม่รู้จัก';
  return { host, keyType, keyLength: key ? key.length : 0, hasSpace: /\s/.test(String(url) + String(key)) };
}

module.exports = async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const debug = /(^|[?&])debug=1(&|$)/.test(String(req.url || ''));
  const fail = (code, error, detail) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = { error };
    if (debug) body.debug = Object.assign({ detail }, describe(url, key));
    res.status(code).json(body);
  };

  if (!url || !key) {
    fail(500, 'missing_env', { missing: [!url && 'SUPABASE_URL', !key && 'SUPABASE_KEY'].filter(Boolean) });
    return;
  }

  const headers = { apikey: key };
  // anon key รุ่นเก่าเป็น JWT (ขึ้นต้น eyJ) ต้องส่งเป็น Bearer ด้วย; publishable key ใช้ apikey อย่างเดียว
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  const base = url.trim().replace(/\/+$/, '');

  const all = [];
  try {
    for (let offset = 0; ; offset += PAGE) {
      const r = await fetch(
        `${base}/rest/v1/program_comparison?select=${COLUMNS}&order=id.asc&limit=${PAGE}&offset=${offset}`,
        { headers }
      );
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        const err = new Error('supabase_status_' + r.status);
        err.supabase = { status: r.status, body: text.slice(0, 300) };
        throw err;
      }
      const batch = await r.json();
      all.push(...batch);
      if (batch.length < PAGE) break;
    }
  } catch (e) {
    fail(502, 'load_failed', e.supabase || { message: String(e.message), cause: e.cause && (e.cause.code || String(e.cause.message)) });
    return;
  }

  const num = (v) => (v == null ? null : Number(v));
  const unis = [...new Set(all.map((r) => r.institution))].sort((a, b) => a.localeCompare(b, 'th'));
  const idx = new Map(unis.map((u, i) => [u, i]));
  const rows = all.map((r) => [
    idx.get(r.institution),
    r.faculty,
    r.major || '',
    [num(r.max_68), num(r.max_69), num(r.min_68), num(r.min_69)],
  ]);

  // ให้ CDN ของ Vercel จำผลไว้ 1 ชั่วโมง (ลดการยิงเข้า Supabase)
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({ unis, rows });
};
