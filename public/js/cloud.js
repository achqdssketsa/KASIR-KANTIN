/* Kantin Insya — sinkronisasi cloud (Firebase Authentication + Cloud Firestore).
 * Aktif hanya jika firebase-config.js diisi (enabled: true). Tanpa itu, aplikasi berjalan lokal seperti biasa.
 *
 * Cara kerja: aplikasi tetap memakai objek `db` di memori. Setiap kali Store.save() dipanggil, perbedaan
 * antara `db` dan keadaan cloud terakhir dikirim ke Firestore:
 *  - hanya KOLOM yang berubah yang dikirim (dua orang mengedit kolom berbeda pada produk yang sama tidak saling menimpa);
 *  - stok dikirim sebagai SELISIH (increment), sehingga banyak kasir yang menjual barang yang sama tetap akurat;
 *  - kategori disimpan sebagai dokumen sendiri-sendiri, jadi dua pemilik yang menambah kategori bersamaan tidak saling menghapus.
 * Perubahan dari HP lain datang lewat listener waktu-nyata. Firestore juga menyimpan data di HP, sehingga transaksi
 * saat offline dikirim otomatis begitu online. */
(function (global) {
  'use strict';
  var CFG = global.KANTIN_CLOUD || {};
  var FB = CFG.firebase || {};
  var Cloud = { enabled: !!(CFG.enabled && FB.apiKey && FB.projectId), status: 'loading', profile: null, settingUp: false, historyDays: CFG.historyDays || 31 };
  global.Cloud = Cloud;
  if (!Cloud.enabled) return;

  var VER = '10.14.1';
  var BASE = 'https://www.gstatic.com/firebasejs/' + VER + '/';
  var DOMAIN = CFG.emailDomain || 'kantin-insya.app';
  var CFG_KEYS = ['storeName', 'storeAddress', 'receiptFooter', 'storeWa', 'qris', 'receiptAfterPay'];
  var auth, fs, unsubs = [], D = null, last = emptyLast(), meta = {}, firstDone = {}, legacyCats = null;
  Cloud.onError = function () {}; Cloud.onStatus = function () {}; Cloud.onChange = function () {};

  function emptyLast() { return { products: {}, transactions: {}, cfg: null, cats: [] }; }
  function clone(o) { return o !== null && typeof o === 'object' ? JSON.parse(JSON.stringify(o)) : o; }
  function iso() { return new Date().toISOString(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function byTime(a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0; }
  function fromDocs(snap) { var a = []; snap.forEach(function (d) { var o = d.data(); o.id = d.id; a.push(o); }); return a; }
  function cfgOf(x) { var o = {}; CFG_KEYS.forEach(function (k) { o[k] = x.settings[k] === undefined ? '' : x.settings[k]; }); return o; }
  function mapById(arr) { var m = {}; arr.forEach(function (o) { m[o.id] = clone(o); }); return m; }
  function catId(name) { return encodeURIComponent(String(name).trim().toLowerCase()); }
  function reportError(e) { console.error('[cloud]', e); Cloud.lastError = e; Cloud.onError(e); }

  Cloud.emailOf = function (u) { return String(u).trim().toLowerCase() + '@' + DOMAIN; };
  Cloud.statusText = function () {
    return { synced: 'Tersinkron', pending: 'Menunggu dikirim ke cloud', offline: 'Offline (data tersimpan di HP)', loading: 'Menyambung…', error: 'Gagal sinkron' }[Cloud.status] || '';
  };

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }
  Cloud.init = function () {
    var p = (global.firebase && global.firebase.firestore) ? Promise.resolve()
      : loadScript(BASE + 'firebase-app-compat.js').then(function () {
        return Promise.all([loadScript(BASE + 'firebase-auth-compat.js'), loadScript(BASE + 'firebase-firestore-compat.js')]);
      });
    return p.then(function () {
      if (!firebase.apps.length) firebase.initializeApp(FB);
      auth = firebase.auth(); fs = firebase.firestore();
      return fs.enablePersistence({ synchronizeTabs: true }).catch(function () { /* multi-tab / tidak didukung: tetap jalan */ });
    });
  };

  /* ---------- Login ---------- */
  Cloud.onAuth = function (cb) { return auth.onAuthStateChanged(cb); };
  Cloud.signIn = function (u, pw) { return auth.signInWithEmailAndPassword(Cloud.emailOf(u), pw); };
  Cloud.signOut = function () { return auth.signOut(); };
  Cloud.loadProfile = function (uid) {
    return fs.collection('users').doc(uid).get().then(function (d) { if (!d.exists) return null; var p = d.data(); p.uid = uid; return p; });
  };
  Cloud.changePassword = function (oldPw, newPw) {
    var u = auth.currentUser;
    return u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, oldPw)).then(function () { return u.updatePassword(newPw); });
  };

  /* ---------- Status sinkron ---------- */
  function setMeta(name, snap) {
    meta[name] = { p: !!snap.metadata.hasPendingWrites, c: !!snap.metadata.fromCache };
    var any = function (k) { return Object.keys(meta).some(function (n) { return meta[n][k]; }); };
    var s = any('p') ? 'pending' : any('c') ? (navigator.onLine ? 'loading' : 'offline') : 'synced';
    if (s !== Cloud.status) { Cloud.status = s; Cloud.onStatus(s); }
  }

  /* ---------- Mulai / berhenti mendengarkan ---------- */
  Cloud.cutoff = function () { return new Date(Date.now() - Cloud.historyDays * 864e5).toISOString(); };
  Cloud.start = function (profile, data) {
    Cloud.stop();
    Cloud.profile = profile; D = data;
    var owner = profile.role === 'owner', uid = profile.uid;
    function fail(e) { Cloud.status = 'error'; Cloud.onStatus('error'); reportError(e); }
    var O = { includeMetadataChanges: true };

    unsubs.push(fs.collection('config').doc('main').onSnapshot(O, function (d) {
      setMeta('config', d);
      if (d.exists) {
        var c = d.data(), s = Object.assign({}, D.settings);
        CFG_KEYS.forEach(function (k) { if (c[k] !== undefined) s[k] = c[k]; });
        D.settings = s; last.cfg = cfgOf(D);
        if (Array.isArray(c.categories)) legacyCats = c.categories;   /* data versi lama: dipindah otomatis ke dokumen kategori */
      }
      Cloud.onChange();
    }, fail));

    unsubs.push(fs.collection('categories').onSnapshot(O, function (snap) {
      setMeta('categories', snap);
      if (snap.docChanges().length || !firstDone.categories) {
        var wasFirst = !firstDone.categories; firstDone.categories = true;
        D.categories = fromDocs(snap).sort(byTime).map(function (c) { return c.name; });
        last.cats = D.categories.slice();
        if (wasFirst && owner && !D.categories.length && legacyCats && legacyCats.length && !snap.metadata.fromCache) migrateCats();
        Cloud.onChange();
      }
    }, fail));

    unsubs.push(fs.collection('products').onSnapshot(O, function (snap) {
      setMeta('products', snap);
      if (snap.docChanges().length || !firstDone.products) {
        firstDone.products = true;
        D.products = fromDocs(snap).sort(byTime); last.products = mapById(D.products); Cloud.onChange();
      }
    }, fail));

    /* Semua staf (pemilik dan kasir) melihat semua transaksi pada rentang hari yang dimuat. */
    unsubs.push(fs.collection('transactions').where('created_at', '>=', Cloud.cutoff()).onSnapshot(O, function (snap) {
      setMeta('transactions', snap);
      if (snap.docChanges().length || !firstDone.transactions) {
        firstDone.transactions = true;
        D.transactions = fromDocs(snap).sort(byTime); last.transactions = mapById(D.transactions); Cloud.onChange();
      }
    }, fail));

    if (owner) {
      unsubs.push(fs.collection('users').onSnapshot(function (snap) {
        D.users = fromDocs(snap).map(function (u) { u.uid = u.id; return u; }); Cloud.onChange();
      }, fail));
    } else {
      unsubs.push(fs.collection('users').doc(uid).onSnapshot(function (d) {
        if (!d.exists) return;
        var u = d.data(); u.id = uid; u.uid = uid; D.users = [u];
        if (u.active === false && Cloud.onDeactivated) Cloud.onDeactivated();
        Cloud.onChange();
      }, fail));
    }
  };
  function migrateCats() {
    var n = Date.now(), b = fs.batch();
    legacyCats.forEach(function (name, i) { b.set(fs.collection('categories').doc(catId(name)), { name: name, created_at: new Date(n + i).toISOString() }); });
    b.commit().catch(reportError);
  }
  Cloud.stop = function () {
    unsubs.forEach(function (u) { try { u(); } catch (e) { /* abaikan */ } });
    unsubs = []; meta = {}; firstDone = {}; last = emptyLast(); legacyCats = null; Cloud.profile = null; Cloud.status = 'loading';
    if (D) { D.products = []; D.transactions = []; D.users = []; D.categories = []; }
  };

  /* ---------- Kirim perubahan (dipanggil oleh Store.save) ---------- */
  function changes(cur, old, deltaKeys) {
    var out = null;
    Object.keys(cur).forEach(function (k) {
      if (k === 'id' || cur[k] === undefined || same(cur[k], old[k])) return;
      out = out || {};
      out[k] = (deltaKeys.indexOf(k) >= 0 && typeof cur[k] === 'number' && typeof old[k] === 'number')
        ? firebase.firestore.FieldValue.increment(cur[k] - old[k]) : clone(cur[k]);
    });
    return out;
  }
  function commit(ops) {
    var p = Promise.resolve();
    for (var i = 0; i < ops.length; i += 400) {
      (function (part) {
        var b = fs.batch();
        part.forEach(function (o) {
          if (o[0] === 'set') { if (o[3]) b.set(o[1], o[2], o[3]); else b.set(o[1], o[2]); }
          else if (o[0] === 'delete') b.delete(o[1]);
          else b.update(o[1], o[2]);
        });
        p = p.then(function () { return b.commit(); });
      })(ops.slice(i, i + 400));
    }
    return p;
  }
  Cloud.push = function (data) {
    if (!Cloud.profile || !fs) return false;
    var ops = [], uid = Cloud.profile.uid, owner = Cloud.profile.role === 'owner';
    data.products.forEach(function (p) {
      var old = last.products[p.id], ref = fs.collection('products').doc(p.id);
      if (!old) { var c = clone(p); c.created_at = c.created_at || iso(); ops.push(['set', ref, c]); }
      else { var ch = changes(p, old, ['stock']); if (ch) ops.push(['update', ref, ch]); }
    });
    data.transactions.forEach(function (t) {
      var old = last.transactions[t.id], ref = fs.collection('transactions').doc(t.id);
      if (!old) { var c = clone(t); c.cashier_uid = c.cashier_uid || uid; ops.push(['set', ref, c]); }
      else { var ch = changes(t, old, []); if (ch) ops.push(['update', ref, ch]); }
    });
    if (owner) {
      var cfg = cfgOf(data), diff = {};
      CFG_KEYS.forEach(function (k) { if (!last.cfg || !same(cfg[k], last.cfg[k])) diff[k] = cfg[k]; });
      if (Object.keys(diff).length) ops.push(['set', fs.collection('config').doc('main'), diff, { merge: true }]);
      data.categories.forEach(function (name) {
        if (last.cats.indexOf(name) < 0) ops.push(['set', fs.collection('categories').doc(catId(name)), { name: name, created_at: iso() }]);
      });
      last.cats.forEach(function (name) {
        if (data.categories.indexOf(name) < 0) ops.push(['delete', fs.collection('categories').doc(catId(name))]);
      });
    }
    last = { products: mapById(data.products), transactions: mapById(data.transactions), cfg: cfgOf(data), cats: data.categories.slice() };
    if (ops.length) commit(ops).catch(reportError);
    return true;
  };

  /* ---------- Pengguna ---------- */
  Cloud.createUser = function (username, pw, role) {
    var sec;
    try { sec = firebase.app('secondary'); } catch (e) { sec = firebase.initializeApp(FB, 'secondary'); }
    return sec.auth().createUserWithEmailAndPassword(Cloud.emailOf(username), pw).then(function (cred) {
      return fs.collection('users').doc(cred.user.uid).set({ username: username, role: role === 'owner' ? 'owner' : 'cashier', active: true, created_at: iso() })
        .then(function () { return sec.auth().signOut(); });
    });
  };
  Cloud.setUserActive = function (uid, active) { return fs.collection('users').doc(uid).update({ active: !!active }); };

  /* Pertama kali: buat akun pemilik. Hanya berhasil jika toko belum pernah disiapkan (diatur firestore.rules). */
  Cloud.setupOwner = function (o) {
    Cloud.settingUp = true;
    var user = null;
    return auth.createUserWithEmailAndPassword(Cloud.emailOf(o.username), o.password).then(function (cred) {
      user = cred.user;
      var b = fs.batch();
      b.set(fs.collection('meta').doc('setup'), { created_at: iso(), owner_uid: user.uid });
      b.set(fs.collection('users').doc(user.uid), { username: o.username, role: 'owner', active: true, created_at: iso() });
      return b.commit();
    }).then(function () {
      var b = fs.batch(), n = Date.now();
      b.set(fs.collection('config').doc('main'), { storeName: o.storeName, storeAddress: o.storeAddress, receiptFooter: o.receiptFooter, storeWa: '', qris: '', receiptAfterPay: false });
      (o.categories || []).forEach(function (name, i) { b.set(fs.collection('categories').doc(catId(name)), { name: name, created_at: new Date(n + i).toISOString() }); });
      (o.products || []).forEach(function (p, i) { var c = clone(p); c.created_at = new Date(n + i).toISOString(); b.set(fs.collection('products').doc(p.id), c); });
      return b.commit().catch(function (e) { console.error('[cloud] pengaturan awal gagal', e); });
    }).then(function () { Cloud.settingUp = false; return user; }, function (e) {
      Cloud.settingUp = false;
      var del = user ? user.delete().catch(function () {}) : Promise.resolve();
      return del.then(function () { throw e; });
    });
  };

  /* Pindahkan data dari cadangan lokal (.json) ke cloud. Hanya pemilik. */
  Cloud.importBackup = function (d) {
    var uid = Cloud.profile.uid, ops = [], n = Date.now();
    var cfg = cfgOf(d); delete cfg.qris;
    ops.push(['set', fs.collection('config').doc('main'), cfg, { merge: true }]);
    (d.categories || []).forEach(function (name, i) { ops.push(['set', fs.collection('categories').doc(catId(name)), { name: name, created_at: new Date(n + i).toISOString() }]); });
    d.products.forEach(function (p, i) { var c = clone(p); c.created_at = c.created_at || new Date(n + i).toISOString(); ops.push(['set', fs.collection('products').doc(p.id), c]); });
    d.transactions.forEach(function (t) { var c = clone(t); c.cashier_uid = uid; ops.push(['set', fs.collection('transactions').doc(t.id), c]); });
    return commit(ops);
  };
})(window);
