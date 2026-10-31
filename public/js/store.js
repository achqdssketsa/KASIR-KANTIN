/* Kantin Insya — penyimpanan data & fungsi bantu.
 * Semua data disimpan di localStorage browser (tidak butuh server).
 * Lakukan "Unduh Cadangan" secara rutin dari menu Pengaturan.
 */
(function (global) {
  'use strict';

  var DB_KEY = 'kantin_insya_db_v1';
  var SESSION_KEY = 'kantin_insya_session';
  var DB_VERSION = 1;

  /* ---------- SHA-256 (untuk menyimpan password tidak dalam bentuk asli) ---------- */
  function sha256(str) {
    var ascii = unescape(encodeURIComponent(str));
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var pow = Math.pow, maxWord = pow(2, 32), i, j, result = '';
    var words = [], bitLen = ascii.length * 8;
    var hash = [], k = [], primeCounter = 0, isComposite = {};
    for (var c = 2; primeCounter < 64; c++) {
      if (!isComposite[c]) {
        for (i = 0; i < 313; i += c) isComposite[i] = c;
        hash[primeCounter] = (pow(c, 0.5) * maxWord) | 0;
        k[primeCounter++] = (pow(c, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (bitLen / maxWord) | 0;
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
    return result;
  }

  /* ---------- Fungsi bantu ---------- */
  var U = {
    sha256: sha256,
    hashPw: function (username, pw) { return sha256('kantin-insya:' + username.toLowerCase() + ':' + pw); },
    uid: function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    },
    num: function (n) { return Math.round(Math.abs(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
    rp: function (n) { n = Math.round(n || 0); return (n < 0 ? '-' : '') + 'Rp ' + U.num(n); },
    parseRp: function (s) { var n = parseInt(String(s || '').replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; },
    pad: function (n) { return String(n).padStart(2, '0'); },
    dateKey: function (iso) { var d = iso ? new Date(iso) : new Date(); return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); },
    todayKey: function () { return U.dateKey(); },
    shiftDay: function (key, delta) { var p = key.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + delta); return U.dateKey(d.toISOString()); },
    time: function (iso) { var d = new Date(iso); return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); },
    dateTime: function (iso) { var d = new Date(iso); return U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + U.time(iso); },
    longDate: function (key) {
      var p = key.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
      var hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      var bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return hari[d.getDay()] + ', ' + d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
    },
    download: function (filename, content, mime) {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },
    csv: function (rows) {
      return '\ufeff' + rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\r\n');
    }
  };

  /* ---------- Data awal ---------- */
  function seed() {
    var now = new Date().toISOString();
    var products = [
      ['Nasi Ayam Geprek', 'Nasi', 15000, 9000, 'Ayam krispi, sambal bawang', 25, 'bowl'],
      ['Mie Goreng Telur', 'Mie', 13000, 7500, 'Mie goreng, telur mata sapi', 20, 'bowl'],
      ['Es Kopi Susu', 'Kopi', 12000, 6000, 'Kopi, susu, gula aren', 30, 'cup'],
      ['Es Teh Lemon', 'Es & Minuman', 6000, 2500, 'Teh dingin yang segar', 40, 'cup'],
      ['Roti Bakar Cokelat', 'Camilan', 10000, 5000, 'Cokelat dan keju', 15, 'bowl'],
      ['Pisang Goreng', 'Camilan', 8000, 3500, 'Renyah, lima potong', 18, 'bowl']
    ].map(function (p) {
      return { id: U.uid() + Math.random().toString(36).slice(2, 5), name: p[0], category: p[1], price: p[2], cost: p[3], description: p[4], stock: p[5], track_stock: true, icon: p[6], archived: false, created_at: now };
    });
    return {
      version: DB_VERSION,
      seq: 0,
      settings: { storeName: 'Kantin Insya', storeAddress: 'Kantin Pusat', receiptFooter: 'Terima kasih, semoga sehat selalu!' },
      users: [
        { username: 'owner', role: 'owner', pw: U.hashPw('owner', 'owner123'), created_at: now },
        { username: 'kasir', role: 'cashier', pw: U.hashPw('kasir', 'kasir123'), created_at: now }
      ],
      categories: ['Nasi', 'Mie', 'Kopi', 'Es & Minuman', 'Camilan'],
      products: products,
      transactions: []
    };
  }

  function isValid(d) {
    return d && typeof d === 'object' && d.version && Array.isArray(d.users) && Array.isArray(d.products) &&
      Array.isArray(d.transactions) && Array.isArray(d.categories) && d.settings;
  }

  var Store = {
    data: null,
    SESSION_KEY: SESSION_KEY,
    load: function () {
      if (global.Cloud && global.Cloud.enabled) {       /* mode cloud: data datang dari Firestore, bukan localStorage */
        this.data = { version: DB_VERSION, seq: 0, settings: { storeName: 'Kantin Insya', storeAddress: '', receiptFooter: '' }, users: [], categories: [], products: [], transactions: [] };
        return this.data;
      }
      var raw = null, d = null;
      try { raw = localStorage.getItem(DB_KEY); } catch (e) { raw = null; }
      if (raw) { try { d = JSON.parse(raw); } catch (e) { d = null; } }
      if (raw && !isValid(d)) {
        /* Data ada tetapi rusak: simpan salinannya dulu, jangan ditimpa diam-diam. */
        try { localStorage.setItem(DB_KEY + '_rusak_' + Date.now(), raw); } catch (e) { /* penyimpanan penuh */ }
        this.recovered = true;
      }
      this.data = isValid(d) ? d : seed();
      if (!isValid(d)) this.save();
      return this.data;
    },
    sizeKB: function () {
      try { return Math.round((localStorage.getItem(DB_KEY) || '').length / 1024); } catch (e) { return 0; }
    },
    save: function () {
      if (global.Cloud && global.Cloud.enabled) { global.Cloud.push(this.data); return true; }
      try { localStorage.setItem(DB_KEY, JSON.stringify(this.data)); return true; }
      catch (e) { alert('Penyimpanan browser penuh. Unduh cadangan lalu hapus data lama.'); return false; }
    },
    replace: function (d) {
      if (!isValid(d)) return false;
      this.data = d; this.save(); return true;
    },
    reset: function () { this.data = seed(); this.save(); return this.data; },
    isValid: isValid,
    seed: seed
  };

  global.U = U;
  global.Store = Store;
})(window);
