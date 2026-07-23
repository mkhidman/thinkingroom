# Phase 5.1 QA — Proyek opsional sebagai default

## Bug yang diperbaiki

Form tugas, catatan, dan Quick Capture sebelumnya otomatis memilih proyek aktif pertama ketika nilai proyek kosong. Akibatnya opsi **Tanpa proyek** tidak dapat dipertahankan walaupun tersedia di dropdown.

## Perubahan

- Tugas baru dimulai dengan `projectId` kosong.
- Catatan baru dimulai dengan `projectId` kosong.
- Quick Capture tugas/catatan dimulai dengan `projectId` kosong.
- Tidak ada lagi fallback otomatis ke proyek aktif atau proyek pertama.
- Saat mengedit item, proyek yang sudah tersimpan tetap dipertahankan.
- Jika proyek terpilih sudah tidak tersedia/valid, relasi dilepas menjadi **Tanpa proyek**.
- Data yang disimpan tetap memakai `projectId: undefined` untuk item general.

## Pemeriksaan

- Pemeriksaan sintaks berhasil untuk 41 file TypeScript/TSX.
- `npm run verify:local` berhasil.
- `package-lock.json` tetap hanya memakai `https://registry.npmjs.org/`.
- Tidak ada dependency baru.
- Tidak ada migration Supabase baru.
- Tidak ada perubahan pada Google Calendar Edge Functions atau secrets.

## Pengujian manual yang disarankan

1. Buka **Tugas & Proyek** lalu tambah tugas baru.
2. Pastikan dropdown proyek menunjukkan **Tanpa proyek**.
3. Simpan tanpa mengubah proyek dan pastikan tugas tidak memiliki project pill.
4. Tambah catatan baru dan lakukan pengujian yang sama.
5. Buka **Tangkap cepat**, uji tipe Tugas dan Catatan.
6. Edit item yang sudah memiliki proyek; pastikan proyek lama tetap terpilih.
7. Ubah proyek menjadi **Tanpa proyek**, simpan, lalu muat ulang aplikasi.
