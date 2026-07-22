# Arsitektur Ruang 0.4.0

## 1. Prinsip produk

```text
Tangkap → Tata → Kerjakan → Catat hasil → Review
```

Hari Ini menampilkan tindakan yang relevan. Tugas, habit, ibadah, dan keuangan tidak digabung menjadi satu skor kehidupan.

## 2. Navigasi

1. Hari Ini
2. Tugas & Proyek
3. Rutinitas
4. Catatan
5. Keuangan
6. Review

Universal Inbox diwujudkan sebagai Tangkap Cepat global. Backup dan pengaturan reminder menjadi utilitas global, bukan menu kerja utama.

## 3. Supabase-first

Saat online dan pengguna sudah login, `public.app_state` menjadi sumber kebenaran startup.

```text
Startup online
  Supabase app_state
    → AppStore
    → cache localStorage per user

Startup offline
  cache localStorage per user
    → AppStore
    → status offline
```

Perubahan selama sesi memakai optimistic UI, disimpan ke cache sebagai antrean, lalu dikirim ke Supabase melalui revision control.

## 4. Empty-state, bukan seed

Aplikasi tidak memiliki seed data produksi. `src/data/empty.ts` mengembalikan seluruh domain sebagai array kosong.

```text
projects: []
tasks: []
habits: []
prayers: []
notes: []
accounts: []
transactions: []
budgets: []
reviews: []
```

Data contoh versi lama yang sudah berada di cloud tidak dihapus otomatis karena aplikasi tidak dapat membedakan dummy dengan data pengguna yang sengaja memakai nama serupa. Pengguna menghapusnya melalui aksi eksplisit **Hapus seluruh data**, setelah backup dibuat.

## 5. Model waktu tugas

Tugas mempunyai tiga waktu berbeda:

```text
dueAt       = jadwal mulai/pengerjaan
deadlineAt  = batas akhir penyelesaian
reminderAt  = reminder eksplisit opsional
```

Keputusan ini mencegah satu field tanggal dipakai untuk dua makna. Status terlambat hanya dihitung dari `deadlineAt`.

Jika tugas berulang mempunyai jadwal dan deadline, recurrence engine mempertahankan selisih waktunya pada occurrence berikutnya. Reminder eksplisit tidak diwariskan otomatis agar notifikasi lama tidak salah diterapkan pada kejadian baru.

## 6. Recurrence

Recurring task menghasilkan occurrence baru ketika task selesai. Habit menyimpan log per tanggal.

Mode:

- `fixed_schedule`: mengikuti pola asli dan melompati occurrence masa lalu;
- `after_completion`: dihitung dari waktu selesai aktual;
- tanggal 29–31 mendukung `last_day` atau `skip_month`.

## 7. Reminder lokal

Reminder scheduler berjalan di client:

```text
App aktif
→ periksa reminder setiap 30 detik
→ deduplikasi reminder yang sudah dikirim
→ tampilkan melalui ServiceWorkerRegistration.showNotification
→ fallback ke Notification API
```

Jenis reminder:

- jadwal tugas dengan lead time global;
- deadline dengan lead time global;
- reminder eksplisit tugas;
- habit berdasarkan hari aktif dan waktu reminder.

Pengaturan dan daftar reminder terkirim disimpan per perangkat di localStorage. Reminder belum memakai server push, sehingga aplikasi/PWA perlu tetap aktif atau dibuka kembali agar scheduler client berjalan.

## 8. CRUD dan integritas data

CRUD tersedia untuk proyek, tugas, habit, catatan, rekening, transaksi, dan anggaran.

Aturan penting:

- menghapus proyek melepaskan relasi tugas/catatan menjadi Tanpa proyek;
- menghapus habit juga menghapus log habit tersebut;
- rekening yang direferensikan transaksi tidak dapat dihapus;
- penghapusan data besar tetap dapat dipulihkan melalui backup jika snapshot tersedia.

## 9. Revision control dan konflik

Setiap row `app_state` mempunyai `revision bigint`. Client menyimpan melalui RPC `save_app_state_v2(data, expected_revision, backup_reason)`.

- Revision sama: update diterima dan revision bertambah.
- Revision berbeda: server mengembalikan konflik tanpa overwrite.
- Pengguna memilih versi cloud atau perangkat.
- Backup dibuat sebelum overwrite penting.

Konflik masih berada pada level seluruh snapshot JSONB.

## 10. Keuangan

Saldo dihitung dari ledger:

```text
saldo awal
+ pemasukan
- pengeluaran
- transfer keluar
+ transfer masuk
```

Transfer tidak dihitung sebagai pemasukan/pengeluaran. Tagihan menggunakan task dengan label `tagihan`, sehingga dapat memiliki jadwal, deadline, recurrence, dan reminder yang sama dengan domain tugas.

## 11. Security boundary

- Auth memakai Supabase email/password.
- Frontend hanya memakai Publishable/Anon Key.
- RLS membatasi row berdasarkan `auth.uid()`.
- RPC revision control memakai user dari session, bukan input client.
- Secret/service-role key tidak boleh berada pada variabel `VITE_*`.

## 12. Arah berikutnya

1. Web Push/server scheduler agar reminder dapat terkirim saat PWA benar-benar ditutup.
2. Jadwal sholat otomatis berdasarkan lokasi dan metode perhitungan.
3. Audit log ringan untuk transaksi dan penghapusan sensitif.
4. Migrasi per-domain dari snapshot JSONB jika payload membesar atau kolaborasi dibutuhkan.
5. Attachment dan integrasi kalender.
