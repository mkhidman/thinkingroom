# Changelog

## 0.4.0 — Deadline, CRUD, dan Reminder Lokal

- Menghapus `src/data/seed.ts` dan seluruh fallback data contoh.
- Aplikasi baru serta reset data menggunakan struktur kosong dari `src/data/empty.ts`.
- Tombol reset di Review diubah menjadi **Hapus seluruh data** dan tetap membuat backup pengaman.
- Menambahkan deadline tugas yang terpisah dari jadwal pengerjaan.
- Menambahkan reminder eksplisit per tugas.
- Filter dan metrik terlambat dihitung berdasarkan deadline.
- Recurring task mempertahankan offset antara jadwal dan deadline.
- Menambahkan edit/hapus tugas, habit, catatan, rekening, transaksi, dan anggaran.
- Rekening yang masih direferensikan transaksi tidak dapat dihapus.
- Menambahkan reminder browser untuk jadwal tugas, deadline, dan habit.
- Menambahkan pengaturan permission dan lead time reminder per perangkat.
- Memperbaiki empty state berbagai halaman untuk kondisi akun kosong.
- Tidak memerlukan migration Supabase baru dari 0.3.1.

## 0.3.1 — Supabase-first Data Loading

- Supabase `app_state` menjadi sumber data utama saat startup online.
- UI menunggu respons cloud sebelum menampilkan data akun.
- localStorage hanya menjadi cache, antrean offline, metadata revision, dan backup.
- Cache dirty lama diamankan sebagai backup sebelum data cloud diterapkan.
- Fallback cache hanya digunakan ketika browser benar-benar offline.
- Tombol sinkronisasi dapat mencoba ulang initial cloud load setelah error.
- Status sidebar memperjelas **Supabase utama** dan **Offline · memakai cache**.
- Service worker/cache lama otomatis dibersihkan saat `npm run dev` agar localhost tidak memakai bundle PWA usang.
- Tidak memerlukan migration database baru dari Fase 3.

## 0.3.0 — Safe Sync & Backup

- Optimistic revision control pada snapshot cloud.
- Server menolak overwrite ketika revision perangkat sudah tertinggal.
- Dialog conflict resolution untuk memilih versi cloud atau perangkat.
- Download kedua versi saat konflik.
- Backup lokal otomatis dan manual, maksimal 10 snapshot.
- Backup cloud otomatis maksimal sekali per 24 jam dan sebelum overwrite penting.
- Restore backup lokal dan cloud.
- Export seluruh data ke JSON versioned envelope.
- Import JSON dengan validasi dan preview jumlah data.
- Export transaksi ke CSV UTF-8.
- Backup pengaman sebelum import, reset, restore, dan conflict resolution.
- Menu Data & Backup responsif pada desktop dan mobile.
- Migration SQL Fase 3 untuk project Supabase yang sudah berjalan.

## 0.2.0 — Auth & Cloud Sync

- Login dan registrasi email/password melalui Supabase Auth.
- Session persistence dan refresh otomatis sebelum token kedaluwarsa.
- Penyimpanan cloud per pengguna dengan RLS.
- Sinkronisasi local-first dengan debounce, retry saat online, dan sync manual.
- Pemeriksaan snapshot cloud lebih baru ketika aplikasi kembali aktif.
- Migrasi data browser lama pada login pertama.
- Cache localStorage dipisahkan per user.
- Status sinkronisasi dan logout pada sidebar.
- Tampilan auth responsif untuk mobile.
- Setup Supabase, `.env.example`, dan schema SQL siap pakai.
- Script `npm run verify:local` untuk mencegah registry internal masuk ke package-lock.
- Manifest PWA diperkuat dengan scope, app id, maskable icons, dan Apple touch icon.

## 0.1.0 — Development MVP

- Enam area utama: Hari Ini, Tugas, Rutinitas, Catatan, Keuangan, dan Review.
- Recurrence engine custom.
- Project CRUD.
- Penyimpanan localStorage dan PWA dasar.
