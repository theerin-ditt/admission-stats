# สถิติคะแนน Admission รอบ 3 (ปี 2568–2569)

เว็บค้นหาและเปรียบเทียบคะแนนสูงสุด–ต่ำสุดของแต่ละคณะ/สาขา ย้อนหลัง 2 ปี

## โครงสร้างไฟล์
- `index.html`, `style.css`, `app.js` — หน้าเว็บ (ไม่ต้อง build)
- `api/data.js` — Vercel Serverless Function ดึงข้อมูลจากตาราง `program_comparison` ใน Supabase
- `.env.example` — ตัวอย่างชื่อตัวแปรที่ต้องตั้งค่า

## ตั้งค่าบน Vercel (Settings → Environment Variables)
| ชื่อ | ค่า |
|---|---|
| `SUPABASE_URL` | Project URL จาก Supabase (Project Settings → API) |
| `SUPABASE_KEY` | publishable key (หรือ anon key ของโปรเจกต์รุ่นเก่า) |

ห้ามใช้ secret key / service_role key / database password

## หมายเหตุ
- ผลจาก API ถูก cache ที่ CDN ของ Vercel 1 ชั่วโมง ถ้าแก้ข้อมูลใน Supabase แล้วหน้าเว็บยังเป็นข้อมูลเก่า ให้รอสักครู่
- คะแนนย้อนหลังเป็นข้อมูลอ้างอิง ไม่ใช่การรับประกันผลการสอบในปีถัดไป
