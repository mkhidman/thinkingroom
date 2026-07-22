# QA Fase 2

## Pemeriksaan yang dijalankan

- Parsing TypeScript seluruh file `src/` menggunakan compiler TypeScript lokal dan declaration stubs.
- Validasi `package.json`, `package-lock.json`, dan `vercel.json` sebagai JSON.
- `npm run verify:local` berhasil.
- Seluruh field `resolved` dalam package-lock mengarah ke `https://registry.npmjs.org/`.
- Pencarian source tidak menemukan URL registry dependency non-publik.
- `.env.local`, `node_modules`, dan `dist` tidak disertakan dalam paket.
- Environment variable Supabase hanya tersedia melalui `.env.example` placeholder.
- Schema memuat `app_state`, RLS policy, grant authenticated, dan trigger pemilik data.
- Cache localStorage dipisahkan berdasarkan `session.user.id`.
- Session mempunyai refresh timer dan local logout tetap berjalan ketika network gagal.

## Pemeriksaan yang belum dapat dijalankan di environment pembuatan

- Fresh `npm install` dari internet, karena koneksi keluar ke registry publik dibatasi pada environment ini.
- Build Vite production memakai dependency asli setelah fresh install.
- Login terhadap project Supabase nyata, karena URL/key project pengguna belum tersedia.
- Pengujian install PWA pada Android/iOS fisik.

Jalankan setelah ekstraksi:

```bash
npm run verify:local
npm install --registry=https://registry.npmjs.org/
npm run build
```
