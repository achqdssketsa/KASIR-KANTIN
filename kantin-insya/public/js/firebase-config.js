/* Pengaturan cloud (Firebase). Isi dari Firebase Console → Project settings → Your apps → Web app.
 * Biarkan enabled: false jika ingin aplikasi berjalan lokal saja (data hanya di satu HP).
 * Nilai apiKey di sini BUKAN rahasia; yang melindungi data adalah firestore.rules. */
window.KANTIN_CLOUD = {
  enabled: false,
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  },
  historyDays: 60,              // transaksi yang dimuat ke HP: sekian hari terakhir (menghemat kuota baca gratis)
  emailDomain: "kantin-insya.app" // username diubah jadi email palsu: username@kantin-insya.app (tidak perlu email asli)
};
