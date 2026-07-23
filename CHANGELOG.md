## 0.6.0 — Reliability, calendar, dan flow hardening

- Menambahkan antrean cloud sync yang aman terhadap edit ketika request sedang berjalan.
- Mempertahankan perubahan offline dan menampilkan konflik jika cloud ikut berubah.
- Memperbaiki lifecycle recurring task, termasuk undo completion dan perubahan status dari modal.
- Menambahkan task tanpa jadwal, subtask editor, detail tagihan, serta pembayaran ke transaksi.
- Menambahkan validasi backup/nested data, batas ukuran import, dan penanganan storage quota.
- Menambahkan navigasi Calendar, event multi-hari, pagination event, serta sync backend bertahap.
- Menghitung waktu salat dari lokasi dan metode yang dapat dikonfigurasi.
- Menambahkan habit backfill/input angka, histori Finance/Review, dan deep-link hasil pencarian.
- Menambahkan password recovery, error boundary, accessibility modal, security headers, dan PWA update prompt.
- Menambahkan Vitest untuk recurrence, task lifecycle, AppData, waktu salat, dan task tracking.

## 0.5.3 — Samsung-inspired Typography

- Mengganti stack font utama dari Inter ke stack Samsung-inspired.
- Memprioritaskan SamsungOne pada perangkat yang sudah memilikinya.
- Memprioritaskan Samsung Sharp Sans untuk heading apabila tersedia.
- Menambahkan fallback system font yang aman tanpa membundel font proprietary Samsung.
- Menormalkan ketebalan teks UI ke 400/700 agar tampilan lebih bersih dan dekat dengan karakter Samsung.
- Menyesuaikan letter spacing heading, tombol, metrik, dan label.
- Tidak menambahkan dependency npm, CDN font, atau file font berlisensi.

# Changelog

## 0.5.2 — Tugas tertunda tidak lagi menghilang

- Menambahkan kategori **Tertunda** untuk tugas yang jadwal pengerjaannya sudah lewat tetapi deadline belum terlewati.
- Filter **Hari ini** sekarang juga menampilkan tugas tertunda dan tugas yang melewati deadline agar tetap terlihat pada tampilan default.
- Menambahkan kategori **Tanpa jadwal** untuk tugas aktif yang tidak memiliki jadwal maupun deadline.
- Menambahkan tindakan cepat **Jadwalkan hari ini** dan **Pilih tanggal baru** pada tugas tertunda.
- Halaman Hari Ini memprioritaskan deadline terlewat, lalu jadwal terlewat, kemudian prioritas tugas.
- Label waktu membedakan **Jadwal terlewat** dari **Terlambat**; terlambat tetap hanya ditentukan oleh deadline.
- Reminder lama yang sudah lewat dibersihkan ketika tugas dijadwalkan ulang ke hari ini.
- Tidak ada migration Supabase atau perubahan Google Calendar pada versi ini.

## 0.5.1 — Proyek opsional secara default

- Form tugas baru sekarang selalu dimulai dengan **Tanpa proyek**.
- Form catatan baru sekarang selalu dimulai dengan **Tanpa proyek**.
- Quick Capture untuk tugas dan catatan tidak lagi memilih proyek aktif secara otomatis.
- Proyek tetap dapat dipilih secara manual dan relasi proyek pada item yang sedang diedit tetap dipertahankan.
- Jika proyek yang dipilih sudah tidak valid, nilai dikembalikan ke **Tanpa proyek** tanpa memilih proyek lain.

## 0.5.0 — Google Calendar Read-only

- Menambahkan halaman Jadwal pada navigasi utama dan command palette.
- Menampilkan agenda Google Calendar pada Hari Ini.
- OAuth Google diproses melalui Supabase Edge Functions, bukan browser.
- Memakai scope granular `calendar.calendarlist.readonly` dan `calendar.events.readonly`.
- Refresh token dienkripsi AES-256-GCM dan tidak dapat dibaca role frontend.
- Menambahkan pemilihan kalender, warna sumber, agenda Hari Ini/Minggu/30 hari, lokasi, link event, dan link meeting.
- Menambahkan incremental synchronization untuk CalendarList dan Events.
- Menangani Google HTTP 410 dengan full resync aman.
- Menambahkan cache agenda per pengguna untuk tampilan offline.
- Menambahkan migration, RLS, Edge Function config, dan panduan setup Google Cloud/Supabase.
- Tidak menambahkan dependency npm baru.

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
