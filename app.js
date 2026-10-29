// โลจิกหน้าเว็บ: โหลดข้อมูลจาก /api/data แล้วค้นหา/เรียง/แสดงตาราง
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var collator = new Intl.Collator('th');
  var PAGE_FIRST = 40;
  var PAGE_MORE = 60;

  var state = { data: null, uniQ: '', facQ: '', sort: 'name', limit: PAGE_FIRST };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmt(v) { return v == null ? '–' : v.toFixed(2); }
  function th(n) { return n.toLocaleString('th-TH'); }
  function dtxt(d) {
    if (d == null) return null;
    if (d > 0.005) return '▲ +' + d.toFixed(2);
    if (d < -0.005) return '▼ ' + d.toFixed(2).replace('-', '−');
    return '● 0.00';
  }
  function dbg(d) { return d == null ? '#fff' : d > 0.005 ? '#FF9E80' : d < -0.005 ? '#9AD5F0' : '#fff'; }
  function delta(d) {
    if (d == null) return '';
    return '<span class="delta" style="background:' + dbg(d) + '">' + esc(dtxt(d)) + '</span>';
  }

  // คำนวณรายการที่ผ่านตัวกรองและเรียงแล้ว
  function compute() {
    var d = state.data;
    var uq = state.uniQ.trim().toLowerCase();
    var fq = state.facQ.trim().toLowerCase();
    var list = d.rows.map(function (r) {
      var v = r[3];
      var have = v.filter(function (x) { return x != null; });
      return {
        ui: r[0], uni: d.unis[r[0]], fac: r[1], major: r[2], v: v,
        avg: have.length ? have.reduce(function (a, x) { return a + x; }, 0) / have.length : null,
        dh: v[0] != null && v[1] != null ? v[1] - v[0] : null,
        dl: v[2] != null && v[3] != null ? v[3] - v[2] : null
      };
    });
    if (uq) list = list.filter(function (r) { return r.uni.toLowerCase().indexOf(uq) !== -1; });
    if (fq) list = list.filter(function (r) { return r.fac.toLowerCase().indexOf(fq) !== -1; });

    var desc = function (f) { return function (a, b) { var x = f(a), y = f(b); return (y == null ? -Infinity : y) - (x == null ? -Infinity : x); }; };
    var asc = function (f) { return function (a, b) { var x = f(a), y = f(b); return (x == null ? Infinity : x) - (y == null ? Infinity : y); }; };
    var byName = function (a, b) { return collator.compare(a.uni, b.uni) || collator.compare(a.fac, b.fac) || collator.compare(a.major, b.major); };

    if (state.sort === 'name') list.sort(byName);
    else if (state.sort === 'avgDesc') list.sort(desc(function (r) { return r.avg; }));
    else if (state.sort === 'avgAsc') list.sort(asc(function (r) { return r.avg; }));
    else if (state.sort === 'h69') list.sort(desc(function (r) { return r.v[1]; }));
    else if (state.sort === 'l69') list.sort(desc(function (r) { return r.v[3]; }));
    else if (state.sort === 'change') list.sort(desc(function (r) { return r.dl == null ? null : Math.abs(r.dl); }));
    return list;
  }

  // รายชื่อคณะใน datalist จะเปลี่ยนตามมหาวิทยาลัยที่พิมพ์
  function renderFacOptions() {
    var d = state.data;
    var uq = state.uniQ.trim().toLowerCase();
    var seen = {};
    var opts = [];
    d.rows.forEach(function (r) {
      if (uq && d.unis[r[0]].toLowerCase().indexOf(uq) === -1) return;
      if (!seen[r[1]]) { seen[r[1]] = true; opts.push(r[1]); }
    });
    opts.sort(function (a, b) { return collator.compare(a, b); });
    $('facList').innerHTML = opts.map(function (o) { return '<option value="' + esc(o) + '"></option>'; }).join('');
  }

  function renderRows() {
    var list = compute();
    var shown = list.slice(0, state.limit);
    var keys = {}, unis = {};
    list.forEach(function (r) { keys[r.ui + '|' + r.fac] = 1; unis[r.ui] = 1; });
    $('statCount').textContent = th(Object.keys(keys).length);
    $('statUnis').textContent = th(Object.keys(unis).length);
    $('shownText').textContent = 'แสดง ' + th(shown.length) + ' จาก ' + th(list.length) + ' แถว';

    $('rows').innerHTML = shown.map(function (r, i) {
      var bg = i % 2 ? '#FFFAF0' : '#fff';
      return '<div class="cols trow" style="background:' + bg + '">' +
        '<div class="td uni">' + esc(r.uni) + '</div>' +
        '<div class="td">' + esc(r.fac) + '</div>' +
        '<div class="td">' + esc(r.major) + '</div>' +
        '<div class="td num">' + fmt(r.v[0]) + '</div>' +
        '<div class="td num two"><span>' + fmt(r.v[1]) + '</span>' + delta(r.dh) + '</div>' +
        '<div class="td num">' + fmt(r.v[2]) + '</div>' +
        '<div class="td num two"><span>' + fmt(r.v[3]) + '</span>' + delta(r.dl) + '</div>' +
        '<div class="td avg"><span class="avgbox" style="background:' + (r.avg == null ? '#fff' : '#F2B705') + '">' + fmt(r.avg) + '</span></div>' +
        '</div>';
    }).join('');

    $('tableWrap').hidden = list.length === 0;
    $('empty').hidden = list.length !== 0;
    var remaining = list.length - shown.length;
    $('more').hidden = remaining <= 0;
    if (remaining > 0) $('more').textContent = 'แสดงเพิ่มอีก ' + th(Math.min(PAGE_MORE, remaining)) + ' แถว';
  }

  function bind() {
    $('uni').addEventListener('input', function (e) {
      state.uniQ = e.target.value; state.limit = PAGE_FIRST;
      renderFacOptions(); renderRows();
    });
    $('fac').addEventListener('input', function (e) {
      state.facQ = e.target.value; state.limit = PAGE_FIRST; renderRows();
    });
    $('sort').addEventListener('change', function (e) {
      state.sort = e.target.value; state.limit = PAGE_FIRST; renderRows();
    });
    $('reset').addEventListener('click', function () {
      state.uniQ = ''; state.facQ = ''; state.sort = 'name'; state.limit = PAGE_FIRST;
      $('uni').value = ''; $('fac').value = ''; $('sort').value = 'name';
      renderFacOptions(); renderRows();
    });
    $('more').addEventListener('click', function () {
      state.limit += PAGE_MORE; renderRows();
    });
  }

  function init(data) {
    state.data = data;
    $('uniList').innerHTML = data.unis.map(function (u) { return '<option value="' + esc(u) + '"></option>'; }).join('');
    $('loading').hidden = true;
    bind();
    renderFacOptions();
    renderRows();
  }

  function fail() {
    $('loading').hidden = true;
    $('failed').hidden = false;
  }

  fetch('/api/data')
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(function (d) { if (!d || !d.rows || !d.unis) throw new Error('bad data'); init(d); })
    .catch(fail);
})();
