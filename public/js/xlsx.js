/* Penulis berkas Excel (.xlsx) mini tanpa pustaka luar, sehingga tetap bisa dipakai saat offline.
 * Pakai: Xlsx.download('nama.xlsx', [{ name: 'Ringkasan', rows: [[...]], widths: [30, 14], freeze: 1, filter: true }])
 * Sel: teks, angka, atau { v: nilai, s: 'gaya' }. Gaya: title, h (judul kolom), sub (judul bagian), b (tebal),
 *      rp (Rupiah), rpb (Rupiah tebal), pct (persen; nilai 0.25 = 25%), int (angka bulat), note (catatan), wrap (teks panjang). */
(function (global) {
  'use strict';
  var enc = new TextEncoder();
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  /* ZIP tanpa kompresi (cukup untuk .xlsx) */
  function zip(files) {
    var now = new Date(), dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data, crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    var all = chunks.concat(central, [new Uint8Array(end.buffer)]);
    var total = all.reduce(function (a, c) { return a + c.length; }, 0), out = new Uint8Array(total), p = 0;
    all.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  function xesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

  /* urutan gaya = indeks di cellXfs */
  var STYLES = ['default', 'title', 'h', 'sub', 'b', 'rp', 'rpb', 'pct', 'int', 'note', 'wrap'];
  var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;Rp&quot;\\ #,##0;[Red]\\-&quot;Rp&quot;\\ #,##0"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>' +
    '<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '<font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font></fonts>' +
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F3A2E"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE4EBE5"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="11">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="164" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function sheetXml(sh) {
    var rows = sh.rows || [], maxCol = 0, out = [];
    rows.forEach(function (row, r) {
      var cells = [];
      (row || []).forEach(function (cell, c) {
        if (cell === null || cell === undefined || cell === '') return;
        var v = cell, st = 0;
        if (typeof cell === 'object') { v = cell.v; st = STYLES.indexOf(cell.s); if (st < 0) st = 0; if (v === null || v === undefined || v === '') { if (!st) return; } }
        maxCol = Math.max(maxCol, c + 1);
        var ref = colName(c) + (r + 1);
        if (typeof v === 'number' && isFinite(v)) cells.push('<c r="' + ref + '"' + (st ? ' s="' + st + '"' : '') + '><v>' + v + '</v></c>');
        else if (v === null || v === undefined || v === '') cells.push('<c r="' + ref + '" s="' + st + '"/>');
        else cells.push('<c r="' + ref + '"' + (st ? ' s="' + st + '"' : '') + ' t="inlineStr"><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>');
      });
      out.push('<row r="' + (r + 1) + '">' + cells.join('') + '</row>');
    });
    var cols = (sh.widths || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
    var pane = sh.freeze ? '<pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/>' : '';
    var filter = sh.filter && rows.length > 1 ? '<autoFilter ref="A' + (sh.freeze || 1) + ':' + colName(Math.max(maxCol, 1) - 1) + rows.length + '"/>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0">' + pane + '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>' +
      (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + out.join('') + '</sheetData>' + filter + '</worksheet>';
  }

  function build(sheets) {
    var R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', M = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    var files = [], names = [];
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    var wbSheets = '', wbRels = '';
    sheets.forEach(function (sh, i) {
      var nm = String(sh.name).replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Sheet' + (i + 1);
      while (names.indexOf(nm) >= 0) nm = nm.slice(0, 28) + '_' + (i + 1);
      names.push(nm);
      ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      wbSheets += '<sheet name="' + xesc(nm) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      wbRels += '<Relationship Id="rId' + (i + 1) + '" Type="' + R + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: enc.encode(sheetXml(sh)) });
    });
    wbRels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="' + R + '/styles" Target="styles.xml"/>';
    var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    files.unshift(
      { name: '[Content_Types].xml', data: enc.encode(ct + '</Types>') },
      { name: '_rels/.rels', data: enc.encode(head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { name: 'xl/workbook.xml', data: enc.encode(head + '<workbook xmlns="' + M + '" xmlns:r="' + R + '"><sheets>' + wbSheets + '</sheets></workbook>') },
      { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + wbRels + '</Relationships>') },
      { name: 'xl/styles.xml', data: enc.encode(STYLES_XML) });
    return zip(files);
  }

  function download(filename, sheets) {
    var blob = new Blob([build(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  global.Xlsx = { build: build, download: download };
})(typeof window !== 'undefined' ? window : globalThis);
