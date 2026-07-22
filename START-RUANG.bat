@echo off
setlocal
cd /d "%~dp0"

echo Memeriksa kesiapan instalasi lokal...
call node scripts\verify-local-ready.mjs
if errorlevel 1 goto :error

echo Registry npm project:
call npm config get registry

if not exist node_modules (
  echo Menginstall dependency dari registry publik npm...
  call npm install --registry=https://registry.npmjs.org/
  if errorlevel 1 goto :error
)

echo Menjalankan Ruang...
call npm run dev
exit /b 0

:error
echo Gagal menjalankan proyek. Pastikan Node.js terpasang dan koneksi ke registry.npmjs.org tersedia.
pause
exit /b 1
