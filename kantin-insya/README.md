# Kantin Insya — Kasir & Pembukuan (bisa dipakai tanpa internet)

Aplikasi kasir untuk kantin/warung: kasir, produk, modal & pengeluaran, laporan harian, laporan audit, tutup kas, struk, cadangan data.
Dibuat dengan HTML, CSS, dan JavaScript murni. Dipasang di Android seperti aplikasi biasa (PWA).

**Dua mode:**
- **Lokal** (bawaan): tanpa server, data di satu HP.
- **Cloud** (opsional): pemilik dan kasir di HP berbeda memakai data yang sama lewat Firebase, tetap bisa offline. Lihat **`PANDUAN-CLOUD.md`**.

## Cara kerja offline (penting dipahami)

1. HP membuka alamat aplikasi **sekali saja saat ada internet**. Browser menyimpan semua file aplikasi.
2. Setelah itu aplikasi bisa dibuka dan dipakai berjualan **tanpa internet sama sekali**.
3. Data (produk, transaksi, laporan) tersimpan **di HP itu sendiri**. Tiap HP punya data sendiri. Lihat bagian *Cadangan data*.

## Isi folder

```
kantin-insya/
├── public/                      ← seluruh aplikasi (ini yang di-deploy)
│   ├── index.html, css/, js/       ← js/firebase-config.js: isi untuk mode cloud
│   ├── sw.js                    ← membuat aplikasi bisa offline
│   ├── manifest.webmanifest     ← agar bisa dipasang di layar utama
│   └── assets/                  ← ikon
├── scripts/stamp-version.js     ← memberi nomor versi otomatis saat deploy
├── .github/workflows/pages.yml  ← deploy otomatis ke GitHub Pages
├── vercel.json                  ← pengaturan Vercel
├── firebase.json                ← pengaturan Firebase Hosting + Firestore
├── firestore.rules              ← aturan keamanan data (mode cloud)
├── firestore.indexes.json       ← indeks database (mode cloud)
├── PANDUAN-CLOUD.md             ← data bersama pemilik & kasir
└── .firebaserc.example          ← salin jadi .firebaserc, isi ID proyek
```

## Coba dulu di komputer

```bash
npx serve public -l 8080
# atau: cd public && python -m http.server 8080
```
Buka http://localhost:8080. Mode offline hanya aktif di `localhost` atau alamat `https://`. Membuka `index.html` langsung dengan klik dua kali tetap berjalan, tetapi tanpa fitur offline dan pasang-aplikasi.

Login awal: **owner / owner123** dan **kasir / kasir123**. Ganti password segera (menu ☰ → Pengaturan Lainnya).

---

## Pilihan 1: GitHub Pages (gratis)

1. Buat repository di https://github.com/new, misalnya `kantin-insya`, pilih **Public**. GitHub Pages untuk repository *private* butuh paket berbayar.
2. Di komputer, buka terminal di folder ini lalu jalankan:
   ```bash
   git init
   git add .
   git commit -m "Kantin Insya"
   git branch -M main
   git remote add origin https://github.com/NAMA-ANDA/kantin-insya.git
   git push -u origin main
   ```
   Tanpa terminal: di halaman repository pilih **Add file → Upload files**, seret isi folder ini, termasuk folder `.github`. Jika `.github` tidak ikut terunggah, pilih **Add file → Create new file**, ketik nama `.github/workflows/pages.yml`, lalu tempel isi file itu.
3. Buka **Settings → Pages**. Pada **Source** pilih **GitHub Actions**.
4. Buka tab **Actions**, tunggu proses *Deploy ke GitHub Pages* bertanda centang hijau (1–2 menit).
5. Aplikasi bisa dibuka di `https://NAMA-ANDA.github.io/kantin-insya/`.

Setiap kali Anda `git push` ke cabang `main`, aplikasi diperbarui otomatis.

## Pilihan 2: Vercel (gratis)

**Lewat GitHub** (paling mudah): push proyek ke GitHub seperti di atas, lalu di https://vercel.com pilih **Add New → Project**, impor repository, biarkan pengaturan bawaan (file `vercel.json` sudah mengaturnya), klik **Deploy**.

**Lewat terminal:**
```bash
npm i -g vercel
vercel          # jawab pertanyaan, pilih bawaan
vercel --prod   # terbitkan ke alamat utama
```
Alamat aplikasi: `https://NAMA-PROYEK.vercel.app`. Pasang di HP memakai alamat *production* ini, bukan alamat *preview* yang bisa dikunci Vercel.

## Pilihan 3: Firebase Hosting (gratis, paket Spark)

1. Buat proyek di https://console.firebase.google.com dan catat **ID proyek**.
2. Salin `.firebaserc.example` menjadi `.firebaserc`, lalu ganti `ISI-DENGAN-ID-PROYEK-FIREBASE-ANDA` dengan ID proyek.
3. Jalankan:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only hosting
   ```
   Jangan jalankan `firebase init`, karena akan menimpa `firebase.json`.
4. Alamat aplikasi: `https://ID-PROYEK.web.app`.

---

## Memasang di Android dan memakainya offline

1. Buka alamat aplikasi di **Chrome** saat HP **online**.
2. Masuk, lalu buka ☰ → **Pengaturan Lainnya** → bagian *Aplikasi & Offline*. Tunggu sampai tertulis **Siap dipakai tanpa internet: Ya**.
3. Tekan **Pasang aplikasi**. Jika tombol tidak muncul, buka menu ⋮ Chrome → **Instal aplikasi** (atau **Tambahkan ke Layar utama**).
4. Uji: nyalakan **mode pesawat**, buka aplikasi dari layar utama, lalu coba satu transaksi. Jika berjalan, aplikasi siap dipakai tanpa sinyal.

Font tampil lengkap setelah HP pernah membuka aplikasi sekali saat online. Tanpa itu, aplikasi memakai font bawaan HP dan semua fitur tetap berjalan.

## Cadangan data (wajib dibiasakan)

- Data hanya ada di browser HP. Jika data browser dibersihkan, atau aplikasi dihapus lalu dipasang ulang, **data hilang**.
- Unduh cadangan: ☰ → Pengaturan Lainnya → **Unduh cadangan (.json)**. Lakukan tiap tutup toko, lalu kirim file ke WhatsApp/Google Drive Anda sendiri.
- Pindah HP atau pulihkan data: pasang aplikasi di HP baru, lalu **Pulihkan dari cadangan**.
- Aplikasi mengingatkan pemilik jika sudah 7 hari tanpa cadangan.
- Jika data di browser rusak, aplikasi tidak menimpanya: salinannya disimpan dengan nama `kantin_insya_db_v1_rusak_...`.

## Memperbarui aplikasi

Push perubahan ke `main` (GitHub/Vercel) atau jalankan `firebase deploy --only hosting`. Nomor versi diisi otomatis. Di HP, buka aplikasi saat online. Setelah muncul pesan "Versi baru terpasang", tutup aplikasi sepenuhnya lalu buka lagi.

## Jadi file APK (opsional)

PWA di atas sudah cukup untuk dipakai seperti aplikasi. Jika Anda tetap ingin file `.apk`/`.aab`, gunakan https://www.pwabuilder.com: masukkan alamat HTTPS aplikasi Anda (dari GitHub Pages/Vercel/Firebase), pilih **Package for stores → Android**, lalu ikuti langkahnya. Simpan file kunci tanda tangan (*keystore*) yang dihasilkan, karena dibutuhkan setiap kali memperbarui APK. Tampilan situs itu bisa berubah, jadi ikuti petunjuk terbarunya.

## Batasan yang perlu diketahui

- **Mode lokal: satu HP = satu data.** Untuk pemilik dan kasir di HP berbeda, aktifkan mode cloud (`PANDUAN-CLOUD.md`).
- **Keamanan login terbatas.** Password disimpan dalam bentuk hash, tetapi orang yang paham teknis dan memegang HP-nya tetap bisa membuka datanya. Simpan HP kasir dengan kunci layar.
- **Penyimpanan ±5 MB.** Cukup untuk puluhan ribu transaksi. Aplikasi memberi peringatan sebelum penuh.

## Masalah umum

| Gejala | Penyebab dan solusi |
|---|---|
| Tombol *Pasang aplikasi* tidak muncul | Buka lewat Chrome dengan alamat `https://`. Tunggu tulisan "Siap dipakai tanpa internet: Ya". Jika sudah terpasang, tombol memang tidak muncul. |
| Halaman kosong setelah deploy | Pastikan yang di-deploy adalah folder `public` (sudah diatur di workflow, `vercel.json`, dan `firebase.json`). |
| GitHub Actions gagal di langkah deploy | Buka **Settings → Pages** dan pilih **Source: GitHub Actions**. |
| Versi lama masih tampil | Tutup aplikasi sepenuhnya lalu buka lagi saat online. Jika masih lama, di Chrome: ⋮ → Info situs → Hapus data (**unduh cadangan dulu**). |
