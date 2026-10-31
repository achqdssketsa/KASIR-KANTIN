/* Pengaturan cloud (Firebase). Isi dari Firebase Console → Project settings → Your apps → Web app.
 * Biarkan enabled: false jika ingin aplikasi berjalan lokal saja (data hanya di satu HP).
 * Nilai apiKey di sini BUKAN rahasia; yang melindungi data adalah firestore.rules. */
window.KANTIN_CLOUD = {
enabled: true,
firebase: { 
  apiKey: "AIzaSyCXwx8Mk0tXvpK9-I5ha5ZCJChwaldHQc4", 
  authDomain: "kantin-insya.firebaseapp.com", 
  projectId: "kantin-insya", 
  appId: "1:144100812099:web:36b7ec48165698cc5f3bf6" 
},
  historyDays: 60,              // transaksi yang dimuat ke HP: sekian hari terakhir (menghemat kuota baca gratis)
  emailDomain: "kantin-insya.app" // username diubah jadi email palsu: username@kantin-insya.app (tidak perlu email asli)
};
