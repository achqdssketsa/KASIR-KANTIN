/* Mengisi nomor versi (BUILD) di public/sw.js supaya HP pengguna mengunduh versi terbaru.
 * Pakai: node scripts/stamp-version.js [nomor]   (tanpa nomor = memakai waktu sekarang) */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'sw.js');
const arg = (process.argv[2] || process.env.VERCEL_GIT_COMMIT_SHA || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 12);
const build = arg || new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const src = fs.readFileSync(file, 'utf8');
if (!/var BUILD = '[^']*';/.test(src)) { console.error('Baris "var BUILD" tidak ditemukan di sw.js'); process.exit(1); }
fs.writeFileSync(file, src.replace(/var BUILD = '[^']*';/, "var BUILD = '" + build + "';"));
console.log('sw.js diberi versi:', build);
