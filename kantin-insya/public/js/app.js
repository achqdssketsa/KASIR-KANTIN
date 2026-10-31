/* Kantin Insya — aplikasi kasir & pembukuan (HTML + CSS + JavaScript murni) */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var overlay = document.getElementById('overlay');
  var toastEl = document.getElementById('toast');
  var printArea = document.getElementById('print-area');
  var esc = U.esc, rp = U.rp;
  var Cloud = window.Cloud || { enabled: false };

  var db = Store.load();
  var S = {
    user: null, cat: 'Semua', q: '', cart: [], pm: 'tunai', paid: 0, note: '',
    drawer: false, sheet: null, auditFilter: 'all', auditQ: '', auditOpen: null,
    reportDate: U.todayKey(), modalKind: 'modal_in', loginRole: 'owner'
  };

  S.booting = !!Cloud.enabled; S.setup = false; S.fatal = null;
  var sess = Cloud.enabled ? null : localStorage.getItem(Store.SESSION_KEY);
  if (sess) S.user = db.users.find(function (u) { return u.username === sess; }) || null;

  var OWNER_ROUTES = ['laporan', 'audit', 'produk', 'modal', 'pengaturan'];

  /* ---------------- Ikon (gaya Feather) ---------------- */
  var ICONS = {
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><polyline points="9 14 11 16 15 12"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    bowl: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M9 8.5c0-1.2 1.2-1.3 1.2-2.5S9 4.7 9 3.5"/><path d="M14 8.5c0-1.2 1.2-1.3 1.2-2.5S14 4.7 14 3.5"/>',
    cup: '<path d="M5 8h14l-1.6 12.2a1 1 0 0 1-1 .8H7.6a1 1 0 0 1-1-.8L5 8z"/><line x1="4" y1="8" x2="20" y2="8"/><path d="M12 8l1.5-5H17"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    down: '<circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/>',
    up: '<circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/>',
    xc: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M20 20h-3M14 20v.01"/>',
    bank: '<path d="M3 10l9-6 9 6"/><line x1="5" y1="10" x2="5" y2="18"/><line x1="10" y1="10" x2="10" y2="18"/><line x1="14" y1="10" x2="14" y2="18"/><line x1="19" y1="10" x2="19" y2="18"/><line x1="3" y1="21" x2="21" y2="21"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><rect x="7" y="5" width="10" height="4" rx="1"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    bar: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
  };
  function I(name, size) {
    size = size || 20;
    return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.bowl) + '</svg>';
  }

  /* ---------------- Bantu umum ---------------- */
  function route() { return (location.hash.replace(/^#\/?/, '') || 'kasir').split('?')[0]; }
  function go(r) { if (route() === r) render(); else location.hash = '#/' + r; }
  function save() { Store.save(); }
  function isOwner() { return S.user && S.user.role === 'owner'; }
  function roleLabel(r) { return r === 'owner' ? 'Pemilik' : 'Kasir'; }
  function pmLabel(m) { return { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }[m] || m; }
  function product(id) { return db.products.find(function (p) { return p.id === id; }); }
  function nextNo() {
    if (Cloud.enabled) {   /* nomor unik per kasir per hari, agar dua HP tidak pernah memakai nomor yang sama */
      var d = new Date(), ymd = String(d.getFullYear()).slice(2) + U.pad(d.getMonth() + 1) + U.pad(d.getDate());
      var prefix = 'INV-' + ymd + '-' + S.user.username.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() + '-';
      var n = db.transactions.filter(function (t) { return t.no && t.no.indexOf(prefix) === 0; }).length + 1;
      return prefix + String(n).padStart(3, '0');
    }
    db.seq = (db.seq || 0) + 1; return 'INV-' + String(db.seq).padStart(5, '0');
  }
  function logEvent(text) {
    db.transactions.push({ id: U.uid(), kind: 'log', created_at: new Date().toISOString(), cashier: S.user ? S.user.username : '-', note: text });
  }
  function greeting() {
    var h = new Date().getHours();
    return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function cartTotals() {
    var count = 0, total = 0;
    S.cart.forEach(function (c) { var p = product(c.id); count += c.qty; total += (p ? p.price : c.price) * c.qty; });
    return { count: count, total: total };
  }
  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = 'show ' + (type || '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.className = ''; }, 2600);
  }
  function brand(align) {
    return '<div class="brand ' + (align || '') + '"><span class="brand-name">KANTIN</span><span class="brand-sub"><i></i>INSYA<i></i></span></div>';
  }
  function topbar(title, right) {
    return '<header class="topbar"><button class="icon-btn" data-action="drawer" aria-label="Buka menu">' + I('menu') + '</button>' +
      '<h1 class="display topbar-title">' + title + '</h1>' + (right || '<span class="icon-btn ghost"></span>') + '</header>';
  }
  function kindInfo(t) {
    return {
      sale: { label: 'Penjualan', icon: 'bag', tone: 'ok' },
      modal_in: { label: 'Modal Masuk', icon: 'down', tone: 'info' },
      expense: { label: 'Pengeluaran', icon: 'up', tone: 'danger' },
      closing: { label: 'Tutup Kas', icon: 'cash', tone: 'warn' },
      log: { label: 'Catatan Sistem', icon: 'info', tone: 'muted' }
    }[t.kind] || { label: t.kind, icon: 'info', tone: 'muted' };
  }
  function txnAmount(t) {
    if (t.kind === 'sale') return '+' + rp(t.subtotal);
    if (t.kind === 'modal_in') return '+' + rp(t.amount);
    if (t.kind === 'expense') return '-' + rp(t.amount);
    if (t.kind === 'closing') return t.diff === 0 ? 'Pas' : (t.diff < 0 ? 'Kurang ' + rp(-t.diff) : 'Lebih ' + rp(t.diff));
    return '';
  }

  /* ---------------- Peringatan pemilik & status offline ---------------- */
  var deferredPrompt = null, swReady = false;
  function hasDefaultPassword() {
    return db.users.some(function (u) { return u.pw === U.hashPw(u.username, u.role === 'owner' ? 'owner123' : 'kasir123'); });
  }
  function backupDays() {
    var last = db.settings.lastBackup;
    return last ? Math.floor((Date.now() - new Date(last).getTime()) / 864e5) : null;
  }
  function backupInfo() {
    var d = backupDays();
    return d === null ? 'Belum pernah mengunduh cadangan.' : 'Cadangan terakhir: ' + (d === 0 ? 'hari ini' : d + ' hari lalu') + '.';
  }
  function ownerAlerts() {
    if (!isOwner() || Cloud.enabled) return '';
    var out = '', days = backupDays();
    if (hasDefaultPassword()) {
      out += '<div class="alert danger"><p><b>Password masih bawaan.</b> Ganti agar orang lain tidak bisa masuk.</p><button class="btn btn-outline btn-sm" data-action="nav" data-to="pengaturan">Ganti</button></div>';
    }
    if (Store.sizeKB() > 3500) {
      out += '<div class="alert danger"><p><b>Penyimpanan hampir penuh.</b> Unduh cadangan, lalu mulai pembukuan baru.</p><button class="btn btn-outline btn-sm" data-action="backup">Cadangkan</button></div>';
    } else if (db.transactions.length > 0 && (days === null || days >= 7)) {
      out += '<div class="alert"><p><b>' + (days === null ? 'Data belum pernah dicadangkan.' : 'Cadangan terakhir ' + days + ' hari lalu.') + '</b> Data hanya ada di HP ini.</p><button class="btn btn-outline btn-sm" data-action="backup">Cadangkan</button></div>';
    }
    return out;
  }
  function offlineCard() {
    var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    var online = navigator.onLine, sw = 'serviceWorker' in navigator;
    var h = '<p class="label">APLIKASI &amp; OFFLINE</p><div class="card stack">' +
      '<div class="kv"><span>Koneksi</span><span><i class="status-dot ' + (online ? '' : 'off') + '"></i>' + (online ? 'Online' : 'Offline') + '</span></div>' +
      (Cloud.enabled ? '<div class="kv"><span>Sinkron cloud</span><span data-sync>' + esc(Cloud.statusText()) + '</span></div>' : '') + '<div class="kv"><span>Siap dipakai tanpa internet</span><span>' + (swReady ? 'Ya' : sw ? 'Menyiapkan…' : 'Tidak didukung') + '</span></div>' +
      '<div class="kv"><span>Terpasang di layar utama</span><span>' + (standalone ? 'Ya' : 'Belum') + '</span></div>';
    if (deferredPrompt && !standalone) h += '<button class="btn btn-primary" data-action="install-app">' + I('download', 18) + ' Pasang aplikasi</button>';
    else if (!standalone) h += '<p class="small muted">Untuk memasang: buka menu ⋮ di Chrome, lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke Layar utama</b>.</p>';
    return h + (Cloud.enabled ? '<p class="tiny muted">Saat offline, transaksi disimpan di HP lalu dikirim otomatis ke cloud begitu online. Semua perangkat melihat data yang sama.</p></div>' : '<p class="tiny muted">Semua fitur kasir berjalan tanpa internet. Data tersimpan di perangkat ini.</p></div>');
  }

  function usersCardCloud() {
    return '<p class="label">PENGGUNA</p><div class="card">' + db.users.map(function (u) {
      var self = S.user && u.uid === S.user.uid, off = u.active === false;
      return '<div class="kv user-row"><span><b>' + esc(u.username) + '</b> <span class="pill sm">' + roleLabel(u.role) + '</span>' + (off ? ' <span class="pill sm">Nonaktif</span>' : '') + '</span><span class="row-actions">' +
        (self ? '<button class="btn btn-outline btn-sm" data-action="reset-pw" data-u="' + esc(u.username) + '">Ganti password</button>'
          : '<button class="btn btn-outline btn-sm" data-action="toggle-user" data-uid="' + esc(u.uid) + '" data-active="' + (off ? 'true' : 'false') + '">' + (off ? 'Aktifkan' : 'Nonaktifkan') + '</button>') + '</span></div>';
    }).join('') +
      '<form class="inline-form" data-form="add-user"><input name="username" class="input" placeholder="username kasir baru" pattern="[a-z0-9_.\\-]{3,20}" autocapitalize="none" required>' +
      '<input name="password" class="input" type="password" placeholder="password (min. 6)" minlength="6" required><button class="btn btn-outline" type="submit">Tambah kasir</button></form>' +
      '<p class="tiny muted">Kasir lupa password? Nonaktifkan akunnya, lalu buat akun baru dengan username lain.</p></div>';
  }

  /* ---------------- Laporan ---------------- */
  function report(key) {
    var r = { total_sales: 0, total_cost: 0, modal_in_total: 0, expense_total: 0, sale_count: 0, item_count: 0, void_total: 0, void_count: 0, by_method: { tunai: 0, qris: 0, transfer: 0 }, top: {}, closings: [] };
    db.transactions.forEach(function (t) {
      if (U.dateKey(t.created_at) !== key) return;
      if (t.voided) { if (t.kind === 'sale') { r.void_total += t.subtotal; r.void_count++; } return; }
      if (t.kind === 'sale') {
        r.sale_count++; r.total_sales += t.subtotal; r.total_cost += t.cost_total || 0;
        r.by_method[t.payment_method] = (r.by_method[t.payment_method] || 0) + t.subtotal;
        t.items.forEach(function (it) { r.item_count += it.qty; r.top[it.name] = (r.top[it.name] || 0) + it.qty; });
      } else if (t.kind === 'modal_in') r.modal_in_total += t.amount;
      else if (t.kind === 'expense') r.expense_total += t.amount;
      else if (t.kind === 'closing') r.closings.push(t);
    });
    r.gross_profit = r.total_sales - r.total_cost;
    r.net_profit = r.gross_profit - r.expense_total;
    r.expected_cash = r.modal_in_total + r.by_method.tunai - r.expense_total;
    r.top_products = Object.keys(r.top).map(function (k) { return { name: k, qty: r.top[k] }; }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    return r;
  }

  /* ================= VIEWS ================= */
  function viewLogin() {
    var roles = [['owner', 'Pemilik'], ['cashier', 'Kasir']];
    var defUser = S.loginRole === 'owner' ? 'owner' : 'kasir';
    return '<div class="login">' +
      '<div class="login-hero"><div class="login-scrim"></div>' + brand('light') + '</div>' +
      '<form class="login-body" data-form="login" autocomplete="on">' +
      '<h1 class="display login-title">Selamat datang kembali</h1>' +
      '<p class="muted">Masuk untuk mulai mencatat setiap transaksi hari ini.</p>' +
      (Cloud.enabled ? '' : '<div class="seg">') + (Cloud.enabled ? '' : roles.map(function (r) { return '<button type="button" class="seg-btn ' + (S.loginRole === r[0] ? 'active' : '') + '" data-action="login-role" data-role="' + r[0] + '">' + r[1] + '</button>'; }).join('')) + (Cloud.enabled ? '' : '</div>') +
      '<label class="field"><span>Username</span><input class="line-input" name="username" value="' + (Cloud.enabled ? '' : defUser) + '" autocapitalize="none" required></label>' +
      '<label class="field"><span>Password</span><input class="line-input" name="password" type="password" required placeholder="••••••"></label>' +
      '<p class="error-text" id="login-error"></p>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Masuk ' + I('arrow', 18) + '</button>' +
      (Cloud.enabled
        ? '<p class="hint center">Masuk pertama kali di HP ini butuh internet. Setelah itu aplikasi bisa dipakai offline.</p><button type="button" class="link-btn center" data-action="open-setup">Pertama kali memakai? Siapkan toko</button>'
        : '<p class="hint center">Akun awal: <b>owner / owner123</b> · <b>kasir / kasir123</b><br>Segera ganti password di menu Pengaturan.</p>') +
      '</form></div>';
  }

  function viewKasir() {
    var r = report(U.todayKey());
    return '<header class="kasir-head">' +
      '<button class="icon-btn" data-action="drawer" aria-label="Buka menu">' + I('menu') + '</button>' + brand() +
      '<button class="icon-btn" data-action="nav" data-to="riwayat" aria-label="Riwayat">' + I('clock') + '</button></header>' +
      '<section class="intro"><p class="muted small">' + greeting() + ', ' + esc(S.user.username) + '</p>' +
      '<div class="intro-row"><h2 class="display hero">Mau makan apa hari ini?</h2>' +
      '<label class="search">' + I('search', 18) + '<input id="search" type="search" placeholder="Cari makanan atau minuman" value="' + esc(S.q) + '" autocomplete="off"></label></div></section>' +
      '<div class="chips" role="tablist">' + ['Semua'].concat(db.categories).map(function (c) {
        return '<button class="chip ' + (S.cat === c ? 'active' : '') + '" data-action="cat" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '</div>' +
      ownerAlerts() + '<section class="today-card"><div><p class="eyebrow">PENJUALAN HARI INI</p><p class="display today-total">' + rp(r.total_sales) + '</p>' +
      '<p class="small">' + r.sale_count + ' transaksi tercatat</p></div>' +
      (isOwner() ? '<button class="btn btn-primary btn-sm" data-action="nav" data-to="laporan">Laporan</button>' : '') + '</section>' +
      '<div class="section-row"><h3 class="display section-title">' + (S.cat === 'Semua' ? 'Semua menu' : esc(S.cat)) + '</h3><span class="muted small" id="count-label"></span></div>' +
      '<div id="product-list" class="product-list">' + productList() + '</div>' + cartBar();
  }

  function filteredProducts() {
    var q = S.q.trim().toLowerCase();
    return db.products.filter(function (p) {
      return !p.archived && (S.cat === 'Semua' || p.category === S.cat) && (!q || p.name.toLowerCase().indexOf(q) >= 0);
    });
  }
  function productList() {
    var list = filteredProducts();
    if (!list.length) return '<div class="empty">' + I('bowl', 34) + '<p>Belum ada menu di kategori ini</p></div>';
    return list.map(function (p) {
      var c = S.cart.find(function (x) { return x.id === p.id; });
      var inCart = c ? c.qty : 0;
      var out = p.track_stock && p.stock <= 0;
      var stock = p.track_stock ? ' <span class="stock ' + (p.stock <= 0 ? 'danger' : p.stock <= 5 ? 'warn' : '') + '">· stok ' + p.stock + '</span>' : '';
      return '<article class="product ' + (out ? 'out' : '') + '">' +
        '<div class="product-thumb">' + I(p.icon || 'bowl', 28) + '</div>' +
        '<div class="product-info"><h4>' + esc(p.name) + '</h4><p class="product-desc">' + esc(p.description || '') + '</p>' +
        '<p class="product-price">' + rp(p.price) + stock + '</p></div>' +
        '<button class="add-btn ' + (inCart ? 'has' : '') + '" data-action="add" data-id="' + p.id + '" ' + (out ? 'disabled' : '') + ' aria-label="Tambah ' + esc(p.name) + '">' +
        (out ? '<span class="tiny">Habis</span>' : inCart ? '<span class="qty-badge">' + inCart + '</span>' : I('plus', 18)) + '</button></article>';
    }).join('');
  }
  function cartBar() {
    var t = cartTotals();
    if (!t.count) return '';
    return '<button class="cart-bar" data-action="nav" data-to="pesanan"><span>' + t.count + ' item · ' + rp(t.total) + '</span><strong>Lihat pesanan</strong></button>';
  }
  function cartRow(c, removable) {
    var p = product(c.id); var price = p ? p.price : c.price;
    return '<div class="cart-row"><div class="cart-row-info"><h4>' + esc(c.name) + '</h4><p class="muted small">' + c.qty + ' porsi · ' + rp(price * c.qty) + '</p></div>' +
      '<div class="stepper"><button class="step" data-action="dec" data-id="' + c.id + '" aria-label="Kurangi">' + I('minus', 16) + '</button>' +
      '<span class="step-qty">' + c.qty + '</span><button class="step" data-action="add" data-id="' + c.id + '" aria-label="Tambah">' + I('plus', 16) + '</button>' +
      (removable ? '<button class="step danger" data-action="remove" data-id="' + c.id + '" aria-label="Hapus">' + I('trash', 15) + '</button>' : '') + '</div></div>';
  }
  function cartPanel() {
    var t = cartTotals();
    return '<aside class="cart-panel"><h2 class="display">Pesanan saya</h2><p class="muted small">' + esc(db.settings.storeAddress || db.settings.storeName) + '</p>' +
      '<div class="cart-panel-list">' + (t.count ? S.cart.map(function (c) { return cartRow(c, false); }).join('') : '<div class="empty small">' + I('bag', 30) + '<p>Belum ada pesanan</p></div>') + '</div>' +
      '<div class="cart-panel-foot"><div class="total-row"><span class="muted">Total</span><span class="display total-big">' + rp(t.total) + '</span></div>' +
      '<button class="btn btn-primary btn-block btn-lg" data-action="nav" data-to="pesanan" ' + (t.count ? '' : 'disabled') + '>Lanjut ke pembayaran</button></div></aside>';
  }

  function quickAmounts(total) {
    var set = [total];
    [5000, 10000].forEach(function (s) { var v = Math.ceil(total / s) * s; if (v > total) set.push(v); });
    [20000, 50000, 100000].forEach(function (v) { if (v > total) set.push(v); });
    return set.filter(function (v, i) { return set.indexOf(v) === i; }).sort(function (a, b) { return a - b; }).slice(0, 4);
  }
  function canPay() { var t = cartTotals(); return t.count > 0 && (S.pm !== 'tunai' || S.paid >= t.total); }
  function changeHtml() {
    var t = cartTotals();
    if (!S.paid) return '<span class="muted">-</span>';
    return S.paid >= t.total ? '<strong class="ok">' + rp(S.paid - t.total) + '</strong>' : '<strong class="bad">Kurang ' + rp(t.total - S.paid) + '</strong>';
  }
  function viewPesanan() {
    var t = cartTotals();
    if (!t.count) return topbar('Pesanan') + '<div class="empty big">' + I('bag', 42) + '<p>Belum ada pesanan</p><button class="btn btn-outline" data-action="nav" data-to="kasir">Pilih menu</button></div>';
    var pms = [['tunai', 'cash', 'Tunai'], ['qris', 'qr', 'QRIS'], ['transfer', 'bank', 'Transfer']];
    return topbar('Pesanan') + '<div class="page narrow">' +
      '<p class="muted small">' + t.count + ' item · ' + esc(db.settings.storeName) + '</p>' +
      '<div class="card list-card">' + S.cart.map(function (c) { return cartRow(c, true); }).join('') + '</div>' +
      '<p class="label">METODE PEMBAYARAN</p><div class="pm-row">' + pms.map(function (m) {
        return '<button class="pm ' + (S.pm === m[0] ? 'active' : '') + '" data-action="pm" data-pm="' + m[0] + '">' + I(m[1], 22) + '<span>' + m[2] + '</span></button>';
      }).join('') + '</div>' +
      (S.pm === 'tunai'
        ? '<p class="label">UANG DITERIMA</p><input id="paid" class="input input-lg" inputmode="numeric" placeholder="Rp 0" value="' + (S.paid ? U.num(S.paid) : '') + '">' +
          '<div class="quick">' + quickAmounts(t.total).map(function (v) { return '<button class="chip" data-action="quick" data-v="' + v + '">' + (v === t.total ? 'Uang pas' : rp(v)) + '</button>'; }).join('') + '</div>'
        : '<div class="notice">' + I('info', 18) + '<span>' + (S.pm === 'qris' ? 'Pastikan pembayaran QRIS sudah masuk sebelum menekan Bayar.' : 'Pastikan uang transfer sudah masuk ke rekening sebelum menekan Bayar.') + '</span></div>') +
      '<p class="label">CATATAN (OPSIONAL)</p><input id="note" class="input" placeholder="Mis. meja 3, tanpa sambal" value="' + esc(S.note) + '" maxlength="120">' +
      '</div><div class="pay-foot"><div class="pay-foot-inner">' +
      '<div class="total-row"><span class="muted">Total</span><span class="display total-big">' + rp(t.total) + '</span></div>' +
      (S.pm === 'tunai' ? '<div class="total-row"><span class="muted">Kembalian</span><span id="change-val">' + changeHtml() + '</span></div>' : '') +
      '<button id="pay-btn" class="btn btn-primary btn-block btn-lg" data-action="pay" ' + (canPay() ? '' : 'disabled') + '>Bayar ' + rp(t.total) + '</button></div></div>';
  }

  function txnCard(t, opts) {
    var k = kindInfo(t);
    var title = t.kind === 'sale' ? (t.items[0] ? t.items[0].name : 'Penjualan') + (t.items.length > 1 ? ' +' + (t.items.length - 1) + ' lainnya' : '') : k.label;
    var open = opts && opts.open;
    var sub = U.dateTime(t.created_at) + ' · ' + esc(t.cashier) + (t.payment_method ? ' · ' + pmLabel(t.payment_method) : '') + (t.no ? ' · ' + t.no : '');
    var html = '<div class="txn ' + (t.voided ? 'voided' : '') + '" ' + (opts && opts.action ? 'data-action="' + opts.action + '" data-id="' + t.id + '"' : '') + '>' +
      '<div class="txn-main"><span class="badge tone-' + k.tone + '">' + I(k.icon, 18) + '</span>' +
      '<div class="txn-info"><h4>' + esc(title) + '</h4><p class="small muted">' + sub + '</p>' +
      (t.kind === 'log' || (t.note && !open) ? '<p class="small note">' + esc(t.note) + '</p>' : '') + '</div>' +
      '<div class="txn-amt"><span class="amt tone-text-' + (t.kind === 'expense' ? 'danger' : t.kind === 'closing' ? (t.diff < 0 ? 'danger' : t.diff > 0 ? 'warn' : 'ok') : 'base') + '">' + txnAmount(t) + '</span>' +
      (t.voided ? '<span class="void-tag">DIBATALKAN</span>' : '') + '</div></div>';
    if (open) {
      html += '<div class="txn-detail">';
      if (t.kind === 'sale') {
        t.items.forEach(function (it) { html += '<div class="kv"><span>' + it.qty + '× ' + esc(it.name) + '</span><span>' + rp(it.price * it.qty) + '</span></div>'; });
        html += '<div class="kv muted"><span>Modal barang (HPP)</span><span>' + rp(t.cost_total) + '</span></div>';
        html += '<div class="kv strong"><span>Laba</span><span>' + rp(t.subtotal - t.cost_total) + '</span></div>';
        if (t.payment_method === 'tunai') html += '<div class="kv muted"><span>Bayar / Kembali</span><span>' + rp(t.paid_amount) + ' / ' + rp(t.change_amount) + '</span></div>';
        html += '<div class="kv muted"><span>Struk dicetak</span><span>' + (t.prints || 0) + ' kali</span></div>';
      }
      if (t.kind === 'closing') {
        html += '<div class="kv"><span>Seharusnya</span><span>' + rp(t.expected) + '</span></div><div class="kv"><span>Dihitung</span><span>' + rp(t.actual) + '</span></div>';
      }
      if (t.note) html += '<p class="small note">Catatan: ' + esc(t.note) + '</p>';
      if (t.voided) html += '<p class="small bad">Dibatalkan oleh ' + esc(t.voided_by) + ' (' + U.dateTime(t.voided_at) + '): ' + esc(t.void_reason) + '</p>';
      html += '<div class="btn-row-inline">';
      if (t.kind === 'sale') html += '<button class="btn btn-outline btn-sm" data-action="reprint" data-id="' + t.id + '">' + I('printer', 15) + ' Struk</button>';
      if (!t.voided && isOwner() && t.kind !== 'log') html += '<button class="btn btn-danger-soft btn-sm" data-action="void" data-id="' + t.id + '">' + I('xc', 15) + ' Batalkan</button>';
      html += '</div></div>';
    }
    return html + '</div>';
  }

  function viewRiwayat() {
    var list = db.transactions.filter(function (t) { return t.kind !== 'log' && (isOwner() || t.cashier === S.user.username); }).slice().reverse().slice(0, 150);
    return topbar('Riwayat') + '<div class="page"><p class="muted small">' + (isOwner() ? 'Semua transaksi terbaru' : 'Transaksi yang Anda catat') + ' · ketuk untuk melihat struk</p>' +
      (list.length ? '<div class="txn-list">' + list.map(function (t) { return txnCard(t, { action: t.kind === 'sale' ? 'reprint' : '' }); }).join('') + '</div>'
        : '<div class="empty big">' + I('clock', 38) + '<p>Belum ada transaksi</p></div>') + '</div>';
  }

  function viewProfil() {
    var links = [['laporan', 'calendar', 'Laporan Harian'], ['audit', 'clipboard', 'Laporan Audit'], ['produk', 'box', 'Kelola Produk'], ['modal', 'card', 'Modal & Pengeluaran'], ['pengaturan', 'sliders', 'Pengaturan Lainnya']];
    return topbar('Profil') + '<div class="page narrow"><div class="profile"><div class="avatar">' + I('user', 30) + '</div>' +
      '<h2 class="display">' + esc(S.user.username) + '</h2><span class="pill">' + roleLabel(S.user.role) + '</span></div>' +
      '<div class="menu-list">' + (isOwner() ? links.map(function (l) {
        return '<button class="menu-item" data-action="nav" data-to="' + l[0] + '"><span class="drawer-icon">' + I(l[1], 18) + '</span><span>' + l[2] + '</span>' + I('right', 18) + '</button>';
      }).join('') : '') +
      '<button class="menu-item" data-action="open-password"><span class="drawer-icon">' + I('lock', 18) + '</span><span>Ganti password saya</span>' + I('right', 18) + '</button>' +
      '<button class="menu-item danger" data-action="logout"><span class="drawer-icon">' + I('logout', 18) + '</span><span>Keluar</span></button></div></div>';
  }

  function stat(label, value, icon, tone, extra) {
    return '<div class="stat"><span class="tone-text-' + (tone || 'base') + '">' + I(icon, 18) + '</span><p class="eyebrow">' + label + '</p>' +
      '<p class="stat-val tone-text-' + (tone || 'base') + '">' + rp(value) + '</p>' + (extra ? '<p class="tiny muted">' + extra + '</p>' : '') + '</div>';
  }
  function viewLaporan() {
    var d = S.reportDate, r = report(d), today = U.todayKey(), sales = r.total_sales || 1;
    return topbar('Laporan Harian', '<button class="icon-btn" data-action="export-report" aria-label="Ekspor CSV" title="Ekspor CSV">' + I('download') + '</button>') +
      '<div class="page"><div class="date-row"><button class="icon-btn" data-action="report-day" data-d="-1" aria-label="Hari sebelumnya">' + I('left') + '</button>' +
      '<div class="date-center"><p class="display">' + U.longDate(d) + '</p><input type="date" id="report-date" class="date-input" value="' + d + '" max="' + today + '"></div>' +
      '<button class="icon-btn" data-action="report-day" data-d="1" ' + (d >= today ? 'disabled' : '') + ' aria-label="Hari berikutnya">' + I('right') + '</button></div>' +
      '<section class="hero-card"><p class="eyebrow">LABA BERSIH</p><p class="display hero-val">' + rp(r.net_profit) + '</p>' +
      '<p class="small">dari ' + r.sale_count + ' transaksi · ' + r.item_count + ' item terjual</p></section>' +
      '<div class="stats">' + stat('Penjualan', r.total_sales, 'trend') + stat('Modal barang (HPP)', r.total_cost, 'box') + stat('Laba kotor', r.gross_profit, 'bar') +
      stat('Pengeluaran', r.expense_total, 'up', 'danger') + stat('Modal masuk', r.modal_in_total, 'down', 'info') + stat('Dibatalkan', r.void_total, 'xc', 'warn', r.void_count + ' transaksi') + '</div>' +
      '<div class="two-col"><div><p class="label">METODE PEMBAYARAN</p><div class="card">' + ['tunai', 'qris', 'transfer'].map(function (m) {
        var v = r.by_method[m] || 0, pct = Math.round(v / sales * 100);
        return '<div class="bar-item"><div class="kv"><span><b>' + pmLabel(m) + '</b></span><span class="muted">' + rp(v) + ' · ' + pct + '%</span></div><div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';
      }).join('') + '</div>' +
      '<p class="label">PRODUK TERLARIS</p><div class="card">' + (r.top_products.length ? r.top_products.map(function (p, i) {
        return '<div class="kv"><span>' + (i + 1) + '. ' + esc(p.name) + '</span><span class="muted">' + p.qty + ' porsi</span></div>';
      }).join('') : '<p class="muted small">Belum ada penjualan</p>') + '</div></div>' +
      '<div><p class="label">CEK UANG DI LACI (TUTUP KAS)</p><div class="card">' +
      '<div class="kv"><span>Modal masuk</span><span>' + rp(r.modal_in_total) + '</span></div>' +
      '<div class="kv"><span>+ Penjualan tunai</span><span>' + rp(r.by_method.tunai) + '</span></div>' +
      '<div class="kv"><span>− Pengeluaran</span><span>' + rp(r.expense_total) + '</span></div>' +
      '<div class="kv strong divider-top"><span>Seharusnya ada di laci</span><span>' + rp(r.expected_cash) + '</span></div>' +
      r.closings.map(function (c) {
        return '<div class="closing tone-bg-' + (c.diff === 0 ? 'ok' : c.diff < 0 ? 'danger' : 'warn') + '">' + U.time(c.created_at) + ' · dihitung ' + rp(c.actual) + ' → <b>' + txnAmount(c) + '</b>' + (c.note ? '<br><span class="small">' + esc(c.note) + '</span>' : '') + '</div>';
      }).join('') +
      (d === today ? '<form class="closing-form" data-form="closing"><input name="actual" class="input" inputmode="numeric" placeholder="Jumlah uang yang dihitung" required>' +
        '<input name="note" class="input" placeholder="Catatan (opsional)" maxlength="120"><button class="btn btn-primary" type="submit">Simpan hasil hitung</button></form>' : '') +
      '<p class="tiny muted">Selisih minus berarti ada uang yang hilang atau belum dicatat.</p></div></div></div></div>';
  }

  function viewAudit() {
    var filters = [['all', 'Semua'], ['sale', 'Penjualan'], ['modal_in', 'Modal'], ['expense', 'Pengeluaran'], ['closing', 'Tutup Kas'], ['voided', 'Dibatalkan'], ['log', 'Catatan Sistem']];
    var q = S.auditQ.trim().toLowerCase();
    var list = db.transactions.filter(function (t) {
      if (S.auditFilter === 'voided') { if (!t.voided) return false; }
      else if (S.auditFilter !== 'all' && t.kind !== S.auditFilter) return false;
      if (!q) return true;
      return [(t.no || ''), t.cashier, t.note || '', (t.items || []).map(function (i) { return i.name; }).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0;
    }).slice().reverse();
    return topbar('Laporan Audit', '<button class="icon-btn" data-action="export-audit" aria-label="Ekspor CSV" title="Ekspor semua ke CSV">' + I('download') + '</button>') +
      '<div class="chips sticky-chips">' + filters.map(function (f) { return '<button class="chip ' + (S.auditFilter === f[0] ? 'active' : '') + '" data-action="audit-filter" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div class="page"><label class="search">' + I('search', 18) + '<input id="audit-q" type="search" placeholder="Cari no. struk, kasir, produk, catatan" value="' + esc(S.auditQ) + '"></label>' +
      '<p class="muted small">' + list.length + ' catatan · ketuk untuk melihat rincian. Transaksi tidak bisa dihapus, hanya dibatalkan dengan alasan.</p>' +
      (list.length ? '<div class="txn-list">' + list.slice(0, 300).map(function (t) { return txnCard(t, { action: 'audit-open', open: S.auditOpen === t.id }); }).join('') + '</div>'
        : '<div class="empty big">' + I('clipboard', 38) + '<p>Tidak ada data</p></div>') + '</div>';
  }

  function viewProduk() {
    var list = db.products.filter(function (p) { return !p.archived; });
    return topbar('Kelola Produk') + '<div class="page">' +
      '<p class="label">KATEGORI</p><div class="cat-row">' + db.categories.map(function (c) {
        return '<span class="chip static">' + esc(c) + '<button class="chip-x" data-action="del-cat" data-cat="' + esc(c) + '" aria-label="Hapus kategori ' + esc(c) + '">' + I('x', 14) + '</button></span>';
      }).join('') + '</div>' +
      '<form class="inline-form" data-form="category"><input name="name" class="input" placeholder="Kategori baru" maxlength="30" required><button class="btn btn-outline" type="submit">' + I('plus', 16) + ' Tambah</button></form>' +
      '<p class="label">PRODUK (' + list.length + ')</p><div class="txn-list">' + (list.length ? list.map(function (p) {
        return '<div class="txn"><div class="txn-main"><span class="product-thumb sm">' + I(p.icon || 'bowl', 22) + '</span>' +
          '<div class="txn-info"><h4>' + esc(p.name) + '</h4><p class="small muted">' + esc(p.category) + ' · jual ' + rp(p.price) + ' · modal ' + rp(p.cost) + ' · ' + (p.track_stock ? 'stok ' + p.stock : 'stok tidak dilacak') + '</p></div>' +
          '<div class="row-actions"><button class="step" data-action="edit-product" data-id="' + p.id + '" aria-label="Ubah">' + I('edit', 16) + '</button>' +
          '<button class="step danger" data-action="del-product" data-id="' + p.id + '" aria-label="Hapus">' + I('trash', 16) + '</button></div></div></div>';
      }).join('') : '<div class="empty">' + I('box', 32) + '<p>Belum ada produk</p></div>') + '</div></div>' +
      '<button class="fab" data-action="edit-product" data-id="" aria-label="Tambah produk">' + I('plus', 24) + '</button>';
  }

  function viewModal() {
    var today = U.todayKey();
    var list = db.transactions.filter(function (t) { return (t.kind === 'modal_in' || t.kind === 'expense') && U.dateKey(t.created_at) === today; }).slice().reverse();
    return topbar('Modal & Pengeluaran') + '<div class="page narrow">' +
      '<p class="muted">Catat setiap uang yang masuk sebagai modal dan setiap uang yang keluar untuk belanja atau operasional, supaya laba bersih dan uang di laci selalu cocok.</p>' +
      '<div class="seg">' + [['modal_in', 'down', 'Modal Masuk'], ['expense', 'up', 'Pengeluaran']].map(function (k) {
        return '<button type="button" class="seg-btn ' + (S.modalKind === k[0] ? 'active' : '') + '" data-action="modal-kind" data-k="' + k[0] + '">' + I(k[1], 16) + ' ' + k[2] + '</button>';
      }).join('') + '</div>' +
      '<form data-form="modal" class="stack"><label class="field"><span>JUMLAH</span><input name="amount" class="input input-lg" inputmode="numeric" placeholder="Rp 0" required></label>' +
      '<label class="field"><span>KETERANGAN</span><input name="note" class="input" maxlength="120" required placeholder="' + (S.modalKind === 'modal_in' ? 'Mis. modal awal laci hari ini' : 'Mis. beli gas & bahan baku di pasar') + '"></label>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Simpan catatan</button></form>' +
      '<p class="label">HARI INI</p>' + (list.length ? '<div class="txn-list">' + list.map(function (t) { return txnCard(t); }).join('') + '</div>' : '<p class="muted small">Belum ada catatan hari ini.</p>') + '</div>';
  }

  function viewPengaturan() {
    var st = db.settings;
    return topbar('Pengaturan') + '<div class="page narrow">' +
      '<p class="label">INFORMASI TOKO (TAMPIL DI STRUK)</p><form class="card stack" data-form="settings">' +
      '<label class="field"><span>Nama toko</span><input name="storeName" class="input" value="' + esc(st.storeName) + '" maxlength="40" required></label>' +
      '<label class="field"><span>Alamat / lokasi</span><input name="storeAddress" class="input" value="' + esc(st.storeAddress) + '" maxlength="80"></label>' +
      '<label class="field"><span>Pesan di bawah struk</span><input name="receiptFooter" class="input" value="' + esc(st.receiptFooter) + '" maxlength="80"></label>' +
      '<button class="btn btn-primary" type="submit">Simpan</button></form>' +
      (Cloud.enabled ? usersCardCloud() : '<p class="label">PENGGUNA</p><div class="card">' + db.users.map(function (u) {
        return '<div class="kv user-row"><span><b>' + esc(u.username) + '</b> <span class="pill sm">' + roleLabel(u.role) + '</span></span><span class="row-actions">' +
          '<button class="btn btn-outline btn-sm" data-action="reset-pw" data-u="' + esc(u.username) + '">Ganti password</button>' +
          (u.username !== S.user.username ? '<button class="step danger" data-action="del-user" data-u="' + esc(u.username) + '" aria-label="Hapus pengguna">' + I('trash', 15) + '</button>' : '') + '</span></div>';
      }).join('') +
      '<form class="inline-form" data-form="add-user"><input name="username" class="input" placeholder="username kasir baru" pattern="[A-Za-z0-9_.\\-]{3,20}" required>' +
      '<input name="password" class="input" type="password" placeholder="password (min. 6)" minlength="6" required><button class="btn btn-outline" type="submit">Tambah kasir</button></form></div>') +
      offlineCard() + '<p class="label">CADANGAN DATA</p><div class="card stack">' +
      '<p class="small muted">' + backupInfo() + ' Data tersimpan di browser perangkat ini. Unduh cadangan secara rutin (mis. setiap tutup toko) agar data aman jika browser dibersihkan atau pindah perangkat.</p>' +
      '<button class="btn btn-primary" data-action="backup">' + I('download', 18) + ' Unduh cadangan (.json)</button>' +
      (Cloud.enabled ? '<label class="btn btn-outline file-btn">' + I('upload', 18) + ' Impor data lama ke cloud<input type="file" id="import-file" accept="application/json,.json" hidden></label>'
        : '<label class="btn btn-outline file-btn">' + I('upload', 18) + ' Pulihkan dari cadangan<input type="file" id="restore-file" accept="application/json,.json" hidden></label>') +
      (Cloud.enabled ? '' : '<button class="btn btn-danger-soft" data-action="reset-all">' + I('trash', 18) + ' Hapus semua data & mulai dari awal</button>') + '</div>' +
      (Cloud.enabled ? '<p class="tiny muted center">Kantin Insya v1.2 · mode cloud · ' + db.transactions.length + ' catatan (' + Cloud.historyDays + ' hari terakhir)</p></div>' : '<p class="tiny muted center">Kantin Insya v1.1 · ' + db.transactions.length + ' catatan · penyimpanan ±' + Store.sizeKB() + ' KB dari ±5.000 KB</p></div>');
  }

  function tabbar(r) {
    var tabs = [['kasir', 'grid', 'Menu'], ['pesanan', 'bag', 'Pesanan'], ['riwayat', 'clock', 'Riwayat'], ['profil', 'user', 'Profil']];
    var count = cartTotals().count;
    return '<nav class="tabbar">' + tabs.map(function (t) {
      return '<button class="tab ' + (r === t[0] ? 'active' : '') + '" data-action="nav" data-to="' + t[0] + '">' + I(t[1], 22) +
        (t[0] === 'pesanan' && count ? '<span class="tab-badge">' + count + '</span>' : '') + '<span>' + t[2] + '</span></button>';
    }).join('') + '</nav>';
  }

  /* ---------------- Overlay: drawer & sheet ---------------- */
  function drawerHtml() {
    var r = route(), owner = isOwner();
    var items = [['kasir', 'calc', 'Kasir', true], ['riwayat', 'clock', 'Riwayat', true], ['laporan', 'calendar', 'Laporan Harian', owner], ['audit', 'clipboard', 'Laporan Audit', owner], ['produk', 'box', 'Produk', owner], ['modal', 'card', 'Modal', owner]];
    return '<div class="backdrop" data-action="drawer-close"></div><nav class="drawer" aria-label="Menu utama"><div class="drawer-head">' + brand('left') +
      '<button class="icon-btn" data-action="drawer-close" aria-label="Tutup menu">' + I('x') + '</button></div><p class="eyebrow">MENU</p><div class="drawer-list">' +
      items.filter(function (i) { return i[3]; }).map(function (i) {
        return '<button class="drawer-item ' + (r === i[0] ? 'active' : '') + '" data-action="nav" data-to="' + i[0] + '"><span class="drawer-icon">' + I(i[1], 18) + '</span>' + i[2] + '</button>';
      }).join('') +
      (owner ? '<hr><button class="drawer-item ' + (r === 'pengaturan' ? 'active' : '') + '" data-action="nav" data-to="pengaturan"><span class="drawer-icon">' + I('sliders', 18) + '</span>Pengaturan Lainnya</button>' : '') +
      '</div><div class="drawer-foot"><p class="small muted">Masuk sebagai <b>' + esc(S.user.username) + '</b> (' + roleLabel(S.user.role) + ')</p>' + (Cloud.enabled ? '<p class="tiny muted" data-sync>' + esc(Cloud.statusText()) + '</p>' : '') +
      '<button class="drawer-item" data-action="logout"><span class="drawer-icon">' + I('logout', 18) + '</span>Keluar</button></div></nav>';
  }

  function sheetHtml(sh) {
    var body = '';
    if (sh.type === 'receipt') {
      var t = sh.txn;
      body = (sh.reprint ? '<h3 class="display">Struk ' + esc(t.no) + '</h3><p class="muted small">' + U.dateTime(t.created_at) + ' · ' + rp(t.subtotal) + ' · ' + pmLabel(t.payment_method) + '</p>'
        : '<div class="success-badge">' + I('check', 30) + '</div><h3 class="display">Pembayaran Berhasil!</h3><p class="muted small">' + esc(t.no) + ' · Total ' + rp(t.subtotal) + ' · ' + pmLabel(t.payment_method) + '</p>' +
          (t.payment_method === 'tunai' ? '<div class="change-box"><span class="eyebrow">KEMBALIAN</span><span class="display change-big">' + rp(t.change_amount) + '</span></div>' : '')) +
        '<div class="receipt-preview">' + receiptHtml(t) + '</div>' +
        '<p class="q">' + (sh.reprint ? 'Cetak ulang akan tercatat di audit.' : 'Cetak struk sekarang?') + '</p>' +
        '<div class="btn-row"><button class="btn btn-primary" data-action="print-receipt" data-id="' + t.id + '">' + I('printer', 18) + ' Cetak Struk</button>' +
        '<button class="btn btn-outline" data-action="share-receipt" data-id="' + t.id + '">' + I('share', 18) + ' Bagikan</button></div>' +
        '<button class="link-btn" data-action="close-sheet">' + (sh.reprint ? 'Tutup' : 'Lewati') + '</button>';
    } else if (sh.type === 'confirm') {
      body = '<h3 class="display">' + esc(sh.title) + '</h3><p class="muted">' + esc(sh.message) + '</p>' +
        '<form data-form="confirm" class="stack">' + (sh.reason ? '<input name="reason" class="input" placeholder="' + esc(sh.reasonPlaceholder || 'Alasan (wajib, tercatat di audit)') + '" minlength="3" required>' : '') +
        '<div class="btn-row"><button type="button" class="btn btn-outline" data-action="close-sheet">Batal</button><button type="submit" class="btn btn-danger">' + esc(sh.confirmLabel) + '</button></div></form>';
    } else if (sh.type === 'product') {
      var p = sh.id ? product(sh.id) : null;
      p = p || { name: '', category: db.categories[0] || '', price: '', cost: '', stock: 0, track_stock: true, description: '', icon: 'bowl' };
      body = '<h3 class="display">' + (sh.id ? 'Ubah Produk' : 'Tambah Produk') + '</h3><form data-form="product" class="stack">' +
        '<label class="field"><span>Nama produk</span><input name="name" class="input" value="' + esc(p.name) + '" maxlength="40" required></label>' +
        '<label class="field"><span>Kategori</span><select name="category" class="input" required>' + db.categories.map(function (c) { return '<option ' + (c === p.category ? 'selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
        '<div class="grid2"><label class="field"><span>Harga jual (Rp)</span><input name="price" class="input" inputmode="numeric" value="' + (p.price ? U.num(p.price) : '') + '" required></label>' +
        '<label class="field"><span>Modal / HPP (Rp)</span><input name="cost" class="input" inputmode="numeric" value="' + (p.cost ? U.num(p.cost) : '') + '"></label></div>' +
        '<div class="grid2"><label class="field"><span>Stok</span><input name="stock" class="input" inputmode="numeric" value="' + (p.stock || 0) + '"></label>' +
        '<label class="field"><span>Ikon</span><select name="icon" class="input">' + [['bowl', 'Makanan'], ['cup', 'Minuman dingin'], ['coffee', 'Minuman panas']].map(function (o) { return '<option value="' + o[0] + '" ' + (o[0] === p.icon ? 'selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="check"><input type="checkbox" name="track_stock" ' + (p.track_stock ? 'checked' : '') + '> Lacak stok (tidak bisa dijual saat stok habis)</label>' +
        '<label class="field"><span>Deskripsi</span><input name="description" class="input" value="' + esc(p.description) + '" maxlength="80"></label>' +
        (sh.id ? '<p class="tiny muted">Perubahan harga dan stok tercatat otomatis di Laporan Audit.</p>' : '') +
        '<div class="btn-row"><button type="button" class="btn btn-outline" data-action="close-sheet">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div></form>';
    } else if (sh.type === 'password') {
      body = '<h3 class="display">Ganti password</h3><p class="muted small">Untuk pengguna <b>' + esc(sh.username) + '</b></p><form data-form="password" class="stack">' +
        (sh.self ? '<label class="field"><span>Password lama</span><input name="old" type="password" class="input" required></label>' : '') +
        '<label class="field"><span>Password baru (min. 6 karakter)</span><input name="pw" type="password" class="input" minlength="6" required></label>' +
        '<label class="field"><span>Ulangi password baru</span><input name="pw2" type="password" class="input" minlength="6" required></label>' +
        '<div class="btn-row"><button type="button" class="btn btn-outline" data-action="close-sheet">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div></form>';
    }
    return '<div class="backdrop" data-action="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div>' + body + '</div>';
  }

  function receiptHtml(t) {
    var st = db.settings;
    var h = '<div class="receipt"><div class="r-center r-title">' + esc(st.storeName.toUpperCase()) + '</div>' +
      (st.storeAddress ? '<div class="r-center r-muted">' + esc(st.storeAddress) + '</div>' : '') + '<div class="r-hr"></div>' +
      '<div class="r-row"><span>' + esc(t.no) + '</span><span>' + U.dateTime(t.created_at) + '</span></div>' +
      '<div class="r-row"><span>Kasir: ' + esc(t.cashier) + '</span><span>' + pmLabel(t.payment_method) + '</span></div><div class="r-hr"></div>';
    t.items.forEach(function (it) {
      h += '<div class="r-item">' + esc(it.name) + '</div><div class="r-row"><span>&nbsp;&nbsp;' + it.qty + ' x ' + U.num(it.price) + '</span><span>' + U.num(it.price * it.qty) + '</span></div>';
    });
    h += '<div class="r-hr"></div><div class="r-row r-bold"><span>TOTAL</span><span>' + rp(t.subtotal) + '</span></div>';
    if (t.payment_method === 'tunai') h += '<div class="r-row"><span>Bayar</span><span>' + rp(t.paid_amount) + '</span></div><div class="r-row"><span>Kembali</span><span>' + rp(t.change_amount) + '</span></div>';
    if (t.note) h += '<div class="r-muted">Catatan: ' + esc(t.note) + '</div>';
    if (t.voided) h += '<div class="r-center r-bold">*** DIBATALKAN ***</div>';
    if ((t.prints || 0) > 0) h += '<div class="r-center r-muted">Cetak ulang ke-' + t.prints + '</div>';
    return h + '<div class="r-hr"></div><div class="r-center r-muted">' + esc(st.receiptFooter || '') + '</div></div>';
  }
  function receiptText(t) {
    var st = db.settings, lines = [st.storeName, st.storeAddress || '', t.no + ' · ' + U.dateTime(t.created_at), 'Kasir: ' + t.cashier + ' · ' + pmLabel(t.payment_method), '------------------------'];
    t.items.forEach(function (it) { lines.push(it.qty + 'x ' + it.name + '  ' + rp(it.price * it.qty)); });
    lines.push('------------------------', 'TOTAL ' + rp(t.subtotal));
    if (t.payment_method === 'tunai') lines.push('Bayar ' + rp(t.paid_amount), 'Kembali ' + rp(t.change_amount));
    lines.push('', st.receiptFooter || '');
    return lines.filter(function (l, i) { return l !== '' || i > 4; }).join('\n');
  }

  /* ---------------- Render ---------------- */
  function viewBoot() {
    return '<div class="login"><div class="login-hero"><div class="login-scrim"></div>' + brand('light') + '</div><div class="login-body"><p class="muted center">' +
      (S.fatal ? esc(S.fatal) : 'Memuat…') + '</p>' + (S.fatal ? '<button class="btn btn-primary btn-block" data-action="reload">Coba lagi</button>' : '') + '</div></div>';
  }
  function viewSetup() {
    return '<div class="login"><div class="login-hero"><div class="login-scrim"></div>' + brand('light') + '</div>' +
      '<form class="login-body" data-form="setup" autocomplete="off"><h1 class="display login-title">Siapkan toko</h1>' +
      '<p class="muted">Buat akun pemilik. Lakukan ini sekali saja, sebelum orang lain membuka aplikasi.</p>' +
      '<label class="field"><span>Nama toko</span><input class="line-input" name="store" value="Kantin Insya" required></label>' +
      '<label class="field"><span>Username pemilik</span><input class="line-input" name="username" value="owner" pattern="[a-z0-9_.\\-]{3,20}" autocapitalize="none" required></label>' +
      '<label class="field"><span>Password (min. 6 karakter)</span><input class="line-input" name="password" type="password" minlength="6" required></label>' +
      '<label class="field"><span>Ulangi password</span><input class="line-input" name="password2" type="password" minlength="6" required></label>' +
      '<label class="check"><input type="checkbox" name="sample" checked> Isi contoh menu (bisa dihapus nanti)</label>' +
      '<p class="error-text" id="login-error"></p>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Buat akun pemilik</button>' +
      '<button type="button" class="link-btn center" data-action="close-setup">Kembali ke halaman masuk</button></form></div>';
  }
  function render() {
    var r = route();
    renderPending = false;
    if (S.booting || S.fatal) { document.body.dataset.route = 'login'; app.innerHTML = viewBoot(); overlay.innerHTML = ''; return; }
    if (!S.user) {
      document.body.dataset.route = 'login';
      app.innerHTML = S.setup ? viewSetup() : viewLogin();
      overlay.innerHTML = '';
      return;
    }
    if (OWNER_ROUTES.indexOf(r) >= 0 && !isOwner()) { location.hash = '#/kasir'; return; }
    var views = { kasir: viewKasir, pesanan: viewPesanan, riwayat: viewRiwayat, profil: viewProfil, laporan: viewLaporan, audit: viewAudit, produk: viewProduk, modal: viewModal, pengaturan: viewPengaturan };
    if (!views[r]) r = 'kasir';
    document.body.dataset.route = r;
    app.innerHTML = '<div class="shell ' + (r === 'kasir' ? 'with-cart' : '') + '"><main class="main">' + views[r]() + '</main>' + (r === 'kasir' ? cartPanel() : '') + '</div>' + tabbar(r);
    renderOverlay();
  }
  function renderOverlay() {
    var html = '';
    if (S.drawer && S.user) html += drawerHtml();
    if (S.sheet) html += sheetHtml(S.sheet);
    overlay.innerHTML = html;
    document.body.classList.toggle('no-scroll', !!(S.drawer || S.sheet));
    var first = overlay.querySelector('.sheet input:not([type=checkbox]), .sheet select');
    if (first && S.sheet && S.sheet.type !== 'receipt') setTimeout(function () { first.focus(); }, 50);
  }
  function refreshKasirParts() {
    var list = document.getElementById('product-list');
    if (list) list.innerHTML = productList();
  }

  /* ---------------- Aksi ---------------- */
  function addToCart(id) {
    var p = product(id); if (!p) return;
    var c = S.cart.find(function (x) { return x.id === id; });
    var qty = c ? c.qty : 0;
    if (p.track_stock && qty + 1 > p.stock) { toast('Stok ' + p.name + ' tinggal ' + p.stock, 'error'); return; }
    if (c) c.qty++; else S.cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  }
  function doPay() {
    if (!canPay()) return;
    var items = [], subtotal = 0, cost = 0;
    for (var i = 0; i < S.cart.length; i++) {
      var c = S.cart[i], p = product(c.id);
      if (!p) { toast('Produk ' + c.name + ' sudah dihapus', 'error'); return; }
      if (p.track_stock && p.stock < c.qty) { toast('Stok ' + p.name + ' tinggal ' + p.stock, 'error'); return; }
      items.push({ product_id: p.id, name: p.name, price: p.price, cost: p.cost || 0, qty: c.qty });
      subtotal += p.price * c.qty; cost += (p.cost || 0) * c.qty;
    }
    var paid = S.pm === 'tunai' ? S.paid : subtotal;
    var t = { id: U.uid(), no: nextNo(), kind: 'sale', created_at: new Date().toISOString(), cashier: S.user.username, items: items, subtotal: subtotal, cost_total: cost, payment_method: S.pm, paid_amount: paid, change_amount: S.pm === 'tunai' ? paid - subtotal : 0, note: S.note.trim(), prints: 0, voided: false };
    items.forEach(function (it) { var p = product(it.product_id); if (p.track_stock) p.stock -= it.qty; });
    db.transactions.push(t);
    if (!Store.save()) {
      db.transactions.pop(); db.seq = Math.max(0, (db.seq || 1) - 1);
      items.forEach(function (it) { var p = product(it.product_id); if (p.track_stock) p.stock += it.qty; });
      toast('Transaksi gagal disimpan: penyimpanan penuh. Unduh cadangan dulu.', 'error');
      return;
    }
    S.cart = []; S.paid = 0; S.note = ''; S.pm = 'tunai';
    S.sheet = { type: 'receipt', txn: t, after: 'kasir' };
    render();
  }
  function printReceipt(t) {
    printArea.innerHTML = receiptHtml(t);
    t.prints = (t.prints || 0) + 1;
    if (t.prints > 1) logEvent('Struk ' + t.no + ' dicetak ulang (ke-' + t.prints + ')');
    save();
    setTimeout(function () { window.print(); }, 50);
  }
  function shareReceipt(t) {
    var text = receiptText(t);
    if (navigator.share) {
      navigator.share({ title: 'Struk ' + t.no, text: text }).catch(function () {});
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('Struk disalin, tinggal tempel di WhatsApp', 'ok'); }, function () { U.download(t.no + '.txt', text); });
    } else {
      U.download(t.no + '.txt', text);
      toast('Struk diunduh sebagai file teks', 'ok');
    }
  }
  function closeSheet() {
    var after = S.sheet && S.sheet.after;
    S.sheet = null;
    if (after) go(after); else renderOverlay();
  }
  function logout() {
    if (Cloud.enabled) { Cloud.signOut().catch(function () {}); return; }   /* keadaan layar diatur ulang oleh onAuthChange */
    S.user = null; S.drawer = false; S.sheet = null; S.cart = [];
    localStorage.removeItem(Store.SESSION_KEY);
    location.hash = '#/kasir';
    render();
  }
  function exportReport() {
    var d = S.reportDate, r = report(d);
    var rows = [['Laporan Harian ' + db.settings.storeName], ['Tanggal', d], [], ['Metrik', 'Nilai (Rp)'],
      ['Penjualan', r.total_sales], ['Modal barang (HPP)', r.total_cost], ['Laba kotor', r.gross_profit], ['Pengeluaran', r.expense_total],
      ['Laba bersih', r.net_profit], ['Modal masuk', r.modal_in_total], ['Uang seharusnya di laci', r.expected_cash], ['Jumlah transaksi', r.sale_count],
      ['Item terjual', r.item_count], ['Transaksi dibatalkan', r.void_count], ['Nilai dibatalkan', r.void_total], [], ['Metode', 'Total (Rp)']];
    ['tunai', 'qris', 'transfer'].forEach(function (m) { rows.push([pmLabel(m), r.by_method[m] || 0]); });
    rows.push([], ['Produk terlaris', 'Qty']);
    r.top_products.forEach(function (p) { rows.push([p.name, p.qty]); });
    rows.push([], ['Rincian transaksi'], ['Waktu', 'No', 'Jenis', 'Kasir', 'Metode', 'Item', 'Jumlah', 'HPP', 'Catatan', 'Status']);
    db.transactions.filter(function (t) { return U.dateKey(t.created_at) === d && t.kind !== 'log'; }).forEach(function (t) { rows.push(txnRow(t)); });
    U.download('laporan-' + d + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
    toast('Laporan CSV diunduh', 'ok');
  }
  function txnRow(t) {
    var amount = t.kind === 'sale' ? t.subtotal : t.kind === 'closing' ? t.diff : (t.amount || '');
    var note = t.kind === 'closing' ? 'Seharusnya ' + t.expected + ', dihitung ' + t.actual + (t.note ? '. ' + t.note : '') : (t.note || '');
    return [U.dateTime(t.created_at), t.no || '', kindInfo(t).label, t.cashier, t.payment_method ? pmLabel(t.payment_method) : '',
      (t.items || []).map(function (i) { return i.qty + 'x ' + i.name; }).join('; '), amount, t.cost_total || '', note,
      t.voided ? 'DIBATALKAN: ' + t.void_reason + ' (' + t.voided_by + ')' : 'OK'];
  }
  function exportAudit() {
    var rows = [['Waktu', 'No', 'Jenis', 'Kasir', 'Metode', 'Item', 'Jumlah', 'HPP', 'Catatan', 'Status']];
    db.transactions.slice().reverse().forEach(function (t) { rows.push(txnRow(t)); });
    U.download('audit-' + U.todayKey() + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
    toast('Audit CSV diunduh', 'ok');
  }
  function confirmSheet(opts) { S.sheet = Object.assign({ type: 'confirm' }, opts); renderOverlay(); }

  var actions = {
    nav: function (d) { S.drawer = false; S.sheet = null; if (d.to === 'laporan') S.reportDate = U.todayKey(); renderOverlay(); go(d.to); window.scrollTo(0, 0); },
    drawer: function () { S.drawer = true; renderOverlay(); },
    'drawer-close': function () { S.drawer = false; renderOverlay(); },
    'login-role': function (d) {
      S.loginRole = d.role;
      document.querySelectorAll('.seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.role === d.role); });
      var u = document.querySelector('[name=username]'); if (u) u.value = d.role === 'owner' ? 'owner' : 'kasir';
      var pw = document.querySelector('[name=password]'); if (pw) { pw.value = ''; pw.focus(); }
    },
    cat: function (d) { S.cat = d.cat; render(); },
    add: function (d) { addToCart(d.id); render(); },
    dec: function (d) {
      var c = S.cart.find(function (x) { return x.id === d.id; }); if (!c) return;
      c.qty--; if (c.qty <= 0) S.cart = S.cart.filter(function (x) { return x.id !== d.id; });
      render();
    },
    remove: function (d) { S.cart = S.cart.filter(function (x) { return x.id !== d.id; }); render(); },
    pm: function (d) { S.pm = d.pm; render(); },
    quick: function (d) { S.paid = +d.v; render(); },
    pay: doPay,
    'close-sheet': closeSheet,
    'print-receipt': function (d) { var t = db.transactions.find(function (x) { return x.id === d.id; }); if (t) { printReceipt(t); renderOverlay(); } },
    'share-receipt': function (d) { var t = db.transactions.find(function (x) { return x.id === d.id; }); if (t) shareReceipt(t); },
    reprint: function (d) { var t = db.transactions.find(function (x) { return x.id === d.id; }); if (t && t.kind === 'sale') { S.sheet = { type: 'receipt', txn: t, reprint: true }; renderOverlay(); } },
    logout: function () {
      if (!Cloud.enabled) { logout(); return; }
      confirmSheet({ title: 'Keluar dari akun?', message: (Cloud.status === 'pending' ? 'Masih ada data yang belum terkirim ke cloud. Masuk lagi dengan akun yang sama saat online agar data itu terkirim. ' : '') + 'Untuk masuk lagi di HP ini Anda butuh internet.', confirmLabel: 'Keluar', act: 'logout-cloud' });
    },
    'open-setup': function () { S.setup = true; render(); },
    'close-setup': function () { S.setup = false; render(); },
    reload: function () { location.reload(); },
    'toggle-user': function (d) {
      Cloud.setUserActive(d.uid, d.active === 'true').then(function () { toast(d.active === 'true' ? 'Akun diaktifkan' : 'Akun dinonaktifkan', 'ok'); }).catch(function (e) { toast(cloudErr(e), 'error'); });
    },
    'open-password': function () { S.sheet = { type: 'password', username: S.user.username, self: true }; renderOverlay(); },
    'report-day': function (d) { var n = U.shiftDay(S.reportDate, +d.d); if (n <= U.todayKey()) { S.reportDate = n; render(); } },
    'install-app': function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; render(); });
    },
    'export-report': exportReport,
    'export-audit': exportAudit,
    'audit-filter': function (d) { S.auditFilter = d.f; S.auditOpen = null; render(); },
    'audit-open': function (d, el, e) { if (e.target.closest('button')) return; S.auditOpen = S.auditOpen === d.id ? null : d.id; render(); },
    void: function (d) {
      var t = db.transactions.find(function (x) { return x.id === d.id; }); if (!t) return;
      confirmSheet({ title: 'Batalkan ' + (t.no || kindInfo(t).label) + '?', message: 'Catatan tidak dihapus, tetapi ditandai dibatalkan dan tidak dihitung di laporan.' + (t.kind === 'sale' ? ' Stok akan dikembalikan.' : ''), reason: true, confirmLabel: 'Batalkan', act: 'void', id: t.id });
    },
    'edit-product': function (d) { S.sheet = { type: 'product', id: d.id || null }; renderOverlay(); },
    'del-product': function (d) {
      var p = product(d.id); if (!p) return;
      confirmSheet({ title: 'Hapus produk?', message: '"' + p.name + '" tidak akan tampil lagi di kasir. Riwayat penjualannya tetap tersimpan.', confirmLabel: 'Hapus', act: 'del-product', id: p.id });
    },
    'del-cat': function (d) {
      var used = db.products.some(function (p) { return !p.archived && p.category === d.cat; });
      if (used) { toast('Kategori masih dipakai produk. Pindahkan produknya dulu.', 'error'); return; }
      confirmSheet({ title: 'Hapus kategori?', message: 'Kategori "' + d.cat + '" akan dihapus.', confirmLabel: 'Hapus', act: 'del-cat', id: d.cat });
    },
    'modal-kind': function (d) { S.modalKind = d.k; render(); },
    'reset-pw': function (d) { S.sheet = { type: 'password', username: d.u, self: d.u === S.user.username }; renderOverlay(); },
    'del-user': function (d) { confirmSheet({ title: 'Hapus pengguna?', message: 'Pengguna "' + d.u + '" tidak bisa masuk lagi. Riwayat transaksinya tetap tersimpan.', confirmLabel: 'Hapus', act: 'del-user', id: d.u }); },
    backup: function () {
      U.download('kantin-insya-cadangan-' + U.todayKey() + '.json', JSON.stringify(db, null, 1), 'application/json');
      db.settings.lastBackup = new Date().toISOString(); save();
      toast('Cadangan diunduh', 'ok');
    },
    'reset-all': function () { confirmSheet({ title: 'Hapus semua data?', message: 'Semua produk, transaksi, dan pengguna akan kembali ke awal. Ketik HAPUS untuk melanjutkan. Unduh cadangan dulu jika perlu.', reason: true, reasonPlaceholder: 'Ketik HAPUS', confirmLabel: 'Hapus semua', act: 'reset-all' }); }
  };

  var confirmActs = {
    void: function (id, reason) {
      var t = db.transactions.find(function (x) { return x.id === id; }); if (!t || t.voided) return;
      t.voided = true; t.void_reason = reason; t.voided_by = S.user.username; t.voided_at = new Date().toISOString();
      if (t.kind === 'sale') t.items.forEach(function (it) { var p = product(it.product_id); if (p && p.track_stock) p.stock += it.qty; });
      save(); toast('Transaksi dibatalkan & tercatat', 'ok');
    },
    'del-product': function (id) { var p = product(id); if (!p) return; p.archived = true; logEvent('Produk dihapus: ' + p.name); save(); toast('Produk dihapus', 'ok'); },
    'del-cat': function (cat) { db.categories = db.categories.filter(function (c) { return c !== cat; }); if (S.cat === cat) S.cat = 'Semua'; save(); },
    'logout-cloud': function () { logout(); },
    'import-cloud': function (d) {
      toast('Mengimpor… jangan tutup aplikasi', '');
      Cloud.importBackup(d).then(function () { toast('Impor selesai', 'ok'); }).catch(function (e) { toast(cloudErr(e), 'error'); });
    },
    'del-user': function (u) { db.users = db.users.filter(function (x) { return x.username !== u; }); logEvent('Pengguna dihapus: ' + u); save(); toast('Pengguna dihapus', 'ok'); },
    'reset-all': function (_, reason) {
      if (reason !== 'HAPUS') { toast('Ketik HAPUS dengan huruf besar', 'error'); return false; }
      db = Store.reset(); logout(); toast('Data direset', 'ok');
    }
  };

  /* ---------------- Formulir ---------------- */
  var forms = {
    setup: function (f) {
      var err = document.getElementById('login-error'), btn = f.querySelector('button[type=submit]');
      if (f.password.value !== f.password2.value) { err.textContent = 'Password tidak sama'; return; }
      err.textContent = ''; btn.disabled = true;
      var sd = Store.seed(), sample = f.sample.checked;
      Cloud.setupOwner({ username: f.username.value.trim().toLowerCase(), password: f.password.value, storeName: f.store.value.trim() || 'Kantin Insya',
        storeAddress: sd.settings.storeAddress, receiptFooter: sd.settings.receiptFooter, categories: sample ? sd.categories : [], products: sample ? sd.products : [] })
        .then(function (user) { S.setup = false; S.booting = true; render(); return afterAuth(user); })
        .catch(function (e) { err.textContent = cloudErr(e); btn.disabled = false; });
    },
    login: function (f) {
      if (Cloud.enabled) {
        var btn = f.querySelector('button[type=submit]'), er = document.getElementById('login-error');
        er.textContent = ''; btn.disabled = true;
        Cloud.signIn(f.username.value.trim().toLowerCase(), f.password.value).catch(function (e) { er.textContent = cloudErr(e); btn.disabled = false; });
        return;
      }
      var u = f.username.value.trim().toLowerCase(), pw = f.password.value;
      var user = db.users.find(function (x) { return x.username === u; });
      if (!user || user.pw !== U.hashPw(u, pw)) { document.getElementById('login-error').textContent = 'Username atau password salah'; return; }
      S.user = user; localStorage.setItem(Store.SESSION_KEY, user.username);
      location.hash = '#/kasir'; render();
    },
    confirm: function (f) {
      var sh = S.sheet; var reason = f.reason ? f.reason.value.trim() : '';
      if (sh.reason && reason.length < 3 && sh.act !== 'reset-all') { toast('Tulis alasan minimal 3 huruf', 'error'); return; }
      if (confirmActs[sh.act](sh.id, reason) === false) return;
      if (sh.act !== 'reset-all') { S.sheet = null; render(); }
    },
    product: function (f) {
      var price = U.parseRp(f.price.value), cost = U.parseRp(f.cost.value), stock = parseInt(String(f.stock.value).replace(/[^\d-]/g, ''), 10) || 0;
      if (!f.name.value.trim() || price <= 0) { toast('Nama dan harga jual wajib diisi', 'error'); return; }
      if (cost > price) toast('Perhatian: modal lebih besar dari harga jual', 'error');
      var data = { name: f.name.value.trim(), category: f.category.value, price: price, cost: cost, stock: stock, track_stock: f.track_stock.checked, description: f.description.value.trim(), icon: f.icon.value };
      var id = S.sheet.id;
      if (id) {
        var p = product(id), changes = [];
        if (p.price !== data.price) changes.push('harga ' + rp(p.price) + ' → ' + rp(data.price));
        if (p.cost !== data.cost) changes.push('modal ' + rp(p.cost) + ' → ' + rp(data.cost));
        if (p.stock !== data.stock) changes.push('stok ' + p.stock + ' → ' + data.stock);
        Object.assign(p, data);
        if (changes.length) logEvent('Ubah produk ' + p.name + ': ' + changes.join(', '));
      } else {
        db.products.push(Object.assign({ id: U.uid(), archived: false, created_at: new Date().toISOString() }, data));
        logEvent('Produk baru: ' + data.name + ' (' + rp(price) + ', stok ' + stock + ')');
      }
      save(); S.sheet = null; render(); toast('Produk disimpan', 'ok');
    },
    category: function (f) {
      var n = f.name.value.trim();
      if (!n) return;
      if (db.categories.some(function (c) { return c.toLowerCase() === n.toLowerCase(); })) { toast('Kategori sudah ada', 'error'); return; }
      db.categories.push(n); save(); render(); toast('Kategori ditambahkan', 'ok');
    },
    modal: function (f) {
      var amount = U.parseRp(f.amount.value);
      if (amount <= 0) { toast('Jumlah harus lebih dari 0', 'error'); return; }
      db.transactions.push({ id: U.uid(), kind: S.modalKind, created_at: new Date().toISOString(), cashier: S.user.username, amount: amount, note: f.note.value.trim(), voided: false });
      save(); render(); toast(S.modalKind === 'modal_in' ? 'Modal masuk tercatat' : 'Pengeluaran tercatat', 'ok');
    },
    closing: function (f) {
      var actual = U.parseRp(f.actual.value), r = report(U.todayKey());
      db.transactions.push({ id: U.uid(), kind: 'closing', created_at: new Date().toISOString(), cashier: S.user.username, expected: r.expected_cash, actual: actual, diff: actual - r.expected_cash, note: f.note.value.trim(), voided: false });
      save(); render();
      var diff = actual - r.expected_cash;
      toast(diff === 0 ? 'Uang di laci pas!' : diff < 0 ? 'Kurang ' + rp(-diff) + ' — periksa catatan' : 'Lebih ' + rp(diff), diff === 0 ? 'ok' : 'error');
    },
    settings: function (f) {
      db.settings.storeName = f.storeName.value.trim() || 'Kantin Insya';
      db.settings.storeAddress = f.storeAddress.value.trim();
      db.settings.receiptFooter = f.receiptFooter.value.trim();
      save(); toast('Pengaturan disimpan', 'ok');
    },
    'add-user': function (f) {
      var u = f.username.value.trim().toLowerCase();
      if (Cloud.enabled) {
        var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
        Cloud.createCashier(u, f.password.value).then(function () { toast('Kasir ditambahkan', 'ok'); f.reset(); })
          .catch(function (e) { toast(cloudErr(e), 'error'); }).then(function () { btn.disabled = false; });
        return;
      }
      if (db.users.some(function (x) { return x.username === u; })) { toast('Username sudah dipakai', 'error'); return; }
      db.users.push({ username: u, role: 'cashier', pw: U.hashPw(u, f.password.value), created_at: new Date().toISOString() });
      logEvent('Kasir baru ditambahkan: ' + u); save(); render(); toast('Kasir ditambahkan', 'ok');
    },
    password: function (f) {
      if (Cloud.enabled) {
        if (f.pw.value !== f.pw2.value) { toast('Password baru tidak sama', 'error'); return; }
        Cloud.changePassword(f.old.value, f.pw.value).then(function () { S.sheet = null; renderOverlay(); toast('Password diganti', 'ok'); })
          .catch(function (e) { toast(/wrong|invalid/.test((e && e.code) || '') ? 'Password lama salah' : cloudErr(e), 'error'); });
        return;
      }
      var sh = S.sheet, user = db.users.find(function (x) { return x.username === sh.username; });
      if (!user) return;
      if (sh.self && user.pw !== U.hashPw(user.username, f.old.value)) { toast('Password lama salah', 'error'); return; }
      if (f.pw.value !== f.pw2.value) { toast('Password baru tidak sama', 'error'); return; }
      user.pw = U.hashPw(user.username, f.pw.value);
      logEvent('Password diganti untuk ' + user.username); save();
      S.sheet = null; renderOverlay(); toast('Password diganti', 'ok');
    }
  };

  /* ---------------- Event ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    var fn = forms[f.dataset.form];
    if (fn) fn(f);
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'search') { S.q = t.value; refreshKasirParts(); }
    else if (t.id === 'audit-q') {
      S.auditQ = t.value;
      clearTimeout(forms._aq);
      forms._aq = setTimeout(function () { render(); var el = document.getElementById('audit-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 350);
    }
    else if (t.id === 'paid') {
      S.paid = U.parseRp(t.value);
      t.value = S.paid ? U.num(S.paid) : '';
      var cv = document.getElementById('change-val'); if (cv) cv.innerHTML = changeHtml();
      var pb = document.getElementById('pay-btn'); if (pb) pb.disabled = !canPay();
    }
    else if (t.id === 'note') S.note = t.value;
    else if (t.getAttribute('inputmode') === 'numeric' && t.name && t.name !== 'stock') {
      var v = U.parseRp(t.value); t.value = v ? U.num(v) : '';
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'report-date' && t.value) { S.reportDate = t.value > U.todayKey() ? U.todayKey() : t.value; render(); }
    if (t.id === 'import-file' && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!Store.isValid(d)) throw new Error('invalid');
          confirmSheet({ title: 'Impor ke cloud?', message: 'Produk (' + d.products.length + ') dan catatan (' + d.transactions.length + ') dari file akan ditambahkan ke cloud. Produk dengan ID yang sama akan ditimpa. Lakukan hanya sekali.', confirmLabel: 'Impor', act: 'import-cloud', id: d });
        } catch (err) { toast('File cadangan tidak valid', 'error'); }
      };
      rd.readAsText(t.files[0]); t.value = '';
    }
    if (t.id === 'restore-file' && t.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var d = JSON.parse(reader.result);
          if (!Store.isValid(d)) throw new Error('invalid');
          confirmSheet({ title: 'Pulihkan cadangan?', message: 'Data sekarang akan diganti dengan isi file cadangan (' + d.transactions.length + ' catatan, ' + d.products.length + ' produk).', confirmLabel: 'Pulihkan', act: 'restore', id: d });
        } catch (err) { toast('File cadangan tidak valid', 'error'); }
      };
      reader.readAsText(t.files[0]);
      t.value = '';
    }
  });
  confirmActs.restore = function (d) {
    Store.replace(d); db = Store.data; logEvent('Data dipulihkan dari cadangan'); save();
    S.user = db.users.find(function (u) { return u.username === S.user.username; }) || null;
    if (!S.user) localStorage.removeItem(Store.SESSION_KEY);
    toast('Data dipulihkan', 'ok');
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (S.sheet) closeSheet(); else if (S.drawer) { S.drawer = false; renderOverlay(); } }
  });
  window.addEventListener('hashchange', function () { S.drawer = false; render(); });
  window.addEventListener('storage', function (e) { if (!Cloud.enabled && e.key && e.key.indexOf('kantin_insya_db') === 0) { db = Store.load(); render(); } });

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {});
    navigator.serviceWorker.ready.then(function () { swReady = true; if (route() === 'pengaturan' && S.user) render(); });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadController) toast('Versi baru terpasang. Tutup lalu buka lagi aplikasi untuk memakainya.', 'ok');
    });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; if (route() === 'pengaturan' && S.user) render(); });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; toast('Aplikasi terpasang di layar utama', 'ok'); });
  window.addEventListener('offline', function () { toast('Anda offline. Kasir tetap bisa dipakai.'); if (route() === 'pengaturan' && S.user) render(); });
  window.addEventListener('online', function () { toast('Kembali online', 'ok'); if (route() === 'pengaturan' && S.user) render(); });
  /* Minta browser agar data tidak dihapus otomatis saat memori HP penuh. */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  if (Store.recovered) setTimeout(function () { toast('Data lama rusak dan tidak bisa dibaca. Salinannya disimpan; hubungi pengembang untuk memulihkan.', 'error'); }, 600);

  /* ---------------- Mode cloud (Firebase) ---------------- */
  var renderPending = false;
  function cloudErr(e) {
    var c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'Username atau password salah';
    if (c === 'auth/network-request-failed') return 'Tidak ada internet. Masuk pertama kali di HP ini butuh internet.';
    if (c === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Tunggu beberapa menit.';
    if (c === 'auth/email-already-in-use') return 'Username sudah dipakai';
    if (c === 'auth/weak-password') return 'Password terlalu lemah (minimal 6 karakter)';
    if (c === 'permission-denied') return 'Ditolak server: akun ini tidak punya izin untuk tindakan itu, atau toko sudah disiapkan.';
    if (c === 'failed-precondition') return 'Indeks database belum dibuat. Jalankan: firebase deploy --only firestore';
    return (e && e.message) || 'Terjadi kesalahan';
  }
  function typing() { var a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && ['checkbox', 'radio', 'submit', 'button'].indexOf(a.type) < 0; }
  function softRender() {   /* jangan merusak ketikan atau lembar yang sedang terbuka */
    if (S.booting || !S.user) { render(); return; }
    if (typing() || S.sheet) { renderPending = true; return; }
    render();
  }
  document.addEventListener('focusout', function () {
    setTimeout(function () { if (renderPending && !typing() && !S.sheet) render(); }, 250);
  });
  function refreshSync() { [].forEach.call(document.querySelectorAll('[data-sync]'), function (el) { el.textContent = Cloud.statusText(); }); }
  function afterAuth(fbUser) {
    return Cloud.loadProfile(fbUser.uid).then(function (p) {
      if (!p || p.active === false) { toast(p ? 'Akun ini dinonaktifkan oleh pemilik' : 'Akun belum terdaftar di toko ini', 'error'); return Cloud.signOut(); }
      S.user = { uid: fbUser.uid, username: p.username, role: p.role };
      Cloud.start(Object.assign({ uid: fbUser.uid }, p), db);
      S.booting = false; S.setup = false; S.fatal = null;
      if (!location.hash || location.hash === '#/') location.hash = '#/kasir';
      render();
    }).catch(function (e) {
      S.booting = false;
      if (e && /unavailable|failed-precondition/.test(e.code || '')) S.fatal = 'Belum ada koneksi dan data akun belum tersimpan di HP ini. Hubungkan internet lalu coba lagi.';
      else { toast(cloudErr(e), 'error'); Cloud.signOut().catch(function () {}); }
      render();
    });
  }
  function onAuthChange(u) {
    if (Cloud.settingUp) return;
    if (!u) {
      Cloud.stop(); S.user = null; S.booting = false; S.cart = []; S.drawer = false; S.sheet = null; S.fatal = null;
      location.hash = '#/kasir'; render(); return;
    }
    S.booting = true; render(); afterAuth(u);
  }
  function bootCloud() {
    render();
    Cloud.onError = function (e) { toast(cloudErr(e), 'error'); };
    Cloud.onStatus = refreshSync;
    Cloud.onChange = softRender;
    Cloud.onDeactivated = function () { toast('Akun Anda dinonaktifkan oleh pemilik', 'error'); Cloud.signOut().catch(function () {}); };
    Cloud.init().then(function () { Cloud.onAuth(onAuthChange); }).catch(function () {
      S.booting = false; S.fatal = 'Layanan online tidak bisa dimuat. Buka aplikasi sekali saat ada internet, lalu coba lagi.'; render();
    });
  }

  if (Cloud.enabled) bootCloud(); else render();
})();
