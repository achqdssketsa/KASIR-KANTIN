# Laporan pemeriksaan: KASIR INSYA KANTIN

Proyek berisi tiga bagian: **web-export** (aplikasi HTML/JS yang bisa offline), **backend** (FastAPI + MongoDB), dan **frontend** (Expo/React Native). Hanya web-export yang bisa dipakai tanpa server, jadi itu yang dipakai untuk solusi offline di GitHub, Vercel, dan Firebase (lihat `PANDUAN-DEPLOY-OFFLINE.md`).

## A. Versi web offline (web-export) — diperbaiki

| Masalah | Dampak | Perbaikan |
|---|---|---|
| `assets/icon.svg` kosong (0 byte) | Ikon aplikasi tidak muncul dan Chrome Android tidak menawarkan pemasangan | Ikon baru: SVG + PNG 192/512, maskable, apple-touch |
| Gambar latar login diambil dari Unsplash | Saat offline, kotak login kehilangan gambar dan bergantung pada situs luar | Diganti gradasi hijau lokal |
| Font Google tidak masuk cache | Saat offline, tampilan font berubah | Service worker menyimpan font setelah pertama kali online, dengan font cadangan |
| Service worker memakai "jaringan dulu" | Di sinyal jelek aplikasi menunggu lama sebelum terbuka | "Cache dulu" dengan nomor versi otomatis; semua file diperbarui bersamaan |
| Data di browser rusak langsung ditimpa data contoh | **Seluruh pembukuan hilang tanpa jejak** | Salinan data rusak disimpan sebagai `..._rusak_<waktu>`, pemilik diberi tahu |
| Gagal menyimpan (penyimpanan penuh) tetap menyelesaikan penjualan | Struk ada, catatan tidak | Penjualan dibatalkan otomatis dan stok dikembalikan |
| Tidak ada pengingat cadangan | Data hanya ada di HP | Peringatan jika belum ada cadangan 7 hari; info ukuran penyimpanan |
| Password bawaan tidak diingatkan | Siapa saja bisa masuk sebagai pemilik | Peringatan merah di layar kasir pemilik |
| Tidak ada indikator offline / tombol pasang | Pemilik tidak tahu apakah aplikasi siap offline | Kartu "Aplikasi & Offline" di Pengaturan |
| Laporan tetap di tanggal lama jika aplikasi dibiarkan terbuka lewat tengah malam | Laporan salah hari | Laporan selalu dibuka di hari ini |
| Penyimpanan permanen tidak diminta | Android bisa menghapus data saat memori penuh | `navigator.storage.persist()` |

Diuji otomatis di browser: login, penjualan tunai dan QRIS, perhitungan laba, laporan, muat ulang dalam mode offline, dan data rusak.

## B. Backend (FastAPI) — diperbaiki

| Masalah | Perbaikan |
|---|---|
| `StaticFiles` mengarah ke folder `kantin-insya`, padahal folder bernama `kantin_insya` dan zip tidak ada: **server gagal start** | Path diperbaiki dan hanya dipasang jika file ada |
| Laporan harian hanya membaca 5.000 transaksi pertama | Query dibatasi per hari |
| Setiap server restart, password owner/kasir dikembalikan ke password awal | Password hanya dibuat saat akun belum ada (`SEED_FORCE_RESET=1` untuk memaksa) |
| `riquirements.txt` salah ketik dan berisi paket tak terpakai (`emergentintegrations`, pandas, boto3, dll.) | `requirements.txt` berisi paket yang dipakai saja |
| Tidak ada `.env`; tanpa `SEED_*` tidak ada akun sehingga tidak bisa login | `backend/.env.example` |
| Tes memakai path `/app/...` dan namanya `test-kantin-api.py` (tidak terbaca pytest) | `tests/test_kantin_api.py` dengan path relatif |
| CORS selalu terbuka | Bisa dibatasi lewat `CORS_ORIGINS` |

## C. Frontend (Expo) — diperbaiki

| Masalah | Perbaikan |
|---|---|
| Nama file komponen huruf kecil, tetapi diimpor `SideDrawer`, `ReceiptSheet`, `ConfirmSheet`: **gagal build di Linux/EAS** | File diganti nama |
| Folder `constants/testlds` (huruf **l**) seharusnya `testIds` | Diganti nama |
| `esliny.config.js`, `gitignore.gitignore`, `npmrc.npmrc`, `tests/_init_.py` salah nama | Diganti: `eslint.config.js`, `.gitignore`, `.npmrc`, `__init__.py` |
| `app.json` merujuk `icon.png`, `adaptive-icon.png`, `splash-image.png`, `favicon.png` yang tidak ada; nama aplikasi "frontend" | File ikon dibuat; nama menjadi "Kantin Insya" |
| Tidak ada `frontend/.env`, sehingga alamat API menjadi `undefined/api` | `frontend/.env.example` |

## D. Belum diubah (perlu keputusan Anda)

- **Stok di backend bisa menjadi minus**, karena backend tidak memeriksa stok dan tidak punya penanda "lacak stok" seperti versi web. Mengubahnya akan membuat produk baru berstok 0 tidak bisa dijual, jadi sebaiknya diputuskan dulu aturan yang Anda mau.
- Versi Expo/FastAPI tidak punya fitur **Tutup Kas**, **pembatalan yang tercatat di audit untuk perubahan produk**, dan nomor struk berurutan yang ada di versi web. Versi web lebih lengkap.
- Versi Expo/FastAPI **butuh server dan MongoDB yang online**, sehingga tidak bisa offline. Aplikasi Expo tidak bisa dipasang di GitHub Pages, Vercel, atau Firebase Hosting tanpa mengganti cara penyimpanannya.
- Versi paket Expo di `package.json` (SDK 58, React Native 0.88, TypeScript 6) tidak bisa saya jalankan di sini karena tidak ada akses internet untuk `yarn install`. Jalankan `yarn install && yarn tsc --noEmit` untuk memastikan tidak ada galat tipe.
