# Setup Google Calendar — Ruang Fase 5A

Integrasi ini bersifat **read-only**. Ruang membaca daftar kalender dan event yang dipilih, tetapi tidak mempunyai izin membuat, mengubah, atau menghapus event Google.

## Arsitektur

```text
Browser/PWA Ruang
  → Supabase Edge Function (OAuth dan sync)
  → Google Calendar API
  → cache kalender/event di Supabase
  → Browser membaca cache dengan RLS
```

Refresh token Google tidak pernah dikirim ke browser. Token disimpan terenkripsi oleh Edge Function menggunakan AES-256-GCM.

## 1. Jalankan migration

Project yang sudah memakai Fase 4 perlu menjalankan:

```text
supabase/migrations/phase-5-google-calendar-readonly.sql
```

Jalankan melalui **Supabase Dashboard → SQL Editor**.

Project Supabase baru dapat menjalankan seluruh:

```text
supabase/schema.sql
```

Migration membuat:

- `google_calendar_connections`
- `google_calendar_oauth_states`
- `google_calendars`
- `google_calendar_events`
- RLS read-only untuk metadata kalender/event

Tabel token tidak diberikan akses kepada role `authenticated` atau `anon`.

## 2. Siapkan Google Cloud

1. Buka Google Cloud Console dan buat/pilih project.
2. Aktifkan **Google Calendar API**.
3. Buka **Google Auth Platform / OAuth consent screen**.
4. Isi nama aplikasi, email dukungan, dan domain aplikasi.
5. Selama testing, gunakan status **Testing** dan tambahkan akun Google milikmu sebagai test user.
6. Tambahkan scope:
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
7. Buat **OAuth Client ID → Web application**.

### Authorized redirect URI

Gunakan URL callback Edge Function berikut secara persis:

```text
https://PROJECT_REF.supabase.co/functions/v1/google-calendar-callback
```

Ganti `PROJECT_REF` dengan project reference Supabase.

## 3. Buat encryption key

Jalankan di terminal:

```bash
openssl rand -base64 32
```

Simpan hasilnya. Jangan memasukkannya ke source code, `.env.local`, atau Vercel frontend environment variables.

Pada Windows tanpa OpenSSL, key base64 32-byte dapat dibuat melalui PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

## 4. Tambahkan Supabase Edge Function Secrets

Melalui Supabase Dashboard, buka **Edge Functions → Secrets**, lalu tambahkan:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI=https://PROJECT_REF.supabase.co/functions/v1/google-calendar-callback
GOOGLE_TOKEN_ENCRYPTION_KEY=BASE64_32_BYTE_KEY
APP_URL=https://DOMAIN_DEPLOYMENT_KAMU
APP_ALLOWED_ORIGINS=https://DOMAIN_DEPLOYMENT_KAMU,http://localhost:5173
```

Untuk lebih dari satu deployment, pisahkan origin dengan koma. Jangan menambahkan path pada `APP_ALLOWED_ORIGINS`; gunakan origin saja.

Contoh:

```env
APP_URL=https://ruang-khidir.vercel.app
APP_ALLOWED_ORIGINS=https://ruang-khidir.vercel.app,http://localhost:5173
```

Alternatif CLI:

```bash
npx supabase secrets set --env-file supabase/.env.google --project-ref PROJECT_REF
```

File secret lokal harus masuk `.gitignore` dan tidak ikut ZIP/deployment.

## 5. Deploy Edge Functions

Login dan link project:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
```

Deploy:

```bash
npx supabase functions deploy google-calendar-connect
npx supabase functions deploy google-calendar-callback --no-verify-jwt
npx supabase functions deploy google-calendar-sync
```

`supabase/config.toml` di source juga menandai callback sebagai `verify_jwt = false`, karena callback dipanggil langsung oleh server Google. State OAuth sekali pakai tetap diverifikasi di database.

## 6. Frontend

Frontend tetap hanya membutuhkan:

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Tidak ada Google Client Secret di Vercel atau browser.

Setelah source Fase 5 dideploy ulang:

1. Login ke Ruang.
2. Buka **Jadwal**.
3. Tekan **Hubungkan Google Calendar**.
4. Berikan izin read-only.
5. Setelah kembali ke Ruang, sinkronisasi pertama berjalan otomatis.
6. Pilih kalender tambahan dari panel Kalender.

## Sinkronisasi

- Kalender utama aktif secara default.
- Kalender lain tersedia tetapi tidak langsung disinkronkan sampai diaktifkan.
- Initial sync mengambil 30 hari ke belakang dan 365 hari ke depan.
- Sync berikutnya memakai `nextSyncToken` untuk menarik perubahan saja.
- Respons Google `410 Gone` menghapus sync token kalender terkait dan menjalankan full sync ulang.
- Cache event dapat dibaca saat perangkat offline setelah pernah berhasil dimuat.
- Sinkronisasi manual tersedia di halaman Jadwal.

## Batas Fase 5A

Belum tersedia:

- Membuat/edit/hapus event dari Ruang.
- Mengubah tugas menjadi time block.
- Webhook/push notification Google.
- Background scheduled sync saat aplikasi tidak dibuka.
- Edit recurring event.

Google Calendar tetap menjadi sumber kebenaran untuk event.

## Troubleshooting

### `redirect_uri_mismatch`

Pastikan URI di Google Cloud sama persis dengan `GOOGLE_OAUTH_REDIRECT_URI`, termasuk protocol, project reference, dan path.

### Kembali ke aplikasi tetapi sinkronisasi gagal

Periksa:

- Migration Fase 5 sudah dijalankan.
- Ketiga Edge Function sudah dideploy.
- Seluruh secret sudah tersedia.
- Domain deployment tercantum di `APP_ALLOWED_ORIGINS`.
- Google Calendar API sudah Enabled.

Buka **Supabase → Edge Functions → Logs** untuk melihat error fungsi terkait.

### `Akses Google Calendar perlu dihubungkan ulang`

Refresh token kemungkinan dicabut atau kedaluwarsa. Putuskan koneksi dari halaman Jadwal, lalu hubungkan kembali.
