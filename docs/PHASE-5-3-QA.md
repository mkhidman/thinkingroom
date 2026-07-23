# Fase 5.3 — Typography QA

## Tujuan

Mengganti tipografi aplikasi Ruang agar terasa dekat dengan bahasa visual Samsung tanpa mendistribusikan font proprietary Samsung.

## Implementasi

- UI font stack: `SamsungOne`, `Samsung One`, system UI, Noto Sans, Segoe UI, Roboto, Helvetica, Arial.
- Display font stack: `Samsung Sharp Sans`, `SamsungSharpSans`, SamsungOne, lalu fallback system.
- Semua form control mewarisi font UI yang sama.
- Heading memakai display stack dan weight 700.
- Weight 800/900 pada stylesheet dinormalkan menjadi 700.
- Letter spacing negatif ekstrem dikurangi agar keterbacaan bahasa Indonesia tetap baik.
- Tidak ada `@font-face`, Google Fonts, file `.woff/.woff2/.ttf/.otf`, atau dependency font baru.

## Dampak lintas perangkat

- Perangkat Samsung yang mengekspos SamsungOne akan memakai font Samsung secara langsung.
- Perangkat lain memakai system font humanist terdekat sehingga tidak ada network request tambahan.
- PWA tetap dapat merender typography saat offline.

## Pemeriksaan

- Tidak ada referensi `Inter` pada source aktif.
- Tidak ada file font proprietary di paket.
- Tidak ada dependency npm baru.
- Registry package-lock tetap hanya `https://registry.npmjs.org/`.
