/* Kantin Insya — pemindai barcode (menambah produk di menu Produk, dan memasukkan barang ke keranjang di layar Kasir).
 * 1) Kamera: memakai BarcodeDetector bawaan browser (Chrome Android, butuh Google Play Services). Jika tidak ada,
 *    memuat pustaka ZXing dari internet satu kali (lalu tersimpan di HP).
 * 2) Scanner barcode USB/Bluetooth: cukup klik kolom barcode lalu scan (scanner mengetik angka + Enter).
 * 3) Data produk: nama dicari di Open Food Facts (gratis, hanya barang kemasan) saat online. Hanya nomor barcode yang dikirim. */
(function (global) {
  'use strict';
  var FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];
  var ZX_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  var layer = null, stream = null, timer = null, zxReader = null, closed = true;

  function clean(s) { return String(s || '').replace(/[^0-9A-Za-z.\-]/g, '').slice(0, 40); }
  function nativeSupported() { return typeof global.BarcodeDetector === 'function'; }

  function cameraError(e) {
    var n = (e && e.name) || '';
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, atau ketik nomor barcode.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Kamera tidak ditemukan. Ketik nomor barcode atau pakai scanner.';
    if (n === 'NotReadableError') return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.';
    return 'Kamera tidak bisa dibuka. Ketik nomor barcode atau pakai scanner.';
  }

  function stop() {
    closed = true;
    clearInterval(timer); timer = null;
    if (zxReader) { try { zxReader.reset(); } catch (e) { /* abaikan */ } zxReader = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (layer) { layer.remove(); layer = null; }
  }

  function buildLayer() {
    var d = document.createElement('div');
    d.id = 'scan-layer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Pindai barcode');
    d.innerHTML = '<div class="scan-box"><video id="scan-video" playsinline muted autoplay></video><div class="scan-frame" aria-hidden="true"><span></span></div></div>' +
      '<p class="scan-msg" id="scan-msg" role="status">Arahkan kamera ke barcode</p>' +
      '<div class="scan-actions"><button type="button" class="btn scan-act" id="scan-action" hidden></button><button type="button" class="btn scan-close" id="scan-close">Tutup</button></div>';
    document.body.appendChild(d);
    return d;
  }

  function openCamera(video) {
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }).then(function (s) {
      if (closed) { s.getTracks().forEach(function (t) { t.stop(); }); throw new Error('closed'); }
      stream = s; video.srcObject = s;
      return video.play().catch(function () { /* autoplay sudah diatur */ });
    });
  }

  var lastEmitted = '', emptyFrames = 0;
  function pushRead(v, emit) { emptyFrames = 0; if (v === lastEmitted) return; lastEmitted = v; emit(v); }
  function pushEmpty() { if (++emptyFrames >= 3) lastEmitted = ''; }   /* barcode sudah dijauhkan dari kamera: boleh dibaca lagi */

  function startNative(video, msg, done, fail) {
    var fmts = global.BarcodeDetector.getSupportedFormats ? global.BarcodeDetector.getSupportedFormats() : Promise.resolve(FORMATS);
    var detP = Promise.resolve(fmts).then(function (sup) {
      var f = FORMATS.filter(function (x) { return sup.indexOf(x) >= 0; });
      if (!f.length) throw new Error('nofmt');
      return new global.BarcodeDetector({ formats: f });
    });
    Promise.all([detP, openCamera(video)]).then(function (r) {
      var det = r[0], last = '', hits = 0, busy = false, errs = 0;
      timer = setInterval(function () {
        if (busy || closed || video.readyState < 2) return;
        busy = true;
        det.detect(video).then(function (res) {
          busy = false; errs = 0;
          if (!res.length) { hits = 0; last = ''; pushEmpty(); return; }
          var v = res[0].rawValue;
          if (v === last) hits++; else { last = v; hits = 1; }
          if (hits >= 2) pushRead(v, done);   /* dua pembacaan sama berturut-turut: mengurangi salah baca */
        }).catch(function () {
          busy = false;
          if (++errs >= 5 && !closed) { clearInterval(timer); switchToZxing(video, msg, done, fail); }
        });
      }, 200);
    }).catch(function (e) {
      if (closed) return;
      if (e && e.message === 'nofmt') { switchToZxing(video, msg, done, fail); return; }
      fail(cameraError(e));
    });
  }

  function loadZx() {
    return global.ZXing ? Promise.resolve() : new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = ZX_URL; s.onload = res; s.onerror = function () { rej(new Error('zx')); };
      document.head.appendChild(s);
    });
  }
  function switchToZxing(video, msg, done, fail) {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    startZxing(video, msg, done, fail);
  }
  function startZxing(video, msg, done, fail) {
    msg.textContent = 'Memuat pemindai…';
    loadZx().then(function () {
      if (closed) return null;
      var Z = global.ZXing, hints = new Map();
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.ITF]);
      zxReader = new Z.BrowserMultiFormatReader(hints, 300);
      msg.textContent = 'Arahkan kamera ke barcode';
      return zxReader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video, function (result) { if (closed) return; if (result) pushRead(result.getText(), done); else pushEmpty(); });
    }).catch(function (e) {
      if (closed) return;
      var n = (e && e.name) || '';
      fail(/NotAllowed|NotFound|NotReadable|Security/.test(n) ? cameraError(e) : 'Pemindai tidak bisa dimuat (butuh internet saat pertama kali). Ketik nomor barcode atau pakai scanner.');
    });
  }

  function beep() {
    try {
      var A = global.AudioContext || global.webkitAudioContext; if (!A) return;
      var c = new A(), o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(c.destination); o.start();
      setTimeout(function () { o.stop(); c.close(); }, 90);
    } catch (e) { /* bunyi hanya pelengkap */ }
  }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* abaikan */ } }

  /* Buka kamera.
   *  Mode tunggal (bawaan): onCode(kode) dipanggil sekali lalu kamera menutup. Dipakai untuk mengisi kolom barcode di form produk.
   *  Mode beruntun (opts.continuous): kamera tetap terbuka; onCode(kode) mengembalikan {tone:'ok'|'error', text, action?:{label, run}}
   *  yang ditampilkan di layar pemindai. Dipakai di layar Kasir untuk memasukkan beberapa barang berturut-turut.
   *  onFail(pesan) dipanggil bila kamera gagal dibuka. */
  function scan(onCode, onFail, opts) {
    opts = opts || {};
    if (layer) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { onFail('Kamera tidak tersedia di browser ini. Ketik nomor barcode atau pakai scanner.'); return; }
    layer = buildLayer(); closed = false; lastEmitted = ''; emptyFrames = 0;
    var video = layer.querySelector('#scan-video'), msg = layer.querySelector('#scan-msg'), act = layer.querySelector('#scan-action'), closeBtn = layer.querySelector('#scan-close'), count = 0;
    closeBtn.addEventListener('click', stop);
    if (opts.continuous) closeBtn.textContent = 'Selesai';
    function done(code) {
      if (closed) return;
      if (!opts.continuous) { stop(); buzz(80); onCode(code); return; }
      var r = onCode(code) || {};
      msg.textContent = r.text || code; msg.className = 'scan-msg ' + (r.tone || '');
      if (r.tone === 'ok') { count++; closeBtn.textContent = 'Selesai (' + count + ')'; beep(); buzz(60); } else buzz([60, 40, 60]);
      if (r.action) {
        act.hidden = false; act.textContent = r.action.label;
        act.onclick = function () { stop(); r.action.run(); };
      } else { act.hidden = true; act.onclick = null; }
    }
    function fail(m) { stop(); onFail(m); }
    if (nativeSupported()) startNative(video, msg, done, fail); else startZxing(video, msg, done, fail);
  }

  /* Cari nama produk di Open Food Facts. Hasil: {name, brand, quantity} atau null jika tidak ada. Menolak (reject) jika offline/gagal. */
  function lookup(code) {
    if (!/^\d{8,14}$/.test(code)) return Promise.resolve(null);
    if (navigator.onLine === false) return Promise.reject(new Error('offline'));
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var tm = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null;
    return fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=product_name,brands,quantity', ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (tm) clearTimeout(tm); return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || j.status !== 1 || !j.product) return null;
        var p = j.product, name = String(p.product_name || '').trim(), brand = String(p.brands || '').split(',')[0].trim();
        if (!name && !brand) return null;
        if (name && brand && name.toLowerCase().indexOf(brand.toLowerCase()) < 0) name = brand + ' ' + name;
        return { name: name || brand, brand: brand, quantity: String(p.quantity || '').trim() };
      });
  }

  global.addEventListener('pagehide', stop);
  global.Barcode = { scan: scan, lookup: lookup, clean: clean, nativeSupported: nativeSupported };
})(window);
