# Phase 5A QA — Google Calendar Read-only

## Scope yang diperiksa

- PageId dan navigasi Jadwal.
- Halaman koneksi, daftar kalender, agenda mobile/desktop.
- Agenda Google Calendar pada Hari Ini.
- Search event melalui command palette.
- OAuth server-side melalui Supabase Edge Functions.
- State OAuth sekali pakai dan kedaluwarsa.
- Refresh token terenkripsi AES-256-GCM.
- Scope read-only granular.
- Incremental sync CalendarList dan Events.
- Reset full sync saat Google mengembalikan HTTP 410.
- RLS read-only kalender/event.
- Cache browser untuk agenda offline.
- Registry npm publik.

## Pemeriksaan yang berhasil

- `npm run verify:local` berhasil.
- 422 URL `resolved` pada package-lock tetap mengarah ke `https://registry.npmjs.org/`.
- Tidak ada Google Client Secret, refresh token, `.env.local`, atau encryption key di source.
- Type-check source frontend menggunakan QA declarations berhasil.
- Type-check seluruh Supabase Edge Functions menggunakan Deno QA declarations berhasil.
- JSON package dan TypeScript config valid.
- Migration, schema penuh, dan `supabase/config.toml` tersedia.

## Pemeriksaan yang membutuhkan environment pengguna

- OAuth consent nyata dengan Google Cloud Client ID milik pengguna.
- Deploy dan invocation Edge Function di project Supabase nyata.
- Sinkronisasi event nyata dan perilaku recurring calendar milik pengguna.
- Installability PWA setelah deployment Fase 5.
- Production build fresh setelah dependency terunduh penuh.

Environment pembuatan tidak dapat menyelesaikan fresh npm install karena registry publik diproksi oleh jaringan internal environment. Source package tetap memakai registry publik dan tidak membawa `node_modules`.
