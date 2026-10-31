# Data bersama untuk pemilik dan kasir (mode cloud)

Dengan mode cloud, semua HP memakai **satu data yang sama**:
- Kasir menyimpan transaksi → pemilik langsung melihatnya di laporan dan audit.
- Pemilik menambah atau mengubah produk dan harga → muncul di HP semua kasir.
- Stok berkurang di semua HP, juga ketika dua kasir menjual barang yang sama.
- Tanpa sinyal, transaksi tetap tersimpan di HP dan **dikirim otomatis begitu online**.

Teknologinya Firebase (Authentication + Cloud Firestore) dari Google. Tidak perlu menyewa server. Jika `enabled` di `firebase-config.js` dibiarkan `false`, aplikasi berjalan lokal seperti sebelumnya.

## Pembagian peran

| | Pemilik | Kasir |
|---|---|---|
| Kasir, riwayat | semua transaksi | hanya transaksinya sendiri |
| Laporan harian, audit, modal, produk, pengaturan | ya | tidak |
| Membatalkan transaksi | ya | tidak |
| Tambah/nonaktifkan kasir | ya | tidak |
| Mengubah stok | ya | otomatis saat menjual |

Pembatasan ini dijaga oleh `firestore.rules` di server, bukan hanya oleh tampilan aplikasi.

## Langkah 1: siapkan proyek Firebase (sekali saja, ±10 menit)

1. Buka https://console.firebase.google.com → **Create project** (nama bebas, Analytics boleh dimatikan).
2. **Project settings (ikon roda gigi) → Your apps → ikon Web `</>`** → beri nama, **tidak perlu** mencentang Hosting. Salin nilai `apiKey`, `authDomain`, `projectId`, `appId`.
3. Menu **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
4. Menu **Build → Firestore Database → Create database**: pilih lokasi terdekat (mis. Jakarta `asia-southeast2` bila tersedia; lokasi tidak bisa diubah nanti) dan mode **Production**.
5. Buka `public/js/firebase-config.js`, ubah `enabled: true`, lalu isi keempat nilai tadi:
   ```js
   enabled: true,
   firebase: { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." },
   ```
   Nilai ini tidak rahasia. Yang melindungi data adalah aturan di langkah berikutnya.

## Langkah 2: pasang aturan keamanan (jangan dilewati)

Tanpa langkah ini, tidak ada yang bisa membaca atau menulis data.

```bash
npm i -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc      # lalu ganti ID proyek di dalamnya
firebase deploy --only firestore
```
Perintah itu memasang `firestore.rules` dan `firestore.indexes.json`. Indeks butuh beberapa menit sampai berstatus *Enabled* (Firestore → Indexes). Tanpa terminal: tempel isi `firestore.rules` di **Firestore → Rules → Publish**.

## Langkah 3: deploy aplikasi

Sama seperti di `README.md` (GitHub Pages, Vercel, atau Firebase Hosting). Untuk Firebase Hosting sekaligus aturan: `firebase deploy`.

## Langkah 4: siapkan toko dan akun

1. Buka alamat aplikasi di HP pemilik, saat online.
2. Pilih **Pertama kali memakai? Siapkan toko**, isi nama toko, username, dan password pemilik. **Lakukan segera setelah deploy**: hanya orang pertama yang bisa membuat akun pemilik, dan setelah itu pintu itu tertutup.
3. Jika sebelumnya sudah memakai versi lokal, unduh cadangan di HP lama, lalu di akun pemilik pilih **Pengaturan Lainnya → Impor data lama ke cloud**. Jika akan mengimpor, matikan centang "Isi contoh menu" saat menyiapkan toko.
4. **Pengaturan Lainnya → Pengguna**: tambah kasir (username huruf kecil/angka, password minimal 6 karakter).
5. Di HP kasir: buka alamat aplikasi, masuk dengan akun kasir, lalu pasang ke layar utama (lihat `README.md`).

## Pemakaian sehari-hari dan offline

- **Masuk pertama kali di sebuah HP wajib online.** Setelah itu HP mengingat akun, dan aplikasi bisa dibuka dan dipakai tanpa internet.
- **Jangan menekan Keluar** di HP kasir kecuali perlu, karena masuk lagi butuh internet. Jika ada data belum terkirim, masuk kembali dengan akun yang sama saat online agar data itu terkirim.
- Status ada di menu ☰ (bawah) dan Pengaturan Lainnya: *Tersinkron*, *Menunggu dikirim ke cloud*, atau *Offline*.
- Dua HP yang menjual barang sama saat offline akan digabung dengan benar. Stok bisa menjadi minus jika stoknya memang habis di dua tempat sekaligus. Itu terlihat di laporan.
- Nomor struk berbentuk `INV-<tanggal>-<KASIR>-<urut>` supaya tidak bentrok antar HP.
- Kasir lupa password: pemilik **Nonaktifkan** akun itu lalu membuat akun baru dengan username lain. Pemilik tidak bisa mengatur ulang password kasir dari aplikasi tanpa server tambahan (Cloud Functions, butuh paket berbayar).
- Hanya **60 hari terakhir** transaksi yang dimuat ke HP (ubah `historyDays`). Data lama tetap ada di cloud, tetapi tidak tampil di laporan.

## Biaya dan batas gratis

Paket gratis (Spark) memberi 50.000 pembacaan dan 20.000 penulisan dokumen per hari, 1 GiB data, dan Authentication email/password tanpa biaya sampai puluhan ribu pengguna aktif per bulan. Satu penjualan sekitar 2–4 penulisan (transaksi dan stok tiap barang), dan setiap HP yang aktif ikut membaca perubahan itu. Perkiraan kasar ini cukup untuk kantin dengan beberapa ratus transaksi per hari. Saat aplikasi dibuka lagi, HP hanya membaca data yang berubah; jika HP lama tidak terhubung (lebih dari ±30 menit), Firestore bisa membaca ulang data yang dimuat dan menghitungnya sebagai pembacaan. Karena itu jumlah hari yang dimuat (`historyDays`) sengaja dibatasi. Pantau di Firebase Console → Usage. Jika melewati batas, layanan menolak sampai kuota harian pulih (reset sekitar tengah malam waktu Pasifik), kecuali Anda beralih ke paket Blaze.

## Yang perlu Anda ketahui soal keamanan

- Aturan server mencegah kasir membaca data pemilik, membatalkan transaksi, menghapus catatan, atau mengubah harga produk.
- Aturan **tidak bisa memeriksa** apakah total sebuah transaksi sesuai harga. Kasir yang sangat paham teknis dan sengaja bisa mengirim transaksi dengan angka salah. Laporan Audit mencatat nama kasir pada setiap transaksi. Pemeriksaan penuh butuh Cloud Functions (paket Blaze).
- Pasang kunci layar di HP kasir. Pertimbangkan membatasi API key di Google Cloud Console → Credentials ke alamat situs Anda.

## Alternatif lain selain Firebase

| Pilihan | Kelebihan | Kekurangan |
|---|---|---|
| **Firebase (dipakai di sini)** | Offline dan sinkron bawaan, gratis untuk skala kantin, tanpa server | Terikat Google; reset password kasir tak bisa dari aplikasi |
| Supabase (Postgres) | Basis data SQL, ada paket gratis | Tidak punya mode offline bawaan; perlu menulis sendiri antrean sinkron |
| Server sendiri (FastAPI + MongoDB di proyek lama) | Kendali penuh | Butuh hosting berbayar, tidak offline kecuali ditambah antrean sinkron |

## Jika ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| "Indeks database belum dibuat" | Jalankan `firebase deploy --only firestore`, tunggu indeks selesai. |
| "Ditolak server" saat menyiapkan toko | Toko sudah pernah disiapkan. Masuk dengan akun pemilik, atau hapus data Firestore lewat Console bila ingin mengulang. |
| Layar "Layanan online tidak bisa dimuat" | HP belum pernah membuka aplikasi saat online. Hubungkan internet lalu muat ulang. |
| Kasir tidak melihat produk baru | Cek status sinkron. Jika Offline, tunggu sampai online. |
| Salah pengisian config | Pastikan `enabled: true` dan keempat nilai terisi, lalu deploy ulang. |

## Catatan pengujian

Alur ini sudah diuji di browser dengan **tiruan** Firebase (dua HP, pemilik dan kasir): menyiapkan toko, menambah kasir, transaksi kasir terlihat pemilik, stok digabung, produk baru muncul di HP kasir, pembatasan menu kasir, dan akun dinonaktifkan. **Belum diuji pada proyek Firebase sungguhan**, termasuk aturan `firestore.rules` dan sinkron saat offline. Setelah setup, lakukan uji ini sebelum dipakai berjualan:
1. Buat satu transaksi di HP kasir, pastikan pemilik melihatnya.
2. Nyalakan mode pesawat di HP kasir, buat transaksi, matikan mode pesawat, lalu pastikan transaksi sampai ke HP pemilik.
3. Coba buka `#/laporan` di HP kasir dan pastikan ditolak.
