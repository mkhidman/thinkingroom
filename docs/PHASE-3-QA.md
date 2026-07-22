# QA Fase 3 — Safe Sync & Backup

## Pemeriksaan yang berhasil

- Parsing/type-check seluruh file `src/**/*.ts(x)` menggunakan compiler TypeScript lokal dan declaration stubs.
- `npm run verify:local` berhasil pada Node 22.16.0.
- `package.json`, `package-lock.json`, dan `vercel.json` valid sebagai JSON.
- Pemeriksaan historis Fase 3 menggunakan versi `0.3.0`; package aktif sekarang `0.3.1`.
- 422 field `resolved` pada package-lock seluruhnya mengarah ke `https://registry.npmjs.org/`.
- Tidak ditemukan referensi registry OpenAI, Artifactory, atau `packages.hub`.
- `.npmrc` mengatur registry publik npm, `fund=false`, dan `audit=false`.
- `node_modules`, `dist`, `.env.local`, dan secret Supabase tidak disertakan dalam paket.
- Client memakai RPC `save_app_state_v2` dengan expected revision; direct write `app_state` dicabut pada migration.
- Schema mempunyai validasi struktur dasar AppData, conflict response, backup cloud, pruning maksimal 20, RLS, dan execute grant terbatas.
- Import JSON memvalidasi envelope/struktur dan menolak schema version yang lebih baru.
- Backup lokal mempunyai quota fallback dan maksimum 10 snapshot.
- Layout Data & Backup dan dialog konflik mempunyai breakpoint mobile.

## Skenario logika yang ditangani

1. **Save normal:** expected revision sama → cloud revision bertambah.
2. **Konflik dua perangkat:** expected revision berbeda → server mengembalikan snapshot cloud tanpa update.
3. **Pilih cloud:** versi perangkat dibackup lokal lalu cloud diterapkan.
4. **Pilih perangkat:** versi cloud dibackup server lalu overwrite memakai revision terbaru.
5. **Offline edit:** `dirty` dan revision dasar disimpan per akun sehingga dapat diperiksa setelah reload.
6. **Import/reset/restore:** versi aktif dibuatkan snapshot sebelum diganti.
7. **Cloud backup:** maksimal satu backup otomatis per 24 jam; alasan eksplisit selalu membuat backup.

## Pemeriksaan yang belum dapat diselesaikan di environment pembuatan

- Fresh `npm ci` dan Vite production build menggunakan dependency asli. Akses DNS ke `registry.npmjs.org` gagal dengan `EAI_AGAIN`; kegagalan bukan karena URL registry package-lock.
- Eksekusi SQL pada project Supabase nyata karena credential/project pengguna tidak tersedia.
- Simulasi konflik pada dua perangkat fisik.
- Pengujian install PWA pada Android/iOS fisik.

## Pemeriksaan setelah ekstraksi

```bash
npm run verify:local
npm install --registry=https://registry.npmjs.org/
npm run build
```

Untuk project Supabase Fase 2, jalankan:

```text
supabase/migrations/phase-3-revision-backups.sql
```
