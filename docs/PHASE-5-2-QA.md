# Phase 5.2 QA — Tugas tertunda tetap terlihat

## Bug yang diperbaiki

Tugas berstatus `todo` dengan jadwal pengerjaan pada hari sebelumnya dan tanpa deadline tidak masuk ke filter mana pun. Data tetap ada di Supabase, tetapi tidak terlihat pada UI sehingga sulit dijadwalkan ulang.

## Perubahan perilaku

- **Hari ini** memuat jadwal hari ini, deadline hari ini, deadline terlewat, dan jadwal pengerjaan yang terlewat.
- **Tertunda** memuat tugas dengan `dueAt` sebelum hari ini selama deadline belum terlewati.
- **Terlambat** tetap hanya memuat tugas dengan `deadlineAt` yang telah terlewati.
- **Tanpa jadwal** memuat tugas aktif tanpa `dueAt` dan `deadlineAt`.
- **Berikutnya** hanya memuat tugas masa depan yang tidak sedang tertunda, terlambat, atau tanpa jadwal.
- Status `waiting` dan `done` tetap berada pada filter masing-masing.

## Tindakan penjadwalan ulang

Tugas tertunda menampilkan:

- **Jadwalkan hari ini** — memindahkan `dueAt` ke waktu saat ini.
- **Pilih tanggal baru** — membuka form edit tugas.

Jika reminder eksplisit sudah berada di masa lalu, reminder tersebut dikosongkan saat menggunakan **Jadwalkan hari ini** agar tidak menyimpan pengingat basi. Deadline tidak diubah otomatis.

## Skenario yang diperiksa

1. Jadwal kemarin tanpa deadline → Tertunda dan Hari ini.
2. Jadwal kemarin dengan deadline besok → Tertunda dan Hari ini.
3. Deadline sudah lewat → Terlambat dan Hari ini, bukan Tertunda.
4. Jadwal hari ini → Hari ini.
5. Jadwal besok → Berikutnya.
6. Tanpa jadwal/deadline → Tanpa jadwal.
7. Status Menunggu dengan jadwal kemarin → hanya Menunggu.

Semua skenario logika di atas lulus pengujian fungsi `taskTracking`.

## Pemeriksaan source

- Pemeriksaan sintaks TypeScript/TSX berhasil.
- Pemeriksaan tipe internal dengan deklarasi QA berhasil untuk seluruh source frontend.
- `npm run verify:local` berhasil.
- Tidak ada dependency baru.
- Tidak ada migration Supabase baru.
- Tidak ada perubahan Edge Functions Google Calendar.
- Package-lock tetap diarahkan ke registry publik npm.

## Pengujian manual yang disarankan

1. Buat tugas untuk kemarin tanpa deadline dan jangan selesaikan.
2. Muat ulang aplikasi pada hari berikutnya.
3. Pastikan tugas tampil pada **Hari ini** dan **Tertunda**.
4. Tekan **Jadwalkan hari ini** dan pastikan label berubah menjadi jadwal hari ini.
5. Ulangi dengan **Pilih tanggal baru** dan ubah tanggal melalui form edit.
6. Uji tugas dengan deadline terlewat; pastikan masuk **Terlambat**, bukan **Tertunda**.
7. Uji melalui mobile/PWA dan pastikan tombol tindakan cepat tidak menyebabkan overflow horizontal.
