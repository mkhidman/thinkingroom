# QA Fase 3.1 — Supabase-first

## Perubahan yang diverifikasi

- Saat `.env.local` valid dan session tersedia, initial `AppData` tidak dibaca dari localStorage.
- UI tetap pada status `loading` sampai `fetchCloudState()` selesai.
- Row `public.app_state` selalu diterapkan ketika startup online.
- Cache dirty lama tidak mengalahkan cloud; cache diamankan ke backup lokal.
- Cache hanya menjadi fallback ketika `navigator.onLine === false`.
- Error online tidak diam-diam menampilkan localStorage sebagai sumber data.
- `syncNow()` dapat mencoba ulang initial fetch ketika cloud belum siap.
- Login dengan akun berbeda tidak menampilkan data akun sebelumnya selama cloud dimuat.
- Akun cloud kosong tetap menawarkan migrasi data perangkat atau akun kosong.

## Local-ready

- `package-lock.json` dan `.npmrc` hanya mengarah ke registry publik npm.
- `.env.local`, `node_modules`, `dist`, dan artefak build tidak disertakan dalam ZIP.
- Service worker dan Cache Storage lama dibersihkan otomatis pada mode development.
- Tidak ada migration SQL baru untuk 0.3.1.

## Pengujian manual yang disarankan

1. Isi Supabase dengan data yang berbeda dari localStorage.
2. Login saat online; data Supabase harus tampil.
3. Ubah localStorage manual lalu reload saat online; data Supabase tetap menang.
4. Matikan internet lalu reload; cache terakhir boleh tampil dengan status offline.
5. Nyalakan internet dan tekan sinkronisasi; aplikasi kembali mengecek Supabase.
6. Setelah upgrade PWA, lakukan hard refresh atau unregister service worker lama sekali.
