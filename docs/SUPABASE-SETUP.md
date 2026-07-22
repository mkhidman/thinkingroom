# Setup Supabase untuk Ruang 0.4.0

## 1. Buat project

Buat project baru di Supabase Dashboard. Simpan database password di password manager; password tersebut tidak dibutuhkan oleh frontend.

## 2. Buat database dan RLS

Buka **SQL Editor**, buat query baru, lalu salin seluruh isi:

```text
supabase/schema.sql
```

Jalankan query sampai selesai tanpa error.

Tabel yang langsung digunakan client:

```text
public.app_state
public.app_state_backups
```

Function yang wajib tersedia:

```text
public.save_app_state_v2(jsonb, bigint, text)
```

`app_state` menyimpan snapshot aktif beserta nomor revision. `app_state_backups` menyimpan versi pemulihan. RLS membatasi keduanya berdasarkan `auth.uid()`.

## 3. Upgrade dari schema Fase 2

Jika project Supabase sudah pernah menjalankan schema Fase 2, jalankan file berikut melalui SQL Editor:

```text
supabase/migrations/phase-3-revision-backups.sql
```

Migration tersebut:

- menambah kolom `revision`;
- membuat `app_state_backups`;
- menambahkan RLS dan grant;
- membuat RPC `save_app_state_v2`.

Tanpa migration ini, aplikasi dapat login dan membaca data, tetapi upload akan gagal karena RPC tidak ditemukan.

## 4. Atur Auth

Buka **Authentication → Providers → Email** dan pastikan Email provider aktif.

Untuk pengembangan lokal, set:

```text
Site URL: http://localhost:5173
```

Tambahkan URL deployment ke Redirect URLs ketika aplikasi sudah online.

Supabase dapat dikonfigurasi untuk mewajibkan email confirmation. UI Ruang menangani kondisi akun dibuat tetapi belum memiliki sesi sampai link konfirmasi dibuka.

## 5. Ambil Project URL dan key

Ambil:

- Project URL
- Publishable Key atau Anon Key

Jangan gunakan Secret Key atau `service_role` pada frontend.

## 6. Buat environment lokal

Salin:

```text
.env.example → .env.local
```

Isi:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

`.env.local` sudah masuk `.gitignore`.

## 7. Jalankan

```bash
npm run verify:local
npm install --registry=https://registry.npmjs.org/
npm run dev
```

Buka URL Vite dan login. Saat online, aplikasi menunggu data Supabase sebelum menampilkan halaman utama. Jika akun belum memiliki row `app_state`, pilih sumber data pertama.

## 8. Uji revision conflict

1. Login dengan akun yang sama pada dua browser/perangkat.
2. Matikan koneksi perangkat A.
3. Ubah data pada perangkat A.
4. Ubah dan sinkronkan data pada perangkat B.
5. Aktifkan koneksi perangkat A.

Perangkat A seharusnya menampilkan dialog konflik, bukan menimpa data perangkat B.

## 9. Deployment Vercel

Tambahkan environment variable berikut pada Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Deploy ulang. Pada Supabase Auth, gunakan domain production sebagai Site URL dan masukkan localhost sebagai redirect tambahan bila masih diperlukan.

## 10. Troubleshooting

### Error `Could not find the function public.save_app_state_v2`

Jalankan migration Fase 3 atau jalankan ulang `supabase/schema.sql`. Setelah itu tunggu beberapa detik agar schema cache PostgREST diperbarui.

### Login berhasil tetapi data gagal dimuat

Pastikan tabel `app_state`, policy `app_state_owner_access`, dan grant authenticated tersedia.

### Backup cloud tidak muncul

Backup dibuat ketika snapshot lama sudah ada. Sinkronisasi pertama membuat state awal; perubahan berikutnya membuat backup otomatis maksimal sekali per 24 jam.

### Error permission denied pada backup

Pastikan policy `app_state_backups_owner_access` dan grant `select, insert, delete` untuk role `authenticated` sudah dijalankan.

### Data yang tampil masih terlihat seperti data perangkat lama

1. Pastikan sidebar menampilkan **Supabase utama**, bukan **Offline · memakai cache**.
2. Pastikan row pengguna tersedia di `public.app_state`.
3. Restart `npm run dev` setelah mengubah `.env.local`.
4. Lakukan hard refresh dan hapus service worker lama bila bundle PWA sebelumnya masih tersimpan.

Cache lokal hanya digunakan ketika browser benar-benar offline. Pada akun cloud kosong, pilih **Pindahkan data perangkat ini** hanya bila memang ingin mengunggah data lama.

### npm install memakai registry yang salah

```bash
npm run verify:local
npm install --registry=https://registry.npmjs.org/
```

## Fase 5A — Google Calendar

Core Supabase `app_state` tetap sama. Integrasi Google Calendar membutuhkan migration, Google Cloud OAuth, dan Supabase Edge Functions tambahan.

Jalankan:

```text
supabase/migrations/phase-5-google-calendar-readonly.sql
```

Kemudian ikuti seluruh langkah di:

```text
docs/GOOGLE-CALENDAR-SETUP.md
```

Google Client Secret dan token encryption key harus disimpan sebagai **Supabase Edge Function Secrets**, bukan `.env.local` frontend atau Vercel environment variable dengan prefix `VITE_`.
