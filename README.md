# Ruang — Personal Life OS

Ruang adalah web app/PWA pribadi untuk menghimpun tugas, proyek, habit, tracker sholat, catatan, review mingguan, dan keuangan dalam satu alur.

Versi saat ini: **0.4.0 — Deadline, CRUD, dan Reminder Lokal**.

## Yang sudah tersedia

- Tampilan responsif desktop dan mobile.
- PWA dengan offline application shell dasar.
- Hari Ini sebagai pusat tindakan.
- Tugas dengan jadwal pengerjaan, deadline terpisah, prioritas, estimasi, label, status, dan recurring custom.
- Tracking tugas terlambat berdasarkan deadline, bukan tanggal jadwal.
- Pengelolaan proyek: tambah, edit, status, warna, deskripsi, dan hapus aman.
- Habit ya/tidak, jumlah, durasi, target mingguan, hari aktif, reminder, jeda, edit, dan hapus.
- Tracker sholat yang terpisah dari produktivitas.
- Catatan biasa, decision log, dan idea vault dengan tambah, edit, dan hapus.
- Rekening, pemasukan, pengeluaran, transfer, anggaran, tagihan berulang, serta CRUD.
- Reminder browser untuk jadwal tugas, deadline, dan habit.
- Review mingguan.
- Login dan registrasi email/password melalui Supabase Auth.
- Supabase sebagai sumber data utama ketika online dan pengguna sudah login.
- Revision control, conflict handling, backup lokal/cloud, export/import JSON, dan export transaksi CSV.
- Row Level Security pada database.
- Tidak ada data contoh/dummy yang otomatis dibuat oleh source code.

## Menjalankan secara lokal

Persyaratan:

- Node.js 20.19+ atau 22.12+.
- npm 10+.

Project memaksa registry publik npm melalui `.npmrc` dan launcher lokal.

```bash
npm run verify:local
npm install --registry=https://registry.npmjs.org/
npm run dev
```

Di Windows dapat langsung menjalankan:

```text
START-RUANG.bat
```

Di macOS/Linux:

```bash
chmod +x START-RUANG.sh
./START-RUANG.sh
```

`verify:local` akan gagal apabila `package-lock.json` mengandung URL registry dependency selain `https://registry.npmjs.org/`.

## Mengaktifkan Supabase

1. Buat project Supabase.
2. Untuk project baru, jalankan seluruh `supabase/schema.sql` melalui SQL Editor.
3. Untuk project yang sudah memakai Fase 3, pastikan `supabase/migrations/phase-3-revision-backups.sql` pernah dijalankan.
4. Salin `.env.example` menjadi `.env.local`.
5. Isi Project URL dan Publishable Key:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

6. Restart `npm run dev`.

Petunjuk lengkap tersedia di `docs/SUPABASE-SETUP.md`.

> Jangan memasukkan `service_role` atau secret key ke variabel `VITE_*`. Gunakan Publishable/Anon Key yang dilindungi RLS.

## Supabase-first dan cache perangkat

Ketika Supabase aktif dan pengguna sudah login:

```text
Startup online
→ ambil public.app_state dari Supabase
→ terapkan data cloud ke AppStore
→ simpan salinan sebagai cache perangkat
```

`localStorage` hanya dipakai sebagai cache offline, antrean perubahan, metadata revision, dan backup lokal. Saat online, snapshot Supabase tetap menjadi sumber data startup.

## Tidak ada lagi data dummy

`src/data/seed.ts` sudah dihapus. Aplikasi sekarang memakai:

```text
src/data/empty.ts
```

untuk membuat struktur data kosong. Source tidak lagi membuat proyek, tugas, habit, rekening, transaksi, atau catatan contoh.

Jika data dummy dari versi lama sudah pernah tersimpan di Supabase, data itu tetap dianggap sebagai data akun sampai dihapus. Buka **Review → Hapus seluruh data**. Aplikasi membuat backup pengaman, mengosongkan semua domain, lalu menyinkronkan kondisi kosong ke Supabase.

## Jadwal, deadline, dan reminder tugas

Ketiganya mempunyai fungsi berbeda:

- **Jadwal pengerjaan:** kapan tugas direncanakan mulai/dikerjakan.
- **Deadline:** batas akhir penyelesaian.
- **Reminder khusus:** waktu notifikasi eksplisit; jika kosong, aturan global digunakan.

Daftar terlambat hanya memakai deadline. Tugas yang jadwalnya lewat tetapi belum melewati deadline tidak dianggap terlambat.

Pada recurring task, jarak antara jadwal dan deadline dipertahankan. Contoh: jadwal Senin 08.00 dan deadline Senin 17.00 akan tetap memiliki rentang sembilan jam pada occurrence berikutnya.

## Reminder dan notifikasi

Klik ikon lonceng pada topbar untuk:

- meminta izin notifikasi browser;
- mengaktifkan reminder jadwal tugas;
- mengaktifkan reminder deadline;
- mengaktifkan reminder habit;
- mengatur lead time default.

Reminder eksplisit pada tugas mengalahkan lead time jadwal global untuk task tersebut. Pengaturan reminder disimpan per perangkat.

Keterbatasan versi ini: scheduler berjalan ketika aplikasi/PWA masih aktif atau kembali dibuka. Notifikasi terjadwal saat aplikasi benar-benar ditutup memerlukan Web Push dan server scheduler, yang belum diterapkan.

## Data & Backup

Buka **Data & Backup** di sidebar untuk:

- export backup lengkap JSON;
- export transaksi CSV;
- snapshot lokal manual;
- import JSON tervalidasi;
- restore backup lokal/cloud;
- penanganan konflik versi.

Import, reset, restore, dan pemilihan versi konflik selalu membuat backup pengaman terlebih dahulu.

## Build production

```bash
npm run build
npm run preview
```

Untuk deployment Vercel, tambahkan environment variable Supabase yang sama pada Project Settings dan deploy ulang.

## Struktur utama

```text
src/
├── components/          # layout, form CRUD, auth, reminder, backup, conflict
├── data/
│   └── empty.ts         # struktur awal kosong, tanpa seed dummy
├── lib/                 # recurrence, reminder, finance, backup, storage, Supabase
├── pages/               # enam area utama
├── store/               # AuthStore dan AppStore
├── App.tsx
├── main.tsx
└── styles.css
supabase/
├── schema.sql
└── migrations/
    └── phase-3-revision-backups.sql
scripts/
└── verify-local-ready.mjs
```

## Upgrade dari 0.3.1

Tidak ada migration database baru karena data aplikasi masih disimpan sebagai JSONB pada `public.app_state`.

1. Ganti source dengan versi 0.4.0.
2. Salin kembali `.env.local`.
3. Jalankan `npm install` dan `npm run dev`.
4. Gunakan **Hapus seluruh data** sekali jika snapshot Supabase lama masih berisi dummy.

Field `deadlineAt` dan `reminderAt` bersifat opsional, sehingga data lama tetap dapat dibaca.

## Batas fase ini

- Sinkronisasi masih memakai satu snapshot JSONB per pengguna; konflik belum per item.
- Reminder belum memakai server push ketika aplikasi benar-benar ditutup.
- Belum ada reset password di dalam UI.
- Belum ada jadwal sholat otomatis berdasarkan lokasi.
- Belum ada attachment, audit log keuangan, dan kolaborasi keluarga.
- Belum ada import Money Lover atau mutasi bank.

Lihat `docs/ARCHITECTURE.md` dan `docs/PHASE-4-QA.md` untuk keputusan teknis serta hasil pemeriksaan fase ini.
