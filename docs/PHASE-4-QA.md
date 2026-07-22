# QA Fase 4 — Deadline, CRUD, dan Reminder

## Scope pemeriksaan

- Tidak ada lagi seed/dummy source.
- Struktur awal dan reset menghasilkan AppData kosong.
- Jadwal pengerjaan, deadline, dan reminder disimpan terpisah.
- Tracking terlambat menggunakan deadline.
- Deadline recurring task bergerak dengan offset yang konsisten.
- CRUD tersedia untuk domain utama.
- Reminder client mempunyai permission flow dan deduplikasi.
- Package tetap local-install-ready dan registry publik.

## Pemeriksaan source

- `src/data/seed.ts` tidak ada.
- Tidak ditemukan referensi `createSeedData`, `data/seed`, `dummy`, atau fallback demo pada source produksi.
- `createEmptyData()` mengembalikan array kosong untuk seluruh domain.
- `Task.deadlineAt` dan `Task.reminderAt` bersifat opsional agar snapshot lama tetap kompatibel.
- Tidak ada migration database baru karena field baru berada di JSONB `app_state`.

## Perilaku data lama

Source tidak menghapus snapshot cloud secara otomatis. Data contoh yang sudah pernah tersinkron dapat dihapus melalui **Review → Hapus seluruh data**. Aksi tersebut membuat backup sebelum menyimpan snapshot kosong.

## Batas pengujian environment

Pemeriksaan sintaks dan tipe internal dilakukan tanpa mengandalkan registry internal. Fresh dependency install/production build penuh perlu dijalankan pada komputer lokal karena environment pembuatan tidak dapat menyelesaikan download public npm registry secara konsisten.

Reminder browser juga harus diuji pada HTTPS/localhost dan perangkat fisik. Browser dapat membatasi notifikasi atau timer ketika aplikasi berada di background. Web Push saat aplikasi tertutup belum termasuk fase ini.
